import { protectRoute, getAuthData, logout, isAdmin } from '../modules/auth.js';
import { alertaExito, alertaError, alertaAdvertencia, alertaConfirmacion } from '../modules/alerts.js';

const API = '/api';
const MAX_CATS = 10;

const AVAILABLE_IMAGES = [
    'alcancia.jpg','compu.jpg','frascoDinero.jpg',
    'mapacheConAlcancia.jpg','mapacheConDinero.jpg','mapacheDandoBillete.jpg',
    'mapacheEntendiendo.jpg','mapacheLeyendo.jpg',
    'tarjetaDetras1.jpg','tarjetaDetras2.jpg','tarjetaDetras3.jpg',
    'tarjetaDetras4.jpg','tarjetaDetras5.jpg','tarjetaDetras6.jpg',
    'tarjetaDetras7.jpg','tarjetaFrente1.jpg','tarjetaFrente4.jpg',
    'tarjetaFrente5.jpg','tarjetaFrente6.jpg','tarjetaFrente7.jpg',
    'tarjetaFrente8.jpg','tarjetaFrente9.jpg','tarjetaFrente10.jpg','tarjetaFrente11.jpg'
];

// ── Guards ──────────────────────────────────────────────────────────────
if (!protectRoute()) throw new Error('no auth');
if (!isAdmin()) {
    alertaError('Acceso denegado.', { duration: 3000, onClose: () => window.location.href = '/dashboard.html' });
    throw new Error('not admin');
}
const session = getAuthData();
const userId  = session.id;

// ── State ──────────────────────────────────────────────────────────────
let categories  = [];
let levels      = [];
let flashcards  = [];
let questions   = [];
let pendingDeleteId = null;

// ── Cache-busting fetch helper ─────────────────────────────────────────
async function fetchFresh(url, options = {}) {
    const ts = Date.now();
    const sep = url.includes('?') ? '&' : '?';
    return fetch(`${url}${sep}_=${ts}`, {
        ...options,
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            ...(options.headers || {})
        }
    });
}

// ── Sidebar navigation ─────────────────────────────────────────────────
document.querySelectorAll('.nav-btn[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.section-view').forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`section-${btn.dataset.section}`).classList.add('active');
        if (btn.dataset.section === 'levels') {
            // Reload fresh data when switching to levels tab
            loadAll().then(() => renderCategoryLevelsPage());
        }
    });
});

// ── Logout ─────────────────────────────────────────────────────────────
document.getElementById('logout-btn-admin').addEventListener('click', async e => {
    e.preventDefault();
    if (await alertaConfirmacion('¿Cerrar sesión?', 'Salir')) logout();
});

// ── Validation helpers ─────────────────────────────────────────────────
function showErr(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('visible', !!msg);
}
function clearErrors(...ids) {
    ids.forEach(id => showErr(id, ''));
}
function markInvalid(inputId, errId, msg) {
    const inp = document.getElementById(inputId);
    if (inp) inp.classList.toggle('invalid', !!msg);
    showErr(errId, msg);
}

// ══════════════════════════════════════════════════════════════════════
//  LOAD ALL DATA (fresh, no cache)
// ══════════════════════════════════════════════════════════════════════
async function loadAll() {
    try {
        const [resCat, resLev] = await Promise.all([
            fetchFresh(`${API}/admin/categories`),
            fetchFresh(`${API}/admin/levels`)
        ]);
        const dataCat = await resCat.json();
        const dataLev = await resLev.json();

        if (dataCat.success) categories = dataCat.data || [];
        if (dataLev.success) levels     = dataLev.data || [];

        updateSelectFilters();
        return { categories, levels };
    } catch (e) {
        console.error('Error loading data:', e);
        alertaError('Error al cargar datos');
    }
}

async function loadCategories() {
    await loadAll();
    renderCategories();
}

