// Local fixture dataset — used only when USE_FIXTURE=1 (dev/visual iteration),
// or referenced as the fallback shape for the UI. Properties deliberately use
// Spanish names and varied shapes (checkbox/select/relation/…) so the defensive
// matching in records.ts is exercised the same way real Notion data would be.
//
// Places are real towns of the Altiplano Estepario (steppe highlands of
// Zaragoza/Teruel/Soria, Spain) with approximate coordinates; orgs/interventions
// are illustrative.

import type { NormalizedRecord } from './notion';

function rec(partial: Omit<NormalizedRecord, 'id' | 'url' | 'createdTime' | 'lastEditedTime'>): NormalizedRecord {
  return {
    id: partial.properties['ID'] as string,
    url: `https://www.notion.so/fixture-${partial.properties['ID']}`,
    createdTime: '2026-01-01T00:00:00.000Z',
    lastEditedTime: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

export const FIXTURE_ORGANIZATIONS: NormalizedRecord[] = [
  rec({
    properties: {
      ID: 'org-jiloca',
      Nombre: 'Asociación de Pastores del Jiloca',
      Descripción: 'Red de ganaderos extensivos que comparte pastos, formación y Cañadas reales en el valle del Jiloca.',
      Web: 'https://pastoresjiloca.example.com',
      Municipio: 'Daroca',
      Lat: 41.115,
      Lng: -1.4128,
      Tipo: 'Asociación',
      Zona: 'Altiplano Estepario – Jiloca',
      'Grupo de trabajo': true,
    },
  }),
  rec({
    properties: {
      ID: 'org-cariñena',
      Nombre: 'Cooperativa Agroecológica Monegros Sur',
      Descripción: 'Producción de almendra, olivar y cereal ecológico de secano con circuitos cortos de comercialización.',
      Web: 'https://monegrossur.example.com',
      Municipio: 'Cariñena',
      Lat: 41.3373,
      Lng: -1.2243,
      Tipo: 'Cooperativa',
      Zona: 'Altiplano Estepario – Campo de Cariñena',
      'Grupo de trabajo': true,
    },
  }),
  rec({
    properties: {
      ID: 'org-estepaviva',
      Nombre: 'Fundación Estepa Viva',
      Descripción: 'Conservación de estepas esteparias, alcaravanes y sisones; acuerdos de custodia del territorio con agricultores.',
      Web: 'https://estepaviva.example.com',
      Municipio: 'Belchite',
      Lat: 41.3056,
      Lng: -0.7505,
      Tipo: 'Fundación',
      Zona: 'Altiplano Estepario – Campo de Belchite',
      'Grupo de trabajo': true,
    },
  }),
  rec({
    properties: {
      ID: 'org-huerta',
      Nombre: 'Colectivo Huerta de Calatayud',
      Descripción: 'Huertos comunitarios y banco de tierras para jóvenes agricultores en la vega del Jalón.',
      Web: 'https://huertacalatayud.example.com',
      Municipio: 'Calatayud',
      Lat: 41.3533,
      Lng: -1.641,
      Tipo: 'Colectivo',
      Zona: 'Altiplano Estepario – Comunidad de Calatayud',
      'Grupo de trabajo': true,
    },
  }),
  rec({
    properties: {
      ID: 'org-semillas',
      Nombre: 'Red de Semillas del Altiplano',
      Descripción: 'Banco comunitario de semillas de variedades locales adaptadas al secano frío: trigo escaña, lenteja, garbanzo.',
      Web: 'https://semillasaltiplano.example.com',
      Municipio: 'Used',
      Lat: 41.0528,
      Lng: -1.5608,
      Tipo: 'Red',
      Zona: 'Altiplano Estepario – Campo de Daroca',
      'Grupo de trabajo': true,
    },
  }),
  rec({
    properties: {
      ID: 'org-mancomunidad',
      Nombre: 'Mancomunidad del Altiplano',
      Descripción: 'Entidad supramunicipal de la comarca que coordina servicios, residuos y la estrategia de despoblación.',
      Web: 'https://mancomunidadaltiplano.example.com',
      Municipio: 'Montalbán',
      Lat: 40.8325,
      Lng: -0.7994,
      Tipo: 'Administración',
      Zona: 'Altiplano Estepario – Cuencas Mineras',
      'Grupo de trabajo': true,
    },
  }),
  rec({
    properties: {
      ID: 'org-bardera',
      Nombre: 'Asociación Cultural La Bardera',
      Descripción: 'Cultura rural y memoria del territorio: archivos orales, rutas etnográficas y teatro comunitario.',
      Web: 'https://labardera.example.com',
      Municipio: 'Molina de Aragón',
      Lat: 40.8441,
      Lng: -1.8887,
      Tipo: 'Asociación',
      Zona: 'Altiplano Estepario – Señorío de Molina',
      'Grupo de trabajo': false,
    },
  }),
  rec({
    properties: {
      ID: 'org-pastores',
      Nombre: 'Escuela de Pastores de Teruel',
      Descripción: 'Formación profesional en ganadería extensiva, trashumancia moderna y elaboración de quesos de pasto.',
      Web: 'https://escuelapastores.example.com',
      Municipio: 'Teruel',
      Lat: 40.3456,
      Lng: -1.1065,
      Tipo: 'Fundación',
      Zona: 'Altiplano Estepario – Teruel',
      'Grupo de trabajo': false,
    },
  }),
  rec({
    properties: {
      ID: 'org-sabinar',
      Nombre: 'Vivero Forestal El Sabinar',
      Descripción: 'Producción de planta autóctona (sabina, encina, quejigo) y restauración de ecosistemas de sabinar.',
      Web: 'https://elsabinar.example.com',
      Municipio: 'Utrillas',
      Lat: 40.8129,
      Lng: -0.8437,
      Tipo: 'Empresa',
      Zona: 'Altiplano Estepario – Cuencas Mineras',
      'Grupo de trabajo': false,
    },
  }),
  rec({
    properties: {
      ID: 'org-molina-tur',
      Nombre: 'Turismo Regenerativo Molina',
      Descripción: 'Alojamientos rurales y experiencias que financian la restauración de pastos y bosques del señorío.',
      Web: 'https://turismoregen.example.com',
      Municipio: 'Molina de Aragón',
      Lat: 40.8441,
      Lng: -1.8887,
      Tipo: 'Iniciativa',
      Zona: 'Altiplano Estepario – Señorío de Molina',
      'Grupo de trabajo': false,
    },
  }),
  rec({
    properties: {
      ID: 'org-aguas',
      Nombre: 'Comunidad de Aguas de Used',
      Descripción: 'Gestión colectiva del regadío histórico de la laguna de Gallocanta: eficiencia y acuerdos con la avifauna.',
      Municipio: 'Used',
      Lat: 41.0528,
      Lng: -1.5608,
      Tipo: 'Comunidad',
      Zona: 'Altiplano Estepario – Campo de Daroca',
      'Grupo de trabajo': false,
    },
  }),
  // --- Excluded by the filters (demonstrate the rules) ---
  rec({
    properties: {
      ID: 'persona-maria',
      Nombre: 'María Pérez',
      Descripción: 'Consultora agroecológica independiente.',
      Tipo: 'Persona',
      Zona: 'Altiplano Estepario – Jiloca',
      Lat: 41.115,
      Lng: -1.4128,
      'Grupo de trabajo': false,
    },
  }),
  rec({
    properties: {
      ID: 'persona-jose',
      Nombre: 'José Luis García',
      Descripción: 'Pastor freelance.',
      Tipo: 'Individual',
      Zona: 'Altiplano Estepario – Teruel',
      Lat: 40.3456,
      Lng: -1.1065,
      'Grupo de trabajo': false,
    },
  }),
  rec({
    properties: {
      ID: 'org-madrid',
      Nombre: 'Fundación Global Regen',
      Descripción: 'Fundación internacional con sede en Madrid.',
      Tipo: 'Fundación',
      Zona: 'Madrid',
      Lat: 40.4168,
      Lng: -3.7038,
      'Grupo de trabajo': false,
    },
  }),
  rec({
    properties: {
      ID: 'org-catalunya',
      Nombre: 'Cooperativa EcoVallès',
      Descripción: 'Cooperativa agroecológica del Vallès (Catalunya).',
      Tipo: 'Cooperativa',
      Zona: 'Catalunya',
      Lat: 41.59,
      Lng: 2.25,
      'Grupo de trabajo': false,
    },
  }),
];

export const FIXTURE_INTERVENTIONS: NormalizedRecord[] = [
  rec({
    properties: {
      ID: 'int-1',
      Nombre: 'Refugios y pasos de ganado para la trashumancia',
      Descripción: 'Recuperación de la cañada real del Jiloca con refugios para pastores y pasos seguros para el rebaño.',
      Organización: ['org-jiloca'],
      'Área de trabajo': 'Agricultura regenerativa',
      'Valor ajustado a 5 años': 420000,
      '¿Es viable comercialmente?': 'Sí',
    },
  }),
  rec({
    properties: {
      ID: 'int-2',
      Nombre: 'Almazara comunitaria de secano',
      Descripción: 'Almazara cooperativa que transforma la aceituna ecológica y devuelve el orujo como compost a las fincas.',
      Organización: ['org-cariñena'],
      'Área de trabajo': 'Agricultura regenerativa',
      'Valor ajustado a 5 años': 850000,
      '¿Es viable comercialmente?': 'Sí',
    },
  }),
  rec({
    properties: {
      ID: 'int-3',
      Nombre: 'Custodia territorial esteparia',
      Descripción: 'Acuerdos de custodia con 12 fincas para dejar bordas y barbechos que alimenten a sisones y avutardas.',
      Organización: ['org-estepaviva'],
      'Área de trabajo': 'Espacios naturales',
      'Valor ajustado a 5 años': 300000,
      '¿Es viable comercialmente?': 'No',
    },
  }),
  rec({
    properties: {
      ID: 'int-4',
      Nombre: 'Banco de tierras del Jalón',
      Descripción: 'Plataforma que pone en contacto propietarios jubilados con jóvenes agricultores mediante contratos de arrendamiento largo.',
      Organización: ['org-huerta'],
      'Área de trabajo': 'Articulación y desarrollo territorial',
      'Valor ajustado a 5 años': 180000,
      '¿Es viable comercialmente?': 'Sí',
    },
  }),
  rec({
    properties: {
      ID: 'int-5',
      Nombre: 'Red de semillas y multiplicación local',
      Descripción: 'Multiplicación de escaña, lenteja pardina y garbanzo de secano por agricultores socios; venta a panaderías locales.',
      Organización: ['org-semillas'],
      'Área de trabajo': 'Agricultura regenerativa',
      'Valor ajustado a 5 años': 240000,
      '¿Es viable comercialmente?': 'Sí',
    },
  }),
  rec({
    properties: {
      ID: 'int-6',
      Nombre: 'Oficina de proyectos contra la despoblación',
      Descripción: 'Ventanilla única municipal para emprendedores rurales: acompañamiento, financiación y suelo.',
      Organización: ['org-mancomunidad'],
      'Área de trabajo': 'Articulación y desarrollo territorial',
      'Valor ajustado a 5 años': 150000,
      '¿Es viable comercialmente?': 'No',
    },
  }),
  rec({
    properties: {
      ID: 'int-7',
      Nombre: 'Escuela de verano del territorio',
      Descripción: 'Programa educativo anual que acerca a escolares y jóvenes a los oficios rurales y la biodiversidad esteparia.',
      Organización: ['org-bardera'],
      'Área de trabajo': 'Educación, cultura y turismo',
      'Valor ajustado a 5 años': 95000,
      '¿Es viable comercialmente?': 'No',
    },
  }),
  rec({
    properties: {
      ID: 'int-8',
      Nombre: 'Quesería de pasto del Alto Jiloca',
      Descripción: 'Quesería artesanal con leche de la escuela de pastores; maduración y venta directa y a hostelería.',
      Organización: ['org-pastores'],
      'Área de trabajo': 'Agricultura regenerativa',
      'Valor ajustado a 5 años': 600000,
      '¿Es viable comercialmente?': 'Sí',
    },
  }),
  rec({
    properties: {
      ID: 'int-9',
      Nombre: 'Restauración de sabinar en Cuencas Mineras',
      Descripción: 'Recuperación de masas de sabina albar tras la minería, con plantación de planta autóctona y seguimiento.',
      Organización: ['org-sabinar'],
      'Área de trabajo': 'Espacios naturales',
      'Valor ajustado a 5 años': 380000,
      '¿Es viable comercialmente?': 'No',
    },
  }),
  rec({
    properties: {
      ID: 'int-10',
      Nombre: 'Rutas del pastoreo regenerativo',
      Descripción: 'Experiencias turísticas guiadas por pastores que financian la mejora de pastos y la conservación de la laguna.',
      Organización: ['org-molina-tur', 'org-aguas'],
      'Área de trabajo': 'Educación, cultura y turismo',
      'Valor ajustado a 5 años': 210000,
      '¿Es viable comercialmente?': 'Sí',
    },
  }),
];