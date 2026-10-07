// Loads + validates the (fake) landscape data and matches the site's real
// interventions/organizations to each theme. Pure build-time code.
import fs from 'node:fs';
import * as yaml from 'js-yaml';
import raw from '../../data/paisaje.mock.json';
import { validatePaisaje } from './schema';
import type { Indicator, Source, Status, Availability, SourceType, Confidence, Theme } from './schema';
import { loadSiteData } from '../data';
import type { InterventionRecord, OrgRecord } from '../records';

export const paisaje = validatePaisaje(raw);

export const indicatorsOf = (themeId: string): Indicator[] => paisaje.indicators.filter((i) => i.theme === themeId);
export const indicatorById = (id: string): Indicator | undefined => paisaje.indicators.find((i) => i.id === id);
export const sourceById = (id: string): Source => paisaje.sources.find((s) => s.id === id)!;
export const chartsOf = (themeId: string) => paisaje.charts.filter((c) => c.theme === themeId);

// Global citation numbers, stable across the page ([1], [2]…).
export const sourceNumber = (id: string): number => paisaje.sources.findIndex((s) => s.id === id) + 1;

// Sources a theme relies on (findings, indicators, charts), in global order.
export function sourcesOfTheme(t: Theme): Source[] {
  const ids = new Set<string>();
  t.findings.forEach((f) => ids.add(f.sourceId));
  indicatorsOf(t.id).forEach((i) => ids.add(i.sourceId));
  chartsOf(t.id).forEach((c) => ids.add(c.sourceId));
  return paisaje.sources.filter((s) => ids.has(s.id));
}

export const STATUS_META: Record<Status, { label: string; icon: string }> = {
  critico: { label: 'Crítico', icon: 'triangle' },
  bajo_presion: { label: 'Bajo presión', icon: 'diamond' },
  mixto: { label: 'Mixto', icon: 'half' },
  mejorando: { label: 'Mejorando', icon: 'arrow-up' },
  proximamente: { label: 'Próximamente', icon: 'dashed' },
};

export const AVAIL_META: Record<Availability, { label: string; icon: string }> = {
  disponible: { label: 'Disponible', icon: 'check' },
  pendiente: { label: 'Pendiente de solicitar', icon: 'clock' },
  no_disponible: { label: 'No disponible', icon: 'cross' },
};

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  official_dataset: 'Dato oficial',
  institutional_report: 'Informe institucional',
  peer_reviewed: 'Revisado por pares',
  ngo_report: 'Informe de ONG',
  self_reported: 'Autoinformado',
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  alta: 'Confianza alta',
  media: 'Confianza media',
  baja: 'Confianza baja',
};

export const fmtNum = (n: number | null | undefined): string =>
  n === null || n === undefined ? '—' : n.toLocaleString('es-ES', { maximumFractionDigits: 2 });

export const fmtVal = (v: { value: number } | null, unit: string): string =>
  v ? `${fmtNum(v.value)}${unit === '%' ? ' %' : ' ' + unit}` : '—';

// ---------------------------------------------------------------------------
// Response matching ("Qué se está haciendo")
// ---------------------------------------------------------------------------

interface Placeholder { name: string; kind: string; area: string }
interface ThemeMap { workAreas: string[]; keywords: string[]; orgNames: string[]; placeholders: Placeholder[] }

export interface ThemeResponse {
  interventions: InterventionRecord[];
  orgs: OrgRecord[];
  placeholders: Placeholder[];
}

export interface ResponseData {
  byTheme: Record<string, ThemeResponse>;
  orgs: OrgRecord[];
  interventionOrgNames: Map<string, string[]>;
  source: 'notion' | 'fixture';
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export async function loadResponses(): Promise<ResponseData> {
  let site = await loadSiteData();
  let source: 'notion' | 'fixture' = site.dataSource;
  if (site.dataError || site.orgs.length === 0) {
    // No Notion key (or fetch failed): fall back to the local fixture so the
    // prototype always builds. Does not touch the Notion fetching logic.
    const prev = process.env.USE_FIXTURE;
    process.env.USE_FIXTURE = '1';
    try {
      site = await loadSiteData();
      source = 'fixture';
    } finally {
      if (prev === undefined) delete process.env.USE_FIXTURE;
      else process.env.USE_FIXTURE = prev;
    }
  }
  const map = (yaml.load(fs.readFileSync('./src/data/paisaje.response-map.yaml', 'utf8')) as { themes: Record<string, ThemeMap> }).themes;

  const byTheme: Record<string, ThemeResponse> = {};
  for (const [themeId, cfg] of Object.entries(map)) {
    const areas = new Set(cfg.workAreas.map(norm));
    const kws = (cfg.keywords ?? []).map(norm);
    const interventions = site.interventions.filter((i) => {
      if (!i.areaTrabajo.some((a) => areas.has(norm(a)))) return false;
      if (kws.length === 0) return true;
      const text = norm(`${i.name} ${i.description}`);
      return kws.some((k) => text.includes(k));
    });
    const orgIds = new Set(interventions.flatMap((i) => i.orgIds));
    const wanted = new Set((cfg.orgNames ?? []).map(norm));
    const orgs = site.orgs.filter((o) => orgIds.has(o.id) || wanted.has(norm(o.name)));
    const known = new Set([...site.interventions.map((i) => norm(i.name)), ...site.orgs.map((o) => norm(o.name))]);
    const placeholders = (cfg.placeholders ?? []).filter((p) => !known.has(norm(p.name)));
    byTheme[themeId] = { interventions, orgs, placeholders };
  }
  const interventionOrgNames = new Map<string, string[]>();
  for (const i of site.interventions) {
    interventionOrgNames.set(i.id, i.orgIds.map((id) => site.orgMap.get(id)?.name).filter((n): n is string => !!n));
  }
  return { byTheme, orgs: site.orgs, interventionOrgNames, source };
}
