import { Router } from 'express';
import { getRecommendations } from '../controllers/recommendationController.js';

const router = Router();

router.get('/recommendations/:userId', getRecommendations);

export default router;
