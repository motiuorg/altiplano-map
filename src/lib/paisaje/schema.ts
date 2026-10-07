// Schema + hand-rolled validation for the "Paisaje en datos" prototype data.
// A malformed data file fails the build with a path-prefixed message, so real
// data can replace src/data/paisaje.mock.json with the same shape.

export const STATUSES = ['critico', 'bajo_presion', 'mixto', 'mejorando', 'proximamente'] as const;
export type Status = (typeof STATUSES)[number];

export const AVAILABILITY = ['disponible', 'pendiente', 'no_disponible'] as const;
export type Availability = (typeof AVAILABILITY)[number];

export const SOURCE_TYPES = ['official_dataset', 'institutional_report', 'peer_reviewed', 'ngo_report', 'self_reported'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const CONFIDENCE = ['alta', 'media', 'baja'] as const;
export type Confidence = (typeof CONFIDENCE)[number];

export interface YearValue {
  year: number;
  value: number;
}

export interface Indicator {
  id: string;
  theme: string;
  label: string;
  unit: string;
  scope: string;
  baseline: YearValue | null;
  latest: YearValue | null;
  target: YearValue | null;
  series: YearValue[];
  status: Status;
  availability: Availability;
  sourceId: string;
  notes: string;
}

export interface Source {
  id: string;
  title: string;
  publisher: string;
  type: SourceType;
  year: number;
  licence: string;
  url: string;
  retrieved: string;
  confidence: Confidence;
  verifiedBy: string;
}

export interface Finding {
  text: string;
  sourceId: string;
}

export interface Theme {
  id: string;
  label: string;
  verdict: string;
  status: Status;
  headlineIndicatorId: string;
  statIndicatorIds: string[];
  findings: Finding[];
  limitations: string;
  interventionAreas: string[];
  summary: string;
}

interface ChartBase {
  id: string;
  theme: string;
  title: string;
  unit: string;
  scope: string;
  sourceId: string;
  note?: string;
}
export interface LineChart extends ChartBase { type: 'line'; indicatorId: string }
export interface StackedChart extends ChartBase {
  type: 'stacked';
  categories: { id: string; label: string }[];
  rows: { label: string; values: Record<string, number> }[];
}
export interface RefBarChart extends ChartBase {
  type: 'refbar';
  bars: { label: string; value: number; kind: 'value' | 'reference' | 'target' }[];
}
export interface BeforeAfterChart extends ChartBase {
  type: 'beforeafter';
  beforeYear: number;
  afterYear: number;
  categories: { label: string; before: number; after: number }[];
}
export type Chart = LineChart | StackedChart | RefBarChart | BeforeAfterChart;

export interface PaisajeData {
  fake: boolean;
  disclaimer: string;
  generated: string;
  themes: Theme[];
  indicators: Indicator[];
  sources: Source[];
  charts: Chart[];
}

// ---------------------------------------------------------------------------

class SchemaError extends Error {}

function fail(path: string, msg: string): never {
  throw new SchemaError(`[paisaje data] ${path}: ${msg}`);
}
const isObj = (v: any) => v !== null && typeof v === 'object' && !Array.isArray(v);
function str(v: any, path: string): string {
  if (typeof v !== 'string') fail(path, 'expected a string');
  return v;
}
function num(v: any, path: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(path, 'expected a finite number');
  return v;
}
function oneOf<T extends string>(v: any, allowed: readonly T[], path: string): T {
  if (!allowed.includes(v)) fail(path, `expected one of ${allowed.join(', ')} (got ${JSON.stringify(v)})`);
  return v;
}
function arr(v: any, path: string): any[] {
  if (!Array.isArray(v)) fail(path, 'expected an array');
  return v;
}
function yearValue(v: any, path: string, nullable = true): YearValue | null {
  if (v === null && nullable) return null;
  if (!isObj(v)) fail(path, 'expected {year, value}');
  return { year: num(v.year, `${path}.year`), value: num(v.value, `${path}.value`) };
}

export function validatePaisaje(raw: any): PaisajeData {
  if (!isObj(raw)) fail('$', 'expected an object');
  if (raw.fake !== true && raw.fake !== false) fail('fake', 'top-level "fake" must be true or false');
  const sources: Source[] = arr(raw.sources, 'sources').map((s, i) => {
    const p = `sources[${i}]`;
    if (!isObj(s)) fail(p, 'expected an object');
    return {
      id: str(s.id, `${p}.id`), title: str(s.title, `${p}.title`), publisher: str(s.publisher, `${p}.publisher`),
      type: oneOf(s.type, SOURCE_TYPES, `${p}.type`), year: num(s.year, `${p}.year`), licence: str(s.licence, `${p}.licence`),
      url: str(s.url, `${p}.url`), retrieved: str(s.retrieved, `${p}.retrieved`),
      confidence: oneOf(s.confidence, CONFIDENCE, `${p}.confidence`), verifiedBy: str(s.verifiedBy, `${p}.verifiedBy`),
    };
  });
  const sourceIds = new Set(sources.map((s) => s.id));
  if (sourceIds.size !== sources.length) fail('sources', 'duplicate source ids');
  const checkSource = (id: string, path: string) => { if (!sourceIds.has(id)) fail(path, `unknown sourceId "${id}"`); };

  const themes: Theme[] = arr(raw.themes, 'themes').map((t, i) => {
    const p = `themes[${i}]`;
    if (!isObj(t)) fail(p, 'expected an object');
    return {
      id: str(t.id, `${p}.id`), label: str(t.label, `${p}.label`), verdict: str(t.verdict, `${p}.verdict`),
      status: oneOf(t.status, STATUSES, `${p}.status`), headlineIndicatorId: str(t.headlineIndicatorId, `${p}.headlineIndicatorId`),
      statIndicatorIds: arr(t.statIndicatorIds, `${p}.statIndicatorIds`).map((x, j) => str(x, `${p}.statIndicatorIds[${j}]`)),
      findings: arr(t.findings, `${p}.findings`).map((f, j) => {
        const fp = `${p}.findings[${j}]`;
        const finding = { text: str(f?.text, `${fp}.text`), sourceId: str(f?.sourceId, `${fp}.sourceId`) };
        checkSource(finding.sourceId, `${fp}.sourceId`);
        return finding;
      }),
      limitations: str(t.limitations, `${p}.limitations`),
      interventionAreas: arr(t.interventionAreas, `${p}.interventionAreas`).map((x, j) => str(x, `${p}.interventionAreas[${j}]`)),
      summary: str(t.summary ?? '', `${p}.summary`),
    };
  });
  const themeIds = new Set(themes.map((t) => t.id));
  if (themeIds.size !== themes.length) fail('themes', 'duplicate theme ids');

  const indicators: Indicator[] = arr(raw.indicators, 'indicators').map((x, i) => {
    const p = `indicators[${i}]`;
    if (!isObj(x)) fail(p, 'expected an object');
    const ind: Indicator = {
      id: str(x.id, `${p}.id`), theme: str(x.theme, `${p}.theme`), label: str(x.label, `${p}.label`), unit: str(x.unit, `${p}.unit`),
      scope: str(x.scope, `${p}.scope`), baseline: yearValue(x.baseline, `${p}.baseline`), latest: yearValue(x.latest, `${p}.latest`),
      target: yearValue(x.target, `${p}.target`),
      series: arr(x.series, `${p}.series`).map((s, j) => yearValue(s, `${p}.series[${j}]`, false) as YearValue),
      status: oneOf(x.status, STATUSES, `${p}.status`), availability: oneOf(x.availability, AVAILABILITY, `${p}.availability`),
      sourceId: str(x.sourceId, `${p}.sourceId`), notes: str(x.notes ?? '', `${p}.notes`),
    };
    if (!themeIds.has(ind.theme)) fail(`${p}.theme`, `unknown theme "${ind.theme}"`);
    checkSource(ind.sourceId, `${p}.sourceId`);
    if (ind.availability === 'disponible' && !ind.latest) fail(p, 'availability "disponible" requires a "latest" value');
    return ind;
  });
  const indIds = new Set(indicators.map((x) => x.id));
  if (indIds.size !== indicators.length) fail('indicators', 'duplicate indicator ids');
  themes.forEach((t, i) => {
    if (t.status === 'proximamente') return;
    for (const id of [t.headlineIndicatorId, ...t.statIndicatorIds]) {
      if (!indIds.has(id)) fail(`themes[${i}]`, `unknown indicator "${id}"`);
    }
  });

  const charts: Chart[] = arr(raw.charts, 'charts').map((c, i) => {
    const p = `charts[${i}]`;
    if (!isObj(c)) fail(p, 'expected an object');
    const base = {
      id: str(c.id, `${p}.id`), theme: str(c.theme, `${p}.theme`), title: str(c.title, `${p}.title`), unit: str(c.unit, `${p}.unit`),
      scope: str(c.scope, `${p}.scope`), sourceId: str(c.sourceId, `${p}.sourceId`), note: c.note === undefined ? undefined : str(c.note, `${p}.note`),
    };
    if (!themeIds.has(base.theme)) fail(`${p}.theme`, `unknown theme "${base.theme}"`);
    checkSource(base.sourceId, `${p}.sourceId`);
    switch (c.type) {
      case 'line': {
        const indicatorId = str(c.indicatorId, `${p}.indicatorId`);
        const ind = indicators.find((x) => x.id === indicatorId);
        if (!ind) fail(`${p}.indicatorId`, `unknown indicator "${indicatorId}"`);
        if (ind.series.length < 2) fail(`${p}.indicatorId`, 'a line chart needs an indicator with at least 2 series points');
        return { ...base, type: 'line', indicatorId };
      }
      case 'stacked': {
        const categories = arr(c.categories, `${p}.categories`).map((k, j) => ({ id: str(k?.id, `${p}.categories[${j}].id`), label: str(k?.label, `${p}.categories[${j}].label`) }));
        const rows = arr(c.rows, `${p}.rows`).map((r, j) => {
          const values: Record<string, number> = {};
          for (const k of categories) values[k.id] = num(r?.values?.[k.id], `${p}.rows[${j}].values.${k.id}`);
          return { label: str(r?.label, `${p}.rows[${j}].label`), values };
        });
        return { ...base, type: 'stacked', categories, rows };
      }
      case 'refbar':
        return {
          ...base, type: 'refbar',
          bars: arr(c.bars, `${p}.bars`).map((b, j) => ({
            label: str(b?.label, `${p}.bars[${j}].label`), value: num(b?.value, `${p}.bars[${j}].value`),
            kind: oneOf(b?.kind, ['value', 'reference', 'target'] as const, `${p}.bars[${j}].kind`),
          })),
        };
      case 'beforeafter':
        return {
          ...base, type: 'beforeafter', beforeYear: num(c.beforeYear, `${p}.beforeYear`), afterYear: num(c.afterYear, `${p}.afterYear`),
          categories: arr(c.categories, `${p}.categories`).map((k, j) => ({
            label: str(k?.label, `${p}.categories[${j}].label`), before: num(k?.before, `${p}.categories[${j}].before`), after: num(k?.after, `${p}.categories[${j}].after`),
          })),
        };
      default:
        fail(`${p}.type`, `expected line | stacked | refbar | beforeafter (got ${JSON.stringify(c.type)})`);
    }
  });

  return {
    fake: raw.fake, disclaimer: str(raw.disclaimer, 'disclaimer'), generated: str(raw.generated, 'generated'),
    themes, indicators, sources, charts,
  };
}
