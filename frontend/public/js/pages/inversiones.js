// ============================================================
// MÓDULO DE INVERSIONES AVANZADO — TOO-EASY
// Reemplaza: frontend/public/js/pages/inversiones.js
//
// Mejoras implementadas:
//  1. Simulación Monte Carlo (n iteraciones con distribución normal)
//  2. Correlaciones entre activos (matriz de Cholesky)
//  3. Escenarios de mercado (Bull, Base, Bear, Crisis)
//  4. Métricas profesionales: Sharpe ratio, drawdown máximo, VaR 95%
//  5. Perfil de riesgo dinámico con recomendaciones
//  6. Múltiples percentiles de proyección (p10, p50, p90)
//  7. Periodos de recuperación estimados
//  8. Inflación integrada en todos los cálculos
// ============================================================

import { protectRoute, getAuthData, logout } from '../modules/auth.js';
import { alertaExito, alertaError, alertaInfo, alertaAdvertencia, alertaConfirmacion } from '../modules/alerts.js';
import { INSTRUMENTOS, INSTRUMENTOS_LISTA, RIESGO_META, COLORES_LINEA } from '../data/instrumentos.js';
import { initOnboarding, restartOnboarding } from '../modules/onboarding.js';

const API = '/api';
const MONTE_CARLO_ITERATIONS = 500;

// ── Estado global ─────────────────────────────────────────────────────────────
const state = {
    userId: null,
    config: {
        nombre: '',
        capitalInicial: 100000,
        plazoAnios: 10,
        aportacionMensual: 0,
        numInversiones: 1,
        inflacion: 4.50,
        perfilRiesgo: 'moderado',   // conservador | moderado | agresivo
        escenario: 'base'           // bull | base | bear | crisis
    },
    instrumentosSeleccionados: [],
    resultados: null,
    historial: [],
    compareSeleccion: new Set(),
    chartInstance: null,
    compareChartInstance: null,
    monteCarloChart: null,
    wizardStep: 1,
    simulacionGuardada: false,
    mktLiveCount: 0,
    mktLastUpdated: null,
    mktIsStale: false
};

// ── Factores por escenario de mercado ─────────────────────────────────────────
const ESCENARIO_FACTORES = {
    bull:   { nombre: 'Bull Market (+)',   tasaAdj: 0.04,  volAdj: 0.7,  color: '#1a9c5b' },
    base:   { nombre: 'Mercado base',      tasaAdj: 0.00,  volAdj: 1.0,  color: '#185FA5' },
    bear:   { nombre: 'Bear Market (−)',   tasaAdj: -0.03, volAdj: 1.4,  color: '#BA7517' },
    crisis: { nombre: 'Crisis financiera', tasaAdj: -0.08, volAdj: 2.2,  color: '#A32D2D' }
};

// ── Multiplicadores de retorno por perfil de riesgo ───────────────────────────
const PERFIL_AJUSTE = {
    conservador: { tasaMult: 0.85, volMult: 0.70 },
    moderado:    { tasaMult: 1.00, volMult: 1.00 },
    agresivo:    { tasaMult: 1.15, volMult: 1.30 }
};

// ── Matriz de correlaciones entre activos (simplificada por categoría) ─────────
// Los activos del mismo "grupo" tienen correlación alta; grupos distintos, baja o negativa
function getCorrelacion(instr1, instr2) {
    const grupos = {
        cetes: 'govBond', bonddia: 'govBond', udibonos: 'govBond',
        pagare: 'bankDebt', sofipos: 'bankDebt',
        sp500: 'globalEquity', tech_stocks: 'globalEquity',
        acciones_div: 'localEquity', fibras: 'realEstate',
        crowdfunding: 'realEstate', fondos_mixtos: 'mixed',
        bitcoin: 'crypto', ethereum: 'crypto',
        p2p: 'altDebt', startups: 'venture'
    };

    const matrizCorr = {
        'govBond-govBond': 0.95, 'govBond-bankDebt': 0.60, 'govBond-globalEquity': -0.10,
        'govBond-localEquity': 0.05, 'govBond-realEstate': 0.15, 'govBond-mixed': 0.30,
        'govBond-crypto': -0.05, 'govBond-altDebt': 0.20, 'govBond-venture': -0.10,
        'bankDebt-bankDebt': 0.90, 'bankDebt-globalEquity': 0.05, 'bankDebt-localEquity': 0.10,
        'bankDebt-realEstate': 0.20, 'bankDebt-mixed': 0.25, 'bankDebt-crypto': 0.0,
        'globalEquity-globalEquity': 0.85, 'globalEquity-localEquity': 0.65,
        'globalEquity-realEstate': 0.40, 'globalEquity-mixed': 0.70,
        'globalEquity-crypto': 0.30, 'globalEquity-altDebt': 0.10,
        'localEquity-localEquity': 0.80, 'localEquity-realEstate': 0.50,
        'localEquity-mixed': 0.65, 'localEquity-crypto': 0.25,
        'realEstate-realEstate': 0.75, 'realEstate-mixed': 0.55,
        'crypto-crypto': 0.82, 'crypto-altDebt': 0.15, 'crypto-venture': 0.50,
        'altDebt-altDebt': 0.70, 'venture-venture': 0.65, 'mixed-mixed': 0.90
    };

    const g1 = grupos[instr1] || 'mixed';
    const g2 = grupos[instr2] || 'mixed';
    if (g1 === g2) return matrizCorr[`${g1}-${g1}`] ?? 0.80;
    const key = [g1, g2].sort().join('-');
    return matrizCorr[key] ?? 0.10;
}

// ── Generador de ruido gaussiano (Box-Muller) ─────────────────────────────────
function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ── Descomposición de Cholesky (para correlaciones) ───────────────────────────
function cholesky(corr) {
    const n = corr.length;
    const L = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            let sum = 0;
            for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
            if (i === j) {
                L[i][j] = Math.sqrt(Math.max(0, corr[i][i] - sum));
            } else {
                L[i][j] = L[j][j] !== 0 ? (corr[i][j] - sum) / L[j][j] : 0;
            }
        }
    }
    return L;
}

