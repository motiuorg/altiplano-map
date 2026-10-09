// Build-time data for the Simulador económico. Reads the four model databases from
// Notion and keeps only what the public page needs: internal notes, validation
// status, the data-gap tracker and links into the Notion workspace never reach the
// page. Falls back to the published snapshot (src/data/simulador.json) when Notion
// is not reachable or the databases are not shared with the integration.
import { loadDatabaseConfig, fetchSection } from '../notion';
import type { NormalizedRecord } from '../notion';
import snapshot from '../../data/simulador.json';

export interface SimuladorData {
  datos: any;
  origen: 'notion' | 'copia';
}

// Transition types (keys match the trajectory "Escenario" values in Notion).
const ESCENARIOS: Record<string, string> = {
  completa: 'Transición certificada (eco-regenerativa)',
  mejora: 'Mejora de gestión (sin certificar)',
};

// Internal document names → neutral labels for the public page.
const FUENTES_PUBLICAS: Record<string, string> = {
  'Estimations and figures for EIB (Commonland/AlVelAl 2025)': 'Estimaciones de costes de transición (Commonland / AlVelAl, 2025)',
  'Estimación Costes Transición Eco-Regenerativa por Hectárea (abr 2026)': 'Estimación de costes de transición por hectárea (Commonland / AlVelAl, 2026)',
  'Supuesto interno (equipo Altiplano)': 'Supuesto del equipo técnico',
  'Almendrehesa — Plan económico-financiero 25-28 (interno; compras 2022–2025)': 'Comercializadoras del territorio (2022–2025)',
};
// Belt and braces: never publish a single commercializer's name.
const ANONIMIZAR = /almendrehesa|habitat/i;
const fuente = (f: string) => {
  const out = FUENTES_PUBLICAS[f] ?? f ?? '';
  return ANONIMIZAR.test(out) ? 'Comercializadoras del territorio' : out;
};
const url = (u: string | null) => (u && !u.includes('notion.com') && !u.includes('notion.so') ? u : '');

// Crop order, everywhere: almond, olive, pistachio, cereal.
const ORDEN_CULTIVO = ['Todos', 'Almendro', 'Olivo', 'Pistacho', 'Cereal'];
const ORDEN_CATEGORIA = ['Superficie', 'Rendimiento', 'Precio', 'Coste base', 'PAC', 'Adopción', 'Carbono', 'Crédito'];
const ORDEN_ARQ = ['alm-conv', 'alm-eco', 'oli-conv', 'oli-eco', 'pis-conv', 'cer-conv', 'cer-eco'];
const idx = (arr: string[], v: string) => (arr.indexOf(v) === -1 ? 99 : arr.indexOf(v));

// One place that fixes the order of crops, whatever the source (Notion or the saved snapshot).
const porParametro = (a: any, b: any) =>
  idx(ORDEN_CULTIVO, a.cultivo) - idx(ORDEN_CULTIVO, b.cultivo) ||
  idx(ORDEN_CATEGORIA, a.categoria) - idx(ORDEN_CATEGORIA, b.categoria) || String(a.clave).localeCompare(String(b.clave));
const porArquetipo = (a: any, b: any) => idx(ORDEN_ARQ, a.clave) - idx(ORDEN_ARQ, b.clave);
function ordenar<T extends { parametros: any[]; arquetipos: any[] }>(d: T): T {
  return { ...d, parametros: [...d.parametros].sort(porParametro), arquetipos: [...d.arquetipos].sort(porArquetipo) };
}

function parametros(rows: NormalizedRecord[]) {
  return rows
    .map(({ properties: p }) => ({
      clave: p['Clave'], nombre: p['Parámetro'], categoria: p['Categoría'], cultivo: p['Cultivo'],
      linea_base: p['Línea base'] || 'Todas', bajo: p['Bajo'], central: p['Central'], alto: p['Alto'],
      unidad: p['Unidad'], sentido: p['Sentido'] ?? 0, fuente: fuente(p['Fuente']), url: url(p['Enlace fuente']),
      tipo: p['Tipo de dato'], confianza: p['Confianza'],
    }))
    .filter((r) => r.clave)
    .sort(porParametro);
}

