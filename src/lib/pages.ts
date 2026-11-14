// Editorial content of the home and governance pages (src/data/home.yaml, src/data/gobernanza.yaml).
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type { L } from './estrategia';

const read = <T>(file: string): T => yaml.load(fs.readFileSync(path.join(process.cwd(), 'src/data', file), 'utf8')) as T;

export interface Home {
  hero: { lede: L; cta: L; mapNote: L };
  territory: { eyebrow: L; title: L; text: L[]; stats: { value: string; label: L }[] };
  process: {
    eyebrow: L;
    title: L;
    text: L[];
    stats: { core: L; areas: L; itvs: L; fin: L };
  };
  tour: {
    eyebrow: L;
    title: L;
    intro: L;
    steps: { id: string; href: string; verb: L; label: L; question: L; text: L }[];
  };
  closing: { title: L; text: L; cta: L };
}
type Labelled = { label: L; text: L };
export interface Governance {
  eyebrow: L;
  title: L;
  intro: L;
  why: { title: L; text: L[] };
  purpose: { title: L; text: L };
  returns: { title: L; lead: L; items: (Labelled & { tone: string })[] };
  principles: { title: L; items: L[] };
  circles: { title: L; lead: L; items: Labelled[]; coordination: L };
  members: { title: L; lead: L };
  fronts: { title: L; items: Labelled[]; not: { title: L; items: L[] } };
  decisions: { title: L; items: Labelled[] };
}

// Texts in these files can carry links written as [text](https://…). Everything else is escaped.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const withLinks = (s: string) =>
  esc(s).replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
// The same text without the link markup, for places that take plain text.
export const plain = (s: string) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

let home: Home | null = null;
let gov: Governance | null = null;
export const loadHome = () => (home ??= read<Home>('home.yaml'));
export const loadGovernance = () => (gov ??= read<Governance>('gobernanza.yaml'));
