// backend/controllers/progressController.js
import ProgressModel             from '../models/ProgressModel.js';
import User                      from '../models/UserModel.js';
import { supabase }              from '../config/supabase.js';
import { isValidLevelId, sanitizeLevelId } from '../utils/validators.js';

const COINS_PER_LEVEL = 20;

// Exportada para ser usada por requireLevelAccess middleware.
// Regla: primer nivel de cada categoría siempre accesible.
// Cualquier nivel posterior requiere que el anterior (por orden) esté completado.
export async function canAccessLevel(userId, levelId) {
    const { data: level, error } = await supabase
        .from('educational_levels')
        .select('id, category_id, orden')
        .eq('id', Number(levelId))
        .maybeSingle();

    if (error || !level) return false;

    const { data: prevLevel } = await supabase
        .from('educational_levels')
        .select('id')
        .eq('category_id', level.category_id)
        .lt('orden', level.orden)
        .order('orden', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!prevLevel) return true;

    const completedLevels = await ProgressModel.getCategoryProgress(userId, level.category_id);
    return completedLevels.includes(Number(prevLevel.id));
}

// ── GET /api/progress/check-access/:levelId  [requireAuth]
export async function checkLevelAccess(req, res) {
    try {
        const rawLevelId = req.params.levelId;
        if (!isValidLevelId(rawLevelId)) {
            return res.status(400).json({ success: false, message: 'ID de nivel inválido.' });
        }
        const levelId = sanitizeLevelId(rawLevelId);
        const userId  = req.userId;

        const canAccess = await canAccessLevel(userId, levelId);
        res.json({ success: true, canAccess });
    } catch (error) {
        console.error('Error in checkLevelAccess:', error);
        res.status(500).json({ success: false, message: 'Error al verificar acceso.' });
    }
}

// ── GET /api/progress/level/:levelId/flashcards  [requireLevelAccess]
export async function getLevelFlashcards(req, res) {
    try {
        const { levelId } = req.params;
        const { data: flashcards, error } = await supabase
            .from('flashcards')
            .select('id, titulo, contenido, imagen')
            .eq('level_id', Number(levelId))
            .order('id', { ascending: true });

        if (error) throw error;
        res.json({ success: true, data: flashcards || [] });
    } catch (error) {
        console.error('Error in getLevelFlashcards:', error);
        res.status(500).json({ success: false, message: 'Error al obtener flashcards.' });
    }
}

// ── GET /api/progress/level/:levelId/questions  [requireLevelAccess]
// Incluye el campo "correcta" porque el acceso ya fue verificado por el middleware.
export async function getLevelQuestions(req, res) {
    try {
        const { levelId } = req.params;
        const { data: questions, error } = await supabase
            .from('quiz_questions')
            .select('id, pregunta, opciones, correcta, dificultad, imagen')
            .eq('level_id', Number(levelId))
            .order('id', { ascending: true });

        if (error) throw error;
        res.json({ success: true, data: questions || [] });
    } catch (error) {
        console.error('Error in getLevelQuestions:', error);
        res.status(500).json({ success: false, message: 'Error al obtener preguntas.' });
    }
}

// ── GET /api/progress/:userId  [requireAuth — solo el propio usuario]
export async function getAllProgress(req, res) {
    try {
        const requestedUserId = Number(req.params.userId);
        if (requestedUserId !== req.userId) {
            return res.status(403).json({ success: false, message: 'Acceso denegado.' });
        }

        const rows = await ProgressModel.getAllProgressForUser(requestedUserId);

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

// ── GET /api/progress/:userId/category/:categoryId  [requireAuth — solo el propio usuario]
export async function getCategoryProgress(req, res) {
    try {
        const requestedUserId = Number(req.params.userId);
        if (requestedUserId !== req.userId) {
            return res.status(403).json({ success: false, message: 'Acceso denegado.' });
        }

        const { categoryId } = req.params;
        const completedLevels = await ProgressModel.getCategoryProgress(requestedUserId, categoryId);
        res.json({ success: true, completedLevels });
    } catch (error) {
        console.error('Error in getCategoryProgress:', error);
        res.status(500).json({ success: false, message: 'Error al obtener progreso de categoría.' });
    }
}

// ── POST /api/progress/complete-level  [requireAuth]
// Body: { levelId, answers: { "[questionId]": "A" | "B" | ... } }
// El score se calcula en el backend — nunca se confía en el cliente.
export async function completeLevel(req, res) {
    try {
        const userId               = req.userId;
        const { levelId, answers } = req.body;

        // Validar formato de levelId antes de cualquier operación
        if (!isValidLevelId(levelId)) {
            return res.status(400).json({ success: false, message: 'ID de nivel inválido.' });
        }
        const cleanLevelId = sanitizeLevelId(levelId);

        if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
            return res.status(400).json({
                success: false,
                message: 'answers debe ser un objeto { questionId: respuesta }.'
            });
        }

        // Anti-trampas: verificar que el usuario puede acceder a este nivel
        const canAccess = await canAccessLevel(userId, cleanLevelId);
        if (!canAccess) {
            return res.status(403).json({
                success: false,
                message: 'No tienes acceso a este nivel. Completa los niveles anteriores primero.'
            });
        }

        // Obtener preguntas con respuestas correctas desde la BD
        const { data: questions, error: qErr } = await supabase
            .from('quiz_questions')
            .select('id, correcta')
            .eq('level_id', cleanLevelId);

        if (qErr) {
            console.error('Error fetching questions for scoring:', qErr);
            return res.status(500).json({ success: false, message: 'Error al obtener preguntas.' });
        }

        if (!questions || questions.length === 0) {
            return res.status(400).json({ success: false, message: 'Este nivel no tiene preguntas.' });
        }

        // Calcular score en el backend — ignora cualquier dato del cliente
        let aciertos = 0;
        for (const q of questions) {
            if (String(answers[String(q.id)]) === String(q.correcta)) aciertos++;
        }
        const scoreNum = (aciertos / questions.length) * 100;

        if (scoreNum < 80) {
            return res.status(400).json({
                success:  false,
                message:  `Necesitas al menos 80% de aciertos para completar el nivel. Tu puntuación: ${scoreNum.toFixed(0)}%`,
                score:    scoreNum,
                aciertos,
                total:    questions.length,
            });
        }

        // Obtener categoría del nivel
        const { data: level, error: lvlError } = await supabase
            .from('educational_levels')
            .select('id, category_id')
            .eq('id', cleanLevelId)
            .single();

        if (lvlError || !level) {
            return res.status(404).json({ success: false, message: 'Nivel no encontrado.' });
        }

        const { category_id: categoryId } = level;

        // Marcar nivel como completado (operación idempotente)
        const result = await ProgressModel.completeLevel(userId, categoryId, cleanLevelId);

        let coinsAwarded = 0;
        let newCoins     = null;

        if (!result.alreadyCompleted) {
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
            categoryId:       Number(categoryId),
            score:            scoreNum,
            aciertos,
            total:            questions.length,
        });

    } catch (error) {
        console.error('Error in completeLevel:', error);
        res.status(500).json({ success: false, message: 'Error al completar nivel.' });
    }
}
