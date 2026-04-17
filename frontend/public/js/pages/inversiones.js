// frontend/public/js/pages/inversiones.js
import { protectRoute, getAuthData, logout } from '../modules/auth.js';
import { alertaExito, alertaError, alertaInfo, alertaAdvertencia, alertaConfirmacion } from '../modules/alerts.js';
import { INSTRUMENTOS, INSTRUMENTOS_LISTA, RIESGO_META, COLORES_LINEA } from '../data/instrumentos.js';

const API = '/api';

// ── Estado global ─────────────────────────────────────────────────────────────
const state = {
    userId: null,
    // Configuración de la simulación actual
    config: {
        nombre: '',
        capitalInicial: 100000,
        plazoAnios: 10,
        aportacionMensual: 0,
        numInversiones: 1,
        inflacion: 4.50          // ← ahora vive aquí (por simulación)
    },
    instrumentosSeleccionados: [],
    resultados: null,
    historial: [],
    compareSeleccion: new Set(),
    chartInstance: null,
    compareChartInstance: null,
    wizardStep: 1,
    simulacionGuardada: false    // ← nuevo flag para controlar el botón "Guardar"
};

// ── Función para resetear el estado de una nueva simulación ───────────────────
function resetSimulationState() {
    state.config = {
        nombre: '',
        capitalInicial: 100000,
        plazoAnios: 10,
        aportacionMensual: 0,
        numInversiones: 1,
        inflacion: 4.50
    };
    state.instrumentosSeleccionados = [];
    state.resultados = null;
    state.simulacionGuardada = false;

    // Limpiar campos de la UI del paso 1
    const campos = {
        'cfg-nombre':      '',
        'cfg-capital':     '100000',
        'cfg-plazo':       '10',
        'cfg-aportacion':  '0',
        'cfg-num':         '1',
        'cfg-inflacion':   '4.50'
    };
    Object.entries(campos).forEach(([id, val]) => {
        const el = $(id);
        if (el) el.value = val;
    });

    // Limpiar instrumentos
    const instrContainer = $('instruments-container');
    if (instrContainer) instrContainer.innerHTML = '';

    // Limpiar resultados UI
    ['res-capital','res-aportado','res-ganancia','res-rendimiento','res-real'].forEach(id => {
        const el = $(id);
        if (el) el.textContent = '—';
    });
    const riesgoEl = $('res-riesgo');
    if (riesgoEl) { riesgoEl.textContent = '—'; riesgoEl.className = 'risk-badge'; }

    const recList = $('rec-list');
    if (recList) recList.innerHTML = '';

    const tbody = $('tabla-tbody');
    if (tbody) tbody.innerHTML = '';

    const thead = $('tabla-thead');
    if (thead) thead.innerHTML = '';

    ['ana-mejor','ana-estable','ana-riesgo'].forEach(id => {
        const el = $(id);
        if (el) el.textContent = '—';
    });

    const resNombre = $('res-nombre');
    if (resNombre) resNombre.value = '';

    const btnGuardar = $('btn-guardar');
    if (btnGuardar) {
        btnGuardar.textContent = '💾 Guardar en historial';
        btnGuardar.disabled = false;
    }

    // Destruir gráfica si existe
    if (state.chartInstance) {
        state.chartInstance.destroy();
        state.chartInstance = null;
    }
}

// ── Utilidades DOM ────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const fmt = (n, dec = 0) => n.toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtPct = n => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
const fmtMXN = n => `$${fmt(n)}`;

// ── Distribución normal (Box-Muller) ─────────────────────────────────────────
function randn(mean = 0, std = 1) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + std * z;
}

// ── VALIDACIONES ──────────────────────────────────────────────────────────────

/**
 * Valida todos los campos del Paso 1.
 * Retorna { valid: boolean, errors: string[] }
 */
