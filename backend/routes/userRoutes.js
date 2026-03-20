// backend/routes/userRoutes.js

import { Router } from 'express';
import { 
    registerUser, 
    loginUser, 
    getUserProfile, 
    updateUser, 
    deleteUser 
} from '../controllers/userController.js';

const router = Router();

// ========================================
// RUTAS DE AUTENTICACIÓN
// ========================================

// POST /api/login - Iniciar sesión
router.post('/login', loginUser);

// POST /api/users - Crear cuenta (Registro)
router.post('/users', registerUser);

// ========================================
// RUTAS DE GESTIÓN DE USUARIOS
// ========================================

// GET /api/users/:id - Ver perfil de usuario
router.get('/users/:id', getUserProfile);

// PUT /api/users/:id - Actualizar datos del usuario
router.put('/users/:id', updateUser);

// DELETE /api/users/:id - Borrar usuario (baja lógica)
router.delete('/users/:id', deleteUser);

export default router;