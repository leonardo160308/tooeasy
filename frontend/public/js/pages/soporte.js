// frontend/public/js/pages/soporte.js
import { protectRoute, getAuthData } from '../modules/auth.js';
import { alertaExito, alertaError } from '../modules/alerts.js';
import { initOfflineBanner } from '../modules/offline.js';
import {
    createTicket,
    getMyTickets,
    getMyTicketDetail,
    replyToMyTicket,
    closeMyTicket,
    deleteMyTicket,
    trackFaqClick
} from '../modules/api.js';

// ── IMAGE MODAL (SweetAlert2-style) ─────────────────────────────────────────
function openImageModal(src) {
    const overlay = document.createElement('div');
    overlay.className = 'img-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Vista previa de imagen');

    const box = document.createElement('div');
    box.className = 'img-modal-box';
    box.addEventListener('click', (e) => e.stopPropagation());

    const closeBtn = document.createElement('button');
    closeBtn.className = 'img-modal-close';
    closeBtn.setAttribute('aria-label', 'Cerrar imagen');
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';

    const img = document.createElement('img');
    img.className = 'img-modal-img';
    img.alt = 'Imagen adjunta del ticket';

    img.onerror = () => {
        box.innerHTML = '';
        box.appendChild(closeBtn);
        const errDiv = document.createElement('div');
        errDiv.className = 'img-modal-error';
        errDiv.innerHTML = '<i class="fas fa-image"></i><p>Imagen no disponible</p>';
        box.appendChild(errDiv);
    };

    img.src = src;
    box.appendChild(closeBtn);
    box.appendChild(img);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    function closeModal() {
        overlay.classList.add('img-modal-closing');
        setTimeout(() => {
            overlay.remove();
            document.body.style.overflow = '';
        }, 180);
    }

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    document.addEventListener('keydown', function onKeyDown(e) {
        if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onKeyDown); }
    });
}

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
    const btnDeleteTicket  = document.getElementById('btn-delete-ticket');
    const btnCloseDetail   = document.getElementById('btn-close-detail');

    // ── Image upload DOM refs ────────────────────────────────────────────────
    const imageInput       = document.getElementById('ticket-image');
    const imagePreviewWrap = document.getElementById('image-preview-wrap');
    const imagePreviewEl   = document.getElementById('image-preview');
    const btnRemoveImage   = document.getElementById('btn-remove-image');

    let activeTicketId  = null;
    let selectedRating  = 0;
    let ratingForTicket = null;

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
        dashboard:        'Dashboard',
        inversiones:      'Inversiones',
        lecciones:        'Lecciones',
        retos:            'Retos',
        perfil:           'Perfil',
        inicio_sesion:    'Inicio de sesión',
        registro:         'Registro de usuario',
        recuperar_cuenta: 'Recuperar cuenta',
        verificar_email:  'Verificar email',
        otro:             'Otro'
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
            imagePreviewWrap.classList.remove('show');
            imagePreviewEl.src = '';
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
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreviewEl.src = e.target.result;
            imagePreviewWrap.classList.add('show');
        };
        reader.readAsDataURL(file);
    });

    btnRemoveImage.addEventListener('click', () => {
        imageInput.value = '';
        imagePreviewEl.src = '';
        imagePreviewWrap.classList.remove('show');
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

        const res = await createTicket(fd, userId);

        btnCreate.disabled = false;
        btnCreate.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Ticket';

        if (!res.success) {
            return alertaError(res.message || 'Error al crear el ticket.');
        }

        alertaExito('¡Ticket creado! Nuestro equipo te responderá pronto.');
        ticketForm.reset();
        imagePreviewEl.src = '';
        imagePreviewWrap.classList.remove('show');
        await Promise.all([loadMyTickets(), loadTicketQuota()]);
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

        const { ticket, messages, csat } = res.data;

        detailTitle.textContent     = `#${ticket.id.slice(0, 8)}`;
        detailStatusBadge.innerHTML = badgeStatus(ticket.status);
        detailSubject.textContent   = ticket.subject;
        detailDesc.textContent      = ticket.description;

        // Imagen adjunta
        const oldFallback = detailImageSection.querySelector('.ticket-img-error');
        if (oldFallback) oldFallback.remove();
        detailImage.style.display = '';
        if (detailImageLink) detailImageLink.style.display = '';

        if (ticket.image_url) {
            const proxiedUrl          = getProxiedImageUrl(ticket.image_url);
            detailImage.src           = proxiedUrl;
            detailImageLink.href      = proxiedUrl;
            detailImageSection.hidden = false;
            detailImage.onerror       = () => {
                console.warn('[Soporte] No se pudo cargar la imagen del ticket:', proxiedUrl);
                detailImage.style.display = 'none';
                if (detailImageLink) detailImageLink.style.display = 'none';
                if (!detailImageSection.querySelector('.ticket-img-error')) {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'ticket-img-error';
                    placeholder.innerHTML = '<i class="fas fa-image"></i> Imagen no disponible';
                    detailImageSection.appendChild(placeholder);
                }
            };
            detailImage.onclick = (e) => {
                e.preventDefault();
                openImageModal(proxiedUrl);
            };
            if (detailImageLink) detailImageLink.onclick = (e) => {
                e.preventDefault();
                openImageModal(proxiedUrl);
            };
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
            const willShow = isClosed || isResolved;
            csatSection.hidden = !willShow;
            if (ticketId !== ratingForTicket) {
                selectedRating  = 0;
                ratingForTicket = ticketId;
                document.querySelectorAll('.star-btn').forEach(s => s.classList.remove('active'));
                const csatComment = document.getElementById('csat-comment');
                if (csatComment) csatComment.value = '';
            }
            if (willShow) renderCsatState(csat);
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
    replyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (!btnSendReply.disabled) btnSendReply.click();
        }
    });

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

    // ── ELIMINAR TICKET ───────────────────────────────────────────────────────
    btnDeleteTicket.addEventListener('click', async () => {
        if (!activeTicketId) return;
        if (!confirm('¿Seguro que quieres eliminar este ticket? Esta acción es irreversible.')) return;

        btnDeleteTicket.disabled = true;

        const res = await deleteMyTicket(userId, activeTicketId);

        btnDeleteTicket.disabled = false;

        if (!res.success) {
            return alertaError(res.message || 'Error al eliminar el ticket.');
        }

        alertaExito('Ticket eliminado.');
        detailCard.classList.remove('visible');
        document.querySelectorAll('.ticket-card').forEach(c => c.classList.remove('selected'));
        activeTicketId = null;
        await loadMyTickets();
    });

    // ── REFRESH ───────────────────────────────────────────────────────────────
    btnRefresh.addEventListener('click', () => loadMyTickets());

    // ── HELPERS ───────────────────────────────────────────────────────────────
    // Normaliza cualquier URL de imagen de ticket al endpoint proxy del backend.
    // Maneja: nuevas URLs (/api/tickets/image/...), rutas locales antiguas (/public/img/tickets/...)
    // y URLs antiguas de Supabase Storage (https://xxx.supabase.co/storage/...).
    function getProxiedImageUrl(rawUrl) {
        if (!rawUrl) return null;
        if (rawUrl.startsWith('/api/tickets/image/')) return rawUrl;
        if (rawUrl.startsWith('/public/img/tickets/')) {
            return '/api/tickets/image/' + rawUrl.split('/').pop();
        }
        // URL absoluta de Supabase — extrae solo el filename
        try {
            const parsed   = new URL(rawUrl);
            const filename = parsed.pathname.split('/').pop();
            if (filename) return '/api/tickets/image/' + filename;
        } catch {}
        return rawUrl;
    }

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
    const csatStars        = document.getElementById('csat-stars');
    const btnSendCsat      = document.getElementById('btn-send-csat');
    const csatSubmittedView = document.getElementById('csat-submitted-view');
    const csatSubmittedStars = document.getElementById('csat-submitted-stars');
    const csatSubmittedComment = document.getElementById('csat-submitted-comment');

    function renderCsatState(csat) {
        const hasSubmitted = !!(csat && csat.rating);
        const commentEl   = document.getElementById('csat-comment');

        if (csatStars)          csatStars.hidden         = hasSubmitted;
        if (btnSendCsat)        btnSendCsat.hidden        = hasSubmitted;
        if (commentEl)          commentEl.hidden          = hasSubmitted;
        if (csatSubmittedView)  csatSubmittedView.hidden  = !hasSubmitted;

        if (hasSubmitted && csatSubmittedStars) {
            csatSubmittedStars.innerHTML = Array.from({ length: 5 }, (_, i) =>
                `<span class="star-static${i < csat.rating ? ' active' : ''}">★</span>`
            ).join('');
        }
        if (csatSubmittedComment) {
            csatSubmittedComment.textContent = hasSubmitted ? (csat.comment || '') : '';
            csatSubmittedComment.hidden = !hasSubmitted || !csat.comment;
        }

        if (!hasSubmitted) {
            if (csatStars)   csatStars.hidden   = false;
            if (btnSendCsat) btnSendCsat.hidden  = false;
            if (commentEl)   commentEl.hidden    = false;
        }
    }

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
                    renderCsatState({ rating: selectedRating, comment });
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

                const question = item.querySelector('.faq-question')?.textContent?.trim() || '';
                const faqKey = question.slice(0, 100).toLowerCase()
                    .replace(/[¿?¡!]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '')
                    .slice(0, 80);
                if (faqKey) trackFaqClick(userId, faqKey).catch(() => {});
            }
        });
    });

    // ── TICKET QUOTA ─────────────────────────────────────────────────────────
    async function loadTicketQuota() {
        const bar  = document.getElementById('ticket-quota-bar');
        const text = document.getElementById('ticket-quota-text');
        if (!bar || !text) return;

        try {
            const res = await fetch(`/api/tickets/quota?userId=${userId}`);
            const data = await res.json();
            if (!data.success) return;

            const { remaining, limit, used } = data.data;
            bar.hidden = false;

            if (limit === null) {
                bar.className = 'ticket-quota-bar quota-ok';
                text.textContent = 'Sin límite mensual de tickets';
                return;
            }

            if (remaining <= 0) {
                bar.className = 'ticket-quota-bar quota-exhausted';
                text.textContent = `Has alcanzado el límite mensual (${limit} tickets). Podrás crear uno nuevo el próximo mes.`;
                document.getElementById('btn-create-ticket').disabled = true;
                document.getElementById('btn-create-ticket').title = 'Límite mensual alcanzado';
            } else if (remaining <= 2) {
                bar.className = 'ticket-quota-bar quota-low';
                text.textContent = `Te ${remaining === 1 ? 'queda' : 'quedan'} ${remaining} ticket${remaining > 1 ? 's' : ''} este mes (${used}/${limit} usados).`;
            } else {
                bar.className = 'ticket-quota-bar quota-ok';
                text.textContent = `${remaining} ticket${remaining !== 1 ? 's' : ''} disponible${remaining !== 1 ? 's' : ''} este mes (${used}/${limit} usados).`;
            }
        } catch {
            // Silently ignore — quota display is optional
        }
    }

    // ── OFFLINE DETECTION ─────────────────────────────────────────────────────
    initOfflineBanner(() => Promise.all([loadMyTickets(), loadTicketQuota()]));

    // ── INIT ──────────────────────────────────────────────────────────────────
    await Promise.all([loadMyTickets(), loadTicketQuota()]);
});
