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

const ESCENARIOS = {
  completa: 'Transición completa (eco-regenerativa certificada)',
  parcial: 'Transición parcial (50% de intensidad, sin certificar)',
  mejora: 'Mejora de gestión (20% de intensidad)',
};

// Internal document names → neutral labels for the public page.
const FUENTES_PUBLICAS: Record<string, string> = {
  'Estimations and figures for EIB (Commonland/AlVelAl 2025)': 'Estimaciones de costes de transición (Commonland / AlVelAl, 2025)',
  'Estimación Costes Transición Eco-Regenerativa por Hectárea (abr 2026)': 'Estimación de costes de transición por hectárea (Commonland / AlVelAl, 2026)',
  'Supuesto interno (equipo Altiplano)': 'Supuesto del equipo técnico',
};
const fuente = (f: string) => FUENTES_PUBLICAS[f] ?? f ?? '';
const url = (u: string | null) => (u && !u.includes('notion.com') && !u.includes('notion.so') ? u : '');

const ORDEN_CULTIVO = ['Todos', 'Almendro', 'Olivo', 'Cereal', 'Pistacho'];
const ORDEN_CATEGORIA = ['Superficie', 'Rendimiento', 'Precio', 'Coste base', 'PAC', 'Adopción', 'Carbono', 'Crédito'];
const ORDEN_ARQ = ['alm-conv', 'alm-eco', 'oli-conv', 'oli-eco', 'cer-conv', 'cer-eco', 'pis-conv'];
const idx = (arr: string[], v: string) => (arr.indexOf(v) === -1 ? 99 : arr.indexOf(v));

function parametros(rows: NormalizedRecord[]) {
  return rows
    .map(({ properties: p }) => ({
      clave: p['Clave'], nombre: p['Parámetro'], categoria: p['Categoría'], cultivo: p['Cultivo'],
      linea_base: p['Línea base'] || 'Todas', bajo: p['Bajo'], central: p['Central'], alto: p['Alto'],
      unidad: p['Unidad'], sentido: p['Sentido'] ?? 0, fuente: fuente(p['Fuente']), url: url(p['Enlace fuente']),
      tipo: p['Tipo de dato'], confianza: p['Confianza'],
    }))
    .filter((r) => r.clave)
    .sort((a, b) => idx(ORDEN_CULTIVO, a.cultivo) - idx(ORDEN_CULTIVO, b.cultivo) ||
      idx(ORDEN_CATEGORIA, a.categoria) - idx(ORDEN_CATEGORIA, b.categoria) || a.clave.localeCompare(b.clave));
}

function practicas(rows: NormalizedRecord[]) {
  const orden = ['Recurrente', 'CAPEX', 'Servicio'];
  return rows
    .map(({ properties: p }) => ({
      clave: p['Clave'], nombre: p['Práctica'], tipo: p['Tipo'], cultivos: p['Cultivos'] ?? [],
      linea_base: p['Línea base'] || 'Todas', bajo: p['Bajo €/ha'], central: p['Central €/ha'], alto: p['Alto €/ha'],
      unidad: '€/ha', cobertura: p['Cobertura'] ?? 1, frecuencia: p['Frecuencia (años)'] || 1, anios: p['Años'] || '1-10',
      solo_completa: !!p['Solo transición completa'], fuente: fuente(p['Fuente']), url: url(p['Enlace fuente']),
      confianza: p['Confianza'],
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
    .filter((r) => r.clave && r.escenario);
}

function arquetipos(rows: NormalizedRecord[]) {
  return rows
    .map(({ properties: p }) => ({
      clave: p['Clave'], nombre: p['Arquetipo'], cultivo: p['Cultivo'], prefijo: p['Prefijo'], linea_base: p['Línea base'],
    }))
    .filter((r) => r.clave && r.prefijo)
    .sort((a, b) => idx(ORDEN_ARQ, a.clave) - idx(ORDEN_ARQ, b.clave));
}

export async function loadSimuladorData(): Promise<SimuladorData> {
  const env = (k: string) => import.meta.env[k] ?? process.env[k];
  const useFixture = ['1', 'true', 'yes'].includes(String(env('USE_FIXTURE') ?? '').toLowerCase());
  const cfg = loadDatabaseConfig().simulador;
  if (useFixture || !env('NOTION_API_KEY') || !cfg) return { datos: snapshot, origen: 'copia' };
  try {
    const [s, p, t, a] = await Promise.all([
      fetchSection(cfg.supuestos), fetchSection(cfg.practicas),
      fetchSection(cfg.trayectorias), fetchSection(cfg.arquetipos),
    ]);
    const datos = {
      parametros: parametros(s), practicas: practicas(p), trayectorias: trayectorias(t), arquetipos: arquetipos(a),
      meta: {
        generado: s.map((r) => r.lastEditedTime).sort().pop()?.slice(0, 10) ?? '',
        escenarios: ESCENARIOS,
      },
    };
    if (!datos.parametros.length || !datos.arquetipos.length || !datos.trayectorias.length) throw new Error('bases vacías');
    return { datos, origen: 'notion' };
  } catch (e: any) {
    console.warn(`[simulador] Notion no disponible (${e?.message ?? e}); se usa src/data/simulador.json`);
    return { datos: snapshot, origen: 'copia' };
  }
}
