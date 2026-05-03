// backend/controllers/ticketController.js
import TicketModel from '../models/TicketModel.js';
import KbModel    from '../models/KbModel.js';
import User       from '../models/UserModel.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// userId en body para POST/PATCH, en query para GET
function extractUserId(req) {
    return req.query.userId || req.body?.userId;
}

// ── Middlewares ──────────────────────────────────────────────────────────────

export async function requireAuth(req, res, next) {
    try {
        const userId = extractUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
        }
        const user = await User.findById(userId);
        if (!user || !user.is_active) {
            return res.status(401).json({ success: false, message: 'Usuario no encontrado o inactivo' });
        }
        req.currentUser = user;
        next();
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error de autenticación' });
    }
}

export async function requireSupport(req, res, next) {
    try {
        const userId = extractUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
        }
        const user = await User.findById(userId);
        if (!user || (user.role !== 'support' && user.role !== 'admin')) {
            return res.status(403).json({ success: false, message: 'Acceso denegado. Solo equipo de soporte o administradores.' });
        }
        req.currentUser = user;
        next();
    } catch (error) {
        console.error('[requireSupport ERROR]', error);
        res.status(500).json({ success: false, message: 'Error de autenticación', debug_error: error?.message, debug_code: error?.code });
    }
}

// ── USUARIO ──────────────────────────────────────────────────────────────────

export async function createTicket(req, res) {
    try {
        const { userId, subject, description, type, priority } = req.body;

        if (!subject || subject.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'El asunto debe tener al menos 5 caracteres.' });
        }
        if (!description || description.trim().length < 10) {
            return res.status(400).json({ success: false, message: 'La descripción debe tener al menos 10 caracteres.' });
        }
        const validTypes = ['bug', 'duda', 'sugerencia', 'otro'];
        if (!type || !validTypes.includes(type)) {
            return res.status(400).json({ success: false, message: 'Tipo de ticket inválido.' });
        }
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        const finalPriority = validPriorities.includes(priority) ? priority : 'low';

        const ticket = await TicketModel.createTicket(userId, {
            subject:     subject.trim(),
            description: description.trim(),
            type,
            priority:    finalPriority
        });
        res.status(201).json({ success: true, data: ticket });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear ticket' });
    }
}

export async function getMyTickets(req, res) {
    try {
        const userId = req.currentUser.id;
        const tickets = await TicketModel.getTicketsByUser(userId);
        res.json({ success: true, data: tickets });
    } catch (error) {
        console.error('[getMyTickets ERROR]', error);
        res.status(500).json({ success: false, message: 'Error al obtener tickets', debug_error: error?.message, debug_code: error?.code });
    }
}

