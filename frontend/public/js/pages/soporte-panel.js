// frontend/public/js/pages/soporte-panel.js
import { protectRoute, getAuthData } from '../modules/auth.js';
import { alertaExito, alertaError } from '../modules/alerts.js';
import {
    getSupportTickets,
    getSupportTicketDetail,
    takeTicket,
    changeTicketStatus,
    replyAsSupport,
    getMacros
} from '../modules/api.js';

document.addEventListener('DOMContentLoaded', async () => {

    if (!protectRoute()) return;

    const sessionUser = getAuthData();
    const userId      = sessionUser.id;
    const userRole    = sessionUser.role;

    if (userRole !== 'support' && userRole !== 'admin') {
        window.location.href = '/dashboard.html';
        return;
    }

    // ── DOM refs ────────────────────────────────────────────────────────────
    const btnRefresh    = document.getElementById('btn-refresh');
    const lastUpdateEl  = document.getElementById('last-update');

    const colOpen       = document.getElementById('col-open');
    const colInProgress = document.getElementById('col-in-progress');
    const colWaiting    = document.getElementById('col-waiting');
    const colResolved   = document.getElementById('col-resolved');

    const countOpen     = document.getElementById('count-open');
    const countInProg   = document.getElementById('count-in-progress');
    const countWaiting  = document.getElementById('count-waiting');
    const countResolved = document.getElementById('count-resolved');

    const statTotal     = document.getElementById('stat-total');
    const statOpen      = document.getElementById('stat-open');
    const statInProg    = document.getElementById('stat-in-progress');
    const statWaiting   = document.getElementById('stat-waiting');
    const statResolved  = document.getElementById('stat-resolved');

    const detailEmpty   = document.getElementById('detail-empty');
    const detailContent = document.getElementById('detail-content');

    const dSubject      = document.getElementById('d-subject');
    const dUserName     = document.getElementById('d-user-name');
    const dUserEmail    = document.getElementById('d-user-email');
    const dMetaRow      = document.getElementById('d-meta-row');
    const dMessages     = document.getElementById('d-messages');
    const dEvents       = document.getElementById('d-events');

    const btnTake       = document.getElementById('btn-take');
    const statusSelect  = document.getElementById('status-select');
    const btnApply      = document.getElementById('btn-apply-status');
    const replyTextarea = document.getElementById('reply-textarea');
    const btnSend       = document.getElementById('btn-send');
    const btnCloseDetail= document.getElementById('btn-close-detail');

    const tabReply      = document.getElementById('tab-reply');
    const tabNote       = document.getElementById('tab-note');

    let activeTicketId     = null;
    let activeTicketData   = null;
    let isInternalMode     = false;
    let allTickets         = [];
    let pollingInterval    = null;

    // ── HELPERS ───────────────────────────────────────────────────────────
    const STATUS_LABELS = {
        open:         'Abierto',
        in_progress:  'En progreso',
        waiting_user: 'Esperando usuario',
        resolved:     'Resuelto',
        closed:       'Cerrado'
    };

    const PRIORITY_LABELS = {
        low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente'
    };

    const TYPE_LABELS = {
        bug: 'Bug', duda: 'Duda', sugerencia: 'Sugerencia', otro: 'Otro'
    };

    const PRIORITY_ORDER = { urgent: 4, high: 3, medium: 2, low: 1 };

    function badge(text, cls) {
        return `<span class="badge ${cls}">${text}</span>`;
    }

    function badgeStatus(s) {
        return badge(STATUS_LABELS[s] || s, `badge-${s}`);
    }

    function badgePriority(p) {
        return badge(PRIORITY_LABELS[p] || p, `badge-${p}`);
    }

    function formatDate(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function setColumnContent(colEl, tickets, emptyMsg) {
        colEl.innerHTML = '';
        if (!tickets || tickets.length === 0) {
            colEl.innerHTML = `<div class="col-empty">${emptyMsg}</div>`;
            return;
        }
        tickets.forEach(t => colEl.appendChild(buildMiniCard(t)));
    }

    function buildMiniCard(ticket) {
        const card = document.createElement('div');
        card.className = 'ticket-mini';
        if (ticket.id === activeTicketId) card.classList.add('active');

        const userName = ticket.ticket_user?.nombre || 'Usuario';

        card.innerHTML = `
            <div class="ticket-mini-subject">${escapeHtml(ticket.subject)}</div>
            <div class="ticket-mini-meta">
                ${badgePriority(ticket.priority)}
                <span class="ticket-mini-type-label">${TYPE_LABELS[ticket.type] || ticket.type}</span>
            </div>
            <div class="ticket-mini-user">
                <i class="fas fa-user"></i> ${escapeHtml(userName)}
            </div>`;

        card.addEventListener('click', () => openDetail(ticket.id));
        return card;
    }

    // ── CARGAR TODOS LOS TICKETS ──────────────────────────────────────────
    async function loadBoard() {
        const res = await getSupportTickets(userId);

        if (!res.success) {
            alertaError('Error al cargar tickets.');
            return;
        }

        allTickets = res.data || [];

        const openTickets      = allTickets.filter(t => t.status === 'open' && !t.assigned_to)
            .sort((a, b) => (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0));
        const inProgTickets    = allTickets.filter(t => t.status === 'in_progress');
        const waitingTickets   = allTickets.filter(t => t.status === 'waiting_user');
        const resolvedTickets  = allTickets
            .filter(t => t.status === 'resolved' || t.status === 'closed')
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
            .slice(0, 10);

        setColumnContent(colOpen,       openTickets,    'Sin tickets en cola');
        setColumnContent(colInProgress, inProgTickets,  'Sin tickets en progreso');
        setColumnContent(colWaiting,    waitingTickets, 'Sin tickets esperando');
        setColumnContent(colResolved,   resolvedTickets,'Sin resueltos recientes');

        countOpen.textContent    = openTickets.length;
        countInProg.textContent  = inProgTickets.length;
        countWaiting.textContent = waitingTickets.length;
        countResolved.textContent= resolvedTickets.length;

        statTotal.textContent    = allTickets.length;
        statOpen.textContent     = allTickets.filter(t => t.status === 'open').length;
        statInProg.textContent   = inProgTickets.length;
        statWaiting.textContent  = waitingTickets.length;
        statResolved.textContent = allTickets.filter(t => t.status === 'resolved').length;

        lastUpdateEl.textContent = `Actualizado: ${new Date().toLocaleTimeString('es-MX')}`;
    }

    // ── ABRIR DETALLE ─────────────────────────────────────────────────────
    async function openDetail(ticketId) {
        activeTicketId = ticketId;

        document.querySelectorAll('.ticket-mini').forEach(c => c.classList.remove('active'));
        document.querySelectorAll(`.ticket-mini`).forEach(c => {
            if (c.querySelector('.ticket-mini-subject')) {
                const t = allTickets.find(tk => tk.id === ticketId);
                if (t && c.closest('.column-body')) {
                    const found = allTickets.find(tk => c.textContent.includes(tk.subject.slice(0, 20)));
                    if (found && found.id === ticketId) c.classList.add('active');
                }
            }
        });

        detailEmpty.classList.add('hidden');
        detailContent.classList.remove('detail-content-hidden');
        dSubject.textContent        = 'Cargando...';
        dMessages.innerHTML         = '<div class="loading"><i class="fas fa-spinner fa-spin"></i></div>';
        dEvents.innerHTML           = '';

        const res = await getSupportTicketDetail(userId, ticketId);

        if (!res.success) {
            alertaError(res.message || 'Error al cargar detalle.');
            return;
        }

        const { ticket, messages, events } = res.data;
        activeTicketData = ticket;

        dSubject.textContent   = ticket.subject;
        dUserName.textContent  = ticket.ticket_user?.nombre  || '—';
        dUserEmail.textContent = ticket.ticket_user?.email   || '—';

        dMetaRow.innerHTML = `
            ${badgeStatus(ticket.status)}
            ${badgePriority(ticket.priority)}
            <span class="badge meta-badge-type">${TYPE_LABELS[ticket.type] || ticket.type}</span>
            <span class="meta-date">${formatDate(ticket.created_at)}</span>`;

        renderMessages(messages);
        renderEvents(events);

        btnTake.disabled = !!(ticket.assigned_to && ticket.assigned_to !== userId) || ticket.status === 'closed';
        statusSelect.value = '';
    }

    function renderMessages(messages) {
        dMessages.innerHTML = '';
        if (!messages || messages.length === 0) {
            dMessages.innerHTML = '<div class="messages-empty">Sin mensajes</div>';
            return;
        }
        messages.forEach(msg => {
            const bubble = document.createElement('div');
            bubble.className = `msg-bubble from-${msg.sender_role}`;
            if (msg.is_internal) bubble.classList.add('internal-note');

            const senderName = msg.sender?.nombre || msg.sender_role;
            const internalTag = msg.is_internal ? '<span class="internal-label">INTERNO</span>' : '';

            bubble.innerHTML = `
                <div>${internalTag}${escapeHtml(msg.message)}</div>
                <div class="msg-meta">${escapeHtml(senderName)} · ${formatDate(msg.created_at)}</div>`;

            dMessages.appendChild(bubble);
        });
        dMessages.scrollTop = dMessages.scrollHeight;
    }

    function renderEvents(events) {
        dEvents.innerHTML = '';
        if (!events || events.length === 0) {
            dEvents.innerHTML = '<div class="event-item event-empty">Sin eventos</div>';
            return;
        }
        events.slice(-8).forEach(ev => {
            const item = document.createElement('div');
            item.className = 'event-item';

            const actor = ev.actor?.nombre || 'Sistema';
            const desc  = describeEvent(ev);

            item.innerHTML = `
                <span class="event-actor-icon"><i class="fas fa-dot-circle event-actor-dot"></i></span>
                <span>${escapeHtml(actor)}: ${desc}</span>
                <span class="event-item-date">${formatDate(ev.created_at)}</span>`;

            dEvents.appendChild(item);
        });
    }

    function describeEvent(ev) {
        switch (ev.type) {
            case 'created':       return 'Creó el ticket';
            case 'status_changed': return `Cambió estado: ${STATUS_LABELS[ev.data?.from] || ev.data?.from} → ${STATUS_LABELS[ev.data?.to] || ev.data?.to}`;
            case 'priority_changed': return `Cambió prioridad: ${ev.data?.from} → ${ev.data?.to}`;
            case 'assigned':      return 'Tomó el ticket';
            case 'message_sent':  return ev.data?.is_internal ? 'Agregó nota interna' : 'Envió mensaje';
            case 'closed':        return 'Cerró el ticket';
            case 'reopened':      return 'Reabrió el ticket';
            default:              return ev.type;
        }
    }

    // ── ACCIONES ──────────────────────────────────────────────────────────
    btnTake.addEventListener('click', async () => {
        if (!activeTicketId) return;
        btnTake.disabled = true;

        const res = await takeTicket(userId, activeTicketId);
        if (!res.success) {
            alertaError(res.message || 'Error al tomar el ticket.');
            btnTake.disabled = false;
            return;
        }
        alertaExito('¡Ticket asignado! Ahora es tuyo.');
        await loadBoard();
        await openDetail(activeTicketId);
    });

    btnApply.addEventListener('click', async () => {
        if (!activeTicketId || !statusSelect.value) return;

        const res = await changeTicketStatus(userId, activeTicketId, statusSelect.value);
        if (!res.success) {
            return alertaError(res.message || 'Error al cambiar estado.');
        }
        alertaExito('Estado actualizado.');
        statusSelect.value = '';
        await loadBoard();
        await openDetail(activeTicketId);
    });

    btnSend.addEventListener('click', async () => {
        const message = replyTextarea.value.trim();
        if (!message) return alertaError('Escribe un mensaje antes de enviar.');
        if (!activeTicketId) return;

        btnSend.disabled = true;

        const res = await replyAsSupport(userId, activeTicketId, message, isInternalMode);

        btnSend.disabled = false;

        if (!res.success) {
            return alertaError(res.message || 'Error al enviar.');
        }

        replyTextarea.value = '';
        alertaExito(isInternalMode ? 'Nota interna guardada.' : 'Respuesta enviada.');
        await loadBoard();
        await openDetail(activeTicketId);
    });

    btnCloseDetail.addEventListener('click', () => {
        detailEmpty.classList.remove('hidden');
        detailContent.classList.add('detail-content-hidden');
        activeTicketId   = null;
        activeTicketData = null;
        document.querySelectorAll('.ticket-mini').forEach(c => c.classList.remove('active'));
    });

    // ── TABS REPLY / NOTE ─────────────────────────────────────────────────
    tabReply.addEventListener('click', () => {
        isInternalMode = false;
        tabReply.classList.add('active');
        tabNote.classList.remove('active');
        replyTextarea.placeholder = 'Escribe tu respuesta al usuario...';
    });

    tabNote.addEventListener('click', () => {
        isInternalMode = true;
        tabNote.classList.add('active');
        tabReply.classList.remove('active');
        replyTextarea.placeholder = 'Nota interna (solo visible para soporte)...';
    });

    // ── POLLING ───────────────────────────────────────────────────────────
    function startPolling() {
        pollingInterval = setInterval(async () => {
            await loadBoard();
            if (activeTicketId) await openDetail(activeTicketId);
        }, 30000);
    }

    btnRefresh.addEventListener('click', async () => {
        await loadBoard();
        if (activeTicketId) await openDetail(activeTicketId);
    });

    // ── MACROS ────────────────────────────────────────────────────────────
    async function loadMacros() {
        try {
            const data = await getMacros(userId);
            if (!data.success || !data.data?.length) return;
            const panel = document.createElement('div');
            panel.id = 'macros-panel';
            panel.className = 'macros-list';
            data.data.forEach(m => {
                const btn = document.createElement('button');
                btn.className  = 'macro-item';
                btn.type       = 'button';
                btn.textContent = m.title;
                btn.title       = m.body;
                btn.addEventListener('click', () => { if (replyTextarea) replyTextarea.value = m.body; });
                panel.appendChild(btn);
            });
            const replyDiv = replyTextarea?.closest('.detail-reply');
            if (replyDiv) replyDiv.insertBefore(panel, replyDiv.firstChild);
        } catch { /* silencioso — macros son opcionales */ }
    }

    // ── INIT ──────────────────────────────────────────────────────────────
    await loadBoard();
    await loadMacros();
    startPolling();
});
