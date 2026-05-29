// backend/middleware/requireAuth.js
import { verifySessionToken } from '../utils/security.js';

export function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Autenticación requerida. Inicia sesión de nuevo.',
            requiresLogin: true,
        });
    }

    const token  = authHeader.slice(7);
    const userId = verifySessionToken(token);

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Sesión inválida o expirada. Inicia sesión de nuevo.',
            requiresLogin: true,
        });
    }

    req.userId = userId;
    next();
}
