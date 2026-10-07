# Altiplano Estepario

Mapa abierto de organizaciones e intervenciones del Altiplano Estepario, y simulador
económico de su transición regenerativa — un sitio estático (Astro + MapLibre)
alimentado por bases de datos de Notion, con la estética editorial-orgánica de motiu.org.

## Qué muestra

Tres páginas:

- **Organizaciones** (portada) — mitad izquierda texto, mitad derecha el mapa
  (MapLibre sobre OpenStreetMap). Naranja = **grupo de trabajo** (solo "Miembro");
  lima = el resto. Las organizaciones en el mismo lugar se agrupan en un punto con
  número que se abre en abanico al hacer clic. Debajo, la galería (grupo de trabajo
  primero), filtrable por grupo y por **tipo**.
- **Intervenciones** — tarjetas o tabla (selector), con valor ajustado a 5 años,
  financiación total, número de años, recurrencia y tipo de capital 1/2. Filtros
  desplegables por área de trabajo, viabilidad comercial y organización, y un
  deslizador de rango para la financiación.

- **Simulador económico** (`/simulador/`) — coste de la transición eco-regenerativa
  por finca tipo (almendro, olivar, cereal, pistacho): flujo a 10 años, necesidad de
  financiación, capacidad de repago de un préstamo (DSCR), escala del paisaje y
  sensibilidad. El cálculo corre en el navegador (`src/lib/simulador/model.js`).

Los campos nuevos de intervenciones se buscan por nombre aproximado en
`src/lib/records.ts` (`normalizeIntervention`); fíjalos allí si difieren en Notion.

## Criterios de inclusión (organizaciones)

1. Solo **organizaciones** — las personas/individuos quedan fuera.
2. Solo entidades **dentro del Altiplano Estepario**.

Ambos criterios se aplican en `src/lib/records.ts` (`keepOrg`), con coincidencia de
nombres de propiedad flexible — los nombres candidatos están en `src/data/databases.yaml`
por si hay que fijarlos al esquema real.

## Desarrollo local

```bash
npm install
cp .env.example .env   # pon tu NOTION_API_KEY
npm run dev
# → http://localhost:4321/altiplano-estepario/
```

Sin acceso a Notion todavía: `USE_FIXTURE=1 npm run dev` renderiza el dataset de
ejemplo de `src/lib/fixture.ts`.

## Deploy (GitHub Pages)

Repo: **`motiuorg/altiplano-map`** → https://motiuorg.github.io/altiplano-map/

1. El código de `main` se despliega solo: el workflow `.github/workflows/deploy.yml`
   ejecuta el build con el secret `NOTION_API_KEY` en cada push y cada 6 horas.
2. Asegúrate de que Settings → Pages → Source esté en **GitHub Actions**.
3. Las dos bases de datos de Notion deben estar compartidas con la integración
   cuyo token es el secret `NOTION_API_KEY`.

## Estructura

| Archivo | Función |
|---|---|
| `src/data/databases.yaml` | IDs de las dos bases Notion + nombres de propiedad candidatos |
| `src/data/site.yaml` | Copy del sitio y configuración del mapa |
| `src/lib/notion.ts` | Fetch a build-time + normalización genérica |
| `src/lib/records.ts` | Normalización de organizaciones e intervenciones + filtros |
| `src/lib/fixture.ts` | Dataset de desarrollo (USE_FIXTURE=1) |
| `src/components/OrgMap.astro` | Mapa MapLibre con pins de dos colores |
| `src/pages/index.astro` | Organizaciones: hero, mapa, galerías, metodología |
| `src/pages/intervenciones.astro` | Intervenciones: tarjetas / tabla con filtros |
| `src/pages/simulador.astro` | Simulador económico |
| `src/lib/simulador/` | Motor de cálculo + carga de datos del simulador |
| `src/scripts/simulador.js` | Gráficos e interacción del simulador |

## Simulador económico: datos

- Lee cuatro bases de Notion (Supuestos, Prácticas, Trayectorias, Arquetipos), definidas
  en `src/data/databases.yaml` → `simulador`. Tienen que estar **compartidas con la
  integración** del `NOTION_API_KEY` (en Notion: ··· → Conexiones).
- Solo se publica lo que el modelo necesita: las notas internas, el estado de
  validación, los enlaces a Notion y la base de necesidades de datos no salen nunca
  (`src/lib/simulador/data.ts`).
- Si Notion no responde o las bases no están compartidas, se usa la copia
  `src/data/simulador.json` (no rompe el build).
- **Precio actual de la almendra:** en cada build se lee el último resumen semanal de
  precios de la CARM (Lonja de Murcia, comuna y ecológica) en
  `src/lib/simulador/precio-actual.ts`. Si falla, se usa el último valor guardado en
  `src/data/precio-almendra.json`, que también guarda las medias por campaña.
- Las fuentes que nombran a una comercializadora concreta se publican como
  «Comercializadoras del territorio».
- El motor es una copia de `Altiplano Estepario/8 Análisis Económico/simulador/model.js`
  del vault, donde están los tests y la metodología. Si cambia la lógica, actualizar
  ambos.

## Licencias

- Código: MIT
- Contenidos: CC BY-SA 4.0