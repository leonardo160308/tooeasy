import { Router } from 'express';
import { getChallenges, claimChallenge } from '../controllers/challengeController.js';
import { upgradeItem, equipSkin } from '../controllers/profileController.js';

const router = Router();

// Retos
router.get('/challenges/:userId', getChallenges);
router.post('/challenges/claim', claimChallenge);

// Perfil / Mejoras
router.post('/upgrade', upgradeItem); // Body: { userId, type: 'house' }
router.put('/equip', equipSkin);      // Body: { userId, skinId, type }

export default router;