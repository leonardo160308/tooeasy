/* assets/js/pages/dashboard.js */

import { initAppDownload } from '../modules/app-download.js';
initAppDownload();

import {
    getDashboardFixed,
    updateGoal,
    getDashboardData,
    createMovement,
    updateMovement,
    deleteMovement
} from '../modules/api.js';
import { initOfflineBanner } from '../modules/offline.js';
import { initOnboarding, restartOnboarding } from '../modules/onboarding.js';
import { alertaAdvertencia, alertaError } from '../modules/alerts.js';

import {
    protectRoute,
    getAuthData,
    logout
} from '../modules/auth.js';

const CATEGORIAS = {
    income: [
        "Salario","Trabajo extra","Freelance","Comisiones","Propinas","Ventas",
        "Negocio propio","Ingresos online","Publicidad","Intereses","Dividendos",
        "Inversiones","Renta recibida","Premios o sorteos","Beca","Apoyo familiar",
        "Reembolso","Devoluciones","Bonos","Otros ingresos"
    ],
    expense: [
        "Renta / Hipoteca","Electricidad","Agua","Gas","Internet",
        "Mantenimiento del hogar","Supermercado","Restaurantes","Comida rápida",
        "Delivery","Café / Snacks","Gasolina","Transporte público","Taxi / Uber",
        "Estacionamiento","Peajes","Mantenimiento del vehículo","Ropa","Calzado",
        "Tecnología","Electrónica","Accesorios","Videojuegos","Streaming","Cine",
        "Eventos","Hobbies","Cursos","Libros","Material escolar","Medicamentos",
        "Consultas médicas","Seguro médico","Gimnasio","Pago de tarjeta","Préstamos",
        "Comisiones bancarias","Mascotas","Regalos","Donaciones","Viajes",
        "Imprevistos","Suscripciones","Otros gastos"
    ]
};

function llenarCategorias(selectEl, tipo, valorActual = '') {
    const lista = CATEGORIAS[tipo] || [];
    selectEl.innerHTML = '<option value="">-- Selecciona una categoría --</option>';
    lista.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        if (cat === valorActual) opt.selected = true;
        selectEl.appendChild(opt);
    });
}

