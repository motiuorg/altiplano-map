// The portfolio's two layers: the work areas (editorial content in src/data/areas.yaml) and the
// interventions from Notion, joined here by area and "Subarea de trabajo".
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type { InterventionRecord } from './records';
import type { Lang } from './i18n';
import { areaTone } from './areas';

export type L = { es: string; en: string };

export interface SubareaDef {
  match: string[];
  line?: L; // optional: the entry may only fix the order
}

// Editorial text for an area (src/data/areas.yaml). Optional pieces may be empty: an area that is in
// Notion but not in the file still gets a page.
export interface AreaDef {
  slug: string;
  num: number;
  match: string[];
  kicker: L;
  lead: L;
  dynamics: { title: L; text: L }[];
  flow: L | null;
  // Optional: split the sub-areas into named flows. `subareas` lists the ones that belong (by match key),
  // `rest` takes everything not claimed by another flow.
  flows?: { title: L; blurb: L; subareas?: string[]; rest?: boolean }[];
  actors: L[];
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
  key: string;
  id: string; // 2.1, 2.2… by position within the area
  name: string; // as written in Notion
  line: L | null;
  items: InterventionRecord[];
  total: number; // summed 5-year adjusted value of the interventions that state one
}

export interface AreaView {
  def: AreaDef;
  slug: string;
  num: number;
  name: string; // as written in Notion
  tone: string;
  subareas: SubareaView[];
  flows: { title: L; blurb: L; subareas: SubareaView[] }[]; // empty when the area has no flows
  items: InterventionRecord[]; // every published intervention of the area
  loose: InterventionRecord[]; // in the area, but with no sub-area
  count: number;
  total: number;
}

// The same figure as the circles chart: summed 5-year adjusted value.
const sum = (xs: InterventionRecord[]) => xs.reduce((n, i) => n + (i.valor5Anos ?? 0), 0);
const empty: L = { es: '', en: '' };
const slugify = (s: string) => norm(s).replace(/ /g, '-');

// Areas and sub-areas are whatever the published interventions say ("Area de trabajo" and "Subarea de
// trabajo"); the yaml only adds text to the ones it knows. Sub-areas with no interventions never appear
// because they are never found. Known areas come first, in the yaml's order.
export function buildAreaViews(interventions: InterventionRecord[]): AreaView[] {
  const defs = loadAreas();
  const groups = new Map<string, { name: string; items: InterventionRecord[] }>();
  for (const itv of interventions) {
    for (const a of itv.areaTrabajo) {
      const key = norm(a);
      if (!key) continue;
      const g = groups.get(key) ?? { name: a, items: [] };
      g.items.push(itv);
      groups.set(key, g);
    }
  }

  const used = new Set<string>();
  const views = [...groups.entries()].map(([key, g]) => {
    let def = defs.find((d) => !used.has(d.slug) && d.match.some((m) => key.startsWith(m)));
    if (def) used.add(def.slug);
    const known = !!def;
    def ??= {
      slug: slugify(g.name),
      num: 0,
      match: [],
      kicker: empty,
      lead: empty,
      dynamics: [],
      flow: null,
      actors: [],
      subareas: [],
    };
    // Sub-areas: the values the area's interventions carry, known ones first in the yaml's order,
    // the rest by number of interventions.
    const subs = new Map<string, { name: string; items: InterventionRecord[] }>();
    for (const itv of g.items) {
      for (const sname of itv.subareas) {
        const k = norm(sname);
        const e = subs.get(k) ?? { name: sname, items: [] };
        e.items.push(itv);
        subs.set(k, e);
      }
    }
    const order = (k: string) => {
      const i = def!.subareas.findIndex((s) => s.match.includes(k));
      return i === -1 ? 999 : i;
    };
    const subareas = [...subs.entries()]
      .sort((x, y) => order(x[0]) - order(y[0]) || y[1].items.length - x[1].items.length || x[1].name.localeCompare(y[1].name, 'es'))
      .map(([k, e]) => ({
        key: k,
        name: e.name,
        line: def!.subareas.find((s) => s.match.includes(k))?.line ?? null,
        items: e.items,
        total: sum(e.items),
      }));
    return { known, key, def, name: g.name, items: g.items, subareas };
  });

  views.sort((a, b) => Number(b.known) - Number(a.known) || (a.known ? defs.indexOf(a.def) - defs.indexOf(b.def) : a.name.localeCompare(b.name, 'es')));

  return views.map((v, i) => {
    const num = i + 1;
    const placed = new Set(v.subareas.flatMap((s) => s.items));
    // Flows: split the sub-areas, flow by flow, in the order the yaml lists them.
    let flat = v.subareas;
    let groups: { title: L; blurb: L; keys: string[] }[] = [];
    if (v.def.flows?.length) {
      // `rest` flows take what no other flow claims; their own list, if any, only sets the order.
      const claimed = new Set(v.def.flows.filter((f) => !f.rest).flatMap((f) => f.subareas ?? []));
      const present = (k: string) => v.subareas.some((s) => s.key === k);
      groups = v.def.flows.map((f) => ({
        title: f.title,
        blurb: f.blurb,
        keys: f.rest
          ? [
              ...(f.subareas ?? []).filter(present),
              ...v.subareas.map((s) => s.key).filter((k) => !claimed.has(k) && !(f.subareas ?? []).includes(k)),
            ]
          : (f.subareas ?? []).filter(present),
      }));
      flat = groups.flatMap((g) => g.keys.map((k) => v.subareas.find((s) => s.key === k)!));
    }
    const subareas = flat.map((s, j) => ({ ...s, id: `${num}.${j + 1}` }));
    return {
      def: v.def,
      slug: v.def.slug,
      num,
      name: v.name,
      tone: areaTone(v.name),
      subareas,
      flows: groups
        .map((g) => ({ title: g.title, blurb: g.blurb, subareas: subareas.filter((s) => g.keys.includes(s.key)) }))
        .filter((g) => g.subareas.length > 0),
      items: v.items,
      loose: v.items.filter((it) => !placed.has(it)),
      count: v.items.length,
      total: sum(v.items),
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