// ── Simular una sola trayectoria Monte Carlo para N instrumentos ──────────────
function simularTrayectoria(instrumentos, cfg, L) {
    const n = instrumentos.length;
    const meses = cfg.plazoAnios * 12;
    const inflMensual = Math.pow(1 + cfg.inflacion / 100, 1 / 12) - 1;
    const escFactor = ESCENARIO_FACTORES[cfg.escenario];
    const perfilFactor = PERFIL_AJUSTE[cfg.perfilRiesgo];
    const capitalPorInstr = cfg.capitalInicial / n;
    const aportPorInstr = cfg.aportacionMensual / n;

    let capitales = instrumentos.map(() => capitalPorInstr);
    const historialAnual = [capitales.reduce((s, c) => s + c, 0)];
    let maxCapital = historialAnual[0];
    let maxDrawdown = 0;
    const retornosMensuales = [];

    for (let mes = 1; mes <= meses; mes++) {
        // Generar shocks correlacionados vía Cholesky
        const z = Array.from({ length: n }, () => randn());
        const zCorr = instrumentos.map((_, i) =>
            L[i].reduce((sum, lij, j) => sum + lij * z[j], 0)
        );

        const capAnterior = capitales.reduce((s, c) => s + c, 0);

        capitales = capitales.map((cap, i) => {
            const instr = instrumentos[i];
            const tasaAnual = (instr.tasa_base + escFactor.tasaAdj) * perfilFactor.tasaMult;
            const volAnual = instr.volatilidad * escFactor.volAdj * perfilFactor.volMult;
            const mu = tasaAnual / 12;
            const sigma = volAnual / Math.sqrt(12);
            // Retorno lognormal: exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*Z)
            const retMensual = Math.exp((mu - 0.5 * sigma * sigma) + sigma * zCorr[i]) - 1;
            return Math.max(0, cap * (1 + retMensual) + aportPorInstr);
        });

        const capTotal = capitales.reduce((s, c) => s + c, 0);
        if (capTotal > maxCapital) maxCapital = capTotal;
        const drawdown = maxCapital > 0 ? (maxCapital - capTotal) / maxCapital : 0;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;

        const retMes = capAnterior > 0 ? (capTotal - capAnterior) / capAnterior : 0;
        retornosMensuales.push(retMes);

        if (mes % 12 === 0) historialAnual.push(capTotal);
    }

    const capitalFinal = capitales.reduce((s, c) => s + c, 0);
    const totalAportado = cfg.capitalInicial + cfg.aportacionMensual * meses;
    const ganancia = capitalFinal - totalAportado;
    const rendimiento = totalAportado > 0 ? (ganancia / totalAportado) * 100 : 0;
    const capitalReal = capitalFinal / Math.pow(1 + cfg.inflacion / 100, cfg.plazoAnios);

    // Sharpe ratio (usando tasa libre de riesgo ~4%)
    const rfMensual = 0.04 / 12;
    const mediaRetornos = retornosMensuales.reduce((s, r) => s + r, 0) / retornosMensuales.length;
    const varRetornos = retornosMensuales.reduce((s, r) => s + (r - mediaRetornos) ** 2, 0) / retornosMensuales.length;
    const stdRetornos = Math.sqrt(varRetornos);
    const sharpe = stdRetornos > 0 ? ((mediaRetornos - rfMensual) / stdRetornos) * Math.sqrt(12) : 0;

    return {
        capitalFinal,
        capitalReal,
        totalAportado,
        ganancia,
        rendimiento,
        maxDrawdown,
        sharpe,
        historialAnual
    };
}

// ── MOTOR PRINCIPAL: Monte Carlo completo ─────────────────────────────────────
function ejecutarMonteCarlo(instrumentos, cfg) {
    const n = instrumentos.length;

    // Construir matriz de correlaciones
    const corrMatrix = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => getCorrelacion(instrumentos[i].id, instrumentos[j].id))
    );
    const L = cholesky(corrMatrix);

    // Ejecutar iteraciones
    const resultados = [];
    for (let iter = 0; iter < MONTE_CARLO_ITERATIONS; iter++) {
        resultados.push(simularTrayectoria(instrumentos, cfg, L));
    }

    // Ordenar por capital final
    resultados.sort((a, b) => a.capitalFinal - b.capitalFinal);

    // Percentiles
    const p10 = resultados[Math.floor(MONTE_CARLO_ITERATIONS * 0.10)];
    const p50 = resultados[Math.floor(MONTE_CARLO_ITERATIONS * 0.50)];
    const p90 = resultados[Math.floor(MONTE_CARLO_ITERATIONS * 0.90)];

    // Probabilidades
    const totalAportado = cfg.capitalInicial + cfg.aportacionMensual * cfg.plazoAnios * 12;
    const probGanancia = resultados.filter(r => r.capitalFinal > totalAportado).length / MONTE_CARLO_ITERATIONS;
    const probDuplicar = resultados.filter(r => r.capitalFinal > totalAportado * 2).length / MONTE_CARLO_ITERATIONS;

    // VaR 95% (pérdida máxima esperada con 95% de confianza)
    const var95 = resultados[Math.floor(MONTE_CARLO_ITERATIONS * 0.05)];
    const varPct = totalAportado > 0 ? ((totalAportado - var95.capitalFinal) / totalAportado) * 100 : 0;

    // Métricas promedio
    const avgSharpe = resultados.reduce((s, r) => s + r.sharpe, 0) / MONTE_CARLO_ITERATIONS;
    const avgDrawdown = resultados.reduce((s, r) => s + r.maxDrawdown, 0) / MONTE_CARLO_ITERATIONS;

    // Construir series para la gráfica (percentiles año a año)
    const anios = cfg.plazoAnios;
    const serieP10 = Array.from({ length: anios + 1 }, (_, i) =>
        resultados[Math.floor(MONTE_CARLO_ITERATIONS * 0.10)].historialAnual[i] ?? 0
    );
    const serieP50 = Array.from({ length: anios + 1 }, (_, i) =>
        p50.historialAnual[i] ?? 0
    );
    const serieP90 = Array.from({ length: anios + 1 }, (_, i) =>
        resultados[Math.floor(MONTE_CARLO_ITERATIONS * 0.90)].historialAnual[i] ?? 0
    );
    const serieInvertido = Array.from({ length: anios + 1 }, (_, i) =>
        cfg.capitalInicial + cfg.aportacionMensual * 12 * i
    );

    // Todas las trayectorias (muestra de 80 para la gráfica de abanico)
    const muestra = resultados.filter((_, i) => i % 6 === 0).slice(0, 80);

    // Calcular riesgo global del portafolio
    const pesos = { bajo: 1, medio: 2, alto: 3 };
    const riesgoNum = instrumentos.reduce((s, i) => s + pesos[i.riesgo], 0) / n;
    const riesgoGlobal = riesgoNum <= 1.33 ? 'bajo' : riesgoNum <= 2.33 ? 'medio' : 'alto';

    // Recomendaciones basadas en métricas
    const recomendaciones = generarRecomendacionesPro({
        cfg, p10, p50, p90, probGanancia, probDuplicar, avgSharpe, avgDrawdown, varPct, riesgoGlobal, instrumentos
    });

    return {
        p10, p50, p90,
        totalAportado,
        probGanancia: Math.round(probGanancia * 100),
        probDuplicar: Math.round(probDuplicar * 100),
        var95: var95.capitalFinal,
        varPct: Math.max(0, varPct),
        avgSharpe,
        avgDrawdown: avgDrawdown * 100,
        riesgoGlobal,
        recomendaciones,
        seriesGrafica: { serieP10, serieP50, serieP90, serieInvertido, muestra },
        iteraciones: MONTE_CARLO_ITERATIONS
    };
}