document.addEventListener('DOMContentLoaded', async () => {

    if (!protectRoute()) return;

    const usuarioLogueado = getAuthData();
    const userId = usuarioLogueado.id;

    const fechaActual = new Date();
    let mesVisualizado = fechaActual.getMonth();
    let anioVisualizado = fechaActual.getFullYear();

    let datosFijos = {
        ingresoFijo: 0, egresoFijo: 0, metaNombre: '', metaCantidad: 0,
        savingMethod: 'automatic_50_30_20', savingPercentage: null, manualSavingAmount: null
    };
    let movimientosDB = new Map();
    let chartInstance = null;
    let diaSeleccionado = null;
    let movimientoEnEdicion = null;

    // ─── TIPO DE GRÁFICO ACTIVO (1, 2 o 3) ───────────────────────────────
    let currentChartType = 1;

    // --- REFERENCIAS AL DOM ---
    const inpIngreso     = document.getElementById('fixed-income');
    const inpEgreso      = document.getElementById('fixed-expense');
    const inpMetaNombre  = document.getElementById('goal-name');
    const inpMetaMonto   = document.getElementById('goal-amount');
    const txtAhorro      = document.getElementById('calculated-savings');
    const txtRestante    = document.getElementById('calculated-remaining');
    const txtEstado      = document.getElementById('goal-status');
    const lblMesYear     = document.getElementById('current-month-year');
    const gridCalendario = document.getElementById('calendar-grid');
    const btnPrevMonth   = document.getElementById('prev-month');
    const btnNextMonth   = document.getElementById('next-month');
    const modal          = document.getElementById('day-modal');
    const btnCloseModal  = document.getElementById('close-modal');
    const formMovimiento = document.getElementById('transaction-form');
    const modalTitle     = document.getElementById('modal-date-title');
    const modalIncome    = document.getElementById('day-income');
    const modalExpense   = document.getElementById('day-expense');
    const modalTotal     = document.getElementById('day-total');
    const listMovimientos = document.getElementById('movements-list');
    const selTipo        = document.getElementById('trans-type');
    const selCategoria   = document.getElementById('trans-category');
    const editContainer  = document.getElementById('edit-movement-container');
    const selEditTipo    = document.getElementById('edit-trans-type');
    const selEditCat     = document.getElementById('edit-trans-category');
    const inpEditMonto   = document.getElementById('edit-trans-amount');
    const formEdicion    = document.getElementById('edit-transaction-form');
    const btnEditEliminar = document.getElementById('edit-btn-delete');
    const btnLogout       = document.getElementById('logout-btn') || document.querySelector('.btn-logout');

    // ── SAVING METHOD UI REFS ────────────────────────────────────────────
    const inpSavingPct    = document.getElementById('saving-pct');
    const inpSavingManual = document.getElementById('saving-manual');
    const savingsLabelEl  = document.getElementById('savings-label-text');
    const bdNeeds         = document.getElementById('bd-needs');
    const bdWants         = document.getElementById('bd-wants');
    const bdSavings       = document.getElementById('bd-savings');

    // ─── VALIDACIÓN DE AHORRO VS INGRESOS ────────────────────────────────────

    /**
     * Calcula el ingreso total del mes actualmente visualizado.
     */
    function calcularIngresoTotalActual() {
        let variableIncome = 0;
        movimientosDB.forEach((data, fecha) => {
            const [y, m] = fecha.split('-');
            if (parseInt(y) === anioVisualizado && parseInt(m) === (mesVisualizado + 1)) {
                variableIncome += data.ingresos.reduce((s, i) => s + i.monto, 0);
            }
        });
        return datosFijos.ingresoFijo + variableIncome;
    }

    /**
     * Valida que el ahorro objetivo no supere los ingresos reales.
     * @returns {{ tipo: 'ok'|'advertencia'|'error', mensaje: string|null }}
     */
    function validarAhorroVsIngresos(ahorroObjetivo, ingresoTotal) {
        if (ingresoTotal <= 0) return { tipo: 'sin_datos', mensaje: null };

        if (ahorroObjetivo > ingresoTotal) {
            const exceso = (ahorroObjetivo - ingresoTotal).toFixed(2);
            return {
                tipo: 'error',
                mensaje: `La cantidad de ahorro ($${ahorroObjetivo.toFixed(2)}) no puede ser mayor a tus ingresos disponibles ($${ingresoTotal.toFixed(2)}). Excedente: $${exceso}.`
            };
        }

        const porcentaje = (ahorroObjetivo / ingresoTotal) * 100;
        if (porcentaje > 80) {
            return {
                tipo: 'advertencia',
                mensaje: `Estás destinando el ${Math.round(porcentaje)}% de tus ingresos al ahorro. Asegúrate de que te alcance para tus gastos esenciales.`
            };
        }

        return { tipo: 'ok', mensaje: null };
    }

    /**
     * Actualiza el elemento visual de validación de ahorro en el DOM.
     */
    function mostrarValidacionAhorro(validacion) {
        const msgEl = document.getElementById('savings-validation-msg');
        if (!msgEl) return;

        msgEl.className = 'savings-validation-msg';
        msgEl.textContent = '';

        if (validacion.tipo === 'error') {
            msgEl.textContent = validacion.mensaje;
            msgEl.classList.add('sv-error', 'sv-visible');
        } else if (validacion.tipo === 'advertencia') {
            msgEl.textContent = validacion.mensaje;
            msgEl.classList.add('sv-warning', 'sv-visible');
        }
    }

    // --- CARGA INICIAL ---
    async function cargarDatosDelServidor() {
        try {
            const [fixedResponse, movementsResponse] = await Promise.all([
                getDashboardFixed(userId),
                getDashboardData(userId)
            ]);

            if (fixedResponse.success) {
                const data = fixedResponse.data;
                datosFijos = {
                    ingresoFijo:        parseFloat(data.ingreso_fijo)          || 0,
                    egresoFijo:         parseFloat(data.egreso_fijo)           || 0,
                    metaNombre:         data.meta_nombre                       || '',
                    metaCantidad:       parseFloat(data.meta_cantidad)         || 0,
                    savingMethod:       data.saving_method                     || 'automatic_50_30_20',
                    savingPercentage:   data.saving_percentage   != null ? parseFloat(data.saving_percentage)   : null,
                    manualSavingAmount: data.manual_saving_amount != null ? parseFloat(data.manual_saving_amount) : null,
                };
                actualizarInputsFijos();
                actualizarSavingMethodUI();
            }
            if (movementsResponse.success) {
                procesarMovimientosParaMap(movementsResponse.history);
            }
            actualizarDashboard();
            renderizarCalendario();
        } catch (error) {
            console.error('Error cargando dashboard:', error);
            alert('Error al cargar tus datos. Revisa tu conexión.');
        }
    }

    function actualizarInputsFijos() {
        inpIngreso.value    = datosFijos.ingresoFijo  || '';
        inpEgreso.value     = datosFijos.egresoFijo   || '';
        inpMetaNombre.value = datosFijos.metaNombre   || '';
        inpMetaMonto.value  = datosFijos.metaCantidad || '';
    }

    function procesarMovimientosParaMap(listaMovimientos) {
        movimientosDB = new Map();
        listaMovimientos.forEach(mov => {
            const fechaKey = mov.fecha.split('T')[0];
            if (!movimientosDB.has(fechaKey)) {
                movimientosDB.set(fechaKey, { ingresos: [], egresos: [] });
            }
            const diaData = movimientosDB.get(fechaKey);
            const item = { id: mov.id, categoria: mov.categoria, monto: parseFloat(mov.monto), tipo: mov.tipo };
            if (mov.tipo === 'income') diaData.ingresos.push(item);
            else diaData.egresos.push(item);
        });
    }

    async function guardarDatosFijos() {
        const payload = {
            ingreso_fijo:         parseFloat(inpIngreso.value)   || 0,
            egreso_fijo:          parseFloat(inpEgreso.value)    || 0,
            meta_nombre:          inpMetaNombre.value             || '',
            meta_cantidad:        parseFloat(inpMetaMonto.value) || 0,
            saving_method:        datosFijos.savingMethod,
            saving_percentage:    datosFijos.savingPercentage,
            manual_saving_amount: datosFijos.manualSavingAmount,
        };
        datosFijos = {
            ingresoFijo:        payload.ingreso_fijo,
            egresoFijo:         payload.egreso_fijo,
            metaNombre:         payload.meta_nombre,
            metaCantidad:       payload.meta_cantidad,
            savingMethod:       payload.saving_method,
            savingPercentage:   payload.saving_percentage,
            manualSavingAmount: payload.manual_saving_amount,
        };
        actualizarDashboard();
        try {
            await updateGoal(userId, payload);
        } catch (error) {
            console.error('Error al guardar datos fijos:', error);
        }
    }

    function limitarNumero(input, maxEnteros, maxDecimales = 2) {
        input.addEventListener('input', () => {
            let valor = input.value;
            valor = valor.replace(/[^\d.]/g, '');
            const partes = valor.split('.');
            if (partes.length > 2) valor = partes[0] + '.' + partes.slice(1).join('');
            let [enteros, decimales] = valor.split('.');
            if (enteros === '' && valor.startsWith('.')) enteros = '0';
            if (enteros && enteros.length > maxEnteros) enteros = enteros.slice(0, maxEnteros);
            if (decimales !== undefined) {
                decimales = decimales.slice(0, maxDecimales);
                valor = `${enteros}.${decimales}`;
            } else {
                valor = enteros || '';
            }
            input.value = valor;
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    // HELPERS PARA DATOS DE GRÁFICOS
    // ─────────────────────────────────────────────────────────────────────

    /** Obtiene todos los movimientos del mes/año visualizado */
    function getMovimientosMesActual() {
        const result = { ingresos: [], egresos: [] };
        movimientosDB.forEach((data, fecha) => {
            const [y, m] = fecha.split('-');
            if (parseInt(y) === anioVisualizado && parseInt(m) === (mesVisualizado + 1)) {
                result.ingresos.push(...data.ingresos);
                result.egresos.push(...data.egresos);
            }
        });
        return result;
    }

    /** Datos para Gráfico 1: Balance neto diario (incluye fijos distribuidos por día) */
    function buildChart1Data() {
        const diasEnMes = new Date(anioVisualizado, mesVisualizado + 1, 0).getDate();
        const labels = Array.from({ length: diasEnMes }, (_, i) => String(i + 1));
        const ingresos = new Array(diasEnMes).fill(0);
        const egresos  = new Array(diasEnMes).fill(0);
        const balance  = new Array(diasEnMes).fill(0);

        // Distribuir fijos uniformemente entre todos los días del mes
        const ingFijoPorDia = (datosFijos.ingresoFijo || 0) / diasEnMes;
        const egrFijoPorDia = (datosFijos.egresoFijo  || 0) / diasEnMes;
        for (let i = 0; i < diasEnMes; i++) {
            ingresos[i] = ingFijoPorDia;
            egresos[i]  = egrFijoPorDia;
        }

        // Sumar movimientos variables del mes
        movimientosDB.forEach((data, fecha) => {
            const [y, m, d] = fecha.split('-');
            if (parseInt(y) === anioVisualizado && parseInt(m) === (mesVisualizado + 1)) {
                const idx = parseInt(d) - 1;
                ingresos[idx] += data.ingresos.reduce((s, i) => s + i.monto, 0);
                egresos[idx]  += data.egresos.reduce((s, e) => s + e.monto, 0);
            }
        });

        for (let i = 0; i < diasEnMes; i++) {
            balance[i] = ingresos[i] - egresos[i];
        }

        return { labels, ingresos, egresos, balance };
    }

    /** Datos para Gráfico 2: Ingresos por categoría (incluye Ingreso Fijo) */
    function buildChart2Data() {
        const { ingresos } = getMovimientosMesActual();
        const totales = {};
        ingresos.forEach(mov => {
            const cat = mov.categoria || 'Otros ingresos';
            totales[cat] = (totales[cat] || 0) + mov.monto;
        });
        if (datosFijos.ingresoFijo > 0) {
            totales['Ingreso Fijo'] = (totales['Ingreso Fijo'] || 0) + datosFijos.ingresoFijo;
        }
        const labels = Object.keys(totales);
        const values = Object.values(totales);
        return { labels, values };
    }

    /** Datos para Gráfico 3: Egresos por categoría (incluye Egreso Fijo) */
    function buildChart3Data() {
        const { egresos } = getMovimientosMesActual();
        const totales = {};
        egresos.forEach(mov => {
            const cat = mov.categoria || 'Otros gastos';
            totales[cat] = (totales[cat] || 0) + mov.monto;
        });
        if (datosFijos.egresoFijo > 0) {
            totales['Egreso Fijo'] = (totales['Egreso Fijo'] || 0) + datosFijos.egresoFijo;
        }
        const labels = Object.keys(totales);
        const values = Object.values(totales);
        return { labels, values };
    }

    // ─────────────────────────────────────────────────────────────────────
    // INICIALIZAR Y ACTUALIZAR GRÁFICO
    // ─────────────────────────────────────────────────────────────────────

    function inicializarGrafica() {
        const ctx = document.getElementById('monthlyChart').getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    function actualizarGrafica() {
        const ctx = document.getElementById('monthlyChart').getContext('2d');

        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }

        if (currentChartType === 1) {
            _buildLineChart(ctx);
        } else if (currentChartType === 2) {
            _buildBarChartIngresos(ctx);
        } else {
            _buildBarChartEgresos(ctx);
        }
    }

    function _buildLineChart(ctx) {
        const { labels, ingresos, egresos, balance } = buildChart1Data();

        const allValues = [...ingresos, ...egresos, ...balance];
        const maxVal = Math.max(...allValues, 0);
        const minVal = Math.min(...balance, 0);

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Ingresos',
                        data: ingresos,
                        borderColor: '#2e7d32',
                        backgroundColor: 'rgba(46,125,50,0.08)',
                        borderWidth: 2,
                        pointRadius: 3,
                        tension: 0.3,
                        fill: false
                    },
                    {
                        label: 'Egresos',
                        data: egresos,
                        borderColor: '#c62828',
                        backgroundColor: 'rgba(198,40,40,0.08)',
                        borderWidth: 2,
                        pointRadius: 3,
                        tension: 0.3,
                        fill: false
                    },
                    {
                        label: 'Balance neto',
                        data: balance,
                        borderColor: '#1565C0',
                        backgroundColor: 'rgba(21,101,192,0.08)',
                        borderWidth: 2,
                        pointRadius: 3,
                        tension: 0.3,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        title: { display: true, text: 'Día del mes', font: { size: 12 } },
                        ticks: { autoSkip: false, maxRotation: 0, font: { size: 10 } }
                    },
                    y: {
                        suggestedMax: maxVal > 0 ? Math.ceil(maxVal * 1.15) : 100,
                        suggestedMin: minVal < 0 ? Math.floor(minVal * 1.15) : 0,
                        ticks: {
                            callback: v => '$' + v.toLocaleString()
                        }
                    }
                }
            }
        });
    }

    function _buildBarChartIngresos(ctx) {
        const { labels, values } = buildChart2Data();
        const maxVal = Math.max(...values, 0);

        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.length ? labels : ['Sin datos'],
                datasets: [{
                    label: 'Ingresos ($)',
                    data: values.length ? values : [0],
                    backgroundColor: 'rgba(46,125,50,0.75)',
                    borderColor: '#2e7d32',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 30,
                            font: { size: 10 },
                            autoSkip: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        suggestedMax: maxVal > 0 ? Math.ceil(maxVal * 1.15) : 100,
                        ticks: {
                            callback: v => '$' + v.toLocaleString()
                        }
                    }
                }
            }
        });
    }

    function _buildBarChartEgresos(ctx) {
        const { labels, values } = buildChart3Data();
        const maxVal = Math.max(...values, 0);

        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.length ? labels : ['Sin datos'],
                datasets: [{
                    label: 'Egresos ($)',
                    data: values.length ? values : [0],
                    backgroundColor: 'rgba(198,40,40,0.75)',
                    borderColor: '#c62828',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 30,
                            font: { size: 10 },
                            autoSkip: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        suggestedMax: maxVal > 0 ? Math.ceil(maxVal * 1.15) : 100,
                        ticks: {
                            callback: v => '$' + v.toLocaleString()
                        }
                    }
                }
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────────────────────────────

    async function init() {
        inicializarGrafica();
        await cargarDatosDelServidor();

        limitarNumero(inpIngreso, 8, 2);
        limitarNumero(inpEgreso, 8, 2);
        limitarNumero(inpMetaMonto, 9, 2);
        limitarNumero(document.getElementById('trans-amount'), 8, 2);
        limitarNumero(inpEditMonto, 8, 2);

        llenarCategorias(selCategoria, selTipo.value);
        selTipo.addEventListener('change', () => llenarCategorias(selCategoria, selTipo.value));
        selEditTipo.addEventListener('change', () => llenarCategorias(selEditCat, selEditTipo.value));

        [inpIngreso, inpEgreso, inpMetaMonto, inpMetaNombre].forEach(input => {
            input.addEventListener('change', guardarDatosFijos);
        });

        btnPrevMonth.addEventListener('click', () => cambiarMes(-1));
        btnNextMonth.addEventListener('click', () => cambiarMes(1));
        btnCloseModal.addEventListener('click', cerrarModal);
        window.addEventListener('click', e => { if (e.target === modal) cerrarModal(); });
        formMovimiento.addEventListener('submit', agregarMovimiento);
        formEdicion.addEventListener('submit', guardarEdicion);
        btnEditEliminar.addEventListener('click', eliminarDesdeEdicion);

        const btnCloseEdit = document.getElementById('btn-close-edit');
        if (btnCloseEdit) {
            btnCloseEdit.addEventListener('click', () => {
                ocultarFormEdicion();
            });
        }

        if (btnLogout) {
            btnLogout.addEventListener('click', e => { e.preventDefault(); logout(); });
        }

        // ── Pestañas de gráfico ──────────────────────────────────────────
        document.querySelectorAll('.chart-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.chart-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentChartType = parseInt(btn.dataset.chartType);
                actualizarGrafica();
            });
        });

        // ── Método de ahorro ─────────────────────────────────────────────
        document.querySelectorAll('.method-card').forEach(card => {
            card.addEventListener('click', () => {
                datosFijos.savingMethod = card.dataset.method;
                actualizarSavingMethodUI();
                actualizarDashboard();
                guardarDatosFijos();
            });
        });

        if (inpSavingPct) {
            inpSavingPct.addEventListener('change', () => {
                const pct = parseFloat(inpSavingPct.value);
                if (pct <= 0 || pct > 100) return;

                // Advertir si el porcentaje resulta en un ahorro muy alto
                const ingresoTotal = calcularIngresoTotalActual();
                if (ingresoTotal > 0 && pct > 80) {
                    const montoAhorro = (ingresoTotal * pct / 100).toFixed(2);
                    alertaAdvertencia(
                        `Ahorrar el ${pct}% significa apartar $${montoAhorro} de tus ingresos disponibles ($${ingresoTotal.toFixed(2)}). Asegúrate de que te alcance para tus gastos.`,
                        { duration: 7000, title: 'Porcentaje de ahorro elevado' }
                    );
                }

                datosFijos.savingPercentage = pct;
                actualizarDashboard();
                guardarDatosFijos();
            });
        }

        if (inpSavingManual) {
            inpSavingManual.addEventListener('change', () => {
                const amt = parseFloat(inpSavingManual.value);
                if (!Number.isFinite(amt) || amt < 0) return;

                // Bloquear si el monto supera los ingresos disponibles
                const ingresoTotal = calcularIngresoTotalActual();
                if (ingresoTotal > 0 && amt > ingresoTotal) {
                    alertaError(
                        `La cantidad de ahorro ($${amt.toFixed(2)}) no puede ser mayor a tus ingresos disponibles ($${ingresoTotal.toFixed(2)}).`,
                        { duration: 8000, title: 'Ahorro inválido' }
                    );
                    inpSavingManual.value = datosFijos.manualSavingAmount ?? '';
                    return;
                }

                datosFijos.manualSavingAmount = amt;
                actualizarDashboard();
                guardarDatosFijos();
            });
        }
    }

    // --- CALENDARIO ---
    function cambiarMes(delta) {
        mesVisualizado += delta;
        if (mesVisualizado > 11) { mesVisualizado = 0; anioVisualizado++; }
        else if (mesVisualizado < 0) { mesVisualizado = 11; anioVisualizado--; }
        renderizarCalendario();
        actualizarDashboard();
        document.dispatchEvent(new CustomEvent('mes-changed', {
            detail: { month: mesVisualizado + 1, year: anioVisualizado }
        }));
    }

    function renderizarCalendario() {
        gridCalendario.innerHTML = '';
        const nombresMeses = [
            "Enero","Febrero","Marzo","Abril","Mayo","Junio",
            "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
        ];
        lblMesYear.textContent = `${nombresMeses[mesVisualizado]} ${anioVisualizado}`;

        const primerDiaMes = new Date(anioVisualizado, mesVisualizado, 1).getDay();
        const diasEnMes    = new Date(anioVisualizado, mesVisualizado + 1, 0).getDate();

        for (let i = 0; i < primerDiaMes; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('day-cell', 'day-empty');
            gridCalendario.appendChild(emptyCell);
        }

        for (let dia = 1; dia <= diasEnMes; dia++) {
            const celda    = document.createElement('div');
            const fechaKey = `${anioVisualizado}-${String(mesVisualizado + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const datosDia = obtenerDatosDia(fechaKey);

            celda.classList.add('day-cell');
            if (datosDia.colorDia !== 'sin color') celda.classList.add(`day-${datosDia.colorDia}`);

            celda.innerHTML = `
                <span class="day-number">${dia}</span>
                ${datosDia.balance !== 0 ? `<span class="day-balance-preview">$${datosDia.balance.toFixed(2)}</span>` : ''}
            `;
            celda.addEventListener('click', () => abrirModal(fechaKey, dia));
            gridCalendario.appendChild(celda);
        }
    }

    function obtenerDatosDia(fecha) {
        const data = movimientosDB.get(fecha) || { ingresos: [], egresos: [] };
        const totalIngresos = data.ingresos.reduce((acc, val) => acc + val.monto, 0);
        const totalEgresos  = data.egresos.reduce((acc, val) => acc + val.monto, 0);
        const balance = totalIngresos - totalEgresos;

        let colorDia = 'sin color';
        if (balance > 0) colorDia = 'green';
        else if (balance < 0) colorDia = 'red';
        else if ((data.ingresos.length > 0 || data.egresos.length > 0) && balance === 0) colorDia = 'gray';

        return { totalIngresos, totalEgresos, balance, colorDia, movimientos: data };
    }

    // ─────────────────────────────────────────────────────────────────────
    // MÉTODOS DE AHORRO
    // ─────────────────────────────────────────────────────────────────────

    function calcularAhorroObjetivo(ingresoTotal) {
        const base = Math.max(0, ingresoTotal);
        switch (datosFijos.savingMethod) {
            case 'percentage': {
                const pct = datosFijos.savingPercentage || 20;
                return base * (pct / 100);
            }
            case 'manual':
                return datosFijos.manualSavingAmount || 0;
            case 'automatic_50_30_20':
            default:
                return base * 0.20;
        }
    }

    function mostrarBreakdown5030(ingresoTotal) {
        const base = Math.max(0, ingresoTotal);
        if (bdNeeds)   bdNeeds.textContent   = `$${(base * 0.50).toFixed(2)}`;
        if (bdWants)   bdWants.textContent   = `$${(base * 0.30).toFixed(2)}`;
        if (bdSavings) bdSavings.textContent = `$${(base * 0.20).toFixed(2)}`;
    }

    function actualizarSavingMethodUI() {
        const method = datosFijos.savingMethod;

        document.querySelectorAll('.method-card').forEach(c => {
            c.classList.toggle('active', c.dataset.method === method);
        });

        const pctArea    = document.getElementById('method-input-percentage');
        const manualArea = document.getElementById('method-input-manual');
        const breakdown  = document.getElementById('breakdown-5030');

        if (pctArea)    pctArea.classList.toggle('hidden', method !== 'percentage');
        if (manualArea) manualArea.classList.toggle('hidden', method !== 'manual');
        if (breakdown)  breakdown.classList.toggle('hidden', method !== 'automatic_50_30_20');

        if (inpSavingPct && datosFijos.savingPercentage != null) {
            inpSavingPct.value = datosFijos.savingPercentage;
        }
        if (inpSavingManual && datosFijos.manualSavingAmount != null) {
            inpSavingManual.value = datosFijos.manualSavingAmount;
        }
    }

    function actualizarDashboard() {
        let totalIngresosVariables = 0;
        let totalEgresosVariables  = 0;

        movimientosDB.forEach((data, fecha) => {
            const [y, m] = fecha.split('-');
            if (parseInt(y) === anioVisualizado && parseInt(m) === (mesVisualizado + 1)) {
                totalIngresosVariables += data.ingresos.reduce((s, i) => s + i.monto, 0);
                totalEgresosVariables  += data.egresos.reduce((s, e) => s + e.monto, 0);
            }
        });

        const ingresoTotal   = datosFijos.ingresoFijo + totalIngresosVariables;
        const egresoTotal    = datosFijos.egresoFijo  + totalEgresosVariables;
        const balanceReal    = ingresoTotal - egresoTotal;
        const ahorroObjetivo = calcularAhorroObjetivo(ingresoTotal);
        const faltaParaMeta  = Math.max(0, datosFijos.metaCantidad - ahorroObjetivo);

        // Actualizar label según método activo
        if (savingsLabelEl) {
            if (datosFijos.savingMethod === 'percentage') {
                const pct = datosFijos.savingPercentage || 20;
                savingsLabelEl.textContent = `Ahorro Sugerido (${pct}%)`;
            } else if (datosFijos.savingMethod === 'manual') {
                savingsLabelEl.textContent = 'Ahorro Mensual Fijo';
            } else {
                savingsLabelEl.textContent = 'Ahorro Sugerido (20%)';
            }
        }

        txtAhorro.textContent   = `$${ahorroObjetivo.toFixed(2)}`;
        txtRestante.textContent = `$${faltaParaMeta.toFixed(2)}`;

        // ── Validar que el ahorro no supere los ingresos disponibles ──
        const validacionAhorro = validarAhorroVsIngresos(ahorroObjetivo, ingresoTotal);
        mostrarValidacionAhorro(validacionAhorro);

        if (balanceReal < 0) {
            txtAhorro.classList.remove('txt-surplus');
            txtAhorro.classList.add('txt-deficit');
            txtEstado.textContent = 'Déficit';
        } else if (balanceReal < ahorroObjetivo) {
            txtAhorro.classList.remove('txt-deficit');
            txtAhorro.classList.add('txt-surplus');
            txtEstado.textContent = 'Por debajo del objetivo';
        } else {
            txtAhorro.classList.remove('txt-deficit');
            txtAhorro.classList.add('txt-surplus');
            txtEstado.textContent = (faltaParaMeta === 0 && datosFijos.metaCantidad > 0)
                ? '¡Meta Alcanzada!'
                : '¡Bien encaminado!';
        }

        if (datosFijos.savingMethod === 'automatic_50_30_20') {
            mostrarBreakdown5030(ingresoTotal);
        }

        actualizarGrafica();
    }

    // --- MODAL ---
    function abrirModal(fecha, diaNumero) {
        diaSeleccionado = fecha;
        modal.classList.remove('hidden');
        modalTitle.textContent = `Detalle del ${diaNumero}/${mesVisualizado + 1}/${anioVisualizado}`;
        ocultarFormEdicion();
        actualizarContenidoModal();
    }

    function cerrarModal() {
        modal.classList.add('hidden');
        diaSeleccionado = null;
        ocultarFormEdicion();
    }

    function actualizarContenidoModal() {
        const datos = obtenerDatosDia(diaSeleccionado);

        modalIncome.textContent  = `+$${datos.totalIngresos.toFixed(2)}`;
        modalExpense.textContent = `-$${datos.totalEgresos.toFixed(2)}`;
        modalTotal.textContent   = `$${datos.balance.toFixed(2)}`;
        modalTotal.className     = datos.balance > 0 ? 'text-green' : (datos.balance < 0 ? 'text-red' : '');

        listMovimientos.innerHTML = '';

        const todosMovs = [
            ...datos.movimientos.ingresos.map(m => ({ ...m, tipo: 'income' })),
            ...datos.movimientos.egresos.map(m => ({ ...m, tipo: 'expense' }))
        ];

        if (todosMovs.length === 0) {
            listMovimientos.innerHTML = '<li><em class="mov-no-items">Sin movimientos.</em></li>';
        } else {
            todosMovs.forEach(m => {
                const li = document.createElement('li');
                li.className = 'mov-list-item';
                li.innerHTML = `
                    <span class="mov-item-cat">${m.categoria}</span>
                    <span class="${m.tipo === 'income' ? 'text-green' : 'text-red'} mov-item-amount">
                        ${m.tipo === 'income' ? '+' : '-'}$${m.monto.toFixed(2)}
                    </span>
                    <button class="btn-edit-mov" data-id="${m.id}" title="Editar movimiento">✏️</button>
                `;
                li.querySelector('.btn-edit-mov').addEventListener('click', () => mostrarFormEdicion(m));
                listMovimientos.appendChild(li);
            });
        }
    }

    function mostrarFormEdicion(movimiento) {
        movimientoEnEdicion = movimiento;
        selEditTipo.value = movimiento.tipo;
        llenarCategorias(selEditCat, movimiento.tipo, movimiento.categoria);
        inpEditMonto.value = movimiento.monto;
        editContainer.classList.add('active');
        editContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function ocultarFormEdicion() {
        editContainer.classList.remove('active');
        movimientoEnEdicion = null;
        if (formEdicion) formEdicion.reset();
    }

    async function guardarEdicion(e) {
        e.preventDefault();
        if (!movimientoEnEdicion) return;

        const tipo      = selEditTipo.value;
        const categoria = selEditCat.value;
        const montoRaw  = inpEditMonto.value;

        if (!categoria) { alert('Selecciona una categoría.'); return; }

        const montoRegex = /^\d{1,8}(\.\d{1,2})?$/;
        if (!montoRegex.test(montoRaw)) { alert('Monto inválido. Máximo 8 dígitos y 2 decimales.'); return; }

        const monto = parseFloat(montoRaw);
        if (monto <= 0) { alert('El monto debe ser mayor a 0.'); return; }

        try {
            const result = await updateMovement(movimientoEnEdicion.id, { tipo, categoria, monto });
            if (result.success) {
                ocultarFormEdicion();
                await cargarDatosDelServidor();
                if (diaSeleccionado) actualizarContenidoModal();
            } else {
                alert(result.message || 'Error al actualizar el movimiento.');
            }
        } catch (error) {
            console.error('Error guardando edición:', error);
            alert('Error de conexión al guardar los cambios.');
        }
    }

    async function eliminarDesdeEdicion() {
        if (!movimientoEnEdicion) return;
        if (!confirm('¿Eliminar este movimiento? Esta acción no se puede deshacer.')) return;

        try {
            const result = await deleteMovement(movimientoEnEdicion.id, userId);
            if (result.success) {
                ocultarFormEdicion();
                await cargarDatosDelServidor();
                if (diaSeleccionado) actualizarContenidoModal();
            } else {
                alert(result.message || 'Error al eliminar el movimiento.');
            }
        } catch (error) {
            console.error('Error eliminando movimiento:', error);
            alert('Error de conexión al eliminar el movimiento.');
        }
    }

    let _submittingMovimiento = false;

    async function agregarMovimiento(e) {
        e.preventDefault();

        if (_submittingMovimiento) return;

        const tipo      = document.getElementById('trans-type').value;
        const categoria = document.getElementById('trans-category').value;
        const montoRaw  = document.getElementById('trans-amount').value;
        const montoRegex = /^\d{1,8}(\.\d{1,2})?$/;

        if (!categoria) { alert('Selecciona una categoría.'); return; }
        if (!montoRegex.test(montoRaw)) { alert('Monto inválido. Máx 8 dígitos y 2 decimales.'); return; }

        const monto = parseFloat(montoRaw);
        if (monto <= 0) { alert('El monto debe ser mayor a 0.'); return; }

        const movementData = {
            user_id: userId, fecha: diaSeleccionado,
            tipo, categoria, monto, descripcion: 'Movimiento desde Dashboard'
        };

        _submittingMovimiento = true;
        const btnSubmit = formMovimiento.querySelector('button[type="submit"]');
        const originalText = btnSubmit.textContent;
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Guardando...';

        try {
            await createMovement(movementData);
            document.getElementById('trans-amount').value = '';
            await cargarDatosDelServidor();
            actualizarContenidoModal();
        } catch (error) {
            console.error('Error al crear movimiento:', error);
            alert('No se pudo guardar el movimiento.');
        } finally {
            _submittingMovimiento = false;
            btnSubmit.disabled = false;
            btnSubmit.textContent = originalText;
        }
    }

    initOfflineBanner(() => cargarDatosDelServidor());

    init();

    // ── Onboarding ───────────────────────────────────────────────────────────
    // Iniciar tras la carga de datos para que los elementos del tour ya existan
    setTimeout(() => {
        if (window.location.hash === '#tour') {
            history.replaceState(null, '', window.location.pathname);
            restartOnboarding(userId, 'dashboard');
        } else {
            initOnboarding(userId, 'dashboard');
        }
    }, 600);

    document.getElementById('ob-restart-dashboard')?.addEventListener('click', e => {
        e.preventDefault();
        restartOnboarding(userId, 'dashboard');
    });
});