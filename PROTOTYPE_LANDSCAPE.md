# Prototype: "Paisaje en datos" (landscape in data)

**Status: layout/storytelling mockup. Every figure, report, source and polygon is fake.**
Branch: `proto/landscape-section` (local, not pushed). Route: `/paisaje/` (Spanish only).

## What was built and where

| Piece | File |
|---|---|
| Page (route) | `src/pages/paisaje.astro` → `src/views/PaisajePage.astro` |
| Fake content (one file, `"fake": true`) | `src/data/paisaje.mock.json` |
| Schema + validation (bad data fails the build with a path-prefixed message) | `src/lib/paisaje/schema.ts` |
| Loading, status/label dictionaries, response matching | `src/lib/paisaje/data.ts` |
| Chart geometry helpers | `src/lib/paisaje/charts.ts` |
| Intervention/org → theme mapping | `src/data/paisaje.response-map.yaml` |
| Fake map polygons (hand drawn) | `src/data/paisaje.layers.geojson` |
| Components | `src/components/paisaje/*` (`ThemeSection` is the reusable template) |
| Nav flag | `src/data/site.yaml` → `prototype_nav.paisaje` (read by `src/lib/site.ts`) |
| Screenshots + print PDF | `docs/prototype-screenshots/` |

Changes to existing code: only the nav entry (`Layout.astro`, with a "Prototipo" tag, hidden when the flag is `false`),
two keys + `paisaje` in `src/lib/i18n.ts`, and the ES|EN toggle is inert on this page (the prototype has no English version;
it shows a tooltip). No other page, the Notion integration, the workflow or secrets were touched.

### Page structure
Banner "Maqueta — datos y informes ficticios" (top bar, floating pill, and a tag on every chart) → hero question + 6 indicator
tiles (status chip with icon + text, headline number, sparkline, year) → collapsible territory note (two indicators with
different scopes) → context map (MapLibre; layers off by default except organizations) → 6 themes with sticky side nav →
methods + all sources.
Fully built themes: Agua (line), Suelo (stacked bars), Biodiversidad y protección (indicator vs reference bar),
Uso del suelo (before/after). Stubs (collapsed, "Próximamente"): Clima, Personas y economía.
Each theme = verdict + status → "Qué dicen los datos" (2 stat tiles + chart, each with scope/source/year and a data table) →
"Por qué importa" (findings with citation chips that jump to the evidence) → limitations box ("Lo que aún no sabemos") →
"Qué se está haciendo" → "Qué vamos a medir" (indicator table, includes *Pendiente* and *No disponible* rows on purpose) →
evidence list (type, publisher, year, licence, retrieved, confidence badge, verifier, link `#`).

### Two layouts, one DOM
`data-layout="story"` (default) or `?layout=dashboard` (toggle "Relato / Panel" in the hero; URL updated with
`history.replaceState`). The dashboard is the same markup restyled by CSS: side nav becomes tabs, only the active theme shows,
data and findings sit side by side. No duplicated components or data. Hash `#tema-suelo` selects the tab.

## How to run
```bash
npm install
USE_FIXTURE=1 npm run dev        # http://localhost:4321/altiplano-map/paisaje/  (also ?layout=dashboard)
USE_FIXTURE=1 npm run build      # or without the env var: the page falls back to the fixture itself
```
Without `NOTION_API_KEY` the page still builds: `loadResponses()` calls the existing `loadSiteData()` and, if it returns no data,
re-calls it with `USE_FIXTURE=1` (Notion fetching code untouched). **With the key (the real deploy) the real organizations and
interventions are used**, matched by the config below.

## How the intervention → theme mapping works
`paisaje.response-map.yaml`, per theme: `workAreas` (the intervention's *Área de trabajo*), optional `keywords` (name/description
must also contain one, so two themes can share a work area), `orgNames` (always shown), and `placeholders`.
Organizations shown = those linked to the matched interventions + `orgNames`. Placeholders (Fondo Correcciones Hídricas,
Campaña Agua, Fondo Semilla, Proyecto de carbono (suelo), Corredor Verde para la Biodiversidad, Alma del Paisaje) come from the
brief, are **not in the fixture**, are shown only when no real item has that name, and carry an "Ejemplo" label. Real intervention
names/areas in Notion may differ from the fixture, so the keyword rules will need a look against live data.
Interventions reuse the existing `InterventionCard` (Spanish, no filter attributes).

