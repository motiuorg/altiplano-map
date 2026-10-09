// Gallery filtering shared by both pages.
//
// Controls (inside [data-filter-bar]):
//   .chip[data-key][data-value]   – single-choice chips (value "" = all)
//   select[data-key]              – dropdowns (option value "" = all)
//   [data-range]                  – dual slider on a numeric data attribute
// Items ([data-filterable], e.g. cards and table rows) carry matching
// data-{key} attributes; multi-valued ones are pipe-joined and lowercase.
// Count = distinct data-item-id among the visible items.

const lang = document.documentElement.lang === 'en' ? 'en' : 'es';
const locale = lang === 'en' ? 'en-GB' : 'es-ES';
const shown = (n: number) => (lang === 'en' ? `${n} shown` : `${n} mostradas`);
const compact = (n: number) => `${n.toLocaleString(locale, { notation: 'compact', maximumFractionDigits: 1 })} €`;
const overFive = (n: number) => (lang === 'en' ? `${compact(n)} over 5 years` : `${compact(n)} a 5 años`);

// Containers marked [data-shuffle] list their cards in a new random order on every load,
// so no organisation or intervention always comes first. Tables keep their order.
function shuffleCards(): void {
  document.querySelectorAll<HTMLElement>('[data-shuffle]').forEach((box) => {
    const kids = [...box.children];
    for (let i = kids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [kids[i], kids[j]] = [kids[j], kids[i]];
    }
    kids.forEach((k) => box.appendChild(k));
  });
}

export function initGalleryFilters(): void {
  shuffleCards();
  const bar = document.querySelector<HTMLElement>('[data-filter-bar]');
  if (!bar) return;
  const items = [...document.querySelectorAll<HTMLElement>('[data-filterable]')];
  const counter = document.querySelector<HTMLElement>('[data-visible-count]');
  const empty = document.querySelector<HTMLElement>('[data-empty]');
  const state = new Map<string, string>();

  // Optional range slider
  const range = bar.querySelector<HTMLElement>('[data-range]');
  const loInput = range?.querySelector<HTMLInputElement>('[data-range-lo]') ?? null;
  const hiInput = range?.querySelector<HTMLInputElement>('[data-range-hi]') ?? null;
  const rangeKey = range?.dataset.range ?? '';
  const rangeOut = range?.querySelector<HTMLElement>('[data-range-out]') ?? null;
  const fmt = (n: number) => `${Math.round(n).toLocaleString(locale)} €`;

  const apply = () => {
    const seen = new Set<string>();
    let valor5 = 0;
    let hasValor5 = false;
    // "Narrowed" means moved in from where the thumbs start (data-default), not from the ends of the track.
    const rangeActive =
      !!(loInput && hiInput) &&
      (Number(loInput!.value) > Number(loInput!.dataset.default ?? loInput!.min) ||
        Number(hiInput!.value) < Number(hiInput!.dataset.default ?? hiInput!.max));
    for (const it of items) {
      let show = true;
      for (const [key, value] of state) {
        if (!value) continue;
        const vals = (it.dataset[key] ?? '').split('|').filter(Boolean);
        if (!vals.includes(value)) {
          show = false;
          break;
        }
      }
      if (show && rangeActive) {
        const raw = it.dataset[rangeKey];
        const n = raw === undefined || raw === '' ? NaN : Number(raw);
        // Entries without a figure are hidden once the range is narrowed.
        show = !Number.isNaN(n) && n >= Number(loInput!.value) && n <= Number(hiInput!.value);
      }
      it.hidden = !show;
      if (show) {
        const id = it.dataset.itemId ?? String(items.indexOf(it));
        // Cards and table rows both carry the item: count each intervention once.
        if (!seen.has(id) && it.dataset.valor5 !== undefined) {
          hasValor5 = true;
          const v = Number(it.dataset.valor5);
          if (it.dataset.valor5 !== '' && !Number.isNaN(v)) valor5 += v;
        }
        seen.add(id);
      }
    }
    if (counter) counter.textContent = hasValor5 ? `${shown(seen.size)} · ${overFive(valor5)}` : shown(seen.size);
    if (empty) empty.hidden = seen.size !== 0;
    document.dispatchEvent(new CustomEvent('gallery:applied'));
  };

  bar.querySelectorAll<HTMLElement>('.chip[data-key]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.key!;
      state.set(key, chip.dataset.value ?? '');
      bar
        .querySelectorAll<HTMLElement>(`.chip[data-key="${key}"]`)
        .forEach((c) => c.classList.toggle('is-active', c === chip));
      apply();
    });
  });

  bar.querySelectorAll<HTMLSelectElement>('select[data-key]').forEach((sel) => {
    sel.addEventListener('change', () => {
      state.set(sel.dataset.key!, sel.value);
      apply();
    });
  });

  if (loInput && hiInput) {
    const sync = (changed: 'lo' | 'hi') => {
      let lo = Number(loInput.value);
      let hi = Number(hiInput.value);
      if (lo > hi) {
        if (changed === 'lo') loInput.value = String((lo = hi));
        else hiInput.value = String((hi = lo));
      }
      const min = Number(loInput.min);
      const max = Number(loInput.max);
      const track = range!.querySelector<HTMLElement>('[data-range-fill]');
      if (track && max > min) {
        track.style.left = `${((lo - min) / (max - min)) * 100}%`;
        track.style.right = `${100 - ((hi - min) / (max - min)) * 100}%`;
      }
      if (rangeOut) rangeOut.textContent = `${fmt(lo)} – ${fmt(hi)}`;
      apply();
    };
    loInput.addEventListener('input', () => sync('lo'));
    hiInput.addEventListener('input', () => sync('hi'));
    sync('lo');
  } else {
    apply();
  }
}
