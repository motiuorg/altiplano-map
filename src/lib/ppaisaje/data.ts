// Loads + validates the fake /ppaisaje/ data and derives what the views need
// (cause graph, matrix, availability counts). Pure build-time code.
import raw from '../../data/ppaisaje.mock.json';
import { validatePaisaje } from './schema';
import type { Cause, Chart, Evidence, Horizon, Indicator, Source, Status, Theme, Confidence } from './schema';

export const data = validatePaisaje(raw);

export const themeById = (id: string): Theme => data.themes.find((t) => t.id === id)!;
export const chartById = (id: string): Chart => data.charts.find((c) => c.id === id)!;
export const indicatorById = (id: string): Indicator | undefined => data.indicators.find((i) => i.id === id);
export const sourceById = (id: string): Source => data.sources.find((s) => s.id === id)!;
export const indicatorsOf = (themeId: string) => data.indicators.filter((i) => i.theme === themeId);
export const chartsOf = (themeId: string) => data.charts.filter((c) => c.theme === themeId);
export const sourceNumber = (id: string) => data.sources.findIndex((s) => s.id === id) + 1;

export const SEVERITY: Record<Status, { label: string; icon: 'triangle' | 'diamond' | 'circle-alert' | 'arrow-up'; rank: number }> = {
  critico: { label: 'Crítico', icon: 'triangle', rank: 0 },
  bajo_presion: { label: 'Bajo presión', icon: 'diamond', rank: 1 },
  moderado: { label: 'Moderado', icon: 'circle-alert', rank: 2 },
  mejorando: { label: 'Mejorando', icon: 'arrow-up', rank: 3 },
};

export const EVIDENCE_LABEL: Record<Evidence, string> = { documentado: 'Documentado', plausible: 'Plausible', hipotesis: 'Hipótesis' };
export const CONFIDENCE_LABEL: Record<Confidence, string> = { alta: 'Confianza alta', media: 'Confianza media', baja: 'Confianza baja' };
export const HORIZON_LABEL: Record<Horizon, string> = { corto: 'Corto plazo', medio: 'Medio plazo', largo: 'Largo plazo' };
export const HORIZON_YEARS: Record<Horizon, string> = { corto: 'menos de 3 años', medio: '3–7 años', largo: 'más de 7 años' };

export const fmtNum = (n: number | null | undefined): string =>
  n === null || n === undefined ? '—' : n.toLocaleString('es-ES', { maximumFractionDigits: 2, useGrouping: 'always' as unknown as boolean });

// ---------------------------------------------------------------------------
// Cause graph: which causes reach which issue (directly or through others)
// ---------------------------------------------------------------------------

const causeMap = new Map(data.causes.map((c) => [c.id, c]));

/** Issue ids a cause ultimately feeds (transitively). */
export function issuesReachedBy(causeId: string, seen = new Set<string>()): Set<string> {
  const out = new Set<string>();
  const c = causeMap.get(causeId);
  if (!c || seen.has(causeId)) return out;
  seen.add(causeId);
  for (const f of c.feeds) {
    if (causeMap.has(f)) issuesReachedBy(f, seen).forEach((x) => out.add(x));
    else out.add(f);
  }
  return out;
}

export const drivers = data.causes.filter((c) => c.level === 'driver');
export const pressures = data.causes.filter((c) => c.level === 'pressure');

/** Pressures that directly feed an issue. */
export const pressuresOf = (issueId: string): Cause[] => pressures.filter((p) => p.feeds.includes(issueId));

/** Drivers that reach an issue (through any pressure), strongest evidence first. */
export function driversOf(issueId: string): Cause[] {
  const rank: Record<Evidence, number> = { documentado: 0, plausible: 1, hipotesis: 2 };
  return drivers
    .filter((d) => issuesReachedBy(d.id).has(issueId))
    .sort((a, b) => rank[a.evidence] - rank[b.evidence] || a.label.localeCompare(b.label, 'es'));
}

/** Drivers with the issues each one reaches — for the causes matrix. */
export const matrix = drivers
  .map((d) => ({ cause: d, issues: issuesReachedBy(d.id) }))
  .sort((a, b) => b.issues.size - a.issues.size || a.cause.label.localeCompare(b.cause.label, 'es'));

// ---------------------------------------------------------------------------
// Knowledge strip
// ---------------------------------------------------------------------------

export const availability = {
  disponible: data.indicators.filter((i) => i.availability === 'disponible'),
  pendiente: data.indicators.filter((i) => i.availability === 'pendiente'),
  no_disponible: data.indicators.filter((i) => i.availability === 'no_disponible'),
};

export const issuesSorted = [...data.themes];

export const fmtVal = (v: { value: number } | null, unit: string): string =>
  v ? `${fmtNum(v.value)}${unit === '%' ? ' %' : ' ' + unit}` : '—';

export const SOURCE_TYPE_LABEL = {
  official_dataset: 'Dato oficial',
  institutional_report: 'Informe institucional',
  peer_reviewed: 'Revisado por pares',
  ngo_report: 'Informe de ONG',
  self_reported: 'Autoinformado',
} as const;
