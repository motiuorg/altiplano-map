# `/ppaisaje/` — v2: one flow, issues → opportunities (visual experiment)

**All data are fake or rough.** Route `/altiplano-map/ppaisaje/` (+ `/en/ppaisaje/`: English menu, Spanish body, so the language
switch never 404s). Unlisted (not in `nav.yaml`/footer) and `noindex`. **Unlisted is not private.** `/paisaje/`, the Simulador,
the nav, Notion code and the workflow are untouched. No interventions anywhere.

## What changed from v1 and why
v1 was a long report of small equal-weight boxes (overview rows + matrix + five dense modules + cards). v2 is **one directional
story with almost no paragraphs**:

1. **Hero = one flow diagram** (`Sankey.astro`): *causas de fondo → presiones → problemas*. Pills in three columns, ribbons between
   them, problem pills coloured by severity, evidence (documentado/plausible/hipótesis) as an icon in each cause pill.
   Hover or keyboard-focus a pill and its whole upstream + downstream path lights up (`src/scripts/ppaisaje-flow.ts`, ~50 lines).
   "Ver el diagrama como tabla" holds the old matrix as the text alternative.
2. **Five scenes, one per screen**: pictogram + name, a gravity meter (3-step bars + chip, never colour-only), **one sentence**, one big
   chart, a one-line "?" limitation, and a flow strip *causas → presiones → problema*. A red arrow joins each scene to the next.
   Indicators, findings, limitations (full), gaps and sources are collapsed at the very end ("Datos, indicadores y fuentes").
3. **Transition**: a band where a ribbon turns red → amber → green and flows into hills that go from brown to green on scroll.
4. **Part 2**: a second flow diagram *problemas → oportunidades* (which opportunity helps which problem), then a **left→right
   timeline** (corto → medio → largo plazo) holding minimal cards: number, short name, big rough size, confidence; "Más" opens
   summary / barrier / starting point / issues addressed / "cifra ilustrativa".
4b. **Opportunity scenes (new)**: up to 5 full scenes in the light palette, mirroring the problem scenes (number, name, one sentence,
   big rough size, horizon pips + confidence, a flow strip *problemas → oportunidad*, barrier/starting point collapsed). Each has a
   *different* illustrative visual to compare ideas (`OppViz.astro`): water balance bars (retener agua), 10×10 waffle
   (agricultura regenerativa), isolated vs connected habitat patches (corredor), person isotype 1→3 of 16 (nuevos pobladores),
   price bar with hatched range (valor local). An opportunity gets a scene only if it has a `visual` block in the data
   (`kind` + numeric `params`, validated in `schema.ts`). The other two opportunities stay in the flow diagram and the timeline.
5. **Qué sabemos y qué falta**: three numbers and a coverage bar; gaps and methods are collapsed.

Page height ≈ 7,400 px (v1 ≈ 8,800 px; `/paisaje/` ≈ 19,000 px).

## Files
| | |
|---|---|
| Routes | `src/pages/ppaisaje.astro`, `src/pages/en/ppaisaje.astro` → `src/views/PpaisajePage.astro` |
| Data | `src/data/ppaisaje.mock.json` (issues from `/paisaje/`, plus `causes` (+`short`), `opportunities` (+`short`)) |
| Validation | `src/lib/ppaisaje/schema.ts` (path-prefixed errors, unknown refs, cause cycles, `fake` flag) |
| Derived data | `src/lib/ppaisaje/data.ts`, `geom.ts` |
| Components | `src/components/ppaisaje/`: `Sankey`, `SeverityMeter`, `SeverityChip`, `IssueIcon`, `IssueViz`, `FlowStrip`, `Timeline`, `TransitionBand`, `EvidenceTag`, `CausesMatrix` |
| Script / styles | `src/scripts/ppaisaje-flow.ts`, `src/styles/ppaisaje.css` (all under `.pp`) |
| Screenshots, print PDF | `docs/ppaisaje-screenshots/` |

## How the diagrams are built
`Sankey.astro` takes `columns` (pills: id, label, colour, optional evidence mark or number) and `links` (from → to). At build time it
orders pills by the mean position of their neighbours (fewer crossings), spreads link anchors along each pill edge, and draws cubic
ribbons with per-link gradients. Both diagrams are generated from the data: add a cause or an edge (`feeds`) or an opportunity
(`addresses`) and the diagrams update; no code change. Below 900 px the diagrams are hidden (labels would be unreadable) and the per-scene
flow strips carry the story.

## Replacing the fake data
- Keep the shape of `ppaisaje.mock.json`; the build validates it. Causes need a `short` label (≤3 words) for the diagrams.
- `opportunities[].fake` must be `true` while illustrative. `impact` (1–5) is no longer drawn (v1 used it); remove it from the schema
  when real data arrive or reuse it for sorting.
- Remove `.pp-bar`, the "Maqueta" tags (`.ppviz__fake`), and the fake-data note when data stop being fake.

## Decisions, accessibility, print
- Severity: icon + text + 3-step bars. Evidence: dot fill pattern + hidden text. Diagram nodes are focusable with `aria-label`, and the
  table version is one click away. Contrast of every text/background pair was computed (all ≥ 5:1).
- `prefers-reduced-motion`: hills are static green; no animation. Without JS: same static result and no hover highlighting.
- Print: dark sections switch to a light scheme, details expand, nav/footer hide, diagrams stay (SVG).
- Charts keep ≥440 px minimum width on phones and scroll inside their frame.

## Tried / dropped
- Keeping the overview list *and* the diagram: redundant; the diagram replaced it (and the matrix moved into a table alternative).
- A bubble/impact plot for opportunities: units differ (ha, MW, people); the timeline + flow reads better and has direction.
- Scroll-linked continuous colour change: more code/motion for little gain.

## Open questions
- Should problem pills in the Part 2 diagram carry the severity icon too?
- Keep the red arrows between scenes, or let the hero diagram's ribbons "continue" visually into each scene?
- English body copy, and whether the diagrams need a vertical (mobile) variant instead of hiding them.

## Verified
Builds with and without `USE_FIXTURE`/`NOTION_API_KEY`; schema failures are clear (unknown reference, cycle); no horizontal scroll at 390 px;
keyboard focus on a diagram node lights its path; screenshots at 1440 and 390 px; print PDF. `npx tsc --noEmit` shows only the repo's
existing "no @types/node" errors for new `.ts` files.