// ── Recomendaciones profesionales ─────────────────────────────────────────────
function generarRecomendacionesPro({ cfg, p10, p50, p90, probGanancia, probDuplicar, avgSharpe, avgDrawdown, varPct, riesgoGlobal, instrumentos }) {
    const recs = [];

    if (probGanancia >= 0.80) {
        recs.push({ tipo: 'success', icono: '✓', titulo: 'Estrategia sólida',
            texto: `${Math.round(probGanancia * 100)}% de las simulaciones proyectan ganancia. El escenario mediano genera $${fmtMXN(p50.capitalFinal - p50.totalAportado)} de ganancia en ${cfg.plazoAnios} años.` });
    } else if (probGanancia < 0.50) {
        recs.push({ tipo: 'danger', icono: '!', titulo: 'Riesgo elevado de pérdida',
            texto: `Sólo ${Math.round(probGanancia * 100)}% de simulaciones son rentables. Considera reducir el riesgo del portafolio o ampliar el horizonte temporal.` });
    }

    if (avgSharpe >= 0.8) {
        recs.push({ tipo: 'success', icono: '★', titulo: 'Excelente ratio riesgo/retorno',
            texto: `Sharpe de ${avgSharpe.toFixed(2)} — rendimiento bien compensado por el riesgo asumido (>0.8 se considera excelente).` });
    } else if (avgSharpe < 0.3) {
        recs.push({ tipo: 'warning', icono: '↕', titulo: 'Bajo ratio riesgo/retorno',
            texto: `Sharpe de ${avgSharpe.toFixed(2)}. Los CETES o instrumentos de deuda gubernamental podrían mejorar la eficiencia sin reducir mucho el retorno.` });
    }

    if (avgDrawdown > 25) {
        recs.push({ tipo: 'danger', icono: '↓', titulo: `Drawdown máximo promedio alto: ${avgDrawdown.toFixed(1)}%`,
            texto: `Prepárate para ver tu portafolio caer temporalmente hasta ${avgDrawdown.toFixed(0)}%. Sólo invierte lo que no necesites a corto plazo.` });
    }

    if (varPct > 20) {
        recs.push({ tipo: 'warning', icono: '⚡', titulo: `VaR (95%) alto: −${varPct.toFixed(1)}%`,
            texto: `En el peor 5% de escenarios, podrías perder hasta el ${varPct.toFixed(0)}% de tu capital inicial. Diversifica más para reducir este riesgo.` });
    }

    const brecha = p90.capitalFinal / Math.max(1, p10.capitalFinal);
    if (brecha > 3) {
        recs.push({ tipo: 'info', icono: '↔', titulo: 'Alta dispersión de resultados',
            texto: `Rango entre escenario optimista y pesimista: ${brecha.toFixed(1)}x. Los resultados son muy sensibles al azar del mercado. Considera alargar el plazo.` });
    }

    if (cfg.aportacionMensual === 0 && cfg.plazoAnios >= 5) {
        recs.push({ tipo: 'info', icono: '+', titulo: 'Potencia el interés compuesto',
            texto: 'Agregar aportaciones mensuales, incluso pequeñas, puede mejorar significativamente el escenario mediano. El costo promedio reduce la volatilidad de entrada.' });
    }

    if (probDuplicar >= 0.50) {
        recs.push({ tipo: 'success', icono: '2×', titulo: `${Math.round(probDuplicar * 100)}% de probabilidad de duplicar`,
            texto: 'Alta probabilidad de duplicar el capital invertido. Mantén el plan y resiste vender durante correcciones de mercado.' });
    }

    return recs;
}

// ── Utilidades ────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const fmt = (n, dec = 0) => Math.round(n).toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtMXN = n => `$${fmt(n)}`;
const fmtPct = n => `${n >= 0 ? '+' : ''}${Number(n).toFixed(1)}%`;
const fmtDecimal = (n, d = 2) => Number(n).toFixed(d);

// ── Estado de fuente de datos de mercado ──────────────────────────────────────
function renderDataSourceStatus() {
    const el = $('data-source-status');
    if (!el) return;
    const count = state.mktLiveCount;
    if (count > 0) {
        const stale = state.mktIsStale;
        const fechaStr = state.mktLastUpdated
            ? new Date(state.mktLastUpdated).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
            : null;
        const dotClass = stale ? 'dss-stale' : 'dss-live';
        const msg = stale
            ? `Datos de mercado desactualizados (&gt;24 h) · ${count} instrumentos vía <strong>Alpha Vantage</strong>`
            : `Conectado a datos reales · ${count} instrumentos actualizados vía <strong>Alpha Vantage</strong>`;
        el.innerHTML = `<span class="dss-dot ${dotClass}"></span><span>${msg}${fechaStr ? ' · Actualizado: ' + fechaStr : ''}</span>`;
        el.className = 'data-source-status dss-active';
    } else {
        el.innerHTML = `<span class="dss-dot dss-static"></span><span>Parámetros históricos calibrados — sin conexión a API activa</span>`;
        el.className = 'data-source-status dss-inactive';
    }
}

// ── Validación Paso 1 ─────────────────────────────────────────────────────────
function validarPaso1() {
    const errors = [];
    const nombre = ($('cfg-nombre').value || '').trim();
    if (nombre.length < 3) errors.push('El nombre debe tener al menos 3 caracteres.');
    else if (nombre.length > 60) errors.push('El nombre no puede superar los 60 caracteres.');

    const plazo = parseInt($('cfg-plazo').value, 10);
    if (!Number.isInteger(plazo) || plazo < 1 || plazo > 50) errors.push('El plazo debe ser entre 1 y 50 años.');

    const capital = parseInt($('cfg-capital').value, 10);
    const aport = parseInt($('cfg-aportacion').value, 10);
    if (isNaN(capital) || capital < 0 || capital > 999999999) errors.push('Capital inicial entre $0 y $999,999,999.');
    else if (capital === 0 && (!aport || aport <= 0)) errors.push('Si el capital es $0, la aportación mensual debe ser mayor a $0.');
    if (isNaN(aport) || aport < 0 || aport > 99999999) errors.push('Aportación mensual entre $0 y $99,999,999.');

    const inflacion = parseFloat($('cfg-inflacion').value);
    if (isNaN(inflacion) || inflacion < -5 || inflacion > 50) errors.push('Inflación entre -5% y 50%.');

    return { valid: errors.length === 0, errors };
}

// ── Restricciones de input ────────────────────────────────────────────────────
function aplicarRestriccionEntero(el, min, max) {
    el.addEventListener('input', () => {
        let val = el.value.replace(/[^\d]/g, '');
        let num = parseInt(val, 10);
        if (isNaN(num)) { el.value = ''; return; }
        if (num > max) num = max;
        el.value = num;
    });
    el.addEventListener('keydown', e => { if (['.', ',', 'e', 'E'].includes(e.key)) e.preventDefault(); });
}
function aplicarRestriccionDecimal(el, minVal, maxVal) {
    el.addEventListener('input', () => {
        let val = el.value.replace(/[^\d.\-]/g, '');
        const pts = val.split('.');
        if (pts.length > 2) val = pts[0] + '.' + pts.slice(1).join('');
        el.value = val;
    });
    el.addEventListener('blur', () => {
        let num = parseFloat(el.value);
        if (isNaN(num)) { el.value = ''; return; }
        num = Math.min(maxVal, Math.max(minVal, num));
        el.value = num.toFixed(2);
    });
}

