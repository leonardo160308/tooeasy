// backend/routes/authRecoveryRoutes.js
import { Router } from 'express';
import {
    requestRecoveryCode,
    verifyRecoveryCode,
    recoveryLogin,
    resetPassword
} from '../controllers/authRecoveryController.js';

const router = Router();

// Paso 1: Solicitar código por email
router.post('/auth/request-code', requestRecoveryCode);

// Paso 2: Verificar el código de 6 dígitos
router.post('/auth/verify-code', verifyRecoveryCode);

// Paso 3a: Iniciar sesión directamente (sin cambiar contraseña)
router.post('/auth/recovery-login', recoveryLogin);

// Paso 3b: Cambiar contraseña con token verificado
router.post('/auth/reset-password', resetPassword);

export default router;