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

export function initGalleryFilters(): void {
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
      if (show) seen.add(it.dataset.itemId ?? String(items.indexOf(it)));
    }
    if (counter) counter.textContent = shown(seen.size);
    if (empty) empty.hidden = seen.size !== 0;
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