// ══════════════════════════════════════════════════════════════════════
//  CATEGORÍAS
// ══════════════════════════════════════════════════════════════════════
function renderCategories() {
    const container = document.getElementById('categories-container');
    const banner    = document.getElementById('limit-banner');
    const total     = categories.length;
    const available = Math.max(0, MAX_CATS - total);

    document.getElementById('stat-cat-total').textContent     = total;
    document.getElementById('stat-cat-available').textContent = available;
    banner.classList.toggle('visible', total >= MAX_CATS);

    container.innerHTML = '';

    categories.forEach((cat, idx) => {
        const levCount = levels.filter(l => Number(l.category_id) === Number(cat.id)).length;
        const card = document.createElement('div');
        card.className = 'cat-card';
        card.dataset.id = cat.id;
        card.innerHTML = `
            <div class="cat-card-stripe stripe-${idx % 10}"></div>
            <div class="cat-card-body">
                <div class="cat-view-mode">
                    <div class="cat-card-header">
                        <div class="cat-name">${escHtml(cat.nombre)}</div>
                        <div class="cat-actions">
                            <button class="btn-icon edit" title="Editar" data-id="${cat.id}"><i class="fas fa-pen"></i></button>
                            <button class="btn-icon del" title="Eliminar" data-id="${cat.id}"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="cat-desc">${escHtml(cat.descripcion || 'Sin descripción')}</div>
                    <div class="cat-meta">
                        <span class="meta-tag levels"><i class="fas fa-graduation-cap"></i> ${levCount} nivel(es)</span>
                        <span class="meta-tag"><i class="fas fa-sort-numeric-up"></i> N${cat.nivel_inicio}–N${cat.nivel_fin}</span>
                    </div>
                </div>
                <div class="cat-edit-view" data-id="${cat.id}">
                    <input class="inline-input" type="text" placeholder="Nombre" value="${escHtml(cat.nombre)}" data-field="nombre">
                    <input class="inline-input" type="text" placeholder="Descripción" value="${escHtml(cat.descripcion || '')}" data-field="descripcion">
                    <div class="edit-footer">
                        <button class="btn btn-sm btn-ghost btn-cancel-edit">Cancelar</button>
                        <button class="btn btn-sm btn-primary btn-save-edit" data-id="${cat.id}"><i class="fas fa-check"></i> Guardar</button>
                    </div>
                </div>
            </div>`;
        container.appendChild(card);

        card.querySelector('.btn-icon.edit').addEventListener('click', () => {
            card.classList.add('editing');
            card.querySelector('.inline-input[data-field="nombre"]').focus();
        });
        card.querySelector('.btn-cancel-edit').addEventListener('click', () => card.classList.remove('editing'));
        card.querySelector('.btn-save-edit').addEventListener('click', () => saveInlineEdit(card, cat));
        card.querySelector('.btn-icon.del').addEventListener('click', () => openDeleteConfirm(cat));
    });

    // Add card
    const addCard = document.createElement('div');
    addCard.className = `cat-add-card${total >= MAX_CATS ? ' disabled' : ''}`;
    addCard.innerHTML = `<div class="add-icon"><i class="fas fa-plus"></i></div><div class="add-label">${total >= MAX_CATS ? 'Límite alcanzado' : 'Nueva categoría'}</div>`;
    if (total < MAX_CATS) addCard.addEventListener('click', openNewCategoryModal);
    container.appendChild(addCard);
}

