// frontend/public/js/pages/lessons.js
import { getUserData } from '../modules/api.js';
import { protectRoute, getAuthData } from '../modules/auth.js';
import { alertaError, alertaInfo } from '../modules/alerts.js';

const API_URL = '/api';

document.addEventListener('DOMContentLoaded', async () => {
    if (!protectRoute()) return;

    const sessionUser = getAuthData();
    const userId = sessionUser.id;

    let userLevel = 1;
    let allLevelsDB = [];
    let allCategoriesDB = [];

    // ── Contenedor de tarjetas dinámico ──────────────────────────────────
    const tarjetasContainer = document.querySelector('.tarjetas');
    const loadingEl = document.querySelector('.loading-levels');

    // ── Cargar datos frescos desde la BD (sin caché) ──────────────────────
    async function fetchFreshData() {
        // Forzar sin caché con timestamp + Cache-Control header
        const ts = Date.now();

        const [userData, categoriesRes, levelsRes] = await Promise.all([
            getUserData(userId),
            fetch(`${API_URL}/admin/categories?_=${ts}`, {
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            }),
            fetch(`${API_URL}/levels?_=${ts}`, {
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            })
        ]);

        const categoriesData = await categoriesRes.json();
        const levelsData     = await levelsRes.json();

        userLevel = userData.level || 1;

        if (categoriesData.success) {
            allCategoriesDB = categoriesData.data || [];
        } else {
            alertaError('No se pudieron cargar las categorías');
            allCategoriesDB = [];
        }

        if (levelsData.success) {
            allLevelsDB = levelsData.data || [];
        } else {
            alertaError('No se pudieron cargar los niveles');
            allLevelsDB = [];
        }
    }

    // ── Renderizar tarjetas dinámicamente desde la BD ─────────────────────
    function renderCategories() {
        if (!tarjetasContainer) return;
        tarjetasContainer.innerHTML = '';

        if (allCategoriesDB.length === 0) {
            tarjetasContainer.innerHTML = `
                <div style="text-align:center;padding:40px;color:#718096;font-size:1rem;font-weight:600;width:100%;">
                    No hay categorías disponibles aún.
                </div>`;
            return;
        }

        // Alternar entre estilos A y D para las tarjetas
        allCategoriesDB.forEach((cat, idx) => {
            const isD = idx % 2 === 0;
            const typeClass = isD ? 'tarjetaD' : 'tarjetaA';
            const headerClass = isD ? 'tarjeta-headerD' : 'tarjeta-headerA';
            const bodyClass = isD ? 'tarjeta-bodyD' : 'tarjeta-bodyA';

            const card = document.createElement('div');
            card.className = `${typeClass} category-card`;
            card.dataset.categoryId = cat.id;
            card.dataset.categoryName = cat.nombre;

            card.innerHTML = `
                <div class="${headerClass}">
                    <h3>${escHtml(cat.nombre)}</h3>
                </div>
                <div class="${bodyClass}">
                    <p>${escHtml(cat.descripcion || 'Aprende los conceptos de esta categoría.')}</p>
                </div>
                <div class="levels-container hidden">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                </div>`;

            tarjetasContainer.appendChild(card);

            // Evento click en la tarjeta
            card.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') return;

                // Cerrar otras tarjetas
                document.querySelectorAll('.category-card').forEach(otherCard => {
                    if (otherCard !== card) {
                        otherCard.querySelector('.levels-container')?.classList.add('hidden');
                    }
                });

                const levelsContainer = card.querySelector('.levels-container');
                const isHidden = levelsContainer.classList.contains('hidden');
                levelsContainer.classList.toggle('hidden');

                if (isHidden) {
                    renderLevelsForCategory(card, cat.id);
                }
            });
        });
    }

    // ── Renderizar niveles de una categoría ───────────────────────────────
    function renderLevelsForCategory(card, categoryId) {
        const levelsContainer = card.querySelector('.levels-container');
        const progressBar = levelsContainer.querySelector('.progress-bar');

        // Limpiar niveles anteriores (pero preservar la barra de progreso)
        Array.from(levelsContainer.children).forEach(child => {
            if (!child.classList.contains('progress-bar')) {
                child.remove();
            }
        });

        // Filtrar niveles de esta categoría, ordenados por 'orden'
        const categoryLevels = allLevelsDB
            .filter(l => Number(l.category_id) === Number(categoryId))
            .sort((a, b) => a.orden - b.orden);

        if (categoryLevels.length === 0) {
            const msg = document.createElement('p');
            msg.textContent = 'Próximamente...';
            msg.style.cssText = 'padding:10px;color:#666;text-align:center;font-style:italic;';
            levelsContainer.insertBefore(msg, progressBar);
            return;
        }

        let completedInCategory = 0;
        const totalLevels = categoryLevels.length;

        categoryLevels.forEach(nivel => {
            const globalOrden = nivel.orden;
            const isCompleted = globalOrden < userLevel;
            const isActive    = globalOrden === userLevel;
            const isLocked    = globalOrden > userLevel;

            if (isCompleted) completedInCategory++;

            const levelDiv = document.createElement('div');
            levelDiv.classList.add('level-item');
            if (isCompleted) levelDiv.classList.add('completed');
            else if (isActive) levelDiv.classList.add('active');
            else levelDiv.classList.add('locked');

            levelDiv.innerHTML = `
                <div class="level-info">
                    <span class="level-num">Nivel ${globalOrden}</span>
                    <span class="level-name">${escHtml(nivel.nombre)}</span>
                </div>
                ${(isActive || isCompleted)
                    ? `<button class="btn-play">Jugar</button>`
                    : `<i class="fa-solid fa-lock"></i>`}`;

            if (isActive || isCompleted) {
                const btn = levelDiv.querySelector('button');
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.location.href = `/nivel.html?level=${nivel.id}`;
                });
            }

            levelsContainer.insertBefore(levelDiv, progressBar);
        });

        // Actualizar barra de progreso
        const progressFill = progressBar?.querySelector('.progress-fill');
        if (progressFill) {
            const percent = totalLevels === 0 ? 0 : (completedInCategory / totalLevels) * 100;
            progressFill.style.width = `${percent}%`;
        }
    }

    // ── Utilidad: escapar HTML ────────────────────────────────────────────
    function escHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ── Inicializar ───────────────────────────────────────────────────────
    try {
        await fetchFreshData();
        if (loadingEl) loadingEl.remove();
        renderCategories();
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        alertaError('Error de conexión al cargar lecciones');
        if (loadingEl) {
            loadingEl.innerHTML = '<p style="color:red;">Error al cargar. Recarga la página.</p>';
        }
    }
});