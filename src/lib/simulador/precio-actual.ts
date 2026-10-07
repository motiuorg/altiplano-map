// Latest Lonja de Murcia almond quote (comuna + ecológica), read at build time from
// the regional government's weekly price summary (CARM, "Resumen semanal de
// precios" PDF). The site rebuilds every 6 hours, so this stays current. Any
// failure falls back to the last known value in src/data/precio-almendra.json.
import referencia from '../../data/precio-almendra.json';

const INDICE = 'https://esam.carm.es/wp-json/wp/v2/media?search=PRECIOS-CAMPO&per_page=20&orderby=date&order=desc';
const num = (s: string) => Number(s.replace(',', '.'));

async function leerPdf(url: string) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(await (await fetch(url)).arrayBuffer());
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true, verbosity: 0 }).promise;
  let comuna: number | null = null, ecologica: number | null = null, semana: number | null = null, anio: number | null = null;
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    const lineas = new Map<number, [number, string][]>();
    for (const it of tc.items as any[]) {
      const y = Math.round(it.transform[5]);
      if (!lineas.has(y)) lineas.set(y, []);
      lineas.get(y)!.push([it.transform[4], it.str]);
    }
    const textos = [...lineas.values()].map((l) => l.sort((a, b) => a[0] - b[0]).map((x) => x[1]).join(' ').replace(/\s+/g, ' ').trim());
    const todo = textos.join(' ');
    semana ??= Number(/Semana:\s*(\d+)/.exec(todo)?.[1]) || null;
    anio ??= Number(/A\S{0,3}o:\s*(\d{4})/.exec(todo)?.[1]) || null;
    for (const t of textos) {
      if (!t.startsWith('Almendra')) continue;
      const v = t.match(/\d+,\d+/g);
      if (!v) continue;
      if (/Ecol/.test(t)) ecologica = num(v[v.length - 1]);
      else if (/Com\S*\s*un\b|Com\S*n\b/.test(t)) comuna = num(v[v.length - 1]);
    }
  }
  return { comuna, ecologica, semana, anio };
}

export async function precioActualAlmendra() {
  const reserva = { ...referencia.actual, origen: 'copia' as const };
  try {
    const idx = (await (await fetch(INDICE)).json()) as any[];
    const pdf = idx.find((m) => /\.pdf$/i.test(m?.source_url ?? ''));
    if (!pdf) throw new Error('sin PDF en el índice');
    const r = await leerPdf(pdf.source_url);
    // Sanity bounds: a parsing slip must never reach the page.
    const ok = (x: number | null) => x !== null && x > 1 && x < 20;
    if (!ok(r.comuna) || !ok(r.ecologica)) throw new Error('no se encontró la almendra en el PDF');
    console.log(`[simulador] precio actual Lonja de Murcia: comuna ${r.comuna}, ecológica ${r.ecologica} (sem. ${r.semana}, ${pdf.date})`);
    const fecha = String(pdf.date).slice(0, 10);
    return { fecha, semana: r.semana, anio: r.anio ?? Number(fecha.slice(0, 4)), comuna: r.comuna!, ecologica: r.ecologica!, url: pdf.source_url, origen: 'en vivo' as const };
  } catch (e: any) {
    console.warn(`[simulador] precio actual no disponible (${e?.message ?? e}); se usa el último guardado`);
    return reserva;
  }
}

export const historicoAlmendra = referencia;
