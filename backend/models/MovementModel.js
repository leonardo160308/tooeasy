// backend/models/MovementModel.js

import db from '../config/db.js';

class Movement {
    // ========================================
    // 1. CREAR (Create): Registra un nuevo movimiento
    // ========================================
    static async create(movementData) {
        const { user_id, fecha, tipo, categoria, monto, descripcion } = movementData;
        
        const query = `
            INSERT INTO movements (user_id, fecha, tipo, categoria, monto, descripcion) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        try {
            const [result] = await db.execute(query, [
                user_id, 
                fecha, 
                tipo, 
                categoria || 'General', 
                monto, 
                descripcion || null
            ]);
            
            return { id: result.insertId, ...movementData };
        } catch (error) {
            console.error('Error en Movement.create:', error);
            throw error;
        }
    }

    // ========================================
    // 2. LEER (Read): Obtener historial de un usuario
    // ========================================
    static async getByUserId(userId) {
        const query = `
            SELECT * FROM movements 
            WHERE user_id = ? 
            ORDER BY fecha DESC, created_at DESC
        `;
        
        try {
            const [rows] = await db.execute(query, [userId]);
            return rows;
        } catch (error) {
            console.error('Error en Movement.getByUserId:', error);
            throw error;
        }
    }
    
    // ========================================
    // 3. LEER TOTALES (Read): Calcular ingresos vs gastos
    // ========================================
    static async getTotalsByUserId(userId) {
        const query = `
            SELECT 
                tipo, 
                SUM(monto) as total 
            FROM movements 
            WHERE user_id = ? 
            GROUP BY tipo
        `;
        
        try {
            const [rows] = await db.execute(query, [userId]);
            
            // Formatear los resultados
            const totals = { income: 0, expense: 0 };
            rows.forEach(row => {
                totals[row.tipo] = parseFloat(row.total) || 0;
            });
            
            return totals;
        } catch (error) {
            console.error('Error en Movement.getTotalsByUserId:', error);
            throw error;
        }
    }
    
    // ========================================
    // 4. BUSCAR POR ID (Read): Obtener un movimiento específico
    // ⬅️ MÉTODO AÑADIDO (necesario para deleteMovement)
    // ========================================
    static async findById(movementId, userId) {
        const query = `
            SELECT * FROM movements 
            WHERE id = ? AND user_id = ?
        `;
        
        try {
            const [rows] = await db.execute(query, [movementId, userId]);
            return rows[0]; // Retorna el primer resultado o undefined
        } catch (error) {
            console.error('Error en Movement.findById:', error);
            throw error;
        }
    }
    
    // ========================================
    // 5. BORRAR (Delete): Eliminar un movimiento
    // ========================================
    static async deleteById(movementId, userId) {
        // Importante: Incluir user_id en el DELETE para seguridad
        const query = `
            DELETE FROM movements 
            WHERE id = ? AND user_id = ?
        `;
        
        try {
            const [result] = await db.execute(query, [movementId, userId]);
            return result;
        } catch (error) {
            console.error('Error en Movement.deleteById:', error);
            throw error;
        }
    }
}

export default Movement;