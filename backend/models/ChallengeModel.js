// models/ChallengeModel.js

const db = require('../db');

class ChallengeModel {
    // Retorna todos los retos disponibles (lista estática)
    static async getAllChallenges() {
        // En una implementación real, esto consultaría una tabla 'challenges'
        // Pero para simplificar, usaremos los datos fijos del frontend como referencia.
        // Si necesitas una BD real, la tabla 'challenges' solo tendría (id, title, reward_wood, reward_coins).
        return new Promise(resolve => resolve([])); // Por ahora, retornamos vacío ya que el frontend tiene los datos
    }

    // 1. Obtener los IDs de los retos completados por un usuario
    static async getCompletedChallenges(userId) {
        const [rows] = await db.query(
            'SELECT challenge_id FROM user_challenges WHERE user_id = ?',
            [userId]
        );
        // Retorna un array de IDs (ej: [1, 3, 5])
        return rows.map(row => row.challenge_id);
    }

    // 2. Marcar un reto como completado (Agrega la recompensa y registra el logro)
    static async completeChallengeAndReward(userId, challengeId, rewardWood, rewardCoins) {
        // Usamos una transacción para asegurar que ambos pasos se ejecuten o ninguno
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // A. Registrar el reto como completado en 'user_challenges'
            await connection.query(
                'INSERT INTO user_challenges (user_id, challenge_id, completed_at) VALUES (?, ?, NOW())',
                [userId, challengeId]
            );

            // B. Aplicar las recompensas (sumar madera y monedas) en la tabla 'users'
            await connection.query(
                'UPDATE users SET wood = wood + ?, coins = coins + ? WHERE id = ?',
                [rewardWood, rewardCoins, userId]
            );

            // C. Obtener el nuevo estado de recursos del usuario para retornar al frontend
            const [updatedUser] = await connection.query(
                'SELECT wood, coins FROM users WHERE id = ?',
                [userId]
            );

            await connection.commit();
            return updatedUser[0];

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // 3. Verificar si el reto ya fue completado
    static async hasCompletedChallenge(userId, challengeId) {
        const [rows] = await db.query(
            'SELECT 1 FROM user_challenges WHERE user_id = ? AND challenge_id = ?',
            [userId, challengeId]
        );
        return rows.length > 0;
    }

    // 4. (Opcional, pero necesario para la validación de retos)
    // El backend necesita una forma de verificar si la condición del reto se cumple.
    // Esto es un placeholder, ya que la validación depende de tu tabla de 'movimientos'.
    static async checkChallengeCompletionCriteria(userId, challengeId) {
        // EJEMPLO: Si el reto 1 es 'Registro de Gastos Semanales' (7 movimientos)
        if (challengeId === 1) {
            // Ejemplo: Contar movimientos recientes del usuario
            const [rows] = await db.query(
                'SELECT COUNT(*) as count FROM movements WHERE user_id = ? AND date >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
                [userId]
            );
            return rows[0].count >= 7; // Retorna true si tiene 7 o más
        }
        
        // EJEMPLO: Si el reto 2 es 'Ahorro Básico' (10% del ingreso en Ahorro)
        if (challengeId === 2) {
            // Lógica compleja que necesitaría más datos de tu BD (ingresos totales, movimientos de ahorro, etc.)
            // Por simplicidad, retornaremos TRUE por defecto en el controlador, pero esta es la función donde iría la lógica REAL.
            return true; 
        }

        return true; // Retorna true si no hay validación específica (e.g. "clic y listo")
    }
}

module.exports = ChallengeModel;