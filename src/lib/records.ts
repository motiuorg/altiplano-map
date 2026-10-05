// Domain normalization for the Altiplano Estepario site.
//
// Two record types, two Notion databases:
//   - Organizations: shown on the map + gallery. Only KEPT when the record is an
//     organization (not an individual/persona) AND is inside the Altiplano.
//   - Interventions: gallery of portfolio interventions, with the 5 requested
//     fields (name, description, organization, área de trabajo, valor ajustado a
//     5 años, viability).
//
// Property names are matched defensively (multiple candidates per concept) so the
// site survives schema drift; candidates are listed in src/data/databases.yaml and
// can be pinned to exact names once the real schema is confirmed.

import type { NormalizedRecord } from './notion';

// ---------------------------------------------------------------------------
// Config: candidate property names (auto-detect) — pin them in databases.yaml
// ---------------------------------------------------------------------------

export interface OrgPropertyNames {
  name: string[];
  description: string[];
  website: string[];
  place: string[];
  latitude: string[];
  longitude: string[];
  type: string[];
  zone: string[];
  grupoTrabajo: string[];
  inAltiplano: string[];
}

export interface InterventionPropertyNames {
  name: string[];
  description: string[];
  organization: string[];
  areaTrabajo: string[];
  valor5Anos: string[];
  viable: string[];
}

export const ORG_PROPERTY_NAMES: OrgPropertyNames = {
  name: ['Name', 'Nombre', 'name', 'Organización', 'Organizacion', 'Organisation', 'Entidad'],
  description: ['Description', 'Descripción', 'Descripcion', 'description', 'What is it', 'Qué es', 'Que es', 'Notas', 'Notes', 'About', 'Sobre'],
  website: ['Website', 'Web', 'web', 'URL', 'Url', 'url', 'Página web', 'Pagina web', 'Sitio web', 'Enlace'],
  place: ['Place', 'Ubicación', 'Ubicacion', 'Localización', 'Localizacion', 'Location', 'Municipio', 'Pueblo', 'Ciudad'],
  latitude: ['location_lat', 'location_Lat', 'Lat', 'lat', 'Latitud', 'Latitude', 'latitude'],
  longitude: ['location_lng', 'location_Lng', 'Lng', 'lng', 'Lon', 'Longitud', 'Longitude', 'longitude'],
  type: ['Tipo', 'Type', 'type', 'Tipo de actor', 'Tipo de entidad', 'Agency', 'Naturaleza', 'Tipo de Estructura'],
  zona: ['Escala', 'Zona', 'Área', 'Area', 'Ámbito', 'Ambito', 'Alcance', 'Zona geográfica', 'Territorio', 'Espacio', 'Scope'],
  grupoTrabajo: ['Grupo de trabajo', 'Grupo trabajo', 'GrupoTrabajo', 'grupo_trabajo', 'Grupo de Trabajo', '¿Grupo de trabajo?'],
  inAltiplano: ['En el altiplano', 'En el Altiplano', 'Altiplano', 'altiplano', 'Dentro del altiplano', '¿Está en el altiplano?'],
};

export const INTERVENTION_PROPERTY_NAMES: InterventionPropertyNames = {
  name: ['Name', 'Nombre', 'name', 'Intervención', 'Intervencion', 'Iniciativa', 'Proyecto', 'Nombre de intervención'],
  description: ['Description', 'Descripción', 'Descripcion', 'description', 'Qué es', 'Que es', 'What is it', 'Notas', 'Notes'],
  organization: ['Organización', 'Organizacion', 'Organization', 'Organisation', 'Entidad', 'Entity', 'Actor', '👥 Actores', 'Actores'],
  areaTrabajo: ['Área de trabajo', 'Area de trabajo', 'Área', 'Area', 'Área temática', 'Area tematica', 'Tema', 'Theme'],
  valor5Anos: ['Valor ajustado a 5 años', 'Valor ajustado a 5 anos', 'Valor 5 años', 'Valor 5 anos', 'Valor', 'Valor económico', 'Valor a 5 años'],
  viable: ['¿Es viable comercialmente?', 'Es viable comercialmente', 'Viable comercialmente', 'Viabilidad comercial', 'Viable', '¿Viable comercialmente?'],
};

// ---------------------------------------------------------------------------
// Value helpers
// ---------------------------------------------------------------------------

