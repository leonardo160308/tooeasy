/* assets/js/pages/lessons.js */

import { getUserData } from '../modules/api.js';
import { protectRoute, getAuthData } from '../modules/auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Seguridad
    if (!protectRoute()) return;
    const sessionUser = getAuthData();
    const userId = sessionUser.id;

    // 2. MAPEO GLOBAL DE LECCIONES → NIVELES
    const lessonsConfig = {
        fundamentos: { start: 1, end: 3 },
        'cuentas-bancarias': { start: 4, end: 6 },
        tarjetas: { start: 7, end: 10 },
        administracion: { start: 11, end: 13 },
        'deudas-creditos': { start: 14, end: 17 }
    };

    // 3. Progreso global
    let userLevel = 1;

    try {
        const userData = await getUserData(userId);
        userLevel = userData.level || 1;
        console.log('Nivel global actual:', userLevel);

        // ✅ QUITAR LOADING REAL
        const loading = document.querySelector('.loading-levels');
        if (loading) loading.remove();

    } catch (error) {
        console.error('Error cargando progreso:', error);
    }

    // 4. Renderizar niveles de una lección
    function renderizarLeccion(card) {
        const category = card.dataset.category;
        const config = lessonsConfig[category];
        if (!config) return;

        const levelsContainer = card.querySelector('.levels-container');

        // 🔴 IMPORTANTE: conservar la barra
        const progressBar = levelsContainer.querySelector('.progress-bar');

        levelsContainer.innerHTML = '';
        if (progressBar) levelsContainer.appendChild(progressBar);

        const totalLevels = config.end - config.start + 1;
        let completedInLesson = 0;

        for (let globalLevel = config.start; globalLevel <= config.end; globalLevel++) {
            const localLevel = globalLevel - config.start + 1;

            const isCompleted = globalLevel < userLevel;
            const isActive = globalLevel === userLevel;

            if (isCompleted) completedInLesson++;

            const levelDiv = document.createElement('div');
            levelDiv.classList.add('level-item');

            if (isCompleted) levelDiv.classList.add('completed');
            else if (isActive) levelDiv.classList.add('active');
            else levelDiv.classList.add('locked');

            // ✅ BOTÓN EN COMPLETADOS Y ACTIVO
            levelDiv.innerHTML = `
                <span>Nivel ${localLevel}</span>
                ${
                    (isActive || isCompleted)
                        ? `<button>Estudiar</button>`
                        : `<i class="fa-solid fa-lock"></i>`
                }
            `;

            // 👉 Click en estudiar
            if (isActive || isCompleted) {
                levelDiv.querySelector('button').addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.location.href = `/nivel.html?level=${globalLevel}`;
                });
            }

            // Insertar antes de la barra
            levelsContainer.insertBefore(levelDiv, progressBar);
        }

        // 5. Barra de progreso por lección
        const progressFill = progressBar?.querySelector('.progress-fill');
        if (progressFill) {
            const percent = (completedInLesson / totalLevels) * 100;
            progressFill.style.width = `${percent}%`;
        }
    }

    // 6. Click en tarjeta
        document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {

            document.querySelectorAll('.category-card').forEach(otherCard => {
                if (otherCard !== card) {
                    const otherLevels = otherCard.querySelector('.levels-container');
                    otherLevels.classList.add('hidden');
                }
            });

            const levels = card.querySelector('.levels-container');
            const isHidden = levels.classList.contains('hidden');

            // Toggle SOLO de la tarjeta clickeada
            levels.classList.toggle('hidden');

            // Renderizar solo si se acaba de abrir
            if (isHidden) {
                renderizarLeccion(card);
            }
        });
    });

});
