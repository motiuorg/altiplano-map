# Altiplano Estepario

Mapa abierto de organizaciones e intervenciones del Altiplano Estepario — un sitio
estático (Astro + MapLibre) alimentado por dos bases de datos de Notion, con la
estética editorial-orgánica de motiu.org.

## Qué muestra

Dos páginas:

- **Organizaciones** (portada) — mitad izquierda texto, mitad derecha el mapa
  (MapLibre sobre OpenStreetMap). Naranja = **grupo de trabajo** (solo "Miembro");
  lima = el resto. Las organizaciones en el mismo lugar se agrupan en un punto con
  número que se abre en abanico al hacer clic. Debajo, la galería (grupo de trabajo
  primero), filtrable por grupo y por **tipo**.
- **Intervenciones** — tarjetas o tabla (selector), con valor ajustado a 5 años,
  financiación total, número de años, recurrencia y tipo de capital 1/2. Filtros
  desplegables por área de trabajo, viabilidad comercial y organización, y un
  deslizador de rango para la financiación.

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
| `src/pages/index.astro` | La página única: hero, mapa, galerías, metodología |

## Licencias

- Código: MIT
- Contenidos: CC BY-SA 4.0