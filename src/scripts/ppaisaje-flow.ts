// Lights the whole upstream + downstream path of a hovered / focused flow node.
// Progressive enhancement: the diagrams are complete static SVG without this.
function init(box: HTMLElement) {
  const svg = box.querySelector('svg')!;
  const links = [...svg.querySelectorAll<SVGPathElement>('.sk__link')];
  const nodes = [...svg.querySelectorAll<SVGGElement>('.sk__node')];
  const edges = links.map((l) => ({ el: l, from: l.dataset.from!, to: l.dataset.to! }));

  const walk = (start: string, dir: 'down' | 'up') => {
    const seen = new Set<string>([start]);
    const hit = new Set<SVGPathElement>();
    const stack = [start];
    while (stack.length) {
      const id = stack.pop()!;
      for (const e of edges) {
        const next = dir === 'down' ? (e.from === id ? e.to : null) : e.to === id ? e.from : null;
        if (next === null) continue;
        hit.add(e.el);
        if (!seen.has(next)) { seen.add(next); stack.push(next); }
      }
    }
    return { seen, hit };
  };

  const on = (id: string) => {
    const d = walk(id, 'down');
    const u = walk(id, 'up');
    const ids = new Set([...d.seen, ...u.seen]);
    svg.classList.add('is-focus');
    links.forEach((l) => l.classList.toggle('is-on', d.hit.has(l) || u.hit.has(l)));
    nodes.forEach((n) => n.classList.toggle('is-on', ids.has(n.dataset.id!)));
  };
  const off = () => {
    svg.classList.remove('is-focus');
    links.forEach((l) => l.classList.remove('is-on'));
    nodes.forEach((n) => n.classList.remove('is-on'));
  };
  nodes.forEach((n) => {
    n.addEventListener('pointerenter', () => on(n.dataset.id!));
    n.addEventListener('pointerleave', off);
    n.addEventListener('focus', () => on(n.dataset.id!));
    n.addEventListener('blur', off);
  });
}
document.querySelectorAll<HTMLElement>('[data-flow]').forEach(init);
