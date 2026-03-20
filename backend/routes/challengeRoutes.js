/* backend/routes/challengeRoutes.js */

import { Router } from 'express';
// Importamos las funciones que acabamos de crear en el controlador
import { getChallenges, claimChallenge } from '../controllers/challengeController.js';

const router = Router();

// 1. Ruta para ver qué retos ya completó el usuario
// URL: http://localhost:3000/api/challenges/status/1
router.get('/challenges/status/:userId', getChallenges);

// 2. Ruta para intentar completar un reto y ganar premio
// URL: http://localhost:3000/api/challenges/complete
router.post('/challenges/complete', claimChallenge);

export default router;