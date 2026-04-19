// frontend/public/js/pages/quiz.js
import { updateUserData, getUserData } from '../modules/api.js';
import { protectRoute, getAuthData } from '../modules/auth.js';
import { SKIN_REWARDS } from '../data/preguntas.js';

const API_URL = '/api';

document.addEventListener('DOMContentLoaded', async () => {
    if (!protectRoute()) return;
    const sessionUser = getAuthData();

    const urlParams   = new URLSearchParams(window.location.search);
    const nivelActual = parseInt(urlParams.get('level')) || 1;

    let preguntas = [];

    // ── Cargar preguntas desde la BD ─────────────────────────────────────
    try {
        const res = await fetch(`${API_URL}/admin/questions/${nivelActual}`);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();

        if (!data.success || data.data.length === 0) {
            alert('Este nivel no tiene preguntas. Volviendo...');
            window.location.href = '/lecciones.html';
            return;
        }
        preguntas = data.data;
    } catch (err) {
        console.error('Error cargando preguntas:', err);
        alert('Error de conexión. Intenta de nuevo.');
        return;
    }

    // ── Estado ────────────────────────────────────────────────────────────
    let preguntaIndex    = 0;
    let aciertos         = 0;
    let seleccionUsuario = null;
    let preguntaEvaluada = false;

    // ── Referencias DOM ───────────────────────────────────────────────────
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

    if (nivelLabel)    nivelLabel.textContent    = nivelActual;
    if (totalLbl)      totalLbl.textContent      = preguntas.length;
    if (contadorLabel) contadorLabel.textContent = `1 / ${preguntas.length}`;

    ocultarFeedback();

    // ── Cargar pregunta ───────────────────────────────────────────────────
    function cargarPregunta() {
        seleccionUsuario = null;
        preguntaEvaluada = false;
        ocultarFeedback();
        btnComprobar.style.display = 'none';
        btnComprobar.disabled = false;

        const p = preguntas[preguntaIndex];
        txtPregunta.textContent = p.pregunta;
        if (p.imagen && p.imagen.trim()) imgPregunta.src = p.imagen;

        const numActual = preguntaIndex + 1;
        if (pregActualLbl)  pregActualLbl.textContent  = numActual;
        if (contadorLabel)  contadorLabel.textContent  = `${numActual} / ${preguntas.length}`;
        barraProgreso.style.width = `${(numActual / preguntas.length) * 100}%`;

        divOpciones.innerHTML = '';
        Object.keys(p.opciones).forEach((key, idx) => {
            const btn = document.createElement('div');
            btn.classList.add('opcion');
            btn.dataset.key = key;
            btn.style.opacity = '0';
            btn.style.transform = 'translateX(-14px)';
            btn.innerHTML = `
                <span class="letra">${key}</span>
                <span class="texto-opcion">${p.opciones[key]}</span>
                <span class="estado-icon" aria-hidden="true"></span>`;
            btn.addEventListener('click', () => seleccionar(btn, key));
            divOpciones.appendChild(btn);
            requestAnimationFrame(() => {
                setTimeout(() => {
                    btn.style.transition = 'opacity .28s ease, transform .28s ease';
                    btn.style.opacity = '1';
                    btn.style.transform = 'translateX(0)';
                }, idx * 55);
            });
        });
    }

    function seleccionar(btn, key) {
        if (preguntaEvaluada) return;
        divOpciones.querySelectorAll('.opcion').forEach(o => o.classList.remove('seleccionada'));
        btn.classList.add('seleccionada');
        seleccionUsuario = key;
        btnComprobar.style.display = 'block';
    }

    btnComprobar.addEventListener('click', () => {
        if (preguntaEvaluada || !seleccionUsuario) return;
        preguntaEvaluada = true;
        btnComprobar.disabled = true;
        btnComprobar.style.display = 'none';

        const p = preguntas[preguntaIndex];
        const esCorrecta = seleccionUsuario === p.correcta;
        if (esCorrecta) aciertos++;

        divOpciones.querySelectorAll('.opcion').forEach(opt => {
            const k = opt.dataset.key;
            opt.style.pointerEvents = 'none';
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
        resultado.className = `resultado ${esCorrecto ? 'correcto' : 'incorrecto'}`;
        resultIco.textContent = esCorrecto ? '' : '';
        resultMsg.textContent = esCorrecto
            ? '¡Correcto! Muy bien.'
            : `La respuesta correcta era: ${keyCorrecta}) ${textoCorrecta}`;
        resultWrapper.classList.add('visible');
        setTimeout(() => resultWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
    }

    function ocultarFeedback() {
        resultWrapper.classList.remove('visible');
        resultado.className = 'resultado';
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

    // ── Finalizar nivel ───────────────────────────────────────────────────
    async function finalizarNivel() {
        const porcentaje = (aciertos / preguntas.length) * 100;
        const aprobado   = porcentaje >= 80;

        if (!aprobado) {
            mostrarPantallaFinal(false, `Necesitas al menos ${Math.ceil(preguntas.length * 0.8)} aciertos para aprobar.`);
            return;
        }

        try {
            const userData    = await getUserData(sessionUser.id);
            let updatePayload = {};
            let monedasGanadas = 0;
            let mensaje        = '¡Nivel completado!';
            let skinDesbloqueada = null;

            // Solo recompensar si es la primera vez que completa este nivel
            if (nivelActual === userData.level) {
                const nuevoNivel = userData.level + 1;
                updatePayload.level = nuevoNivel;
                updatePayload.coins = (userData.coins || 0) + 20;
                monedasGanadas = 20;
                mensaje += ' +20 monedas 🪙';

                // ── DESBLOQUEO REAL DE SKIN ───────────────────────────────
                if (SKIN_REWARDS[nuevoNivel]) {
                    skinDesbloqueada = SKIN_REWARDS[nuevoNivel];
                    try {
                        // Intentar añadir la skin al inventario del usuario
                        const skinRes = await fetch('/api/skins/unlock', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId: sessionUser.id,
                                skinId: skinDesbloqueada
                            })
                        });
                        const skinData = await skinRes.json();
                        if (skinData.success) {
                            mensaje += ` · ¡Nueva apariencia desbloqueada! 🏠`;
                        }
                    } catch (skinErr) {
                        console.warn('No se pudo desbloquear la skin:', skinErr);
                        // No interrumpir el flujo principal
                    }
                }
            } else {
                mensaje = 'Repaso completado · Sin recompensa extra.';
            }

            if (Object.keys(updatePayload).length > 0) {
                await updateUserData(sessionUser.id, updatePayload);
            }

            mostrarPantallaFinal(true, mensaje, monedasGanadas, skinDesbloqueada);
        } catch (err) {
            console.error(err);
            mostrarPantallaFinal(false, 'Error al guardar progreso.');
        }
    }

    // ── Pantalla final ────────────────────────────────────────────────────
    function mostrarPantallaFinal(exito, mensaje, monedas = 0, skinId = null) {
        const pct = Math.round((aciertos / preguntas.length) * 100);

        const skinBadge = skinId
            ? `<div style="background:#eaf7f0;border:1px solid #a5d6a7;border-radius:12px;
                          padding:12px 16px;margin-bottom:16px;font-size:0.88rem;color:#2e7d32;font-weight:700;">
                🏠 Nueva apariencia de casa desbloqueada.<br>
                <span style="font-weight:400;font-size:0.82rem">Visita tu perfil para equiparla.</span>
               </div>`
            : '';

        modalBody.innerHTML = `
            <div style="margin-bottom:6px;font-size:3.8rem;line-height:1;">
                ${exito ? '🏆' : '📚'}
            </div>
            <h2 style="font-size:1.55rem;font-weight:800;color:#2C405B;margin-bottom:8px;">
                ${exito ? '¡Felicidades!' : '¡Casi lo logras!'}
            </h2>
            <p style="font-size:2rem;font-weight:900;color:${exito ? '#1e8a4a' : '#c0392b'};margin-bottom:6px;">
                ${aciertos} / ${preguntas.length}
            </p>
            <p style="font-size:.88rem;color:#718096;margin-bottom:4px;">${pct}% de aciertos</p>
            <p style="font-size:.88rem;color:#4a5568;margin-bottom:16px;line-height:1.55;
                      background:${exito ? '#eaf7f0' : '#fff3e0'};
                      border-radius:10px;padding:10px 14px;">
                ${mensaje}
            </p>
            ${skinBadge}
            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                <button onclick="window.location.href='/lecciones.html'"
                        class="btn-modal btn-secondary">
                    Ver lecciones
                </button>
                ${!exito ? `
                <button onclick="window.location.reload()"
                        class="btn-modal btn-primary">
                    🔄 Reintentar
                </button>` : ''}
            </div>`;

        modalFinal.style.display = 'flex';
    }

    cargarPregunta();
});