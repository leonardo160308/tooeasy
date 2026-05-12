// backend/routes/userRoutes.js
// NOTA: Los endpoints /login y POST /users (registro) fueron eliminados.
// Usar /api/auth/login y /api/auth/register (con verificación de email y protección brute-force).

import { Router } from 'express';
import {
    getUserProfile,
    updateUser,
    deleteUser
} from '../controllers/userController.js';

const router = Router();

// GET /api/users/:id — Ver perfil de usuario
router.get('/users/:id', getUserProfile);

// PUT /api/users/:id — Actualizar datos del usuario
router.put('/users/:id', updateUser);

// DELETE /api/users/:id — Baja de usuario
router.delete('/users/:id', deleteUser);

export default router;