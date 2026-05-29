// backend/controllers/progressController.js
import ProgressModel from '../models/ProgressModel.js';
import User          from '../models/UserModel.js';
import { supabase }  from '../config/supabase.js';

const COINS_PER_LEVEL = 20;

// Verifica si un usuario puede acceder a un nivel dado.
// Regla: el primer nivel de cada categoría siempre está disponible.
// Cualquier nivel posterior requiere que el nivel anterior (por orden) esté completado.
async function canAccessLevel(userId, levelId) {
    const { data: level, error } = await supabase
        .from('educational_levels')
        .select('id, category_id, orden')
        .eq('id', Number(levelId))
        .maybeSingle();

    if (error || !level) return false;

    // Buscar el nivel inmediatamente anterior en la misma categoría
    const { data: prevLevel } = await supabase
        .from('educational_levels')
        .select('id')
        .eq('category_id', level.category_id)
        .lt('orden', level.orden)
        .order('orden', { ascending: false })
        .limit(1)
        .maybeSingle();

    // Si no hay nivel anterior es el primero → siempre accesible
    if (!prevLevel) return true;

    const completedLevels = await ProgressModel.getCategoryProgress(userId, level.category_id);
    return completedLevels.includes(Number(prevLevel.id));
}

// ── GET /api/progress/check-access/:levelId  [requiere token — userId viene de req.userId]
export async function checkLevelAccess(req, res) {
    try {
        const { levelId } = req.params;
        const userId      = req.userId; // inyectado por requireAuth middleware

        const canAccess = await canAccessLevel(userId, levelId);
        res.json({ success: true, canAccess });
    } catch (error) {
        console.error('Error in checkLevelAccess:', error);
        res.status(500).json({ success: false, message: 'Error al verificar acceso.' });
    }
}

// ── GET /api/progress/:userId ────────────────────────────────────────────────
// Returns a map: { categoryId: [levelId, ...], ... }
export async function getAllProgress(req, res) {
    try {
        const { userId } = req.params;

        const rows = await ProgressModel.getAllProgressForUser(userId);

        // Convert array to map keyed by category_id (as numbers)
        const progress = {};
        rows.forEach(r => {
            progress[Number(r.category_id)] = (r.completed_levels || []).map(Number);
        });

        res.json({ success: true, progress });
    } catch (error) {
        console.error('Error in getAllProgress:', error);
        res.status(500).json({ success: false, message: 'Error al obtener progreso.' });
    }
}

// ── GET /api/progress/:userId/category/:categoryId ───────────────────────────
export async function getCategoryProgress(req, res) {
    try {
        const { userId, categoryId } = req.params;
        const completedLevels = await ProgressModel.getCategoryProgress(userId, categoryId);
        res.json({ success: true, completedLevels });
    } catch (error) {
        console.error('Error in getCategoryProgress:', error);
        res.status(500).json({ success: false, message: 'Error al obtener progreso de categoría.' });
    }
}

// ── POST /api/progress/complete-level  [requiere token — userId viene de req.userId]
// Body: { levelId, score }   (userId ya NO viene del cliente — viene del token)
export async function completeLevel(req, res) {
    try {
        const userId             = req.userId; // inyectado por requireAuth middleware
        const { levelId, score } = req.body;

        if (!levelId || score === undefined) {
            return res.status(400).json({
                success: false,
                message: 'levelId y score son requeridos.'
            });
        }

        const scoreNum = Number(score);
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
            return res.status(400).json({ success: false, message: 'score debe ser 0–100.' });
        }

        // Must pass with ≥80% to count as completed
        if (scoreNum < 80) {
            return res.status(400).json({
                success: false,
                message: `Necesitas al menos 80% de aciertos para completar el nivel. Tu puntuación: ${scoreNum.toFixed(0)}%`
            });
        }

        // Anti-trampas: verificar que el usuario realmente puede acceder a este nivel
        const canAccess = await canAccessLevel(userId, levelId);
        if (!canAccess) {
            return res.status(403).json({
                success: false,
                message: 'No tienes acceso a este nivel. Completa los niveles anteriores primero.'
            });
        }

        // Look up the level to get its category_id
        const { data: level, error: lvlError } = await supabase
            .from('educational_levels')
            .select('id, category_id, orden')
            .eq('id', Number(levelId))
            .single();

        if (lvlError || !level) {
            return res.status(404).json({ success: false, message: 'Nivel no encontrado.' });
        }

        const { category_id: categoryId } = level;

        // Mark the level complete (idempotent)
        const result = await ProgressModel.completeLevel(userId, categoryId, levelId);

        let coinsAwarded = 0;
        let newCoins     = null;

        if (!result.alreadyCompleted) {
            // Award coins only on first-time completion
            const user = await User.findById(userId);
            if (user) {
                newCoins = (user.coins || 0) + COINS_PER_LEVEL;
                await User.update(userId, { coins: newCoins });
                coinsAwarded = COINS_PER_LEVEL;
            }
        }

        return res.json({
            success:          true,
            alreadyCompleted: result.alreadyCompleted,
            coinsAwarded,
            newCoins,
            completedLevels:  result.completedLevels,
            categoryId:       Number(categoryId)
        });

    } catch (error) {
        console.error('Error in completeLevel:', error);
        res.status(500).json({ success: false, message: 'Error al completar nivel.' });
    }
}