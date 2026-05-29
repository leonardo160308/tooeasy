// frontend/public/js/pages/quiz.js
import { protectRoute, getAuthData, getSessionToken } from '../modules/auth.js';
import { alertaError } from '../modules/alerts.js';

const API_URL    = '/api';
const MAX_LVL_ID = 99999;

// Validación estricta: solo enteros positivos sin cero inicial, sin notación
// científica, sin decimales, en rango 1–99999.
function parseLevelId(raw) {
    if (raw === null || raw === undefined) return null;
    const str = String(raw).trim();
    if (!/^[1-9]\d{0,4}$/.test(str)) return null;
    const n = parseInt(str, 10);
    return (n >= 1 && n <= MAX_LVL_ID) ? n : null;
}

function parseLevelNum(raw, fallback) {
    const n = parseLevelId(raw);
    return n !== null ? n : fallback;
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!protectRoute()) return;
    const sessionUser = getAuthData();

    const urlParams   = new URLSearchParams(window.location.search);
    const nivelActual = parseLevelId(urlParams.get('level'));
    const levelNum    = parseLevelNum(urlParams.get('levelNum'), nivelActual);

    // Parámetro inválido → redirigir, sin fallback silencioso a nivel 1
    if (!nivelActual) {
        alertaError('Parámetros de nivel inválidos.');
        setTimeout(() => window.location.href = '/lecciones.html', 2000);
        return;
    }

    const sessionToken = getSessionToken();
    if (!sessionToken) {
        window.location.href = '/login.html';
        return;
    }
    const authHeaders = { 'Authorization': `Bearer ${sessionToken}` };

    let preguntas = [];

    // ── Cargar preguntas — endpoint protegido con auth + acceso al nivel ──────
    // Si el nivel está bloqueado, el backend devuelve 403 directamente.
    try {
        const res = await fetch(`${API_URL}/progress/level/${nivelActual}/questions`, {
            headers: authHeaders
        });

        if (res.status === 401) {
            window.location.href = '/login.html';
            return;
        }
        if (res.status === 403) {
            alertaError('Este nivel está bloqueado. Completa los anteriores primero.');
            setTimeout(() => window.location.href = '/lecciones.html', 2500);
            return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        if (!data.success || data.data.length === 0) {
            alertaError('Este nivel no tiene preguntas. Volviendo...');
            window.location.href = '/lecciones.html';
            return;
        }
        preguntas = data.data;
    } catch (err) {
        console.error('Error cargando preguntas:', err);
        alertaError('No se pudo verificar el acceso. Comprueba tu conexión.');
        setTimeout(() => window.location.href = '/lecciones.html', 2500);
        return;
    }

    // ── State ──────────────────────────────────────────────────────────────
    let preguntaIndex    = 0;
    let aciertos         = 0;
    let seleccionUsuario = null;
    let preguntaEvaluada = false;
    // Registro de respuestas del usuario: { "[questionId]": "A" }
    // Enviado al backend para que calcule el score de forma independiente.
    const userAnswers = {};

    // ── DOM refs ───────────────────────────────────────────────────────────
    const txtPregunta   = document.getElementById('textoPregunta');
    const imgPregunta   = document.getElementById('imagenPregunta');
    const divOpciones   = document.getElementById('opcionesContainer');
    const btnComprobar  = document.getElementById('botonComprobar');
    const barraProgreso = document.getElementById('barra-progreso');
    const resultWrapper = document.getElementById('resultadoWrapper');
    const resultado     = document.getElementById('resultado');
    const resultIco     = document.getElementById('resultado-ico');
    const resultMsg     = document.getElementById('resultado-msg');
    const btnNext       = document.getElementById('btn-next');
    const nivelLabel    = document.getElementById('nivel-actual');
    const pregActualLbl = document.getElementById('pregunta-actual');
    const totalLbl      = document.getElementById('total-preguntas');
    const contadorLabel = document.getElementById('contador-label');
    const modalFinal    = document.getElementById('modal-final');
    const modalBody     = document.getElementById('modal-body');

    if (nivelLabel)    nivelLabel.textContent    = levelNum;
    if (pregActualLbl) pregActualLbl.textContent = 1;
    if (totalLbl)      totalLbl.textContent      = preguntas.length;
    if (contadorLabel) contadorLabel.textContent = `1 / ${preguntas.length}`;
    if (barraProgreso) barraProgreso.style.setProperty('--fill-w', `${(1 / preguntas.length) * 100}%`);

    ocultarFeedback();

    // ── Render question ────────────────────────────────────────────────────
    function cargarPregunta() {
        seleccionUsuario = null;
        preguntaEvaluada = false;
        ocultarFeedback();
        btnComprobar.classList.add('hidden');
        btnComprobar.disabled = false;

        const p       = preguntas[preguntaIndex];
        const numActual = preguntaIndex + 1;

        txtPregunta.textContent = p.pregunta;
        if (p.imagen && p.imagen.trim()) imgPregunta.src = p.imagen;

        if (pregActualLbl)  pregActualLbl.textContent  = numActual;
        if (contadorLabel)  contadorLabel.textContent  = `${numActual} / ${preguntas.length}`;
        if (barraProgreso)  barraProgreso.style.setProperty('--fill-w', `${(numActual / preguntas.length) * 100}%`);

        divOpciones.innerHTML = '';
        Object.keys(p.opciones).forEach((key, idx) => {
            const btn = document.createElement('div');
            btn.classList.add('opcion');
            btn.dataset.key   = key;
            btn.dataset.delay = idx;
            btn.innerHTML = `
                <span class="letra">${key}</span>
                <span class="texto-opcion">${p.opciones[key]}</span>
                <span class="estado-icon" aria-hidden="true"></span>`;
            btn.addEventListener('click', () => seleccionar(btn, key));
            divOpciones.appendChild(btn);

            requestAnimationFrame(() => {
                setTimeout(() => btn.classList.add('entering'), 0);
            });
        });
    }

    function seleccionar(btn, key) {
        if (preguntaEvaluada) return;
        divOpciones.querySelectorAll('.opcion').forEach(o => o.classList.remove('seleccionada'));
        btn.classList.add('seleccionada');
        seleccionUsuario = key;
        btnComprobar.classList.remove('hidden');
    }

    btnComprobar.addEventListener('click', () => {
        if (preguntaEvaluada || !seleccionUsuario) return;
        preguntaEvaluada      = true;
        btnComprobar.disabled = true;
        btnComprobar.classList.add('hidden');

        const p          = preguntas[preguntaIndex];
        const esCorrecta = seleccionUsuario === p.correcta;
        if (esCorrecta) aciertos++;

        // Registrar respuesta para enviar al backend
        userAnswers[String(p.id)] = seleccionUsuario;

        divOpciones.querySelectorAll('.opcion').forEach(opt => {
            const k = opt.dataset.key;
            opt.classList.add('no-interact');
            if (k === p.correcta) {
                opt.classList.remove('seleccionada', 'dimmed');
                opt.classList.add('correcta');
            } else if (k === seleccionUsuario && !esCorrecta) {
                opt.classList.remove('seleccionada');
                opt.classList.add('incorrecta');
            } else {
                opt.classList.remove('seleccionada');
                opt.classList.add('dimmed');
            }
        });

        mostrarFeedback(esCorrecta, p.correcta, p.opciones[p.correcta]);
    });

    function mostrarFeedback(esCorrecto, keyCorrecta, textoCorrecta) {
        resultado.className      = `resultado ${esCorrecto ? 'correcto' : 'incorrecto'}`;
        resultIco.textContent    = esCorrecto ? '✓' : '✗';
        resultMsg.textContent    = esCorrecto
            ? '¡Correcto! Muy bien.'
            : `La respuesta correcta era: ${keyCorrecta}) ${textoCorrecta}`;
        resultWrapper.classList.add('visible');
        setTimeout(() => resultWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
    }

    function ocultarFeedback() {
        resultWrapper.classList.remove('visible');
        resultado.className   = 'resultado';
        resultIco.textContent = '';
        resultMsg.textContent = '';
    }

    btnNext.addEventListener('click', avanzar);

    async function avanzar() {
        preguntaIndex++;
        if (preguntaIndex < preguntas.length) {
            cargarPregunta();
        } else {
            await finalizarNivel();
        }
    }

    // ── Finish level ───────────────────────────────────────────────────────
    // Envía las respuestas al backend — el score se calcula allá, no aquí.
    async function finalizarNivel() {
        try {
            const res = await fetch(`${API_URL}/progress/complete-level`, {
                method:  'POST',
                headers: { ...authHeaders, 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    levelId: nivelActual,
                    answers: userAnswers,
                })
            });

            if (res.status === 401) {
                mostrarPantallaFinal(false, 'Sesión expirada — inicia sesión para guardar progreso');
                return;
            }

            const data = await res.json();

            if (!data.success) {
                // El backend devuelve el score real si no alcanzó el 80%
                const backendAciertos = data.aciertos ?? aciertos;
                const backendTotal    = data.total    ?? preguntas.length;
                mostrarPantallaFinal(false, data.message || 'No pasaste el quiz', 0, backendAciertos, backendTotal);
                return;
            }

            const { alreadyCompleted, coinsAwarded, aciertos: bkAciertos, total: bkTotal } = data;
            const displayAciertos = bkAciertos ?? aciertos;
            const displayTotal    = bkTotal    ?? preguntas.length;

            let mensaje = '¡Nivel completado!';
            if (alreadyCompleted) {
                mensaje = 'Repaso completado · Sin recompensa extra.';
            } else if (coinsAwarded > 0) {
                mensaje += ` +${coinsAwarded} monedas 🪙`;
            }

            mostrarPantallaFinal(true, mensaje, coinsAwarded, displayAciertos, displayTotal);

        } catch (err) {
            console.error('Error al guardar progreso:', err);
            mostrarPantallaFinal(false, 'Error de conexión. Intenta de nuevo.');
        }
    }

    // ── Final screen ───────────────────────────────────────────────────────
    function mostrarPantallaFinal(exito, mensaje, monedas = 0, ac = aciertos, tot = preguntas.length) {
        const pct = Math.round((ac / tot) * 100);

        modalBody.innerHTML = `
            <div class="modal-final-ico">
                ${exito ? '🏆' : '📚'}
            </div>
            <h2 class="modal-final-title">
                ${exito ? '¡Felicidades!' : '¡Casi lo logras!'}
            </h2>
            <p class="modal-final-score ${exito ? 'score-success' : 'score-fail'}">
                ${ac} / ${tot}
            </p>
            <p class="modal-final-pct">${pct}% de aciertos</p>
            <p class="modal-final-msg ${exito ? 'msg-success' : 'msg-fail'}">
                ${mensaje}
            </p>
            <div class="modal-final-btns">
                <button id="btn-final-lecciones" class="btn-modal btn-secondary">
                    Ver lecciones
                </button>
                ${!exito
                    ? `<button id="btn-final-reintentar" class="btn-modal btn-primary">
                          🔄 Reintentar
                      </button>`
                    : ''}
            </div>`;

        modalFinal.classList.add('modal-final-active');

        document.getElementById('btn-final-lecciones').addEventListener('click', () => {
            window.location.href = '/lecciones.html';
        });
        if (!exito) {
            document.getElementById('btn-final-reintentar').addEventListener('click', () => {
                window.location.reload();
            });
        }
    }

    cargarPregunta();
});
