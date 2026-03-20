// frontend/public/js/pages/lessons.js
import { getUserData } from '../modules/api.js';
import { protectRoute, getAuthData } from '../modules/auth.js';
import { alertaError } from '../modules/alerts.js';

const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', async () => {
    // ========================================
    // 1. SEGURIDAD
    // ========================================
    if (!protectRoute()) return;
    
    const sessionUser = getAuthData();
    const userId = sessionUser.id;

    // ========================================
    // 2. MAPEO HTML → BD (CRÍTICO)
    // ========================================
    const categoryMap = {
        'fundamentos': 1,
        'cuentas-bancarias': 2,
        'tarjetas': 3,
        'administracion': 4,
        'deudas-creditos': 5
    };

    let userLevel = 1;
    let allLevelsDB = [];

    try {
        // ========================================
        // 3. CARGAR DATOS DEL USUARIO Y NIVELES
        // ========================================
        const loadingEl = document.querySelector('.loading-levels');
        
        const [userData, levelsResponse] = await Promise.all([
            getUserData(userId),
            fetch(`${API_URL}/levels`) // ✅ RUTA PÚBLICA
        ]);

        const levelsResult = await levelsResponse.json();

        userLevel = userData.level || 1;
        
        if (levelsResult.success) {
            allLevelsDB = levelsResult.data;
            console.log('✅ Niveles cargados:', allLevelsDB.length);
        } else {
            alertaError('No se pudieron cargar los niveles');
        }

        // Quitar loading
        if (loadingEl) loadingEl.remove();

    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        alertaError('Error de conexión al cargar lecciones');
        
        const loadingEl = document.querySelector('.loading-levels');
        if (loadingEl) {
            loadingEl.innerHTML = '<p style="color: red;">Error al cargar. Recarga la página.</p>';
        }
        return;
    }

    // ========================================
    // 4. FUNCIÓN PARA RENDERIZAR NIVELES
    // ========================================
    function renderizarLeccion(card) {
        const categorySlug = card.dataset.category;
        const categoryId = categoryMap[categorySlug];

        if (!categoryId) {
            console.error('❌ Categoría no mapeada:', categorySlug);
            return;
        }

        // Filtrar niveles de esta categoría
        const levelsForThisCard = allLevelsDB.filter(l => Number(l.category_id) === Number(categoryId));
        
        console.log(`📚 ${categorySlug} (ID: ${categoryId}): ${levelsForThisCard.length} niveles encontrados`);

        const levelsContainer = card.querySelector('.levels-container');
        const progressBar = levelsContainer.querySelector('.progress-bar');
        
        // Limpiar contenido previo
        levelsContainer.innerHTML = '';
        if (progressBar) levelsContainer.appendChild(progressBar);

        if (levelsForThisCard.length === 0) {
            const msg = document.createElement('p');
            msg.textContent = "Próximamente...";
            msg.style.cssText = "padding: 10px; color: #666; text-align: center;";
            levelsContainer.insertBefore(msg, progressBar);
            return;
        }

        // Contadores para barra de progreso
        let completedInLesson = 0;
        const totalLevels = levelsForThisCard.length;

        // Generar HTML de niveles
        levelsForThisCard.forEach(nivel => {
            const globalOrden = nivel.orden;
            
            const isCompleted = globalOrden < userLevel;
            const isActive = globalOrden === userLevel;
            const isLocked = globalOrden > userLevel;

            if (isCompleted) completedInLesson++;

            const levelDiv = document.createElement('div');
            levelDiv.classList.add('level-item');

            if (isCompleted) levelDiv.classList.add('completed');
            else if (isActive) levelDiv.classList.add('active');
            else levelDiv.classList.add('locked');

            levelDiv.innerHTML = `
                <div class="level-info">
                    <span class="level-num">Nivel ${globalOrden}</span>
                    <span class="level-name">${nivel.nombre}</span>
                </div>
                ${
                    (isActive || isCompleted)
                        ? `<button class="btn-play">Jugar</button>`
                        : `<i class="fa-solid fa-lock"></i>`
                }
            `;

            // Evento click
            if (isActive || isCompleted) {
                const btn = levelDiv.querySelector('button');
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.location.href = `/nivel.html?level=${nivel.id}`; // ✅ USA EL ID REAL
                });
            }

            levelsContainer.insertBefore(levelDiv, progressBar);
        });

        // Actualizar barra de progreso
        const progressFill = progressBar?.querySelector('.progress-fill');
        if (progressFill) {
            const percent = totalLevels === 0 ? 0 : (completedInLesson / totalLevels) * 100;
            progressFill.style.width = `${percent}%`;
        }
    }

    // ========================================
    // 5. EVENTOS CLICK EN TARJETAS
    // ========================================
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') return;

            // Cerrar otras tarjetas
            document.querySelectorAll('.category-card').forEach(otherCard => {
                if (otherCard !== card) {
                    const otherLevels = otherCard.querySelector('.levels-container');
                    otherLevels.classList.add('hidden');
                }
            });

            const levelsContainer = card.querySelector('.levels-container');
            const isHidden = levelsContainer.classList.contains('hidden');

            levelsContainer.classList.toggle('hidden');

            // Renderizar solo cuando se abre
            if (isHidden) {
                renderizarLeccion(card);
            }
        });
    });
});