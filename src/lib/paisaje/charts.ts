// Tiny geometry helpers for build-time SVG charts (no chart library).

export function niceTicks(min: number, max: number, n = 5): number[] {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const step0 = Math.pow(10, Math.floor(Math.log10(span / n)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * step0).find((s) => span / s <= n) ?? step0 * 10;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));
  return ticks;
}

export const linear = (d0: number, d1: number, r0: number, r1: number) => (v: number) =>
  d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

export const polyline = (pts: [number, number][]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

// Sparkline points inside a w×h box (padding p)
export function sparkPoints(values: number[], w = 96, h = 28, p = 3): [number, number][] {
  if (values.length < 2) return [];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const x = linear(0, values.length - 1, p, w - p);
  const y = linear(lo, hi, h - p, p);
  return values.map((v, i) => [x(i), hi === lo ? h / 2 : y(v)]);
}
