// The financial strategy diagram's ribbons: drawn from the cards' positions and redrawn whenever a card
// opens or closes or the layout changes. Hovering / focusing a card lights its whole upstream and downstream
// path; an open card keeps its path lit while nothing else is hovered.
type Kind = 'estructura' | 'directo' | 'retornos';
interface Wiring {
  links: { from: string; to: string; kind: Kind }[];
  projects: string[];
  base: string;
  retornos: string;
}
const NS = 'http://www.w3.org/2000/svg';
const ARROW = 9;

function init(root: HTMLElement) {
  const wiring: Wiring = JSON.parse(root.dataset.wiring!);
  const stage = root.querySelector<HTMLElement>('.ff__stage')!;
  const svg = stage.querySelector<SVGSVGElement>('.ff__wires')!;
  const col = (name: string) => stage.querySelector<HTMLElement>(`.ff__col--${name}`)!;
  const nodeEl = new Map<string, HTMLElement>();
  stage.querySelectorAll<HTMLElement>('[data-node]').forEach((el) => nodeEl.set(el.dataset.node!, el));
  const edges = wiring.links.map((l) => ({ ...l, targets: l.to === 'proyectos' ? ['proyectos', ...wiring.projects] : [l.to] }));
  let wires: SVGPathElement[] = [];
  let hovered: string | null = null;
  let pinned: string | null = null;

  const box = (el: Element) => {
    const s = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { l: r.left - s.left, r: r.right - s.left, t: r.top - s.top, b: r.bottom - s.top };
  };
  // anchors sit on a card's header row, so they stay put when the card opens
  const head = (id: string) => box(nodeEl.get(id)!.querySelector('summary') ?? nodeEl.get(id)!);
  const tone = (id: string) => getComputedStyle(nodeEl.get(id)!).getPropertyValue('--tone').trim() || '#6f6a64';
  const el = (tag: string, attrs: Record<string, string | number>) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    return e;
  };

  function draw() {
    svg.replaceChildren();
    const defs = el('defs', {});
    svg.append(defs);
    const src = box(col('src'));
    const mech = box(col('mech'));
    const proj = box(col('proj'));
    const band = box(nodeEl.get(wiring.base)!);
    const projCards = wiring.projects.map((id) => box(nodeEl.get(id)!));
    const bracket = { x: proj.l - 14, t: projCards[0].t, b: projCards[projCards.length - 1].b };
    const firstGroup = box(col('mech').querySelector('.ff__group-title')!);
    const mechTitle = box(col('mech').querySelector('.ff__title')!);
    const laneTop = (mechTitle.b + firstGroup.t) / 2;
    const laneBottom = (Math.max(src.b, mech.b) + band.t) / 2 - 8;
    // a source in the upper half of its column goes over the mechanisms, one in the lower half under them
    const midY = (src.t + src.b) / 2;

    // where each ribbon ends (for ordering anchors), and its end point
    const endY = (e: (typeof edges)[number]) =>
      e.to === wiring.base ? band.t : e.to === 'proyectos' ? (e.kind === 'directo' && head(e.from).t < midY ? -1 : (bracket.t + bracket.b) / 2) : (head(e.to).t + head(e.to).b) / 2;
    const spread = (list: typeof edges, e: (typeof edges)[number], h: ReturnType<typeof box>) => {
      const i = list.indexOf(e);
      const top = h.t + 8;
      const span = h.b - h.t - 16;
      return list.length === 1 ? top + span / 2 : top + (span * i) / (list.length - 1);
    };
    const outs = new Map<string, typeof edges>();
    const ins = new Map<string, typeof edges>();
    for (const e of edges) {
      (outs.get(e.from) ?? outs.set(e.from, []).get(e.from)!).push(e);
      if (e.to !== wiring.base && e.to !== 'proyectos') (ins.get(e.to) ?? ins.set(e.to, []).get(e.to)!).push(e);
    }
    outs.forEach((l) => l.sort((a, b) => endY(a) - endY(b)));
    ins.forEach((l) => l.sort((a, b) => head(a.from).t - head(b.from).t));

    // drops into the base: one vertical per source, in the gap right of its column
    const dropX = new Map<string, number>();
    let fromSrc = src.r + 34;
    let fromMech = mech.r + 34;
    for (const e of edges.filter((e) => e.to === wiring.base)) {
      const isMech = col('mech').contains(nodeEl.get(e.from)!);
      dropX.set(e.from, isMech ? fromMech : fromSrc);
      if (isMech) fromMech += 26;
      else fromSrc += 26;
    }

    wires = edges.map((e, i) => {
      const a = head(e.from);
      const x1 = a.r;
      const y1 = spread(outs.get(e.from)!, e, a);
      const c1 = tone(e.from);
      let d: string;
      let x2: number;
      let c2: string;
      if (e.to === wiring.base) {
        x2 = dropX.get(e.from)!;
        c2 = '#6f6a64';
        const r = 24;
        d = `M${x1},${y1} H${x2 - r} Q${x2},${y1} ${x2},${y1 + r} V${band.t - 1}`;
        if (e.kind === 'retornos') {
          const t = el('text', { class: 'ff-label', x: x2 + 7, y: band.t - 10 });
          t.textContent = wiring.retornos;
          svg.append(t);
        }
      } else {
        const toAll = e.to === 'proyectos';
        const b = toAll ? null : head(e.to);
        x2 = (b ? b.l : bracket.x) - 1;
        c2 = b ? tone(e.to) : '#6f6a64';
        const y2 = b ? spread(ins.get(e.to)!, e, b) : (bracket.t + bracket.b) / 2;
        if (e.kind === 'directo') {
          const lane = y1 < midY ? laneTop : laneBottom;
          const m1 = mech.l - 28;
          const m2 = mech.r + 28;
          d = `M${x1},${y1} C${(x1 + m1) / 2},${y1} ${(x1 + m1) / 2},${lane} ${m1},${lane} H${m2} C${(m2 + x2) / 2},${lane} ${(m2 + x2) / 2},${y2} ${x2},${y2}`;
        } else {
          const mx = (x1 + x2) / 2;
          d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
        }
      }
      const g = el('linearGradient', { id: `ffg${i}`, gradientUnits: 'userSpaceOnUse', x1, y1: 0, x2, y2: 0 });
      g.append(el('stop', { offset: 0, 'stop-color': c1 }), el('stop', { offset: 1, 'stop-color': c2 }));
      const m = el('marker', { id: `ffa${i}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: ARROW, markerHeight: ARROW, markerUnits: 'userSpaceOnUse', orient: 'auto' });
      m.append(el('path', { d: 'M0,0 L10,5 L0,10 z', fill: c2 }));
      defs.append(g, m);
      const p = el('path', { class: `ff-wire ff-wire--${e.kind}`, d, stroke: `url(#ffg${i})`, 'marker-end': `url(#ffa${i})` }) as SVGPathElement;
      svg.append(p);
      return p;
    });
    svg.append(el('path', { class: 'ff-bracket', d: `M${bracket.x + 7},${bracket.t} H${bracket.x} V${bracket.b} H${bracket.x + 7}` }));
    light();
  }

  const walk = (start: string, dir: 'down' | 'up') => {
    const seen = new Set<string>([start]);
    const hit = new Set<number>();
    const stack = [start];
    while (stack.length) {
      const id = stack.pop()!;
      edges.forEach((e, i) => {
        const next = dir === 'down' ? (e.from === id ? e.targets : []) : e.targets.includes(id) ? [e.from] : [];
        if (!next.length) return;
        hit.add(i);
        for (const n of next) if (!seen.has(n)) { seen.add(n); stack.push(n); }
      });
    }
    return { seen, hit };
  };
  function light() {
    const id = hovered ?? pinned;
    stage.classList.toggle('is-focus', id !== null);
    if (id === null) {
      wires.forEach((w) => w.classList.remove('is-on'));
      nodeEl.forEach((n) => n.classList.remove('is-on'));
      return;
    }
    const d = walk(id, 'down');
    const u = walk(id, 'up');
    const ids = new Set([...d.seen, ...u.seen]);
    wires.forEach((w, i) => w.classList.toggle('is-on', d.hit.has(i) || u.hit.has(i)));
    nodeEl.forEach((n, nid) => n.classList.toggle('is-on', ids.has(nid)));
  }

  nodeEl.forEach((n, id) => {
    n.addEventListener('pointerenter', () => { hovered = id; light(); });
    n.addEventListener('pointerleave', () => { hovered = null; light(); });
    n.addEventListener('focusin', () => { hovered = id; light(); });
    n.addEventListener('focusout', () => { hovered = null; light(); });
  });
  // a card opening or closing moves the cards below it: redraw, and keep the open card's path lit
  stage.addEventListener('toggle', (ev) => {
    const card = ev.target as HTMLDetailsElement;
    const id = card.dataset.node ?? (card.closest('[data-node]') as HTMLElement | null)?.dataset.node ?? null;
    if (card.open) pinned = id;
    else if (pinned === id) pinned = [...stage.querySelectorAll<HTMLDetailsElement>('details[data-node][open]')].pop()?.dataset.node ?? null;
    draw();
  }, true);
  new ResizeObserver(draw).observe(stage);
  document.fonts?.ready.then(draw);
  draw();
}
document.querySelectorAll<HTMLElement>('[data-finance-flow]').forEach(init);
