import { Router } from 'express';
import { getShopSkins, purchaseSkin } from '../controllers/skinController.js';

const router = Router();

// R: Obtener catálogo (Tienda)
// GET /api/skins
router.get('/skins', getShopSkins);

// C: Comprar una skin
// POST /api/skins/purchase
router.post('/skins/purchase', purchaseSkin);

export default router;