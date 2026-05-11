import { getAuthData } from '../modules/auth.js';
import { getRecommendations } from '../modules/api.js';

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
    card.style.animationDelay = `${idx * 0.06}s`;
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

async function loadAndRender(userId) {
    const fab    = document.getElementById('rec-fab');
    const badge  = document.getElementById('rec-badge');
    const list   = document.getElementById('rec-list');

    if (!list) return;

    showLoading(list);

    try {
        const res = await getRecommendations(userId);

        if (!res.success) {
            showError(list);
            return;
        }

        const { recommendations, summary } = res.data;

        renderSummary(summary);

        if (!recommendations || recommendations.length === 0) {
            showEmpty(list);
            badge.classList.add('hidden');
            return;
        }

        // Update badge
        const count = recommendations.length;
        badge.textContent = count;
        badge.classList.remove('hidden');
        fab.classList.add('has-recs');

        // Render cards
        list.innerHTML = '';
        recommendations.forEach((rec, idx) => {
            list.appendChild(renderCard(rec, idx));
        });

    } catch {
        showError(list);
    }
}

function openPanel() {
    document.getElementById('rec-overlay').classList.add('open');
    document.getElementById('rec-panel').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closePanel() {
    document.getElementById('rec-overlay').classList.remove('open');
    document.getElementById('rec-panel').classList.remove('open');
    document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const auth = getAuthData();
    if (!auth?.id) return;

    const userId = auth.id;

    document.getElementById('rec-fab')?.addEventListener('click', openPanel);
    document.getElementById('rec-panel-close')?.addEventListener('click', closePanel);
    document.getElementById('rec-overlay')?.addEventListener('click', closePanel);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePanel();
    });

    loadAndRender(userId);
});