async function saveInlineEdit(card, cat) {
    const nombre      = card.querySelector('.inline-input[data-field="nombre"]').value.trim();
    const descripcion = card.querySelector('.inline-input[data-field="descripcion"]').value.trim();
    if (!nombre || nombre.length < 2) { alertaAdvertencia('El nombre debe tener al menos 2 caracteres'); return; }
    try {
        const res  = await fetchFresh(`${API}/admin/categories/${cat.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, nombre, descripcion })
        });
        const data = await res.json();
        if (data.success) {
            alertaExito('Categoría actualizada');
            card.classList.remove('editing');
            await loadCategories();
        } else { alertaError(data.message); }
    } catch (e) { alertaError('Error al guardar'); }
}

// Category modal
function openNewCategoryModal() {
    clearErrors('err-cat-nombre', 'err-cat-nivel');
    document.getElementById('cat-id').value           = '';
    document.getElementById('cat-nombre').value       = '';
    document.getElementById('cat-descripcion').value  = '';
    document.getElementById('cat-nivel-inicio').value = '';
    document.getElementById('cat-nivel-fin').value    = '';
    document.getElementById('cat-modal-title').textContent = 'Nueva Categoría';
    document.getElementById('modal-category').classList.add('open');
    setTimeout(() => document.getElementById('cat-nombre').focus(), 150);
}

['close-cat-modal','cancel-cat-modal'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () =>
        document.getElementById('modal-category').classList.remove('open'));
});
document.getElementById('modal-category').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-category'))
        document.getElementById('modal-category').classList.remove('open');
});

document.getElementById('save-cat-btn').addEventListener('click', async () => {
    clearErrors('err-cat-nombre', 'err-cat-nivel');
    const id           = document.getElementById('cat-id').value;
    const nombre       = document.getElementById('cat-nombre').value.trim();
    const descripcion  = document.getElementById('cat-descripcion').value.trim();
    const nivel_inicio = parseInt(document.getElementById('cat-nivel-inicio').value) || null;
    const nivel_fin    = parseInt(document.getElementById('cat-nivel-fin').value)    || null;

    let valid = true;
    if (!nombre || nombre.length < 2) { markInvalid('cat-nombre','err-cat-nombre','El nombre debe tener al menos 2 caracteres'); valid = false; }
    if (nivel_inicio && nivel_fin && nivel_inicio > nivel_fin) { markInvalid('cat-nivel-inicio','err-cat-nivel','Nivel inicio no puede ser mayor que nivel fin'); valid = false; }

    // ── VALIDACIÓN DE SOLAPAMIENTO ──────────────────────────────────────
    if (nivel_inicio && nivel_fin) {
        const overlap = categories.find(cat =>
            String(cat.id) !== String(id) &&
            nivel_inicio <= cat.nivel_fin &&
            nivel_fin    >= cat.nivel_inicio
        );
        if (overlap) {
            markInvalid('cat-nivel-inicio', 'err-cat-nivel',
                `Rango solapado con "${overlap.nombre}" (N${overlap.nivel_inicio}–N${overlap.nivel_fin})`
            );
            valid = false;
        }
    }
    // ───────────────────────────────────────────────────────────────────

    if (!valid) return;

    try {
        const url    = id ? `${API}/admin/categories/${id}` : `${API}/admin/categories`;
        const method = id ? 'PUT' : 'POST';
        const res = await fetchFresh(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, nombre, descripcion, nivel_inicio, nivel_fin })
        });
        const data = await res.json();
        if (data.success) {
            alertaExito(id ? 'Categoría actualizada' : 'Categoría creada');
            document.getElementById('modal-category').classList.remove('open');
            await loadCategories();
        } else { alertaError(data.message); }
    } catch (e) { alertaError('Error al guardar categoría'); }
});

// Delete confirm
function openDeleteConfirm(cat) {
    pendingDeleteId = cat.id;
    document.getElementById('confirm-del-text').textContent =
        `¿Eliminar la categoría "${cat.nombre}"? Se eliminarán también todos sus niveles, flashcards y preguntas.`;
    document.getElementById('modal-confirm-del').classList.add('open');
}

['close-confirm-del','cancel-del-btn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () =>
        document.getElementById('modal-confirm-del').classList.remove('open'));
});
document.getElementById('modal-confirm-del').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-confirm-del'))
        document.getElementById('modal-confirm-del').classList.remove('open');
});
document.getElementById('confirm-del-btn').addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    try {
        const res  = await fetchFresh(`${API}/admin/categories/${pendingDeleteId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        const data = await res.json();
        if (data.success) {
            alertaExito('Categoría eliminada');
            document.getElementById('modal-confirm-del').classList.remove('open');
            pendingDeleteId = null;
            await loadCategories();
        } else {
            alertaAdvertencia(data.message);
            document.getElementById('modal-confirm-del').classList.remove('open');
        }
    } catch (e) { alertaError('Error al eliminar'); }
});

// ══════════════════════════════════════════════════════════════════════
//  LEVELS
// ══════════════════════════════════════════════════════════════════════
function renderCategoryLevelsPage() {
    const container = document.getElementById('categories-levels-container');
    if (!container) return;
    container.innerHTML = '';

    if (!categories.length) {
        container.innerHTML = '<p style="color:var(--ink-muted);padding:40px;text-align:center">No hay categorías. Créalas primero.</p>';
        return;
    }

    categories.forEach(cat => {
        const catLevels  = levels.filter(l => Number(l.category_id) === Number(cat.id));
        const totalAllow = cat.nivel_fin - cat.nivel_inicio + 1;
        const isFull     = catLevels.length >= totalAllow;

        const section = document.createElement('div');
        section.style.cssText = 'background:var(--card);border:1.5px solid var(--border);border-radius:var(--r-lg);padding:22px;margin-bottom:18px;box-shadow:var(--sh-xs)';
        section.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1.5px solid var(--border)">
                <div>
                    <div style="font-size:15px;font-weight:700;color:var(--ink)">${escHtml(cat.nombre)}</div>
                    <div style="font-size:12px;color:var(--ink-muted);margin-top:2px">
                        Rango N${cat.nivel_inicio}–N${cat.nivel_fin} &middot; ${catLevels.length}/${totalAllow} niveles
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:10px">
                    <span style="background:${isFull ? 'var(--red-bg)' : 'var(--green-bg)'};color:${isFull ? 'var(--red)' : 'var(--green)'};padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700">
                        ${isFull ? '🔒 Completa' : '✓ Disponible'}
                    </span>
                    ${!isFull ? `<button class="btn btn-sm btn-primary btn-new-lvl" data-cat="${cat.id}" data-catname="${escHtml(cat.nombre)}">
                        <i class="fas fa-plus"></i> Nivel
                    </button>` : ''}
                </div>
            </div>
            <div class="levels-list">
                ${catLevels.length ? catLevels.map(lvl => `
                    <div style="background:var(--paper);padding:11px 16px;border-radius:var(--r-sm);display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border:1px solid var(--border)">
                        <div>
                            <div style="font-size:13.5px;font-weight:700;color:var(--ink)">N${lvl.orden}: ${escHtml(lvl.nombre)}</div>
                            <div style="font-size:12px;color:var(--ink-muted)">${escHtml(lvl.descripcion || '')}</div>
                        </div>
                        <div style="display:flex;gap:6px">
                            <button class="btn-icon edit btn-edit-lvl" data-id="${lvl.id}"><i class="fas fa-pen"></i></button>
                            <button class="btn-icon del btn-del-lvl" data-id="${lvl.id}"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`).join('')
                : `<p style="color:var(--ink-muted);font-style:italic;text-align:center;padding:16px;font-size:13px">No hay niveles en esta categoría.</p>`}
            </div>`;
        container.appendChild(section);

        section.querySelectorAll('.btn-new-lvl').forEach(b =>
            b.addEventListener('click', () => openLevelModal(null, b.dataset.cat, b.dataset.catname)));
        section.querySelectorAll('.btn-edit-lvl').forEach(b =>
            b.addEventListener('click', () => openLevelModal(b.dataset.id)));
        section.querySelectorAll('.btn-del-lvl').forEach(b =>
            b.addEventListener('click', () => deleteLevel(b.dataset.id)));
    });
}

const modalLevel = document.getElementById('modal-level');
const formLevel  = document.getElementById('form-level');

function openLevelModal(levelId = null, catId = null, catName = null) {
    formLevel.reset();
    clearErrors('err-level-nombre','err-level-desc');
    document.querySelectorAll('#form-level .invalid').forEach(el => el.classList.remove('invalid'));

    if (levelId) {
        const lvl = levels.find(l => String(l.id) === String(levelId));
        if (!lvl) { alertaError('Nivel no encontrado'); return; }

        // Validate that associated category still exists
        const cat = categories.find(c => Number(c.id) === Number(lvl.category_id));
        if (!cat) {
            alertaError('La categoría de este nivel ya no existe. Por favor, elimina o reasigna el nivel.');
            return;
        }

        document.getElementById('modal-level-title').textContent = 'Editar Nivel';
        document.getElementById('level-id').value            = lvl.id;
        document.getElementById('level-category-id').value   = lvl.category_id;
        document.getElementById('level-category-name').value = cat.nombre;
        document.getElementById('level-nombre').value         = lvl.nombre;
        document.getElementById('level-descripcion').value    = lvl.descripcion;
    } else {
        document.getElementById('modal-level-title').textContent = 'Nuevo Nivel';
        document.getElementById('level-id').value            = '';
        document.getElementById('level-category-id').value   = catId || '';
        document.getElementById('level-category-name').value = catName || '';
    }
    modalLevel.classList.add('active');
}

formLevel.addEventListener('submit', async e => {
    e.preventDefault();
    clearErrors('err-level-nombre','err-level-desc');

    const id          = document.getElementById('level-id').value;
    const categoryId  = document.getElementById('level-category-id').value;
    const nombre      = document.getElementById('level-nombre').value.trim();
    const descripcion = document.getElementById('level-descripcion').value.trim();

    let valid = true;
    if (!nombre || nombre.length < 2) { markInvalid('level-nombre','err-level-nombre','El nombre debe tener al menos 2 caracteres'); valid = false; }
    if (!descripcion) { markInvalid('level-descripcion','err-level-desc','La descripción es obligatoria'); valid = false; }
    if (!valid) return;

    // Validate category still exists (frontend check before API call)
    if (categoryId && !categories.find(c => String(c.id) === String(categoryId))) {
        alertaError('La categoría seleccionada ya no existe. Recarga la página.');
        return;
    }

    try {
        const url    = id ? `${API}/admin/levels/${id}` : `${API}/admin/levels`;
        const method = id ? 'PUT' : 'POST';
        const res    = await fetchFresh(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, nombre, descripcion, categoryId }) });
        const data   = await res.json();
        if (data.success) {
            alertaExito(id ? 'Nivel actualizado' : 'Nivel creado');
            modalLevel.classList.remove('active');
            await loadAll();
            renderCategoryLevelsPage();
        } else { alertaError(data.message); }
    } catch (e) { alertaError('Error al guardar nivel'); }
});

async function deleteLevel(id) {
    // Check if level has flashcards or questions before deleting
    const res = await fetchFresh(`${API}/admin/levels/${id}/delete-stats`);
    const stats = await res.json();

    let confirmMsg = '¿Eliminar este nivel?';
    if (stats.success && (stats.data.flashcards > 0 || stats.data.questions > 0)) {
        confirmMsg = `¿Eliminar este nivel? Se eliminarán también ${stats.data.flashcards} flashcard(s) y ${stats.data.questions} pregunta(s) asociadas.`;
    }

    if (!await alertaConfirmacion(confirmMsg, '⚠️ Confirmar')) return;
    try {
        const res  = await fetchFresh(`${API}/admin/levels/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
        const data = await res.json();
        if (data.success) {
            alertaExito('Nivel eliminado');
            await loadAll();
            renderCategoryLevelsPage();
            updateSelectFilters();
        } else alertaAdvertencia(data.message);
    } catch (e) { alertaError('Error al eliminar'); }
}

// ══════════════════════════════════════════════════════════════════════
//  SELECT FILTERS
// ══════════════════════════════════════════════════════════════════════
function updateSelectFilters() {
    const selects = ['flashcard-level-filter','question-level-filter','flashcard-level','question-level']
        .map(id => document.getElementById(id));

    let html = '<option value="">— Selecciona un Nivel —</option>';
    categories.forEach(cat => {
        const catLevels = levels.filter(l => Number(l.category_id) === Number(cat.id));
        if (catLevels.length > 0) {
            html += `<optgroup label="${escHtml(cat.nombre)}">`;
            catLevels.forEach(lvl => { html += `<option value="${lvl.id}">N${lvl.orden}: ${escHtml(lvl.nombre)}</option>`; });
            html += `</optgroup>`;
        }
    });
    selects.forEach(s => { if (s) s.innerHTML = html; });
}

// ══════════════════════════════════════════════════════════════════════
//  FLASHCARDS
// ══════════════════════════════════════════════════════════════════════
document.getElementById('flashcard-level-filter').addEventListener('change', async e => {
    const levelId = e.target.value;
    if (levelId) {
        // Validate that the selected level still exists
        if (!levels.find(l => String(l.id) === String(levelId))) {
            alertaError('El nivel seleccionado ya no existe. Recarga la página.');
            await loadAll();
            return;
        }
        loadFlashcards(levelId);
    } else {
        document.getElementById('flashcards-container').innerHTML = '<p class="empty-state">Selecciona un nivel para ver las flashcards</p>';
    }
});

async function loadFlashcards(levelId) {
    try {
        const res  = await fetchFresh(`${API}/admin/flashcards/level/${levelId}`);
        const data = await res.json();
        if (data.success) { flashcards = data.data; renderFlashcards(levelId); }
    } catch (e) { alertaError('Error al cargar flashcards'); }
}

function renderFlashcards(levelId) {
    const container = document.getElementById('flashcards-container');
    if (!flashcards.length) { container.innerHTML = '<p class="empty-state">No hay flashcards en este nivel</p>'; return; }
    container.innerHTML = flashcards.map(f => `
        <div class="item-card">
            <h3>${escHtml(f.titulo)}</h3>
            <p>${escHtml(f.contenido.substring(0, 100))}${f.contenido.length > 100 ? '…' : ''}</p>
            ${f.imagen ? `<img src="${f.imagen}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;margin-bottom:10px">` : ''}
            <div class="item-actions">
                <button class="btn btn-sm btn-ghost btn-edit-fc" data-id="${f.id}"><i class="fas fa-pen"></i></button>
                <button class="btn btn-sm btn-danger btn-del-fc" data-id="${f.id}" data-level="${f.level_id}"><i class="fas fa-trash"></i></button>
            </div>
        </div>`).join('');
    container.querySelectorAll('.btn-edit-fc').forEach(b => b.addEventListener('click', () => openFlashcardModal(b.dataset.id)));
    container.querySelectorAll('.btn-del-fc').forEach(b  => b.addEventListener('click', () => deleteFlashcard(b.dataset.id, b.dataset.level)));
}

const modalFlashcard = document.getElementById('modal-flashcard');
const formFlashcard  = document.getElementById('form-flashcard');

document.getElementById('btn-new-flashcard').addEventListener('click', () => {
    const lvl = document.getElementById('flashcard-level-filter').value;
    if (!lvl) { alertaAdvertencia('Selecciona un nivel primero'); return; }
    openFlashcardModal(null, lvl);
});

function openFlashcardModal(fcId = null, preLevel = null) {
    formFlashcard.reset();
    clearErrors('err-fc-level','err-fc-titulo','err-fc-contenido');
    document.getElementById('flashcard-id').value = '';

    if (fcId) {
        const fc = flashcards.find(f => String(f.id) === String(fcId));
        if (!fc) { alertaError('Flashcard no encontrada'); return; }

        // Validate level still exists
        if (!levels.find(l => String(l.id) === String(fc.level_id))) {
            alertaError('El nivel de esta flashcard ya no existe.');
            return;
        }

        document.getElementById('modal-flashcard-title').textContent = 'Editar Flashcard';
        document.getElementById('flashcard-id').value       = fc.id;
        document.getElementById('flashcard-level').value    = fc.level_id;
        document.getElementById('flashcard-titulo').value   = fc.titulo;
        document.getElementById('flashcard-contenido').value = fc.contenido;
        renderImageSelector('flashcard-image-grid', 'flashcard-image-preview', 'flashcard-imagen', fc.imagen || '');
    } else {
        document.getElementById('modal-flashcard-title').textContent = 'Nueva Flashcard';
        if (preLevel) document.getElementById('flashcard-level').value = preLevel;
        renderImageSelector('flashcard-image-grid', 'flashcard-image-preview', 'flashcard-imagen', '');
    }
    modalFlashcard.classList.add('active');
}

formFlashcard.addEventListener('submit', async e => {
    e.preventDefault();
    clearErrors('err-fc-level','err-fc-titulo','err-fc-contenido');

    const id        = document.getElementById('flashcard-id').value;
    const levelId   = document.getElementById('flashcard-level').value;
    const titulo    = document.getElementById('flashcard-titulo').value.trim();
    const contenido = document.getElementById('flashcard-contenido').value.trim();
    const imagen    = document.getElementById('flashcard-imagen').value.trim() || null;

    let valid = true;
    if (!levelId) { markInvalid('flashcard-level','err-fc-level','Selecciona un nivel'); valid = false; }
    if (!titulo)   { markInvalid('flashcard-titulo','err-fc-titulo','El título es obligatorio'); valid = false; }
    if (!contenido){ markInvalid('flashcard-contenido','err-fc-contenido','El contenido es obligatorio'); valid = false; }
    if (!valid) return;

    // Validate level still exists
    if (!levels.find(l => String(l.id) === String(levelId))) {
        alertaError('El nivel seleccionado ya no existe. Recarga la página.');
        await loadAll();
        return;
    }

    try {
        const url    = id ? `${API}/admin/flashcards/${id}` : `${API}/admin/flashcards`;
        const method = id ? 'PUT' : 'POST';
        const res    = await fetchFresh(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, levelId, titulo, contenido, imagen }) });
        const data   = await res.json();
        if (data.success) {
            alertaExito(id ? 'Flashcard actualizada' : 'Flashcard creada');
            modalFlashcard.classList.remove('active');
            document.getElementById('flashcard-level-filter').value = levelId;
            loadFlashcards(levelId);
        } else { alertaError(data.message); }
    } catch (e) { alertaError('Error al guardar flashcard'); }
});