function validarPaso1() {
    const errors = [];

    // --- Nombre ---
    const nombre = ($('cfg-nombre').value || '').trim();
    if (nombre.length < 3) {
        errors.push('El nombre debe tener al menos 3 caracteres.');
    } else if (nombre.length > 50) {
        errors.push('El nombre no puede superar los 50 caracteres.');
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9 \-]+$/.test(nombre)) {
        errors.push('El nombre solo puede contener letras, números, espacios y guiones.');
    }

    // --- Plazo ---
    const plazoRaw = $('cfg-plazo').value;
    const plazo = parseInt(plazoRaw, 10);
    if (!Number.isInteger(plazo) || isNaN(plazo) || plazo < 1 || plazo > 50) {
        errors.push('El plazo debe ser un número entero entre 1 y 50 años.');
    }

    // --- Capital Inicial ---
    const capitalRaw = $('cfg-capital').value;
    const capital = parseInt(capitalRaw, 10);
    const aportRaw = $('cfg-aportacion').value;
    const aport = parseInt(aportRaw, 10);

    if (isNaN(capital) || capital < 0 || capital > 999999999) {
        errors.push('El capital inicial debe estar entre $0 y $999,999,999 (sin decimales).');
    } else if (capital === 0 && (isNaN(aport) || aport <= 0)) {
        errors.push('Si el capital inicial es $0, la aportación mensual debe ser mayor a $0.');
    }

    // --- Aportación Mensual ---
    if (isNaN(aport) || aport < 0 || aport > 99999999) {
        errors.push('La aportación mensual debe estar entre $0 y $99,999,999 (sin decimales).');
    }

    // --- Inflación ---
    const inflRaw = $('cfg-inflacion').value;
    const inflacion = parseFloat(inflRaw);
    if (isNaN(inflacion) || inflacion < -5.00 || inflacion > 100.00) {
        errors.push('La inflación debe estar entre -5.00% y 100.00%.');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Aplica restricciones de input en tiempo real a un campo de entero.
 * Elimina decimales, limita el valor al rango dado.
 */
function aplicarRestriccionEntero(inputEl, min, max) {
    inputEl.addEventListener('input', () => {
        // Eliminar cualquier caracter que no sea dígito (ni signo para negativos si min < 0)
        let val = inputEl.value.replace(/[^\d]/g, '');
        if (val === '') { inputEl.value = ''; return; }
        let num = parseInt(val, 10);
        if (isNaN(num)) { inputEl.value = ''; return; }
        if (num > max) num = max;
        inputEl.value = num;
    });
    inputEl.addEventListener('keydown', e => {
        // Bloquear punto, coma y 'e'
        if (['.', ',', 'e', 'E'].includes(e.key)) e.preventDefault();
    });
}

/**
 * Aplica restricciones de input en tiempo real a un campo decimal.
 * Permite negativos si minVal < 0. Máximo 2 decimales.
 */
function aplicarRestriccionDecimal(inputEl, minVal, maxVal) {
    inputEl.addEventListener('input', () => {
        let val = inputEl.value;
        // Permitir signo negativo solo al inicio si minVal < 0
        if (minVal < 0) {
            val = val.replace(/[^\d.\-]/g, '');
            // Solo un signo negativo al inicio
            val = val.replace(/(?!^)-/g, '');
        } else {
            val = val.replace(/[^\d.]/g, '');
        }
        // Solo un punto decimal
        const parts = val.split('.');
        if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
        // Máximo 2 decimales
        if (parts.length === 2 && parts[1].length > 2) {
            val = parts[0] + '.' + parts[1].substring(0, 2);
        }
        inputEl.value = val;
    });
    inputEl.addEventListener('keydown', e => {
        if ([',', 'e', 'E'].includes(e.key)) e.preventDefault();
    });
    inputEl.addEventListener('blur', () => {
        let num = parseFloat(inputEl.value);
        if (isNaN(num)) { inputEl.value = ''; return; }
        if (num < minVal) num = minVal;
        if (num > maxVal) num = maxVal;
        inputEl.value = num.toFixed(2);
    });
}

// ── CÁLCULO DE SIMULACIÓN ─────────────────────────────────────────────────────

function simularInstrumento(instrumento, cfg, numInstrumentos) {
    const capitalParte = cfg.capitalInicial / numInstrumentos;
    const aportParte   = cfg.aportacionMensual / numInstrumentos;
    const meses        = cfg.plazoAnios * 12;
    const inflAnual    = cfg.inflacion / 100;
    const inflMensual  = Math.pow(1 + inflAnual, 1 / 12) - 1;

    let capital = capitalParte;
    const datosAnuales = [{ año: 0, capital: capitalParte, capitalReal: capitalParte }];
    const retornosAnuales = [];

    for (let mes = 1; mes <= meses; mes++) {
        let tasaAnual = instrumento.tasa_base + randn(0, instrumento.volatilidad);
        if (instrumento.indexadoInflacion) tasaAnual += inflAnual;
        const tasaMensual = Math.pow(1 + tasaAnual, 1 / 12) - 1;
        capital = Math.max(0, capital * (1 + tasaMensual) + aportParte);

        if (mes % 12 === 0) {
            const año = mes / 12;
            const prev = datosAnuales[año - 1].capital;
            retornosAnuales.push(prev > 0 ? (capital - prev) / prev : 0);
            const capitalReal = capital / Math.pow(1 + inflAnual, año);
            datosAnuales.push({
                año,
                capital:     Math.round(capital * 100) / 100,
                capitalReal: Math.round(capitalReal * 100) / 100
            });
        }
    }

    const capitalFinal    = datosAnuales[datosAnuales.length - 1].capital;
    const capitalFinalReal = datosAnuales[datosAnuales.length - 1].capitalReal;
    const totalAportado   = capitalParte + aportParte * meses;
    const ganancia        = capitalFinal - totalAportado;
    const rendimiento     = totalAportado > 0 ? (ganancia / totalAportado) * 100 : 0;

    const mediaR  = retornosAnuales.reduce((a, b) => a + b, 0) / (retornosAnuales.length || 1);
    const varR    = retornosAnuales.reduce((s, r) => s + (r - mediaR) ** 2, 0) / (retornosAnuales.length || 1);
    const coefVar = Math.abs(mediaR) > 0.001 ? Math.sqrt(varR) / Math.abs(mediaR) : 999;

    return {
        instrumento,
        datosAnuales,
        capitalFinal:      Math.round(capitalFinal * 100) / 100,
        capitalFinalReal:  Math.round(capitalFinalReal * 100) / 100,
        totalAportado:     Math.round(totalAportado * 100) / 100,
        ganancia:          Math.round(ganancia * 100) / 100,
        rendimiento:       Math.round(rendimiento * 100) / 100,
        coefVar
    };
}

function calcularRiesgoGlobal(instrumentos) {
    const pesos = { bajo: 1, medio: 2, alto: 3 };
    const prom = instrumentos.reduce((s, i) => s + pesos[i.riesgo], 0) / instrumentos.length;
    if (prom <= 1.33) return 'bajo';
    if (prom <= 2.33) return 'medio';
    return 'alto';
}

function generarRecomendaciones(r) {
    const { cfg, resultadosPorInstrumento, riesgoGlobal, gananciaTotal, rendimientoTotal } = r;
    const recs = [];
    const inflTotal = (Math.pow(1 + cfg.inflacion / 100, cfg.plazoAnios) - 1) * 100;

    if (riesgoGlobal === 'alto' && cfg.plazoAnios < 5) {
        recs.push({ tipo: 'danger', icono: '⚠️', titulo: 'Riesgo alto con plazo corto',
            mensaje: 'Los instrumentos de alto riesgo necesitan 5–10 años mínimo para recuperarse de caídas. Aumenta el plazo o reduce el riesgo.' });
    }

    const rendimientoReal = rendimientoTotal - inflTotal;
    if (rendimientoReal < 5 && gananciaTotal >= 0) {
        recs.push({ tipo: 'warning', icono: '📊', titulo: 'La inflación reduce tu ganancia real',
            mensaje: `Con inflación del ${cfg.inflacion}%, tu rendimiento real estimado es solo ${rendimientoReal.toFixed(1)}%. Considera instrumentos con mayor rendimiento.` });
    }

    if (cfg.aportacionMensual === 0) {
        recs.push({ tipo: 'info', icono: '💡', titulo: 'Agrega aportaciones mensuales',
            mensaje: 'Aportaciones pequeñas pueden duplicar tu capital final gracias al interés compuesto. ¡Prueba agregar $500/mes!' });
    }

    if (cfg.plazoAnios < 5) {
        recs.push({ tipo: 'info', icono: '⏳', titulo: 'El tiempo es tu mejor aliado',
            mensaje: 'Simula a 10 o 20 años. El interés compuesto crece exponencialmente con el tiempo.' });
    }

    if (resultadosPorInstrumento.length === 1 && resultadosPorInstrumento[0].instrumento.riesgo === 'alto') {
        recs.push({ tipo: 'warning', icono: '🎯', titulo: 'Portafolio sin diversificación',
            mensaje: 'Un solo instrumento de alto riesgo es muy vulnerable. Combina con CETES o S&P 500 para proteger tu capital.' });
    }

    if (resultadosPorInstrumento.length > 1) {
        const mejor = resultadosPorInstrumento.reduce((a, b) => a.capitalFinal > b.capitalFinal ? a : b);
        const peor  = resultadosPorInstrumento.reduce((a, b) => a.capitalFinal < b.capitalFinal ? a : b);
        if (peor.capitalFinal > 0) {
            const dif = ((mejor.capitalFinal / peor.capitalFinal) - 1) * 100;
            if (dif > 60) {
                recs.push({ tipo: 'success', icono: '🏆', titulo: `${mejor.instrumento.nombre} destaca`,
                    mensaje: `Supera al instrumento más débil en un ${dif.toFixed(0)}%. Si tu perfil lo permite, considera concentrar más capital ahí.` });
            }
        }
    }

    if (gananciaTotal > 0 && rendimientoTotal > 20) {
        recs.push({ tipo: 'success', icono: '✅', titulo: '¡Excelente estrategia!',
            mensaje: `Tu simulación proyecta un rendimiento del ${rendimientoTotal.toFixed(1)}%. Mantén la disciplina y revisa el portafolio cada año.` });
    }

    if (gananciaTotal < 0) {
        recs.push({ tipo: 'danger', icono: '🚨', titulo: 'Pérdida proyectada',
            mensaje: 'Esta combinación de instrumentos y plazo proyecta pérdidas. Considera reducir el riesgo o aumentar el plazo.' });
    }

    return recs;
}

function calcularSimulacion() {
    const cfg = state.config;
    const instrs = state.instrumentosSeleccionados;
    const n = instrs.length;

    const resultadosPorInstrumento = instrs.map(i => simularInstrumento(i, cfg, n));

    const tablaAnual = [];
    for (let año = 1; año <= cfg.plazoAnios; año++) {
        const fila = { año };
        let totalCapital = 0;
        let totalCapitalReal = 0;
        resultadosPorInstrumento.forEach((r, idx) => {
            const d = r.datosAnuales.find(p => p.año === año) || { capital: 0, capitalReal: 0 };
            fila[`i${idx + 1}`]     = d.capital;
            fila[`i${idx + 1}real`] = d.capitalReal;
            totalCapital     += d.capital;
            totalCapitalReal += d.capitalReal;
        });
        fila.total     = Math.round(totalCapital * 100) / 100;
        fila.totalReal = Math.round(totalCapitalReal * 100) / 100;
        tablaAnual.push(fila);
    }

    const capitalFinalTotal   = resultadosPorInstrumento.reduce((s, r) => s + r.capitalFinal, 0);
    const capitalFinalReal    = resultadosPorInstrumento.reduce((s, r) => s + r.capitalFinalReal, 0);
    const totalAportadoTotal  = cfg.capitalInicial + cfg.aportacionMensual * cfg.plazoAnios * 12;
    const gananciaTotal       = capitalFinalTotal - totalAportadoTotal;
    const rendimientoTotal    = totalAportadoTotal > 0 ? (gananciaTotal / totalAportadoTotal) * 100 : 0;
    const riesgoGlobal        = calcularRiesgoGlobal(instrs);

    const mejor    = resultadosPorInstrumento.reduce((a, b) => a.capitalFinal > b.capitalFinal ? a : b);
    const estable  = resultadosPorInstrumento.reduce((a, b) => a.coefVar < b.coefVar ? a : b);
    const masRiesgo = resultadosPorInstrumento.reduce((a, b) =>
        a.instrumento.volatilidad > b.instrumento.volatilidad ? a : b);

    const recomendaciones = generarRecomendaciones({
        cfg, resultadosPorInstrumento, riesgoGlobal,
        gananciaTotal, rendimientoTotal
    });

    const labels = ['Inicio', ...Array.from({ length: cfg.plazoAnios }, (_, i) => `Año ${i + 1}`)];
    const series = resultadosPorInstrumento.map(r => ({
        nombre: r.instrumento.nombre,
        riesgo: r.instrumento.riesgo,
        valores: r.datosAnuales.map(d => d.capital)
    }));
    if (n > 1) {
        const totalSerie = labels.map((_, yi) =>
            resultadosPorInstrumento.reduce((s, r) => s + (r.datosAnuales[yi]?.capital ?? 0), 0)
        );
        series.push({ nombre: 'Portafolio total', riesgo: null, valores: totalSerie, esTotal: true });
    }
    const capitalInvertidoSerie = labels.map((_, yi) =>
        cfg.capitalInicial + cfg.aportacionMensual * 12 * yi
    );

    return {
        resultadosPorInstrumento,
        tablaAnual,
        capitalFinalTotal:  Math.round(capitalFinalTotal * 100) / 100,
        capitalFinalReal:   Math.round(capitalFinalReal * 100) / 100,
        totalAportadoTotal: Math.round(totalAportadoTotal * 100) / 100,
        gananciaTotal:      Math.round(gananciaTotal * 100) / 100,
        rendimientoTotal:   Math.round(rendimientoTotal * 100) / 100,
        riesgoGlobal,
        mejorInstrumento:   mejor.instrumento.nombre,
        masEstable:         estable.instrumento.nombre,
        mayorRiesgo:        masRiesgo.instrumento.nombre,
        recomendaciones,
        datosGrafica: { labels, series, capitalInvertidoSerie }
    };
}

// ── NAVEGACIÓN ────────────────────────────────────────────────────────────────

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

// ── PASO 1: CONFIGURACIÓN ─────────────────────────────────────────────────────

function leerConfig() {
    state.config.nombre            = ($('cfg-nombre').value || '').trim();
    state.config.capitalInicial    = parseInt($('cfg-capital').value, 10) || 0;
    state.config.plazoAnios        = parseInt($('cfg-plazo').value, 10) || 1;
    state.config.aportacionMensual = parseInt($('cfg-aportacion').value, 10) || 0;
    state.config.numInversiones    = parseInt($('cfg-num').value, 10) || 1;
    state.config.inflacion         = parseFloat($('cfg-inflacion').value) || 4.50;
}

function siguientePaso1() {
    const { valid, errors } = validarPaso1();
    if (!valid) {
        alertaAdvertencia(errors.join('\n'), { title: 'Revisa los datos', duration: 6000 });
        return;
    }
    leerConfig();
    renderInstrumentSelects();
    irAPaso(2);
}

// ── PASO 2: INSTRUMENTOS ──────────────────────────────────────────────────────

function renderInstrumentSelects() {
    const container = $('instruments-container');
    const n = state.config.numInversiones;
    container.innerHTML = '';

    const grupos = [
        { label: '🟢 Bajo riesgo',  keys: ['cetes','bonddia','sofipos','pagare','udibonos'] },
        { label: '🟡 Riesgo medio', keys: ['sp500','fibras','acciones_div','crowdfunding','fondos_mixtos'] },
        { label: '🔴 Alto riesgo',  keys: ['bitcoin','ethereum','tech_stocks','p2p','startups'] }
    ];

    for (let i = 1; i <= n; i++) {
        const div = document.createElement('div');
        div.className = 'instrument-selector';
        div.id = `instr-box-${i}`;

        const optsHtml = grupos.map(g => `
            <optgroup label="${g.label}">
                ${g.keys.map(k => `<option value="${k}">${INSTRUMENTOS[k].nombre} — ${(INSTRUMENTOS[k].tasa_base * 100).toFixed(1)}% base</option>`).join('')}
            </optgroup>
        `).join('');

        div.innerHTML = `
            <label>Inversión ${i}</label>
            <select id="instr-select-${i}">
                <option value="">-- Elige un instrumento --</option>
                ${optsHtml}
            </select>
            <div class="instrument-info" id="instr-info-${i}" style="display:none">
                <span class="risk-badge" id="instr-risk-${i}"></span>
                <span class="instr-desc" id="instr-desc-${i}"></span>
            </div>
        `;
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
    const riskSpan = $(`instr-risk-${idx}`);
    const descSpan = $(`instr-desc-${idx}`);
    const box = $(`instr-box-${idx}`);

    if (!val || !INSTRUMENTOS[val]) {
        if (infoDiv) infoDiv.style.display = 'none';
        if (box) box.classList.remove('has-value');
        return;
    }
    const instr = INSTRUMENTOS[val];
    const meta  = RIESGO_META[instr.riesgo];

    riskSpan.className = `risk-badge ${instr.riesgo}`;
    riskSpan.textContent = `${meta.emoji} ${meta.label}`;
    descSpan.textContent = instr.descripcion;
    infoDiv.style.display = 'flex';
    box.classList.add('has-value');
}

function actualizarRiesgoPreview() {
    const seleccionados = obtenerInstrumentosSeleccionados();
    const preview = $('risk-preview');
    if (!preview) return;

    if (seleccionados.length === 0) {
        preview.innerHTML = '<span>Selecciona instrumentos para ver el riesgo del portafolio</span>';
        return;
    }

    const riesgoGlobal = calcularRiesgoGlobal(seleccionados);
    const meta = RIESGO_META[riesgoGlobal];
    preview.innerHTML = `
        <span class="risk-indicator">${meta.emoji}</span>
        <div>
            <strong>Riesgo global del portafolio: <span style="color:${meta.color}">${meta.label}</span></strong>
            <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">
                ${seleccionados.map(i => i.nombre).join(' · ')}
            </div>
        </div>
    `;
}

function obtenerInstrumentosSeleccionados() {
    const n = state.config.numInversiones;
    const res = [];
    for (let i = 1; i <= n; i++) {
        const val = $(`instr-select-${i}`)?.value;
        if (val && INSTRUMENTOS[val]) res.push(INSTRUMENTOS[val]);
    }
    return res;
}

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
    state.simulacionGuardada = false;  // reset flag al calcular nueva simulación
    alertaInfo('Ejecutando simulación...', { duration: 1500 });

    setTimeout(() => {
        try {
            state.resultados = calcularSimulacion();
            irAPaso(3);
            renderResultados(state.resultados);
            // Restaurar botón guardar para esta nueva simulación
            const btnGuardar = $('btn-guardar');
            if (btnGuardar) {
                btnGuardar.textContent = '💾 Guardar en historial';
                btnGuardar.disabled = false;
            }
        } catch (e) {
            console.error(e);
            alertaError('Error al calcular la simulación.');
        }
    }, 200);
}

// ── PASO 3: RESULTADOS ────────────────────────────────────────────────────────

function renderResultados(r) {
    const cfg = state.config;

    $('res-capital').textContent     = fmtMXN(r.capitalFinalTotal);
    $('res-aportado').textContent    = fmtMXN(r.totalAportadoTotal);
    $('res-ganancia').textContent    = fmtMXN(r.gananciaTotal);
    $('res-ganancia').style.color    = r.gananciaTotal >= 0 ? 'var(--success)' : 'var(--danger)';
    $('res-rendimiento').textContent = fmtPct(r.rendimientoTotal);
    $('res-rendimiento').style.color = r.rendimientoTotal >= 0 ? 'var(--success)' : 'var(--danger)';
    $('res-real').textContent        = fmtMXN(r.capitalFinalReal);

    const rm = RIESGO_META[r.riesgoGlobal];
    const riskEl = $('res-riesgo');
    riskEl.textContent = `${rm.emoji} ${rm.label}`;
    riskEl.className = `risk-badge ${r.riesgoGlobal}`;

    renderGrafica(r.datosGrafica);
    renderTablaAnual(r.tablaAnual, r.resultadosPorInstrumento);

    $('ana-mejor').textContent   = r.mejorInstrumento;
    $('ana-estable').textContent = r.masEstable;
    $('ana-riesgo').textContent  = r.mayorRiesgo;

    const recList = $('rec-list');
    recList.innerHTML = r.recomendaciones.map(rec => `
        <div class="rec-item ${rec.tipo}">
            <div class="rec-icon">${rec.icono}</div>
            <div>
                <div class="rec-title">${rec.titulo}</div>
                <div class="rec-text">${rec.mensaje}</div>
            </div>
        </div>
    `).join('');

    $('res-nombre').value = `${state.instrumentosSeleccionados.map(i => i.nombre).join(' + ')} · ${cfg.plazoAnios} años`;
}

function renderGrafica(gData) {
    const ctx = $('inv-chart').getContext('2d');
    if (state.chartInstance) { state.chartInstance.destroy(); state.chartInstance = null; }

    const datasets = gData.series.map((s, idx) => ({
        label: s.nombre,
        data: s.valores,
        borderColor: s.esTotal ? '#8e44ad' : COLORES_LINEA[idx % COLORES_LINEA.length],
        backgroundColor: 'transparent',
        borderWidth: s.esTotal ? 3 : 2,
        borderDash: s.esTotal ? [6, 4] : [],
        pointRadius: 4,
        tension: 0.35,
        fill: false
    }));

    datasets.push({
        label: 'Capital invertido',
        data: gData.capitalInvertidoSerie,
        borderColor: '#b2bec3',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [8, 5],
        pointRadius: 0,
        tension: 0,
        fill: false
    });

    state.chartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: gData.labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'bottom' },
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
                    ticks: { callback: v => '$' + fmt(v) }
                }
            }
        }
    });
}

