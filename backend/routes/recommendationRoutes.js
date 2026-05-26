import { Router } from 'express';
import {
    getRecommendations,
    markRecommendationsRead,
    getRecommendationsReadState
} from '../controllers/recommendationController.js';

const router = Router();

// Rutas estáticas primero para evitar conflicto con el parámetro :userId
router.get('/recommendations/read-state',  getRecommendationsReadState);
router.post('/recommendations/mark-read',  markRecommendationsRead);
router.get('/recommendations/:userId',     getRecommendations);

export default router;
