// Work areas (áreas de trabajo; four in Notion, the finer "subárea" is not shown) each get one badge colour, fixed, so a colour always means the
// same area. Hues are the design system's Badge tones. A new area that isn't listed gets a stable
// colour picked from its name, so it never changes between builds.
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const KNOWN: Array<[prefix: string, tone: string]> = [
  ['agricultura regenerativa', 'tissue'],
  ['espacios naturales', 'neural'], // earlier name of the same area
  ['zonas naturales', 'neural'],
  ['articulacion', 'flow'], // "Articulación e impulso del territorio" / "…y desarrollo territorial"
  ['educacion', 'purple'], // "Educación cultura y turismo" (older: "Educación, cultura y turismo")
];

// Hues kept for areas added later (the known ones above are not reused here).
const SPARE = ['blue', 'yellow', 'pink', 'green', 'tissue', 'neural', 'flow', 'purple'];

export function areaTone(area: string): string {
  const n = norm(area);
  const hit = KNOWN.find(([p]) => n.startsWith(p));
  if (hit) return hit[1];
  let h = 0;
  for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SPARE[h % SPARE.length];
}
