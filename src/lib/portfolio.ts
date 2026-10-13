// The portfolio's two layers: the work areas (editorial content in src/data/areas.yaml) and the
// interventions from Notion, joined here by area and "Subarea de trabajo".
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type { InterventionRecord } from './records';
import type { Lang } from './i18n';

export type L = { es: string; en: string };

export interface SubareaDef {
  id: string;
  match: string;
  name: L;
  line: L;
}

export interface AreaDef {
  slug: string;
  num: number;
  tone: string;
  match: string[];
  name: L;
  short: L;
  kicker: L;
  lead: L;
  dynamics: { title: L; text: L }[];
  tension: L;
  tensionNote: L | null;
  flow: L;
  actors: L[];
  financing: { text: L; mechanisms: L[] };
  subareas: SubareaDef[];
}

export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

let areasCache: AreaDef[] | null = null;
export function loadAreas(): AreaDef[] {
  if (!areasCache) {
    const file = path.join(process.cwd(), 'src/data/areas.yaml');
    areasCache = (yaml.load(fs.readFileSync(file, 'utf8')) as { areas: AreaDef[] }).areas;
  }
  return areasCache;
}

export const pick = (l: L, lang: Lang) => l[lang] ?? l.es;

export interface SubareaView {
  def: SubareaDef;
  items: InterventionRecord[];
  total: number; // summed total financing of the interventions that state one
}

export interface AreaView {
  def: AreaDef;
  subareas: SubareaView[];
  loose: InterventionRecord[]; // in the area, but with no (or an unknown) sub-area
  count: number;
  total: number;
}

const sum = (xs: InterventionRecord[]) => xs.reduce((n, i) => n + (i.financiacion ?? 0), 0);

export function buildAreaViews(interventions: InterventionRecord[]): AreaView[] {
  return loadAreas().map((def) => {
    const items = interventions.filter((i) =>
      i.areaTrabajo.some((a) => def.match.some((m) => norm(a).startsWith(m))),
    );
    const subareas = def.subareas.map((s) => {
      const mine = items.filter((i) => norm(i.subarea) === s.match);
      return { def: s, items: mine, total: sum(mine) };
    });
    const placed = new Set(subareas.flatMap((s) => s.items));
    return {
      def,
      subareas,
      loose: items.filter((i) => !placed.has(i)),
      count: items.length,
      total: sum(items),
    };
  });
}

// 3,7 M€ · 850 mil € · 1.2 M€ — compact, in the page's language.
export function compactEuro(n: number, lang: Lang): string {
  const loc = lang === 'en' ? 'en-GB' : 'es-ES';
  return `${n.toLocaleString(loc, { notation: 'compact', maximumFractionDigits: 1 })} €`;
}

// CSS colour for a tone's light / mid / dark step. Pillar tones and hue tones use different token names.
const PILLARS = new Set(['tissue', 'neural', 'flow']);
export function toneVars(tone: string): string {
  const p = PILLARS.has(tone) ? `--pillar-${tone}` : `--hue-${tone}`;
  return `--tone-l:var(${p}-light);--tone-m:var(${p}-mid);--tone-d:var(${p}-dark)`;
}

// Site-internal link to the portfolio, or to one area's page.
export function portfolioHref(lang: Lang, slug?: string, hash = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  return `${base}${lang === 'en' ? '/en' : ''}/portafolio/${slug ? slug + '/' : ''}${hash}`;
}