async function deleteFlashcard(id, levelId) {
    if (!await alertaConfirmacion('¿Eliminar esta flashcard?', '⚠️ Confirmar')) return;
    try {
        const res  = await fetchFresh(`${API}/admin/flashcards/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
        const data = await res.json();
        if (data.success) { alertaExito('Flashcard eliminada'); loadFlashcards(levelId); }
        else alertaError(data.message);
    } catch (e) { alertaError('Error al eliminar'); }
}

// ══════════════════════════════════════════════════════════════════════
//  PREGUNTAS
// ══════════════════════════════════════════════════════════════════════
document.getElementById('question-level-filter').addEventListener('change', async e => {
    const levelId = e.target.value;
    if (levelId) {
        // Validate level exists
        if (!levels.find(l => String(l.id) === String(levelId))) {
            alertaError('El nivel seleccionado ya no existe.');
            await loadAll();
            return;
        }
        loadQuestions(levelId);
    } else {
        document.getElementById('questions-container').innerHTML = '<p class="empty-state">Selecciona un nivel</p>';
    }
});

async function loadQuestions(levelId) {
    try {
        const res  = await fetchFresh(`${API}/admin/questions/${levelId}`);
        const data = await res.json();
        if (data.success) { questions = data.data; renderQuestions(levelId); }
    } catch (e) { alertaError('Error al cargar preguntas'); }
}

function renderQuestions(levelId) {
    const container = document.getElementById('questions-container');
    if (!questions.length) { container.innerHTML = '<p class="empty-state">No hay preguntas en este nivel</p>'; return; }
    container.innerHTML = questions.map(q => `
        <div class="item-card">
            <h3>${escHtml(q.pregunta.substring(0, 70))}${q.pregunta.length > 70 ? '…' : ''}</h3>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
                <span style="font-size:11px;background:var(--paper);padding:2px 8px;border-radius:20px;border:1px solid var(--border);color:var(--ink-muted)">${Object.keys(q.opciones).length} opciones</span>
                <span style="font-size:11px;background:var(--green-bg);padding:2px 8px;border-radius:20px;color:var(--green);font-weight:700">✓ ${q.correcta}</span>
                <span style="font-size:11px;background:var(--paper);padding:2px 8px;border-radius:20px;border:1px solid var(--border);color:var(--ink-muted)">${q.dificultad}</span>
            </div>
            <div class="item-actions">
                <button class="btn btn-sm btn-ghost btn-edit-q" data-id="${q.id}"><i class="fas fa-pen"></i></button>
                <button class="btn btn-sm btn-danger btn-del-q" data-id="${q.id}" data-level="${q.level_id}"><i class="fas fa-trash"></i></button>
            </div>
        </div>`).join('');
    container.querySelectorAll('.btn-edit-q').forEach(b => b.addEventListener('click', () => openQuestionModal(b.dataset.id)));
    container.querySelectorAll('.btn-del-q').forEach(b  => b.addEventListener('click', () => deleteQuestion(b.dataset.id, b.dataset.level)));
}

const modalQuestion = document.getElementById('modal-question');
const formQuestion  = document.getElementById('form-question');

document.getElementById('btn-new-question').addEventListener('click', () => {
    const lvl = document.getElementById('question-level-filter').value;
    if (!lvl) { alertaAdvertencia('Selecciona un nivel primero'); return; }
    openQuestionModal(null, lvl);
});

function openQuestionModal(qId = null, preLevel = null) {
    formQuestion.reset();
    clearErrors('err-q-level','err-q-pregunta','err-q-opciones','err-q-correcta');
    document.getElementById('question-id').value = '';

    const optContainer = document.getElementById('options-container');
    optContainer.innerHTML = `
        <div class="option-row"><input type="text" class="option-input" data-key="A" placeholder="Opción A" required></div>
        <div class="option-row"><input type="text" class="option-input" data-key="B" placeholder="Opción B" required></div>
        <div class="option-row"><input type="text" class="option-input" data-key="C" placeholder="Opción C" required></div>`;

    if (qId) {
        const q = questions.find(x => String(x.id) === String(qId));
        if (!q) { alertaError('Pregunta no encontrada'); return; }

        // Validate level still exists
        if (!levels.find(l => String(l.id) === String(q.level_id))) {
            alertaError('El nivel de esta pregunta ya no existe.');
            return;
        }

        document.getElementById('modal-question-title').textContent = 'Editar Pregunta';
        document.getElementById('question-id').value         = q.id;
        document.getElementById('question-level').value      = q.level_id;
        document.getElementById('question-pregunta').value   = q.pregunta;
        document.getElementById('question-dificultad').value = q.dificultad || 'media';

        optContainer.innerHTML = '';
        Object.keys(q.opciones).forEach((key, idx) => {
            const row = document.createElement('div');
            row.className = 'option-row';
            row.innerHTML = `<input type="text" class="option-input" data-key="${key}" placeholder="Opción ${key}" value="${escHtml(q.opciones[key])}" required>
                ${idx >= 3 ? '<button type="button" class="btn-remove-option">&times;</button>' : ''}`;
            optContainer.appendChild(row);
        });

        renderImageSelector('question-image-grid', 'question-image-preview', 'question-imagen', q.imagen || '');
        updateCorrectaOptions(q.correcta);
    } else {
        document.getElementById('modal-question-title').textContent = 'Nueva Pregunta';
        if (preLevel) document.getElementById('question-level').value = preLevel;
        renderImageSelector('question-image-grid', 'question-image-preview', 'question-imagen', '');
        updateCorrectaOptions('');
    }

    attachRemoveOptionEvents();
    modalQuestion.classList.add('active');
}

function updateCorrectaOptions(selected = '') {
    const sel    = document.getElementById('question-correcta');
    const inputs = document.querySelectorAll('.option-input');
    const keys   = Array.from(inputs).map(i => i.dataset.key);
    sel.innerHTML = '<option value="">Selecciona la correcta</option>' +
        keys.map(k => `<option value="${k}" ${k === selected ? 'selected' : ''}>${k}</option>`).join('');
}

document.getElementById('btn-add-option').addEventListener('click', () => {
    const cnt = document.getElementById('options-container');
    if (cnt.children.length >= 5) { alertaAdvertencia('Máximo 5 opciones'); return; }
    const keys = ['A','B','C','D','E'];
    const nextKey = keys[cnt.children.length];
    const row = document.createElement('div');
    row.className = 'option-row';
    row.innerHTML = `<input type="text" class="option-input" data-key="${nextKey}" placeholder="Opción ${nextKey}" required>
        <button type="button" class="btn-remove-option">&times;</button>`;
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
    clearErrors('err-q-level','err-q-pregunta','err-q-opciones','err-q-correcta');

    const id         = document.getElementById('question-id').value;
    const levelId    = document.getElementById('question-level').value;
    const pregunta   = document.getElementById('question-pregunta').value.trim();
    const correcta   = document.getElementById('question-correcta').value;
    const dificultad = document.getElementById('question-dificultad').value;
    const imagen     = document.getElementById('question-imagen').value.trim() || null;

    const opciones = {};
    document.querySelectorAll('.option-input').forEach(inp => { if (inp.value.trim()) opciones[inp.dataset.key] = inp.value.trim(); });

    let valid = true;
    if (!levelId)  { markInvalid('question-level','err-q-level','Selecciona un nivel'); valid = false; }
    if (!pregunta) { markInvalid('question-pregunta','err-q-pregunta','La pregunta es obligatoria'); valid = false; }
    if (Object.keys(opciones).length < 3) { showErr('err-q-opciones','Necesitas al menos 3 opciones'); valid = false; }
    if (!correcta) { markInvalid('question-correcta','err-q-correcta','Selecciona la respuesta correcta'); valid = false; }
    if (correcta && !opciones[correcta]) { showErr('err-q-correcta','La respuesta correcta no coincide con ninguna opción'); valid = false; }
    if (!valid) return;

    // Validate level exists
    if (!levels.find(l => String(l.id) === String(levelId))) {
        alertaError('El nivel seleccionado ya no existe. Recarga la página.');
        await loadAll();
        return;
    }

    try {
        const url    = id ? `${API}/admin/questions/${id}` : `${API}/admin/questions`;
        const method = id ? 'PUT' : 'POST';
        const res    = await fetchFresh(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, levelId, pregunta, opciones, correcta, dificultad, imagen }) });
        const data   = await res.json();
        if (data.success) {
            alertaExito(id ? 'Pregunta actualizada' : 'Pregunta creada');
            modalQuestion.classList.remove('active');
            document.getElementById('question-level-filter').value = levelId;
            loadQuestions(levelId);
        } else { alertaError(data.message); }
    } catch (e) { alertaError('Error al guardar pregunta'); }
});

async function deleteQuestion(id, levelId) {
    if (!await alertaConfirmacion('¿Eliminar esta pregunta?', '⚠️ Confirmar')) return;
    try {
        const res  = await fetchFresh(`${API}/admin/questions/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
        const data = await res.json();
        if (data.success) { alertaExito('Pregunta eliminada'); loadQuestions(levelId); }
        else alertaError(data.message);
    } catch (e) { alertaError('Error al eliminar'); }
}

// ══════════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════════
function renderImageSelector(gridId, previewId, hiddenId, currentValue = '') {
    const grid    = document.getElementById(gridId);
    const preview = document.getElementById(previewId);
    const hidden  = document.getElementById(hiddenId);
    if (!grid) return;
    grid.innerHTML = AVAILABLE_IMAGES.map(imgName => {
        const path = `/public/img/fotos/${imgName}`;
        return `<div class="image-option${currentValue === path ? ' selected' : ''}" data-image="${path}"><img src="${path}" alt="${imgName}" loading="lazy"></div>`;
    }).join('');
    hidden.value = currentValue;
    if (currentValue) { preview.querySelector('span').textContent = currentValue.split('/').pop(); preview.classList.add('active'); }
    else preview.classList.remove('active');
    grid.querySelectorAll('.image-option').forEach(opt => {
        opt.addEventListener('click', () => {
            grid.querySelectorAll('.image-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            hidden.value = opt.dataset.image;
            preview.querySelector('span').textContent = opt.dataset.image.split('/').pop();
            preview.classList.add('active');
        });
    });
}

function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Close modals on X / backdrop
document.querySelectorAll('.modal-close-x, [data-modal]').forEach(el => {
    el.addEventListener('click', () => {
        const id = el.dataset.modal || el.closest('.modal')?.id;
        if (id) document.getElementById(id)?.classList.remove('active');
    });
});
document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('active'); });
});

// ── INIT ─────────────────────────────────────────────────────────────
(async () => {
    await loadAll();
    renderCategories();
})();