# Altiplano Estepario: notes for agents and developers

Static Astro site (organisations map, interventions, economic simulator) for the Altiplano Estepario,
deployed to GitHub Pages at `/altiplano-map/`. Spanish is the default language, English lives under `/en/`.
The user-facing README is in Spanish; this file is the short version for whoever picks the work up.

## The simulator's methodology (read this first for anything about the model)

How the model is built, every parameter with its source and confidence, and its limitations:
[Modelo de Coste de Transición — Metodología y fuentes](https://app.notion.com/p/Modelo-de-Coste-de-Transici-n-Metodolog-a-y-fuentes-3f31441510e181449d57e037846615a0).
The same text in the vault: `Altiplano Estepario/8 Análisis Económico/Metodología del modelo.md`.

- This is for developers and agents only. Do not link it from anything rendered or shipped to visitors:
  the published simulator leaves Notion links out on purpose (see the header of `src/lib/simulador/data.ts`).
- `src/lib/simulador/model.js` is a copy of the vault's calculation engine. Change the logic in both places.
- The "Cómo usarlo" tab copy is `src/lib/simulador/guide.ts`. It is written from the methodology: if the
  model changes, review the guide too. It quotes fixed rules (thresholds, defaults), never results.

## Data

- The financial strategy page (`/estrategia/`) is hand-authored: sources, mechanisms, work-area sub-areas,
  links and card texts live in `src/data/estrategia-v2.yaml` (header comment: where each link comes from), built
  from the World Café cards in Notion. Change it there when the strategy changes. The diagram is
  `src/components/estrategia/FinanceFlowV2.astro` and `src/scripts/finance-flow-v2.ts`. The first version
  (`src/data/estrategia.yaml`, `FinanceFlow.astro`) is kept, unlinked, at `/estrategia-v1/`.
  Area names on the site can differ from Notion's: `title` in `src/data/areas.yaml`, shown through `areaLabel()`.
  The portfolio has five areas, and each one is a value of the interventions' "Area de trabajo" in Notion. Casos de
  negocio is its own area (with Estudios de mercado, Circulante y capital de trabajo and Infraestructura de
  transformación), separate from Agricultura regenerativa: move an intervention between them in Notion, not in code.
- The governance page (`/gobernanza/`) summarises the collaboration agreement and governance guide (Notion,
  Documentos Operativos) in `src/data/gobernanza.yaml`. Public summary only: no people's names, no confidential
  detail, no Notion links. The home (`/`) keeps the organisations map; its texts are `src/data/home.yaml`.
- The regenerative vision page (`/vision/`) is hand-authored too: `src/data/vision.yaml` (texts and each
  card's position on the illustration), adapted from Andrea's "Versión árbol" mockup. The tree is
  `public/vision-arbol.svg`, exported from the mockup without its sky, grass and soil; edit it in the design tool, not by hand.
- Organisations, interventions and the simulator's databases come from Notion at build time
  (`NOTION_API_KEY`, a GitHub secret). `USE_FIXTURE=1 npm run build` (or `npm run dev`) uses the local
  fixtures and the saved simulator snapshot `src/data/simulador.json` instead, so you can work without a key.
- Real data differs from the fixtures: for example the real Notion work areas are not the fixture's four.
  Work-area badge colours are assigned in `src/lib/areas.ts`.
- English pages show Notion text through a dictionary, not a live translation: `tv()` in `src/lib/i18n.ts`
  looks each text up in `src/data/value-translations.json` (key: the Spanish text exactly as in Notion;
  value: the English). A text that is not in the file shows in Spanish on the English pages, so after
  adding or editing interventions, organisations or their page text in Notion, add the new texts there.
  Proper names (organisations, brands, clients) are left out on purpose and show unchanged.
  In English, "territorio" and "territorial" are "landscape" ("Landscape fabric", "Landscape investment portfolio"),
  everywhere on the site. Kept as they are: proper names ("Manifesto for a Regenerative Territory") and "territorial funds"
  in the administrative sense (LEADER and similar). The Paisaje
  and Paisaje (prototype) pages keep a Spanish body by design.
- Pushing to `main` deploys, and the site also rebuilds every 6 hours from Notion.

## Design system

Components, tokens and styles come from `@motiu/design` (github.com/motiuorg/motiu-design), installed from
GitHub by tag over https (`#vX.Y.Z` in `package.json`). The design repo's README documents the data contract
(`src/data/site.yaml`, `nav.yaml`, `footer.yaml`). Colour meaning in charts and figures: red is a loss,
green a gain, blue supporting information; orange is not a data colour.

- To bump the tag: edit it in `package.json` by hand, delete the `node_modules/@motiu/design` and
  `node_modules/@fontsource/*` entries from `package-lock.json`, then `npm install` (a plain
  `npm install <dep>` rewrites `package.json`). Check it with
  `GIT_SSH_COMMAND=/usr/bin/false npm ci` in a scratch folder.
- To try unpublished design changes locally, copy the design repo's `src`, `scripts`, `package.json` into
  `node_modules/@motiu/design` and build; do not commit that.
