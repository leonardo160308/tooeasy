// frontend/public/js/pages/admin-new.js
import { protectRoute, getAuthData, logout, isAdmin, getSessionToken } from '../modules/auth.js';
import { alertaExito, alertaError, alertaAdvertencia, alertaConfirmacion } from '../modules/alerts.js';

function adminHeaders(json = false) {
    const token = getSessionToken();
    const h = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    if (json) h['Content-Type'] = 'application/json';
    return h;
}

const API_URL = '/api';

// ========================================
// IMÁGENES DISPONIBLES
// ========================================
const AVAILABLE_IMAGES = [
    'alcancia.jpg', 'compu.jpg', 'frascoDinero.jpg',
    'mapacheConAlcancia.jpg', 'mapacheConDinero.jpg', 'mapacheDandoBillete.jpg',
    'mapacheEntendiendo.jpg', 'mapacheLeyendo.jpg',
    'tarjetaDetras1.jpg', 'tarjetaDetras2.jpg', 'tarjetaDetras3.jpg',
    'tarjetaDetras4.jpg', 'tarjetaDetras5.jpg', 'tarjetaDetras6.jpg',
    'tarjetaDetras7.jpg', 'tarjetaFrente1.jpg', 'tarjetaFrente4.jpg',
    'tarjetaFrente5.jpg', 'tarjetaFrente6.jpg', 'tarjetaFrente7.jpg',
    'tarjetaFrente8.jpg', 'tarjetaFrente9.jpg', 'tarjetaFrente10.jpg',
    'tarjetaFrente11.jpg'
];

