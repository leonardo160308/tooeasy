import { Router } from 'express';
import { createMovement, getMovementData, deleteMovement } from '../controllers/movementController.js';

const router = Router();

// C: Crea un nuevo movimiento (Ingreso o Gasto)
// POST /api/movements
router.post('/movements', createMovement);

// R: Obtiene el historial y los totales del usuario
// GET /api/movements/user/:userId
router.get('/movements/user/:userId', getMovementData);

// D: Borrar un movimiento por ID
// DELETE /api/movements/:movementId
router.delete('/movements/:movementId', deleteMovement);

export default router;