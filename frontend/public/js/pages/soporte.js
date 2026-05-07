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
    const detailImageSection = document.getElementById('detail-image-section');
    const detailImage      = document.getElementById('detail-image');
    const detailImageLink  = document.getElementById('detail-image-link');
    const detailMeta       = document.getElementById('detail-meta');
    const messagesThread   = document.getElementById('messages-thread');
    const replySection     = document.getElementById('reply-section');
    const replyInput       = document.getElementById('reply-input');
    const btnSendReply     = document.getElementById('btn-send-reply');
    const btnCloseTicket   = document.getElementById('btn-close-ticket');
    const btnCloseDetail   = document.getElementById('btn-close-detail');

    // ── Image upload DOM refs ────────────────────────────────────────────────
    const imageInput       = document.getElementById('ticket-image');
    const imagePreviewWrap = document.getElementById('image-preview-wrap');
    const imagePreviewEl   = document.getElementById('image-preview');
    const btnRemoveImage   = document.getElementById('btn-remove-image');

    let activeTicketId = null;
    let selectedRating = 0;

    // ── LABELS ────────────────────────────────────────────────────────────────
    const STATUS_LABELS = {
        open:         'Abierto',
        in_progress:  'En progreso',
        waiting_user: 'Esperando respuesta',
        resolved:     'Resuelto',
        closed:       'Cerrado'
    };

    const PRIORITY_LABELS = {
        low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente'
    };

    const TYPE_LABELS = {
        bug: 'Error / Bug', duda: 'Duda', sugerencia: 'Sugerencia', otro: 'Otro'
    };

    const MODULE_LABELS = {
        dashboard: 'Dashboard', inversiones: 'Inversiones', lecciones: 'Lecciones',
        retos: 'Retos', perfil: 'Perfil', soporte: 'Soporte', general: 'General'
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
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    // ── IMAGE UPLOAD PREVIEW ─────────────────────────────────────────────────
    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (!file) {
            imagePreviewWrap.hidden = true;
            return;
        }
        const allowedMimes = ['image/png', 'image/jpeg', 'image/webp'];
        if (!allowedMimes.includes(file.type)) {
            alertaError('Formato no válido. Usa PNG, JPG o WEBP.');
            imageInput.value = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alertaError('La imagen no debe superar 5 MB.');
            imageInput.value = '';
            return;
        }
        const url = URL.createObjectURL(file);
        imagePreviewEl.src     = url;
        imagePreviewWrap.hidden = false;
    });

    btnRemoveImage.addEventListener('click', () => {
        imageInput.value        = '';
        imagePreviewWrap.hidden = true;
        imagePreviewEl.src      = '';
    });

    // ── CREAR TICKET ─────────────────────────────────────────────────────────
    ticketForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const subject     = document.getElementById('ticket-subject').value.trim();
        const description = document.getElementById('ticket-description').value.trim();
        const type        = document.getElementById('ticket-type').value;
        const module      = document.getElementById('ticket-module').value;
        const imageFile   = imageInput.files[0];

        if (subject.length < 5) {
            return alertaError('El asunto debe tener al menos 5 caracteres.');
        }
        if (description.length < 10) {
            return alertaError('La descripción debe tener al menos 10 caracteres.');
        }

        const fd = new FormData();
        fd.append('userId',      userId);
        fd.append('subject',     subject);
        fd.append('description', description);
        fd.append('type',        type);
        fd.append('module',      module);
        if (imageFile) fd.append('image', imageFile);

        btnCreate.disabled = true;
        btnCreate.textContent = 'Enviando...';

        const res = await createTicket(fd);

        btnCreate.disabled = false;
        btnCreate.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Ticket';

        if (!res.success) {
            return alertaError(res.message || 'Error al crear el ticket.');
        }

        alertaExito('¡Ticket creado! Nuestro equipo te responderá pronto.');
        ticketForm.reset();
        imagePreviewWrap.hidden = true;
        imagePreviewEl.src = '';
        await loadMyTickets();
    });

    // ── CARGAR TICKETS ────────────────────────────────────────────────────────
    async function loadMyTickets() {
        ticketsLoading.classList.add('visible');
        ticketsContainer.innerHTML = '';

        const res = await getMyTickets(userId);

        ticketsLoading.classList.remove('visible');

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
                    <span class="badge badge-type">${TYPE_LABELS[ticket.type] || ticket.type}</span>
                    ${ticket.module ? `<span class="badge badge-module">${MODULE_LABELS[ticket.module] || ticket.module}</span>` : ''}
                </div>
                <div class="ticket-card-date">
                    <i class="fas fa-calendar-alt"></i> ${formatDate(ticket.created_at)}
                </div>`;

            card.addEventListener('click', () => openTicketDetail(ticket.id, card));
            ticketsContainer.appendChild(card);
        });
    }

    // ── DETALLE DEL TICKET ────────────────────────────────────────────────────
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

        detailTitle.textContent     = `#${ticket.id.slice(0, 8)}`;
        detailStatusBadge.innerHTML = badgeStatus(ticket.status);
        detailSubject.textContent   = ticket.subject;
        detailDesc.textContent      = ticket.description;

        // Imagen adjunta
        if (ticket.image_url) {
            detailImage.src           = ticket.image_url;
            detailImageLink.href      = ticket.image_url;
            detailImageSection.hidden = false;
        } else {
            detailImageSection.hidden = true;
        }

        detailMeta.innerHTML = `
            ${badgePriority(ticket.priority)}
            ${badgeStatus(ticket.status)}
            <span class="badge badge-type">${TYPE_LABELS[ticket.type] || ticket.type}</span>
            ${ticket.module ? `<span class="badge badge-module">${MODULE_LABELS[ticket.module] || ticket.module}</span>` : ''}
            <span class="ticket-date-meta">Creado: ${formatDate(ticket.created_at)}</span>`;

        renderMessages(messages);

        const isClosed   = ticket.status === 'closed';
        const isResolved = ticket.status === 'resolved';

        replySection.hidden   = isClosed;
        btnCloseTicket.hidden = isClosed || isResolved;

        const csatSection = document.getElementById('csat-section');
        if (csatSection) {
            csatSection.hidden = !(isClosed || isResolved);
            selectedRating = 0;
            document.querySelectorAll('.star-btn').forEach(s => s.classList.remove('active'));
            const csatComment = document.getElementById('csat-comment');
            if (csatComment) csatComment.value = '';
        }

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

    // ── CERRAR DETALLE ────────────────────────────────────────────────────────
    btnCloseDetail.addEventListener('click', () => {
        detailCard.classList.remove('visible');
        document.querySelectorAll('.ticket-card').forEach(c => c.classList.remove('selected'));
        activeTicketId = null;
    });

    // ── ENVIAR RESPUESTA ──────────────────────────────────────────────────────
    btnSendReply.addEventListener('click', async () => {
        const message = replyInput.value.trim();
        if (!message) return alertaError('Escribe un mensaje antes de enviar.');
        if (!activeTicketId) return;

        btnSendReply.disabled    = true;
        btnSendReply.textContent = 'Enviando...';

        const res = await replyToMyTicket(userId, activeTicketId, message);

        btnSendReply.disabled  = false;
        btnSendReply.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar';

        if (!res.success) {
            return alertaError(res.message || 'Error al enviar respuesta.');
        }

        replyInput.value = '';
        alertaExito('Respuesta enviada.');
        await openTicketDetail(activeTicketId, null);
    });

    // ── CERRAR TICKET ─────────────────────────────────────────────────────────
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

    // ── REFRESH ───────────────────────────────────────────────────────────────
    btnRefresh.addEventListener('click', () => loadMyTickets());

    // ── HELPERS ───────────────────────────────────────────────────────────────
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ── CSAT ──────────────────────────────────────────────────────────────────
    const csatStars   = document.getElementById('csat-stars');
    const btnSendCsat = document.getElementById('btn-send-csat');

    if (csatStars) {
        csatStars.addEventListener('click', (e) => {
            const btn = e.target.closest('.star-btn');
            if (!btn) return;
            selectedRating = parseInt(btn.dataset.rating, 10);
            document.querySelectorAll('.star-btn').forEach((s, i) => {
                s.classList.toggle('active', i < selectedRating);
            });
        });
    }

    if (btnSendCsat) {
        btnSendCsat.addEventListener('click', async () => {
            if (!selectedRating || !activeTicketId) return alertaError('Selecciona una calificación.');
            const comment = (document.getElementById('csat-comment')?.value || '').trim();
            btnSendCsat.disabled = true;
            try {
                const res = await fetch(`/api/tickets/my/${activeTicketId}/csat`, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ userId, rating: selectedRating, comment })
                });
                const data = await res.json();
                if (data.success) {
                    alertaExito('¡Gracias por tu calificación!');
                    document.getElementById('csat-section').hidden = true;
                } else {
                    alertaError(data.message || 'Error al enviar calificación.');
                }
            } catch {
                alertaError('Error de conexión al enviar calificación.');
            } finally {
                btnSendCsat.disabled = false;
            }
        });
    }

    // ── FAQ ACCORDION ─────────────────────────────────────────────────────────
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        item.addEventListener('toggle', () => {
            if (item.open) {
                faqItems.forEach(other => { if (other !== item) other.open = false; });
            }
        });
    });

    // ── INIT ──────────────────────────────────────────────────────────────────
    await loadMyTickets();
});
