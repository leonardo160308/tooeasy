import { Router } from 'express';
import {
    createMovement,
    updateMovement,
    getMovementData,
    deleteMovement
} from '../controllers/movementController.js';

const router = Router();

// C: Crea un nuevo movimiento
// POST /api/movements
router.post('/movements', createMovement);

// R: Obtiene historial y totales del usuario
// GET /api/movements/user/:userId
router.get('/movements/user/:userId', getMovementData);

// U: Actualiza un movimiento (tipo, categoría, monto)
// PUT /api/movements/:movementId
router.put('/movements/:movementId', updateMovement);

// D: Borrar un movimiento por ID
// DELETE /api/movements/:movementId
router.delete('/movements/:movementId', deleteMovement);

export default router;