// ── Navegación ────────────────────────────────────────────────────────────────
function navegarA(section) {
    document.querySelectorAll('.inv-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const sec = $(`section-${section}`);
    if (sec) sec.classList.add('active');
    const btn = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (btn) btn.classList.add('active');
    if (section === 'historial') cargarHistorial();
    if (section === 'inicio')    renderInicio();
}

function irAPaso(paso) {
    state.wizardStep = paso;
    [1, 2, 3].forEach(p => {
        const panel = $(`wizard-panel-${p}`);
        const tab   = $(`wizard-tab-${p}`);
        if (panel) panel.classList.toggle('active', p === paso);
        if (tab) {
            tab.classList.remove('active', 'done');
            if (p === paso) tab.classList.add('active');
            if (p < paso)   tab.classList.add('done');
        }
    });
}

// ── Paso 1: Leer config ───────────────────────────────────────────────────────
function leerConfig() {
    state.config.nombre            = ($('cfg-nombre').value || '').trim();
    state.config.capitalInicial    = parseInt($('cfg-capital').value, 10) || 0;
    state.config.plazoAnios        = parseInt($('cfg-plazo').value, 10) || 1;
    state.config.aportacionMensual = parseInt($('cfg-aportacion').value, 10) || 0;
    state.config.numInversiones    = parseInt($('cfg-num').value, 10) || 1;
    state.config.inflacion         = parseFloat($('cfg-inflacion').value) || 4.50;
    state.config.perfilRiesgo      = $('cfg-perfil').value || 'moderado';
    state.config.escenario         = $('cfg-escenario').value || 'base';
}

function siguientePaso1() {
    const { valid, errors } = validarPaso1();
    if (!valid) { alertaAdvertencia(errors.join('\n'), { title: 'Revisa los datos', duration: 6000 }); return; }
    leerConfig();
    renderInstrumentSelects();
    irAPaso(2);
}

// ── Paso 2: Selección de instrumentos ─────────────────────────────────────────
function renderInstrumentSelects() {
    const container = $('instruments-container');
    const n = state.config.numInversiones;
    container.innerHTML = '';

    const grupos = [
        { label: 'Bajo riesgo',  keys: ['cetes','bonddia','sofipos','pagare','udibonos'] },
        { label: 'Riesgo medio', keys: ['sp500','fibras','acciones_div','crowdfunding','fondos_mixtos'] },
        { label: 'Alto riesgo',  keys: ['bitcoin','ethereum','tech_stocks','p2p','startups'] }
    ];

    for (let i = 1; i <= n; i++) {
        const div = document.createElement('div');
        div.className = 'instrument-selector';
        div.id = `instr-box-${i}`;

        const optsHtml = grupos.map(g => `
            <optgroup label="${g.label}">
                ${g.keys.map(k => `<option value="${k}">${INSTRUMENTOS[k].nombre} — ${(INSTRUMENTOS[k].tasa_base * 100).toFixed(1)}% base · vol ${(INSTRUMENTOS[k].volatilidad * 100).toFixed(0)}%</option>`).join('')}
            </optgroup>`).join('');

        div.innerHTML = `
            <label>Instrumento ${i}</label>
            <select id="instr-select-${i}">
                <option value="">— Elige un instrumento —</option>
                ${optsHtml}
            </select>
            <div class="instrument-info" id="instr-info-${i}">
                <span class="risk-badge" id="instr-risk-${i}"></span>
                <span class="instr-desc" id="instr-desc-${i}"></span>
            </div>`;
        container.appendChild(div);

        $(`instr-select-${i}`).addEventListener('change', () => {
            actualizarInfoInstrumento(i);
            actualizarRiesgoPreview();
        });
    }
}

function actualizarInfoInstrumento(idx) {
    const val = $(`instr-select-${idx}`)?.value;
    const infoDiv = $(`instr-info-${idx}`);
    if (!val || !INSTRUMENTOS[val]) { if (infoDiv) infoDiv.classList.remove('active'); return; }
    const instr = INSTRUMENTOS[val];
    const meta  = RIESGO_META[instr.riesgo];
    const liveTag = instr.fuente === 'alpha_vantage'
        ? ' <span class="instr-live-tag">&#9679; datos reales</span>'
        : '';
    $(`instr-risk-${idx}`).className = `risk-badge ${instr.riesgo}`;
    $(`instr-risk-${idx}`).innerHTML = `${meta.emoji} ${meta.label} · ${(instr.tasa_base * 100).toFixed(1)}% base · vol ${(instr.volatilidad * 100).toFixed(0)}%${liveTag}`;
    $(`instr-desc-${idx}`).textContent = instr.descripcion;
    infoDiv.classList.add('active');
    $(`instr-box-${idx}`).classList.add('has-value');
}

function actualizarRiesgoPreview() {
    const seleccionados = obtenerInstrumentosSeleccionados();
    const preview = $('risk-preview');
    if (!preview) return;
    if (seleccionados.length === 0) { preview.innerHTML = '<span>Selecciona instrumentos para ver el análisis del portafolio</span>'; return; }

    const pesos = { bajo: 1, medio: 2, alto: 3 };
    const riesgoNum = seleccionados.reduce((s, i) => s + pesos[i.riesgo], 0) / seleccionados.length;
    const riesgoGlobal = riesgoNum <= 1.33 ? 'bajo' : riesgoNum <= 2.33 ? 'medio' : 'alto';
    const meta = RIESGO_META[riesgoGlobal];

    let corrInfo = '';
    if (seleccionados.length > 1) {
        const correlaciones = [];
        for (let i = 0; i < seleccionados.length; i++) {
            for (let j = i + 1; j < seleccionados.length; j++) {
                correlaciones.push(getCorrelacion(seleccionados[i].id, seleccionados[j].id));
            }
        }
        const corrProm = correlaciones.reduce((s, c) => s + c, 0) / correlaciones.length;
        const nivel = corrProm > 0.7 ? 'Alta correlación — poca diversificación' : corrProm > 0.3 ? 'Correlación moderada — diversificación media' : 'Baja correlación — buena diversificación';
        corrInfo = `<span class="risk-corr-info">${nivel} (ρ promedio: ${corrProm.toFixed(2)})</span>`;
    }

    const riesgoClass = `risk-label-${riesgoGlobal}`;
    preview.innerHTML = `
        <span class="risk-indicator">${meta.emoji}</span>
        <div>
            <strong>Riesgo global: <span class="${riesgoClass}">${meta.label}</span></strong>
            ${corrInfo}
        </div>`;
}

function obtenerInstrumentosSeleccionados() {
    return Array.from({ length: state.config.numInversiones }, (_, i) => {
        const val = $(`instr-select-${i + 1}`)?.value;
        return val && INSTRUMENTOS[val] ? INSTRUMENTOS[val] : null;
    }).filter(Boolean);
}

// ── Simular ───────────────────────────────────────────────────────────────────
function simular() {
    const instrs = obtenerInstrumentosSeleccionados();
    if (instrs.length !== state.config.numInversiones) {
        return alertaAdvertencia(`Selecciona ${state.config.numInversiones} instrumento(s) para continuar.`);
    }
    const ids = instrs.map(i => i.id);
    if (new Set(ids).size !== ids.length) {
        return alertaAdvertencia('No puedes seleccionar el mismo instrumento más de una vez.');
    }

    state.instrumentosSeleccionados = instrs;
    state.simulacionGuardada = false;

    alertaInfo(`Ejecutando ${MONTE_CARLO_ITERATIONS} simulaciones Monte Carlo...`, { duration: 2000 });

    // Pequeño timeout para que la alerta se muestre antes del cálculo pesado
    setTimeout(() => {
        try {
            state.resultados = ejecutarMonteCarlo(instrs, state.config);
            irAPaso(3);
            renderResultados(state.resultados);
            const btn = $('btn-guardar');
            if (btn) { btn.textContent = 'Guardar en historial'; btn.disabled = false; }
        } catch (e) {
            console.error(e);
            alertaError('Error al calcular la simulación: ' + e.message);
        }
    }, 100);
}

// ── Render resultados ─────────────────────────────────────────────────────────
function renderResultados(r) {
    const cfg = state.config;
    const escLabel = ESCENARIO_FACTORES[cfg.escenario].nombre;

    // Tarjetas de resumen (3 percentiles)
    $('res-p10-capital').textContent   = fmtMXN(r.p10.capitalFinal);
    $('res-p50-capital').textContent   = fmtMXN(r.p50.capitalFinal);
    $('res-p90-capital').textContent   = fmtMXN(r.p90.capitalFinal);
    $('res-p50-real').textContent      = fmtMXN(r.p50.capitalReal);
    $('res-p50-ganancia').textContent  = fmtMXN(r.p50.ganancia);
    $('res-p50-ganancia').classList.toggle('val-positive', r.p50.ganancia >= 0);
    $('res-p50-ganancia').classList.toggle('val-negative', r.p50.ganancia < 0);
    $('res-p50-rendimiento').textContent = fmtPct(r.p50.rendimiento);
    $('res-p50-rendimiento').classList.toggle('val-positive', r.p50.rendimiento >= 0);
    $('res-p50-rendimiento').classList.toggle('val-negative', r.p50.rendimiento < 0);

    // Métricas de riesgo
    $('res-sharpe').textContent      = fmtDecimal(r.avgSharpe);
    $('res-drawdown').textContent    = `${fmtDecimal(r.avgDrawdown)}%`;
    $('res-var95').textContent       = fmtMXN(r.var95);
    $('res-var-pct').textContent     = `−${fmtDecimal(r.varPct)}%`;
    $('res-prob-gan').textContent    = `${r.probGanancia}%`;
    $('res-prob-dup').textContent    = `${r.probDuplicar}%`;
    $('res-iteraciones').textContent = r.iteraciones;
    $('res-escenario').textContent   = escLabel;
    $('res-aportado').textContent    = fmtMXN(r.totalAportado);

    const rm = RIESGO_META[r.riesgoGlobal];
    const riskEl = $('res-riesgo');
    if (riskEl) { riskEl.textContent = `${rm.emoji} ${rm.label}`; riskEl.className = `risk-badge ${r.riesgoGlobal}`; }

    // Sharpe color
    const sharpeEl = $('res-sharpe');
    if (sharpeEl) {
        sharpeEl.classList.remove('val-positive', 'val-warning', 'val-negative');
        if (r.avgSharpe >= 0.8)      sharpeEl.classList.add('val-positive');
        else if (r.avgSharpe >= 0.4) sharpeEl.classList.add('val-warning');
        else                          sharpeEl.classList.add('val-negative');
    }

    renderGraficaMonteCarlo(r);
    renderRecomendaciones(r.recomendaciones);

    $('res-nombre').value = `${state.instrumentosSeleccionados.map(i => i.nombre).join(' + ')} · ${cfg.plazoAnios}a · ${escLabel}`;
}

// ── Gráfica Monte Carlo (abanico de percentiles + muestra de trayectorias) ────
function renderGraficaMonteCarlo(r) {
    const ctx = $('inv-chart').getContext('2d');
    if (state.chartInstance) { state.chartInstance.destroy(); state.chartInstance = null; }

    const labels = ['Inicio', ...Array.from({ length: r.p50.historialAnual.length - 1 }, (_, i) => `Año ${i + 1}`)];
    const s = r.seriesGrafica;

    // Área entre p10 y p90 (zona sombreada de incertidumbre)
    const datasets = [
        {
            label: 'Percentil 90 (optimista)',
            data: s.serieP90,
            borderColor: '#1a9c5b',
            backgroundColor: 'rgba(26,156,91,0.08)',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.35,
            fill: '+1'
        },
        {
            label: 'Mediana P50',
            data: s.serieP50,
            borderColor: '#185FA5',
            backgroundColor: 'rgba(24,95,165,0.06)',
            borderWidth: 3,
            pointRadius: 4,
            tension: 0.35,
            fill: false
        },
        {
            label: 'Percentil 10 (pesimista)',
            data: s.serieP10,
            borderColor: '#A32D2D',
            backgroundColor: 'rgba(163,45,45,0.08)',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.35,
            fill: false
        },
        {
    label: 'Capital invertido',
    data: s.serieInvertido,
    borderColor: '#888',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderDash: [8, 5],
    pointRadius: 3,           // ← antes era 0
    pointHoverRadius: 6,
    pointBackgroundColor: '#888',
    pointBorderColor: '#fff',
    pointBorderWidth: 1.5,
    tension: 0,
    fill: false
}
    ];

    state.chartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: c => `${c.dataset.label}: ${fmtMXN(c.parsed.y)}`
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: 'Tiempo' } },
                y: {
                    title: { display: true, text: 'Capital ($)' },
                    ticks: { callback: v => '$' + Math.round(v).toLocaleString('es-MX') }
                }
            }
        }
    });
}

