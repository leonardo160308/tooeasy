// backend/routes/progressRoutes.js
import { Router } from 'express';
import {
    getAllProgress,
    getCategoryProgress,
    completeLevel
} from '../controllers/progressController.js';

const router = Router();

// All progress for a user (used by lessons page on load)
router.get('/progress/:userId', getAllProgress);

// Progress for one category
router.get('/progress/:userId/category/:categoryId', getCategoryProgress);

// Mark a level as complete and award coins
router.post('/progress/complete-level', completeLevel);

export default router;