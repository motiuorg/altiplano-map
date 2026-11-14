// The financial strategy page's content (src/data/estrategia.yaml): nodes, links and card texts.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export type L = { es: string; en: string };
export interface FlowItem {
  id: string;
  label: L;
  short?: L; // shorter label for the diagram, when the full one doesn't fit a pill
  text: L;
}
export interface Mechanism extends FlowItem {
  group: 'sin-retorno' | 'con-retorno';
  status: L;
}
export type LinkKind = 'estructura' | 'directo' | 'retornos';
export interface Link {
  from: string;
  to: string; // a node id, 'proyectos' (the whole column) or 'proceso' (the base band)
  kind: LinkKind;
}
export interface Strategy {
  intro: L;
  sources: FlowItem[];
  mechanisms: Mechanism[];
  projects: FlowItem[];
  process: { id: string; label: L; parts: { label: L; text: L }[] };
  links: Link[];
}

let cache: Strategy | null = null;
export function loadStrategy(): Strategy {
  if (!cache) {
    const file = path.join(process.cwd(), 'src/data/estrategia.yaml');
    cache = yaml.load(fs.readFileSync(file, 'utf8')) as Strategy;
    const ids = new Set([
      ...cache.sources, ...cache.mechanisms, ...cache.projects,
    ].map((n) => n.id).concat('proyectos', cache.process.id));
    for (const l of cache.links) {
      if (!ids.has(l.from) || !ids.has(l.to)) throw new Error(`estrategia.yaml: unknown node in link ${l.from} → ${l.to}`);
    }
  }
  return cache;
}