export async function getMyTicketDetail(req, res) {
    try {
        const userId   = req.currentUser.id;
        const { ticketId } = req.params;

        if (!UUID_RE.test(ticketId)) {
            return res.status(400).json({ success: false, message: 'ID de ticket inválido' });
        }

        const ticket = await TicketModel.getTicketById(ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
        if (ticket.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Acceso denegado' });
        }

        const messages = await TicketModel.getMessages(ticketId, 'user');
        res.json({ success: true, data: { ticket, messages } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener detalle del ticket' });
    }
}

export async function replyToTicket(req, res) {
    try {
        const userId = req.currentUser.id;
        const { ticketId } = req.params;
        const { message } = req.body;

        if (!UUID_RE.test(ticketId)) {
            return res.status(400).json({ success: false, message: 'ID de ticket inválido' });
        }
        if (!message || message.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'El mensaje debe tener al menos 2 caracteres.' });
        }

        const ticket = await TicketModel.getTicketById(ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
        if (ticket.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Acceso denegado' });
        }
        if (ticket.status === 'closed') {
            return res.status(400).json({ success: false, message: 'No puedes responder a un ticket cerrado.' });
        }

        const msg = await TicketModel.addMessage(ticketId, userId, 'user', message.trim(), false);

        if (ticket.status === 'waiting_user') {
            await TicketModel.updateTicketStatus(ticketId, 'in_progress', userId);
        }

        res.status(201).json({ success: true, data: msg });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al enviar respuesta' });
    }
}

export async function closeMyTicket(req, res) {
    try {
        const userId = req.currentUser.id;
        const { ticketId } = req.params;

        if (!UUID_RE.test(ticketId)) {
            return res.status(400).json({ success: false, message: 'ID de ticket inválido' });
        }

        const ticket = await TicketModel.getTicketById(ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
        if (ticket.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Acceso denegado' });
        }
        if (ticket.status === 'closed') {
            return res.status(400).json({ success: false, message: 'El ticket ya está cerrado.' });
        }

        const updated = await TicketModel.closeTicket(ticketId, userId);
        res.json({ success: true, data: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al cerrar ticket' });
    }
}

// ── SOPORTE ───────────────────────────────────────────────────────────────────

export async function getAllTickets(req, res) {
    try {
        const filters = {};
        if (req.query.status)      filters.status      = req.query.status;
        if (req.query.priority)    filters.priority    = req.query.priority;
        if (req.query.assigned_to) filters.assigned_to = req.query.assigned_to;

        const tickets = await TicketModel.getAllTickets(filters);
        res.json({ success: true, data: tickets });
    } catch (error) {
        console.error('[getAllTickets ERROR]', error);
        res.status(500).json({ success: false, message: 'Error al obtener tickets', debug_error: error?.message, debug_code: error?.code });
    }
}

export async function getTicketDetail(req, res) {
    try {
        const { ticketId } = req.params;

        if (!UUID_RE.test(ticketId)) {
            return res.status(400).json({ success: false, message: 'ID de ticket inválido' });
        }

        const ticket = await TicketModel.getTicketById(ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });

        const [messages, events] = await Promise.all([
            TicketModel.getMessages(ticketId, 'support'),
            TicketModel.getEvents(ticketId)
        ]);
        res.json({ success: true, data: { ticket, messages, events } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener detalle del ticket' });
    }
}

export async function takeTicket(req, res) {
    try {
        const userId   = req.currentUser.id;
        const { ticketId } = req.params;

        if (!UUID_RE.test(ticketId)) {
            return res.status(400).json({ success: false, message: 'ID de ticket inválido' });
        }

        const ticket = await TicketModel.getTicketById(ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
        if (ticket.assigned_to && ticket.assigned_to !== userId) {
            return res.status(409).json({ success: false, message: 'Este ticket ya está asignado a otro agente.' });
        }

        const updated = await TicketModel.assignTicket(ticketId, userId);
        res.json({ success: true, data: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al tomar ticket' });
    }
}

export async function changeTicketStatus(req, res) {
    try {
        const userId = req.currentUser.id;
        const { ticketId } = req.params;
        const { status } = req.body;

        if (!UUID_RE.test(ticketId)) {
            return res.status(400).json({ success: false, message: 'ID de ticket inválido' });
        }

        const validStatuses = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Estado inválido.' });
        }

        const ticket = await TicketModel.getTicketById(ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });

        const updated = await TicketModel.updateTicketStatus(ticketId, status, userId);
        res.json({ success: true, data: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al cambiar estado' });
    }
}

export async function replyAsSupport(req, res) {
    try {
        const userId = req.currentUser.id;
        const { ticketId } = req.params;
        const { message } = req.body;

        if (!UUID_RE.test(ticketId)) {
            return res.status(400).json({ success: false, message: 'ID de ticket inválido' });
        }
        if (!message || message.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'El mensaje debe tener al menos 2 caracteres.' });
        }

        const ticket = await TicketModel.getTicketById(ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
        if (ticket.status === 'closed') {
            return res.status(400).json({ success: false, message: 'No se puede responder a un ticket cerrado.' });
        }

        const senderRole = req.currentUser.role;
        const msg = await TicketModel.addMessage(ticketId, userId, senderRole, message.trim(), false);

        if (ticket.status === 'open' || ticket.status === 'in_progress') {
            await TicketModel.updateTicketStatus(ticketId, 'waiting_user', userId);
        }

        res.status(201).json({ success: true, data: msg });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al enviar respuesta' });
    }
}

export async function addInternalNote(req, res) {
    try {
        const userId = req.currentUser.id;
        const { ticketId } = req.params;
        const { message } = req.body;

        if (!UUID_RE.test(ticketId)) {
            return res.status(400).json({ success: false, message: 'ID de ticket inválido' });
        }
        if (!message || message.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'La nota debe tener al menos 2 caracteres.' });
        }

        const ticket = await TicketModel.getTicketById(ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });

        const senderRole = req.currentUser.role;
        const note = await TicketModel.addMessage(ticketId, userId, senderRole, message.trim(), true);
        res.status(201).json({ success: true, data: note });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al agregar nota interna' });
    }
}

// ── CSAT ──────────────────────────────────────────────────────────────────────

export async function submitCsat(req, res) {
    try {
        const userId      = req.currentUser.id;
        const { ticketId } = req.params;
        const { rating, comment } = req.body;

        if (!UUID_RE.test(ticketId)) {
            return res.status(400).json({ success: false, message: 'ID de ticket inválido' });
        }
        const r = parseInt(rating, 10);
        if (!r || r < 1 || r > 5) {
            return res.status(400).json({ success: false, message: 'Rating debe ser entre 1 y 5.' });
        }

        const ticket = await TicketModel.getTicketById(ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
        if (ticket.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Acceso denegado' });
        }
        if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
            return res.status(400).json({ success: false, message: 'Solo puedes calificar tickets resueltos o cerrados.' });
        }

        const csat = await TicketModel.submitCsat(ticketId, userId, r, comment?.trim() || '');
        res.status(201).json({ success: true, data: csat });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al guardar calificación' });
    }
}

// ── MÉTRICAS ──────────────────────────────────────────────────────────────────

export async function getSupportMetrics(req, res) {
    try {
        const metrics = await TicketModel.getMetrics();
        res.json({ success: true, data: metrics });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener métricas' });
    }
}

// ── BASE DE CONOCIMIENTO ──────────────────────────────────────────────────────

export async function getKbArticles(req, res) {
    try {
        const { q } = req.query;
        const data = q?.trim() ? await KbModel.search(q.trim()) : await KbModel.getPublished();
        res.json({ success: true, data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener artículos' });
    }
}

export async function getKbArticle(req, res) {
    try {
        const article = await KbModel.getById(req.params.articleId);
        if (!article) return res.status(404).json({ success: false, message: 'Artículo no encontrado' });
        res.json({ success: true, data: article });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener artículo' });
    }
}

export async function createKbArticle(req, res) {
    try {
        const userId = req.currentUser.id;
        const { title, content, tags } = req.body;
        if (!title?.trim() || !content?.trim()) {
            return res.status(400).json({ success: false, message: 'Título y contenido requeridos.' });
        }
        const article = await KbModel.create({
            title:     title.trim(),
            content:   content.trim(),
            tags:      Array.isArray(tags) ? tags : [],
            createdBy: userId
        });
        res.status(201).json({ success: true, data: article });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear artículo' });
    }
}

// ── MACROS ────────────────────────────────────────────────────────────────────

export async function getMacros(req, res) {
    try {
        const data = await KbModel.listMacros();
        res.json({ success: true, data });
    } catch (error) {
        console.error('[getMacros ERROR]', error);
        res.status(500).json({ success: false, message: 'Error al obtener macros', debug_error: error?.message, debug_code: error?.code });
    }
}

export async function createMacro(req, res) {
    try {
        const userId = req.currentUser.id;
        const { title, body } = req.body;
        if (!title?.trim() || !body?.trim()) {
            return res.status(400).json({ success: false, message: 'Título y cuerpo requeridos.' });
        }
        const macro = await KbModel.createMacro({
            title:     title.trim(),
            body:      body.trim(),
            createdBy: userId
        });
        res.status(201).json({ success: true, data: macro });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear macro' });
    }
}