function renderTablaAnual(tabla, resultados) {
    const thead = $('tabla-thead');
    const tbody = $('tabla-tbody');

    let thHtml = '<th>Año</th>';
    resultados.forEach(r => { thHtml += `<th>${r.instrumento.nombre}</th>`; });
    if (resultados.length > 1) thHtml += '<th>Total</th>';
    thHtml += '<th>Total real (−inflación)</th>';
    thead.innerHTML = thHtml;

    tbody.innerHTML = tabla.map(f => {
        let tdHtml = `<td>${f.año}</td>`;
        resultados.forEach((_, idx) => {
            tdHtml += `<td>${fmtMXN(f[`i${idx + 1}`] || 0)}</td>`;
        });
        if (resultados.length > 1) tdHtml += `<td><strong>${fmtMXN(f.total)}</strong></td>`;
        tdHtml += `<td style="color:var(--text-muted)">${fmtMXN(f.totalReal)}</td>`;
        return `<tr>${tdHtml}</tr>`;
    }).join('');
}

// ── GUARDAR SIMULACIÓN ────────────────────────────────────────────────────────

async function guardarSimulacion() {
    const r = state.config;
    if (!state.resultados) return alertaError('No hay resultados que guardar.');
    if (state.simulacionGuardada) {
        alertaAdvertencia('Esta simulación ya fue guardada. Crea una nueva simulación para guardar otra.');
        return;
    }

    const nombre = $('res-nombre').value.trim();
    if (!nombre) return alertaAdvertencia('Ingresa un nombre para guardar la simulación.');

    const cfg = state.config;
    const res = state.resultados;

    const simulacionData = {
        nombre,
        capital_inicial:    cfg.capitalInicial,
        plazo_anios:        cfg.plazoAnios,
        aportacion_mensual: cfg.aportacionMensual,
        inflacion:          cfg.inflacion,
        num_instrumentos:   state.instrumentosSeleccionados.length,
        riesgo_global:      res.riesgoGlobal,
        capital_final:      res.capitalFinalTotal,
        total_aportado:     res.totalAportadoTotal,
        ganancia_total:     res.gananciaTotal,
        rendimiento_pct:    res.rendimientoTotal,
        capital_final_real: res.capitalFinalReal,
        analisis:           JSON.stringify({
            mejorInstrumento: res.mejorInstrumento,
            masEstable:       res.masEstable,
            mayorRiesgo:      res.mayorRiesgo,
            recomendaciones:  res.recomendaciones
        }),
        datos_grafica: JSON.stringify(res.datosGrafica),
        tabla_anual:   JSON.stringify(res.tablaAnual)
    };

    const instrumentosData = state.instrumentosSeleccionados.map((instr, idx) => {
        const resultado = res.resultadosPorInstrumento[idx];
        return {
            posicion:           idx + 1,
            instrumento_id:     instr.id,
            instrumento_nombre: instr.nombre,
            riesgo:             instr.riesgo,
            tasa_base:          instr.tasa_base,
            capital_asignado:   cfg.capitalInicial / state.instrumentosSeleccionados.length,
            capital_final:      resultado.capitalFinal,
            ganancia:           resultado.ganancia,
            rendimiento_pct:    resultado.rendimiento
        };
    });

    try {
        const resp = await fetch(`${API}/inversiones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.userId, simulacion: simulacionData, instrumentos: instrumentosData })
        });
        const data = await resp.json();
        if (data.success) {
            state.simulacionGuardada = true;
            alertaExito('Simulación guardada en tu historial.', { duration: 3000 });
            const btnGuardar = $('btn-guardar');
            if (btnGuardar) {
                btnGuardar.textContent = '✓ Guardada';
                btnGuardar.disabled = true;
            }
        } else {
            alertaError(data.message || 'Error al guardar.');
        }
    } catch (e) {
        console.error(e);
        alertaError('Error de conexión al guardar.');
    }
}

// ── HISTORIAL ────────────────────────────────────────────────────────────────

async function cargarHistorial() {
    try {
        const resp = await fetch(`${API}/inversiones/historial/${state.userId}`);
        const data = await resp.json();
        if (data.success) {
            state.historial = data.data;
            renderHistorial();
        }
    } catch (e) {
        console.error(e);
        alertaError('Error al cargar el historial.');
    }
}

function renderHistorial() {
    const container = $('historial-list');
    state.compareSeleccion.clear();
    actualizarBtnComparar();

    if (!state.historial.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <p>Aún no tienes simulaciones guardadas.<br>¡Crea tu primera simulación!</p>
            </div>`;
        return;
    }

    container.innerHTML = state.historial.map(sim => {
        const instrs = (sim.simulation_instruments || [])
            .sort((a, b) => a.posicion - b.posicion)
            .map(i => `<span class="risk-badge ${i.riesgo}" style="font-size:0.7rem;padding:2px 8px">${i.instrumento_nombre}</span>`)
            .join('');

        const gananciaClass = sim.ganancia_total >= 0 ? '' : 'neg';
        const fecha = new Date(sim.created_at).toLocaleDateString('es-MX', { year:'numeric', month:'short', day:'numeric' });
        // Mostrar inflación si existe en los datos guardados
        const inflacionLabel = sim.inflacion != null ? `· Infl. ${sim.inflacion}%` : '';

        return `
        <div class="historial-card" id="hist-${sim.id}">
            <input type="checkbox" class="compare-check" data-id="${sim.id}"
                title="Seleccionar para comparar" style="width:18px;height:18px;cursor:pointer;accent-color:var(--secondary)">
            <div class="hist-info">
                <div class="hist-nombre">${sim.nombre}</div>
                <div class="hist-meta" style="gap:8px;margin-bottom:6px">
                    <span>${fecha}</span>
                    <span>$${fmt(sim.capital_inicial)} · ${sim.plazo_anios} años · ${sim.num_instrumentos} instrumento(s) ${inflacionLabel}</span>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap">${instrs}</div>
            </div>
            <div class="hist-stats">
                <div class="hist-stat">
                    <div class="hs-val ${gananciaClass}">${fmtMXN(sim.capital_final || 0)}</div>
                    <div class="hs-label">Capital final</div>
                </div>
                <div class="hist-stat">
                    <div class="hs-val ${gananciaClass}">${fmtPct(sim.rendimiento_pct || 0)}</div>
                    <div class="hs-label">Rendimiento</div>
                </div>
                <div class="hist-stat">
                    <span class="risk-badge ${sim.riesgo_global}">${RIESGO_META[sim.riesgo_global]?.emoji || ''} ${RIESGO_META[sim.riesgo_global]?.label || ''}</span>
                    <div class="hs-label" style="margin-top:2px">Riesgo</div>
                </div>
            </div>
            <div class="hist-actions">
                <button class="btn-secondary btn-small" onclick="verSimulacion(${sim.id})">Ver</button>
                <button class="btn-danger btn-small" onclick="eliminarSimulacion(${sim.id})">Eliminar</button>
            </div>
        </div>`;
    }).join('');

    document.querySelectorAll('.compare-check').forEach(cb => {
        cb.addEventListener('change', () => {
            const id = parseInt(cb.dataset.id);
            if (cb.checked) state.compareSeleccion.add(id);
            else            state.compareSeleccion.delete(id);
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

window.verSimulacion = async (id) => {
    try {
        const resp = await fetch(`${API}/inversiones/${id}?userId=${state.userId}`);
        const data = await resp.json();
        if (!data.success) return alertaError('No se pudo cargar la simulación.');

        const sim = data.data;
        const grafData = sim.datos_grafica ? JSON.parse(sim.datos_grafica) : null;
        if (grafData) {
            navegarA('nueva');
            irAPaso(3);
            $('res-capital').textContent     = fmtMXN(sim.capital_final || 0);
            $('res-aportado').textContent    = fmtMXN(sim.total_aportado || 0);
            $('res-ganancia').textContent    = fmtMXN(sim.ganancia_total || 0);
            $('res-rendimiento').textContent = fmtPct(sim.rendimiento_pct || 0);
            $('res-real').textContent        = fmtMXN(sim.capital_final_real || 0);
            const rm = RIESGO_META[sim.riesgo_global] || RIESGO_META.medio;
            $('res-riesgo').textContent = `${rm.emoji} ${rm.label}`;
            $('res-riesgo').className   = `risk-badge ${sim.riesgo_global}`;
            $('res-nombre').value = sim.nombre;

            // Marcar como ya guardada para que no se pueda guardar dos veces desde la vista
            state.simulacionGuardada = true;
            const btnGuardar = $('btn-guardar');
            if (btnGuardar) {
                btnGuardar.textContent = '✓ Ya guardada';
                btnGuardar.disabled = true;
            }

            renderGrafica(grafData);

            const tablaAnual  = sim.tabla_anual ? JSON.parse(sim.tabla_anual) : [];
            const instrDB = (sim.simulation_instruments || []).sort((a, b) => a.posicion - b.posicion);
            const fakeResultados = instrDB.map(i => ({
                instrumento: { nombre: i.instrumento_nombre, riesgo: i.riesgo },
                capitalFinal: i.capital_final, ganancia: i.ganancia
            }));
            renderTablaAnual(tablaAnual, fakeResultados);

            const analisis = sim.analisis ? JSON.parse(sim.analisis) : {};
            $('ana-mejor').textContent   = analisis.mejorInstrumento   || '—';
            $('ana-estable').textContent = analisis.masEstable          || '—';
            $('ana-riesgo').textContent  = analisis.mayorRiesgo         || '—';

            const recs = analisis.recomendaciones || [];
            $('rec-list').innerHTML = recs.map(rec => `
                <div class="rec-item ${rec.tipo}">
                    <div class="rec-icon">${rec.icono}</div>
                    <div>
                        <div class="rec-title">${rec.titulo}</div>
                        <div class="rec-text">${rec.mensaje}</div>
                    </div>
                </div>`).join('');
        }
    } catch (e) {
        console.error(e);
        alertaError('Error al cargar simulación.');
    }
};

window.eliminarSimulacion = async (id) => {
    const ok = await alertaConfirmacion('¿Eliminar esta simulación? No se puede deshacer.', '⚠️ Confirmar');
    if (!ok) return;
    try {
        const resp = await fetch(`${API}/inversiones/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.userId })
        });
        const data = await resp.json();
        if (data.success) {
            alertaExito('Simulación eliminada.');
            cargarHistorial();
        } else { alertaError(data.message); }
    } catch (e) { alertaError('Error al eliminar.'); }
};

// ── COMPARAR ──────────────────────────────────────────────────────────────────

async function iniciarComparacion() {
    const ids = [...state.compareSeleccion];
    if (ids.length < 2) return alertaAdvertencia('Selecciona al menos 2 simulaciones.');

    navegarA('comparar');
    $('compare-container').innerHTML = '<p style="color:var(--text-muted);padding:20px">Cargando datos...</p>';

    try {
        const sims = await Promise.all(ids.map(async id => {
            const r = await fetch(`${API}/inversiones/${id}?userId=${state.userId}`);
            return (await r.json()).data;
        }));

        renderComparacion(sims);
    } catch (e) {
        console.error(e);
        alertaError('Error al cargar simulaciones para comparar.');
    }
}

function renderComparacion(sims) {
    const container = $('compare-container');

    const filas = [
        { label: 'Capital inicial',    key: s => fmtMXN(s.capital_inicial) },
        { label: 'Plazo',              key: s => `${s.plazo_anios} años` },
        { label: 'Aportación mensual', key: s => fmtMXN(s.aportacion_mensual || 0) },
        { label: 'Inflación usada',    key: s => s.inflacion != null ? `${s.inflacion}%` : '—' },
        { label: 'Capital final',      key: s => `<strong>${fmtMXN(s.capital_final || 0)}</strong>` },
        { label: 'Ganancia total',     key: s => `<span style="color:${(s.ganancia_total||0)>=0?'var(--success)':'var(--danger)'}">${fmtMXN(s.ganancia_total || 0)}</span>` },
        { label: 'Rendimiento',        key: s => `<span style="color:${(s.rendimiento_pct||0)>=0?'var(--success)':'var(--danger)'}">${fmtPct(s.rendimiento_pct || 0)}</span>` },
        { label: 'Capital real (−inf.)',key: s => fmtMXN(s.capital_final_real || 0) },
        { label: 'Riesgo global',      key: s => `<span class="risk-badge ${s.riesgo_global}">${RIESGO_META[s.riesgo_global]?.emoji} ${RIESGO_META[s.riesgo_global]?.label}</span>` }
    ];

    const encabezado = `<tr><th style="text-align:left">Métrica</th>${sims.map((s, i) => `<th>Sim ${i + 1}: ${s.nombre}</th>`).join('')}</tr>`;
    const cuerpo = filas.map(f =>
        `<tr><td style="font-weight:700;color:var(--primary)">${f.label}</td>${sims.map(s => `<td>${f.key(s)}</td>`).join('')}</tr>`
    ).join('');

    container.innerHTML = `
        <div class="inv-card" style="margin-bottom:20px">
            <h3>Tabla comparativa</h3>
            <div class="inv-table-wrapper">
                <table class="inv-table">
                    <thead>${encabezado}</thead>
                    <tbody>${cuerpo}</tbody>
                </table>
            </div>
        </div>
        <div class="inv-card">
            <h3>Gráfica comparativa — Capital final por simulación</h3>
            <div class="compare-chart-wrapper">
                <canvas id="compare-chart"></canvas>
            </div>
        </div>`;

    if (state.compareChartInstance) { state.compareChartInstance.destroy(); }
    const ctx = document.getElementById('compare-chart').getContext('2d');
    state.compareChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sims.map((s, i) => `Sim ${i + 1}`),
            datasets: [
                {
                    label: 'Capital final',
                    data: sims.map(s => s.capital_final || 0),
                    backgroundColor: COLORES_LINEA.map(c => c + 'CC'),
                    borderColor: COLORES_LINEA,
                    borderWidth: 2,
                    borderRadius: 6
                },
                {
                    label: 'Capital invertido',
                    data: sims.map(s => s.total_aportado || s.capital_inicial),
                    backgroundColor: '#b2bec350',
                    borderColor: '#b2bec3',
                    borderWidth: 2,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'bottom' },
                tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmtMXN(c.parsed.y)}` } } },
            scales: { y: { ticks: { callback: v => '$' + fmt(v) } } }
        }
    });
}

// ── PANTALLA INICIO ───────────────────────────────────────────────────────────

function renderInicio() {
    const el = $('inicio-stats');
    if (!el) return;
    if (!state.historial.length) {
        el.innerHTML = `
            <div class="empty-state" style="padding:30px">
                <div class="empty-icon">📊</div>
                <p>Aún no tienes simulaciones. ¡Crea la primera!</p>
            </div>`;
        return;
    }

    const mejor = state.historial.reduce((a, b) => (a.rendimiento_pct || 0) > (b.rendimiento_pct || 0) ? a : b);
    el.innerHTML = `
        <div class="form-grid" style="margin:0">
            <div class="summary-card primary">
                <div class="card-label">Total de simulaciones</div>
                <div class="card-value">${state.historial.length}</div>
            </div>
            <div class="summary-card success">
                <div class="card-label">Mejor rendimiento</div>
                <div class="card-value">${fmtPct(mejor.rendimiento_pct || 0)}</div>
                <div class="card-sub">${mejor.nombre}</div>
            </div>
            <div class="summary-card accent">
                <div class="card-label">Mayor capital final</div>
                <div class="card-value">${fmtMXN(mejor.capital_final || 0)}</div>
                <div class="card-sub">${mejor.plazo_anios} años · ${mejor.riesgo_global}</div>
            </div>
        </div>`;
}

// ── INICIALIZACIÓN ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    if (!protectRoute()) return;
    const user = getAuthData();
    state.userId = user.id;

    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => navegarA(btn.dataset.section));
    });

    // Wizard navigation
    $('btn-paso1-sig')?.addEventListener('click', siguientePaso1);
    $('btn-paso2-ant')?.addEventListener('click', () => irAPaso(1));
    $('btn-simular')?.addEventListener('click', simular);
    $('btn-paso3-ant')?.addEventListener('click', () => irAPaso(2));
    $('btn-guardar')?.addEventListener('click', guardarSimulacion);

    // ── Nueva simulación: resetear todo el estado ──────────────────────────
    $('btn-nueva-sim')?.addEventListener('click', () => {
        resetSimulationState();
        navegarA('nueva');
        irAPaso(1);
    });

    $('btn-comparar-sel')?.addEventListener('click', iniciarComparacion);

    // Número de inversiones cambia → actualizar estado en paso 1
    $('cfg-num')?.addEventListener('change', () => {
        const n = parseInt($('cfg-num').value, 10) || 1;
        state.config.numInversiones = n;
    });

    // Aplicar restricciones de input a los campos del paso 1
    const camposEntero = [
        { id: 'cfg-capital',    min: 0, max: 999999999 },
        { id: 'cfg-aportacion', min: 0, max: 99999999  },
        { id: 'cfg-plazo',      min: 1, max: 50        }
    ];
    camposEntero.forEach(({ id, min, max }) => {
        const el = $(id);
        if (el) aplicarRestriccionEntero(el, min, max);
    });

    const inflacionEl = $('cfg-inflacion');
    if (inflacionEl) aplicarRestriccionDecimal(inflacionEl, -5.00, 100.00);

    // Logout
    document.getElementById('logout-btn-inv')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const ok = await alertaConfirmacion('¿Cerrar sesión?', '👋 Salir');
        if (ok) logout();
    });

    // Cargar historial en segundo plano para el inicio
    try {
        const resp = await fetch(`${API}/inversiones/historial/${state.userId}`);
        const data = await resp.json();
        if (data.success) state.historial = data.data;
    } catch (e) { /* silencioso */ }

    navegarA('inicio');
});