## Replacing the fake data with real data
1. Keep the shape of `paisaje.mock.json` (see `schema.ts`): `themes`, `indicators`, `sources`, `charts`.
2. Set `"fake": false`, remove the `disclaimer`/banner components (`MockBanner`, `.pfloat`, `.pmock`) and the "ficticio" copy in
   `PaisajePage.astro`, `TerritoryNote`, `ContextMap`, `ThemeSection` (stub note) and `ResponseCards` (placeholders).
3. Charts reference an indicator (`line`) or carry their own rows (`stacked`, `refbar`, `beforeafter`).
4. `availability: "disponible"` requires a `latest` value (enforced); `pendiente`/`no_disponible` render as hatched rows.
5. Replace `paisaje.layers.geojson` with verified boundaries (with licence) — the current polygons are not real.
6. Later option: move the content to Notion like the other sections; the validator can stay as the build-time guard.

## Design decisions
- **Chains, not causation.** Wording is "buscan contribuir" / "vamos a medir"; the response section carries an explicit
  no-causality line; condition data and actions are separate blocks.
- **Honesty UI.** Per-theme limitations box, confidence badge (3/2/1 bars + text, dashed border for low), scope label on every
  indicator, availability gaps shown instead of hidden.
- **Never colour-only.** Status chips differ by icon shape + text (▲ triangle, ◆ diamond, half-circle, ↑ arrow, dashed circle).
  Chart palette is blue/orange (the simulator's CVD-checked pair) plus an ordered orange ramp with numbers inside the segments;
  reference/target bars differ by pattern (hatch / dashed outline).
- **Zero chart JS.** Charts are build-time SVG; hover/focus tooltips are CSS on the line chart points; every chart has a data
  table in a `<details>`. Client JS = MapLibre + layout toggle/tabs/nav highlight only. No new dependencies.
- **Print:** `@media print` hides nav, map and toggles, forces all themes visible, avoids splitting a theme/figure/evidence item
  (`docs/prototype-screenshots/08-print-preview.pdf`). The map is omitted in print.
- The page has no dark mode because the site has none.

## What felt awkward / open questions
- The story page is long (~18,700 px at 1440 wide). With real data a theme will be longer. A "summary first, detail on demand"
  pattern (collapsing indicator table + evidence) may be needed; the dashboard layout is the pressure valve.
- The existing intervention card is tall and designed for the Interventions page; in a 3-card row it dominates the theme.
  A compact variant would read better.
- Charts need a ≥560 px canvas to keep text legible; on phones they scroll horizontally inside the figure. A mobile-specific
  simplification (e.g. stacked → small table) may be better than scrolling.
- Scope labels are the hardest part to make legible (see territory note); real sources will have messier, non-comparable scopes.
- Mobile site nav wraps to 4 lines with the extra entry (pre-existing nav, not changed here).
- Real-data risks: missing series, mixed units, multiple "latest" years across sources; the schema allows `null` baseline/latest.
- Keyword matching of interventions to themes is crude; real data may want an explicit `themes` multi-select in Notion.
- Duplicate element ids: a source cited by two themes would render two `#ev-<id>` anchors (fine today, fake sources are per theme).
- Type check: `npx tsc --noEmit` reports only the repo's existing "no @types/node" class of errors for the new `.ts` files (same as
  existing files); there is no `astro check` dependency. The production build validates the data schema.

## Layout options tried or considered
1. **Story with sticky side nav (built, default).** Best for reading and printing; long.
2. **Dashboard with tabs (built, `?layout=dashboard`).** Faster comparison within a theme; hides other themes, chart space is tight.
3. Considered: one long page with a top "scrollspy" bar only (rejected: loses the hierarchy on desktop); accordion per theme
   (hides the story); small multiples of all themes' key chart on one screen (good hero idea, not built); side-by-side
   "condition | response" columns per theme (cramped with the existing card).
