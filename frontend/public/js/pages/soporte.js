// frontend/public/js/pages/soporte.js
import { protectRoute, getAuthData } from '../modules/auth.js';
import { alertaExito, alertaError } from '../modules/alerts.js';
import {
    createTicket,
    getMyTickets,
    getMyTicketDetail,
    replyToMyTicket,
    closeMyTicket
} from '../modules/api.js';

document.addEventListener('DOMContentLoaded', async () => {

    if (!protectRoute()) return;

    const sessionUser = getAuthData();
    const userId      = sessionUser.id;

    // ── DOM refs ────────────────────────────────────────────────────────────
    const ticketForm       = document.getElementById('ticket-form');
    const btnCreate        = document.getElementById('btn-create-ticket');
    const ticketsContainer = document.getElementById('tickets-container');
    const ticketsLoading   = document.getElementById('tickets-loading');
    const btnRefresh       = document.getElementById('btn-refresh-tickets');

    const detailCard       = document.getElementById('ticket-detail-card');
    const detailTitle      = document.getElementById('detail-title');
    const detailStatusBadge= document.getElementById('detail-status-badge');
    const detailSubject    = document.getElementById('detail-subject');
    const detailDesc       = document.getElementById('detail-description');
    const detailMeta       = document.getElementById('detail-meta');
    const messagesThread   = document.getElementById('messages-thread');
    const replySection     = document.getElementById('reply-section');
    const replyInput       = document.getElementById('reply-input');
    const btnSendReply     = document.getElementById('btn-send-reply');
    const btnCloseTicket   = document.getElementById('btn-close-ticket');
    const btnCloseDetail   = document.getElementById('btn-close-detail');

    let activeTicketId = null;

    // ── STATUS / PRIORITY HELPERS ─────────────────────────────────────────
    const STATUS_LABELS = {
        open:         'Abierto',
        in_progress:  'En progreso',
        waiting_user: 'Esperando respuesta',
        resolved:     'Resuelto',
        closed:       'Cerrado'
    };

    const PRIORITY_LABELS = {
        low:    'Baja',
        medium: 'Media',
        high:   'Alta',
        urgent: 'Urgente'
    };

    const TYPE_LABELS = {
        bug:        'Error / Bug',
        duda:       'Duda',
        sugerencia: 'Sugerencia',
        otro:       'Otro'
    };

    function badgeStatus(status) {
        return `<span class="badge badge-${status}">${STATUS_LABELS[status] || status}</span>`;
    }

    function badgePriority(priority) {
        return `<span class="badge badge-${priority}">${PRIORITY_LABELS[priority] || priority}</span>`;
    }

    function formatDate(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('es-MX', {
            day:    '2-digit',
            month:  'short',
            year:   'numeric',
            hour:   '2-digit',
            minute: '2-digit'
        });
    }

    // ── CREAR TICKET ──────────────────────────────────────────────────────
    ticketForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const subject     = document.getElementById('ticket-subject').value.trim();
        const description = document.getElementById('ticket-description').value.trim();
        const type        = document.getElementById('ticket-type').value;
        const priority    = document.getElementById('ticket-priority').value;

        if (subject.length < 5) {
            return alertaError('El asunto debe tener al menos 5 caracteres.');
        }
        if (description.length < 10) {
            return alertaError('La descripción debe tener al menos 10 caracteres.');
        }

        btnCreate.disabled = true;
        btnCreate.textContent = 'Enviando...';

        const res = await createTicket({ userId, subject, description, type, priority });

        btnCreate.disabled = false;
        btnCreate.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Ticket';

        if (!res.success) {
            return alertaError(res.message || 'Error al crear el ticket.');
        }

        alertaExito('¡Ticket creado! Nuestro equipo te responderá pronto.');
        ticketForm.reset();
        await loadMyTickets();
    });

    // ── CARGAR TICKETS ────────────────────────────────────────────────────
    async function loadMyTickets() {
        ticketsLoading.style.display = 'block';
        ticketsContainer.innerHTML   = '';

        const res = await getMyTickets(userId);

        ticketsLoading.style.display = 'none';

        if (!res.success) {
            ticketsContainer.innerHTML = '<div class="tickets-empty"><p>Error al cargar tickets.</p></div>';
            return;
        }

        if (!res.data || res.data.length === 0) {
            ticketsContainer.innerHTML = `
                <div class="tickets-empty">
                    <i class="fas fa-ticket-alt"></i>
                    <p>Aún no tienes tickets. ¡Crea uno si necesitas ayuda!</p>
                </div>`;
            return;
        }

        res.data.forEach(ticket => {
            const card = document.createElement('div');
            card.className = 'ticket-card';
            if (ticket.id === activeTicketId) card.classList.add('selected');

            card.innerHTML = `
                <div class="ticket-card-top">
                    <div class="ticket-card-subject">${escapeHtml(ticket.subject)}</div>
                </div>
                <div class="ticket-card-meta">
                    ${badgeStatus(ticket.status)}
                    ${badgePriority(ticket.priority)}
                    <span class="badge" style="background:#f0f0f0;color:#555">${TYPE_LABELS[ticket.type] || ticket.type}</span>
                </div>
                <div class="ticket-card-date">
                    <i class="fas fa-calendar-alt"></i> ${formatDate(ticket.created_at)}
                </div>`;

            card.addEventListener('click', () => openTicketDetail(ticket.id, card));
            ticketsContainer.appendChild(card);
        });
    }

    // ── DETALLE DEL TICKET ────────────────────────────────────────────────
    async function openTicketDetail(ticketId, cardEl) {
        activeTicketId = ticketId;

        document.querySelectorAll('.ticket-card').forEach(c => c.classList.remove('selected'));
        if (cardEl) cardEl.classList.add('selected');

        detailCard.classList.add('visible');
        messagesThread.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';
        detailTitle.textContent  = 'Cargando...';

        const res = await getMyTicketDetail(userId, ticketId);

        if (!res.success) {
            alertaError(res.message || 'No se pudo cargar el ticket.');
            return;
        }

        const { ticket, messages } = res.data;

        detailTitle.textContent      = `#${ticket.id.slice(0, 8)}`;
        detailStatusBadge.innerHTML  = badgeStatus(ticket.status);
        detailSubject.textContent    = ticket.subject;
        detailDesc.textContent       = ticket.description;

        detailMeta.innerHTML = `
            ${badgePriority(ticket.priority)}
            ${badgeStatus(ticket.status)}
            <span class="badge" style="background:#f0f0f0;color:#555">${TYPE_LABELS[ticket.type] || ticket.type}</span>
            <span style="font-size:0.8rem;color:#718096;margin-left:auto">Creado: ${formatDate(ticket.created_at)}</span>`;

        renderMessages(messages);

        const isClosed = ticket.status === 'closed';
        replySection.style.display  = isClosed ? 'none' : 'flex';
        btnCloseTicket.style.display = (isClosed || ticket.status === 'resolved') ? 'none' : 'block';

        replyInput.value = '';
    }

    function renderMessages(messages) {
        messagesThread.innerHTML = '';

        if (!messages || messages.length === 0) {
            messagesThread.innerHTML = '<div class="messages-empty">Sin mensajes aún. Sé el primero en escribir.</div>';
            return;
        }

        messages.forEach(msg => {
            const bubble = document.createElement('div');
            const role   = msg.sender_role;
            bubble.className = `message-bubble from-${role}`;

            const senderLabel = role === 'user' ? 'Tú' : 'Soporte';

            bubble.innerHTML = `
                <div>${escapeHtml(msg.message)}</div>
                <div class="message-meta">${senderLabel} · ${formatDate(msg.created_at)}</div>`;

            messagesThread.appendChild(bubble);
        });

        messagesThread.scrollTop = messagesThread.scrollHeight;
    }

    // ── CERRAR DETALLE ────────────────────────────────────────────────────
    btnCloseDetail.addEventListener('click', () => {
        detailCard.classList.remove('visible');
        document.querySelectorAll('.ticket-card').forEach(c => c.classList.remove('selected'));
        activeTicketId = null;
    });

    // ── ENVIAR RESPUESTA ──────────────────────────────────────────────────
    btnSendReply.addEventListener('click', async () => {
        const message = replyInput.value.trim();
        if (!message) return alertaError('Escribe un mensaje antes de enviar.');
        if (!activeTicketId) return;

        btnSendReply.disabled    = true;
        btnSendReply.textContent = 'Enviando...';

        const res = await replyToMyTicket(userId, activeTicketId, message);

        btnSendReply.disabled     = false;
        btnSendReply.innerHTML    = '<i class="fas fa-paper-plane"></i> Enviar';

        if (!res.success) {
            return alertaError(res.message || 'Error al enviar respuesta.');
        }

        replyInput.value = '';
        alertaExito('Respuesta enviada.');
        await openTicketDetail(activeTicketId, null);
    });

    // ── CERRAR TICKET ─────────────────────────────────────────────────────
    btnCloseTicket.addEventListener('click', async () => {
        if (!activeTicketId) return;
        if (!confirm('¿Seguro que quieres cerrar este ticket?')) return;

        const res = await closeMyTicket(userId, activeTicketId);

        if (!res.success) {
            return alertaError(res.message || 'Error al cerrar el ticket.');
        }

        alertaExito('Ticket cerrado.');
        await loadMyTickets();
        await openTicketDetail(activeTicketId, null);
    });

    // ── REFRESH ───────────────────────────────────────────────────────────
    btnRefresh.addEventListener('click', () => loadMyTickets());

    // ── HELPERS ───────────────────────────────────────────────────────────
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ── INIT ──────────────────────────────────────────────────────────────
    await loadMyTickets();
});
