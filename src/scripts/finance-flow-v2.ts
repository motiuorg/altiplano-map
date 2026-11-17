// The financial strategy v2 diagram's ribbons and area chips. The ribbons are drawn from the cards' positions
// and redrawn whenever a card opens or closes, the layout changes or an area is chosen. Hovering / focusing a
// card lights its whole upstream and downstream path; an open card keeps its path lit while nothing else is
// hovered. Choosing an area hides every card that doesn't connect to it (the cards upstream of its
// sub-areas stay, and so does the base band, which is transversal) and keeps the choice in the URL hash
// (#area=forestal).
type Kind = 'estructura' | 'directo' | 'retornos';
interface Edge {
  from: string;
  to: string;
  kind: Kind;
}
interface Wiring {
  links: Edge[];
  base: string;
  areas: Record<string, string[]>; // area id → the ids that are its sub-areas (the base is not one: it is in every view)
  retornos: string;
}
const NS = 'http://www.w3.org/2000/svg';
const ARROW = 9;
const LANE_GAP = 7;

function init(root: HTMLElement) {
  const wiring: Wiring = JSON.parse(root.dataset.wiring!);
  const stage = root.querySelector<HTMLElement>('.ff__stage')!;
  const svg = stage.querySelector<SVGSVGElement>('.ff__wires')!;
  const col = (name: string) => stage.querySelector<HTMLElement>(`.ff__col--${name}`)!;
  const nodeEl = new Map<string, HTMLElement>();
  stage.querySelectorAll<HTMLElement>('[data-node]').forEach((el) => nodeEl.set(el.dataset.node!, el));
  const edges: Edge[] = wiring.links;
  let live: Edge[] = edges;
  let wires: SVGPathElement[] = [];
  let hovered: string | null = null;
  let pinned: string | null = null;
  let area = 'all';

  const shown = (id: string) => nodeEl.get(id)!.offsetParent !== null;
  const box = (el: Element) => {
    const s = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { l: r.left - s.left, r: r.right - s.left, t: r.top - s.top, b: r.bottom - s.top };
  };
  type Box = ReturnType<typeof box>;
  // anchors sit on a card's header row, so they stay put when the card opens
  const head = (id: string) => box(nodeEl.get(id)!.querySelector('summary') ?? nodeEl.get(id)!);
  const tone = (id: string) => getComputedStyle(nodeEl.get(id)!).getPropertyValue('--tone').trim() || '#6f6a64';
  const mid = (b: Box) => (b.t + b.b) / 2;
  const el = (tag: string, attrs: Record<string, string | number>) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    return e;
  };

  function draw() {
    svg.replaceChildren();
    const defs = el('defs', {});
    svg.append(defs);
    live = edges.filter((e) => shown(e.from) && shown(e.to));

    const srcCol = box(col('src'));
    const mechCol = box(col('mech'));
    const band = box(nodeEl.get(wiring.base)!);
    const mechCards = [...col('mech').querySelectorAll<HTMLElement>('.ff-card')].filter((c) => c.offsetParent !== null);
    // the free strips above and below the mechanisms, where the direct ribbons run
    const stripTop = box(col('mech').querySelector('.ff__title')!).b + 8;
    const stripTopEnd = mechCards.length ? box(mechCards[0]).t - 8 : stripTop + 80;
    const stripBottom = mechCards.length ? box(mechCards[mechCards.length - 1]).b + 8 : mechCol.b - 80;
    const stripBottomEnd = mechCol.b - 8;
    const midY = mid(srcCol);

    const isBase = (e: Edge) => e.to === wiring.base;
    const isLane = (e: Edge) => e.kind === 'directo' && !isBase(e) && col('src').contains(nodeEl.get(e.from)!);
    const goesOver = (e: Edge) => mid(head(e.from)) < midY;

    // lanes: top and bottom, nested so ribbons from higher sources take outer lanes
    const laneY = new Map<Edge, number>();
    const assign = (list: Edge[], start: number, end: number, dir: 1 | -1) => {
      list.sort((a, b) => mid(head(a.from)) - mid(head(b.from)) || mid(head(a.to)) - mid(head(b.to)));
      const gap = Math.min(LANE_GAP, Math.max(2, (end - start) / Math.max(list.length, 1)));
      list.forEach((e, k) => laneY.set(e, dir === 1 ? start + k * gap : end - (list.length - 1 - k) * gap));
    };
    assign(live.filter((e) => isLane(e) && goesOver(e)), stripTop, stripTopEnd, 1);
    assign(live.filter((e) => isLane(e) && !goesOver(e)), stripBottom, stripBottomEnd, 1);

    // where each ribbon ends, to order the anchors on a card's edge
    const endY = (e: Edge) => {
      if (isBase(e)) return band.t;
      const y = mid(head(e.to));
      return isLane(e) ? (goesOver(e) ? -1e6 + y : 1e6 + y) : y;
    };
    const spread = (list: Edge[], e: Edge, h: Box) => {
      const i = list.indexOf(e);
      const top = h.t + 8;
      const span = h.b - h.t - 16;
      return list.length === 1 ? top + span / 2 : top + (span * i) / (list.length - 1);
    };
    const outs = new Map<string, Edge[]>();
    const ins = new Map<string, Edge[]>();
    for (const e of live) {
      (outs.get(e.from) ?? outs.set(e.from, []).get(e.from)!).push(e);
      if (!isBase(e)) (ins.get(e.to) ?? ins.set(e.to, []).get(e.to)!).push(e);
    }
    outs.forEach((l) => l.sort((a, b) => endY(a) - endY(b)));
    ins.forEach((l) => l.sort((a, b) => mid(head(a.from)) - mid(head(b.from))));

    // drops into the base: one vertical per origin, in the gap right of its column
    const dropX = new Map<string, number>();
    let fromSrc = srcCol.r + 30;
    let fromMech = mechCol.r + 30;
    for (const e of live.filter(isBase)) {
      const isMech = col('mech').contains(nodeEl.get(e.from)!);
      dropX.set(e.from, isMech ? fromMech : fromSrc);
      if (isMech) fromMech += 24;
      else fromSrc += 24;
    }

    wires = live.map((e, i) => {
      const a = head(e.from);
      const x1 = a.r;
      const y1 = spread(outs.get(e.from)!, e, a);
      const c1 = tone(e.from);
      let d: string;
      let x2: number;
      let c2: string;
      if (isBase(e)) {
        x2 = dropX.get(e.from)!;
        c2 = tone(wiring.base);
        const r = 22;
        d = `M${x1},${y1} H${x2 - r} Q${x2},${y1} ${x2},${y1 + r} V${band.t - 1}`;
        if (e.kind === 'retornos') {
          const t = el('text', { class: 'ff-label', x: x2 + 7, y: band.t - 10 });
          t.textContent = wiring.retornos;
          svg.append(t);
        }
      } else {
        const b = head(e.to);
        x2 = b.l - 1;
        c2 = tone(e.to);
        const y2 = spread(ins.get(e.to)!, e, b);
        if (isLane(e)) {
          const lane = laneY.get(e)!;
          const m1 = mechCol.l - 24;
          const m2 = mechCol.r + 24;
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
    light();
  }

  // everything reachable from `start`, going downstream ('down') or upstream ('up') over `list`
  const walk = (list: Edge[], start: string, dir: 'down' | 'up') => {
    const seen = new Set<string>([start]);
    const hit = new Set<number>();
    const stack = [start];
    while (stack.length) {
      const id = stack.pop()!;
      list.forEach((e, i) => {
        const next = dir === 'down' ? (e.from === id ? e.to : null) : e.to === id ? e.from : null;
        if (next === null) return;
        hit.add(i);
        if (!seen.has(next)) { seen.add(next); stack.push(next); }
      });
    }
    return { seen, hit };
  };
  function light() {
    const id = hovered ?? pinned;
    stage.classList.toggle('is-focus', id !== null && shown(id));
    if (id === null || !shown(id)) {
      wires.forEach((w) => w.classList.remove('is-on'));
      nodeEl.forEach((n) => n.classList.remove('is-on'));
      return;
    }
    const d = walk(live, id, 'down');
    const u = walk(live, id, 'up');
    const ids = new Set([...d.seen, ...u.seen]);
    wires.forEach((w, i) => w.classList.toggle('is-on', d.hit.has(i) || u.hit.has(i)));
    nodeEl.forEach((n, nid) => n.classList.toggle('is-on', ids.has(nid)));
  }

  // choose an area: keep its sub-areas and everything upstream of them, hide the rest
  function setArea(next: string, remember = true) {
    area = next in wiring.areas ? next : 'all';
    const keep = new Set<string>();
    if (area === 'all') nodeEl.forEach((_, id) => keep.add(id));
    else {
      for (const sub of wiring.areas[area]) walk(edges, sub, 'up').seen.forEach((id) => keep.add(id));
      keep.add(wiring.base); // the base is in every view: the mechanisms that fund it still reach it
    }
    nodeEl.forEach((n, id) => n.classList.toggle('is-off', !keep.has(id)));
    root.querySelectorAll<HTMLElement>('[data-area-group]').forEach((g) => g.classList.toggle('is-off', area !== 'all' && g.dataset.areaGroup !== area));
    stage.classList.toggle('is-single', area !== 'all');
    root.querySelectorAll<HTMLElement>('[data-area-note]').forEach((p) => { p.hidden = p.dataset.areaNote !== area; });
    root.querySelectorAll<HTMLButtonElement>('[data-area-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.areaBtn === area)));
    // a pinned card that just left can't stay pinned
    if (pinned && !keep.has(pinned)) pinned = null;
    stage.querySelectorAll<HTMLDetailsElement>('details[open]').forEach((d) => { if (d.classList.contains('is-off')) d.open = false; });
    if (remember) {
      const url = location.pathname + location.search + (area === 'all' ? '' : `#area=${area}`);
      history.replaceState(null, '', url);
    }
    draw();
  }

  nodeEl.forEach((n, id) => {
    n.addEventListener('pointerenter', () => { hovered = id; light(); });
    n.addEventListener('pointerleave', () => { hovered = null; light(); });
    n.addEventListener('focusin', () => { hovered = id; light(); });
    n.addEventListener('focusout', () => { hovered = null; light(); });
  });
  root.querySelectorAll<HTMLButtonElement>('[data-area-btn]').forEach((b) => b.addEventListener('click', () => setArea(b.dataset.areaBtn!)));
  window.addEventListener('hashchange', () => setArea(location.hash.match(/^#area=([\w-]+)$/)?.[1] ?? 'all', false));
  // a click anywhere on a card opens or closes it, not only on its header (the header does it natively);
  // selecting text inside an open card doesn't count as a click
  stage.addEventListener('click', (ev) => {
    const card = (ev.target as Element).closest<HTMLDetailsElement>('details.ff-card');
    if (!card || (ev.target as Element).closest('summary, a, button')) return;
    if (window.getSelection()?.toString()) return;
    card.open = !card.open;
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
  setArea(location.hash.match(/^#area=([\w-]+)$/)?.[1] ?? 'all', false);
}
document.querySelectorAll<HTMLElement>('[data-finance-flow]').forEach(init);
