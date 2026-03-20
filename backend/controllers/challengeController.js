import db from '../config/db.js';
import User from '../models/UserModel.js';

// --- FUNCIÓN AUXILIAR: REGLAS DEL JUEGO ---
// Aquí es donde defines qué debe hacer el usuario para cumplir cada reto.
const checkCompletionCriteria = async (userId, challengeId) => {
    try {
        // RETO 1: "Registro de Gastos" (Tener al menos 5 movimientos registrados en total)
        if (challengeId === 1) { 
            const [rows] = await db.execute(
                'SELECT COUNT(*) as count FROM movements WHERE user_id = ?', 
                [userId]
            );
            // Retorna TRUE si tiene 5 o más movimientos
            return rows[0].count >= 5; 
        }

        // RETO 2: "Ahorrador Novato" (Tener un balance positivo en el mes actual)
        if (challengeId === 2) {
            // Sumamos ingresos y restamos egresos del mes actual
            const query = `
                SELECT 
                    SUM(CASE WHEN tipo = 'income' THEN monto ELSE 0 END) - 
                    SUM(CASE WHEN tipo = 'expense' THEN monto ELSE 0 END) as balance
                FROM movements 
                WHERE user_id = ? AND MONTH(fecha) = MONTH(CURRENT_DATE())
            `;
            const [rows] = await db.execute(query, [userId]);
            const balance = parseFloat(rows[0].balance || 0);
            return balance > 0;
        }

        // RETO 3: "Eliminar Deuda" (Registrar al menos un gasto en categoría 'Deuda' o 'Pagos')
        if (challengeId === 3) {
            const [rows] = await db.execute(
                "SELECT COUNT(*) as count FROM movements WHERE user_id = ? AND tipo = 'expense' AND (categoria LIKE '%Deuda%' OR categoria LIKE '%Pago%')",
                [userId]
            );
            return rows[0].count > 0;
        }

        // Para otros retos (IDs 4, 5, etc.), por defecto retornamos TRUE 
        // (Para que sean fáciles de completar mientras programas más reglas)
        return true; 

    } catch (error) {
        console.error("Error validando criterio:", error);
        return false;
    }
};


// --- CONTROLADORES EXPORTADOS ---

// 1. GET: Obtener estado de los retos (Cuáles ya completó el usuario)
export const getChallenges = async (req, res) => {
    try {
        const userId = req.params.userId;

        // Consultamos la tabla intermedia para ver qué ha reclamado este usuario
        const query = `
            SELECT challenge_id 
            FROM user_challenges 
            WHERE user_id = ? AND claimed = 1
        `;
        
        const [rows] = await db.execute(query, [userId]);
        
        // Convertimos la respuesta [{challenge_id: 1}, {challenge_id: 3}] a [1, 3]
        const completedIds = rows.map(row => row.challenge_id);

        res.json({ success: true, completedIds });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener estado de retos.' });
    }
};


// 2. POST: Intentar completar un reto y recibir recompensa
export const claimChallenge = async (req, res) => {
    const { userId, challengeId } = req.body;
    let connection = null;

    try {
        // A. Obtener información del reto (cuánto paga) de la BD
        // Nota: Asumimos que los IDs de la BD coinciden con los del Frontend
        // Si no tienes los retos en BD, puedes usar un objeto estático aquí.
        const [challenges] = await db.execute('SELECT * FROM challenges WHERE id = ?', [challengeId]);
        
        // Si no existe en BD, usamos datos por defecto para que no falle tu prueba
        const challenge = challenges[0] || { 
            id: challengeId, 
            titulo: 'Reto Genérico', 
            reward_currency: 'wood', // Por defecto madera
            reward_amount: 10 
        };

        // B. Verificar si ya fue reclamado
        const [existing] = await db.execute(
            'SELECT claimed FROM user_challenges WHERE user_id = ? AND challenge_id = ?', 
            [userId, challengeId]
        );

        if (existing.length > 0 && existing[0].claimed) {
            return res.status(400).json({ success: false, message: '¡Ya reclamaste este reto anteriormente!' });
        }

        // C. VALIDAR SI CUMPLE LOS REQUISITOS (Lógica de Juego)
        const cumpleRequisitos = await checkCompletionCriteria(userId, parseInt(challengeId));

        if (!cumpleRequisitos) {
            return res.status(400).json({ 
                success: false, 
                message: 'Aún no cumples los requisitos de este reto. ¡Revisa tus movimientos!' 
            });
        }

        // D. INICIAR TRANSACCIÓN (Para asegurar que se den los recursos Y se marque completado al mismo tiempo)
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Actualizar recursos del usuario (Madera o Monedas)
        let updateQuery = '';
        if (challenge.reward_currency === 'wood') {
            updateQuery = 'UPDATE users SET wood = wood + ? WHERE id = ?';
        } else {
            updateQuery = 'UPDATE users SET coins = coins + ? WHERE id = ?';
        }
        
        await connection.execute(updateQuery, [challenge.reward_amount, userId]);

        // 2. Registrar el reto como completado
        await connection.execute(
            `INSERT INTO user_challenges (user_id, challenge_id, claimed, claimed_at) 
             VALUES (?, ?, 1, NOW()) 
             ON DUPLICATE KEY UPDATE claimed = 1, claimed_at = NOW()`,
            [userId, challengeId]
        );

        await connection.commit(); // Confirmar cambios

        // E. Obtener nuevos saldos para actualizar el Frontend
        const [updatedUser] = await db.execute('SELECT coins, wood FROM users WHERE id = ?', [userId]);

        res.json({ 
            success: true, 
            message: `¡Reto completado! Ganaste ${challenge.reward_amount} de ${challenge.reward_currency === 'wood' ? 'Madera 🪵' : 'Monedas 🪙'}.`,
            new_stats: updatedUser[0]
        });

    } catch (error) {
        if (connection) await connection.rollback(); // Deshacer cambios si hay error
        console.error("Error en completeChallenge:", error);
        res.status(500).json({ success: false, message: 'Error en el servidor.', error: error.message });
    } finally {
        if (connection) connection.release(); // Liberar conexión
    }
};