import { supabase } from '../config/supabase.js';
import User from '../models/UserModel.js';

// ==========================================
// RECOMPENSAS REALES POR RETO
// ==========================================
const CHALLENGE_REWARDS = {
    1: 5,  2: 5,  3: 5,  4: 5,  5: 5,
    6: 6,  7: 6,  8: 6,  9: 6,  10: 6,
    11: 6, 12: 6, 13: 6, 14: 6, 15: 6,
    16: 6, 17: 6, 18: 6, 19: 6, 20: 6,
    21: 9, 22: 9, 23: 9, 24: 9,
    25: 9, 26: 9, 27: 9, 28: 9,
    29: 9, 30: 9
};

// Obtener inicio y fin del mes actual
const getMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return { start, end };
};

// ==========================================
// FUNCIÓN PURA: CALCULA PROGRESO
// Recibe movimientos ya cargados (sin llamada a DB)
// Devuelve { current, required }
// ==========================================
const computeProgress = (movements, monthMovements, challengeId) => {
    const id = challengeId;

    // ── CANTIDAD TOTAL DE MOVIMIENTOS ──────────────────────────────────────
    const totalMap = { 1: 1, 2: 5, 3: 7, 6: 15, 7: 25, 8: 40, 9: 60, 10: 100 };
    if (totalMap[id] !== undefined) {
        const req = totalMap[id];
        return { current: Math.min(movements.length, req), required: req };
    }

    // ── RETO 4: PRIMER INGRESO ─────────────────────────────────────────────
    if (id === 4) {
        const c = movements.filter(m => m.tipo === 'income').length;
        return { current: Math.min(c, 1), required: 1 };
    }

    // ── RETO 5: BALANCE POSITIVO EN EL MES ────────────────────────────────
    if (id === 5) {
        const bal = monthMovements.reduce((s, m) =>
            m.tipo === 'income' ? s + parseFloat(m.monto) : s - parseFloat(m.monto), 0);
        return { current: bal > 0 ? 1 : 0, required: 1 };
    }

    // ── RETOS 11-13: CONTEO DE INGRESOS ───────────────────────────────────
    const incomeCountMap = { 11: 3, 12: 5, 13: 10 };
    if (incomeCountMap[id] !== undefined) {
        const req = incomeCountMap[id];
        const c = movements.filter(m => m.tipo === 'income').length;
        return { current: Math.min(c, req), required: req };
    }

    // ── RETOS 14-15: TOTAL DE INGRESOS EN EL MES ──────────────────────────
    if (id === 14 || id === 15) {
        const req = id === 14 ? 500 : 1000;
        const total = monthMovements
            .filter(m => m.tipo === 'income')
            .reduce((s, m) => s + parseFloat(m.monto), 0);
        return { current: parseFloat(Math.min(total, req).toFixed(2)), required: req };
    }

    // ── RETO 16: RENTA / HIPOTECA ─────────────────────────────────────────
    if (id === 16) {
        const c = movements.filter(m => m.categoria === 'Renta / Hipoteca').length;
        return { current: Math.min(c, 1), required: 1 };
    }

    // ── RETO 17: ALIMENTACIÓN (5 movs) ───────────────────────────────────
    if (id === 17) {
        const cats = ['Supermercado', 'Restaurantes', 'Comida rápida', 'Delivery', 'Café / Snacks'];
        const c = movements.filter(m => cats.includes(m.categoria)).length;
        return { current: Math.min(c, 5), required: 5 };
    }

    // ── RETO 18: TRANSPORTE (5 movs) ──────────────────────────────────────
    if (id === 18) {
        const cats = ['Gasolina', 'Transporte público', 'Taxi / Uber', 'Estacionamiento', 'Peajes', 'Mantenimiento del vehículo'];
        const c = movements.filter(m => cats.includes(m.categoria)).length;
        return { current: Math.min(c, 5), required: 5 };
    }

    // ── RETO 19: SERVICIOS DEL HOGAR (3 movs) ────────────────────────────
    if (id === 19) {
        const cats = ['Electricidad', 'Agua', 'Gas', 'Internet'];
        const c = movements.filter(m => cats.includes(m.categoria)).length;
        return { current: Math.min(c, 3), required: 3 };
    }

    // ── RETO 20: 5 CATEGORÍAS DISTINTAS ───────────────────────────────────
    if (id === 20) {
        const cats = new Set(movements.map(m => m.categoria).filter(Boolean));
        return { current: Math.min(cats.size, 5), required: 5 };
    }

    // ── RETO 21: PRIMER SALARIO ────────────────────────────────────────────
    if (id === 21) {
        const c = movements.filter(m => m.tipo === 'income' && m.categoria === 'Salario').length;
        return { current: Math.min(c, 1), required: 1 };
    }

    // ── RETO 22: INGRESOS EXTRA ───────────────────────────────────────────
    if (id === 22) {
        const cats = ['Freelance', 'Ventas', 'Trabajo extra', 'Comisiones', 'Propinas', 'Negocio propio', 'Ingresos online'];
        const c = movements.filter(m => m.tipo === 'income' && cats.includes(m.categoria)).length;
        return { current: Math.min(c, 1), required: 1 };
    }

    // ── RETO 23: INVERSIONES ──────────────────────────────────────────────
    if (id === 23) {
        const cats = ['Inversiones', 'Dividendos', 'Intereses'];
        const c = movements.filter(m => cats.includes(m.categoria)).length;
        return { current: Math.min(c, 1), required: 1 };
    }

    // ── RETO 24: 3 FUENTES DE INGRESO DISTINTAS ───────────────────────────
    if (id === 24) {
        const incomeCats = [
            'Salario', 'Trabajo extra', 'Freelance', 'Comisiones', 'Propinas',
            'Ventas', 'Negocio propio', 'Ingresos online', 'Intereses', 'Dividendos', 'Inversiones'
        ];
        const fuentes = new Set(
            movements
                .filter(m => m.tipo === 'income' && incomeCats.includes(m.categoria))
                .map(m => m.categoria)
        );
        return { current: Math.min(fuentes.size, 3), required: 3 };
    }

    // ── RETO 25: MES EQUILIBRADO (±$10) ──────────────────────────────────
    if (id === 25) {
        const bal = monthMovements.reduce((s, m) =>
            m.tipo === 'income' ? s + parseFloat(m.monto) : s - parseFloat(m.monto), 0);
        return { current: Math.abs(bal) < 10 ? 1 : 0, required: 1 };
    }

    // ── RETOS 26-28: BALANCE POSITIVO EN EL MES ───────────────────────────
    if (id === 26 || id === 27 || id === 28) {
        const reqMap = { 26: 100, 27: 500, 28: 1000 };
        const req = reqMap[id];
        const bal = monthMovements.reduce((s, m) =>
            m.tipo === 'income' ? s + parseFloat(m.monto) : s - parseFloat(m.monto), 0);
        return { current: parseFloat(Math.min(Math.max(bal, 0), req).toFixed(2)), required: req };
    }

    // ── RETO 29: EDUCACIÓN ────────────────────────────────────────────────
    if (id === 29) {
        const cats = ['Cursos', 'Libros', 'Material escolar'];
        const c = movements.filter(m => cats.includes(m.categoria)).length;
        return { current: Math.min(c, 1), required: 1 };
    }

    // ── RETO 30: SALUD ────────────────────────────────────────────────────
    if (id === 30) {
        const cats = ['Medicamentos', 'Consultas médicas', 'Seguro médico', 'Gimnasio'];
        const c = movements.filter(m => cats.includes(m.categoria)).length;
        return { current: Math.min(c, 1), required: 1 };
    }

    return { current: 0, required: 1 };
};

