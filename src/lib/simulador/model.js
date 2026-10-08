// Copia del motor de cálculo del vault (Altiplano Estepario/8 Análisis Económico/simulador/model.js).
// Si se cambia la lógica, cambiarla en ambos sitios y correr los tests del vault.
/*
 * Modelo de coste de transición — Altiplano Estepario.
 *
 * Pure calculation engine (no DOM): 10-year partial budget per farm type, plus a
 * debt module and a landscape module. Loaded as a classic script in the browser (window.Modelo) and
 * via require/import in node tests (globalThis.Modelo).
 *
 * All flows are € per hectare per year relative to the farm's current baseline
 * ("delta"), except the baseline margin used for debt service coverage.
 */
(function (root) {
  "use strict";

  const ANIOS = 10;
  const ANIO_INICIO = 2027;

  const LINEAS = [
    // [group, key, label] — order defines the waterfall / table order
    ["ingreso", "rendimiento", "Cambio de rendimiento"],
    ["ingreso", "prima_eco", "Prima ecológica (conv. certificada)"],
    ["ingreso", "prima_regen", "Sobreprecio regenerativo"],
    ["ingreso", "ecorregimen", "Ecorrégimen PAC"],
    ["ingreso", "ayuda_eco", "Ayuda agricultura ecológica (PAC)"],
    ["ingreso", "carbono", "Pagos por servicios ecosistémicos"],
    ["ingreso", "diversificacion", "Diversificación"],
    ["ahorro", "fertilizacion", "Fertilización sustituida"],
    ["ahorro", "fitosanitarios", "Menos fitosanitarios"],
    ["ahorro", "laboreo", "Menos laboreo y combustible"],
    ["coste", "practicas", "Prácticas recurrentes"],
    ["coste", "servicios", "Servicios técnicos"],
    ["coste", "capex", "Inversiones iniciales"],
    ["perdida", "reserva", "Superficie para biodiversidad"],
  ];

  // Categories for the year-by-year breakdown. A category either groups model lines
  // or lists each practice of one type (detail per practice, from simularFinca).
  const GRUPOS = [
    { clave: "produccion", lineas: ["rendimiento", "reserva", "prima_eco", "prima_regen"] },
    { clave: "ayudas", lineas: ["ecorregimen", "ayuda_eco", "carbono"] },
    { clave: "ahorro", lineas: ["fertilizacion", "fitosanitarios", "laboreo"] },
    { clave: "practicas", linea: "practicas", tipo: "Recurrente" },
    { clave: "servicios", linea: "servicios", tipo: "Servicio" },
    { clave: "capex", linea: "capex", tipo: "CAPEX" },
    { clave: "diversificacion", linea: "diversificacion", modulos: true },
  ];

  // ------------------------------------------------------------------ helpers
  function rango(anios) {
    // "1-3" -> [1,2,3]; "1" -> [1]
    const [a, b] = String(anios).split("-").map(Number);
    const out = [];
    for (let y = a; y <= (b || a); y++) out.push(y);
    return out;
  }

  function indexar(datos) {
    if (datos._idx) return datos._idx;
    const p = {};
    for (const r of datos.parametros) p[r.clave] = r;
    const t = {};
    for (const r of datos.trayectorias) (t[r.escenario] = t[r.escenario] || {})[r.clave] = r.valores;
    const a = {};
    for (const r of datos.arquetipos) a[r.clave] = r;
    Object.defineProperty(datos, "_idx", { value: { p, t, a }, enumerable: false });
    return datos._idx;
  }

  // Pick low/central/high for a parameter according to the assumption set.
  function valorDe(r, conjunto) {
    if (conjunto === "central" || !r.sentido) return r.central;
    const favorable = r.sentido > 0 ? r.alto : r.bajo;
    const desfavorable = r.sentido > 0 ? r.bajo : r.alto;
    return conjunto === "optimista" ? favorable : desfavorable;
  }

  function lector(datos, opts) {
    const { p } = indexar(datos);
    const conjunto = opts.conjunto || "central";
    const ov = opts.overrides || {};
    return function (clave, defecto) {
      if (clave in ov) return ov[clave];
      const r = p[clave];
      if (!r) {
        if (defecto !== undefined) return defecto;
        throw new Error("Parámetro no encontrado: " + clave);
      }
      return valorDe(r, conjunto);
    };
  }

  // Practice cost uses the same set logic (costs: higher = worse).
  function costePractica(pr, conjunto, ov) {
    if (pr.clave in ov) return ov[pr.clave];
    if (conjunto === "optimista") return pr.bajo;
    if (conjunto === "pesimista") return pr.alto;
    return pr.central;
  }

  // ------------------------------------------------------------------ farm
  // Pick low/central/high from a [bajo, central, alto] triple; sentido +1 when a
  // higher value is better for the farm (income, savings), -1 when worse (costs).
  function triple(arr, conjunto, sentido) {
    if (!Array.isArray(arr)) return arr || 0;
    if (conjunto === "optimista") return sentido > 0 ? arr[2] : arr[0];
    if (conjunto === "pesimista") return sentido > 0 ? arr[0] : arr[2];
    return arr[1];
  }

  /**
   * One typical farm, years 2027–2036. All flows are € per FARM per year,
   * relative to carrying on as today.
   *
   * opts: { arquetipo,
   *         tipo: "certificada" | "mejora"   (legacy: escenario "completa" | "mejora"),
   *         haFinca, haTransicion            (default: the crop's typical size, all of it),
   *         conjunto: central|pesimista|optimista, pac: 0..1,
   *         primaRegen: bool, pse: €/ha/year, carbono: bool,
   *         diversificacion: { [module key]: share 0..1 of the hectares in transition },
   *         overrides: {clave: valor} }
   *
   * Per-hectare effects scale with the hectares in transition. The "per farm"
   * share of a practice (field `fijo`, e.g. half of plan design and certification)
   * is paid once per farm, sized at the crop's typical farm, as soon as any
   * hectare is in transition.
   */
  function simularFinca(datos, opts) {
    const { t, a } = indexar(datos);
    const arq = a[opts.arquetipo];
    if (!arq) throw new Error("Arquetipo no encontrado: " + opts.arquetipo);
    const tipo = opts.tipo || (opts.escenario === "mejora" ? "mejora" : "certificada");
    const esc = tipo === "mejora" ? "mejora" : "completa";
    const tr = t[esc];
    if (!tr) throw new Error("Trayectorias no encontradas: " + esc);
    const v = lector(datos, opts);
    const conjunto = opts.conjunto || "central";
    const ov = opts.overrides || {};
    const pac = opts.pac === undefined ? 1 : opts.pac;
    const c = arq.prefijo;
    const conv = arq.linea_base === "Convencional";
    const lb = conv ? "conv" : "eco";
    const certificada = tipo === "certificada";

    const tamTipo = v(c + ".tam");
    const haFinca = Math.max(0.1, opts.haFinca != null ? opts.haFinca : tamTipo);
    const haT = Math.min(haFinca, Math.max(0, opts.haTransicion != null ? opts.haTransicion : haFinca));
    const hayTransicion = haT > 0;

    // Prices: crops with a market series for organic (almond) carry their own
    // organic price; the rest derive it from the conventional price + % premium.
    const precioConv = v(c + ".precio");
    const precioEco = v(c + ".precio_eco", null) ?? precioConv * (1 + v(c + ".prima_eco"));

    // Baseline (per ha, whole farm)
    const rend0 = v(c + ".rend") * (conv ? 1 : v(c + ".rend_eco"));
    const precio0 = conv ? precioConv : precioEco;
    const ingreso0 = rend0 * precio0;
    const margenBase = ingreso0 + v(c + ".pago_basico") - v(c + ".coste_caja." + lb);

    const reserva = certificada ? v("g.reserva_biodiv") : 0;
    const yaEco = v("g.ya_ecorreg." + lb);
    const previas = v("g.previas." + lb);
    const descuentoC = v("g.carbono_descuento");
    const capexFactor = Math.max(...tr.adopcion);

    const practicas = datos.practicas.filter(
      (pr) => pr.cultivos.includes(arq.cultivo) &&
        (pr.linea_base === "Todas" || pr.linea_base === arq.linea_base) &&
        (certificada ? true : pr.mejora) &&
        (!pr.solo_completa || certificada)
    );
    const cuotas = opts.diversificacion || {};
    const modulos = (datos.diversificacion || []).filter((m) => m.cultivos.includes(arq.cultivo) && (cuotas[m.clave] || 0) > 0);
    const esCubierta = (k) => /^p\.(cubierta_esp|abono_verde|rotacion_leg)$/.test(k);
    const esEnmienda = (k) => /^p\.enmiendas/.test(k);

    const anios = [];
    for (let i = 0; i < ANIOS; i++) {
      const y = i + 1;
      const A = tr.adopcion[i];
      const dRend = tr["rend." + lb][i];
      const s = reserva * A; // share of land set aside this year
      const prodFactor = (1 + dRend) * (1 - s);
      const L = {}; // € per hectare in transition

      L.rendimiento = ingreso0 * dRend * (1 - s);
      L.reserva = -ingreso0 * s;
      L.prima_eco = conv ? rend0 * prodFactor * (precioEco - precioConv) * tr.certificado[i] : 0;
      // Regenerative premium: % over the organic price, paid only with certificate
      // (trajectory prima_regen.conv / prima_regen.eco).
      const certRegen = (tr["prima_regen." + lb] || tr.prima_regen || [])[i] || 0;
      L.prima_regen = opts.primaRegen ? rend0 * prodFactor * precioEco * v("g.prima_regen") * certRegen : 0;
      L.ecorregimen = v(c + ".ecorreg") * (1 - yaEco) * A * pac;
      L.ayuda_eco = conv ? v(c + ".ayuda_eco") * tr.conversion[i] * pac : 0;
      // Payments for ecosystem services (carbon, water…), from year 3 on adopted area.
      L.carbono = y < 3 ? 0
        : opts.pse != null ? opts.pse * A
        : opts.carbono ? v(c + ".carbono") * v("g.precio_co2") * (1 - descuentoC) * A
        : 0;

      L.fertilizacion = v(c + ".fert." + lb) * tr.insumos[i];
      L.fitosanitarios = conv ? v(c + ".fito.conv") * v("g.red_fito") * A : 0;
      L.laboreo = v(c + ".laboreo") * v("g.red_laboreo") * A;

      // Practices: € per ha in transition, split into a per-ha part and a per-farm part.
      const porHa = {}, porFinca = {};
      let cubierta = 0, enmiendas = 0;
      for (const pr of practicas) {
        const coste = costePractica(pr, conjunto, ov) * pr.cobertura;
        let x = 0;
        if (pr.tipo === "Recurrente") x = (coste / pr.frecuencia) * A * (1 - previas);
        else {
          const ys = rango(pr.anios);
          if (ys.includes(y)) x = pr.tipo === "CAPEX" ? (coste * capexFactor) / ys.length : coste * (ys.length === 1 ? 1 : Math.max(A, 0.5));
        }
        const fijo = pr.fijo || 0;
        porHa[pr.clave] = -x * (1 - fijo);
        porFinca[pr.clave] = -x * fijo * tamTipo;
        if (esCubierta(pr.clave)) cubierta += x;
        if (esEnmienda(pr.clave)) enmiendas += x;
      }

      // Diversification modules on a share of the hectares in transition.
      const divHa = {};
      let invDivHa = 0; // module set-up cost: financed like the other investments
      L.diversificacion = 0;
      for (const m of modulos) {
        const cuota = Math.min(1, Math.max(0, cuotas[m.clave]));
        let x = -triple(m.coste, conjunto, -1);
        if (y === 1) { const inv = triple(m.inversion, conjunto, -1); x -= inv; invDivHa += inv * Math.min(1, Math.max(0, cuotas[m.clave])); }
        if (y >= m.anio_ingreso) {
          x += triple(m.ingreso, conjunto, 1);
          x += ingreso0 * prodFactor * triple(m.efecto_rendimiento, conjunto, 1);
        }
        x += cubierta * (m.ahorro_cubierta || 0) + enmiendas * triple(m.ahorro_enmiendas, conjunto, 1);
        divHa[m.clave] = x * cuota;
        L.diversificacion += x * cuota;
      }

      // Scale to the farm.
      const F = {};
      for (const [, k] of LINEAS) F[k] = (L[k] || 0) * haT;
      const detalle = {};
      F.practicas = F.servicios = F.capex = 0;
      for (const pr of practicas) {
        const val = hayTransicion ? porHa[pr.clave] * haT + porFinca[pr.clave] : 0;
        detalle[pr.clave] = val;
        if (pr.tipo === "Recurrente") F.practicas += val;
        else if (pr.tipo === "CAPEX") F.capex += val;
        else F.servicios += val;
      }
      for (const m of modulos) detalle[m.clave] = divHa[m.clave] * haT;

      let neto = 0;
      for (const [, k] of LINEAS) neto += F[k];
      anios.push({ anio: ANIO_INICIO + i, n: y, lineas: F, detalle, neto, adopcion: A, inversionDiv: -invDivHa * haT });
    }

    let acum = 0, minAcum = 0, payback = null, van = 0;
    const r = v("g.tasa_descuento");
    anios.forEach((a, i) => {
      acum += a.neto;
      a.acumulado = acum;
      minAcum = Math.min(minAcum, acum);
      van += a.neto / Math.pow(1 + r, i + 1);
    });
    // payback: first year after which the cumulative stays >= 0
    for (let i = 0; hayTransicion && i < anios.length; i++) {
      if (anios.slice(i).every((a) => a.acumulado >= 0)) { payback = anios[i].n; break; }
    }

    const tot = {};
    for (const [, k] of LINEAS) tot[k] = anios.reduce((s, a) => s + a.lineas[k], 0);
    const totDetalle = {};
    for (const k of [...practicas.map((p) => p.clave), ...modulos.map((m) => m.clave)])
      totDetalle[k] = anios.reduce((s, a) => s + a.detalle[k], 0);
    const costeBruto = -(tot.practicas + tot.servicios + tot.capex + Math.min(0, tot.rendimiento) + tot.reserva);

    return {
      arquetipo: arq, tipo, escenario: esc, anios, totales: tot, totDetalle, practicas, modulos,
      netoTotal: acum, van, payback, necesidadPico: -minAcum, costeBruto,
      base: { rendimiento: rend0, precio: precio0, ingreso: ingreso0, margen: margenBase },
      haFinca, haTransicion: haT, tamTipo, tam: haFinca,
    };
  }

  // ------------------------------------------------------------------ debt module
  /**
   * Loan sized to the farm's peak cumulative funding need.
   * credito: { pct, tipo, plazo, carencia } (falls back to g.cred_* parameters)
   */
  function simularCredito(datos, finca, opts, credito) {
    const v = lector(datos, opts);
    const cr = Object.assign({
      pct: v("g.cred_pct"), tipo: v("g.cred_tipo"),
      plazo: v("g.cred_plazo"), carencia: v("g.cred_carencia"),
    }, credito || {});
    const principal = finca.necesidadPico * cr.pct;
    const nAmort = Math.max(1, cr.plazo - cr.carencia);
    const i = cr.tipo;
    const cuota = i > 0 ? principal * i / (1 - Math.pow(1 + i, -nAmort)) : principal / nAmort;

    let saldo = principal;
    const anios = finca.anios.map((a, k) => {
      const y = k + 1;
      let servicio = 0, intereses = 0, amort = 0;
      if (y <= cr.plazo && saldo > 1e-6) {
        intereses = saldo * i;
        if (y <= cr.carencia) servicio = intereses;
        else { servicio = cuota; amort = cuota - intereses; saldo -= amort; }
      }
      // Cash available for debt service: the whole farm's current margin plus the
      // operating effect of the transition (financed investment and the year-1
      // services are added back).
      const operativo = a.neto - a.lineas.capex - (a.inversionDiv || 0) - (y === 1 ? a.lineas.servicios : 0);
      const cfads = finca.base.margen * finca.haFinca + operativo;
      return {
        anio: a.anio, n: y, servicio, intereses, amortizacion: amort, saldo, cfads,
        dscr: servicio > 0 ? cfads / servicio : null,
      };
    });
    const dscrs = anios.map((a) => a.dscr).filter((d) => d !== null);
    return {
      condiciones: cr, principal, cuota, tam: finca.haFinca, anios,
      dscrMin: dscrs.length ? Math.min(...dscrs) : null,
      umbral: v("g.dscr_umbral"),
    };
  }

  // ------------------------------------------------------------------ landscape module
  // Each participating farm is a typical farm of its crop, fully in transition.
  function simularPaisaje(datos, opts) {
    const { a } = indexar(datos);
    const v = lector(datos, opts);
    const U = opts.adopcion !== undefined ? opts.adopcion : v("g.adopcion_paisaje");
    const pct = (opts.credito && opts.credito.pct) || v("g.cred_pct");
    const res = { arquetipos: [], anual: new Array(ANIOS).fill(0), capital: 0, deuda: 0, bruto: 0, ha: 0, fincas: 0 };
    for (const clave of Object.keys(a)) {
      const arq = a[clave];
      const c = arq.prefijo;
      const cuota = arq.linea_base === "Convencional" ? v("g.cuota_conv") : v("g.cuota_eco");
      const supCultivo = (opts.superficies && opts.superficies[c]) || v(c + ".sup");
      // Pistachio is modelled as a single conventional archetype for its whole area.
      const haBase = c === "pis" ? supCultivo : supCultivo * cuota;
      const ha = haBase * U;
      const f = simularFinca(datos, Object.assign({}, opts, { arquetipo: clave, haFinca: undefined, haTransicion: undefined }));
      const k = 1 / f.haFinca; // per hectare
      const porAnio = ha / ANIOS; // cohorts enter evenly over the horizon
      // Landscape cash flow: convolution of cohort curves (truncated at horizon)
      for (let t0 = 0; t0 < ANIOS; t0++) {
        for (let j = 0; t0 + j < ANIOS; j++) res.anual[t0 + j] += porAnio * f.anios[j].neto * k;
      }
      const capital = ha * f.necesidadPico * k;
      const fila = {
        clave, nombre: arq.nombre, cultivo: arq.cultivo, ha, capital, deuda: capital * pct, bruto: ha * f.costeBruto * k,
        fincas: ha / f.haFinca, porHa: f.necesidadPico * k, van: f.van * k, payback: f.payback,
      };
      res.arquetipos.push(fila);
      res.capital += fila.capital;
      res.deuda += fila.deuda;
      res.bruto += fila.bruto;
      res.ha += ha;
      res.fincas += fila.fincas;
    }
    return res;
  }

  // ------------------------------------------------------------------ sensitivity
  function tornado(datos, opts, metrica) {
    const { p } = indexar(datos);
    const m = metrica || ((f) => f.van);
    const base = m(simularFinca(datos, opts));
    const arq = indexar(datos).a[opts.arquetipo];
    const out = [];
    const relevantes = Object.values(p).filter((r) =>
      r.bajo !== r.alto && (r.clave.startsWith("g.") || r.clave.startsWith(arq.prefijo + ".")) &&
      !r.clave.startsWith("g.cred") && r.clave !== "g.adopcion_paisaje" &&
      !/\.(sup|tam|pago_basico|coste_caja)/.test(r.clave));
    for (const r of relevantes) {
      const lo = m(simularFinca(datos, Object.assign({}, opts, { overrides: Object.assign({}, opts.overrides, { [r.clave]: r.bajo }) })));
      const hi = m(simularFinca(datos, Object.assign({}, opts, { overrides: Object.assign({}, opts.overrides, { [r.clave]: r.alto }) })));
      out.push({ clave: r.clave, nombre: r.nombre, confianza: r.confianza, bajo: lo - base, alto: hi - base, rango: Math.abs(hi - lo) });
    }
    for (const pr of datos.practicas) {
      if (!pr.cultivos.includes(arq.cultivo) || pr.bajo === pr.alto) continue;
      const lo = m(simularFinca(datos, Object.assign({}, opts, { overrides: Object.assign({}, opts.overrides, { [pr.clave]: pr.bajo }) })));
      const hi = m(simularFinca(datos, Object.assign({}, opts, { overrides: Object.assign({}, opts.overrides, { [pr.clave]: pr.alto }) })));
      out.push({ clave: pr.clave, nombre: pr.nombre, confianza: pr.confianza, bajo: lo - base, alto: hi - base, rango: Math.abs(hi - lo) });
    }
    return { base, filas: out.filter((r) => r.rango > 0.5).sort((x, y) => y.rango - x.rango) };
  }

  root.Modelo = { ANIOS, ANIO_INICIO, LINEAS, GRUPOS, simularFinca, simularCredito, simularPaisaje, tornado, valorDe };
})(typeof globalThis !== "undefined" ? globalThis : this);

export default globalThis.Modelo;
