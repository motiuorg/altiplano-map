# `/ppaisaje/` — issues → opportunities (visual experiment)

**All data are fake or rough.** Route: `/altiplano-map/ppaisaje/` (and `/en/ppaisaje/`: English menu, Spanish body, so the
language switch never 404s). Unlisted (not in `nav.yaml` or the footer) and `noindex`. **Unlisted is not private**: anyone with
the link can open it; real access control would need hosting changes.
`/paisaje/`, the Simulador, the nav, Notion code and the workflow were not touched (only new files; `git status` shows no
modified tracked file).

## What was built and where
| Piece | File |
|---|---|
| Routes | `src/pages/ppaisaje.astro`, `src/pages/en/ppaisaje.astro` → `src/views/PpaisajePage.astro` |
| Data (fake, `fake` flags) | `src/data/ppaisaje.mock.json` (copy of the paisaje mock minus anything about interventions, plus `causes`, `opportunities`, per-issue `statement` + `heroChartId`) |
| Schema + validation | `src/lib/ppaisaje/schema.ts` (fails the build with `[ppaisaje data] path: message`, also checks unknown refs and cause cycles) |
| Derived data (cause graph, matrix, counts) | `src/lib/ppaisaje/data.ts`, `geom.ts` |
| Components | `src/components/ppaisaje/` (`SeverityChip`, `EvidenceTag`, `IssueViz`, `CauseChain`, `CausesMatrix`, `TransitionBand`, `OpportunityMap`) |
| Styles | `src/styles/ppaisaje.css` (everything scoped under `.pp`) |
| Screenshots + print PDF | `docs/ppaisaje-screenshots/` |

## Page structure (≈8,800 px tall at 1440 px, vs ≈19,000 px for `/paisaje/`)
1. **Overview panel** (first screen): the 5 issues as rows — severity chip (icon + text), one sentence, **one micro-visual**, top 3 causes.
2. **Causes matrix**: drivers × issues; a dot = "may contribute" with evidence (filled = documentado, half = plausible, dashed = hipótesis).
   Shows that a few root causes (e.g. low farm income, irrigation expansion) touch several issues.
3. **Five issue modules**: hero chart (compact) + a cause chain *causes de fondo → presiones directas → resultado observado*,
   one visible "Lo que aún no sabemos" line, indicators/findings collapsed in a `<details>`.
4. **Transition band**, then **Part 2 — Oportunidades**: a range plot (illustrative impact 1–5 by time horizon, confidence as line
   style) + 7 compact cards (rough size range, issues addressed, horizon, barrier, starting point, confidence, "ilustrativo").
5. **Qué sabemos y qué falta**: counts of indicators with data / pending / unavailable, gaps list, fake-data note, collapsed methods + sources.

## The transition
Static: a `linear-gradient` (umber → olive-brown → light green) behind a one-line bridge sentence, with three SVG hills.
Progressive enhancement (~15 lines of JS): the hills start brown (`.is-armed`) and a single `IntersectionObserver` adds `.is-green`
when the band is ≥35 % in view; the fill transitions to greens over 1.4 s. Without JS or with `prefers-reduced-motion`
the hills are simply green (static gradient, no animation). Palettes are CSS variables (`--pp-*` dark, `--pp-l-*` light).
Contrast was computed for every text/background pair (all ≥ 5:1; see list in the session / re-run quickly if colours change).

## Replacing the fake data
- Keep the shape of `ppaisaje.mock.json`; `npm run build` validates it.
- `causes[]`: `{id,label,level:"driver"|"pressure",evidence,confidence,sourceId?,feeds[]}`; `feeds` may point to other causes or to issue ids.
  The matrix and chains are derived transitively, so adding a cause or an edge needs no code change.
- `opportunities[]`: `fake` must be `true` while illustrative (the validator refuses otherwise — change that rule when real).
  `impact` (1–5) exists only for the range plot; replace it with a real, comparable metric before publishing anything.
- Issues (`themes`, `indicators`, `charts`, `sources`) are unchanged from `/paisaje/`; swap values and `sourceId`s as real sources arrive.
- Remove `MockBanner`-style labels (`.pp-bar`, `.ppviz__fake`) when the data stop being fake.

## Design decisions
- One hero visual per issue; four chart types kept (line, stacked, reference bar, before/after) but redrawn compact with direct labels.
- Severity never colour-only (icon shape + text); evidence status never colour-only (dot fill pattern + text).
- Causes use hedged wording ("causas de fondo", "pueden contribuir"); opportunities are "órdenes de magnitud", not forecasts.
- Print: dark sections switch to a light scheme (backgrounds are not printed), details are expanded, nav/footer hidden.

## Tried / dropped
- A scroll-linked continuous colour shift (CSS variable driven by scroll position): more code and more motion for little gain.
- A causal *network* diagram: too busy for 12 causes; the matrix reads faster. (A cross-issue graph could be a `?v=b` later.)
- Bubble plot for opportunities (size = magnitude): units differ (ha, MW, people), so size would mislead; a 1–5 impact range avoids that.

## Open questions
- Is a 1–5 "impact" score the right comparable for opportunities, or should each be shown only in its own units?
- Should issue severity be repeated on the cards of Part 2 (so the link back is visual, not just a text chip)?
- Keep the matrix to drivers only, or add pressures as rows?
- English version of the body (the chrome is English, the body Spanish).

## Notes
- Verified: production build with fixture, and without `USE_FIXTURE`/`NOTION_API_KEY` (this page does not call Notion); schema negative tests
  (unknown reference, cause cycle) fail with a clear message; 390 px has no horizontal scroll (absolutely-positioned visually-hidden
  text inside scrollers needed a positioned ancestor); keyboard focus visible; clicking a citation opens the collapsed sources list.
- Map tiles are not used on this page (no map), so tile loading is not a concern.
- `npx tsc --noEmit` reports only the repo's existing "no @types/node" class of errors for new `.ts` files.
