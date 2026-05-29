// backend/routes/progressRoutes.js
import { Router } from 'express';
import {
    getAllProgress,
    getCategoryProgress,
    completeLevel,
    checkLevelAccess,
    getLevelFlashcards,
    getLevelQuestions,
} from '../controllers/progressController.js';
import { requireAuth }        from '../middleware/requireAuth.js';
import { requireLevelAccess } from '../middleware/requireLevelAccess.js';

const router = Router();

// Acceso a nivel (verificación temprana con mensaje amigable)
router.get('/progress/check-access/:levelId', requireAuth, checkLevelAccess);

// Completar nivel — score calculado server-side a partir de las respuestas enviadas
router.post('/progress/complete-level', requireAuth, completeLevel);

// Contenido de nivel: auth + acceso verificado al nivel antes de servir contenido
router.get('/progress/level/:levelId/flashcards', requireLevelAccess, getLevelFlashcards);
router.get('/progress/level/:levelId/questions',  requireLevelAccess, getLevelQuestions);

// Progreso del usuario — auth requerida, solo el propio usuario puede ver su progreso
router.get('/progress/:userId',                        requireAuth, getAllProgress);
router.get('/progress/:userId/category/:categoryId',   requireAuth, getCategoryProgress);

export default router;
