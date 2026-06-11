// backend/middleware/requireAuth.js
import { verifySessionToken } from '../utils/security.js';
import { supabase }           from '../config/supabase.js';

export async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Autenticación requerida. Inicia sesión de nuevo.',
                requiresLogin: true,
            });
        }

        const token   = authHeader.slice(7);
        const decoded = verifySessionToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Sesión inválida o expirada. Inicia sesión de nuevo.',
                requiresLogin: true,
            });
        }

        const { userId, issuedAt } = decoded;

        // Invalidar sesiones emitidas antes del último cambio de contraseña
        const { data: user } = await supabase
            .from('users')
            .select('password_changed_at')
            .eq('id', userId)
            .single();

        if (user?.password_changed_at && issuedAt < new Date(user.password_changed_at).getTime()) {
            return res.status(401).json({
                success: false,
                message: 'Sesión invalidada por cambio de contraseña. Inicia sesión de nuevo.',
                requiresLogin: true,
            });
        }

        req.userId = userId;
        next();
    } catch (error) {
        console.error('[requireAuth]', error);
        return res.status(500).json({ success: false, message: 'Error de autenticación.' });
    }
}
