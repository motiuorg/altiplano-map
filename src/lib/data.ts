// Shared build-time data loading for both pages (Organizaciones, Intervenciones).
// Notion fetch at build; USE_FIXTURE=1 uses the local fixture dataset instead
// (see src/lib/fixture.ts).
import { loadDatabaseConfig, fetchSection, fetchViewOrder, fetchPageBlocks } from './notion';
import type { NormalizedRecord } from './notion';
import { normalizeOrg, keepOrg, normalizeIntervention } from './records';
import type { InterventionRecord, OrgRecord } from './records';
import { FIXTURE_ORGANIZATIONS, FIXTURE_INTERVENTIONS } from './fixture';

const isTruthy = (v: any) =>
  v === true || v === 1 || (typeof v === 'string' && ['1', 'true', 'yes'].includes(v.toLowerCase()));

export interface SiteData {
  orgs: OrgRecord[];
  orgMap: Map<string, OrgRecord>;
  interventions: InterventionRecord[];
  dataError: string;
  dataSource: 'notion' | 'fixture';
}

export async function loadSiteData(): Promise<SiteData> {
  const useFixture = isTruthy(import.meta.env.USE_FIXTURE ?? process.env.USE_FIXTURE);
  const dbConfig = loadDatabaseConfig();

  let orgRecords: NormalizedRecord[] = [];
  let interventionRecords: NormalizedRecord[] = [];
  let viewOrder: string[] | null = null;
  let dataError = '';
  let dataSource: 'notion' | 'fixture' = 'notion';

  try {
    if (useFixture) {
      orgRecords = FIXTURE_ORGANIZATIONS;
      interventionRecords = FIXTURE_INTERVENTIONS;
      dataSource = 'fixture';
    } else {
      const key = import.meta.env.NOTION_API_KEY ?? process.env.NOTION_API_KEY;
      if (!key) throw new Error('Sin NOTION_API_KEY: añádela al .env o usa USE_FIXTURE=1');
      const [o, i, v] = await Promise.all([
        fetchSection(dbConfig.organizations),
        fetchSection(dbConfig.interventions),
        fetchViewOrder(dbConfig.interventions.view_id),
      ]);
      orgRecords = o;
      interventionRecords = i;
      viewOrder = v;
    }
  } catch (e: any) {
    dataError = e?.message ?? String(e);
    orgRecords = [];
    interventionRecords = [];
  }

  const orgFilters = {
    escalaProperty: dbConfig.organizations.filters?.escala_property,
    escalaValue: dbConfig.organizations.filters?.escala_value,
    assumeOrganization: dbConfig.organizations.filters?.assume_organization ?? false,
  };

  // Grupo de trabajo first, then alphabetical — so "Todos" lists the group on top.
  const orgs = orgRecords
    .map((r) => normalizeOrg(r, orgFilters))
    .filter(keepOrg)
    .sort((a, b) => Number(b.grupoTrabajo) - Number(a.grupoTrabajo) || a.name.localeCompare(b.name, 'es'));
  // The grupo de trabajo's pages carry text about the organisation itself; the side
  // panel shows it. Fixture data has none.
  if (dataSource === 'notion' && !dataError) {
    await Promise.all(orgs.filter((o) => o.grupoTrabajo).map(async (o) => { o.body = await fetchPageBlocks(o.id); }));
  }
  const orgMap = new Map(orgs.map((o) => [o.id, o]));

  // Interventions follow the Notion view order (fallback: data-source order).
  // Only interventions ticked "Portafolio" are published, and so counted anywhere (cards, table,
  // areas view, totals, the organisations' side panels). Data without that column keeps them all.
  const itvById = new Map(
    interventionRecords
      .map((r) => normalizeIntervention(r))
      .filter((i) => i.portafolio !== false)
      .map((i) => [i.id, i] as const),
  );
  const interventions =
    viewOrder && viewOrder.length > 0
      ? viewOrder.map((id) => itvById.get(id)).filter((i): i is InterventionRecord => !!i)
      : [...itvById.values()];

  return { orgs, orgMap, interventions, dataError, dataSource };
}
