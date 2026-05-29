// frontend/public/js/pages/quiz.js
import { protectRoute, getAuthData } from '../modules/auth.js';
import { alertaError } from '../modules/alerts.js';

const API_URL = '/api';

document.addEventListener('DOMContentLoaded', async () => {
    if (!protectRoute()) return;
    const sessionUser = getAuthData();

    const urlParams   = new URLSearchParams(window.location.search);
    const nivelActual = parseInt(urlParams.get('level')) || 1;  // educational_levels.id (used for API calls)
    const levelNum    = parseInt(urlParams.get('levelNum')) || nivelActual; // sequential display number

    let preguntas = [];

    // ── Load questions from DB ─────────────────────────────────────────────
    try {
        const res  = await fetch(`${API_URL}/admin/questions/${nivelActual}`);
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
        alertaError('Error de conexión. Intenta de nuevo.');
        return;
    }

    // ── State ──────────────────────────────────────────────────────────────
    let preguntaIndex    = 0;
    let aciertos         = 0;
    let seleccionUsuario = null;
    let preguntaEvaluada = false;

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
    if (totalLbl)      totalLbl.textContent      = preguntas.length;
    if (contadorLabel) contadorLabel.textContent = `1 / ${preguntas.length}`;

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
        barraProgreso.style.setProperty('--fill-w', `${(numActual / preguntas.length) * 100}%`);

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
    async function finalizarNivel() {
        const porcentaje = (aciertos / preguntas.length) * 100;
        const aprobado   = porcentaje >= 80;

        if (!aprobado) {
            // Failed — show retry screen, do NOT call progress API
            mostrarPantallaFinal(false,
                `Necesitas al menos ${Math.ceil(preguntas.length * 0.8)} aciertos para aprobar.`
            );
            return;
        }

        try {
            // ── Single source of truth for progress + coins ────────────────
            // The backend checks if already completed, awards coins only once,
            // and returns the updated completedLevels for this category.
            const res = await fetch(`${API_URL}/progress/complete-level`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    userId:  sessionUser.id,
                    levelId: nivelActual,   // educational_levels.id
                    score:   porcentaje
                })
            });

            const data = await res.json();

            if (!data.success) {
                console.error('Error al guardar progreso:', data.message);
                mostrarPantallaFinal(true, '¡Nivel completado! (sin recompensa — error al guardar)');
                return;
            }

            const { alreadyCompleted, coinsAwarded } = data;

            let mensaje = '¡Nivel completado!';
            if (alreadyCompleted) {
                mensaje = 'Repaso completado · Sin recompensa extra.';
            } else if (coinsAwarded > 0) {
                mensaje += ` +${coinsAwarded} monedas 🪙`;
            }

            mostrarPantallaFinal(true, mensaje, coinsAwarded);

        } catch (err) {
            console.error('Error al guardar progreso:', err);
            // Still show success screen — progress save is best-effort
            mostrarPantallaFinal(true, '¡Nivel completado! (sin recompensa — error de conexión)');
        }
    }

    // ── Final screen ───────────────────────────────────────────────────────
    function mostrarPantallaFinal(exito, mensaje, monedas = 0) {
        const pct = Math.round((aciertos / preguntas.length) * 100);

        modalBody.innerHTML = `
            <div class="modal-final-ico">
                ${exito ? '🏆' : '📚'}
            </div>
            <h2 class="modal-final-title">
                ${exito ? '¡Felicidades!' : '¡Casi lo logras!'}
            </h2>
            <p class="modal-final-score ${exito ? 'score-success' : 'score-fail'}">
                ${aciertos} / ${preguntas.length}
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