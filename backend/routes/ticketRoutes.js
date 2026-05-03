// backend/routes/ticketRoutes.js
import { Router } from 'express';
import {
    requireAuth, requireSupport,
    createTicket, getMyTickets, getMyTicketDetail, replyToTicket, closeMyTicket,
    getAllTickets, getTicketDetail, takeTicket, changeTicketStatus,
    replyAsSupport, addInternalNote,
    submitCsat,
    getSupportMetrics,
    getKbArticles, getKbArticle, createKbArticle,
    getMacros, createMacro
} from '../controllers/ticketController.js';

const router = Router();

// ── USUARIO ───────────────────────────────────────────────────────────────────
router.post('/tickets',                              requireAuth, createTicket);
router.get('/tickets/my',                            requireAuth, getMyTickets);
router.get('/tickets/my/:ticketId',                  requireAuth, getMyTicketDetail);
router.post('/tickets/my/:ticketId/reply',           requireAuth, replyToTicket);
router.patch('/tickets/my/:ticketId/close',          requireAuth, closeMyTicket);
router.post('/tickets/my/:ticketId/csat',            requireAuth, submitCsat);

// ── BASE DE CONOCIMIENTO (disponible para usuarios autenticados) ───────────────
router.get('/kb',              requireAuth, getKbArticles);
router.get('/kb/:articleId',   requireAuth, getKbArticle);

// ── SOPORTE (role=support exclusivamente) ─────────────────────────────────────
router.get('/support/tickets',                            requireSupport, getAllTickets);
router.get('/support/tickets/:ticketId',                  requireSupport, getTicketDetail);
router.post('/support/tickets/:ticketId/take',            requireSupport, takeTicket);
router.patch('/support/tickets/:ticketId/status',         requireSupport, changeTicketStatus);
router.post('/support/tickets/:ticketId/reply',           requireSupport, replyAsSupport);
router.post('/support/tickets/:ticketId/note',            requireSupport, addInternalNote);
router.get('/support/metrics',                            requireSupport, getSupportMetrics);
router.get('/support/macros',                             requireSupport, getMacros);
router.post('/support/macros',                            requireSupport, createMacro);
router.post('/support/kb',                                requireSupport, createKbArticle);

export default router;
