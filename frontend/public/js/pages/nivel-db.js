import { protectRoute, getAuthData, getSessionToken } from '../modules/auth.js';
import { alertaError } from '../modules/alerts.js';

const API_URL = '/api';

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
    const nivelId  = parseInt(urlParams.get('level'));
    const levelNum = parseInt(urlParams.get('levelNum')) || nivelId;

    if (!nivelId) {
        alertaError('Nivel no especificado');
        setTimeout(() => window.location.href = 'lecciones.html', 2000);
        return;
    }

    // Verificar que el usuario tiene acceso a este nivel (anti-skip por URL)
    const sessionToken = getSessionToken();
    try {
        const accessRes = await fetch(`${API_URL}/progress/check-access/${nivelId}`, {
            headers: sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}
        });

        if (accessRes.status === 401) {
            // Sesión inválida — redirigir a login
            window.location.href = '/login.html';
            return;
        }

        const accessData = await accessRes.json();
        if (!accessData.success || !accessData.canAccess) {
            alertaError('Este nivel está bloqueado. Completa los anteriores primero.');
            setTimeout(() => window.location.href = 'lecciones.html', 2500);
            return;
        }
    } catch {
        // Error de red — denegar acceso por seguridad
        alertaError('No se pudo verificar el acceso. Comprueba tu conexión.');
        setTimeout(() => window.location.href = 'lecciones.html', 2500);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/flashcards/level/${nivelId}`);
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            flashcards = data.data;
        } else {
            alertaError('Este nivel no tiene flashcards aún. Volviendo...', {
                duration: 3000,
                onClose: () => window.location.href = 'lecciones.html'
            });
            return;
        }
    } catch (error) {
        console.error('Error cargando flashcards:', error);
        alertaError('Error de conexión. Intenta de nuevo.');
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
    lessonSub.textContent   = `Nivel ${levelNum}`;

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
        window.location.href = `quiz.html?level=${nivelId}&levelNum=${levelNum}`;
    });

    renderCard();
});