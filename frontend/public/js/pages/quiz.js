import { updateUserData, getUserData } from '../modules/api.js';
import { protectRoute, getAuthData } from '../modules/auth.js';
import preguntasPorNivel, { SKIN_REWARDS } from '../data/preguntas.js';

document.addEventListener('DOMContentLoaded', async () => {

    /* ================= SEGURIDAD ================= */
    if (!protectRoute()) return;
    const sessionUser = getAuthData();

    /* ================= NIVEL ================= */
    const urlParams = new URLSearchParams(window.location.search);
    const nivelActual = parseInt(urlParams.get('level')) || 1;

    /* ================= PREGUNTAS ================= */
    const preguntas = preguntasPorNivel[nivelActual];

    if (!preguntas || preguntas.length === 0) {
        alert("Este nivel aún no tiene preguntas disponibles.");
        window.location.href = '/lecciones.html';
        return;
    }

    /* ================= ESTADO ================= */
    let preguntaIndex = 0;
    let aciertos = 0;
    let seleccionUsuario = null;

    /* ================= DOM ================= */
    const txtPregunta = document.getElementById("textoPregunta");
    const imgPregunta = document.getElementById("imagenPregunta");
    const divOpciones = document.getElementById("opcionesContainer");
    const btnComprobar = document.getElementById("botonComprobar");
    const barraProgreso = document.querySelector(".progreso");
    const divResultado = document.getElementById("resultado");
    const nivelLabel = document.getElementById("nivel-actual");
    const preguntaActualLabel = document.getElementById("pregunta-actual");
    const totalPreguntasLabel = document.getElementById("total-preguntas");

    if (nivelLabel) nivelLabel.textContent = nivelActual;
    if (totalPreguntasLabel) totalPreguntasLabel.textContent = preguntas.length;

    /* ================= FUNCIONES ================= */

    function cargarPregunta() {
        divResultado.style.display = "none";
        btnComprobar.style.display = "none";
        seleccionUsuario = null;

        const p = preguntas[preguntaIndex];
        txtPregunta.textContent = p.texto;

        // Imagen segura
        if (imgPregunta && p.imagen) {
            imgPregunta.src = p.imagen;
            imgPregunta.style.display = "block";
        } else if (imgPregunta) {
            imgPregunta.style.display = "none";
        }

        if (preguntaActualLabel) {
            preguntaActualLabel.textContent = preguntaIndex + 1;
        }

        divOpciones.innerHTML = "";
        for (let key in p.opciones) {
            const btn = document.createElement("div");
            btn.classList.add("opcion");
            btn.innerHTML = `<strong>${key})</strong> ${p.opciones[key]}`;
            btn.onclick = () => seleccionar(btn, key);
            divOpciones.appendChild(btn);
        }

        actualizarBarra();
    }

    function seleccionar(btn, key) {
        document.querySelectorAll(".opcion").forEach(b => b.classList.remove("seleccionada"));
        btn.classList.add("seleccionada");
        seleccionUsuario = key;
        btnComprobar.style.display = "block";
    }

    btnComprobar.addEventListener('click', () => {
        const p = preguntas[preguntaIndex];
        const esCorrecta = seleccionUsuario === p.correcta;

        document.querySelectorAll(".opcion").forEach(b => b.style.pointerEvents = "none");

        document.querySelectorAll(".opcion").forEach(b => {
            const letra = b.textContent.trim()[0];
            if (letra === p.correcta) b.classList.add("correcta");
            else if (letra === seleccionUsuario && !esCorrecta) b.classList.add("incorrecta");
        });

        if (esCorrecta) {
            aciertos++;
            mostrarFeedback(true);
        } else {
            mostrarFeedback(false, p.correcta, p.opciones[p.correcta]);
        }
    });

    function mostrarFeedback(esCorrecto, keyCorrecta, textoCorrecta) {
        divResultado.style.display = "flex";
        divResultado.className = `resultado ${esCorrecto ? 'correcto' : 'incorrecto'}`;

        divResultado.innerHTML = `
            <div>
                ${esCorrecto 
                    ? "✅ ¡Correcto!" 
                    : `❌ Incorrecto. La correcta era: ${keyCorrecta}) ${textoCorrecta}`
                }
            </div>
            <button id="btn-next">Siguiente</button>
        `;

        document.getElementById("btn-next").onclick = avanzar;
    }

    async function avanzar() {
        preguntaIndex++;
        if (preguntaIndex < preguntas.length) {
            cargarPregunta();
        } else {
            await finalizarNivel();
        }
    }

    function actualizarBarra() {
        if (!barraProgreso) return;
        const pct = ((preguntaIndex + 1) / preguntas.length) * 100;
        barraProgreso.style.width = `${pct}%`;
    }

    /* ================= FINALIZAR ================= */

    async function finalizarNivel() {
        divOpciones.innerHTML = "";
        txtPregunta.textContent = "Procesando resultados...";

        const porcentaje = (aciertos / preguntas.length) * 100;
        const aprobado = porcentaje >= 80;

        if (!aprobado) {
            mostrarPantallaFinal(false, `Necesitas al menos ${Math.ceil(preguntas.length * 0.8)} aciertos para aprobar.`);
            return;
        }

        try {
            const userData = await getUserData(sessionUser.id);

            let updatePayload = {};
            let mensaje = "¡Nivel Completado!";
            let monedasGanadas = 0;

            if (nivelActual === userData.level) {
                updatePayload.level = userData.level + 1;
                updatePayload.coins = userData.coins + 20;
                monedasGanadas = 20;
                mensaje += " (+20 Monedas 🪙)";

                if (SKIN_REWARDS[updatePayload.level]) {
                    mensaje += " ¡Nueva Skin Desbloqueada!";
                }
            } else {
                mensaje = "Repaso completado (sin recompensa extra).";
            }

            if (Object.keys(updatePayload).length > 0) {
                await updateUserData(sessionUser.id, updatePayload);
            }

            mostrarPantallaFinal(true, mensaje, monedasGanadas);

        } catch (err) {
            console.error(err);
            mostrarPantallaFinal(false, "Error al guardar progreso.");
        }
    }

    function mostrarPantallaFinal(exito, mensaje, monedas = 0) {
        divResultado.style.display = "flex";
        divResultado.className = `resultado ${exito ? 'correcto' : 'incorrecto'}`;

        divResultado.innerHTML = `
            <div style="text-align:center">
                <h2>${exito ? "🎉 ¡Felicidades!" : "😕 Intenta de nuevo"}</h2>
                <p>${aciertos}/${preguntas.length} Aciertos</p>
                <p>${mensaje}</p>
                <button onclick="window.location.href='/lecciones.html'">
                    Volver al Menú
                </button>
            </div>
        `;
    }

    /* ================= INICIO ================= */
    cargarPregunta();
});