function practicas(rows: NormalizedRecord[]) {
  const orden = ['Recurrente', 'CAPEX', 'Servicio'];
  return rows
    .map(({ properties: p }) => ({
      clave: p['Clave'], nombre: p['Práctica'], tipo: p['Tipo'], cultivos: p['Cultivos'] ?? [],
      linea_base: p['Línea base'] || 'Todas', bajo: p['Bajo €/ha'], central: p['Central €/ha'], alto: p['Alto €/ha'],
      unidad: '€/ha', cobertura: p['Cobertura'] ?? 1, frecuencia: p['Frecuencia (años)'] || 1, anios: p['Años'] || '1-10',
      solo_completa: !!p['Solo transición completa'], fuente: fuente(p['Fuente']), url: url(p['Enlace fuente']),
      confianza: p['Confianza'], mejora: !!p['Incluida en mejora de gestión'], fijo: p['Parte fija por finca'] ?? 0,
    }))
    .filter((r) => r.clave)
    .sort((a, b) => idx(orden, a.tipo) - idx(orden, b.tipo) || a.clave.localeCompare(b.clave));
}

function trayectorias(rows: NormalizedRecord[]) {
  return rows
    .map(({ properties: p }) => ({
      clave: p['Clave'], nombre: p['Curva'], escenario: p['Escenario'],
      valores: Array.from({ length: 10 }, (_, i) => p[`A${i + 1}`] ?? 0),
      fuente: 'Supuesto del equipo técnico', confianza: p['Confianza'],
    }))
    .filter((r) => r.clave && r.escenario in ESCENARIOS);
}

function diversificacion(rows: NormalizedRecord[]) {
  const tri = (p: any, n: string, suf = ' €/ha') => ['bajo', 'central', 'alto'].map((x) => p[`${n} ${x}${suf}`] ?? 0);
  return rows
    .map(({ properties: p }) => ({
      clave: p['Clave'], nombre: p['Módulo'], cultivos: p['Cultivos'] ?? [],
      inversion: tri(p, 'Inversión'), coste: tri(p, 'Coste anual'), ingreso: tri(p, 'Ingreso anual'),
      anio_ingreso: p['Año primer ingreso'] || 1, ahorro_cubierta: p['Ahorro manejo cubierta'] ?? 0,
      ahorro_enmiendas: tri(p, 'Ahorro enmiendas', ''), efecto_rendimiento: tri(p, 'Efecto rendimiento', ''),
      fuente: fuente(p['Fuente']), url: url(p['Enlace fuente']), confianza: p['Confianza'],
    }))
    .filter((r) => r.clave)
    .sort((a, b) => a.clave.localeCompare(b.clave));
}

function arquetipos(rows: NormalizedRecord[]) {
  return rows
    .map(({ properties: p }) => ({
      clave: p['Clave'], nombre: p['Arquetipo'], cultivo: p['Cultivo'], prefijo: p['Prefijo'], linea_base: p['Línea base'],
    }))
    .filter((r) => r.clave && r.prefijo)
    .sort(porArquetipo);
}

export async function loadSimuladorData(): Promise<SimuladorData> {
  const env = (k: string) => import.meta.env[k] ?? process.env[k];
  const useFixture = ['1', 'true', 'yes'].includes(String(env('USE_FIXTURE') ?? '').toLowerCase());
  const cfg = loadDatabaseConfig().simulador;
  if (useFixture || !env('NOTION_API_KEY') || !cfg) return { datos: ordenar(snapshot), origen: 'copia' };
  try {
    const [s, p, t, a, d] = await Promise.all([
      fetchSection(cfg.supuestos), fetchSection(cfg.practicas),
      fetchSection(cfg.trayectorias), fetchSection(cfg.arquetipos),
      cfg.diversificacion ? fetchSection(cfg.diversificacion) : Promise.resolve([] as NormalizedRecord[]),
    ]);
    const datos = {
      parametros: parametros(s), practicas: practicas(p), trayectorias: trayectorias(t), arquetipos: arquetipos(a),
      diversificacion: diversificacion(d),
      meta: {
        generado: s.map((r) => r.lastEditedTime).sort().pop()?.slice(0, 10) ?? '',
        escenarios: ESCENARIOS,
      },
    };
    if (!datos.parametros.length || !datos.arquetipos.length || !datos.trayectorias.length) throw new Error('bases vacías');
    return { datos: ordenar(datos), origen: 'notion' };
  } catch (e: any) {
    console.warn(`[simulador] Notion no disponible (${e?.message ?? e}); se usa src/data/simulador.json`);
    return { datos: ordenar(snapshot), origen: 'copia' };
  }
}