function renderRecomendaciones(recs) {
    const list = $('rec-list');
    if (!list) return;
    list.innerHTML = recs.map(r => `
        <div class="rec-item ${r.tipo}">
            <div class="rec-icon">${r.icono}</div>
            <div>
                <div class="rec-title">${r.titulo}</div>
                <div class="rec-text">${r.texto}</div>
            </div>
        </div>`).join('');
}

// ── Guardar simulación ─────────────────────────────────────────────────────────
async function guardarSimulacion() {
    if (!state.resultados) return alertaError('No hay resultados que guardar.');
    if (state.simulacionGuardada) { alertaAdvertencia('Esta simulación ya fue guardada.'); return; }

    const nombre = $('res-nombre').value.trim();
    if (!nombre) return alertaAdvertencia('Ingresa un nombre para la simulación.');

    const cfg = state.config;
    const r   = state.resultados;

    const simulacionData = {
        nombre,
        capital_inicial:    cfg.capitalInicial,
        plazo_anios:        cfg.plazoAnios,
        aportacion_mensual: cfg.aportacionMensual,
        inflacion:          cfg.inflacion,
        num_instrumentos:   state.instrumentosSeleccionados.length,
        riesgo_global:      r.riesgoGlobal,
        capital_final:      r.p50.capitalFinal,
        total_aportado:     r.totalAportado,
        ganancia_total:     r.p50.ganancia,
        rendimiento_pct:    r.p50.rendimiento,
        capital_final_real: r.p50.capitalReal,
        analisis: JSON.stringify({
            probGanancia:   r.probGanancia,
            probDuplicar:   r.probDuplicar,
            avgSharpe:      r.avgSharpe,
            avgDrawdown:    r.avgDrawdown,
            varPct:         r.varPct,
            escenario:      cfg.escenario,
            perfilRiesgo:   cfg.perfilRiesgo,
            recomendaciones: r.recomendaciones,
            p10Capital:     r.p10.capitalFinal,
            p90Capital:     r.p90.capitalFinal
        }),
        datos_grafica: JSON.stringify({
            serieP10:       r.seriesGrafica.serieP10,
            serieP50:       r.seriesGrafica.serieP50,
            serieP90:       r.seriesGrafica.serieP90,
            serieInvertido: r.seriesGrafica.serieInvertido
        }),
        tabla_anual:   JSON.stringify([])
    };

    const instrumentosData = state.instrumentosSeleccionados.map((instr, idx) => ({
        posicion: idx + 1,
        instrumento_id: instr.id,
        instrumento_nombre: instr.nombre,
        riesgo: instr.riesgo,
        tasa_base: instr.tasa_base,
        capital_asignado: cfg.capitalInicial / state.instrumentosSeleccionados.length,
        capital_final: r.p50.capitalFinal / state.instrumentosSeleccionados.length,
        ganancia: r.p50.ganancia / state.instrumentosSeleccionados.length,
        rendimiento_pct: r.p50.rendimiento
    }));

    try {
        const res = await fetch(`${API}/inversiones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.userId, simulacion: simulacionData, instrumentos: instrumentosData })
        });
        const data = await res.json();
        if (data.success) {
            state.simulacionGuardada = true;
            alertaExito('Simulación guardada en tu historial.');
            const btn = $('btn-guardar');
            if (btn) { btn.textContent = '✓ Guardada'; btn.disabled = true; }
        } else { alertaError(data.message || 'Error al guardar.'); }
    } catch (e) { alertaError('Error de conexión al guardar.'); }
}

// ── Historial ──────────────────────────────────────────────────────────────────
async function cargarHistorial() {
    try {
        const res = await fetch(`${API}/inversiones/historial/${state.userId}`);
        const data = await res.json();
        if (data.success) { state.historial = data.data; renderHistorial(); }
    } catch (e) { alertaError('Error al cargar historial.'); }
}

function renderHistorial() {
    const container = $('historial-list');
    state.compareSeleccion.clear();
    actualizarBtnComparar();

    if (!state.historial.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon"></div><p>Sin simulaciones. ¡Crea la primera!</p></div>`;
        return;
    }

    container.innerHTML = state.historial.map(sim => {
        const analisis = sim.analisis ? JSON.parse(sim.analisis) : {};
        const instrs = (sim.simulation_instruments || []).sort((a, b) => a.posicion - b.posicion)
            .map(i => `<span class="risk-badge sm ${i.riesgo}">${i.instrumento_nombre}</span>`).join('');
        const fecha = new Date(sim.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
        const gananciaClass = (sim.ganancia_total || 0) >= 0 ? '' : 'neg';
        const p10 = analisis.p10Capital ? fmtMXN(analisis.p10Capital) : '—';
        const p90 = analisis.p90Capital ? fmtMXN(analisis.p90Capital) : '—';
        const sharpe = analisis.avgSharpe ? fmtDecimal(analisis.avgSharpe) : '—';

        return `
        <div class="historial-card" id="hist-${sim.id}">
            <input type="checkbox" class="compare-check" data-id="${sim.id}">
            <div class="hist-info">
                <div class="hist-nombre">${sim.nombre}</div>
                <div class="hist-meta">
                    <span>${fecha}</span>
                    <span>$${Math.round(sim.capital_inicial).toLocaleString('es-MX')} · ${sim.plazo_anios}a · ${sim.num_instrumentos} instr. · Infl. ${sim.inflacion ?? '—'}%</span>
                    ${analisis.escenario ? `<span>Escenario: ${ESCENARIO_FACTORES[analisis.escenario]?.nombre ?? analisis.escenario}</span>` : ''}
                </div>
                <div class="hist-instrs">${instrs}</div>
                <div class="hist-extra-stats">
                    <span>P10: ${p10}</span><span>P50: ${fmtMXN(sim.capital_final || 0)}</span><span>P90: ${p90}</span>
                    <span>Sharpe: ${sharpe}</span>
                    ${analisis.probGanancia !== undefined ? `<span>Prob. ganancia: ${analisis.probGanancia}%</span>` : ''}
                </div>
            </div>
            <div class="hist-stats">
                <div class="hist-stat">
                    <div class="hs-val ${gananciaClass}">${fmtMXN(sim.capital_final || 0)}</div>
                    <div class="hs-label">P50 final</div>
                </div>
                <div class="hist-stat">
                    <div class="hs-val ${gananciaClass}">${fmtPct(sim.rendimiento_pct || 0)}</div>
                    <div class="hs-label">Rendimiento</div>
                </div>
                <div class="hist-stat">
                    <span class="risk-badge ${sim.riesgo_global}">${RIESGO_META[sim.riesgo_global]?.emoji || ''} ${RIESGO_META[sim.riesgo_global]?.label || ''}</span>
                    <div class="hs-label">Riesgo</div>
                </div>
            </div>
            <div class="hist-actions">
                <button class="btn-secondary btn-small btn-ver-sim" data-id="${sim.id}" type="button">Ver</button>
                <button class="btn-danger btn-small btn-eliminar-sim" data-id="${sim.id}" type="button">Eliminar</button>
            </div>
        </div>`;
    }).join('');

    document.querySelectorAll('.compare-check').forEach(cb => {
        cb.addEventListener('change', () => {
            const id = cb.dataset.id;
            cb.checked ? state.compareSeleccion.add(id) : state.compareSeleccion.delete(id);
            actualizarBtnComparar();
        });
    });
}

function actualizarBtnComparar() {
    const btn = $('btn-comparar-sel');
    if (!btn) return;
    const n = state.compareSeleccion.size;
    btn.textContent = n >= 2 ? `Comparar ${n} seleccionadas` : 'Selecciona 2 o más para comparar';
    btn.disabled = n < 2;
}

async function verSimulacion(id) {
    try {
        const res = await fetch(`${API}/inversiones/${id}?userId=${state.userId}`);
        const data = await res.json();
        if (!data.success) return alertaError('No se pudo cargar.');
        const sim = data.data;
        const grafData = sim.datos_grafica ? JSON.parse(sim.datos_grafica) : null;
        if (!grafData) return;
        navegarA('nueva');
        irAPaso(3);
        const analisis = sim.analisis ? JSON.parse(sim.analisis) : {};

        $('res-p50-capital').textContent   = fmtMXN(sim.capital_final || 0);
        $('res-p10-capital').textContent   = analisis.p10Capital ? fmtMXN(analisis.p10Capital) : '—';
        $('res-p90-capital').textContent   = analisis.p90Capital ? fmtMXN(analisis.p90Capital) : '—';
        $('res-p50-real').textContent      = fmtMXN(sim.capital_final_real || 0);
        $('res-p50-ganancia').textContent  = fmtMXN(sim.ganancia_total || 0);
        $('res-p50-rendimiento').textContent = fmtPct(sim.rendimiento_pct || 0);
        $('res-aportado').textContent      = fmtMXN(sim.total_aportado || 0);
        $('res-sharpe').textContent        = analisis.avgSharpe ? fmtDecimal(analisis.avgSharpe) : '—';
        $('res-drawdown').textContent      = analisis.avgDrawdown ? `${fmtDecimal(analisis.avgDrawdown)}%` : '—';
        $('res-var-pct').textContent       = analisis.varPct ? `−${fmtDecimal(analisis.varPct)}%` : '—';
        $('res-prob-gan').textContent      = analisis.probGanancia !== undefined ? `${analisis.probGanancia}%` : '—';
        $('res-prob-dup').textContent      = analisis.probDuplicar !== undefined ? `${analisis.probDuplicar}%` : '—';
        $('res-escenario').textContent     = analisis.escenario ? ESCENARIO_FACTORES[analisis.escenario]?.nombre : '—';
        $('res-iteraciones').textContent   = '500';

        const rm = RIESGO_META[sim.riesgo_global] || RIESGO_META.medio;
        $('res-riesgo').textContent = `${rm.emoji} ${rm.label}`;
        $('res-riesgo').className   = `risk-badge ${sim.riesgo_global}`;
        $('res-nombre').value = sim.nombre;

        state.simulacionGuardada = true;
        const btnG = $('btn-guardar');
        if (btnG) { btnG.textContent = '✓ Ya guardada'; btnG.disabled = true; }

        // Reconstruir gráfica
        const ctx = $('inv-chart').getContext('2d');
        if (state.chartInstance) { state.chartInstance.destroy(); state.chartInstance = null; }

        const s = grafData;
        const hasSeries = s.serieP50 && s.serieP50.length > 0;
        if (hasSeries) {
            const labels = ['Inicio', ...Array.from({ length: s.serieP50.length - 1 }, (_, i) => `Año ${i + 1}`)];
            state.chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        { label: 'P90 (optimista)', data: s.serieP90, borderColor: '#1a9c5b', borderWidth: 2, pointRadius: 2, tension: 0.35, fill: false },
                        { label: 'Mediana P50', data: s.serieP50, borderColor: '#185FA5', borderWidth: 3, pointRadius: 4, tension: 0.35, fill: false },
                        { label: 'P10 (pesimista)', data: s.serieP10, borderColor: '#A32D2D', borderWidth: 2, pointRadius: 2, tension: 0.35, fill: false },
                        { label: 'Capital invertido', data: s.serieInvertido, borderColor: '#888', borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0, fill: false }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => '$' + Math.round(v).toLocaleString('es-MX') } } } }
            });
        }

        renderRecomendaciones(analisis.recomendaciones || []);
    } catch (e) { console.error(e); alertaError('Error al cargar simulación.'); }
}

