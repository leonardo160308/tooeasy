import { protectRoute, getAuthData } from '../modules/auth.js';
import { alertaError } from '../modules/alerts.js';

const API_URL = 'http://localhost:3000/api';

let flashcards = [];
let currentIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
    if (!protectRoute()) return;

    const sessionUser = getAuthData();
    const userId = sessionUser.id;

    // Obtener nivel desde URL
    const urlParams = new URLSearchParams(window.location.search);
    const nivelId = parseInt(urlParams.get('level'));

    if (!nivelId) {
        alertaError('Nivel no especificado');
        setTimeout(() => window.location.href = 'lecciones.html', 2000);
        return;
    }

    // ========================================
    // CARGAR FLASHCARDS DESDE LA BD
    // ========================================
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
    const card = document.getElementById('flashcard');
    const cardInner = card.querySelector('.card-inner');
    const titleFront = document.getElementById('card-title-front');
    const titleBack = document.getElementById('card-title-back');
    const image = document.getElementById('card-image');
    const content = document.getElementById('card-content');
    const counter = document.getElementById('card-counter');
    const btnPrev = document.getElementById('prevCard');
    const btnNext = document.getElementById('nextCard');
    const btnQuiz = document.getElementById('btn-ir-quiz');
    const lessonTitle = document.getElementById('lesson-title');
    const lessonSubtitle = document.getElementById('lesson-subtitle');

    // Header
    function getTemaYNivel(level) {
        if (level <= 3) return { tema: "Fundamentos", nivelEnTema: level };
        if (level <= 6) return { tema: "Cuentas Bancarias", nivelEnTema: level - 3 };
        if (level <= 10) return { tema: "Tarjetas", nivelEnTema: level - 6 };
        if (level <= 13) return { tema: "Administración del Dinero", nivelEnTema: level - 10 };
        if (level <= 17) return { tema: "Deudas y Créditos", nivelEnTema: level - 13 };
        return { tema: "Desconocido", nivelEnTema: 1 };
    }

    const { tema, nivelEnTema } = getTemaYNivel(nivelId);
    lessonTitle.textContent = flashcards[0].titulo;
    lessonSubtitle.textContent = `${tema} - Nivel ${nivelEnTema}`;

    // Renderizar tarjeta
function renderCard() {
    const current = flashcards[currentIndex];

    titleFront.textContent = current.titulo;
    titleBack.textContent = current.titulo;
    content.textContent = current.contenido;
    counter.textContent = `Tarjeta ${currentIndex + 1} de ${flashcards.length}`;

    // ✅ MOSTRAR IMAGEN SOLO SI EXISTE
    if (current.imagen && current.imagen.trim() !== '') {
        image.src = current.imagen;
        image.style.display = 'block';
    } else {
        image.style.display = 'none'; // 👈 OCULTAR SI NO HAY IMAGEN
    }

    btnPrev.style.display = currentIndex > 0 ? 'flex' : 'none';
    btnNext.style.display = currentIndex < flashcards.length - 1 ? 'flex' : 'none';
    btnQuiz.style.display = currentIndex === flashcards.length - 1 ? 'inline-block' : 'none';

    cardInner.classList.remove('flipped');
}

    // ✅ EVENTO DE VOLTEO (ESTO ES LO QUE FALTABA)
    card.addEventListener('click', (e) => {
        // Evitar voltear si se hace click en las flechas
        if (e.target.closest('.arrow-btn')) return;
        
        cardInner.classList.toggle('flipped');
    });

    btnPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentIndex > 0) {
            currentIndex--;
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
        window.location.href = `quiz.html?level=${nivelId}`;
    });

    renderCard();
});