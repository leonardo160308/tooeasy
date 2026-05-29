// backend/middleware/requireLevelAccess.js
// 1. Verifica token de sesión (HMAC firmado).
// 2. Valida formato de levelId — rechaza notación científica, decimales,
//    negativos, ceros, strings y valores fuera de rango antes del primer query.
// 3. Verifica que el usuario tenga progreso suficiente para acceder al nivel.
import { verifySessionToken } from '../utils/security.js';
import { isValidLevelId }     from '../utils/validators.js';
import { canAccessLevel }     from '../controllers/progressController.js';

export async function requireLevelAccess(req, res, next) {
    // ── 1. Autenticación ──────────────────────────────────────────────────
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

    // ── 2. Validación de formato del levelId ──────────────────────────────
    // Rechaza: notación científica, decimales, negativos, cero, strings,
    // caracteres especiales y números fuera del rango permitido (1–99999).
    const rawLevelId = req.params.levelId;
    if (!isValidLevelId(rawLevelId)) {
        return res.status(400).json({
            success: false,
            message: 'ID de nivel inválido.',
        });
    }
    const levelId = parseInt(String(rawLevelId).trim(), 10);

    // ── 3. Verificación de acceso al nivel ────────────────────────────────
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