async function eliminarSimulacion(id) {
    if (!await alertaConfirmacion('¿Eliminar esta simulación?', '⚠️ Confirmar')) return;
    try {
        const res = await fetch(`${API}/inversiones/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: state.userId }) });
        const data = await res.json();
        if (data.success) { alertaExito('Eliminada.'); cargarHistorial(); }
        else alertaError(data.message);
    } catch (e) { alertaError('Error al eliminar.'); }
}

// ── Comparar ───────────────────────────────────────────────────────────────────
async function iniciarComparacion() {
    const ids = [...state.compareSeleccion];
    if (ids.length < 2) return alertaAdvertencia('Selecciona al menos 2 simulaciones.');
    navegarA('comparar');
    $('compare-container').innerHTML = '<p class="compare-loading">Cargando...</p>';
    try {
        const sims = await Promise.all(ids.map(async id => {
            const r = await fetch(`${API}/inversiones/${id}?userId=${state.userId}`);
            return (await r.json()).data;
        }));
        renderComparacion(sims);
    } catch (e) { alertaError('Error al cargar para comparar.'); }
}

function renderComparacion(sims) {
    const container = $('compare-container');
    const filas = [
        { label: 'Capital inicial',         key: s => fmtMXN(s.capital_inicial) },
        { label: 'Plazo',                   key: s => `${s.plazo_anios} años` },
        { label: 'Aportación mensual',      key: s => fmtMXN(s.aportacion_mensual || 0) },
        { label: 'Inflación',               key: s => s.inflacion != null ? `${s.inflacion}%` : '—' },
        { label: 'P50 capital final',       key: s => `<strong>${fmtMXN(s.capital_final || 0)}</strong>` },
        { label: 'P10 (pesimista)',         key: s => { const a = s.analisis ? JSON.parse(s.analisis) : {}; return a.p10Capital ? fmtMXN(a.p10Capital) : '—'; } },
        { label: 'P90 (optimista)',         key: s => { const a = s.analisis ? JSON.parse(s.analisis) : {}; return a.p90Capital ? fmtMXN(a.p90Capital) : '—'; } },
        { label: 'Ganancia mediana',        key: s => `<span class="${(s.ganancia_total||0)>=0?'val-positive':'val-negative'}">${fmtMXN(s.ganancia_total || 0)}</span>` },
        { label: 'Rendimiento mediano',     key: s => fmtPct(s.rendimiento_pct || 0) },
        { label: 'Capital real (−inf.)',    key: s => fmtMXN(s.capital_final_real || 0) },
        { label: 'Sharpe ratio',            key: s => { const a = s.analisis ? JSON.parse(s.analisis) : {}; return a.avgSharpe ? fmtDecimal(a.avgSharpe) : '—'; } },
        { label: 'Prob. de ganancia',       key: s => { const a = s.analisis ? JSON.parse(s.analisis) : {}; return a.probGanancia !== undefined ? `${a.probGanancia}%` : '—'; } },
        { label: 'VaR (pérdida 95%)',       key: s => { const a = s.analisis ? JSON.parse(s.analisis) : {}; return a.varPct ? `−${fmtDecimal(a.varPct)}%` : '—'; } },
        { label: 'Drawdown promedio',       key: s => { const a = s.analisis ? JSON.parse(s.analisis) : {}; return a.avgDrawdown ? `${fmtDecimal(a.avgDrawdown)}%` : '—'; } },
        { label: 'Escenario',               key: s => { const a = s.analisis ? JSON.parse(s.analisis) : {}; return a.escenario ? ESCENARIO_FACTORES[a.escenario]?.nombre : '—'; } },
        { label: 'Perfil de riesgo',        key: s => { const a = s.analisis ? JSON.parse(s.analisis) : {}; return a.perfilRiesgo ? a.perfilRiesgo.charAt(0).toUpperCase() + a.perfilRiesgo.slice(1) : '—'; } },
        { label: 'Riesgo global',           key: s => `<span class="risk-badge ${s.riesgo_global}">${RIESGO_META[s.riesgo_global]?.emoji} ${RIESGO_META[s.riesgo_global]?.label}</span>` }
    ];

    const enc = `<tr><th>Métrica</th>${sims.map(s => `<th>${s.nombre}</th>`).join('')}</tr>`;
    const cuerpo = filas.map(f =>
        `<tr><td>${f.label}</td>${sims.map(s => `<td>${f.key(s)}</td>`).join('')}</tr>`
    ).join('');

    container.innerHTML = `
        <div class="inv-card">
            <h3>Tabla comparativa (${MONTE_CARLO_ITERATIONS} iter. Monte Carlo)</h3>
            <div class="inv-table-wrapper">
                <table class="inv-table"><thead>${enc}</thead><tbody>${cuerpo}</tbody></table>
            </div>
        </div>
        <div class="inv-card">
            <h3>Capital final P50 por simulación</h3>
            <div class="compare-chart-wrapper"><canvas id="compare-chart"></canvas></div>
        </div>`;

    if (state.compareChartInstance) state.compareChartInstance.destroy();
    const ctx = document.getElementById('compare-chart').getContext('2d');
    const colors = ['#185FA5', '#1a9c5b', '#BA7517', '#A32D2D', '#533AB7'];
    state.compareChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sims.map(s => s.nombre),
            datasets: [
                { label: 'Capital final P50', data: sims.map(s => s.capital_final || 0), backgroundColor: colors.map(c => c + 'CC'), borderColor: colors, borderWidth: 2, borderRadius: 6 },
                { label: 'Capital invertido',  data: sims.map(s => s.total_aportado || s.capital_inicial), backgroundColor: '#b2bec350', borderColor: '#b2bec3', borderWidth: 2, borderRadius: 6 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom' }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmtMXN(c.parsed.y)}` } } }, scales: { y: { ticks: { callback: v => '$' + Math.round(v).toLocaleString('es-MX') } } } }
    });
}

