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
  // Latest documented API version (2026-03-11) — the SDK default (2022-06-28)
  // predates the data_sources / views endpoints, and bogus versions 400.
  return new Client({ auth: key, notionVersion: '2026-03-11' });
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
  filters?: { escala_property?: string; escala_value?: string; assume_organization?: boolean };
  property_names?: Record<string, string[]>;
}

export interface DatabaseConfig {
  organizations: SectionConfig;
  interventions: SectionConfig;
  simulador?: Record<'supuestos' | 'practicas' | 'trayectorias' | 'arquetipos', SectionConfig> & { diversificacion?: SectionConfig };
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

// Run a database view's own filter/sort configuration and return the matching
// page ids in view order (POST /v1/views/<id>/queries, API version 2026-03-11).
// Returns null when the view is not configured or the query fails — callers then
// fall back to the data-source order.
export async function fetchViewOrder(viewId: string | undefined): Promise<string[] | null> {
  if (!viewId) return null;
  const notion = getClient();
  const out: string[] = [];
  try {
    let cursor: string | undefined;
    do {
      const res = await notion.request({
        path: `views/${viewId}/queries`,
        method: 'post',
        body: { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) },
      });
      for (const r of res?.results ?? []) if (r?.id) out.push(r.id);
      cursor = res?.next_cursor ?? undefined;
    } while (cursor && out.length < 10000);
    console.log(`[notion] view ${viewId}: ${out.length} rows in view order`);
    return out.length > 0 ? out : null;
  } catch (err: any) {
    console.warn(`[notion] view ${viewId} query failed → ${err?.code}: ${err?.message}`);
    return null;
  }
}

async function fetchRecords(
  section: Pick<SectionConfig, 'database_id' | 'data_source_id'> & { name?: string },
): Promise<NormalizedRecord[]> {
  const notion = getClient();
  const label = section.name ?? section.database_id;
  const log = (msg: string) => console.log(`[notion] ${label}: ${msg}`);

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

  // Post to a data source (new Notion data model). Querying a data source id via
  // a *database* endpoint returns invalid_request_url, and vice versa — so every
  // id is tried against both endpoints below.
  const queryDataSource = (id: string, cursor?: string): Promise<any> =>
    notion.request({
      // No leading slash: the SDK joins this onto "https://api.notion.com/v1/".
      path: `data_sources/${id}/query`,
      method: 'post',
      body: cursor ? { start_cursor: cursor } : {},
    });

  // Try one id against the data-source endpoint; returns null on failure.
  const tryDataSource = (id: string): Promise<NormalizedRecord[] | null> =>
    collect((cursor) => queryDataSource(id, cursor)).catch((err: any) => {
      log(`data_sources/${id}/query → ${err?.code}: ${err?.message}`);
      return null;
    });

  // Classic database query; if the database page holds several data sources,
  // enumerate them via retrieve and query each (deduped by page id, preserving
  // order across sources). Returns null if nothing could be queried.
  const tryDatabase = (id: string): Promise<NormalizedRecord[] | null> =>
    collect((cursor) =>
      notion.databases.query({ database_id: id, start_cursor: cursor }),
    ).catch(async (err: any) => {
      const code = err?.code ?? '';
      const msg = err?.message ?? '';
      log(`databases/${id}/query → ${code}: ${msg}`);
      const isDataSourceError =
        code === 'object_not_found' ||
        (code === 'validation_error' && /multiple data sources/i.test(msg));
      if (!isDataSourceError) return null;

      // Enumerate the page's data sources and query each one.
      try {
        const db: any = await notion.databases.retrieve({ database_id: id });
        const ids: string[] = [];
        for (const ds of db?.data_sources ?? []) if (ds?.id) ids.push(ds.id);
        if (ids.length === 0) return null;
        log(`database has ${ids.length} data source(s)`);
        const seen = new Set<string>();
        const all: NormalizedRecord[] = [];
        for (const dsId of ids) {
          const rows = await tryDataSource(dsId);
          if (!rows) continue;
          for (const r of rows) {
            if (!seen.has(r.id)) {
              seen.add(r.id);
              all.push(r);
            }
          }
        }
        return all.length > 0 ? all : null;
      } catch (e2: any) {
        log(`databases/${id} (retrieve) → ${e2?.code}: ${e2?.message}`);
        return null;
      }
    });

  // Candidate paths, most specific first. Each id is tried against the data-source
  // endpoint AND the database endpoint, because the two id kinds are
  // indistinguishable from the URL alone (a page id queried as a data source and a
  // data source id queried as a database both give invalid_request_url).
  const candidates: Promise<NormalizedRecord[] | null>[] = [];
  const ids = [
    ...new Set(
      [section.data_source_id, section.database_id].filter((x): x is string => !!x),
    ),
  ];
  for (const id of ids) candidates.push(tryDataSource(id));
  for (const id of ids) candidates.push(tryDatabase(id));

  for (const attempt of candidates) {
    const rows = await attempt;
    if (rows) {
      log(`${rows.length} rows`);
      log(`properties: ${Object.keys(rows[0].properties).join(', ')}`);
      return rows;
    }
  }
  throw new Error(`No query path worked for ${label}`);
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