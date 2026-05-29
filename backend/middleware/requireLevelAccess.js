// backend/middleware/requireLevelAccess.js
// Verifica auth + que el usuario tenga acceso al nivel solicitado.
// Inyecta req.userId igual que requireAuth.
import { verifySessionToken } from '../utils/security.js';
import { canAccessLevel }     from '../controllers/progressController.js';

export async function requireLevelAccess(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Autenticación requerida.',
            requiresLogin: true,
        });
    }

    const token  = authHeader.slice(7);
    const userId = verifySessionToken(token);
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Sesión inválida o expirada.',
            requiresLogin: true,
        });
    }

    req.userId = userId;

    const levelId = req.params.levelId;
    try {
        const ok = await canAccessLevel(userId, levelId);
        if (!ok) {
            return res.status(403).json({
                success: false,
                message: 'Nivel bloqueado. Completa los niveles anteriores primero.',
                locked: true,
            });
        }
    } catch (err) {
        console.error('[requireLevelAccess]', err);
        return res.status(500).json({ success: false, message: 'Error al verificar acceso.' });
    }

    next();
}
