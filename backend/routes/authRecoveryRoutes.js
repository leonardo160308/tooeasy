// backend/routes/authRecoveryRoutes.js
import { Router } from 'express';
import {
    requestRecoveryCode,
    verifyRecoveryCode,
    resetPassword
} from '../controllers/authRecoveryController.js';

const router = Router();

// Paso 1: Solicitar código por email
router.post('/auth/request-code', requestRecoveryCode);

// Paso 2: Verificar el código de 6 dígitos
router.post('/auth/verify-code', verifyRecoveryCode);

// Paso 3: Cambiar contraseña con token verificado
router.post('/auth/recovery-reset-password', resetPassword);

export default router;