// ========================================
// RENDERIZAR SELECTOR DE IMÁGENES
// ========================================
function renderImageSelector(containerId, previewId, hiddenInputId, currentValue = '') {
    const container = document.getElementById(containerId);
    const preview   = document.getElementById(previewId);
    const hidden    = document.getElementById(hiddenInputId);
    if (!container || !preview || !hidden) return;

    container.innerHTML = AVAILABLE_IMAGES.map(imgName => {
        const path = `/public/img/fotos/${imgName}`;
        const sel  = currentValue === path ? 'selected' : '';
        return `<div class="image-option ${sel}" data-image="${path}">
                    <img src="${path}" alt="${imgName}">
                </div>`;
    }).join('');

    // Pre-seleccionar si ya había valor
    if (currentValue) {
        hidden.value = currentValue;
        const span = preview.querySelector('span');
        if (span) span.textContent = currentValue.split('/').pop();
        preview.classList.add('active');
    } else {
        hidden.value = '';
        preview.classList.remove('active');
    }

    container.querySelectorAll('.image-option').forEach(opt => {
        opt.addEventListener('click', () => {
            container.querySelectorAll('.image-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            const path = opt.dataset.image;
            hidden.value = path;
            const span = preview.querySelector('span');
            if (span) span.textContent = path.split('/').pop();
            preview.classList.add('active');
        });
    });
}

// ========================================
// MAIN
// ========================================
document.addEventListener('DOMContentLoaded', async () => {

    if (!protectRoute()) return;
    if (!isAdmin()) {
        alertaError('Acceso denegado. Solo administradores.', {
            duration: 3000,
            onClose: () => { window.location.href = '/dashboard.html'; }
        });
        return;
    }

    const sessionUser = getAuthData();
    const userId = sessionUser.id;

    let categories = [];
    let levels     = [];
    let flashcards = [];
    let questions  = [];

    // ========================================
    // TABS
    // ========================================
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        });
    });

    document.getElementById('logout-btn-admin')?.addEventListener('click', async e => {
        e.preventDefault();
        if (await alertaConfirmacion('¿Cerrar sesión?', 'Salir')) logout();
    });

    // ========================================
    // CARGAR DATOS
    // ========================================
    async function loadData() {
        try {
            const [resCat, resLev] = await Promise.all([
                fetch(`${API_URL}/admin/categories`),
                fetch(`${API_URL}/admin/levels`)
            ]);
            const dataCat = await resCat.json();
            const dataLev = await resLev.json();

            if (dataCat.success) categories = dataCat.data;
            if (dataLev.success) levels     = dataLev.data;

            renderCategoriesAndLevels();
            updateSelectFilters();
        } catch (err) {
            console.error('Error cargando datos:', err);
            alertaError('Error de conexión al cargar datos');
        }
    }

    // ========================================
    // RENDERIZAR CATEGORÍAS Y NIVELES
    // ========================================
    function renderCategoriesAndLevels() {
        const container = document.getElementById('categories-container');
        if (!container) return;

        if (categories.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay categorías disponibles.</p>';
            return;
        }

        container.innerHTML = categories.map(cat => {
            const catLevels   = levels.filter(l => Number(l.category_id) === Number(cat.id));
            const totalAllow  = cat.nivel_fin - cat.nivel_inicio + 1;
            const isFull      = catLevels.length >= totalAllow;

            return `
            <div class="category-card">

                <div class="cat-section-header">
                    <div>
                        <h3>${cat.nombre}</h3>
                        <small>Rango de niveles: ${cat.nivel_inicio} – ${cat.nivel_fin}</small>
                    </div>
                    <span class="${isFull ? 'badge-full' : 'badge-available'}">
                        ${catLevels.length} / ${totalAllow} Niveles
                    </span>
                </div>

                <p class="cat-section-desc">${cat.descripcion || 'Sin descripción'}</p>

                <div class="levels-list">
                    ${catLevels.length > 0 ? catLevels.map(lvl => `
                        <div class="level-list-item">
                            <div>
                                <strong>Nivel ${lvl.orden}: ${lvl.nombre}</strong>
                                <br><small>${lvl.descripcion || ''}</small>
                            </div>
                            <div class="level-list-btns">
                                <button class="btn-secondary btn-small btn-edit-level"
                                        data-id="${lvl.id}"
                                        title="Editar nivel">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn-danger btn-small btn-delete-level"
                                        data-id="${lvl.id}"
                                        title="Eliminar nivel">
                                    <i class="fas fa-trash"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    `).join('') : `
                        <p class="level-empty-msg">No hay niveles creados aún.</p>
                    `}
                </div>

                <div class="cat-section-footer">
                    ${!isFull
                        ? `<button class="btn-primary btn-new-level"
                                   data-cat-id="${cat.id}"
                                   data-cat-name="${cat.nombre}">
                               <i class="fas fa-plus"></i> Nuevo Nivel en ${cat.nombre}
                           </button>`
                        : `<span class="cat-section-full">
                               <i class="fas fa-lock"></i> Categoría completa
                           </span>`
                    }
                </div>
            </div>`;
        }).join('');

        attachCategoryEvents();
    }

    function attachCategoryEvents() {
        document.querySelectorAll('.btn-new-level').forEach(btn => {
            btn.addEventListener('click', () =>
                openLevelModal(null, btn.dataset.catId, btn.dataset.catName)
            );
        });
        document.querySelectorAll('.btn-edit-level').forEach(btn => {
            btn.addEventListener('click', () => openLevelModal(btn.dataset.id));
        });
        document.querySelectorAll('.btn-delete-level').forEach(btn => {
            btn.addEventListener('click', () => deleteLevel(btn.dataset.id));
        });
    }

    // ========================================
    // MODAL NIVELES
    // ========================================
    const modalLevel = document.getElementById('modal-level');
    const formLevel  = document.getElementById('form-level');

    function openLevelModal(levelId = null, catId = null, catName = null) {
        formLevel.reset();

        if (levelId) {
            const lvl = levels.find(l => String(l.id) === String(levelId));
            if (!lvl) { alertaError('Nivel no encontrado'); return; }
            const cat = categories.find(c => Number(c.id) === Number(lvl.category_id));

            document.getElementById('modal-level-title').textContent  = 'Editar Nivel';
            document.getElementById('level-id').value                 = lvl.id;
            document.getElementById('level-category-id').value        = lvl.category_id;
            document.getElementById('level-category-name').value      = cat ? cat.nombre : '—';
            document.getElementById('level-nombre').value             = lvl.nombre;
            document.getElementById('level-descripcion').value        = lvl.descripcion;
        } else {
            document.getElementById('modal-level-title').textContent  = 'Nuevo Nivel';
            document.getElementById('level-id').value                 = '';
            document.getElementById('level-category-id').value        = catId || '';
            document.getElementById('level-category-name').value      = catName || '';
        }

        modalLevel.classList.add('active');
    }

    formLevel.addEventListener('submit', async e => {
        e.preventDefault();
        const id          = document.getElementById('level-id').value;
        const categoryId  = document.getElementById('level-category-id').value;
        const nombre      = document.getElementById('level-nombre').value.trim();
        const descripcion = document.getElementById('level-descripcion').value.trim();

        if (!nombre || !descripcion) { alertaAdvertencia('Completa todos los campos'); return; }

        try {
            const url    = id ? `${API_URL}/admin/levels/${id}` : `${API_URL}/admin/levels`;
            const method = id ? 'PUT' : 'POST';
            const res    = await fetch(url, {
                method,
                headers: adminHeaders(true),
                body: JSON.stringify({ nombre, descripcion, categoryId })
            });
            const data = await res.json();

            if (data.success) {
                alertaExito(id ? 'Nivel actualizado correctamente' : 'Nivel creado correctamente');
                modalLevel.classList.remove('active');
                loadData();
            } else {
                alertaError(data.message || 'Error al guardar');
            }
        } catch (err) {
            console.error(err);
            alertaError('Error al guardar el nivel');
        }
    });

    async function deleteLevel(id) {
        if (!await alertaConfirmacion(
            '¿Eliminar este nivel? Si tiene flashcards o preguntas se te avisará.',
            '⚠️ Confirmar Eliminación'
        )) return;

        try {
            const res  = await fetch(`${API_URL}/admin/levels/${id}`, {
                method: 'DELETE',
                headers: adminHeaders(),
            });
            const data = await res.json();
            if (data.success) { alertaExito('Nivel eliminado'); loadData(); }
            else alertaAdvertencia(data.message);
        } catch (err) { alertaError('Error al eliminar'); }
    }

    // ========================================
    // SELECTS DE FILTRO
    // ========================================
    function updateSelectFilters() {
        const selects = [
            document.getElementById('flashcard-level-filter'),
            document.getElementById('question-level-filter'),
            document.getElementById('flashcard-level'),
            document.getElementById('question-level')
        ];

        let html = '<option value="">-- Selecciona un Nivel --</option>';
        categories.forEach(cat => {
            const catLevels = levels.filter(l => Number(l.category_id) === Number(cat.id));
            if (catLevels.length > 0) {
                html += `<optgroup label="${cat.nombre}">`;
                catLevels.forEach(lvl => {
                    html += `<option value="${lvl.id}">Nivel ${lvl.orden}: ${lvl.nombre}</option>`;
                });
                html += `</optgroup>`;
            }
        });

        selects.forEach(s => { if (s) s.innerHTML = html; });
    }

    // ========================================
    // FLASHCARDS — CARGAR Y RENDERIZAR
    // ========================================
    document.getElementById('flashcard-level-filter')?.addEventListener('change', e => {
        const id = e.target.value;
        if (id) loadFlashcards(id);
        else document.getElementById('flashcards-container').innerHTML =
            '<p class="empty-state">Selecciona un nivel para ver las flashcards.</p>';
    });

    async function loadFlashcards(levelId) {
        try {
            const res  = await fetch(`${API_URL}/admin/flashcards/level/${levelId}`, { headers: adminHeaders() });
            const data = await res.json();
            if (data.success) { flashcards = data.data; renderFlashcards(levelId); }
        } catch (err) { alertaError('Error al cargar flashcards'); }
    }

    function renderFlashcards(levelId) {
        const container = document.getElementById('flashcards-container');
        if (!container) return;

        if (flashcards.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay flashcards en este nivel.</p>';
            return;
        }

        container.innerHTML = flashcards.map(f => `
            <div class="item-card">
                <h3>${f.titulo}</h3>
                <p>${f.contenido.length > 100 ? f.contenido.substring(0, 100) + '...' : f.contenido}</p>
                ${f.imagen ? `<img src="${f.imagen}" class="admin-thumb">` : ''}
                <div class="item-actions">
                    <button class="btn-secondary btn-small btn-edit-fc" data-id="${f.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-danger btn-small btn-delete-fc" data-id="${f.id}" data-level="${f.level_id}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.btn-edit-fc').forEach(btn => {
            btn.addEventListener('click', () => openFlashcardModal(btn.dataset.id));
        });
        container.querySelectorAll('.btn-delete-fc').forEach(btn => {
            btn.addEventListener('click', () => deleteFlashcard(btn.dataset.id, btn.dataset.level));
        });
    }

    // ========================================
    // MODAL FLASHCARDS (CREAR / EDITAR)
    // ========================================
    const modalFlashcard = document.getElementById('modal-flashcard');
    const formFlashcard  = document.getElementById('form-flashcard');

    document.getElementById('btn-new-flashcard')?.addEventListener('click', () => {
        const levelId = document.getElementById('flashcard-level-filter').value;
        if (!levelId) { alertaAdvertencia('Selecciona un nivel primero'); return; }
        openFlashcardModal(null, levelId);
    });

    function openFlashcardModal(fcId = null, preLevel = null) {
        formFlashcard.reset();
        document.getElementById('flashcard-id').value = '';

        if (fcId) {
            // MODO EDITAR
            const fc = flashcards.find(f => String(f.id) === String(fcId));
            if (!fc) { alertaError('Flashcard no encontrada'); return; }

            document.getElementById('modal-flashcard-title').textContent = 'Editar Flashcard';
            document.getElementById('flashcard-id').value      = fc.id;
            document.getElementById('flashcard-level').value   = fc.level_id;
            document.getElementById('flashcard-titulo').value  = fc.titulo;
            document.getElementById('flashcard-contenido').value = fc.contenido;

            // Selector de imagen con valor actual
            renderImageSelector(
                'flashcard-image-grid',
                'flashcard-image-preview',
                'flashcard-imagen',
                fc.imagen || ''
            );
        } else {
            // MODO CREAR
            document.getElementById('modal-flashcard-title').textContent = 'Nueva Flashcard';
            if (preLevel) document.getElementById('flashcard-level').value = preLevel;
            renderImageSelector('flashcard-image-grid', 'flashcard-image-preview', 'flashcard-imagen', '');
        }

        modalFlashcard.classList.add('active');
    }

    formFlashcard.addEventListener('submit', async e => {
        e.preventDefault();

        const id        = document.getElementById('flashcard-id').value;
        const levelId   = document.getElementById('flashcard-level').value;
        const titulo    = document.getElementById('flashcard-titulo').value.trim();
        const contenido = document.getElementById('flashcard-contenido').value.trim();
        const imagen    = document.getElementById('flashcard-imagen').value.trim() || null;

        if (!levelId || !titulo || !contenido) {
            alertaAdvertencia('Completa todos los campos obligatorios');
            return;
        }

        try {
            const url    = id ? `${API_URL}/admin/flashcards/${id}` : `${API_URL}/admin/flashcards`;
            const method = id ? 'PUT' : 'POST';
            const res    = await fetch(url, {
                method,
                headers: adminHeaders(true),
                body: JSON.stringify({ levelId, titulo, contenido, imagen })
            });
            const data = await res.json();

            if (data.success) {
                alertaExito(id ? 'Flashcard actualizada correctamente' : 'Flashcard creada correctamente');
                modalFlashcard.classList.remove('active');
                loadFlashcards(levelId);
                // Sync select
                document.getElementById('flashcard-level-filter').value = levelId;
            } else {
                alertaError(data.message || 'Error al guardar');
            }
        } catch (err) {
            console.error(err);
            alertaError('Error al guardar la flashcard');
        }
    });

    async function deleteFlashcard(id, levelId) {
        if (!await alertaConfirmacion('¿Eliminar esta flashcard?', '⚠️ Confirmar')) return;
        try {
            const res  = await fetch(`${API_URL}/admin/flashcards/${id}`, {
                method: 'DELETE',
                headers: adminHeaders(),
            });
            const data = await res.json();
            if (data.success) { alertaExito('Flashcard eliminada'); loadFlashcards(levelId); }
            else alertaError(data.message);
        } catch (err) { alertaError('Error al eliminar'); }
    }

    // Exponer para onclick en template strings (fallback)
    window.deleteFlashcard = deleteFlashcard;

    // ========================================
    // PREGUNTAS — CARGAR Y RENDERIZAR
    // ========================================
    document.getElementById('question-level-filter')?.addEventListener('change', e => {
        const id = e.target.value;
        if (id) loadQuestions(id);
        else document.getElementById('questions-container').innerHTML =
            '<p class="empty-state">Selecciona un nivel para ver las preguntas.</p>';
    });

    async function loadQuestions(levelId) {
        try {
            const res  = await fetch(`${API_URL}/admin/questions/${levelId}`, { headers: adminHeaders() });
            const data = await res.json();
            if (data.success) { questions = data.data; renderQuestions(levelId); }
        } catch (err) { alertaError('Error al cargar preguntas'); }
    }

    function renderQuestions(levelId) {
        const container = document.getElementById('questions-container');
        if (!container) return;

        if (questions.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay preguntas en este nivel.</p>';
            return;
        }

        container.innerHTML = questions.map(q => `
            <div class="item-card">
                <h3>${q.pregunta.length > 80 ? q.pregunta.substring(0, 80) + '...' : q.pregunta}</h3>
                <div class="meta">
                    <span><i class="fas fa-list"></i> ${Object.keys(q.opciones).length} opciones</span>
                    <span><i class="fas fa-check-circle icon-correct"></i> Correcta: <strong>${q.correcta}</strong></span>
                    <span><i class="fas fa-signal"></i> ${q.dificultad || 'media'}</span>
                </div>
                <div class="item-actions">
                    <button class="btn-secondary btn-small btn-edit-q" data-id="${q.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-danger btn-small btn-delete-q" data-id="${q.id}" data-level="${q.level_id}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.btn-edit-q').forEach(btn => {
            btn.addEventListener('click', () => openQuestionModal(btn.dataset.id));
        });
        container.querySelectorAll('.btn-delete-q').forEach(btn => {
            btn.addEventListener('click', () => deleteQuestion(btn.dataset.id, btn.dataset.level));
        });
    }

    // ========================================
    // MODAL PREGUNTAS (CREAR / EDITAR)
    // ========================================
    const modalQuestion = document.getElementById('modal-question');
    const formQuestion  = document.getElementById('form-question');

    document.getElementById('btn-new-question')?.addEventListener('click', () => {
        const levelId = document.getElementById('question-level-filter').value;
        if (!levelId) { alertaAdvertencia('Selecciona un nivel primero'); return; }
        openQuestionModal(null, levelId);
    });

    function openQuestionModal(qId = null, preLevel = null) {
        formQuestion.reset();
        document.getElementById('question-id').value = '';

        // Siempre resetear opciones base
        const optContainer = document.getElementById('options-container');
        optContainer.innerHTML = `
            <div class="option-row">
                <input type="text" class="option-input" data-key="A" placeholder="Opción A" required>
            </div>
            <div class="option-row">
                <input type="text" class="option-input" data-key="B" placeholder="Opción B" required>
            </div>
            <div class="option-row">
                <input type="text" class="option-input" data-key="C" placeholder="Opción C" required>
            </div>
        `;

        if (qId) {
            // MODO EDITAR
            const q = questions.find(x => String(x.id) === String(qId));
            if (!q) { alertaError('Pregunta no encontrada'); return; }

            document.getElementById('modal-question-title').textContent = 'Editar Pregunta';
            document.getElementById('question-id').value        = q.id;
            document.getElementById('question-level').value     = q.level_id;
            document.getElementById('question-pregunta').value  = q.pregunta;
            document.getElementById('question-dificultad').value = q.dificultad || 'media';

            // Cargar opciones dinámicamente
            optContainer.innerHTML = '';
            const keys = Object.keys(q.opciones);
            keys.forEach((key, idx) => {
                const row = document.createElement('div');
                row.className = 'option-row';
                const canRemove = idx >= 3;
                row.innerHTML = `
                    <input type="text" class="option-input" data-key="${key}"
                           placeholder="Opción ${key}" value="${q.opciones[key]}" required>
                    ${canRemove
                        ? `<button type="button" class="btn-remove-option">&times;</button>`
                        : ''}
                `;
                optContainer.appendChild(row);
            });

            // Imagen con valor actual
            renderImageSelector(
                'question-image-grid',
                'question-image-preview',
                'question-imagen',
                q.imagen || ''
            );

            updateCorrectaOptions(q.correcta);
        } else {
            // MODO CREAR
            document.getElementById('modal-question-title').textContent = 'Nueva Pregunta';
            if (preLevel) document.getElementById('question-level').value = preLevel;
            renderImageSelector('question-image-grid', 'question-image-preview', 'question-imagen', '');
            updateCorrectaOptions('');
        }

        attachRemoveOptionEvents();
        modalQuestion.classList.add('active');
    }

    // Actualizar select de respuesta correcta
    function updateCorrectaOptions(selectedKey = '') {
        const select = document.getElementById('question-correcta');
        const inputs = document.querySelectorAll('.option-input');
        const keys   = Array.from(inputs).map(i => i.dataset.key);

        select.innerHTML = '<option value="">Selecciona la correcta</option>' +
            keys.map(k => `<option value="${k}" ${k === selectedKey ? 'selected' : ''}>${k}</option>`).join('');
    }

    // Botón añadir opción
    document.getElementById('btn-add-option')?.addEventListener('click', () => {
        const cnt = document.getElementById('options-container');
        if (cnt.children.length >= 5) { alertaAdvertencia('Máximo 5 opciones'); return; }

        const keys    = ['A', 'B', 'C', 'D', 'E'];
        const nextKey = keys[cnt.children.length];
        const row     = document.createElement('div');
        row.className = 'option-row';
        row.innerHTML = `
            <input type="text" class="option-input" data-key="${nextKey}"
                   placeholder="Opción ${nextKey}" required>
            <button type="button" class="btn-remove-option">&times;</button>
        `;
        cnt.appendChild(row);
        attachRemoveOptionEvents();
        updateCorrectaOptions('');
    });

    function attachRemoveOptionEvents() {
        document.querySelectorAll('.btn-remove-option').forEach(btn => {
            btn.onclick = () => {
                const cnt = document.getElementById('options-container');
                if (cnt.children.length <= 3) { alertaAdvertencia('Mínimo 3 opciones'); return; }
                btn.closest('.option-row').remove();
                updateCorrectaOptions('');
            };
        });
    }

    formQuestion.addEventListener('submit', async e => {
        e.preventDefault();

        const id        = document.getElementById('question-id').value;
        const levelId   = document.getElementById('question-level').value;
        const pregunta  = document.getElementById('question-pregunta').value.trim();
        const correcta  = document.getElementById('question-correcta').value;
        const dificultad = document.getElementById('question-dificultad').value;
        const imagen    = document.getElementById('question-imagen').value.trim() || null;

        const opciones = {};
        document.querySelectorAll('.option-input').forEach(inp => {
            const val = inp.value.trim();
            if (val) opciones[inp.dataset.key] = val;
        });

        if (!levelId || !pregunta || !correcta) {
            alertaAdvertencia('Completa todos los campos obligatorios');
            return;
        }
        if (Object.keys(opciones).length < 3) {
            alertaAdvertencia('Necesitas al menos 3 opciones');
            return;
        }
        if (!opciones[correcta]) {
            alertaAdvertencia('La respuesta correcta no coincide con ninguna opción');
            return;
        }

        try {
            const url    = id ? `${API_URL}/admin/questions/${id}` : `${API_URL}/admin/questions`;
            const method = id ? 'PUT' : 'POST';
            const res    = await fetch(url, {
                method,
                headers: adminHeaders(true),
                body: JSON.stringify({ levelId, pregunta, opciones, correcta, dificultad, imagen })
            });
            const data = await res.json();

            if (data.success) {
                alertaExito(id ? 'Pregunta actualizada correctamente' : 'Pregunta creada correctamente');
                modalQuestion.classList.remove('active');
                loadQuestions(levelId);
                document.getElementById('question-level-filter').value = levelId;
            } else {
                alertaError(data.message || 'Error al guardar');
            }
        } catch (err) {
            console.error(err);
            alertaError('Error al guardar la pregunta');
        }
    });

    async function deleteQuestion(id, levelId) {
        if (!await alertaConfirmacion('¿Eliminar esta pregunta?', '⚠️ Confirmar')) return;
        try {
            const res  = await fetch(`${API_URL}/admin/questions/${id}`, {
                method: 'DELETE',
                headers: adminHeaders(),
            });
            const data = await res.json();
            if (data.success) { alertaExito('Pregunta eliminada'); loadQuestions(levelId); }
            else alertaError(data.message);
        } catch (err) { alertaError('Error al eliminar'); }
    }

    window.deleteQuestion = deleteQuestion;

    // ========================================
    // CERRAR MODALES
    // ========================================
    document.querySelectorAll('.modal-close, [data-modal]').forEach(el => {
        el.addEventListener('click', () => {
            const modalId = el.dataset.modal || el.closest('.modal')?.id;
            if (modalId) document.getElementById(modalId)?.classList.remove('active');
        });
    });

    // Cerrar al click fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });

    // ========================================
    // INICIAR
    // ========================================
    loadData();
});