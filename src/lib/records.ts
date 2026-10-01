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
  website: ['Website', 'Web', 'web', 'URL', 'Url', 'url', 'Página web', 'Pagina web', 'Sitio web'],
  place: ['Place', 'Ubicación', 'Ubicacion', 'Localización', 'Localizacion', 'Location', 'Municipio', 'Pueblo', 'Ciudad'],
  latitude: ['Lat', 'lat', 'Latitud', 'Latitude', 'latitude'],
  longitude: ['Lng', 'lng', 'Lon', 'Longitud', 'Longitude', 'longitude'],
  type: ['Tipo', 'Type', 'type', 'Tipo de actor', 'Tipo de entidad', 'Agency'],
  zone: ['Zona', 'Área', 'Area', 'Ámbito', 'Ambito', 'Alcance', 'Zona geográfica', 'Territorio', 'Espacio', 'Scope'],
  grupoTrabajo: ['Grupo de trabajo', 'Grupo trabajo', 'GrupoTrabajo', 'grupo_trabajo', 'Grupo de Trabajo', '¿Grupo de trabajo?'],
  inAltiplano: ['En el altiplano', 'En el Altiplano', 'Altiplano', 'altiplano', 'Dentro del altiplano', '¿Está en el altiplano?'],
};

export const INTERVENTION_PROPERTY_NAMES: InterventionPropertyNames = {
  name: ['Name', 'Nombre', 'name', 'Intervención', 'Intervencion', 'Iniciativa', 'Proyecto'],
  description: ['Description', 'Descripción', 'Descripcion', 'description', 'Qué es', 'Que es', 'What is it', 'Notas', 'Notes'],
  organization: ['Organización', 'Organizacion', 'Organization', 'Organisation', 'Entidad', 'Entity', 'Actor'],
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

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

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
  zona: string[];
}

export const ORG_TYPE_VALUES = ['org', 'organización', 'organizacion', 'organisation', 'organisatie', 'entidad', 'colectivo', 'cooperativa', 'asociación', 'asociacion', 'asociación civil', 'fundación', 'fundacion', 'fundação', 'empresa', 'iniciativa', 'movimiento', 'red', 'consorcio', 'grupo', 'comunidad', 'ayuntamiento', 'administración', 'public body'];

export const INDIVIDUAL_TYPE_VALUES = ['ind', 'individual', 'persona', 'persona física', 'persona fisica', 'person', 'freelance', 'autónomo', 'autonomo', 'self-employed', 'individual persona'];

export const ALTIPLANO_ZONE_VALUES = ['altiplano', 'estepario', 'altiplano estepario'];

export function normalizeOrg(record: NormalizedRecord): OrgRecord {
  const props = record.properties;
  const name = pickString(props, ORG_PROPERTY_NAMES.name) || 'Sin nombre';
  const description = pickString(props, ORG_PROPERTY_NAMES.description);
  const website = pickString(props, ORG_PROPERTY_NAMES.website) || null;
  const placeName = pickString(props, ORG_PROPERTY_NAMES.place);
  const latRaw = pickProp(props, ORG_PROPERTY_NAMES.latitude);
  const lngRaw = pickProp(props, ORG_PROPERTY_NAMES.longitude);
  const lat = latRaw !== undefined && !isNaN(Number(latRaw)) ? Number(latRaw) : null;
  const lng = lngRaw !== undefined && !isNaN(Number(lngRaw)) ? Number(lngRaw) : null;

  // Type / agency: is this an organization (as opposed to an individual)?
  const tipo = pickString(props, ORG_PROPERTY_NAMES.type);
  const tipoLower = tipo.toLowerCase().trim();
  const isIndividual = INDIVIDUAL_TYPE_VALUES.some((v) => tipoLower.includes(v) || tipoLower === v);
  // Explicit checkbox positive beats the type-based heuristic
  const orgCheckbox = pickProp(props, ['¿Es organización?', 'Es organización', 'Es una organización', 'Organización?', 'Is organization']);
  const isOrganization =
    typeof orgCheckbox === 'boolean' ? orgCheckbox && !isIndividual : !isIndividual;

  // Territorial scope: only keep orgs inside the Altiplano.
  // Rule: an explicit "in altiplano" checkbox wins; otherwise any zone-ish value
  // must mention the altiplano; records with no zone info at all are kept
  // (they were collected for this territory) unless an explicit outside marker exists.
  const inAltiplanoCheckbox = pickProp(props, ORG_PROPERTY_NAMES.inAltiplano);
  const zona = anyValues(props, ORG_PROPERTY_NAMES.zone);
  let inAltiplano: boolean;
  if (typeof inAltiplanoCheckbox === 'boolean') {
    inAltiplano = inAltiplanoCheckbox;
  } else {
    const outsideMarkers = ['fuera', 'exterior', 'outside', 'cataluña', 'catalunya', 'madrid', 'internacional', 'global', 'nacional', 'resto de españa', 'resto de espana', 'valencia', 'país vasco'];
    const zoneTxt = zona.join(' ').toLowerCase();
    if (zoneTxt.includes('altiplano') || zoneTxt.includes('estepario')) {
      inAltiplano = true;
    } else if (outsideMarkers.some((m) => zoneTxt.includes(m))) {
      inAltiplano = false;
    } else {
      inAltiplano = true; // no zone info → keep (collected for this landscape)
    }
  }

  // Grupo de trabajo: checkbox true, or select/multi-select value that says yes
  const gtRaw = pickProp(props, ORG_PROPERTY_NAMES.grupoTrabajo);
  const gtVals = flatValues(gtRaw);
  const grupoTrabajo =
    typeof gtRaw === 'boolean'
      ? gtRaw
      : gtVals.some((v) => ['sí', 'si', 'yes', 'y', 'true', '1', 'miembro', 'participa', 'active'].includes(v.toLowerCase())) ||
        gtVals.every((v) => !['no', 'n', 'false', '0'].includes(v.toLowerCase()));

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
    zona,
  };
}

// The two rules the user set: only organizations, only inside the Altiplano.
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

export function normalizeIntervention(record: NormalizedRecord): InterventionRecord {
  const props = record.properties;
  const name = pickString(props, INTERVENTION_PROPERTY_NAMES.name) || 'Sin nombre';
  const description = pickString(props, INTERVENTION_PROPERTY_NAMES.description);
  const orgIds = flatValues(pickProp(props, INTERVENTION_PROPERTY_NAMES.organization));
  const areaTrabajo = anyValues(props, INTERVENTION_PROPERTY_NAMES.areaTrabajo);
  const { value: valor5Anos, text: valor5AnosRaw } = parseValor5Anos(pickProp(props, INTERVENTION_PROPERTY_NAMES.valor5Anos));
  const { viable, text: viableRaw } = parseViable(pickProp(props, INTERVENTION_PROPERTY_NAMES.viable));
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
  };
}

export function formatValor(v: number | null, raw: string): string {
  if (v === null) return raw || '—';
  return `${v.toLocaleString('es-ES')} €`;
}

// Resolve intervention → organization names through the org records
export function interventionOrgNames(intervention: InterventionRecord, orgMap: Map<string, OrgRecord>): string[] {
  return intervention.orgIds.map((id) => orgMap.get(id)?.name).filter((n): n is string => !!n);
}