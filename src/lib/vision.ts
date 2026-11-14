// The regenerative vision page's content (src/data/vision.yaml): the layers of the tree and the bands
// between them, each placed on the illustration.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type { L } from './estrategia';

export interface Pos {
  x: number;
  y: number;
  w: number;
  h?: number;
}
export interface Layer {
  label: L;
  sub: L;
  tone: string; // a site badge tone, or neutral
  pos: Pos;
  mock: { y: number; h: number }; // the mockup's position: the gap the illustration leaves for the card
  centre?: boolean; // centre the row between the bands around it
  items: L[];
}
export interface Band {
  band: L;
  pos: Pos;
  up: L; // what the layer below gives
  down: L; // what the layer above gives back
}
export interface Vision {
  eyebrow: L;
  title: L;
  intro: L;
  size: { w: number; h: number };
  parts: (Layer | Band)[];
}

let cache: Vision | null = null;
export function loadVision(): Vision {
  if (!cache) {
    const file = path.join(process.cwd(), 'src/data/vision.yaml');
    cache = yaml.load(fs.readFileSync(file, 'utf8')) as Vision;
  }
  return cache;
}
