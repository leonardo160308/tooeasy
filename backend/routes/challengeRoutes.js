/* backend/routes/challengeRoutes.js */

import { Router } from 'express';
import { getChallenges, getAllChallengesProgress, claimChallenge } from '../controllers/challengeController.js';

const router = Router();

// Retos completados (claimed) del usuario
router.get('/challenges/status/:userId', getChallenges);

// Progreso real de todos los retos del usuario
router.get('/challenges/progress/:userId', getAllChallengesProgress);

// Reclamar un reto
router.post('/challenges/complete', claimChallenge);

export default router;