// ── Inicio ─────────────────────────────────────────────────────────────────────
function renderInicio() {
    const el = $('inicio-stats');
    if (!el || !state.historial.length) return;
    const mejor = state.historial.reduce((a, b) => (a.rendimiento_pct || 0) > (b.rendimiento_pct || 0) ? a : b);
    el.innerHTML = `
        <div class="form-grid">
            <div class="summary-card primary"><div class="card-label">Simulaciones guardadas</div><div class="card-value">${state.historial.length}</div></div>
            <div class="summary-card success"><div class="card-label">Mejor rendimiento P50</div><div class="card-value">${fmtPct(mejor.rendimiento_pct || 0)}</div><div class="card-sub">${mejor.nombre}</div></div>
            <div class="summary-card accent"><div class="card-label">Mayor capital final P50</div><div class="card-value">${fmtMXN(mejor.capital_final || 0)}</div><div class="card-sub">${mejor.plazo_anios} años · ${mejor.riesgo_global}</div></div>
        </div>`;
}

// ── Reset ──────────────────────────────────────────────────────────────────────
function resetSimulationState() {
    state.config = { nombre: '', capitalInicial: 100000, plazoAnios: 10, aportacionMensual: 0, numInversiones: 1, inflacion: 4.50, perfilRiesgo: 'moderado', escenario: 'base' };
    state.instrumentosSeleccionados = [];
    state.resultados = null;
    state.simulacionGuardada = false;
    ['cfg-nombre','cfg-capital','cfg-plazo','cfg-aportacion','cfg-num','cfg-inflacion'].forEach(id => {
        const el = $(id);
        if (el) el.value = { 'cfg-capital': '100000', 'cfg-plazo': '10', 'cfg-aportacion': '0', 'cfg-num': '1', 'cfg-inflacion': '4.50' }[id] || '';
    });
    const btnG = $('btn-guardar');
    if (btnG) { btnG.textContent = 'Guardar en historial'; btnG.disabled = false; }
    if (state.chartInstance) { state.chartInstance.destroy(); state.chartInstance = null; }
    $('instruments-container').innerHTML = '';
    $('rec-list').innerHTML = '';
}

