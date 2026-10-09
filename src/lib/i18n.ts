// Build-time i18n: the site is generated twice, Spanish at the root and English
// under /en/. Every UI string lives here; Notion data (names, descriptions) is
// shown as written, except the select values listed in
// src/data/value-translations.json (áreas de trabajo, tipos, tipos de capital).
import valueTranslations from '../data/value-translations.json';

export type Lang = 'es' | 'en';

const D = {
  // --- shell
  'nav.orgs': { es: 'Organizaciones', en: 'Organizations' },
  'nav.itvs': { es: 'Intervenciones', en: 'Interventions' },
  'nav.sim': { es: 'Simulador económico', en: 'Economic simulator' },
  'nav.label': { es: 'Secciones', en: 'Sections' },
  'lang.label': { es: 'Idioma', en: 'Language' },
  'footer.blurb': {
    es: 'Mapa abierto de las organizaciones e intervenciones del paisaje del Altiplano Estepario, y simulador del coste de su transición regenerativa.',
    en: 'Open map of the organizations and interventions of the Altiplano Estepario landscape, and a simulator of the cost of its regenerative transition.',
  },
  'footer.sections': { es: 'Secciones', en: 'Sections' },
  'footer.project': { es: 'Proyecto', en: 'Project' },
  'footer.osm': { es: '© OpenStreetMap contributors · límites OSM (ODbL)', en: '© OpenStreetMap contributors · OSM boundaries (ODbL)' },

  // --- banners
  'banner.error': { es: '⚠ Datos no disponibles.', en: '⚠ Data unavailable.' },
  'banner.fixture': { es: 'Modo fixture.', en: 'Fixture mode.' },
  'banner.fixtureText': {
    es: 'Estás viendo el dataset de desarrollo, no los datos reales.',
    en: 'You are looking at the development dataset, not the real data.',
  },

  // --- organizations page
  'orgs.title': { es: 'Altiplano Estepario — Organizaciones', en: 'Altiplano Estepario — Organizations' },
  'orgs.description': {
    es: 'Mapa abierto de las organizaciones del paisaje del Altiplano Estepario.',
    en: 'Open map of the organizations of the Altiplano Estepario landscape.',
  },
  'orgs.h1a': { es: 'El Altiplano', en: 'The Altiplano' },
  'orgs.h1b': { es: 'Estepario', en: 'Estepario' },
  'orgs.lede': {
    es: 'Las organizaciones que trabajan por la regeneración de este paisaje, y el portfolio de intervenciones que están construyendo.',
    en: 'The organizations working to regenerate this landscape, and the portfolio of interventions they are building.',
  },
  'orgs.overline': { es: 'Quién está aquí', en: 'Who is here' },
  'orgs.heading': { es: 'Organizaciones', en: 'Organizations' },
  'orgs.intro': {
    es: '{n} entidades del altiplano, de las cuales {g} forman parte del grupo de trabajo.',
    en: '{n} entities in the altiplano, {g} of which are part of the working group.',
  },
  'filter.all': { es: 'Todos', en: 'All' },
  'filter.group': { es: 'Grupo de trabajo · {n}', en: 'Working group · {n}' },
  'filter.rest': { es: 'Resto · {n}', en: 'Others · {n}' },
  'filter.type': { es: 'Tipo', en: 'Type' },
  'filter.allTypes': { es: 'Todos los tipos', en: 'All types' },
  'filter.byType': { es: 'Filtrar por tipo', en: 'Filter by type' },
  'filter.shown': { es: '{n} mostradas', en: '{n} shown' },
  'orgs.none': { es: 'No hay organizaciones que cumplan los criterios todavía.', en: 'There are no organizations matching the criteria yet.' },
  'orgs.noMatch': { es: 'Ninguna organización coincide con el filtro.', en: 'No organization matches the filter.' },

  // --- org card / panel
  'org.group': { es: 'Grupo de trabajo', en: 'Working group' },
  'org.website': { es: '↗ Sitio web', en: '↗ Website' },
  'panel.label': { es: 'Detalle de la organización', en: 'Organization details' },
  'panel.close': { es: 'Cerrar', en: 'Close' },
  'panel.itvs': { es: 'Intervenciones asociadas · {n}', en: 'Associated interventions · {n}' },
  'panel.none': {
    es: 'Esta organización no tiene intervenciones asociadas todavía.',
    en: 'This organization has no associated interventions yet.',
  },

  // --- map
  'map.groupLegend': { es: 'Grupo de trabajo · {n}', en: 'Working group · {n}' },
  'map.region': { es: 'Altiplano Estepario', en: 'Altiplano Estepario' },
  'map.missing': {
    es: '⚠ {n} organizaciones sin coordenadas (no se muestran en el mapa)',
    en: '⚠ {n} organizations without coordinates (not shown on the map)',
  },
  'map.cluster': { es: '{n} organizaciones en este lugar', en: '{n} organizations at this location' },

  // --- interventions page
  'itvs.title': { es: 'Altiplano Estepario — Intervenciones', en: 'Altiplano Estepario — Interventions' },
  'itvs.description': {
    es: 'Portfolio de intervenciones del paisaje del Altiplano Estepario.',
    en: 'Portfolio of interventions in the Altiplano Estepario landscape.',
  },
  'itvs.overline': { es: 'El portfolio', en: 'The portfolio' },
  'itvs.heading': { es: 'Intervenciones', en: 'Interventions' },
  'itvs.intro': {
    es: 'Proyectos e intervenciones del paisaje, con su valor ajustado a 5 años, su financiación y su viabilidad comercial.',
    en: 'Landscape projects and interventions, with their 5-year adjusted value, financing and commercial viability.',
  },
  'itvs.area': { es: 'Área de trabajo', en: 'Work area' },
  'itvs.areaBy': { es: 'Filtrar por área de trabajo', en: 'Filter by work area' },
  'itvs.viability': { es: 'Viabilidad comercial', en: 'Commercial viability' },
  'itvs.viabilityBy': { es: 'Filtrar por viabilidad comercial', en: 'Filter by commercial viability' },
  'itvs.org': { es: 'Organización', en: 'Organization' },
  'itvs.orgBy': { es: 'Filtrar por organización', en: 'Filter by organization' },
  'itvs.allF': { es: 'Todas', en: 'All' },
  'itvs.viable': { es: 'Viable', en: 'Viable' },
  'itvs.notViable': { es: 'No viable', en: 'Not viable' },
  'itvs.financing': { es: 'Financiación total', en: 'Total financing' },
  'itvs.finMin': { es: 'Financiación mínima', en: 'Minimum financing' },
  'itvs.finMax': { es: 'Financiación máxima', en: 'Maximum financing' },
  'itvs.view': { es: 'Vista', en: 'View' },
  'itvs.cards': { es: 'Tarjetas', en: 'Cards' },
  'itvs.table': { es: 'Tabla', en: 'Table' },
  'itvs.none': { es: 'No hay intervenciones publicadas todavía.', en: 'No interventions published yet.' },
  'itvs.noMatch': { es: 'Ninguna intervención coincide con el filtro.', en: 'No intervention matches the filter.' },
  'th.itv': { es: 'Intervención', en: 'Intervention' },
  'th.orgs': { es: 'Organización(es)', en: 'Organization(s)' },
  'th.area': { es: 'Área de trabajo', en: 'Work area' },
  'th.value5': { es: 'Valor 5 años', en: '5-year value' },
  'th.financing': { es: 'Financiación total', en: 'Total financing' },
  'th.years': { es: 'Años', en: 'Years' },
  'th.recurrent': { es: 'Recurrente', en: 'Recurring' },
  'th.capital1': { es: 'Capital 1', en: 'Capital 1' },
  'th.capital2': { es: 'Capital 2', en: 'Capital 2' },
  'th.viable': { es: 'Viable', en: 'Viable' },

  // --- intervention card
  'card.area': { es: 'Área de trabajo', en: 'Work area' },
  'card.orgs': { es: 'Organización(es)', en: 'Organization(s)' },
  'card.value5': { es: 'Valor ajustado a 5 años', en: '5-year adjusted value' },
  'card.financing': { es: 'Financiación total', en: 'Total financing' },
  'card.years': { es: 'Número de años', en: 'Number of years' },
  'card.recurrence': { es: 'Recurrente anualmente', en: 'Recurring annually' },
  'card.capital': { es: 'Tipo de capital', en: 'Capital type' },
  'card.viability': { es: 'Viable comercialmente', en: 'Commercially viable' },
  'card.viableYes': { es: 'Sí, viable', en: 'Yes, viable' },
  'card.viableNo': { es: 'No viable', en: 'Not viable' },
  'card.recYes': { es: 'Recurrente', en: 'Recurring' },
  'card.recNo': { es: 'No recurrente', en: 'Not recurring' },
  'yes': { es: 'Sí', en: 'Yes' },
  'no': { es: 'No', en: 'No' },
} as const;

export type Key = keyof typeof D;

export function t(lang: Lang, key: Key, vars: Record<string, string | number> = {}): string {
  let s: string = D[key][lang];
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

// Switch for showing Notion select values in English via value-translations.json.
// Off for now: Notion data is displayed as written.
export const TRANSLATE_NOTION_DATA = false;

// Translate a Notion select value for display (filter values stay Spanish).
export function tv(lang: Lang, value: string): string {
  if (lang === 'es' || !TRANSLATE_NOTION_DATA) return value;
  return (valueTranslations as Record<string, string>)[value] ?? value;
}

export const numberLocale = (lang: Lang) => (lang === 'en' ? 'en-GB' : 'es-ES');

// Path of the same page in the other language.
export type Page = 'organizaciones' | 'intervenciones' | 'simulador';
export function pagePath(base: string, lang: Lang, page: Page): string {
  const b = base.replace(/\/?$/, '/');
  return b + (lang === 'en' ? 'en/' : '') + (page === 'organizaciones' ? '' : page + '/');
}
