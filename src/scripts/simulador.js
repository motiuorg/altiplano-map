// Simulador económico — panel interactivo. Lógica portada del panel del vault
// (Altiplano Estepario/8 Análisis Económico/simulador/app.js) a los tokens del sitio.
import { STR } from "./simulador-strings.js";
import EN from "../data/simulador-en.json";

// Off for now: Notion data (names, units, types, confidence) is shown as written.
const TRANSLATE_NOTION_DATA = false;

export function iniciarSimulador(D, M, langCode) {
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
    primaRegen: false, carbono: false, tab: "finca",
    credito: {}, tam: null, adopcion: null, superficies: {},
  };
  const P = Object.fromEntries(D.parametros.map((r) => [r.clave, r]));
  const opts = () => ({
    arquetipo: st.arquetipo, escenario: st.escenario, conjunto: st.conjunto, pac: st.pac,
    primaRegen: st.primaRegen, carbono: st.carbono,
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
  const BADGE = { Alta: "badge--success", Media: "badge--flow", Baja: "badge--danger", ok: "badge--success", risk: "badge--danger" };
  const chip = (txt, cls) => `<span class="badge ${BADGE[cls || txt] || "badge--paper"}">${esc(cls ? txt : tx("confianza", txt))}</span>`;

  // ------------------------------------------------------------------ FINCA
  function renderFinca() {
    const f = M.simularFinca(D, opts());
    const tam = st.tam || f.tam;
    kpis($("#finca-kpis"), [
      { lbl: S.kGross, val: eur(f.costeBruto) + "/ha", note: S.kGrossNote },
      { lbl: S.kPeak, val: eur(f.necesidadPico) + "/ha", note: S.kPeakNote(eur(f.necesidadPico * tam), nf0.format(tam)) },
      { lbl: S.kNet, val: signed(f.netoTotal) + "/ha", note: S.kNetNote(signed(f.van)) },
      { lbl: S.kPayback, val: f.payback ? S.yearN(f.payback, M.ANIO_INICIO + f.payback - 1) : S.noPayback, note: S.kPaybackNote },
    ]);
    const anios = f.anios.map((a) => String(a.anio));
    columnChart($("#ch-flujo"), {
      labels: anios,
      series: [{ values: f.anios.map((a) => a.neto), color: (v) => (v >= 0 ? css("--pos") : css("--neg")) }],
      line: { values: f.anios.map((a) => a.acumulado), color: css("--ink-2"), label: S.cumulativeLbl },
      fmtAxis: (v) => nf0.format(v),
      tipFn: (i) => [anios[i], [[S.tNet, signed(f.anios[i].neto)], [S.tCum, signed(f.anios[i].acumulado), css("--ink-2")], [S.tAdopt, pct(f.anios[i].adopcion)]]],
    });
    const rows = M.LINEAS.map(([g, k]) => ({ label: S.lines[k], value: f.totales[k], color: f.totales[k] >= 0 ? css("--pos") : css("--neg"), grupo: g }))
      .filter((r) => Math.abs(r.value) > 0.5);
    rows.push({ label: S.netResult, value: f.netoTotal, color: css("--ink-2"), bold: true });
    barList($("#ch-cascada"), rows, { fmt: signed, tipFn: (i) => [rows[i].label, [[S.t10, signed(rows[i].value)]]] });

    // table
    let h = `<table><thead><tr><th>${S.thItem}</th>${f.anios.map((a) => `<th class="num">${a.anio}</th>`).join("")}<th class="num">${S.thTotal}</th></tr></thead><tbody>`;
    for (const [, k] of M.LINEAS) {
      if (f.anios.every((a) => Math.abs(a.lineas[k]) < 0.5)) continue;
      h += `<tr><td>${esc(S.lines[k])}</td>${f.anios.map((a) => `<td class="num${a.lineas[k] < 0 ? " neg" : ""}">${nf0.format(a.lineas[k])}</td>`).join("")}<td class="num${f.totales[k] < 0 ? " neg" : ""}">${nf0.format(f.totales[k])}</td></tr>`;
    }
    h += `<tr><th>${S.rowNet}</th>${f.anios.map((a) => `<td class="num${a.neto < 0 ? " neg" : ""}"><b>${nf0.format(a.neto)}</b></td>`).join("")}<td class="num"><b>${nf0.format(f.netoTotal)}</b></td></tr>`;
    h += `<tr><th>${S.rowCum}</th>${f.anios.map((a) => `<td class="num${a.acumulado < 0 ? " neg" : ""}">${nf0.format(a.acumulado)}</td>`).join("")}<td></td></tr>`;
    h += `</tbody></table><p class="note-box">${S.baseline(nf0.format(f.base.rendimiento), nf2.format(f.base.precio), eur(f.base.ingreso), eur(f.base.margen))}</p>`;
    $("#tb-finca").innerHTML = h;
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
    h += sliderHTML("cr-tam", S.farmSize, 1, 100, 1, 10, (x) => S.ha(x));
    $("#cred-sliders").innerHTML = h;
    for (const [k, , , , , fmt] of credDefs) {
      $("#cr-" + k).addEventListener("input", (e) => { st.credito[k] = +e.target.value; $("#cr-" + k + "-v").textContent = fmt(+e.target.value); render(); });
    }
    $("#cr-tam").addEventListener("input", (e) => { st.tam = +e.target.value; $("#cr-tam-v").textContent = S.ha(e.target.value); render(); });
  }
  function syncTam() {
    // default the farm-size slider to the archetype's typical size
    const f = D.arquetipos.find((a) => a.clave === st.arquetipo);
    const tam = M.valorDe(P[f.prefijo + ".tam"], "central");
    st.tam = tam; $("#cr-tam").value = tam; $("#cr-tam-v").textContent = S.ha(tam);
  }
  function renderCredito() {
    const o = opts();
    const f = M.simularFinca(D, o);
    const c = M.simularCredito(D, f, { ...o, overrides: { tam: st.tam } }, st.credito);
    const ok = c.dscrMin != null && c.dscrMin >= c.umbral;
    kpis($("#cred-kpis"), [
      { lbl: S.cLoan, val: eur(c.principal), note: S.cLoanNote(nf0.format(c.tam), eur(f.necesidadPico), pct(c.condiciones.pct)) },
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
    h += `<p class="note-box">${S.landNote}</p>`;
    $("#tb-paisaje").innerHTML = h;
  }

  // ------------------------------------------------------------------ SENSIBILIDAD
  let ultimoTornado = null;
  function renderSensibilidad() {
    const t = M.tornado(D, opts());
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
  function setupSupuestos() {
    const cultivos = ["", ...new Set(D.parametros.map((r) => r.cultivo))];
    $("#s-cultivo").innerHTML = cultivos.map((c) => `<option value="${esc(c)}">${esc(c ? tx("cultivos", c) : S.anyCrop)}</option>`).join("");
    for (const id of ["#s-cultivo", "#s-conf", "#s-q"]) $(id).addEventListener("input", renderSupuestos);
  }
  function renderSupuestos() {
    const cul = $("#s-cultivo").value, conf = $("#s-conf").value, q = $("#s-q").value.toLowerCase();
    const match = (r) => (!cul || r.cultivo === cul || (r.cultivos || []).includes(cul)) && (!conf || r.confianza === conf) &&
      (!q || JSON.stringify(r).toLowerCase().includes(q));
    let h = `<table><thead><tr><th>${S.thParam}</th><th class="num">${S.thLow}</th><th class="num">${S.thCentral}</th><th class="num">${S.thHigh}</th><th>${S.thUnit}</th><th>${S.thSource}</th><th>${S.thType}</th><th>${S.thConf}</th></tr></thead><tbody>`;
    for (const r of D.parametros.filter(match))
      h += `<tr><td>${esc(nm(r))}<small>${esc(r.clave)}</small></td><td class="num">${fmtValor(r.bajo, r.unidad)}</td><td class="num"><b>${fmtValor(r.central, r.unidad)}</b></td><td class="num">${fmtValor(r.alto, r.unidad)}</td><td>${esc(tx("unidades", r.unidad))}</td><td>${srcCell(r)}</td><td>${esc(tx("tipos", r.tipo))}</td><td>${chip(r.confianza)}</td></tr>`;
    $("#tb-param").innerHTML = h + "</tbody></table>";
    h = `<table><thead><tr><th>${S.thPractice}</th><th>${S.thType}</th><th>${S.thCrops}</th><th class="num">${S.thLow}</th><th class="num">${S.thCentral}</th><th class="num">${S.thHigh}</th><th class="num">${S.thCoverage}</th><th class="num">${S.thEvery}</th><th>${S.thYears}</th><th>${S.thSource}</th><th>${S.thConf}</th></tr></thead><tbody>`;
    for (const r of D.practicas.filter(match))
      h += `<tr><td>${esc(nm(r))}<small>${esc(r.clave)}</small></td><td>${esc(tx("tipos", r.tipo))}</td><td>${esc(r.cultivos.map((c) => tx("cultivos", c)).join(", "))}${r.linea_base !== "Todas" ? `<small>${esc(S.onlyBase(tx("cultivos", r.linea_base).toLowerCase()))}</small>` : ""}</td><td class="num">${nf0.format(r.bajo)}</td><td class="num"><b>${nf0.format(r.central)}</b></td><td class="num">${nf0.format(r.alto)}</td><td class="num">${pct(r.cobertura)}</td><td class="num">${S.everyN(r.frecuencia)}</td><td>${esc(r.anios)}</td><td>${srcCell(r)}</td><td>${chip(r.confianza)}</td></tr>`;
    $("#tb-prac").innerHTML = h + "</tbody></table>";
    h = `<table><thead><tr><th>${S.thCurve}</th>${Array.from({ length: 10 }, (_, i) => `<th class="num">${M.ANIO_INICIO + i}</th>`).join("")}<th>${S.thConf}</th></tr></thead><tbody>`;
    for (const r of D.trayectorias.filter((t) => t.escenario === st.escenario))
      h += `<tr><td>${esc(nm(r))}</td>${r.valores.map((v) => `<td class="num${v < 0 ? " neg" : ""}">${pct(v)}</td>`).join("")}<td>${chip(r.confianza)}</td></tr>`;
    $("#tb-tray").innerHTML = h + "</tbody></table>";
  }

  // ------------------------------------------------------------------ wiring
  function render() {
    try {
      if (st.tab === "finca") renderFinca();
      else if (st.tab === "credito") renderCredito();
      else if (st.tab === "paisaje") renderPaisaje();
      else if (st.tab === "sensibilidad") renderSensibilidad();
      else if (st.tab === "supuestos") renderSupuestos();
    } catch (e) { console.error(e); }
  }
  function seg(id, key, parse) {
    $$(id + " button").forEach((b) => b.addEventListener("click", () => {
      $$(id + " button").forEach((x) => { x.setAttribute("aria-pressed", String(x === b)); x.classList.toggle("is-active", x === b); });
      st[key] = parse(b.dataset.v); render();
    }));
  }
  function init() {
    $("#meta").textContent = S.meta(String(D.meta.generado).slice(0, 10), D.parametros.length, D.practicas.length);
    $("#f-arq").innerHTML = D.arquetipos.map((a) => `<option value="${esc(a.clave)}">${esc(an(a.clave, a.nombre))}</option>`).join("");
    $("#f-esc").innerHTML = Object.entries(D.meta.escenarios).map(([k, v]) => `<option value="${esc(k)}">${esc(lang === "en" && TRANSLATE_NOTION_DATA ? EN.escenarios[k] || v : v)}</option>`).join("");
    $("#f-arq").addEventListener("change", (e) => { st.arquetipo = e.target.value; syncTam(); render(); });
    $("#f-esc").addEventListener("change", (e) => { st.escenario = e.target.value; render(); });
    seg("#f-conj", "conjunto", String);
    seg("#f-pac", "pac", Number);
    $("#f-prima").addEventListener("change", (e) => { st.primaRegen = e.target.checked; render(); });
    $("#f-carb").addEventListener("change", (e) => { st.carbono = e.target.checked; render(); });
    $$("#tabs button").forEach((b) => b.addEventListener("click", () => {
      st.tab = b.dataset.tab;
      $$("#tabs button").forEach((x) => { x.setAttribute("aria-selected", String(x === b)); x.classList.toggle("is-active", x === b); });
      $$("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== st.tab; });
      render();
    }));
    setupCredito(); syncTam(); setupPaisaje(); setupSupuestos();
    const hash = location.hash.slice(1);
    const tb = hash && $(`#tabs button[data-tab="${hash}"]`);
    if (tb) tb.click(); else render();
    let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(render, 150); });
    window.addEventListener("hashchange", () => { const b = $(`#tabs button[data-tab="${location.hash.slice(1)}"]`); if (b) b.click(); });
  }
  init();
}
