/* assets/js/pages/dashboard.js */

// 1. IMPORTACIONES: Conexión con el Backend y Sesión
import { 
    getDashboardFixed, 
    updateGoal, 
    getDashboardData, 
    createMovement 
} from '../modules/api.js';

import { 
    protectRoute, 
    getAuthData, 
    logout 
} from '../modules/auth.js';

document.addEventListener('DOMContentLoaded', async () => {

    // --- 0. SEGURIDAD: Verificar sesión ---
    if (!protectRoute()) return; // Si no hay login, te saca de aquí.

    const usuarioLogueado = getAuthData();
    const userId = usuarioLogueado.id;

    // Personalizar saludo
    const titulo = document.querySelector('.main-header h1');
    if(titulo) titulo.textContent = `Hola, ${usuarioLogueado.nombre}`;

    // --- 1. ESTADO DE LA APLICACIÓN ---
    const fechaActual = new Date(); 
    let mesVisualizado = fechaActual.getMonth(); 
    let anioVisualizado = fechaActual.getFullYear();

    // Estado local (se llena desde la API)
    let datosFijos = {
        ingresoFijo: 0,
        egresoFijo: 0,
        metaNombre: '',
        metaCantidad: 0
    };

    // Mapa en memoria para el calendario (Fecha -> {ingresos:[], egresos:[]})
    let movimientosDB = new Map();

    let chartInstance = null;
    let diaSeleccionado = null; 

    // --- 2. REFERENCIAS AL DOM ---
    const inpIngreso = document.getElementById('fixed-income');
    const inpEgreso = document.getElementById('fixed-expense');
    const inpMetaNombre = document.getElementById('goal-name');
    const inpMetaMonto = document.getElementById('goal-amount');
    
    const txtAhorro = document.getElementById('calculated-savings');
    const txtRestante = document.getElementById('calculated-remaining');
    const txtEstado = document.getElementById('goal-status');

    const lblMesYear = document.getElementById('current-month-year');
    const gridCalendario = document.getElementById('calendar-grid');
    const btnPrevMonth = document.getElementById('prev-month');
    const btnNextMonth = document.getElementById('next-month');

    const modal = document.getElementById('day-modal');
    const btnCloseModal = document.getElementById('close-modal');
    const formMovimiento = document.getElementById('transaction-form');
    
    const modalTitle = document.getElementById('modal-date-title');
    const modalIncome = document.getElementById('day-income');
    const modalExpense = document.getElementById('day-expense');
    const modalTotal = document.getElementById('day-total');
    const listRecomendaciones = document.getElementById('recommendations-list');
    const listMovimientos = document.getElementById('movements-list');

    // Botón Salir (Asegúrate de tener un botón con este ID o clase en tu HTML)
    const btnLogout = document.getElementById('logout-btn') || document.querySelector('.btn-logout');

    // --- 3. FUNCIONES DE CARGA DE DATOS (API) ---

    async function cargarDatosDelServidor() {
        try {
            // Hacemos dos peticiones al mismo tiempo para ser más rápidos
            const [fixedResponse, movementsResponse] = await Promise.all([
                getDashboardFixed(userId),
                getDashboardData(userId)
            ]);

            // A. Procesar Datos Fijos
            if (fixedResponse.success) {
                const data = fixedResponse.data;
                datosFijos = {
                    ingresoFijo: parseFloat(data.ingreso_fijo) || 0,
                    egresoFijo: parseFloat(data.egreso_fijo) || 0,
                    metaNombre: data.meta_nombre || '',
                    metaCantidad: parseFloat(data.meta_cantidad) || 0
                };
                actualizarInputsFijos();
            }

            // B. Procesar Movimientos (Transformar Array SQL a Map Calendario)
            if (movementsResponse.success) {
                procesarMovimientosParaMap(movementsResponse.history);
            }

            // C. Renderizar todo con los nuevos datos
            actualizarDashboard();
            renderizarCalendario();

        } catch (error) {
            console.error("Error cargando dashboard:", error);
            alert("Error al cargar tus datos. Revisa tu conexión.");
        }
    }

    function actualizarInputsFijos() {
        inpIngreso.value = datosFijos.ingresoFijo || '';
        inpEgreso.value = datosFijos.egresoFijo || '';
        inpMetaNombre.value = datosFijos.metaNombre || '';
        inpMetaMonto.value = datosFijos.metaCantidad || '';
    }

    // Transforma la lista plana de la BD a la estructura que usa tu calendario
    function procesarMovimientosParaMap(listaMovimientos) {
        movimientosDB = new Map(); // Limpiar mapa
        
        listaMovimientos.forEach(mov => {
            // mov.fecha viene como "2023-10-25T00:00:00.000Z" o "2023-10-25"
            // Cortamos para tener solo YYYY-MM-DD
            const fechaKey = mov.fecha.split('T')[0]; 

            if (!movimientosDB.has(fechaKey)) {
                movimientosDB.set(fechaKey, { ingresos: [], egresos: [] });
            }

            const diaData = movimientosDB.get(fechaKey);
            const item = { 
                categoria: mov.categoria, 
                monto: parseFloat(mov.monto) 
            };

            if (mov.tipo === 'income') {
                diaData.ingresos.push(item);
            } else {
                diaData.egresos.push(item);
            }
        });
    }

    // --- 4. FUNCIONES DE GUARDADO (API) ---

    async function guardarDatosFijos() {
        // Leemos valores actuales del DOM
        const payload = {
            ingreso_fijo: parseFloat(inpIngreso.value) || 0,
            egreso_fijo: parseFloat(inpEgreso.value) || 0,
            meta_nombre: inpMetaNombre.value || '',
            meta_cantidad: parseFloat(inpMetaMonto.value) || 0
        };

        // Actualizamos estado local para que la UI responda rápido
        datosFijos = {
            ingresoFijo: payload.ingreso_fijo,
            egresoFijo: payload.egreso_fijo,
            metaNombre: payload.meta_nombre,
            metaCantidad: payload.meta_cantidad
        };
        actualizarDashboard(); // Recalcular gráfica al instante

        // Enviar al Backend
        try {
            await updateGoal(userId, payload);
            console.log("Datos fijos guardados en nube");
        } catch (error) {
            console.error("Error al guardar datos fijos:", error);
        }
    }
// --- VALIDACIÓN FINANCIERA SEGURA ---
// maxEnteros = dígitos antes del punto
// maxDecimales = dígitos después del punto
function limitarNumero(input, maxEnteros, maxDecimales = 2) {
    input.addEventListener('input', () => {
        let valor = input.value;

        // Quitar todo excepto números y punto
        valor = valor.replace(/[^\d.]/g, '');

        // Evitar más de un punto
        const partes = valor.split('.');
        if (partes.length > 2) {
            valor = partes[0] + '.' + partes.slice(1).join('');
        }

        let [enteros, decimales] = valor.split('.');

        // ❗ Evitar punto como primer carácter
        if (enteros === '' && valor.startsWith('.')) {
            enteros = '0';
        }

        // Limitar enteros
        if (enteros.length > maxEnteros) {
            enteros = enteros.slice(0, maxEnteros);
        }

        // Limitar decimales
        if (decimales !== undefined) {
            decimales = decimales.slice(0, maxDecimales);
            valor = `${enteros}.${decimales}`;
        } else {
            valor = enteros;
        }

        input.value = valor;
    });
}


    // --- 5. INICIALIZACIÓN ---

    async function init() {
        inicializarGrafica(); // Crear instancia vacía
        await cargarDatosDelServidor(); // Llenarla con datos reales
        // Limitar números financieros
limitarNumero(inpIngreso, 8, 2);   // Ingreso fijo
limitarNumero(inpEgreso, 8, 2);    // Egreso fijo
limitarNumero(inpMetaMonto, 9, 2); // Meta de ahorro

        // Eventos para Datos Fijos
        // Usamos 'change' en lugar de 'input' para no saturar al servidor con cada tecla
        [inpIngreso, inpEgreso, inpMetaMonto, inpMetaNombre].forEach(input => {
            input.addEventListener('change', guardarDatosFijos);
        });

        // Eventos UI
        btnPrevMonth.addEventListener('click', () => cambiarMes(-1));
        btnNextMonth.addEventListener('click', () => cambiarMes(1));
        btnCloseModal.addEventListener('click', cerrarModal);
        window.addEventListener('click', (e) => { if(e.target === modal) cerrarModal(); });

        // Evento Nuevo Movimiento
        formMovimiento.addEventListener('submit', agregarMovimiento);

        // Evento Logout
        if(btnLogout) {
            btnLogout.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
        }
    }

    // --- 6. LÓGICA UI (CALENDARIO Y GRÁFICAS) ---
    // (Esta parte es casi idéntica a tu código original, solo usa las variables actualizadas)

    function cambiarMes(delta) {
        mesVisualizado += delta;
        if (mesVisualizado > 11) {
            mesVisualizado = 0;
            anioVisualizado++;
        } else if (mesVisualizado < 0) {
            mesVisualizado = 11;
            anioVisualizado--;
        }
        renderizarCalendario();
        actualizarDashboard(); 
    }

    function renderizarCalendario() {
        gridCalendario.innerHTML = ''; 
        const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        lblMesYear.textContent = `${nombresMeses[mesVisualizado]} ${anioVisualizado}`;

        const primerDiaMes = new Date(anioVisualizado, mesVisualizado, 1).getDay();
        const diasEnMes = new Date(anioVisualizado, mesVisualizado + 1, 0).getDate();

        for (let i = 0; i < primerDiaMes; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('day-cell', 'day-empty');
            gridCalendario.appendChild(emptyCell);
        }

        for (let dia = 1; dia <= diasEnMes; dia++) {
            const celda = document.createElement('div');
            celda.classList.add('day-cell');
            
            // Construir fecha formato YYYY-MM-DD
            const fechaKey = `${anioVisualizado}-${String(mesVisualizado + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const datosDia = obtenerDatosDia(fechaKey);
            
            if (datosDia.colorDia !== 'sin color') {
                celda.classList.add(`day-${datosDia.colorDia}`);
            }

            celda.innerHTML = `
                <span class="day-number">${dia}</span>
                ${datosDia.balance !== 0 ? `<span class="day-balance-preview">$${datosDia.balance}</span>` : ''}
            `;

            celda.addEventListener('click', () => abrirModal(fechaKey, dia));
            gridCalendario.appendChild(celda);
        }
    }

    function obtenerDatosDia(fecha) {
        const data = movimientosDB.get(fecha) || { ingresos: [], egresos: [] };
        const totalIngresos = data.ingresos.reduce((acc, val) => acc + val.monto, 0);
        const totalEgresos = data.egresos.reduce((acc, val) => acc + val.monto, 0);
        const balance = totalIngresos - totalEgresos;
        
        let colorDia = 'sin color';
        if (balance > 0) colorDia = 'green';
        else if (balance < 0) colorDia = 'red';
        else if ((data.ingresos.length > 0 || data.egresos.length > 0) && balance === 0) colorDia = 'gray';

        return { totalIngresos, totalEgresos, balance, colorDia, movimientos: data };
    }

    function actualizarDashboard() {
        let totalIngresosVariables = 0;
        let totalEgresosVariables = 0;

        // Recorremos el mapa local para sumar lo que corresponde al mes visualizado
        movimientosDB.forEach((data, fecha) => {
            const [y, m, d] = fecha.split('-');
            if (parseInt(y) === anioVisualizado && parseInt(m) === (mesVisualizado + 1)) {
                totalIngresosVariables += data.ingresos.reduce((s, i) => s + i.monto, 0);
                totalEgresosVariables += data.egresos.reduce((s, e) => s + e.monto, 0);
            }
        });

        const ingresoTotal = datosFijos.ingresoFijo + totalIngresosVariables;
        const egresoTotal = datosFijos.egresoFijo + totalEgresosVariables;
        const ahorroMensual = ingresoTotal - egresoTotal;
        const faltaParaMeta = Math.max(0, datosFijos.metaCantidad - ahorroMensual);

        txtAhorro.textContent = `$${ahorroMensual.toFixed(2)}`;
        txtRestante.textContent = `$${faltaParaMeta.toFixed(2)}`;
        
        if (ahorroMensual < 0) {
            txtAhorro.style.color = '#E57373';
            txtEstado.textContent = "Déficit";
        } else {
            txtAhorro.style.color = '#81C784';
            if (faltaParaMeta === 0 && datosFijos.metaCantidad > 0) {
                txtEstado.textContent = "¡Meta Alcanzada!";
            } else {
                txtEstado.textContent = "En progreso";
            }
        }

        actualizarGrafica(ingresoTotal, egresoTotal, ahorroMensual);
    }

    function inicializarGrafica() {
        const ctx = document.getElementById('monthlyChart').getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Ingresos Totales', 'Egresos Totales', 'Balance Neto'],
                datasets: [{
                    label: 'Finanzas ($)',
                    data: [0, 0, 0],
                    backgroundColor: ['#A5D6A7', '#EF9A9A', '#B6C4DA'],
                    borderColor: ['#1B5E20', '#B71C1C', '#2C405B'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    function actualizarGrafica(ing, egr, bal) {
        if (chartInstance) {
            chartInstance.data.datasets[0].data = [ing, egr, bal];
            chartInstance.update();
        }
    }

    // --- 7. MODAL Y AGREGAR MOVIMIENTO ---

    function abrirModal(fecha, diaNumero) {
        diaSeleccionado = fecha;
        modal.classList.remove('hidden');
        modalTitle.textContent = `Detalle del ${diaNumero}/${mesVisualizado + 1}/${anioVisualizado}`;
        actualizarContenidoModal();
    }

    function cerrarModal() {
        modal.classList.add('hidden');
        diaSeleccionado = null;
    }

    function actualizarContenidoModal() {
        const datos = obtenerDatosDia(diaSeleccionado);
        
        modalIncome.textContent = `+$${datos.totalIngresos}`;
        modalExpense.textContent = `-$${datos.totalEgresos}`;
        modalTotal.textContent = `$${datos.balance}`;
        modalTotal.className = datos.balance > 0 ? "text-green" : (datos.balance < 0 ? "text-red" : "");

        listMovimientos.innerHTML = '';
        const todosMovs = [
            ...datos.movimientos.ingresos.map(m => ({...m, tipo: 'ingreso'})),
            ...datos.movimientos.egresos.map(m => ({...m, tipo: 'egreso'}))
        ];

        if (todosMovs.length === 0) {
            listMovimientos.innerHTML = '<li><em style="color:#999">Sin movimientos.</em></li>';
        } else {
            todosMovs.forEach(m => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${m.categoria}</span>
                    <span class="${m.tipo === 'ingreso' ? 'text-green' : 'text-red'}">
                        ${m.tipo === 'ingreso' ? '+' : '-'}$${m.monto}
                    </span>
                `;
                listMovimientos.appendChild(li);
            });
        }
        // (Tu lógica de recomendaciones iría aquí, la omití por brevedad pero puedes pegarla)
    }

    async function agregarMovimiento(e) {
        e.preventDefault();
        const tipo = document.getElementById('trans-type').value; 
        const categoria = document.getElementById('trans-category').value;
        const monto = parseFloat(document.getElementById('trans-amount').value);

        if (!categoria || isNaN(monto) || monto <= 0) return;

        // 1. Preparar datos para el Backend
        const movementData = {
            user_id: userId,
            fecha: diaSeleccionado, // Formato YYYY-MM-DD
            tipo: tipo, // 'income' o 'expense' (asegúrate que el value del select coincida)
            categoria: categoria,
            monto: monto,
            descripcion: 'Movimiento desde Dashboard'
        };

        try {
            // 2. Enviar a la API
            await createMovement(movementData);

            // 3. Limpiar Formulario
            document.getElementById('trans-amount').value = '';
            
            // 4. Recargar datos para ver el cambio reflejado (incluyendo monedas)
            await cargarDatosDelServidor(); 
            
            // 5. Actualizar la vista del modal
            actualizarContenidoModal();

        } catch (error) {
            console.error("Error al crear movimiento:", error);
            alert("No se pudo guardar el movimiento.");
        }
    }

    // Iniciar
    init();
});