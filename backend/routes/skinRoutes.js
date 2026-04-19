// backend/routes/skinRoutes.js
import { Router } from 'express';
import { getShopSkins, purchaseSkin, unlockSkin } from '../controllers/skinController.js';

const router = Router();

// Catálogo de skins (tienda)
router.get('/skins', getShopSkins);

// Compra con monedas
router.post('/skins/purchase', purchaseSkin);

// Desbloqueo gratuito como recompensa educativa
router.post('/skins/unlock', unlockSkin);

export default router;