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

export interface SectionConfig {
  name: string;
  database_id: string;
  data_source_id?: string;
  view_id?: string;
  filters?: { escala_property?: string; escala_value?: string };
  property_names?: Record<string, string[]>;
}

export interface DatabaseConfig {
  organizations: SectionConfig;
  interventions: SectionConfig;
}

export function loadDatabaseConfig(): DatabaseConfig {
  const raw = fs.readFileSync('./src/data/databases.yaml', 'utf8');
  const parsed = yaml.load(raw) as DatabaseConfig;
  return parsed;
}

// Backwards-compatible helper for callers that only need the ids.
export function loadDatabaseIds(): { organizations: string; interventions: string } {
  const cfg = loadDatabaseConfig();
  return {
    organizations: cfg.organizations.database_id,
    interventions: cfg.interventions.database_id,
  };
}

export async function fetchDatabaseRecords(databaseId: string): Promise<NormalizedRecord[]> {
  return fetchRecords({ database_id: databaseId });
}

export async function fetchSection(section: SectionConfig): Promise<NormalizedRecord[]> {
  return fetchRecords(section);
}

async function fetchRecords(section: Pick<SectionConfig, 'database_id' | 'data_source_id'>): Promise<NormalizedRecord[]> {
  const notion = getClient();

  const collect = async (fetchPage: (cursor?: string) => Promise<any>): Promise<NormalizedRecord[]> => {
    const out: NormalizedRecord[] = [];
    let cursor: string | undefined;
    do {
      const response = await fetchPage(cursor);
      out.push(...response.results.map(normalizePage));
      cursor = response.next_cursor;
    } while (cursor);
    return out;
  };

  const queryDataSource = (id: string, cursor?: string): Promise<any> =>
    notion.request({
      // No leading slash: the SDK joins this onto "https://api.notion.com/v1/".
      path: `data_sources/${id}/query`,
      method: 'post',
      body: cursor ? { start_cursor: cursor } : {},
    });

  // Preferred path: an explicit data source id (new Notion data model).
  if (section.data_source_id) {
    return collect((cursor) => queryDataSource(section.data_source_id!, cursor));
  }

  // Classic path: query the database directly. If the database holds several data
  // sources, enumerate them (databases.retrieve) and query each, deduped by page id.
  try {
    return await collect((cursor) =>
      notion.databases.query({ database_id: section.database_id, start_cursor: cursor })
    );
  } catch (err: any) {
    const isDataSourceError =
      err?.code === 'object_not_found' ||
      (err?.code === 'validation_error' && /multiple data sources/i.test(err?.message ?? ''));
    if (!isDataSourceError) throw err;

    const ids: string[] = [];
    try {
      const db: any = await notion.databases.retrieve({ database_id: section.database_id });
      for (const ds of db?.data_sources ?? []) if (ds?.id) ids.push(ds.id);
    } catch {
      // retrieve failed too — nothing else to try with this id
    }
    if (ids.length === 0) throw err;

    const seen = new Set<string>();
    const all: NormalizedRecord[] = [];
    for (const id of ids) {
      for (const r of await collect((cursor) => queryDataSource(id, cursor))) {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          all.push(r);
        }
      }
    }
    return all;
  }
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