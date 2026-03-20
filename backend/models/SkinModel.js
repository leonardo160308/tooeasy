import db from '../config/db.js';

class Skin {
    // R: Obtener todas las skins disponibles (para mostrar en la tienda)
    static async getAll() {
        // Podrías añadir un WHERE si solo quieres mostrar skins comprables
        const query = 'SELECT id, tipo, nombre, imagen, unlock_level FROM skins ORDER BY tipo, unlock_level ASC';
        try {
            const [rows] = await db.execute(query);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // R: Obtener una skin específica por ID (para verificar precio antes de comprar)
    static async getById(skinId) {
        const query = 'SELECT id, tipo, nombre, imagen, unlock_level FROM skins WHERE id = ?';
        try {
            const [rows] = await db.execute(query, [skinId]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }
    
    // R: Verificar si el usuario ya tiene la skin
    static async userHasSkin(userId, skinId) {
        const query = 'SELECT 1 FROM user_skins WHERE user_id = ? AND skin_id = ?';
        try {
            const [rows] = await db.execute(query, [userId, skinId]);
            // Si rows tiene un elemento, significa que la encontró (TRUE)
            return rows.length > 0;
        } catch (error) {
            throw error;
        }
    }

    // C: Registrar la compra de la skin (Añadir a la tabla user_skins)
    static async addSkinToUser(userId, skinId) {
        const query = 'INSERT INTO user_skins (user_id, skin_id) VALUES (?, ?)';
        try {
            const [result] = await db.execute(query, [userId, skinId]);
            return result.insertId;
        } catch (error) {
            // Manejar error de duplicidad (si el usuario ya tiene la skin)
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error("Ya posees esta skin.");
            }
            throw error;
        }
    }
}

export default Skin;