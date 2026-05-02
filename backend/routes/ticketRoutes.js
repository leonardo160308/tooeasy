// backend/routes/ticketRoutes.js
import { Router } from 'express';
import {
    requireAuth, requireSupport,
    createTicket, getMyTickets, getMyTicketDetail, replyToTicket, closeMyTicket,
    getAllTickets, getTicketDetail, takeTicket, changeTicketStatus,
    replyAsSupport, addInternalNote
} from '../controllers/ticketController.js';

const router = Router();

// ── USUARIO ──────────────────────────────────────────────────────────────────
router.post('/tickets',                            requireAuth, createTicket);
router.get('/tickets/my',                          requireAuth, getMyTickets);
router.get('/tickets/my/:ticketId',                requireAuth, getMyTicketDetail);
router.post('/tickets/my/:ticketId/reply',         requireAuth, replyToTicket);
router.patch('/tickets/my/:ticketId/close',        requireAuth, closeMyTicket);

// ── SOPORTE ───────────────────────────────────────────────────────────────────
router.get('/support/tickets',                          requireSupport, getAllTickets);
router.get('/support/tickets/:ticketId',                requireSupport, getTicketDetail);
router.post('/support/tickets/:ticketId/take',          requireSupport, takeTicket);
router.patch('/support/tickets/:ticketId/status',       requireSupport, changeTicketStatus);
router.post('/support/tickets/:ticketId/reply',         requireSupport, replyAsSupport);
router.post('/support/tickets/:ticketId/note',          requireSupport, addInternalNote);

export default router;