// ==========================================
// 1. GET: Retos completados (claimed)
// ==========================================
export const getChallenges = async (req, res) => {
    try {
        const userId = req.params.userId;

        const { data, error } = await supabase
            .from('user_challenges')
            .select('challenge_id')
            .eq('user_id', userId)
            .eq('claimed', true);

        if (error) throw error;

        const completedIds = (data || []).map(row => row.challenge_id);
        res.json({ success: true, completedIds });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener estado de retos.' });
    }
};

// ==========================================
// 2. GET: Progreso real de todos los retos
// ==========================================
export const getAllChallengesProgress = async (req, res) => {
    try {
        const userId = req.params.userId;

        // Una sola consulta a DB para calcular todos los retos
        const { data: allMovements, error } = await supabase
            .from('movements')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;

        const movements = allMovements || [];
        const { start, end } = getMonthRange();
        const monthMovements = movements.filter(m => m.fecha >= start && m.fecha <= end);

        const progress = {};
        for (let id = 1; id <= 30; id++) {
            const p = computeProgress(movements, monthMovements, id);
            progress[id] = {
                current: p.current,
                required: p.required,
                percentage: Math.min(100, Math.round((p.current / p.required) * 100))
            };
        }

        res.json({ success: true, progress });

    } catch (error) {
        console.error('Error en getAllChallengesProgress:', error);
        res.status(500).json({ success: false, message: 'Error al obtener progreso de retos.' });
    }
};

// ==========================================
// 3. POST: Reclamar un reto
// ==========================================
export const claimChallenge = async (req, res) => {
    const { userId, challengeId } = req.body;
    const cId = parseInt(challengeId);

    try {
        // Cargar movimientos y validar progreso
        const { data: allMovements } = await supabase
            .from('movements')
            .select('*')
            .eq('user_id', userId);

        const movements = allMovements || [];
        const { start, end } = getMonthRange();
        const monthMovements = movements.filter(m => m.fecha >= start && m.fecha <= end);

        const prog = computeProgress(movements, monthMovements, cId);
        const cumple = prog.current >= prog.required;

        if (!cumple) {
            const pct = Math.round((prog.current / prog.required) * 100);
            return res.status(400).json({
                success: false,
                message: `Aún no cumples los requisitos. Progreso: ${pct}% (${prog.current} / ${prog.required}).`
            });
        }

        // Registrar reto como completado PRIMERO (insert atómico con restricción unique)
        // Si dos requests llegan simultáneamente, solo uno tendrá éxito en el insert.
        const { error: challengeError } = await supabase
            .from('user_challenges')
            .insert({
                user_id:    userId,
                challenge_id: cId,
                claimed:    true,
                claimed_at: new Date().toISOString()
            });

        // Si ya existe (23505 = unique violation) → ya fue reclamado concurrentemente
        if (challengeError) {
            if (challengeError.code === '23505') {
                return res.status(400).json({ success: false, message: '¡Ya reclamaste este reto anteriormente!' });
            }
            throw challengeError;
        }

        // Solo si el insert fue exitoso otorgamos la recompensa
        const rewardAmount = CHALLENGE_REWARDS[cId] || 5;
        const user = await User.findById(userId);
        const updateData = { wood: (user.wood || 0) + rewardAmount };

        const { error: userError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId);

        if (userError) throw userError;

        const updatedUser = await User.findById(userId);

        res.json({
            success: true,
            message: `¡Reto completado! Ganaste ${rewardAmount} Madera 🪵`,
            new_stats: { coins: updatedUser.coins, wood: updatedUser.wood }
        });

    } catch (error) {
        console.error('Error en claimChallenge:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor.' });
    }
};