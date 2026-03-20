// backend/routes/authRoutes.js
import { Router } from 'express';
import {
    registerUser,
    loginUser,
    verifyEmail,
    resendVerificationCode,
    requestRecoveryCode,
    verifyRecoveryCode,
    resetPassword,
} from '../controllers/authController.js';

const router = Router();

// Registro y login
router.post('/auth/register',              registerUser);
router.post('/auth/login',                 loginUser);

// Verificación de email
router.post('/auth/verify-email',          verifyEmail);
router.post('/auth/resend-verification',   resendVerificationCode);

// Recuperación de contraseña
router.post('/auth/request-recovery',      requestRecoveryCode);
router.post('/auth/verify-recovery-code',  verifyRecoveryCode);
router.post('/auth/reset-password',        resetPassword);

export default router;