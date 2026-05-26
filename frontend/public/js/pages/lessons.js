// frontend/public/js/pages/lessons.js
import { protectRoute, getAuthData }              from '../modules/auth.js';
import { alertaError }                            from '../modules/alerts.js';
import { initOnboarding, restartOnboarding }      from '../modules/onboarding.js';

const API_URL = '/api';

document.addEventListener('DOMContentLoaded', async () => {
    if (!protectRoute()) return;

    const sessionUser = getAuthData();
    const userId      = sessionUser.id;

    let allLevelsDB     = [];
    let allCategoriesDB = [];

    // KEY CHANGE: progressMap[categoryId] = [completedLevelId, ...]
    // This replaces the old single `userLevel` integer completely.
    let progressMap = {};

    const tarjetasContainer = document.querySelector('.tarjetas');
    const loadingEl         = document.querySelector('.loading-levels');

    // ── Fetch all data fresh (no cache) ───────────────────────────────────
    async function fetchFreshData() {
        const ts = Date.now();
        const headers = { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' };

        const [categoriesRes, levelsRes, progressRes] = await Promise.all([
            fetch(`${API_URL}/admin/categories?_=${ts}`, { headers }),
            fetch(`${API_URL}/levels?_=${ts}`,            { headers }),
            fetch(`${API_URL}/progress/${userId}?_=${ts}`,{ headers })
        ]);

        const [categoriesData, levelsData, progressData] = await Promise.all([
            categoriesRes.json(),
            levelsRes.json(),
            progressRes.json()
        ]);

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

        if (progressData.success) {
            // progressData.progress = { "42": [101, 102], "43": [201], ... }
            // Normalize keys and values to numbers for safe comparisons
            progressMap = {};
            Object.entries(progressData.progress || {}).forEach(([catId, levels]) => {
                progressMap[Number(catId)] = (levels || []).map(Number);
            });
        }
        // A failed progress load is non-fatal — the page will show only the
        // first level of each category as available, which is correct default.
    }

    // ── Render category cards ─────────────────────────────────────────────
    function renderCategories() {
        if (!tarjetasContainer) return;
        tarjetasContainer.innerHTML = '';
        document.querySelector('.edu-progress-banner')?.remove();

        if (allCategoriesDB.length === 0) {
            tarjetasContainer.innerHTML = `
                <div class="no-categories-msg">No hay categorías disponibles aún.</div>`;
            return;
        }

        let completedCats = 0;
        const totalCats = allCategoriesDB.length;

        allCategoriesDB.forEach((cat, idx) => {
            const catId  = Number(cat.id);
            const isD        = idx % 2 === 0;
            const typeClass  = isD ? 'tarjetaD'        : 'tarjetaA';
            const hdrClass   = isD ? 'tarjeta-headerD' : 'tarjeta-headerA';
            const bodyClass  = isD ? 'tarjeta-bodyD'   : 'tarjeta-bodyA';

            // Per-category progress badge
            const catLevels      = allLevelsDB.filter(l => Number(l.category_id) === catId);
            const catCompleted   = (progressMap[catId] || []).filter(
                id => catLevels.some(l => Number(l.id) === id)
            ).length;
            const catTotal       = catLevels.length;
            const isFullyCat     = catTotal > 0 && catCompleted === catTotal;
            if (isFullyCat) completedCats++;

            const badgeHtml = catTotal > 0
                ? `<span class="cat-progress-badge ${isFullyCat ? 'cat-badge-done' : ''}">
                       ${isFullyCat ? '✓ Completada' : `${catCompleted}/${catTotal} niveles`}
                   </span>`
                : '';

            const card = document.createElement('div');
            card.className       = `${typeClass} category-card`;
            card.dataset.catId   = cat.id;

            card.innerHTML = `
                <div class="${hdrClass}">
                    <h3>${escHtml(cat.nombre)}</h3>
                </div>
                <div class="${bodyClass}">
                    <p>${escHtml(cat.descripcion || 'Aprende los conceptos de esta categoría.')}</p>
                    ${badgeHtml}
                </div>
                <div class="levels-container hidden">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                </div>`;

            tarjetasContainer.appendChild(card);

            card.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') return;

                // Collapse other open cards
                document.querySelectorAll('.category-card').forEach(other => {
                    if (other !== card) {
                        other.querySelector('.levels-container')?.classList.add('hidden');
                    }
                });

                const levelsContainer = card.querySelector('.levels-container');
                const wasHidden       = levelsContainer.classList.contains('hidden');
                levelsContainer.classList.toggle('hidden');

                if (wasHidden) {
                    renderLevelsForCategory(card, catId);
                }
            });
        });

        // Global educational progress banner inserted before the cards grid
        const pctGlobal = totalCats > 0 ? Math.round((completedCats / totalCats) * 100) : 0;
        const remaining = totalCats - completedCats;
        const subMsg = remaining > 0
            ? `Te ${remaining === 1 ? 'falta' : 'faltan'} ${remaining} categoría${remaining === 1 ? '' : 's'} para completar tu nivel educativo`
            : '¡Felicidades! Has completado todas las categorías.';

        const banner = document.createElement('div');
        banner.className = 'edu-progress-banner';
        banner.innerHTML = `
            <div class="epb-left">
                <span class="epb-icon" aria-hidden="true"><i class="fas fa-graduation-cap"></i></span>
                <div class="epb-text">
                    <span class="epb-title">${completedCats} de ${totalCats} categor${totalCats === 1 ? 'ía' : 'ías'} completada${completedCats !== 1 ? 's' : ''}</span>
                    <span class="epb-sub">${subMsg}</span>
                </div>
            </div>
            <div class="epb-right">
                <progress class="epb-progress" max="${totalCats}" value="${completedCats}" title="${pctGlobal}% completado"></progress>
                <span class="epb-pct">${pctGlobal}%</span>
            </div>`;
        tarjetasContainer.parentNode.insertBefore(banner, tarjetasContainer);
    }

    // ── Render levels inside a category card ──────────────────────────────
    // STATE RULES (no hidden dependencies):
    //   completed  → level.id is in completedLevelIds
    //   available  → it is the first level in the category  OR
    //                the immediately preceding level (by orden) is completed
    //   locked     → everything else
    function renderLevelsForCategory(card, categoryId) {
        const levelsContainer = card.querySelector('.levels-container');
        const progressBarEl   = levelsContainer.querySelector('.progress-bar');

        // Remove old level rows and summary (keep the progress-bar element)
        Array.from(levelsContainer.children).forEach(child => {
            if (!child.classList.contains('progress-bar')) child.remove();
        });

        // Levels for this category, sorted by their position
        const categoryLevels = allLevelsDB
            .filter(l => Number(l.category_id) === categoryId)
            .sort((a, b) => a.orden - b.orden);

        if (categoryLevels.length === 0) {
            const msg = document.createElement('p');
            msg.textContent = 'Próximamente...';
            msg.className   = 'level-soon-msg';
            levelsContainer.insertBefore(msg, progressBarEl);
            return;
        }

        // All level IDs completed in this category (already normalised to Number)
        const completedLevelIds = progressMap[categoryId] || [];

        // Pre-compute totals for the summary block
        const completedCount = completedLevelIds.filter(
            id => categoryLevels.some(l => Number(l.id) === id)
        ).length;
        const allDone = completedCount === categoryLevels.length;
        const pct     = Math.round((completedCount / categoryLevels.length) * 100);

        // Progress summary + educational message at the top
        const summaryEl = document.createElement('div');
        summaryEl.className = 'levels-progress-summary';
        summaryEl.innerHTML = `
            <div class="lps-row">
                <span class="lps-count">${completedCount} de ${categoryLevels.length} niveles completados</span>
                <span class="lps-pct">${pct}%</span>
            </div>
            <div class="lps-edu-msg ${allDone ? 'lps-done' : 'lps-pending'}">
                ${allDone
                    ? 'Categoría completada. Esto contribuye a tu nivel educativo.'
                    : 'Al completar todos los niveles de esta categoría aumentarás tu nivel educativo.'}
            </div>`;
        levelsContainer.insertBefore(summaryEl, progressBarEl);

        categoryLevels.forEach((nivel, idx) => {
            const prevLevel = idx > 0 ? categoryLevels[idx - 1] : null;

            const isCompleted = completedLevelIds.includes(Number(nivel.id));

            // First level is always available; subsequent levels need previous done
            const isAvailable = idx === 0
                || completedLevelIds.includes(Number(prevLevel.id));

            const isLocked = !isCompleted && !isAvailable;

            const levelDiv = document.createElement('div');
            levelDiv.classList.add('level-item');

            if (isCompleted)       levelDiv.classList.add('completed');
            else if (!isLocked)    levelDiv.classList.add('active');
            else                   levelDiv.classList.add('locked');

            const btnLabel = isCompleted ? 'Repasar' : 'Jugar';

            levelDiv.innerHTML = `
                <div class="level-info">
                    <span class="level-num">Nivel ${nivel.orden}</span>
                    <span class="level-name">${escHtml(nivel.nombre)}</span>
                    ${nivel.descripcion ? `<span class="level-desc">${escHtml(nivel.descripcion)}</span>` : ''}
                </div>
                ${!isLocked
                    ? `<button class="btn-play">${btnLabel}</button>`
                    : `<i class="fa-solid fa-lock"></i>`}`;

            if (!isLocked) {
                levelDiv.querySelector('button').addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.location.href = `/nivel.html?level=${nivel.id}&levelNum=${nivel.orden}`;
                });
            }

            levelsContainer.insertBefore(levelDiv, progressBarEl);
        });

        // Update progress bar
        const fill = progressBarEl?.querySelector('.progress-fill');
        if (fill) {
            fill.style.setProperty('--fill-w', `${pct}%`);
        }
    }

    function escHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ── Boot ──────────────────────────────────────────────────────────────
    try {
        await fetchFreshData();
        if (loadingEl) loadingEl.remove();
        renderCategories();
    } catch (error) {
        console.error('Error cargando datos:', error);
        alertaError('Error de conexión al cargar lecciones');
        if (loadingEl) {
            loadingEl.innerHTML = '<p class="error-load-msg">Error al cargar. Recarga la página.</p>';
        }
    }

    // ── Onboarding ────────────────────────────────────────────────────────
    setTimeout(() => initOnboarding(userId, 'lecciones'), 800);

    document.getElementById('ob-restart-lecciones')?.addEventListener('click', e => {
        e.preventDefault();
        restartOnboarding(userId, 'lecciones');
    });
});