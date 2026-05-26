import { getAuthData } from '../modules/auth.js';
import { getRecommendations, getRecReadState, markRecRead } from '../modules/api.js';

const TYPE_META = {
    danger:  { label: 'Alerta',          pill: 'Alerta' },
    warning: { label: 'Advertencia',     pill: 'Aviso' },
    success: { label: 'Positivo',        pill: 'Positivo' },
    info:    { label: 'Información',     pill: 'Info' },
    tip:     { label: 'Consejo',         pill: 'Consejo' },
};

function fmt(n) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

function renderCard(rec, idx) {
    const meta = TYPE_META[rec.type] || TYPE_META.info;
    const card = document.createElement('article');
    card.className = `rec-card ${rec.type}`;
    // animación manejada por CSS :nth-child()
    card.innerHTML = `
        <div class="rec-card-icon" aria-hidden="true">
            <i class="fas ${rec.icon}"></i>
        </div>
        <div class="rec-card-body">
            <p class="rec-card-title">${rec.title}</p>
            <p class="rec-card-message">${rec.message}</p>
            <span class="rec-type-pill">${meta.pill}</span>
        </div>
    `;
    return card;
}

function renderSummary(summary) {
    const bar = document.getElementById('rec-summary-bar');
    if (!bar || !summary) return;

    const balClass = summary.currentBalance >= 0 ? 'positive' : 'negative';
    bar.innerHTML = `
        <div class="rec-summary-item">
            <span class="rec-summary-label">Ingresos</span>
            <span class="rec-summary-value positive">${fmt(summary.currentIncome)}</span>
        </div>
        <div class="rec-summary-item">
            <span class="rec-summary-label">Egresos</span>
            <span class="rec-summary-value negative">${fmt(summary.currentExpense)}</span>
        </div>
        <div class="rec-summary-item">
            <span class="rec-summary-label">Balance</span>
            <span class="rec-summary-value ${balClass}">${fmt(summary.currentBalance)}</span>
        </div>
    `;
}

function showLoading(list) {
    list.innerHTML = '';
    const state = document.createElement('div');
    state.className = 'rec-state';
    state.innerHTML = '<div class="rec-spinner"></div><p>Analizando tus finanzas...</p>';
    list.appendChild(state);
}

function showEmpty(list) {
    list.innerHTML = '';
    const state = document.createElement('div');
    state.className = 'rec-state';
    state.innerHTML = `
        <i class="fas fa-circle-check"></i>
        <p>Todo se ve bien por ahora.<br>Sigue registrando tus movimientos para obtener recomendaciones personalizadas.</p>
    `;
    list.appendChild(state);
}

function showError(list) {
    list.innerHTML = '';
    const state = document.createElement('div');
    state.className = 'rec-state';
    state.innerHTML = `
        <i class="fas fa-circle-exclamation"></i>
        <p>No se pudieron cargar las recomendaciones.<br>Intenta de nuevo más tarde.</p>
    `;
    list.appendChild(state);
}

let _recCount = 0;

async function persistMarkAsRead(userId, month, year) {
    try {
        await markRecRead(userId, month, year, _recCount);
    } catch {}
}

async function fetchSeenCount(userId, month, year) {
    try {
        const res = await getRecReadState(userId, month, year);
        return res?.success ? (res.data?.seen_count ?? 0) : 0;
    } catch {
        return 0;
    }
}

async function loadAndRender(userId, month, year) {
    const fab    = document.getElementById('rec-fab');
    const badge  = document.getElementById('rec-badge');
    const list   = document.getElementById('rec-list');

    if (!list) return;

    // Limpiar recomendaciones anteriores al cambiar mes
    list.innerHTML = '';
    showLoading(list);

    try {
        const res = await getRecommendations(userId, month, year);

        if (!res.success) {
            showError(list);
            return;
        }

        const { recommendations, summary } = res.data;

        renderSummary(summary);

        if (!recommendations || recommendations.length === 0) {
            showEmpty(list);
            badge.classList.add('hidden');
            fab.classList.remove('has-recs');
            return;
        }

        _recCount = recommendations.length;

        const seen = await fetchSeenCount(userId, month, year);
        if (_recCount !== seen) {
            badge.textContent = _recCount;
            badge.classList.remove('hidden');
            fab.classList.add('has-recs');
        } else {
            badge.classList.add('hidden');
            fab.classList.remove('has-recs');
        }

        list.innerHTML = '';
        recommendations.forEach((rec, idx) => {
            list.appendChild(renderCard(rec, idx));
        });

    } catch {
        showError(list);
    }
}

let _panelMonth = null;
let _panelYear  = null;

function openPanel(userId) {
    document.getElementById('rec-overlay').classList.add('open');
    document.getElementById('rec-panel').classList.add('open');
    document.documentElement.classList.add('rec-panel-open');

    persistMarkAsRead(userId, _panelMonth, _panelYear);
    const badge = document.getElementById('rec-badge');
    const fab   = document.getElementById('rec-fab');
    badge.classList.add('hidden');
    fab.classList.remove('has-recs');
}

function closePanel() {
    document.getElementById('rec-overlay').classList.remove('open');
    document.getElementById('rec-panel').classList.remove('open');
    document.documentElement.classList.remove('rec-panel-open');
}

document.addEventListener('DOMContentLoaded', () => {
    const auth = getAuthData();
    if (!auth?.id) return;

    const userId = auth.id;
    const now    = new Date();
    _panelMonth  = now.getMonth() + 1;
    _panelYear   = now.getFullYear();

    document.getElementById('rec-fab')?.addEventListener('click', () => openPanel(userId));
    document.getElementById('rec-panel-close')?.addEventListener('click', closePanel);
    document.getElementById('rec-overlay')?.addEventListener('click', closePanel);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePanel();
    });

    // Escuchar cambios de mes desde el calendario del dashboard
    document.addEventListener('mes-changed', (e) => {
        _panelMonth = e.detail.month;
        _panelYear  = e.detail.year;
        loadAndRender(userId, _panelMonth, _panelYear);
    });

    loadAndRender(userId, _panelMonth, _panelYear);
});
