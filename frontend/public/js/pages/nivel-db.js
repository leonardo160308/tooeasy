import { protectRoute, getAuthData, getSessionToken } from '../modules/auth.js';
import { alertaError } from '../modules/alerts.js';

const API_URL    = '/api';
const MAX_LVL_ID = 99999;

// Acepta únicamente enteros positivos sin cero inicial, sin notación científica,
// sin decimales y dentro del rango 1–99999.
// Ejemplos bloqueados: "3e5", "3.5", "-1", "0", "99999999999", "abc", "3e+25"
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

let flashcards = [];
let currentIndex = 0;

// Convierte markdown básico a HTML seguro (escapa HTML primero)
function markdownToHtml(raw) {
    if (!raw) return '';

    // 1. Escapar caracteres HTML para prevenir XSS
    const escaped = raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    // 2. Procesar línea a línea para soporte de listas
    const lines = escaped.split('\n');
    const parts = [];
    let inList = false;

    for (const line of lines) {
        const listMatch = line.match(/^[-*•]\s+(.+)/);
        if (listMatch) {
            if (!inList) { parts.push('<ul>'); inList = true; }
            parts.push(`<li>${applyInlineFmt(listMatch[1])}</li>`);
        } else {
            if (inList) { parts.push('</ul>'); inList = false; }
            if (line.trim() === '') {
                parts.push('<br>');
            } else {
                parts.push(applyInlineFmt(line) + '<br>');
            }
        }
    }
    if (inList) parts.push('</ul>');

    // Quitar <br> redundante al final
    let html = parts.join('');
    html = html.replace(/(<br>)+$/, '');
    return html;
}

function applyInlineFmt(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.*?)__/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/_(.*?)_/g, '<em>$1</em>');
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!protectRoute()) return;

    const sessionUser = getAuthData();
    const userId = sessionUser.id;

    const urlParams = new URLSearchParams(window.location.search);
    const nivelId   = parseLevelId(urlParams.get('level'));
    // levelNum de la URL se ignora completamente — el número real viene del backend.

    if (!nivelId) {
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

    // Cargar flashcards y metadatos del nivel.
    // La respuesta incluye level.orden — fuente de verdad para la UI, nunca la URL.
    let levelMeta = null;
    try {
        const response = await fetch(`${API_URL}/progress/level/${nivelId}/flashcards`, {
            headers: authHeaders
        });

        if (response.status === 401) {
            window.location.href = '/login.html';
            return;
        }
        if (response.status === 403) {
            alertaError('Este nivel está bloqueado. Completa los anteriores primero.');
            setTimeout(() => window.location.href = '/lecciones.html', 2500);
            return;
        }

        const data = await response.json();

        if (data.success && data.data.length > 0) {
            flashcards = data.data;
            levelMeta  = data.level; // { orden, nombre } — del backend, no de la URL
        } else {
            alertaError('Este nivel no tiene flashcards aún. Volviendo...', {
                duration: 3000,
                onClose: () => window.location.href = '/lecciones.html'
            });
            return;
        }
    } catch (error) {
        console.error('Error cargando flashcards:', error);
        alertaError('No se pudo verificar el acceso. Comprueba tu conexión.');
        setTimeout(() => window.location.href = '/lecciones.html', 2500);
        return;
    }

    // Referencias DOM
    const card         = document.getElementById('flashcard');
    const cardInner    = card.querySelector('.card-inner');
    const titleFront   = document.getElementById('card-title-front');
    const titleBack    = document.getElementById('card-title-back');
    const image        = document.getElementById('card-image');
    const content      = document.getElementById('card-content');
    const counter      = document.getElementById('card-counter');
    const btnPrev      = document.getElementById('prevCard');
    const btnNext      = document.getElementById('nextCard');
    const btnQuiz      = document.getElementById('btn-ir-quiz');
    const lessonTitle  = document.getElementById('lesson-title');
    const lessonSub    = document.getElementById('lesson-subtitle');

    // ── HINT de interacción ──────────────────────────────────────────────
    // Crear el elemento hint y añadirlo a la cara frontal
    const flipHint = document.createElement('div');
    flipHint.className = 'flip-hint';
    flipHint.textContent = 'Haz clic para ver la información';
    card.querySelector('.card-front').appendChild(flipHint);

    lessonTitle.textContent = flashcards[0].titulo;
    // Número de nivel tomado del backend (levelMeta.orden), nunca de la URL.
    lessonSub.textContent   = levelMeta ? `Nivel ${levelMeta.orden}` : 'Nivel';

    // ── Renderizar tarjeta ───────────────────────────────────────────────
    let isFlipping = false;

    function renderCard() {
        const current = flashcards[currentIndex];

        titleFront.textContent = current.titulo;
        titleBack.textContent  = current.titulo;
        content.innerHTML      = markdownToHtml(current.contenido);
        counter.textContent    = `Tarjeta ${currentIndex + 1} de ${flashcards.length}`;

        if (current.imagen && current.imagen.trim() !== '') {
            image.src = current.imagen;
            image.classList.remove('hidden');
        } else {
            image.classList.add('hidden');
        }

        btnPrev.classList.toggle('hidden', !(currentIndex > 0));
        btnNext.classList.toggle('hidden', !(currentIndex < flashcards.length - 1));
        btnQuiz.classList.toggle('hidden', !(currentIndex === flashcards.length - 1));

        // Volver a la cara frontal al cambiar tarjeta y liberar el guard
        cardInner.classList.remove('flipped');
        isFlipping = false;
    }

    // ── EVENTO DE VOLTEO — solo clic, nunca hover ────────────────────────
    card.addEventListener('click', (e) => {
        // Ignorar si el clic viene de las flechas
        if (e.target.closest('.arrow-btn')) return;
        // Guard: evitar clics durante la animación de volteo (previene bugs en móvil)
        if (isFlipping) return;

        isFlipping = true;
        cardInner.classList.toggle('flipped');

        // Marcar que ya fue volteada al menos una vez → oculta el hint
        if (!card.classList.contains('has-been-flipped')) {
            card.classList.add('has-been-flipped');
        }

        // Liberar el guard cuando termina la transición CSS (0.6s + margen)
        setTimeout(() => { isFlipping = false; }, 650);
    });

    // ── Navegación ───────────────────────────────────────────────────────
    btnPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentIndex > 0) {
            currentIndex--;
            // Restaurar hint al cambiar de tarjeta (buena UX para usuarios nuevos en tarjetas posteriores)
            // Solo si no la han volteado: la clase ya está en `card`, así que se mantiene
            renderCard();
        }
    });

    btnNext.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentIndex < flashcards.length - 1) {
            currentIndex++;
            renderCard();
        }
    });

    btnQuiz.addEventListener('click', () => {
        // levelNum eliminado de la URL — quiz.js lee el número del nivel del backend.
        window.location.href = `quiz.html?level=${nivelId}`;
    });

    renderCard();
});