// frontend/public/js/pages/admin-platform.js
import { getSessionToken } from '../modules/auth.js';
import { alertaExito, alertaError, alertaAdvertencia } from '../modules/alerts.js';

const API = '/api';

// ── State ──────────────────────────────────────────────────────────
let currentPage     = 1;
let currentUserId   = null;
let pendingStatusId = null;
let pendingStatus   = null;

// ── Helpers ────────────────────────────────────────────────────────
function escHtml(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function adminHeaders() {
    const token = getSessionToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchFresh(url, options = {}) {
    const sep = url.includes('?') ? '&' : '?';
    return fetch(`${url}${sep}_=${Date.now()}`, {
        ...options,
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma':        'no-cache',
            ...adminHeaders(),
            ...(options.headers || {})
        }
    });
}

function fmt(n, dec = 2) {
    return Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusBadge(active) {
    return active
        ? `<span class="plt-status-badge active"><span class="plt-status-dot"></span>Activo</span>`
        : `<span class="plt-status-badge inactive"><span class="plt-status-dot"></span>Inactivo</span>`;
}

function verifiedBadge(v) {
    return v
        ? `<span class="plt-verified-badge yes"><i class="fas fa-check"></i></span>`
        : `<span class="plt-verified-badge no"><i class="fas fa-times"></i></span>`;
}

function roleLabel(role) {
    return { user: 'Usuario', support: 'Soporte', admin: 'Admin' }[role] ?? role;
}

// ══════════════════════════════════════════════════════════════════
//  RESUMEN GENERAL
// ══════════════════════════════════════════════════════════════════
async function loadPlatformStats() {
    const container = document.getElementById('plt-stats-container');
    if (!container) return;
    container.innerHTML = `<div class="plt-loading"><div class="plt-spinner"></div> Cargando métricas...</div>`;

    try {
        const res  = await fetchFresh(`${API}/admin/platform/stats`);
        const data = await res.json();
        if (!data.success) { alertaError(data.message || 'Error al cargar estadísticas'); return; }
        renderStatCards(data.data);
    } catch {
        alertaError('Error de conexión al cargar estadísticas.');
    }
}

function renderStatCards(d) {
    const container = document.getElementById('plt-stats-container');
    container.innerHTML = `
        <div class="plt-group-label">Usuarios</div>
        <div class="plt-metrics-grid">
            ${metricCard('Total de usuarios',       d.totalUsers,        'users',      'brand')}
            ${metricCard('Cuentas habilitadas',     d.activeUsers,       'user-check', 'green')}
            ${metricCard('Activos últimos 30 días', d.recentActiveUsers, 'clock',      'accent')}
            ${metricCard('Verificados',             d.verifiedUsers,     'envelope',   'blue')}
        </div>
        <div class="plt-role-breakdown">
            <span class="plt-role-label">Por rol:</span>
            <span class="plt-role-chip role-user">Usuario: <strong>${d.roleBreakdown.user ?? 0}</strong></span>
            <span class="plt-role-chip role-support">Soporte: <strong>${d.roleBreakdown.support ?? 0}</strong></span>
            <span class="plt-role-chip role-admin">Admin: <strong>${d.roleBreakdown.admin ?? 0}</strong></span>
        </div>
        <div class="plt-group-label plt-group-label-mt">Actividad</div>
        <div class="plt-metrics-grid">
            ${metricCard('Tickets pendientes',         d.ticketsPending,   'ticket-alt',   'orange')}
            ${metricCard('Tickets resueltos',          d.ticketsResolved,  'check-circle', 'green')}
            ${metricCard('Simulaciones realizadas',    d.totalSimulations, 'chart-pie',    'blue')}
            ${metricCard('Movimientos financieros',    d.totalMovements,   'exchange-alt', 'brand')}
        </div>
    `;
}

function metricCard(label, value, icon, color) {
    return `
        <div class="plt-metric-card plt-mc-${escHtml(color)}">
            <div class="plt-mc-icon"><i class="fas fa-${escHtml(icon)}"></i></div>
            <div class="plt-mc-content">
                <div class="plt-mc-value">${escHtml(String(value ?? 0))}</div>
                <div class="plt-mc-label">${escHtml(label)}</div>
            </div>
        </div>`;
}

// ══════════════════════════════════════════════════════════════════
//  GESTIÓN DE USUARIOS
// ══════════════════════════════════════════════════════════════════
async function loadUsers(page = 1) {
    currentPage = page;

    const search    = document.getElementById('plt-search-input')?.value ?? '';
    const role      = document.getElementById('plt-role-filter')?.value ?? '';
    const isActive  = document.getElementById('plt-active-filter')?.value ?? '';
    const verified  = document.getElementById('plt-verified-filter')?.value ?? '';

    const params = new URLSearchParams({ page, limit: 25 });
    if (search.trim()) params.set('search', search.trim());
    if (role)          params.set('role', role);
    if (isActive !== '') params.set('is_active', isActive);
    if (verified !== '') params.set('email_verified', verified);

    const container = document.getElementById('plt-users-container');
    if (container) container.innerHTML = `<div class="plt-loading"><div class="plt-spinner"></div> Cargando usuarios...</div>`;

    try {
        const res  = await fetchFresh(`${API}/admin/platform/users?${params}`);
        const data = await res.json();
        if (!data.success) { alertaError(data.message || 'Error al cargar usuarios'); return; }
        renderUsersTable(data.data, data.pagination);
    } catch {
        alertaError('Error de conexión al cargar usuarios.');
    }
}

function renderUsersTable(users, pagination) {
    const container = document.getElementById('plt-users-container');
    if (!container) return;

    if (!users.length) {
        container.innerHTML = `<div class="plt-table-wrap"><p class="empty-state">No se encontraron usuarios con esos criterios.</p></div>`;
        renderPagination(pagination);
        return;
    }

    const rows = users.map(u => `
        <tr class="plt-user-row" data-id="${u.id}">
            <td><span class="plt-id-badge">#${u.id}</span></td>
            <td><span class="plt-user-name">${escHtml(u.nombre)}</span></td>
            <td class="plt-td-email">${escHtml(u.email)}</td>
            <td><span class="plt-level-badge">Nv.${u.level ?? 1}</span></td>
            <td><span class="plt-role-badge role-${escHtml(u.role)}">${escHtml(roleLabel(u.role))}</span></td>
            <td>${statusBadge(u.is_active)}</td>
            <td>${verifiedBadge(u.email_verified)}</td>
            <td class="plt-td-date">${formatDate(u.created_at)}</td>
            <td>
                <button class="btn btn-sm btn-ghost plt-btn-detail" data-id="${u.id}" title="Ver detalle">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>`
    ).join('');

    container.innerHTML = `
        <div class="plt-table-wrap">
            <table class="plt-table">
                <thead>
                    <tr>
                        <th>ID</th><th>Nombre</th><th>Correo</th><th>Nivel</th>
                        <th>Rol</th><th>Estado</th><th>Email</th><th>Registro</th><th></th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;

    container.querySelectorAll('.plt-btn-detail').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); openUserDetail(btn.dataset.id); });
    });
    container.querySelectorAll('.plt-user-row').forEach(row => {
        row.addEventListener('click', () => openUserDetail(row.dataset.id));
    });

    renderPagination(pagination);
}

function renderPagination({ total, page, totalPages }) {
    const el = document.getElementById('plt-pagination');
    if (!el) return;

    if (totalPages <= 1) {
        el.innerHTML = `<span class="plt-page-info">${total} usuario(s) en total</span>`;
        return;
    }

    const prevDis = page <= 1 ? 'disabled' : '';
    const nextDis = page >= totalPages ? 'disabled' : '';

    el.innerHTML = `
        <button class="btn btn-sm btn-ghost plt-page-btn" data-page="${page - 1}" ${prevDis}>
            <i class="fas fa-chevron-left"></i>
        </button>
        <span class="plt-page-info">Página ${page} de ${totalPages} · ${total} usuarios</span>
        <button class="btn btn-sm btn-ghost plt-page-btn" data-page="${page + 1}" ${nextDis}>
            <i class="fas fa-chevron-right"></i>
        </button>`;

    el.querySelectorAll('.plt-page-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => loadUsers(parseInt(btn.dataset.page, 10)));
    });
}

// ══════════════════════════════════════════════════════════════════
//  DETALLE DE USUARIO
// ══════════════════════════════════════════════════════════════════
async function openUserDetail(userId) {
    currentUserId = userId;
    const overlay = document.getElementById('plt-detail-overlay');
    const panels  = document.getElementById('plt-tab-panels');
    const header  = document.getElementById('plt-user-header');

    if (!overlay) return;

    // Reset tabs
    document.querySelectorAll('.plt-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'general'));
    if (panels) panels.innerHTML = `<div class="plt-loading"><div class="plt-spinner"></div> Cargando...</div>`;
    if (header) header.innerHTML = '';

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    try {
        const res  = await fetchFresh(`${API}/admin/platform/users/${userId}/detail`);
        const data = await res.json();
        if (!data.success) { alertaError(data.message || 'Error al cargar usuario'); closeDetail(); return; }
        renderDetailHeader(data.data);
        renderAllPanels(data.data);
        // Mostrar pestaña activa por defecto
        showPanel('general');
    } catch {
        alertaError('Error de conexión.');
        closeDetail();
    }
}

function renderDetailHeader({ user, movements, simulations, tickets }) {
    const header = document.getElementById('plt-user-header');
    if (!header) return;

    const initials = (user.nombre ?? '?').slice(0, 2).toUpperCase();
    const avatarImg = user.foto
        ? `<img src="${escHtml(user.foto)}" alt="avatar">`
        : `<span>${escHtml(initials)}</span>`;

    const canToggle = user.role !== 'admin';
    const btnLabel  = user.is_active ? 'Desactivar' : 'Reactivar';
    const btnClass  = user.is_active ? 'btn-danger' : 'btn-secondary';

    header.innerHTML = `
        <div class="plt-avatar-wrap">${avatarImg}</div>
        <div class="plt-header-info">
            <div class="plt-header-name">
                ${escHtml(user.nombre)}
                ${statusBadge(user.is_active)}
                ${user.email_verified ? `<span class="plt-verified-badge yes" title="Email verificado"><i class="fas fa-check"></i></span>` : ''}
                <span class="plt-role-badge role-${escHtml(user.role)}">${escHtml(roleLabel(user.role))}</span>
            </div>
            <div class="plt-header-meta">
                <span><i class="fas fa-id-badge"></i> ID ${user.id}</span>
                <span><i class="fas fa-envelope"></i> ${escHtml(user.email)}</span>
                <span><i class="fas fa-calendar-plus"></i> Registro: ${formatDate(user.created_at)}</span>
                ${user.last_login_at ? `<span><i class="fas fa-sign-in-alt"></i> Último acceso: ${formatDate(user.last_login_at)}</span>` : ''}
            </div>
        </div>
        <div class="plt-header-actions">
            ${canToggle ? `
                <button class="btn btn-sm ${btnClass}" id="plt-toggle-status-btn">
                    <i class="fas fa-${user.is_active ? 'ban' : 'check'}"></i> ${btnLabel}
                </button>` : ''}
            <button class="modal-close" id="plt-detail-close-btn" title="Cerrar">✕</button>
        </div>`;

    document.getElementById('plt-detail-close-btn')?.addEventListener('click', closeDetail);

    if (canToggle) {
        document.getElementById('plt-toggle-status-btn')?.addEventListener('click', () => {
            openStatusConfirm(user.id, !user.is_active, user.nombre);
        });
    }
}

function renderAllPanels({ user, progress, movements, simulations, tickets, skins, savingMethod }) {
    const panels = document.getElementById('plt-tab-panels');
    if (!panels) return;

    panels.innerHTML = `
        ${panelGeneral(user)}
        ${panelProgress(progress)}
        ${panelFinances(movements, savingMethod)}
        ${panelGame(user, skins)}
        ${panelSupport(tickets)}
        ${panelInvestments(simulations)}
    `;
}

// ── Panel: Datos generales ────────────────────────────────────────
function panelGeneral(u) {
    const row = (key, val) => `
        <div class="plt-info-row">
            <span class="plt-info-key">${escHtml(key)}</span>
            <span class="plt-info-val">${val}</span>
        </div>`;

    const generoMap = { masculino: 'Masculino', femenino: 'Femenino', otro: 'Otro', no_especificado: 'No especificado' };

    return `
        <div class="plt-panel active" id="panel-general">
            <div class="plt-info-grid">
                ${row('Nombre',          escHtml(u.nombre))}
                ${row('Correo',         escHtml(u.email))}
                ${row('Edad',           u.edad ? `${u.edad} años` : '—')}
                ${row('Género',         escHtml(generoMap[u.genero] ?? u.genero ?? '—'))}
                ${row('Nivel',          `Nivel ${u.level ?? 1}`)}
                ${row('Rol',            `<span class="plt-role-badge role-${escHtml(u.role)}">${escHtml(roleLabel(u.role))}</span>`)}
                ${row('Estado cuenta',  statusBadge(u.is_active))}
                ${row('Email verif.',   verifiedBadge(u.email_verified))}
                ${row('Fecha verif.',   escHtml(formatDate(u.email_verified_at)))}
                ${row('Último acceso',  escHtml(formatDateTime(u.last_login_at)))}
                ${row('Pass cambiada',  escHtml(formatDate(u.password_changed_at)))}
                ${row('Registro',       escHtml(formatDate(u.created_at)))}
            </div>
        </div>`;
}

// ── Panel: Progreso educativo ─────────────────────────────────────
function panelProgress({ categories, totalLevelsCompleted }) {
    const items = categories.length
        ? categories.map(c => `
            <div class="plt-progress-item">
                <div class="plt-progress-header">
                    <span>${escHtml(c.categoryName)}</span>
                    <span class="plt-progress-count">${c.completedLevels} nivel(es) completado(s)</span>
                </div>
            </div>`).join('')
        : `<p class="empty-state" style="padding:24px 0">Sin progreso registrado todavía.</p>`;

    return `
        <div class="plt-panel" id="panel-progress">
            <div class="plt-stat-row">
                <div class="plt-stat-box">
                    <div class="plt-stat-box-val">${escHtml(String(totalLevelsCompleted))}</div>
                    <div class="plt-stat-box-label">Niveles completados en total</div>
                </div>
                <div class="plt-stat-box">
                    <div class="plt-stat-box-val">${escHtml(String(categories.length))}</div>
                    <div class="plt-stat-box-label">Categorías con progreso</div>
                </div>
            </div>
            <div class="plt-panel-section">Desglose por categoría</div>
            <div class="plt-progress-list">${items}</div>
        </div>`;
}

// ── Panel: Actividad financiera ───────────────────────────────────
function panelFinances(movs, savingMethod) {
    const methodMap = {
        automatic_50_30_20: 'Automático 50/30/20',
        percentage:         'Por porcentaje',
        manual:             'Monto manual'
    };

    return `
        <div class="plt-panel" id="panel-finances">
            <div class="plt-stat-row">
                <div class="plt-stat-box">
                    <div class="plt-stat-box-val">${escHtml(String(movs.total))}</div>
                    <div class="plt-stat-box-label">Movimientos totales</div>
                </div>
                <div class="plt-stat-box">
                    <div class="plt-stat-box-val">${escHtml(String(movs.incomeCount))}</div>
                    <div class="plt-stat-box-label">Registros de ingreso</div>
                </div>
                <div class="plt-stat-box">
                    <div class="plt-stat-box-val">${escHtml(String(movs.expenseCount))}</div>
                    <div class="plt-stat-box-label">Registros de egreso</div>
                </div>
            </div>
            <div class="plt-info-grid" style="margin-top:14px;">
                <div class="plt-info-row">
                    <span class="plt-info-key">Ingresos totales</span>
                    <span class="plt-info-val">$${escHtml(fmt(movs.incomeTotal))}</span>
                </div>
                <div class="plt-info-row">
                    <span class="plt-info-key">Egresos totales</span>
                    <span class="plt-info-val">$${escHtml(fmt(movs.expenseTotal))}</span>
                </div>
                <div class="plt-info-row">
                    <span class="plt-info-key">Balance neto</span>
                    <span class="plt-info-val">$${escHtml(fmt(movs.incomeTotal - movs.expenseTotal))}</span>
                </div>
                <div class="plt-info-row">
                    <span class="plt-info-key">Método ahorro</span>
                    <span class="plt-info-val">${escHtml(methodMap[savingMethod] ?? (savingMethod ? savingMethod : 'No configurado'))}</span>
                </div>
            </div>
        </div>`;
}

// ── Panel: Juego y gamificación ───────────────────────────────────
function panelGame(u, skins) {
    const skinItems = skins.length
        ? skins.map(s => `
            <span class="plt-skin-chip">
                ${escHtml(s.nombre)}
                <span class="skin-type">${escHtml(s.tipo ?? '')}</span>
            </span>`).join('')
        : `<span style="color:var(--ink-muted);font-size:.8125rem">Sin skins desbloqueadas.</span>`;

    return `
        <div class="plt-panel" id="panel-game">
            <div class="plt-stat-row">
                <div class="plt-stat-box">
                    <div class="plt-stat-box-val">${escHtml(String(u.coins ?? 0))}</div>
                    <div class="plt-stat-box-label">Monedas</div>
                </div>
                <div class="plt-stat-box">
                    <div class="plt-stat-box-val">${escHtml(String(u.wood ?? 0))}</div>
                    <div class="plt-stat-box-label">Madera</div>
                </div>
                <div class="plt-stat-box">
                    <div class="plt-stat-box-val">${escHtml(String(u.level ?? 1))}</div>
                    <div class="plt-stat-box-label">Nivel de jugador</div>
                </div>
                <div class="plt-stat-box">
                    <div class="plt-stat-box-val">${escHtml(String(skins.length))}</div>
                    <div class="plt-stat-box-label">Skins desbloqueadas</div>
                </div>
            </div>
            <div class="plt-info-grid" style="margin-top:14px;">
                <div class="plt-info-row">
                    <span class="plt-info-key">Nivel casa</span>
                    <span class="plt-info-val">${escHtml(String(u.house_level ?? 1))}</span>
                </div>
                <div class="plt-info-row">
                    <span class="plt-info-key">Nivel castor</span>
                    <span class="plt-info-val">${escHtml(String(u.beaver_level ?? 1))}</span>
                </div>
                <div class="plt-info-row">
                    <span class="plt-info-key">Casa activa</span>
                    <span class="plt-info-val">${escHtml(u.current_appearance ?? '—')}</span>
                </div>
                <div class="plt-info-row">
                    <span class="plt-info-key">Castor activo</span>
                    <span class="plt-info-val">${escHtml(u.current_beaver ?? '—')}</span>
                </div>
            </div>
            <div class="plt-panel-section">Skins desbloqueadas</div>
            <div class="plt-skins-grid">${skinItems}</div>
            <div class="plt-panel-note">
                <i class="fas fa-info-circle"></i>
                El historial de retos completados no está disponible actualmente (sin tabla de historial).
                Los contadores de monedas y madera reflejan el saldo acumulado actual.
            </div>
        </div>`;
}

// ── Panel: Soporte ────────────────────────────────────────────────
function panelSupport({ list, stats }) {
    const ticketItems = list.length
        ? list.map(t => `
            <div class="plt-ticket-item">
                <span class="plt-ticket-subject">${escHtml(t.subject)}</span>
                <div class="plt-ticket-meta">
                    <span class="tk-status ${escHtml(t.status)}">${escHtml(t.status.replace('_', ' '))}</span>
                    <span class="tk-priority ${escHtml(t.priority)}">${escHtml(t.priority)}</span>
                </div>
            </div>`).join('')
        : `<p class="empty-state" style="padding:24px 0">Sin tickets registrados.</p>`;

    return `
        <div class="plt-panel" id="panel-support">
            <div class="plt-stat-row">
                <div class="plt-stat-box">
                    <div class="plt-stat-box-val">${escHtml(String(stats.total))}</div>
                    <div class="plt-stat-box-label">Tickets (últimos 20)</div>
                </div>
                <div class="plt-stat-box">
                    <div class="plt-stat-box-val">${escHtml(String(stats.open))}</div>
                    <div class="plt-stat-box-label">Abiertos</div>
                </div>
                <div class="plt-stat-box">
                    <div class="plt-stat-box-val">${escHtml(String(stats.resolved))}</div>
                    <div class="plt-stat-box-label">Cerrados / resueltos</div>
                </div>
            </div>
            <div class="plt-panel-section">Tickets recientes</div>
            <div class="plt-ticket-list">${ticketItems}</div>
        </div>`;
}

// ── Panel: Inversiones ────────────────────────────────────────────
function panelInvestments({ count, latest }) {
    const latestBlock = latest
        ? `
            <div class="plt-panel-section">Simulación más reciente</div>
            <div class="plt-sim-card">
                <div class="plt-sim-name">${escHtml(latest.nombre ?? 'Sin nombre')}</div>
                <div class="plt-sim-stat">
                    <div class="plt-sim-stat-val">${escHtml(fmt(latest.rendimiento_pct ?? 0))}%</div>
                    <div class="plt-sim-stat-label">Rendimiento</div>
                </div>
                <div class="plt-sim-stat">
                    <div class="plt-sim-stat-val">$${escHtml(fmt(latest.ganancia_total ?? 0))}</div>
                    <div class="plt-sim-stat-label">Ganancia</div>
                </div>
                <div class="plt-sim-stat">
                    <div class="plt-sim-stat-val">$${escHtml(fmt(latest.capital_inicial ?? 0))}</div>
                    <div class="plt-sim-stat-label">Capital inicial</div>
                </div>
            </div>
            <div class="plt-sim-date"><i class="fas fa-calendar-alt"></i> ${escHtml(formatDate(latest.created_at))}</div>`
        : `<p class="empty-state" style="padding:24px 0">Sin simulaciones realizadas.</p>`;

    return `
        <div class="plt-panel" id="panel-investments">
            <div class="plt-stat-row">
                <div class="plt-stat-box">
                    <div class="plt-stat-box-val">${escHtml(String(count))}</div>
                    <div class="plt-stat-box-label">Simulaciones totales</div>
                </div>
            </div>
            ${latestBlock}
        </div>`;
}

// ── Tab navigation ────────────────────────────────────────────────
function showPanel(tab) {
    document.querySelectorAll('.plt-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.plt-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
}

// ── Close detail overlay ──────────────────────────────────────────
function closeDetail() {
    document.getElementById('plt-detail-overlay')?.classList.remove('open');
    document.body.style.overflow = '';
    currentUserId = null;
}

// ══════════════════════════════════════════════════════════════════
//  CAMBIO DE ESTADO (ACTIVAR / DESACTIVAR)
// ══════════════════════════════════════════════════════════════════
function openStatusConfirm(userId, newStatus, userName) {
    pendingStatusId = userId;
    pendingStatus   = newStatus;

    const titleEl  = document.getElementById('plt-status-title');
    const textEl   = document.getElementById('plt-status-text');
    const iconEl   = document.getElementById('plt-status-icon');
    const confirmEl = document.getElementById('plt-status-confirm');
    const reasonEl = document.getElementById('plt-status-reason');
    const modal    = document.getElementById('plt-status-modal');

    if (!modal) return;

    if (reasonEl) reasonEl.value = '';

    if (newStatus === false) {
        if (iconEl)   iconEl.innerHTML  = '<i class="fas fa-ban" style="font-size:2.5rem;color:var(--red)"></i>';
        if (titleEl)  titleEl.textContent = 'Desactivar cuenta';
        if (textEl)   textEl.innerHTML  = `Estás a punto de <strong>desactivar</strong> la cuenta de <strong>${escHtml(userName)}</strong>. El usuario no podrá iniciar sesión. Podrás reactivarla en cualquier momento.`;
        if (confirmEl) { confirmEl.className = 'btn btn-danger'; confirmEl.innerHTML = '<i class="fas fa-ban"></i> Confirmar desactivación'; }
    } else {
        if (iconEl)   iconEl.innerHTML  = '<i class="fas fa-check-circle" style="font-size:2.5rem;color:var(--green)"></i>';
        if (titleEl)  titleEl.textContent = 'Reactivar cuenta';
        if (textEl)   textEl.innerHTML  = `Estás a punto de <strong>reactivar</strong> la cuenta de <strong>${escHtml(userName)}</strong>. El usuario podrá volver a iniciar sesión.`;
        if (confirmEl) { confirmEl.className = 'btn btn-primary'; confirmEl.innerHTML = '<i class="fas fa-check"></i> Confirmar reactivación'; }
    }

    modal.classList.add('open');
}

async function executeStatusChange() {
    if (pendingStatusId === null || pendingStatus === null) return;

    const banner = document.getElementById('plt-migration-banner');
    if (banner) banner.classList.remove('visible');

    document.getElementById('plt-status-modal')?.classList.remove('open');

    try {
        const res  = await fetchFresh(`${API}/admin/platform/users/${pendingStatusId}/status`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ is_active: pendingStatus })
        });
        const data = await res.json();

        if (!data.success) {
            if (data.code === 'MIGRATION_REQUIRED' && banner) {
                banner.classList.add('visible');
            } else {
                alertaError(data.message || 'No se pudo cambiar el estado.');
            }
            return;
        }

        alertaExito(data.message);

        // Refrescar la tabla y el detalle del usuario si está abierto
        await loadUsers(currentPage);
        if (currentUserId && String(currentUserId) === String(pendingStatusId)) {
            openUserDetail(currentUserId);
        }
    } catch {
        alertaError('Error de conexión al cambiar estado.');
    } finally {
        pendingStatusId = null;
        pendingStatus   = null;
    }
}

// ══════════════════════════════════════════════════════════════════
//  EVENT LISTENERS
// ══════════════════════════════════════════════════════════════════
function setupEventListeners() {
    // Tabs del detalle de usuario
    document.getElementById('plt-detail-tabs')?.addEventListener('click', e => {
        const btn = e.target.closest('.plt-tab-btn');
        if (btn?.dataset.tab) showPanel(btn.dataset.tab);
    });

    // Cerrar overlay al clic en fondo
    document.getElementById('plt-detail-overlay')?.addEventListener('click', e => {
        if (e.target === document.getElementById('plt-detail-overlay')) closeDetail();
    });
    document.getElementById('plt-detail-close')?.addEventListener('click', closeDetail);

    // Status modal buttons
    document.getElementById('plt-status-confirm')?.addEventListener('click', executeStatusChange);
    document.getElementById('plt-status-cancel')?.addEventListener('click', () => {
        document.getElementById('plt-status-modal')?.classList.remove('open');
        pendingStatusId = null;
        pendingStatus   = null;
    });
    document.getElementById('plt-status-close')?.addEventListener('click', () => {
        document.getElementById('plt-status-modal')?.classList.remove('open');
        pendingStatusId = null;
        pendingStatus   = null;
    });
    document.getElementById('plt-status-modal')?.addEventListener('click', e => {
        if (e.target === document.getElementById('plt-status-modal')) {
            document.getElementById('plt-status-modal')?.classList.remove('open');
            pendingStatusId = null;
            pendingStatus   = null;
        }
    });

    // Botón de actualizar stats
    document.getElementById('btn-refresh-stats')?.addEventListener('click', loadPlatformStats);

    // Búsqueda: debounce 350ms
    let searchTimer;
    document.getElementById('plt-search-input')?.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => loadUsers(1), 350);
    });

    // Filtros de select → recarga inmediata
    ['plt-role-filter','plt-active-filter','plt-verified-filter'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => loadUsers(1));
    });

    // Navegación de sidebar: cargar datos al entrar en la sección
    document.querySelector('[data-section="platform-stats"]')?.addEventListener('click', loadPlatformStats);
    document.querySelector('[data-section="platform-users"]')?.addEventListener('click', () => loadUsers(1));

    // Escape cierra el detalle
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (document.getElementById('plt-status-modal')?.classList.contains('open')) {
                document.getElementById('plt-status-modal').classList.remove('open');
                pendingStatusId = null; pendingStatus = null;
            } else if (document.getElementById('plt-detail-overlay')?.classList.contains('open')) {
                closeDetail();
            }
        }
    });
}

// ── INIT ──────────────────────────────────────────────────────────
setupEventListeners();