export function pickProp(props: Record<string, any>, candidates: string[]): any {
  for (const key of candidates) {
    const v = props[key];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

export function pickString(props: Record<string, any>, candidates: string[]): string {
  const v = pickProp(props, candidates);
  if (v === undefined || v === null) return '';
  if (typeof v === 'object') {
    if ('address' in v && v.address) return String(v.address);
    if ('name' in v && v.name) return String(v.name);
    if ('latitude' in v && 'longitude' in v) return `${v.latitude}, ${v.longitude}`;
    return '';
  }
  return String(v);
}

export function flatValues(v: any): string[] {
  if (v === undefined || v === null) return [];
  return (Array.isArray(v) ? v : [v]).map((x) => String(x).trim()).filter(Boolean);
}

export function anyValues(props: Record<string, any>, candidates: string[]): string[] {
  for (const key of candidates) {
    const v = props[key];
    if (v !== undefined && v !== null) {
      const vals = flatValues(v);
      if (vals.length > 0) return vals;
    }
  }
  return [];
}

// Accent/case-insensitive property lookup by regex — used for the intervention
// fields whose exact Notion names are not pinned yet. `exclude` skips look-alikes
// (e.g. "Valor ajustado a 5 años" when looking for the number of years).
function normKey(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function isEmptyValue(v: any): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

export function pickFuzzy(props: Record<string, any>, patterns: RegExp[], exclude?: RegExp): any {
  for (const re of patterns) {
    for (const key of Object.keys(props)) {
      const n = normKey(key);
      if (!re.test(n) || (exclude && exclude.test(n))) continue;
      if (!isEmptyValue(props[key])) return props[key];
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export interface OrgFilters {
  // Property + exact value that marks a record as part of this landscape
  // (Actores: Escala equals "Altiplano Estepario").
  escalaProperty?: string;
  escalaValue?: string;
  // When the section is already scoped to organizations at the data-source level
  // (Actores' "Organizaciones" data source; people live in a separate
  // "Personas" data source) skip the type heuristic entirely.
  assumeOrganization?: boolean;
}

export interface OrgRecord {
  id: string;
  url?: string;
  name: string;
  description: string;
  website: string | null;
  placeName: string;
  lat: number | null;
  lng: number | null;
  isOrganization: boolean;
  inAltiplano: boolean;
  grupoTrabajo: boolean;
  tipo: string;
  tipos: string[]; // "Tipo" multi-select values, shown on cards + used as a filter
  zona: string[];
}

export const ORG_TYPE_VALUES = ['org', 'organización', 'organizacion', 'organisation', 'entidad', 'colectivo', 'cooperativa', 'asociación', 'asociacion', 'fundación', 'fundacion', 'empresa', 'iniciativa', 'movimiento', 'red', 'consorcio', 'grupo', 'comunidad', 'ayuntamiento', 'administración', 'administracion', 'public body', 'parque natural', 'grupo de desarrollo'];

export const INDIVIDUAL_TYPE_VALUES = ['ind', 'individual', 'persona', 'persona física', 'persona fisica', 'person', 'freelance', 'autónomo', 'autonomo', 'self-employed'];

export const ALTIPLANO_ZONE_VALUES = ['altiplano', 'estepario', 'altiplano estepario'];

// Word-boundary match so "ind" never matches inside "industria" etc.
function matchesToken(value: string, tokens: string[]): boolean {
  return tokens.some((t) => new RegExp(`(^|[\\s/_,;(-])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s/_,;)-])`).test(value));
}

export function normalizeOrg(record: NormalizedRecord, filters: OrgFilters = {}): OrgRecord {
  const props = record.properties;
  const name = pickString(props, ORG_PROPERTY_NAMES.name) || 'Sin nombre';
  const description = pickString(props, ORG_PROPERTY_NAMES.description);
  const website = pickString(props, ORG_PROPERTY_NAMES.website) || null;
  const placeName = pickString(props, ORG_PROPERTY_NAMES.place);
  const latRaw = pickProp(props, ORG_PROPERTY_NAMES.latitude);
  const lngRaw = pickProp(props, ORG_PROPERTY_NAMES.longitude);
  const lat = latRaw !== undefined && !isNaN(Number(latRaw)) ? Number(latRaw) : null;
  const lng = lngRaw !== undefined && !isNaN(Number(lngRaw)) ? Number(lngRaw) : null;

  // Type / nature: is this an organization (as opposed to an individual)?
  const tipo = pickString(props, ORG_PROPERTY_NAMES.type);
  const tipoLower = tipo.toLowerCase().trim();
  const isIndividual = tipoLower !== '' && matchesToken(tipoLower, INDIVIDUAL_TYPE_VALUES);
  const claroQueEsOrg = tipoLower !== '' && matchesToken(tipoLower, ORG_TYPE_VALUES);
  const orgCheckbox = pickProp(props, ['¿Es organización?', 'Es organización', 'Es una organización', 'Organización?', 'Is organization']);
  const isOrganization = filters.assumeOrganization
    ? true
    : typeof orgCheckbox === 'boolean'
      ? orgCheckbox && !isIndividual
      : (claroQueEsOrg || tipoLower === '') && !isIndividual;

  // Territory: keep only entities whose Escala matches the configured value.
  // When the record has no Escala at all it is not part of the landscape map.
  const zona = anyValues(props, ORG_PROPERTY_NAMES.zona);
  let inAltiplano: boolean;
  if (filters.escalaProperty && filters.escalaValue) {
    const raw = props[filters.escalaProperty];
    const values = flatValues(raw).map((v) => v.toLowerCase());
    inAltiplano = values.includes(filters.escalaValue.toLowerCase());
  } else {
    const inAltiplanoCheckbox = pickProp(props, ORG_PROPERTY_NAMES.inAltiplano);
    if (typeof inAltiplanoCheckbox === 'boolean') {
      inAltiplano = inAltiplanoCheckbox;
    } else {
      const outsideMarkers = ['fuera', 'exterior', 'outside', 'cataluña', 'catalunya', 'madrid', 'internacional', 'global', 'nacional', 'valencia'];
      const zoneTxt = zona.join(' ').toLowerCase();
      if (zoneTxt.includes('altiplano') || zoneTxt.includes('estepario')) inAltiplano = true;
      else if (outsideMarkers.some((m) => zoneTxt.includes(m))) inAltiplano = false;
      else inAltiplano = true;
    }
  }

  // Grupo de trabajo: checkbox true, or a select/multi-select membership value.
  // Real schema (Actores "Grupo de Trabajo" select): Miembro / Relevante /
  // Menos Relevante / Coordinación Internacional / Ex miembro / (null).
  // Only "Miembro" belongs to the grupo de trabajo; every other value is "resto".
  const GT_MEMBER = ['miembro'];
  const GT_FORMER = ['ex miembro', 'ex-miembro', 'exmiembro'];
  const gtRaw = pickProp(props, ORG_PROPERTY_NAMES.grupoTrabajo);
  const gtVals = flatValues(gtRaw).map((v) => v.toLowerCase());
  let grupoTrabajo = false;
  if (typeof gtRaw === 'boolean') {
    grupoTrabajo = gtRaw;
  } else if (gtVals.length > 0) {
    grupoTrabajo =
      gtVals.some((v) => GT_MEMBER.includes(v)) &&
      !gtVals.some((v) => GT_FORMER.includes(v));
  }

  return {
    id: record.id,
    url: record.url,
    name,
    description,
    website,
    placeName,
    lat,
    lng,
    isOrganization,
    inAltiplano,
    grupoTrabajo,
    tipo,
    tipos: anyValues(props, ['Tipo']),
    zona,
  };
}

// The two rules: only organizations, only inside the Altiplano.
export function keepOrg(org: OrgRecord): boolean {
  return org.isOrganization && org.inAltiplano;
}

export function orgHasCoords(org: OrgRecord): boolean {
  return org.lat !== null && org.lng !== null;
}

// ---------------------------------------------------------------------------
// Interventions
// ---------------------------------------------------------------------------

export interface InterventionRecord {
  id: string;
  url?: string;
  name: string;
  description: string;
  orgIds: string[];
  areaTrabajo: string[];
  valor5Anos: number | null;
  valor5AnosRaw: string;
  viable: boolean | null; // null = unknown
  viableRaw: string;
  financiacion: number | null; // total financing
  anos: number | null; // number of years
  recurrente: boolean | null; // null = unknown
  capital1: string;
  capital2: string;
}

const YES_VALUES = ['sí', 'si', 'yes', 'y', 'true', '1', 'viable', 'comercialmente viable', 'sí, es viable', 'es viable'];
const NO_VALUES = ['no', 'n', 'false', '0', 'no viable', 'no es viable'];

function parseValor5Anos(raw: any): { value: number | null; text: string } {
  if (raw === undefined || raw === null || raw === '') return { value: null, text: '' };
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? { value: raw, text: String(raw) } : { value: null, text: String(raw) };
  }
  const text = String(raw).trim();
  // Strip currency symbols, thousands separators, and suffixes like "€ / año"
  const cleaned = text
    .replace(/€|EUR|euros?/gi, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.\-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? { value: n, text } : { value: null, text };
}

function parseViable(raw: any): { viable: boolean | null; text: string } {
  if (raw === undefined || raw === null || raw === '') return { viable: null, text: '' };
  if (typeof raw === 'boolean') return { viable: raw, text: raw ? 'Sí' : 'No' };
  const text = String(raw).trim();
  const lower = text.toLowerCase();
  if (YES_VALUES.includes(lower) || lower.includes('sí') || (lower.startsWith('yes'))) {
    return { viable: true, text };
  }
  if (NO_VALUES.includes(lower) || lower.startsWith('no ')) {
    return { viable: false, text };
  }
  return { viable: null, text };
}

function firstNumber(raw: any): number | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return parseValor5Anos(v).value;
}

function firstString(raw: any): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === undefined || v === null ? '' : String(v).trim();
}

export function normalizeIntervention(record: NormalizedRecord): InterventionRecord {
  const props = record.properties;
  const name = pickString(props, INTERVENTION_PROPERTY_NAMES.name) || 'Sin nombre';
  const description = pickString(props, INTERVENTION_PROPERTY_NAMES.description);
  const orgIds = flatValues(pickProp(props, INTERVENTION_PROPERTY_NAMES.organization));
  const areaTrabajo = anyValues(props, INTERVENTION_PROPERTY_NAMES.areaTrabajo);
  const { value: valor5Anos, text: valor5AnosRaw } = parseValor5Anos(pickProp(props, INTERVENTION_PROPERTY_NAMES.valor5Anos));
  const { viable, text: viableRaw } = parseViable(pickProp(props, INTERVENTION_PROPERTY_NAMES.viable));
  const financiacion = firstNumber(
    pickProp(props, ['Financiación total', 'Financiacion total', 'Financiación necesaria', 'Financiación', 'Financiacion']) ??
      pickFuzzy(props, [/financiaci\w* total|total.*financi|financi\w* necesaria/, /^financiaci/, /inversi\w* total|coste total|presupuesto/], /valor|tipo/),
  );
  const anos = firstNumber(
    pickProp(props, ['Número de años', 'Numero de años', 'N.º de años', 'Años', 'Duración (años)']) ??
      pickFuzzy(props, [/numero de anos|n\W*o de anos|duracion/, /^anos$/, /anos/], /valor/),
  );
  const recRaw = pickProp(props, ['Recurrente', '¿Es recurrente?', 'Es recurrente']) ?? pickFuzzy(props, [/recurrent/]);
  const recurrente = parseViable(Array.isArray(recRaw) ? recRaw[0] : recRaw).viable;
  const capital1 = firstString(
    pickProp(props, ['Tipo de capital 1', 'Tipo de Capital 1', 'Capital 1']) ?? pickFuzzy(props, [/tipo de capital\s*1|capital\s*1/]),
  );
  const capital2 = firstString(
    pickProp(props, ['Tipo de capital 2', 'Tipo de Capital 2', 'Capital 2']) ?? pickFuzzy(props, [/tipo de capital\s*2|capital\s*2/]),
  );
  return {
    id: record.id,
    url: record.url,
    name,
    description,
    orgIds,
    areaTrabajo: areaTrabajo.map((a) => a.replace(/^Área de trabajo[:\-]\s*/i, '').trim()),
    valor5Anos,
    valor5AnosRaw,
    viable,
    viableRaw,
    financiacion,
    anos,
    recurrente,
    capital1,
    capital2,
  };
}

export function formatValor(v: number | null, raw: string): string {
  if (v === null) return raw || '—';
  return `${v.toLocaleString('es-ES')} €`;
}

export function formatEuro(v: number | null): string {
  return v === null ? '—' : `${v.toLocaleString('es-ES')} €`;
}

// Resolve intervention → organization names through the org records
export function interventionOrgNames(intervention: InterventionRecord, orgMap: Map<string, OrgRecord>): string[] {
  return intervention.orgIds.map((id) => orgMap.get(id)?.name).filter((n): n is string => !!n);
}