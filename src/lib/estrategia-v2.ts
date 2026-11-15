// The financial strategy v2 page's content (src/data/estrategia-v2.yaml): nodes, links and card texts.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type { L, LinkKind } from './estrategia';

export type { L, LinkKind };
export interface Source {
  id: string;
  label: L;
  short?: L; // shorter label for the diagram, when the full one doesn't fit a pill
  text: L;
  how?: L; // how the money is reached
  funds?: L; // what it funds well
  asks?: L; // what it usually requires
  challenges?: L; // why it is hard: limits and difficulties
}
export interface Mechanism {
  id: string;
  label: L;
  status: L;
  idea?: boolean; // an idea to explore, not yet in design
  text: L;
  how: L; // how it would work: the steps, and the key participants where relevant
  evolution?: L; // what it could become in the long term
}
export interface SubArea {
  id: string;
  label: L;
  text: L;
  gap?: boolean; // no source mapped in the cards yet
}
export interface Area {
  id: string;
  label: L;
  text: L;
  tone: string; // the design system's tone key for this area, as in the portfolio (src/lib/areas.ts)
  slug: string; // its page under /portafolio/
  subareas: SubArea[];
}
export interface Link {
  from: string;
  to: string; // a node id, or the base's id
  kind: LinkKind;
}
export interface StrategyV2 {
  intro: L;
  sources: Source[];
  mechanisms: Mechanism[];
  areas: Area[];
  base: Area;
  links: Link[];
}

let cache: StrategyV2 | null = null;
export function loadStrategyV2(): StrategyV2 {
  if (!cache) {
    const file = path.join(process.cwd(), 'src/data/estrategia-v2.yaml');
    const data = yaml.load(fs.readFileSync(file, 'utf8')) as StrategyV2;
    const ids = new Set<string>([data.base.id]);
    for (const n of [...data.sources, ...data.mechanisms, ...data.areas.flatMap((a) => a.subareas)]) {
      if (ids.has(n.id)) throw new Error(`estrategia-v2.yaml: duplicate id ${n.id}`);
      ids.add(n.id);
    }
    for (const l of data.links) {
      if (!ids.has(l.from) || !ids.has(l.to)) throw new Error(`estrategia-v2.yaml: unknown node in link ${l.from} → ${l.to}`);
    }
    cache = data;
  }
  return cache;
}
