// backend/controllers/ticketController.js
import TicketModel              from '../models/TicketModel.js';
import KbModel                  from '../models/KbModel.js';
import User                     from '../models/UserModel.js';
import { supabaseAdmin }        from '../config/supabase.js';
import { sendTicketReplyEmail, sendTicketResolvedEmail, sendTicketStatusChangeEmail } from '../utils/emailService.js';
import path                     from 'path';
import fs                       from 'fs';
import { fileURLToPath }        from 'url';

const __filename       = fileURLToPath(import.meta.url);
const __dirname        = path.dirname(__filename);
const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../frontend/public/img/tickets');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Límite mensual de tickets para usuarios regulares
const MONTHLY_TICKET_LIMIT = 5;

function isPrivilegedRole(role) {
    return role === 'support' || role === 'admin';
}

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
        res.status(500).json({ success: false, message: 'Error de autenticación.' });
    }
}

// ── USUARIO ──────────────────────────────────────────────────────────────────

export async function createTicket(req, res) {
    try {
        const { userId, subject, description, type, module } = req.body;

        if (!subject || subject.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'El asunto debe tener al menos 5 caracteres.' });
        }
        if (subject.trim().length > 200) {
            return res.status(400).json({ success: false, message: 'El asunto no puede superar los 200 caracteres.' });
        }
        if (!description || description.trim().length < 10) {
            return res.status(400).json({ success: false, message: 'La descripción debe tener al menos 10 caracteres.' });
        }
        if (description.trim().length > 2000) {
            return res.status(400).json({ success: false, message: 'La descripción no puede superar los 2000 caracteres.' });
        }
        const validTypes = ['bug', 'duda', 'sugerencia', 'otro'];
        if (!type || !validTypes.includes(type)) {
            return res.status(400).json({ success: false, message: 'Tipo de ticket inválido.' });
        }
        const validModules = [
            'dashboard', 'inversiones', 'lecciones', 'retos', 'perfil',
            'soporte', 'inicio_sesion', 'registro', 'recuperar_cuenta',
            'verificar_email', 'otro', 'general'
        ];
        const finalModule = validModules.includes(module) ? module : 'general';

        // Verificar límite mensual (solo usuarios regulares)
        const user = req.currentUser;
        if (!isPrivilegedRole(user.role)) {
            const usedThisMonth = await TicketModel.countUserTicketsThisMonth(userId);
            if (usedThisMonth >= MONTHLY_TICKET_LIMIT) {
                return res.status(429).json({
                    success: false,
                    message: `Has alcanzado el límite de ${MONTHLY_TICKET_LIMIT} tickets por mes. Podrás crear uno nuevo el próximo mes.`,
                    code: 'QUOTA_EXCEEDED'
                });
            }
        }

        let image_url = null;
        if (req.file) {
            const ext      = path.extname(req.file.originalname).toLowerCase();
            const filename = `tk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

            // Intentar Supabase Storage (URLs permanentes, sobreviven reinicios)
            const { data: stored, error: storageErr } = await supabaseAdmin.storage
                .from('tickets')
                .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

            if (!storageErr && stored) {
                console.log(`[Tickets] Imagen subida a Supabase Storage: bucket=tickets, file=${filename}`);
                image_url = `/api/tickets/image/${filename}`;
            } else {
                console.error(
                    `[Tickets] Supabase Storage FALLÓ al subir "${filename}": ${storageErr?.message ?? '(sin mensaje)'} | status: ${storageErr?.statusCode ?? 'N/A'}\n` +
                    `  ACCIÓN REQUERIDA: Verifica que el bucket "tickets" exista en Supabase Storage y que SUPABASE_SERVICE_ROLE_KEY tenga permisos de Storage.\n` +
                    `  Intentando fallback a disco local...`
                );
                try {
                    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
                    fs.writeFileSync(path.join(LOCAL_UPLOAD_DIR, filename), req.file.buffer);
                    console.log(`[Tickets] Imagen guardada en disco local (EPHEMERAL en Render/Railway): ${path.join(LOCAL_UPLOAD_DIR, filename)}`);
                    image_url = `/api/tickets/image/${filename}`;
                } catch (fsErr) {
                    console.error('[Tickets] Fallback local también falló:', fsErr.message);
                }
            }
        }

        const ticket = await TicketModel.createTicket(userId, {
            subject:     subject.trim(),
            description: description.trim(),
            type,
            module:      finalModule,
            image_url
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
        res.status(500).json({ success: false, message: 'Error al obtener tickets.' });
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

        const [messages, csat] = await Promise.all([
            TicketModel.getMessages(ticketId, 'user'),
            TicketModel.getCsatByTicket(ticketId),
            TicketModel.markUserRead(ticketId)
        ]);
        res.json({ success: true, data: { ticket, messages, csat } });
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
        if (message.trim().length > 2000) {
            return res.status(400).json({ success: false, message: 'El mensaje no puede superar los 2000 caracteres.' });
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

// ── IMAGEN PROXY ─────────────────────────────────────────────────────────────
const MIME_BY_EXT = {
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif':  'image/gif',
};

export async function serveTicketImage(req, res) {
    const { filename } = req.params;

    if (!filename || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
        return res.status(400).end();
    }

    const ext         = path.extname(filename).toLowerCase();
    const contentType = MIME_BY_EXT[ext] || 'image/png';

    // 1) Signed URL redirect — el cliente descarga directamente de Supabase (sin proxear datos)
    try {
        const { data: signed, error: signErr } = await supabaseAdmin.storage
            .from('tickets')
            .createSignedUrl(filename, 3600);

        if (!signErr && signed?.signedUrl) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
            return res.redirect(302, signed.signedUrl);
        }
        console.warn(`[serveTicketImage] signed URL falló para "${filename}": ${signErr?.message ?? '(sin mensaje)'} | status: ${signErr?.statusCode ?? 'N/A'}`);
    } catch (err) {
        console.error(`[serveTicketImage] excepción en signed URL para "${filename}":`, err.message);
    }

    // 2) Descarga directa proxy (si el bucket tiene archivos pero signed URL falla por configuración)
    try {
        const { data: blob, error: dlErr } = await supabaseAdmin.storage
            .from('tickets')
            .download(filename);

        if (!dlErr && blob) {
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            const buf = Buffer.from(await blob.arrayBuffer());
            return res.end(buf);
        }
        console.warn(`[serveTicketImage] download también falló para "${filename}": ${dlErr?.message ?? '(sin mensaje)'} | status: ${dlErr?.statusCode ?? 'N/A'}`);
    } catch (err) {
        console.error(`[serveTicketImage] excepción en download para "${filename}":`, err.message);
    }

    // 3) Fallback: disco local (desarrollo / entornos sin Supabase Storage)
    const localPath = path.join(LOCAL_UPLOAD_DIR, filename);
    if (fs.existsSync(localPath)) {
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(localPath);
    }

    console.error(
        `[serveTicketImage] IMAGEN NO ENCONTRADA: "${filename}"\n` +
        `  → Supabase bucket: "tickets"\n` +
        `  → Disco local:     ${localPath}\n` +
        `  ACCIÓN REQUERIDA: Verifica que el bucket "tickets" exista en Supabase Storage ` +
        `y que SUPABASE_SERVICE_ROLE_KEY tenga permisos de Storage.`
    );
    res.status(404).json({ success: false, message: 'Imagen no encontrada' });
}

// ── SOPORTE ───────────────────────────────────────────────────────────────────

const VALID_STATUSES    = new Set(['open', 'in_progress', 'waiting_user', 'resolved', 'closed']);
const VALID_PRIORITIES  = new Set(['low', 'medium', 'high', 'urgent']);

export async function getAllTickets(req, res) {
    try {
        const filters = {};
        if (req.query.status   && VALID_STATUSES.has(req.query.status))     filters.status      = req.query.status;
        if (req.query.priority && VALID_PRIORITIES.has(req.query.priority)) filters.priority    = req.query.priority;
        if (req.query.assigned_to && UUID_RE.test(req.query.assigned_to))   filters.assigned_to = req.query.assigned_to;

        const tickets = await TicketModel.getAllTickets(filters);
        res.json({ success: true, data: tickets });
    } catch (error) {
        console.error('[getAllTickets ERROR]', error);
        res.status(500).json({ success: false, message: 'Error al obtener tickets.' });
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

        const [messages, events, csat] = await Promise.all([
            TicketModel.getMessages(ticketId, 'support'),
            TicketModel.getEvents(ticketId),
            TicketModel.getCsatByTicket(ticketId)
        ]);
        res.json({ success: true, data: { ticket, messages, events, csat } });
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

        // Notificar al usuario en cada cambio de estado
        const ticketUser = ticket.ticket_user;
        if (ticketUser?.email) {
            sendTicketStatusChangeEmail(
                ticketUser.email,
                ticketUser.nombre || 'Usuario',
                ticket.subject,
                status
            ).catch(err => console.error('[changeTicketStatus] Email error:', err.message));
        }

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

        // Marcar como no leído por el usuario y enviar email de notificación
        await TicketModel.markUserUnread(ticketId);
        const ticketUser = ticket.ticket_user;
        if (ticketUser?.email) {
            sendTicketReplyEmail(
                ticketUser.email,
                ticketUser.nombre || 'Usuario',
                ticket.subject,
                message.trim()
            ).catch(err => console.error('[replyAsSupport] Email error:', err.message));
        }

        res.status(201).json({ success: true, data: msg });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al enviar respuesta' });
    }
}

export async function getUnreadCount(req, res) {
    try {
        const userId = extractUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        }
        const count = await TicketModel.getUnreadReplyCount(userId);
        res.json({ success: true, data: { count } });
    } catch (error) {
        console.error('[getUnreadCount ERROR]', error);
        res.status(500).json({ success: false, message: 'Error al obtener notificaciones.' });
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

export async function changePriority(req, res) {
    try {
        const userId   = req.currentUser.id;
        const { ticketId } = req.params;
        const { priority } = req.body;

        if (!UUID_RE.test(ticketId)) {
            return res.status(400).json({ success: false, message: 'ID de ticket inválido' });
        }
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!priority || !validPriorities.includes(priority)) {
            return res.status(400).json({ success: false, message: 'Prioridad inválida.' });
        }

        const ticket = await TicketModel.getTicketById(ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });

        const updated = await TicketModel.updateTicketPriority(ticketId, priority, userId);
        res.json({ success: true, data: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al cambiar prioridad' });
    }
}

// ── ELIMINAR TICKET ───────────────────────────────────────────────────────────

async function cleanupTicketImage(imageUrl) {
    if (!imageUrl) return;
    const filename = imageUrl.split('/').pop();
    await supabaseAdmin.storage.from('tickets').remove([filename]).catch(() => {});
    const localPath = path.join(LOCAL_UPLOAD_DIR, filename);
    try { if (fs.existsSync(localPath)) fs.unlinkSync(localPath); } catch {}
}

export async function deleteTicket(req, res) {
    try {
        const { ticketId } = req.params;
        if (!UUID_RE.test(ticketId)) {
            return res.status(400).json({ success: false, message: 'ID de ticket inválido' });
        }

        const ticket = await TicketModel.getTicketById(ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });

        await TicketModel.deleteTicket(ticketId);
        await cleanupTicketImage(ticket.image_url);

        res.json({ success: true, message: 'Ticket eliminado.' });
    } catch (error) {
        console.error('[deleteTicket ERROR]', error);
        res.status(500).json({ success: false, message: 'Error al eliminar ticket' });
    }
}

export async function deleteMyTicket(req, res) {
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

        await TicketModel.deleteTicket(ticketId);
        await cleanupTicketImage(ticket.image_url);

        res.json({ success: true, message: 'Ticket eliminado.' });
    } catch (error) {
        console.error('[deleteMyTicket ERROR]', error);
        res.status(500).json({ success: false, message: 'Error al eliminar ticket' });
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
        res.status(500).json({ success: false, message: 'Error al obtener macros.' });
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

export async function getTicketQuota(req, res) {
    try {
        const userId = extractUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        }
        const user = await User.findById(userId);
        if (!user || !user.is_active) {
            return res.status(401).json({ success: false, message: 'Usuario no encontrado.' });
        }

        if (isPrivilegedRole(user.role)) {
            return res.json({ success: true, data: { used: 0, limit: null, remaining: null } });
        }

        const used      = await TicketModel.countUserTicketsThisMonth(userId);
        const remaining = Math.max(0, MONTHLY_TICKET_LIMIT - used);
        res.json({ success: true, data: { used, limit: MONTHLY_TICKET_LIMIT, remaining } });
    } catch (error) {
        console.error('[getTicketQuota ERROR]', error);
        res.status(500).json({ success: false, message: 'Error al obtener cuota de tickets.' });
    }
}

export async function trackFaqClick(req, res) {
    try {
        const { faqKey } = req.body;
        if (!faqKey || typeof faqKey !== 'string' || faqKey.length > 120) {
            return res.status(400).json({ success: false, message: 'faqKey inválido.' });
        }
        await TicketModel.trackFaqView(faqKey.trim());
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al registrar vista de FAQ.' });
    }
}

export async function getFaqStats(req, res) {
    try {
        const data = await TicketModel.getFaqStats();
        res.json({ success: true, data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas de FAQ.' });
    }
}
