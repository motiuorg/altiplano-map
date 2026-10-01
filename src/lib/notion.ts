// Build-time Notion client — mirrors the shared pattern used by Regenerant
// Catalunya Maps & Bioregioning Earth: paginated query + generic normalization,
// with the new data-source fallback for integrations on Notion's new schema.
import { Client } from '@notionhq/client';
import * as yaml from 'js-yaml';
import * as fs from 'fs';

function getClient(): Client {
  // CI passes NOTION_API_KEY as a process env var; local dev often has it in
  // .env (import.meta.env). Check both.
  const key = import.meta.env.NOTION_API_KEY ?? process.env.NOTION_API_KEY;
  if (!key) throw new Error('NOTION_API_KEY is not set');
  return new Client({ auth: key });
}

export interface NormalizedRecord {
  id: string;
  url: string;
  icon?: string;
  createdTime: string;
  lastEditedTime: string;
  properties: Record<string, any>;
}

export function loadDatabaseIds(): { organizations: string; interventions: string } {
  const raw = fs.readFileSync('./src/data/databases.yaml', 'utf8');
  const parsed = yaml.load(raw) as { organizations: { database_id: string }; interventions: { database_id: string } };
  return {
    organizations: parsed.organizations.database_id,
    interventions: parsed.interventions.database_id,
  };
}

export async function fetchDatabaseRecords(databaseId: string): Promise<NormalizedRecord[]> {
  const notion = getClient();
  const results: any[] = [];
  let cursor: string | undefined = undefined;

  // Notion's new data-source architecture: on the new schema, querying by
  // database_id returns object_not_found — fall back to querying the database's
  // data source (discovered via databases.retrieve) on the first 404.
  let dataSourceId: string | null = null;
  const queryPage = async (startCursor?: string): Promise<any> => {
    try {
      return await notion.databases.query({
        database_id: databaseId,
        start_cursor: startCursor,
      });
    } catch (err: any) {
      if (err?.code !== 'object_not_found') throw err;
      if (dataSourceId === null) {
        const db: any = await notion.databases.retrieve({ database_id: databaseId });
        dataSourceId = db?.data_sources?.[0]?.id ?? null;
        if (!dataSourceId) throw err;
      }
      return await notion.request({
        path: `/data_sources/${dataSourceId}/query`,
        method: 'post',
        body: { start_cursor: startCursor },
      });
    }
  };

  do {
    const response = await queryPage(cursor);
    results.push(...response.results);
    cursor = response.next_cursor;
  } while (cursor);

  return results.map((page) => normalizePage(page));
}

export function normalizePage(page: any): NormalizedRecord {
  const props = page.properties ?? {};
  return {
    id: page.id,
    url: page.url,
    icon: page.icon?.type === 'emoji' ? page.icon.emoji : undefined,
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
    properties: Object.fromEntries(
      Object.entries(props).map(([key, value]: [string, any]) => {
        return [key, extractValue(value)];
      })
    ),
  };
}

function extractValue(prop: any): any {
  switch (prop.type) {
    case 'title':
      return prop.title?.map((t: any) => t.plain_text).join('') ?? '';
    case 'rich_text':
      return prop.rich_text?.map((t: any) => t.plain_text).join('') ?? '';
    case 'select':
      return prop.select?.name ?? null;
    case 'multi_select':
      return prop.multi_select?.map((s: any) => s.name) ?? [];
    case 'number':
      return prop.number ?? null;
    case 'url':
      return prop.url ?? null;
    case 'email':
      return prop.email ?? null;
    case 'phone_number':
      return prop.phone_number ?? null;
    case 'checkbox':
      return prop.checkbox ?? false;
    case 'relation':
      return prop.relation?.map((r: any) => r.id) ?? [];
    case 'formula':
      // Formulas can be string/number/boolean/date — take the typed payload
      return prop.formula?.[prop.formula.type] ?? null;
    case 'rollup':
      return prop.rollup?.array?.map(extractValue) ?? [];
    case 'date':
      return prop.date;
    case 'people':
      return prop.people?.map((p: any) => ({ id: p.id, name: p.name })) ?? [];
    case 'files':
      return prop.files?.map((f: any) => f.external?.url ?? f.file?.url) ?? [];
    case 'location':
    case 'place':
      return prop.location ?? prop.place ?? null;
    default:
      const raw = prop[prop.type];
      if (raw === undefined || raw === null) return raw;
      if (typeof raw === 'object') return raw;
      return raw;
  }
}

export function buildRecordMap(records: NormalizedRecord[]): Map<string, NormalizedRecord> {
  return new Map(records.map((r) => [r.id, r]));
}