// ── INICIALIZACIÓN ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    if (!protectRoute()) return;
    const user = getAuthData();
    state.userId = user.id;

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => navegarA(btn.dataset.section));
    });

    $('btn-paso1-sig')?.addEventListener('click', siguientePaso1);
    $('btn-paso2-ant')?.addEventListener('click', () => irAPaso(1));
    $('btn-simular')?.addEventListener('click', simular);
    $('btn-paso3-ant')?.addEventListener('click', () => irAPaso(2));
    $('btn-guardar')?.addEventListener('click', guardarSimulacion);
    $('btn-nueva-sim')?.addEventListener('click', () => { resetSimulationState(); navegarA('nueva'); irAPaso(1); });
    $('btn-nueva-desde-resultado')?.addEventListener('click', () => { resetSimulationState(); navegarA('nueva'); irAPaso(1); });
    $('btn-comparar-sel')?.addEventListener('click', iniciarComparacion);
    $('cfg-num')?.addEventListener('change', () => { state.config.numInversiones = parseInt($('cfg-num').value, 10) || 1; });

    [{ id: 'cfg-capital', min: 0, max: 999999999 }, { id: 'cfg-aportacion', min: 0, max: 99999999 }, { id: 'cfg-plazo', min: 1, max: 50 }]
        .forEach(({ id, min, max }) => { const el = $(id); if (el) aplicarRestriccionEntero(el, min, max); });
    const inflEl = $('cfg-inflacion');
    if (inflEl) aplicarRestriccionDecimal(inflEl, -5, 50);

    ['cfg-nombre','cfg-capital','cfg-plazo','cfg-aportacion','cfg-inflacion'].forEach(id => {
        const el = $(id);
        if (el) el.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); siguientePaso1(); }
        });
    });

    const resNombreEl = $('res-nombre');
    if (resNombreEl) {
        resNombreEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const btnG = $('btn-guardar');
                if (btnG && !btnG.disabled) guardarSimulacion();
            }
        });
    }

    document.getElementById('logout-btn-inv')?.addEventListener('click', async e => {
        e.preventDefault();
        if (await alertaConfirmacion('¿Cerrar sesión?', '👋 Salir')) logout();
    });

    try {
        const res = await fetch(`${API}/inversiones/historial/${state.userId}`);
        const data = await res.json();
        if (data.success) state.historial = data.data;
    } catch (e) { /* silencioso */ }

    // Cargar parámetros reales de mercado y parchear INSTRUMENTOS en memoria.
    // Si falla (sin API key, tabla inexistente, red caída) se usan los valores
    // estáticos de instrumentos.js sin interrumpir la experiencia del usuario.
    try {
        const mktRes  = await fetch(`${API}/inversiones/parametros-mercado`);
        const mktData = await mktRes.json();
        if (mktData.success && mktData.data) {
            let liveCount = 0;
            let lastUpdated = null;
            Object.entries(mktData.data).forEach(([id, p]) => {
                if (INSTRUMENTOS[id]) {
                    INSTRUMENTOS[id].tasa_base   = parseFloat(p.tasa_base);
                    INSTRUMENTOS[id].volatilidad = parseFloat(p.volatilidad);
                    INSTRUMENTOS[id].fuente = p.fuente || 'static';
                    if (p.fuente === 'alpha_vantage') {
                        liveCount++;
                        if (p.last_updated && (!lastUpdated || p.last_updated > lastUpdated)) {
                            lastUpdated = p.last_updated;
                        }
                    }
                }
            });
            state.mktLiveCount   = liveCount;
            state.mktLastUpdated = lastUpdated;
            state.mktIsStale     = mktData.stale || false;
        }
    } catch (_) { /* usa valores estáticos de instrumentos.js */ }
    renderDataSourceStatus();

    // Event delegation para botones Ver/Eliminar del historial (reemplaza los onclick inline)
    const historialContainer = $('historial-list');
    if (historialContainer) {
        historialContainer.addEventListener('click', (e) => {
            const verBtn = e.target.closest('.btn-ver-sim');
            const delBtn = e.target.closest('.btn-eliminar-sim');
            if (verBtn) verSimulacion(verBtn.dataset.id);
            if (delBtn) eliminarSimulacion(delBtn.dataset.id);
        });
    }

    navegarA('inicio');

    // ── Onboarding ────────────────────────────────────────────────────────
    setTimeout(() => initOnboarding(state.userId, 'inversiones'), 800);

    document.getElementById('ob-restart-inversiones')?.addEventListener('click', e => {
        e.preventDefault();
        restartOnboarding(state.userId, 'inversiones');
    });
});