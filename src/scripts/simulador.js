// Simulador económico — panel interactivo. Lógica portada del panel del vault
// (Altiplano Estepario/8 Análisis Económico/simulador/app.js) a los tokens del sitio.
import { STR } from "./simulador-strings.js";
import EN from "../data/simulador-en.json";

// Off for now: Notion data (names, units, types, confidence) is shown as written.
const TRANSLATE_NOTION_DATA = false;

export function iniciarSimulador(D, M, langCode, precios) {
  "use strict";
  const lang = langCode === "en" ? "en" : "es";
  const S = STR[lang];
  // Display-only translation of Notion enumerations/names (the model keeps using
  // the original Spanish values for its logic).
  const tx = (group, v) => (lang === "en" && TRANSLATE_NOTION_DATA ? (EN[group] && EN[group][v]) || v : v);
  const nm = (r) => (lang === "en" && TRANSLATE_NOTION_DATA ? EN.nombres[r.clave] || r.nombre : r.nombre);
  const an = (clave, nombre) => (lang === "en" && TRANSLATE_NOTION_DATA ? EN.arquetipos[clave] || nombre : nombre);
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // ------------------------------------------------------------------ formatting
  const nf0 = new Intl.NumberFormat(S.loc, { maximumFractionDigits: 0, useGrouping: "always" });
  const nf1 = new Intl.NumberFormat(S.loc, { maximumFractionDigits: 1, minimumFractionDigits: 1, useGrouping: "always" });
  const nf2 = new Intl.NumberFormat(S.loc, { maximumFractionDigits: 2, minimumFractionDigits: 2, useGrouping: "always" });
  const eur = (x) => (x < 0 ? "−" : "") + nf0.format(Math.abs(Math.round(x))) + " €";
  const eurM = (x) => (x < 0 ? "−" : "") + nf1.format(Math.abs(x) / 1e6) + " M€";
  const signed = (x) => (x > 0 ? "+" : x < 0 ? "−" : "") + nf0.format(Math.abs(Math.round(x))) + " €";
  const fmtHa = (x) => (Number.isInteger(x) ? nf0 : nf1).format(x);
  const pct = (x) => { const v = Math.round(x * 1000) / 10; return (Number.isInteger(v) ? nf0 : nf1).format(v) + "%"; };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const css = (v) => getComputedStyle(document.querySelector(".sim")).getPropertyValue(v).trim();

  function fmtValor(v, unidad) {
    if (v == null) return "—";
    if (unidad && unidad.startsWith("%")) return pct(v);
    if (Math.abs(v) >= 1000) return nf0.format(v);
    if (Number.isInteger(v)) return String(v);
    return nf2.format(v);
  }

  // ------------------------------------------------------------------ state
  const st = {
    arquetipo: D.arquetipos[0].clave, escenario: "completa", conjunto: "central", pac: 1,
    pse: 0, preciosAbierto: false, tab: "finca",
    haFinca: null, haT: null, div: {}, divAbierto: false, unidad: "finca",
    sub: "pesa", alcance: "finca", supCerradas: new Set(),
    credito: {}, tam: null, adopcion: null, superficies: {}, overrides: {}, abiertos: new Set(),
  };
  const P = Object.fromEntries(D.parametros.map((r) => [r.clave, r]));
  const opts = () => ({
    arquetipo: st.arquetipo, escenario: st.escenario, conjunto: st.conjunto, pac: st.pac,
    haFinca: st.haFinca, haTransicion: st.haT, diversificacion: { ...st.div },
    // The regenerative premium is always in the model: set it to 0 to remove it.
    primaRegen: true, carbono: false, pse: st.pse, overrides: { ...st.overrides },
  });

  // ------------------------------------------------------------------ tooltip
  const tip = $("#tip");
  function showTip(ev, title, rows) {
    tip.replaceChildren();
    const t = document.createElement("div"); t.className = "t"; t.textContent = title; tip.appendChild(t);
    for (const [label, value, color] of rows) {
      const r = document.createElement("div"); r.className = "r";
      if (color) { const k = document.createElement("span"); k.className = "k"; k.style.background = color; r.appendChild(k); }
      const b = document.createElement("b"); b.textContent = value; r.appendChild(b);
      const l = document.createElement("span"); l.textContent = label; r.appendChild(l);
      tip.appendChild(r);
    }
    tip.hidden = false;
    const x = Math.min(ev.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    const y = Math.min(ev.clientY + 14, window.innerHeight - tip.offsetHeight - 8);
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  const hideTip = () => { tip.hidden = true; };
  function bindTips(el, fn) {
    const handler = (ev) => {
      const h = ev.target.closest("[data-i]");
      if (!h) return hideTip();
      const [title, rows] = fn(+h.dataset.i);
      const e = ev.clientX ? ev : (() => { const r = h.getBoundingClientRect(); return { clientX: r.right, clientY: r.top }; })();
      showTip(e, title, rows);
    };
    el.onpointermove = handler; el.onfocusin = handler;
    el.onpointerleave = hideTip; el.onfocusout = hideTip;
  }

  // ------------------------------------------------------------------ chart helpers
  function niceTicks(min, max, n = 5) {
    if (min === max) { min -= 1; max += 1; }
    const span = max - min;
    const step0 = Math.pow(10, Math.floor(Math.log10(span / n)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * step0).find((s) => span / s <= n) || step0 * 10;
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));
    return ticks;
  }
  // Rounded data-end (4px) on the side away from the baseline.
  function vbar(x, w, y0, y1, r = 0) {
    const top = Math.min(y0, y1), h = Math.abs(y1 - y0);
    if (h < 0.5) return "";
    r = Math.min(r, h, w / 2);
    if (y1 < y0) // grows up: round top
      return `M${x},${y0}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${y0}Z`;
    return `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 - r}V${y0}Z`;
  }
  function hbar(y, h, x0, x1, r = 0) {
    const w = Math.abs(x1 - x0);
    if (w < 0.5) return "";
    r = Math.min(r, w, h / 2);
    if (x1 > x0)
      return `M${x0},${y}H${x1 - r}Q${x1},${y} ${x1},${y + r}V${y + h - r}Q${x1},${y + h} ${x1 - r},${y + h}H${x0}Z`;
    return `M${x0},${y}H${x1 + r}Q${x1},${y} ${x1},${y + r}V${y + h - r}Q${x1},${y + h} ${x1 + r},${y + h}H${x0}Z`;
  }

  /** Column chart (years) with optional overlay line; single y-axis. */
  function columnChart(el, { labels, series, line, fmtAxis, tipFn, ref, height = 260 }) {
    const W = Math.max(300, el.clientWidth || 560), H = height, ml = 64, mr = 12, mt = 12, mb = 26;
    const all = [0, ...(line ? line.values : []), ...series.flatMap((s) => s.values), ...(ref != null ? [ref] : [])];
    const ticks = niceTicks(Math.min(...all), Math.max(...all));
    const lo = ticks[0], hi = ticks[ticks.length - 1];
    const y = (v) => mt + (H - mt - mb) * (1 - (v - lo) / (hi - lo));
    const n = labels.length, band = (W - ml - mr) / n;
    const groupW = Math.min(band * 0.7, 46), gap = 2, bw = (groupW - gap * (series.length - 1)) / series.length;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
    for (const t of ticks) s += `<line class="gridline" x1="${ml}" x2="${W - mr}" y1="${y(t)}" y2="${y(t)}"/><text x="${ml - 8}" y="${y(t) + 4}" text-anchor="end">${esc(fmtAxis(t))}</text>`;
    labels.forEach((lab, i) => {
      const cx = ml + band * i + band / 2;
      if (n <= 12 || i % 2 === 0) s += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${esc(lab)}</text>`;
      series.forEach((se, k) => {
        const v = se.values[i];
        const color = typeof se.color === "function" ? se.color(v) : se.color;
        s += `<path d="${vbar(cx - groupW / 2 + k * (bw + gap), bw, y(0), y(v))}" fill="${color}"/>`;
      });
    });
    s += `<line class="baseline" x1="${ml}" x2="${W - mr}" y1="${y(0)}" y2="${y(0)}"/>`;
    if (ref != null) s += `<line x1="${ml}" x2="${W - mr}" y1="${y(ref)}" y2="${y(ref)}" stroke="${css("--ink-2")}" stroke-width="1.5" stroke-dasharray="5 4"/><text class="lbl-ink" x="${W - mr}" y="${y(ref) - 6}" text-anchor="end">${esc(S.threshold)} ${esc(fmtAxis(ref))}</text>`;
    if (line) {
      const pts = line.values.map((v, i) => [ml + band * i + band / 2, y(v)]).filter((p, i) => line.values[i] != null && isFinite(line.values[i]));
      s += `<polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${line.color}" stroke-width="2" stroke-linejoin="round"/>`;
      for (const [px, py] of pts) s += `<circle cx="${px}" cy="${py}" r="4" fill="${line.color}" stroke="${css("--surface")}" stroke-width="2"/>`;
      const last = pts[pts.length - 1];
      if (last && line.label) s += `<text class="lbl-ink" x="${last[0]}" y="${last[1] - 10}" text-anchor="end">${esc(line.label)}</text>`;
    }
    labels.forEach((_, i) => { s += `<rect class="hit" data-i="${i}" tabindex="0" x="${ml + band * i}" y="${mt}" width="${band}" height="${H - mt - mb}"/>`; });
    el.innerHTML = s + "</svg>";
    bindTips(el, tipFn);
  }

  /** Horizontal bars, possibly diverging around zero. rows: [{label, value, color, sub}] */
  function barList(el, rows, { fmt, tipFn, labelW = 190 }) {
    const W = Math.max(300, el.clientWidth || 560), rowH = 26, mt = 6, mr = 84, H = mt + rows.length * rowH + 6;
    labelW = Math.min(labelW, W * 0.42);
    const vals = rows.map((r) => r.value);
    const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals) || 1;
    const x = (v) => labelW + (W - labelW - mr - 10) * ((v - lo) / (hi - lo || 1));
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
    s += `<line class="baseline" x1="${x(0)}" x2="${x(0)}" y1="${mt - 2}" y2="${H - 4}"/>`;
    rows.forEach((r, i) => {
      const yy = mt + i * rowH;
      s += `<text class="lbl-ink" x="${labelW - 10}" y="${yy + 16}" text-anchor="end"${r.bold ? ' font-weight="600"' : ""}>${esc(r.label)}</text>`;
      s += `<path d="${hbar(yy + 5, rowH - 10, x(0), x(r.value))}" fill="${r.color}"/>`;
      s += `<text x="${W - 2}" y="${yy + 16}" text-anchor="end" class="lbl-ink"${r.bold ? ' font-weight="600"' : ""}>${esc(fmt(r.value))}</text>`;
      s += `<rect class="hit" data-i="${i}" tabindex="0" x="0" y="${yy}" width="${W}" height="${rowH}"/>`;
    });
    el.innerHTML = s + "</svg>";
    bindTips(el, tipFn);
  }

  function kpis(el, items) {
    el.innerHTML = items.map((k) => `<div class="sim-card kpi"><div class="lbl">${esc(k.lbl)}</div><div class="val">${k.html || esc(k.val)}</div>${k.note ? `<div class="note">${esc(k.note)}</div>` : ""}</div>`).join("");
  }
  // Confidence and status chips use the design system's Badge classes (tint, dark text, mid border).
  const BADGE = { Alta: "success", Media: "warning", Baja: "danger", ok: "success", risk: "danger" };
  const chip = (txt, cls) => `<span class="badge badge--sm badge--pill badge--${BADGE[cls || txt] || "neutral"}">${esc(cls ? txt : tx("confianza", txt))}</span>`;

  // ------------------------------------------------------------------ FINCA
  function renderFinca() {
    const f = M.simularFinca(D, opts());
    const porHa = st.unidad === "ha";
    const u = porHa ? 1 / f.haFinca : 1;       // scale for charts and tables
    const sfx = porHa ? "/ha" : "";
    const fmtE = (x) => eur(x * u) + sfx, fmtS = (x) => signed(x * u) + sfx;
    const otro = (x) => (porHa ? S.forFarm(eur(x), fmtHa(f.haFinca)) : S.perHaOf(eur(x / f.haFinca)));
    kpis($("#finca-kpis"), [
      { lbl: S.kGross, val: fmtE(f.costeBruto), note: S.kGrossNoteU(otro(f.costeBruto)) },
      { lbl: S.kPeak, val: fmtE(f.necesidadPico), note: porHa ? otro(f.necesidadPico) : S.kPeakNoteFarm(eur(f.necesidadPico / f.haFinca), fmtHa(f.haTransicion), fmtHa(f.haFinca)) },
      { lbl: S.kNet, val: (f.netoTotal * u >= 0 ? signed(f.netoTotal * u) : signed(f.netoTotal * u)) + sfx, note: S.kNetNoteU(fmtS(f.van), otro(f.netoTotal)) },
      { lbl: S.kPayback, val: f.payback ? S.yearN(f.payback, M.ANIO_INICIO + f.payback - 1) : S.noPayback, note: S.kPaybackNote },
    ]);
    const anios = f.anios.map((a) => String(a.anio));
    columnChart($("#ch-flujo"), {
      labels: anios,
      series: [{ values: f.anios.map((a) => a.neto * u), color: (v) => (v >= 0 ? css("--pos") : css("--neg")) }],
      line: { values: f.anios.map((a) => a.acumulado * u), color: css("--ink-2"), label: S.cumulativeLbl },
      fmtAxis: (v) => nf0.format(v),
      tipFn: (i) => [anios[i], [[S.tNet, fmtS(f.anios[i].neto)], [S.tCum, fmtS(f.anios[i].acumulado), css("--ink-2")], [S.tAdopt, pct(f.anios[i].adopcion)]]],
    });
    const rows = M.LINEAS.map(([g, k]) => ({ label: S.lines[k], value: f.totales[k] * u, color: f.totales[k] >= 0 ? css("--pos") : css("--neg"), grupo: g }))
      .filter((r) => Math.abs(r.value) > 0.5);
    rows.push({ label: S.netResult, value: f.netoTotal * u, color: css("--ink-2"), bold: true });
    barList($("#ch-cascada"), rows, { fmt: (x) => signed(x) + sfx, labelW: 240, tipFn: (i) => [rows[i].label, [[S.t10, signed(rows[i].value) + sfx]]] });

    // table: one row per category (subtotal) with its detail rows underneath
    const n0 = (v) => nf0.format(Math.round(v) || 0); // no "-0"
    const celdas = (vals, total, bold) =>
      vals.map((v) => `<td class="num${v < -0.5 ? " neg" : ""}">${bold ? "<b>" : ""}${n0(v)}${bold ? "</b>" : ""}</td>`).join("") +
      `<td class="num${total < -0.5 ? " neg" : ""}">${bold ? "<b>" : ""}${n0(total)}${bold ? "</b>" : ""}</td>`;
    const vacio = (vals) => vals.every((v) => Math.abs(v) < 0.5);
    let h = `<table class="desglose"><thead><tr><th>${S.thItemU(st.unidad)}</th>${f.anios.map((a) => `<th class="num">${a.anio}</th>`).join("")}<th class="num">${S.thTotal}</th></tr></thead><tbody>`;
    for (const g of M.GRUPOS) {
      const items = g.lineas ? null : g.modulos ? f.modulos : f.practicas.filter((p) => p.tipo === g.tipo);
      const hijos = g.lineas
        ? g.lineas.map((k) => ({ nombre: S.lines[k], vals: f.anios.map((a) => a.lineas[k] * u), total: f.totales[k] * u }))
        : items.map((p) => ({ nombre: p.nombre, vals: f.anios.map((a) => a.detalle[p.clave] * u), total: f.totDetalle[p.clave] * u }));
      const visibles = hijos.filter((x) => !vacio(x.vals));
      if (!visibles.length) continue;
      const vals = f.anios.map((_, i) => hijos.reduce((s2, x) => s2 + x.vals[i], 0));
      const total = hijos.reduce((s2, x) => s2 + x.total, 0);
      const abierto = st.abiertos.has(g.clave);
      h += `<tr class="grp${abierto ? " is-open" : ""}" data-g="${g.clave}"><th scope="row"><button type="button" class="grp-toggle" aria-expanded="${abierto}" aria-controls="det-${g.clave}">` +
        `<span class="caret caret--right" aria-hidden="true"></span>${esc(S.groups[g.clave].name)}</button><small>${esc(S.groups[g.clave].hint)}</small></th>${celdas(vals, total, true)}</tr>`;
      for (const x of visibles)
        h += `<tr class="sub" data-parent="${g.clave}"${abierto ? "" : " hidden"}><td>${esc(x.nombre)}</td>${celdas(x.vals, x.total, false)}</tr>`;
    }
    h += `<tr><th>${S.rowNet}</th>${f.anios.map((a) => `<td class="num${a.neto < 0 ? " neg" : ""}"><b>${n0(a.neto * u)}</b></td>`).join("")}<td class="num"><b>${n0(f.netoTotal * u)}</b></td></tr>`;
    h += `<tr><th>${S.rowCum}</th>${f.anios.map((a) => `<td class="num${a.acumulado < 0 ? " neg" : ""}">${n0(a.acumulado * u)}</td>`).join("")}<td></td></tr>`;
    h += `</tbody></table>`;
    $("#tb-finca").innerHTML = h;
    $("#tb-finca-nota").innerHTML = `<p class="note-box">${S.baseline(nf0.format(f.base.rendimiento), nf2.format(f.base.precio), eur(f.base.ingreso), eur(f.base.margen))}</p>`;
  }

  // Open / close the breakdown rows. State lives in st.abiertos so it survives re-renders.
  function setupDesglose() {
    $("#tb-finca-tools").innerHTML = `<button type="button" class="text-button" data-desglose="abrir">${esc(S.expandAll)}</button><button type="button" class="text-button" data-desglose="cerrar">${esc(S.collapseAll)}</button>`;
    $("#tb-finca").closest(".sim-card").addEventListener("click", (e) => {
      const todo = e.target.closest("[data-desglose]");
      if (todo) {
        st.abiertos = todo.dataset.desglose === "abrir" ? new Set(M.GRUPOS.map((g) => g.clave)) : new Set();
        renderFinca();
        return;
      }
      const btn = e.target.closest(".grp-toggle");
      if (!btn) return;
      const g = btn.closest("tr").dataset.g;
      const abrir = !st.abiertos.has(g);
      abrir ? st.abiertos.add(g) : st.abiertos.delete(g);
      btn.setAttribute("aria-expanded", String(abrir));
      btn.closest("tr").classList.toggle("is-open", abrir);
      $$(`#tb-finca tr[data-parent="${g}"]`).forEach((r) => (r.hidden = !abrir));
    });
  }

  // ------------------------------------------------------------------ PRECIOS
  // Price and premium sliders for the selected crop. Values become model overrides
  // (they apply to every tab, including the landscape) until "Restablecer".
  const prefijo = () => D.arquetipos.find((a) => a.clave === st.arquetipo).prefijo;
  const LONJA = { "alm.precio": "comuna", "alm.precio_eco": "ecologica" };
  function clavesPrecio() {
    const c = prefijo();
    return [c + ".precio", P[c + ".precio_eco"] ? c + ".precio_eco" : c + ".prima_eco", "g.prima_regen"].filter((k) => P[k]);
  }
  const etiqueta = (k) =>
    k.endsWith(".precio") ? S.pConv(P[k].unidad)
    : k.endsWith(".precio_eco") ? S.pEco(P[k].unidad)
    : k.endsWith(".prima_eco") ? S.pPremEco
    : S.pRegen;
  const esPct = (k) => P[k].unidad.startsWith("%");
  const fmtK = (k, v) => (esPct(k) ? pct(v) : nf2.format(v) + " €");
  const valorActual = (k) => (k in st.overrides ? st.overrides[k] : M.valorDe(P[k], st.conjunto));
  function referencia(k) {
    const r = P[k];
    if (LONJA[k] && precios) {
      const serie = precios.campanas.map((x) => x[LONJA[k]]);
      const a = precios.actual;
      return S.refLonja(precios.campanas[0].campana, precios.campanas[precios.campanas.length - 1].campana,
        nf2.format(Math.min(...serie)), nf2.format(Math.max(...serie)), nf2.format(r.central), a.semana, a.anio, nf2.format(a[LONJA[k]])) +
        ` <button type="button" data-actual="${esc(k)}">${esc(S.useCurrent)}</button>`;
    }
    if (k === "g.prima_regen") return esc(S.refRegen);
    return esc(S.refRange(fmtK(k, r.bajo), fmtK(k, r.alto), tx("confianza", r.confianza || "").toLowerCase()));
  }
  function construirPrecios() {
    $("#precio-sliders").innerHTML = clavesPrecio().map((k) => {
      const r = P[k], v = valorActual(k);
      const extra = LONJA[k] && precios ? [precios.actual[LONJA[k]]] : [];
      const lo = esPct(k) ? 0 : Math.floor(Math.min(r.bajo, v, ...extra) * 0.6 * 10) / 10;
      const hi = esPct(k) ? Math.max(0.15, r.alto * 1.5) : Math.ceil(Math.max(r.alto, v, ...extra) * 1.35 * 10) / 10;
      const step = esPct(k) ? 0.005 : 0.05;
      const ticks = [r.bajo, r.central, r.alto, ...extra].map((t) => `<option value="${t}"></option>`).join("");
      return `<label class="slider${k in st.overrides ? " is-ajustado" : ""}" data-k="${esc(k)}"><span>${esc(etiqueta(k))} <b>${esc(fmtK(k, v))}</b></span>` +
        `<input type="range" min="${lo}" max="${hi}" step="${step}" value="${v}" list="dl-${esc(k)}"><datalist id="dl-${esc(k)}">${ticks}</datalist>` +
        `<span class="ref">${referencia(k)}</span></label>`;
    }).join("");
    actualizarReset();
    resumenPrecios();
  }
  function actualizarReset() {
    $("#precio-reset").disabled = !clavesPrecio().some((k) => k in st.overrides) && !st.pse && !modulosCultivo().some((m) => st.div[m.clave]);
  }
  // Payments for ecosystem services: €/ha/year, not a Notion parameter. Shown in the
  // diversification row, as another source of income on the hectares in transition.
  function htmlPse() {
    const ref = refPse();
    return `<label class="slider${st.pse ? " is-ajustado" : ""}" data-k="pse"><span>${esc(S.pPse)} <b>${esc(nf0.format(st.pse) + " €")}</b></span>` +
      `<input type="range" min="0" max="150" step="5" value="${st.pse}" list="dl-pse"><datalist id="dl-pse"><option value="0"></option><option value="${ref}"></option></datalist>` +
      `<span class="ref">${esc(S.refPse(nf0.format(ref)))}</span></label>`;
  }
  function refPse() {
    const c = prefijo(), g = (k) => (P[k] ? P[k].central : 0);
    return Math.round(g(c + ".carbono") * g("g.precio_co2") * (1 - g("g.carbono_descuento")));
  }
  function resumenPrecios() {
    const k = clavesPrecio();
    const corto = (x) => (x.endsWith(".precio") ? S.sConv : x.endsWith(".precio_eco") ? S.sEco : x.endsWith(".prima_eco") ? S.sPremEco : S.sRegen);
    const partes = k.map((x) => `${esc(corto(x))} <b>${esc(fmtK(x, valorActual(x)))}</b>`);
    // Diversification as one figure: ecosystem-service payments + modules (net of their
    // costs and investment), average per year over the 10 years, per ha in transition.
    const f = M.simularFinca(D, opts());
    const div = f.haTransicion > 0 ? (f.totales.carbono + f.totales.diversificacion) / M.ANIOS / f.haTransicion : 0;
    partes.push(`<span title="${esc(S.sDivTip)}">${esc(S.sDiv)} <b>${esc((Math.abs(div) >= 0.5 ? "≈" : "") + signed(div).replace(/^\+/, "") + "/ha/" + S.yr)}</b></span>`);
    const arq = D.arquetipos.find((a) => a.clave === st.arquetipo);
    $("#precios-resumen").innerHTML = S.sum(esc(tx("cultivos", arq.cultivo)), partes);
    $("#precios-resumen").title = $("#precios-resumen").textContent;
  }
  function abrirPrecios(abrir) {
    st.preciosAbierto = abrir;
    $("#precios-toggle").setAttribute("aria-expanded", String(abrir));
    $("#precios-body").hidden = !abrir;
    const acc = $("#precios-accion");
    acc.textContent = abrir ? acc.dataset.close : acc.dataset.open;
  }
  function fijar(k, v) {
    if (k === "pse") {
      st.pse = v;
      const lab = $('#div-sliders [data-k="pse"]');
      lab.classList.toggle("is-ajustado", v !== 0);
      lab.querySelector("b").textContent = nf0.format(v) + " €";
      $("#precio-reset").disabled = false;
      resumenPrecios();
      render();
      return;
    }
    st.overrides[k] = v;
    const lab = $(`#precio-sliders [data-k="${k}"]`);
    if (lab) { lab.classList.add("is-ajustado"); lab.querySelector("b").textContent = fmtK(k, v); lab.querySelector("input").value = v; }
    $("#precio-reset").disabled = false;
    resumenPrecios();
    render();
  }
  function setupPrecios() {
    const cont = $("#precio-sliders");
    cont.addEventListener("input", (e) => {
      const lab = e.target.closest("[data-k]");
      if (lab && e.target.type === "range") fijar(lab.dataset.k, +e.target.value);
    });
    cont.addEventListener("click", (e) => {
      const b = e.target.closest("[data-actual]");
      if (b) { e.preventDefault(); fijar(b.dataset.actual, precios.actual[LONJA[b.dataset.actual]]); }
    });
    $("#precio-reset").addEventListener("click", () => {
      for (const k of clavesPrecio()) delete st.overrides[k];
      st.pse = 0;
      st.div = {};
      construirPrecios(); construirDiv(); render();
    });
    $("#precios-toggle").addEventListener("click", () => abrirPrecios(!st.preciosAbierto));
    construirPrecios();
    abrirPrecios(false);
  }
  function renderLonja() {
    if (!precios || !$("#tb-lonja")) return;
    const a = precios.actual;
    let h = `<table><thead><tr><th>${esc(S.thSeason)}</th><th class="num">${esc(S.thComuna)}</th><th class="num">${esc(S.thEco)}</th><th class="num">${esc(S.thEcoDiff)}</th></tr></thead><tbody>`;
    for (const c of precios.campanas)
      h += `<tr><td>${esc(c.campana)}</td><td class="num">${nf2.format(c.comuna)}</td><td class="num">${nf2.format(c.ecologica)}</td><td class="num">+${pct(c.ecologica / c.comuna - 1)}</td></tr>`;
    h += `<tr><th>${esc(S.currentWeek(a.semana, a.anio))}</th><td class="num"><b>${nf2.format(a.comuna)}</b></td><td class="num"><b>${nf2.format(a.ecologica)}</b></td><td class="num">+${pct(a.ecologica / a.comuna - 1)}</td></tr>`;
    h += `</tbody></table>`;
    $("#tb-lonja-nota").innerHTML = `<p class="sim-card__sub" style="margin:var(--space-3) 0 0">${esc(S.sources)}: ${precios.fuentes.map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nombre)}</a>`).join(" · ")}. ${esc(S.currentSrc)}: <a href="${esc(a.url)}" target="_blank" rel="noopener">CARM</a>.</p>`;
    $("#tb-lonja").innerHTML = h;
  }

  // ------------------------------------------------------------------ DIVERSIFICACIÓN
  const modulosCultivo = () => {
    const cult = D.arquetipos.find((a) => a.clave === st.arquetipo).cultivo;
    return (D.diversificacion || []).filter((m) => m.cultivos.includes(cult));
  };
  const tripleC = (arr) => arr[1];
  const nombreModulo = (m) => m.nombre.split(" (")[0];
  function refModulo(m) {
    const ah = m.ahorro_cubierta || tripleC(m.ahorro_enmiendas) ? S.divAhorro(pct(m.ahorro_cubierta || 0), tripleC(m.ahorro_enmiendas) ? pct(tripleC(m.ahorro_enmiendas)) : "") : "";
    const rd = tripleC(m.efecto_rendimiento) ? S.divRend(pct(tripleC(m.efecto_rendimiento))) : "";
    return esc(S.divRef(nf0.format(tripleC(m.inversion)), nf0.format(tripleC(m.coste)), nf0.format(tripleC(m.ingreso)), m.anio_ingreso, ah, rd, tx("confianza", m.confianza || "").toLowerCase())) +
      (m.url ? ` <a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.fuente.split(" — ")[0].split(" (")[0])}</a>` : "");
  }
  function construirDiv() {
    const mods = modulosCultivo();
    $("#div-sliders").innerHTML = htmlPse() + mods.map((m) => {
      const v = st.div[m.clave] || 0;
      return `<label class="slider${v ? " is-ajustado" : ""}" data-m="${esc(m.clave)}"><span>${esc(nombreModulo(m))} <b>${esc(pct(v))}</b></span>` +
        `<input type="range" min="0" max="1" step="0.05" value="${v}"><span class="ref">${refModulo(m)}</span></label>`;
    }).join("") + (mods.length ? "" : `<p class="sim-card__sub sim-div-vacio">${esc(S.divNone)}</p>`);
    actualizarReset();
    resumenPrecios();
  }
  function setupDiv() {
    $("#div-sliders").addEventListener("input", (e) => {
      if (e.target.type !== "range") return;
      const pse = e.target.closest('[data-k="pse"]');
      if (pse) return fijar("pse", +e.target.value);
      const lab = e.target.closest("[data-m]");
      if (!lab) return;
      const v = +e.target.value;
      st.div[lab.dataset.m] = v;
      lab.classList.toggle("is-ajustado", v > 0);
      lab.querySelector("b").textContent = pct(v);
      actualizarReset(); resumenPrecios(); render();
    });
    construirDiv();
  }

  // ------------------------------------------------------------------ CREDITO
  const credDefs = [
    ["pct", S.pctFin, 0, 1, 0.05, pct],
    ["tipo", S.rate, 0.01, 0.1, 0.0025, (v) => nf2.format(v * 100) + "%"],
    ["plazo", S.term, 3, 15, 1, (v) => S.years(v)],
    ["carencia", S.grace, 0, 4, 1, (v) => S.years(v)],
  ];
  function sliderHTML(id, label, min, max, step, value, fmt) {
    return `<label class="slider"><span>${esc(label)} <b id="${id}-v">${esc(fmt(value))}</b></span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
  }
  function setupCredito() {
    const v = (k) => M.valorDe(P[k], "central");
    const defaults = { pct: v("g.cred_pct"), tipo: v("g.cred_tipo"), plazo: v("g.cred_plazo"), carencia: v("g.cred_carencia") };
    st.credito = { ...defaults };
    let h = credDefs.map(([k, l, mi, ma, stp, fmt]) => sliderHTML("cr-" + k, l, mi, ma, stp, defaults[k], fmt)).join("");
    $("#cred-sliders").innerHTML = h;
    for (const [k, , , , , fmt] of credDefs) {
      $("#cr-" + k).addEventListener("input", (e) => { st.credito[k] = +e.target.value; $("#cr-" + k + "-v").textContent = fmt(+e.target.value); render(); });
    }
  }
  // Farm size and hectares in transition (filter bar); defaults to the crop's typical farm.
  function syncTam() {
    const f = D.arquetipos.find((a) => a.clave === st.arquetipo);
    st.haFinca = M.valorDe(P[f.prefijo + ".tam"], "central");
    st.haT = st.haFinca;
    pintarHa();
  }
  function pintarHa() {
    $("#f-ha").value = st.haFinca;
    $("#f-hat").value = st.haT;
    $("#f-hat").max = st.haFinca;
  }
  function setupHa() {
    const num = (el) => { const x = parseFloat(String(el.value).replace(",", ".")); return Number.isFinite(x) ? x : null; };
    $("#f-ha").addEventListener("change", (e) => {
      const x = num(e.target);
      if (x === null || x <= 0) return pintarHa();
      const todo = st.haT === st.haFinca;
      st.haFinca = x;
      st.haT = todo ? x : Math.min(st.haT, x);
      pintarHa(); render();
    });
    $("#f-hat").addEventListener("change", (e) => {
      const x = num(e.target);
      if (x === null) return pintarHa();
      st.haT = Math.min(st.haFinca, Math.max(0, x));
      pintarHa(); render();
    });
  }
  function renderCredito() {
    const o = opts();
    const f = M.simularFinca(D, o);
    const c = M.simularCredito(D, f, o, st.credito);
    const ok = c.dscrMin != null && c.dscrMin >= c.umbral;
    kpis($("#cred-kpis"), [
      { lbl: S.cLoan, val: eur(c.principal), note: S.cLoanNote2(eur(f.necesidadPico), pct(c.condiciones.pct)) },
      { lbl: S.cPay, val: eur(c.cuota), note: `${eur(c.cuota / c.tam)}/ha` },
      { lbl: S.cDscr, html: c.dscrMin == null ? "—" : `${esc(nf2.format(c.dscrMin))}× ${chip(ok ? S.meets : S.notMeets, ok ? "ok" : "risk")}`, note: S.cThresh(nf2.format(c.umbral)) },
      { lbl: S.cMargin, val: eur(f.base.margen * c.tam), note: S.cMarginNote(eur(f.base.margen)) },
    ]);
    const anios = c.anios.map((a) => String(a.anio));
    const dscr = c.anios.map((a) => (a.dscr == null ? null : a.dscr));
    const dvals = dscr.filter((x) => x != null);
    if (dvals.length) {
      columnChart($("#ch-dscr"), {
        labels: anios, series: [], ref: c.umbral,
        line: { values: dscr.map((x) => (x == null ? NaN : x)), color: css("--s1") },
        fmtAxis: (v) => nf1.format(v) + "×",
        tipFn: (i) => [anios[i], [["DSCR", dscr[i] == null ? S.noPay : nf2.format(dscr[i]) + "×", css("--s1")]]],
      });
    } else $("#ch-dscr").innerHTML = `<p class="sub">${S.noDebt}</p>`;
    columnChart($("#ch-cfads"), {
      labels: anios,
      series: [{ values: c.anios.map((a) => a.cfads), color: css("--s1") }, { values: c.anios.map((a) => a.servicio), color: css("--s2") }],
      fmtAxis: (v) => nf0.format(v / 1000) + "k",
      tipFn: (i) => [anios[i], [[S.tCash, eur(c.anios[i].cfads), css("--s1")], [S.tDebt, eur(c.anios[i].servicio), css("--s2")], [S.tBalance, eur(c.anios[i].saldo)]]],
    });
    let aviso = "";
    if (f.base.margen <= 0) aviso = `<p class="note-box">${S.warnNeg}</p>`;
    else if (!ok) aviso = `<p class="note-box">${S.warnLow}</p>`;
    $("#cred-aviso").innerHTML = aviso;
  }

  // ------------------------------------------------------------------ PAISAJE
  function setupPaisaje() {
    const ad = M.valorDe(P["g.adopcion_paisaje"], "central");
    st.adopcion = ad;
    let h = sliderHTML("pa-ad", S.uptake, 0.05, 0.6, 0.05, ad, pct);
    for (const [c, l] of [["alm", S.almond], ["oli", S.olive], ["cer", S.cereal], ["pis", S.pistachio]]) {
      const v = M.valorDe(P[c + ".sup"], "central");
      st.superficies[c] = v;
      h += sliderHTML("pa-" + c, l, 0, c === "pis" ? 20000 : 150000, c === "pis" ? 500 : 5000, v, (x) => nf0.format(x));
    }
    $("#pai-sliders").innerHTML = h;
    $("#pa-ad").addEventListener("input", (e) => { st.adopcion = +e.target.value; $("#pa-ad-v").textContent = pct(st.adopcion); render(); });
    for (const c of ["alm", "oli", "cer", "pis"])
      $("#pa-" + c).addEventListener("input", (e) => { st.superficies[c] = +e.target.value; $("#pa-" + c + "-v").textContent = nf0.format(+e.target.value); render(); });
  }
  function renderPaisaje() {
    const p = M.simularPaisaje(D, { ...opts(), adopcion: st.adopcion, superficies: st.superficies, credito: st.credito });
    kpis($("#pai-kpis"), [
      { lbl: S.lHa, val: S.ha(nf0.format(p.ha)), note: S.lFarms(nf0.format(p.fincas)) },
      { lbl: S.lGross, val: eurM(p.bruto), note: S.lGrossNote },
      { lbl: S.lNeed, val: eurM(p.capital), note: S.lNeedNote },
      { lbl: S.lDemand, val: eurM(p.deuda), note: S.lDemandNote(pct(st.credito.pct ?? 0.8)) },
    ]);
    const rows = p.arquetipos.map((r) => ({ label: an(r.clave, r.nombre), value: r.capital, color: css("--s1"), r }));
    barList($("#ch-pai-arq"), rows, {
      fmt: eurM, labelW: 230,
      tipFn: (i) => [rows[i].label, [[S.tNeed, eurM(rows[i].r.capital)], [S.tHa, nf0.format(rows[i].r.ha)], ["€/ha", eur(rows[i].r.porHa)]]],
    });
    const anios = p.anual.map((_, i) => String(M.ANIO_INICIO + i));
    let acc = 0; const acum = p.anual.map((v) => (acc += v));
    columnChart($("#ch-pai-flujo"), {
      labels: anios,
      series: [{ values: p.anual, color: (v) => (v >= 0 ? css("--pos") : css("--neg")) }],
      line: { values: acum, color: css("--ink-2"), label: S.cumulativeLbl },
      fmtAxis: (v) => nf0.format(v / 1e6),
      tipFn: (i) => [anios[i], [[S.tNet, eurM(p.anual[i])], [S.tCum, eurM(acum[i]), css("--ink-2")]]],
    });
    let h = `<table><thead><tr><th>${S.thFarm}</th><th class="num">${S.thHectares}</th><th class="num">${S.thFarms}</th><th class="num">${S.thNeedHa}</th><th class="num">${S.thNeedTotal}</th><th class="num">${S.thNpv}</th><th class="num">${S.thRecovery}</th></tr></thead><tbody>`;
    for (const r of p.arquetipos) h += `<tr><td>${esc(an(r.clave, r.nombre))}</td><td class="num">${nf0.format(r.ha)}</td><td class="num">${nf0.format(r.fincas)}</td><td class="num">${nf0.format(r.porHa)}</td><td class="num">${eurM(r.capital)}</td><td class="num${r.van < 0 ? " neg" : ""}">${nf0.format(r.van)}</td><td class="num">${r.payback ? S.yearShort(r.payback) : S.over10}</td></tr>`;
    h += `<tr><th>${S.total}</th><td class="num"><b>${nf0.format(p.ha)}</b></td><td class="num"><b>${nf0.format(p.fincas)}</b></td><td></td><td class="num"><b>${eurM(p.capital)}</b></td><td></td><td></td></tr></tbody></table>`;
    $("#tb-paisaje").innerHTML = h;
    $("#tb-paisaje-nota").innerHTML = `<p class="note-box">${S.landNote}</p>`;
  }

  // ------------------------------------------------------------------ SENSIBILIDAD
  let ultimoTornado = null;
  function renderSensibilidad() {
    const t = M.tornado(D, opts(), (f) => f.van / f.haFinca); // €/ha of farm, as the axis says
    ultimoTornado = t;
    const filas = t.filas.slice(0, 14);
    const el = $("#ch-tornado");
    const W = Math.max(300, el.clientWidth || 560), labelW = Math.min(300, W * 0.42), mr = 16, rowH = 32, mt = 6, H = mt + filas.length * rowH + 22;
    const ext = Math.max(1, ...filas.flatMap((r) => [Math.abs(r.bajo), Math.abs(r.alto)]));
    const x = (v) => labelW + (W - labelW - mr) * (0.5 + v / (2 * ext));
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
    s += `<line class="baseline" x1="${x(0)}" x2="${x(0)}" y1="${mt}" y2="${H - 20}"/>`;
    s += `<text x="${x(-ext)}" y="${H - 4}">${esc(signed(-ext))}</text><text x="${x(ext)}" y="${H - 4}" text-anchor="end">${esc(signed(ext))}</text><text x="${x(0)}" y="${H - 4}" text-anchor="middle">${S.npv} ${esc(eur(t.base))}/ha</text>`;
    filas.forEach((r, i) => {
      const yy = mt + i * rowH;
      const maxc = Math.floor(labelW / 6.2);
      s += `<text class="lbl-ink" x="${labelW - 10}" y="${yy + 14}" text-anchor="end">${esc((() => { const n = nm(r); return n.length > maxc ? n.slice(0, maxc - 1) + "…" : n; })())}</text>`;
      s += `<text x="${labelW - 10}" y="${yy + 26}" text-anchor="end">${esc(S.confidence(tx("confianza", r.confianza || "").toLowerCase()))}</text>`;
      for (const v of [r.bajo, r.alto]) s += `<path d="${hbar(yy + 6, rowH - 12, x(0), x(v))}" fill="${v >= 0 ? css("--pos") : css("--neg")}"/>`;
      s += `<rect class="hit" data-i="${i}" tabindex="0" x="0" y="${yy}" width="${W}" height="${rowH}"/>`;
    });
    $("#ch-tornado").innerHTML = s + "</svg>";
    const irDesde = (e) => { const h = e.target.closest("[data-i]"); if (h) irA(filas[+h.dataset.i].clave); };
    $("#ch-tornado").onclick = irDesde;
    $("#ch-tornado").onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); irDesde(e); } };
    bindTips($("#ch-tornado"), (i) => {
      const r = filas[i];
      const src = P[r.clave] || D.practicas.find((p) => p.clave === r.clave) || {};
      return [nm(r), [[S.withLow(fmtValor(src.bajo, src.unidad)), signed(r.bajo)], [S.withHigh(fmtValor(src.alto, src.unidad)), signed(r.alto)], [S.tConf, r.confianza ? tx("confianza", r.confianza) : "—"]]];
    });
  }

  // ------------------------------------------------------------------ SUPUESTOS
  function srcCell(r) {
    const name = esc(r.fuente);
    const link = r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${name}</a>` : name;
    return link;
  }
  // One grouped table for every assumption: parameters, practices and diversification.
  const ORDEN_CAT = ["Superficie", "Rendimiento", "Precio", "Coste base", "PAC", "Prácticas regenerativas", "Servicios técnicos",
    "Inversiones iniciales", "Diversificación", "Adopción", "Carbono", "Crédito"];
  const CAT_PRACTICA = { Recurrente: "Prácticas regenerativas", Servicio: "Servicios técnicos", CAPEX: "Inversiones iniciales" };
  const CRED = { "g.cred_pct": "pct", "g.cred_tipo": "tipo", "g.cred_plazo": "plazo", "g.cred_carencia": "carencia" };
  const catNombre = (c) => (lang === "en" ? S.supCats[c] || c : c);
  const igual = (a, b) => Math.abs(a - b) < 1e-9;

  function enUsoParametro(r) {
    const k = r.clave, central = M.valorDe(r, "central");
    if (CRED[k]) { const v = st.credito[CRED[k]] ?? central; return { v, aj: !igual(v, central) }; }
    if (k === "g.adopcion_paisaje") return { v: st.adopcion, aj: !igual(st.adopcion, central) };
    if (/\.sup$/.test(k)) { const v = st.superficies[k.split(".")[0]] ?? central; return { v, aj: !igual(v, central) }; }
    if (k === prefijo() + ".tam") return { v: st.haFinca, aj: !igual(st.haFinca, central) };
    if (k in st.overrides) return { v: st.overrides[k], aj: true };
    return { v: M.valorDe(r, st.conjunto), aj: false };
  }
  function filasSupuestos() {
    const arq = D.arquetipos.find((x) => x.clave === st.arquetipo);
    const enFinca = st.alcance === "finca";
    const lbOk = (lb) => !enFinca || !lb || lb === "Todas" || lb === arq.linea_base;
    const filas = [];
    for (const r of D.parametros) {
      if (enFinca && !(r.cultivo === "Todos" || r.cultivo === arq.cultivo)) continue;
      if (!lbOk(r.linea_base)) continue;
      const u = enUsoParametro(r);
      filas.push({ cat: r.categoria, clave: r.clave, nombre: nm(r), detalle: r.clave, enUso: fmtValor(u.v, r.unidad), aj: u.aj,
        rango: `${fmtValor(r.bajo, r.unidad)}–${fmtValor(r.alto, r.unidad)}`, unidad: tx("unidades", r.unidad), fuente: r, confianza: r.confianza });
    }
    for (const p of D.practicas) {
      if (enFinca && !p.cultivos.includes(arq.cultivo)) continue;
      if (!lbOk(p.linea_base)) continue;
      const aj = p.clave in st.overrides;
      const v = aj ? st.overrides[p.clave] : st.conjunto === "optimista" ? p.bajo : st.conjunto === "pesimista" ? p.alto : p.central;
      filas.push({ cat: CAT_PRACTICA[p.tipo] || p.tipo, clave: p.clave, nombre: nm(p), detalle: S.pracDetail(pct(p.cobertura), S.everyN(p.frecuencia), p.anios),
        enUso: nf0.format(v), aj, rango: `${nf0.format(p.bajo)}–${nf0.format(p.alto)}`, unidad: "€/ha", fuente: p, confianza: p.confianza });
    }
    filas.push({ cat: "Diversificación", clave: "pse", nombre: S.pseRow, detalle: "", enUso: nf0.format(st.pse), aj: st.pse > 0,
      rango: S.pseRange(nf0.format(refPse())), unidad: S.perHaYr, fuente: { fuente: "—" }, confianza: "Baja" });
    for (const m of D.diversificacion || []) {
      if (enFinca && !m.cultivos.includes(arq.cultivo)) continue;
      const sh = st.div[m.clave] || 0;
      const r3 = (x) => `${nf0.format(x[0])}–${nf0.format(x[2])}`;
      filas.push({ cat: "Diversificación", clave: m.clave, nombre: m.nombre, detalle: m.clave, enUso: sh ? S.inUseShare(pct(sh)) : S.notActive, aj: sh > 0,
        rango: S.modRange(r3(m.inversion), r3(m.coste), r3(m.ingreso)), unidad: "", fuente: m, confianza: m.confianza });
    }
    const conf = $("#s-conf").value, q = $("#s-q").value.trim().toLowerCase();
    return filas.filter((f) => (!conf || f.confianza === conf) &&
      (!q || [f.nombre, f.clave, f.detalle, f.fuente.fuente].join(" ").toLowerCase().includes(q)));
  }
  function renderTodos() {
    const filas = filasSupuestos();
    const cats = [...new Set(filas.map((f) => f.cat))].sort((a, b) => (ORDEN_CAT.indexOf(a) + 99) % 99 - (ORDEN_CAT.indexOf(b) + 99) % 99);
    const ncol = 6;
    let h = `<table class="desglose"><thead><tr><th>${esc(S.thParam)}</th><th class="num">${esc(S.thInUse)}</th><th class="num">${esc(S.thRange)}</th><th>${esc(S.thUnit)}</th><th>${esc(S.thSource)}</th><th>${esc(S.thConf)}</th></tr></thead><tbody>`;
    for (const c of cats) {
      const abierto = !st.supCerradas.has(c);
      const de = filas.filter((f) => f.cat === c);
      h += `<tr class="grp${abierto ? " is-open" : ""}" data-g="${esc(c)}"><th scope="row" colspan="${ncol}"><button type="button" class="grp-toggle" aria-expanded="${abierto}">` +
        `<span class="caret caret--right" aria-hidden="true"></span>${esc(catNombre(c))} <span class="grp-n">${de.length}</span></button></th></tr>`;
      for (const f of de)
        h += `<tr class="sub" data-parent="${esc(c)}" id="sup-${esc(f.clave)}"${abierto ? "" : " hidden"}><td>${esc(f.nombre)}${f.detalle ? `<small>${esc(f.detalle)}</small>` : ""}</td>` +
          `<td class="num"><b>${esc(f.enUso)}</b>${f.aj ? `<span class="badge badge--sm badge--pill badge--info">${esc(S.adjusted)}</span>` : ""}</td>` +
          `<td class="num">${esc(f.rango)}</td><td>${esc(f.unidad)}</td><td>${srcCell(f.fuente)}</td><td>${chip(f.confianza)}</td></tr>`;
    }
    $("#tb-sup").innerHTML = h + "</tbody></table>";
  }
  function renderTrayectorias() {
    let h = `<table><thead><tr><th>${S.thCurve}</th>${Array.from({ length: 10 }, (_, i) => `<th class="num">${M.ANIO_INICIO + i}</th>`).join("")}<th>${S.thConf}</th></tr></thead><tbody>`;
    for (const r of D.trayectorias.filter((t) => t.escenario === st.escenario))
      h += `<tr><td>${esc(nm(r))}</td>${r.valores.map((v) => `<td class="num${v < 0 ? " neg" : ""}">${pct(v)}</td>`).join("")}<td>${chip(r.confianza)}</td></tr>`;
    $("#tb-tray").innerHTML = h + "</tbody></table>";
  }
  function irSub(sub) {
    st.sub = sub;
    $$("#subtabs [data-sub]").forEach((b) => { const on = b.dataset.sub === sub; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
    $$("[data-sub-panel]").forEach((p) => { p.hidden = p.dataset.subPanel !== sub; });
    render();
  }
  // From a sensitivity bar to its row in "Todos los supuestos", highlighted.
  function irA(clave) {
    st.alcance = "finca";
    $$("#s-alcance [data-v]").forEach((b) => { b.classList.toggle("is-active", b.dataset.v === "finca"); b.setAttribute("aria-pressed", String(b.dataset.v === "finca")); });
    $("#s-conf").value = ""; $("#s-q").value = "";
    irSub("todos");
    const fila = document.querySelector(`[id="sup-${clave}"]`);
    if (!fila) return;
    st.supCerradas.delete(fila.dataset.parent);
    renderTodos();
    const f2 = document.querySelector(`[id="sup-${clave}"]`);
    f2.scrollIntoView({ block: "center" });
    f2.classList.add("is-flash");
    setTimeout(() => f2.classList.remove("is-flash"), 1800);
  }
  function setupSupuestos() {
    $$("#subtabs [data-sub]").forEach((b) => b.addEventListener("click", () => irSub(b.dataset.sub)));
    $$("#s-alcance [data-v]").forEach((b) => b.addEventListener("click", () => {
      st.alcance = b.dataset.v;
      $$("#s-alcance [data-v]").forEach((x) => { x.classList.toggle("is-active", x === b); x.setAttribute("aria-pressed", String(x === b)); });
      renderTodos();
    }));
    for (const id of ["#s-conf", "#s-q"]) $(id).addEventListener("input", renderTodos);
    $("#tb-sup-tools").innerHTML = `<button type="button" class="text-button" data-desglose="abrir">${esc(S.expandAll)}</button><button type="button" class="text-button" data-desglose="cerrar">${esc(S.collapseAll)}</button>`;
    $("#tb-sup").closest(".sim-card").addEventListener("click", (e) => {
      const todo = e.target.closest("[data-desglose]");
      if (todo) {
        st.supCerradas = todo.dataset.desglose === "abrir" ? new Set() : new Set(ORDEN_CAT);
        return renderTodos();
      }
      const btn = e.target.closest(".grp-toggle");
      if (!btn) return;
      const g = btn.closest("tr").dataset.g;
      const abrir = st.supCerradas.has(g);
      abrir ? st.supCerradas.delete(g) : st.supCerradas.add(g);
      btn.setAttribute("aria-expanded", String(abrir));
      btn.closest("tr").classList.toggle("is-open", abrir);
      $$(`#tb-sup tr[data-parent="${CSS.escape(g)}"]`).forEach((r) => (r.hidden = !abrir));
    });
  }

  // ------------------------------------------------------------------ wiring
  function render() {
    try {
      resumenPrecios(); // the diversification figure depends on every control
      if (st.tab === "finca") renderFinca();
      else if (st.tab === "credito") renderCredito();
      else if (st.tab === "paisaje") renderPaisaje();
      else if (st.tab === "supuestos") {
        if (st.sub === "pesa") renderSensibilidad();
        else if (st.sub === "todos") renderTodos();
        else { renderLonja(); renderTrayectorias(); }
      }
    } catch (e) { console.error(e); }
  }
  function seg(id, key, parse) {
    $$(id + " button").forEach((b) => b.addEventListener("click", () => {
      $$(id + " button").forEach((x) => { x.setAttribute("aria-pressed", String(x === b)); x.classList.toggle("is-active", x === b); });
      st[key] = parse(b.dataset.v); render();
    }));
  }
  function init() {
    $("#meta").textContent = S.meta(String(D.meta.generado).slice(0, 10), D.parametros.length, D.practicas.length) +
      (precios ? S.metaLonja(precios.actual.semana, precios.actual.anio) : "");
    // "Finca tipo" is a crop plus a starting management (convencional / ecológico). The model keeps one
    // archetype key; the two selects compose it. Names read "<crop> — <state>" in both languages.
    const partes = D.arquetipos.map((a) => { const [cul, est] = an(a.clave, a.nombre).split(" — "); return { clave: a.clave, pref: a.prefijo, base: a.linea_base, cul, est: est || a.linea_base }; });
    const cultivos = [...new Map(partes.map((p) => [p.pref, p.cul])).entries()];
    const estados = [...new Map(partes.map((p) => [p.base, p.est.charAt(0).toUpperCase() + p.est.slice(1)])).entries()];
    const actual = () => partes.find((p) => p.clave === st.arquetipo);
    const pintarArq = () => {
      const c = actual();
      $("#f-cul").innerHTML = cultivos.map(([k, l]) => `<option value="${esc(k)}"${k === c.pref ? " selected" : ""}>${esc(l)}</option>`).join("");
      // a combination that does not exist (e.g. organic pistachio) is disabled
      $("#f-est").innerHTML = estados.map(([k, l]) => `<option value="${esc(k)}"${k === c.base ? " selected" : ""}${partes.some((p) => p.pref === c.pref && p.base === k) ? "" : " disabled"}>${esc(l)}</option>`).join("");
    };
    const elegirArq = (pref, base) => {
      const p = partes.find((x) => x.pref === pref && x.base === base) || partes.find((x) => x.pref === pref);
      st.arquetipo = p.clave; pintarArq(); syncTam(); construirPrecios(); construirDiv(); render();
    };
    pintarArq();
    $("#f-esc").innerHTML = Object.entries(D.meta.escenarios).map(([k, v]) => `<option value="${esc(k)}">${esc(lang === "en" && TRANSLATE_NOTION_DATA ? EN.escenarios[k] || v : v)}</option>`).join("");
    $("#f-cul").addEventListener("change", (e) => elegirArq(e.target.value, actual().base));
    $("#f-est").addEventListener("change", (e) => elegirArq(actual().pref, e.target.value));
    $("#f-esc").addEventListener("change", (e) => { st.escenario = e.target.value; render(); });
    seg("#f-conj", "conjunto", String);
    $$("#f-conj button").forEach((b) => b.addEventListener("click", construirPrecios));
    seg("#f-pac", "pac", Number);
    $$("#tabs button").forEach((b) => b.addEventListener("click", () => {
      st.tab = b.dataset.tab;
      $$("#tabs button").forEach((x) => { x.setAttribute("aria-selected", String(x === b)); x.classList.toggle("is-active", x === b); });
      $$("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== st.tab; });
      render();
    }));
    setupCredito(); syncTam(); setupHa(); setupPaisaje(); setupSupuestos(); setupPrecios(); setupDiv(); setupDesglose();
    $$(".sim-unidad [data-u]").forEach((b) => b.addEventListener("click", () => {
      st.unidad = b.dataset.u;
      $$(".sim-unidad [data-u]").forEach((x) => { x.classList.toggle("is-active", x === b); x.setAttribute("aria-pressed", String(x === b)); });
      render();
    }));
    const hash = location.hash.slice(1);
    const tb = hash && $(`#tabs button[data-tab="${hash === "sensibilidad" ? "supuestos" : hash}"]`);
    if (tb) tb.click(); else render();
    let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(render, 150); });
    window.addEventListener("hashchange", () => { const b = $(`#tabs button[data-tab="${location.hash.slice(1)}"]`); if (b) b.click(); });
  }
  init();
}
