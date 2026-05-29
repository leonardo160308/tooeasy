// backend/routes/progressRoutes.js
import { Router } from 'express';
import {
    getAllProgress,
    getCategoryProgress,
    completeLevel,
    checkLevelAccess
} from '../controllers/progressController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// Rutas protegidas con token de sesión (DEBEN ir antes de /:userId para no colisionar)
router.get('/progress/check-access/:levelId', requireAuth, checkLevelAccess);
router.post('/progress/complete-level',        requireAuth, completeLevel);

// Rutas de lectura — siguen aceptando userId en la URL por compatibilidad
router.get('/progress/:userId',                          getAllProgress);
router.get('/progress/:userId/category/:categoryId',     getCategoryProgress);

export default router;