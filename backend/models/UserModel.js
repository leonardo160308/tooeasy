import db from '../config/db.js';

class User {
    // 1. CREAR (Create): Registra un nuevo usuario
    static async create(userData) {
        // Desestructurar datos para asegurar el orden de los parámetros en la consulta
        const { nombre, password_hash, edad, genero, foto } = userData;
        
        const query = `
            INSERT INTO users (nombre, password_hash, edad, genero, foto) 
            VALUES (?, ?, ?, ?, ?)
        `;

        try {
            // Ejecutamos la consulta. 'result' contiene metadatos como insertId.
            const [result] = await db.execute(query, [nombre, password_hash, edad, genero, foto]);
            
            // Devolvemos el ID generado y el resto de los datos
            return { id: result.insertId, ...userData };
        } catch (error) {
            // Re-lanzar el error para que sea manejado por el controlador (ej. duplicidad de email)
            throw error;
        }
    }

    // 2. LEER (Read): Buscar usuario por ID (útil para el perfil)
    static async findById(id) {
        const query = 'SELECT * FROM users WHERE id = ?';
        try {
            // Ejecutamos la consulta. 'rows' es el primer elemento del resultado y contiene los datos.
            const [rows] = await db.execute(query, [id]);
            // Devolvemos la primera fila encontrada (el usuario)
            return rows[0]; 
        } catch (error) {
            throw error;
        }
    }
    
    // 3. ACTUALIZAR (Update): Para monedas, nivel, avatar, etc.
   // 3. ACTUALIZAR (Update): Para monedas, nivel, avatar, etc.
    static async update(id, updateData) {
        // Lista de campos permitidos para actualizar (SEGURIDAD)
        const allowedFields = [
            'nombre', 'password_hash', 'edad', 'genero', 'foto',
            'level', 'coins', 'wood', 
            'house_level', 'beaver_level',
            'current_appearance', 'current_beaver'
        ];
        
        // Filtrar solo campos permitidos
        const filteredData = {};
        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key)) {
                filteredData[key] = updateData[key];
            }
        });
        
        // Genera la parte 'SET campo = ?' dinámicamente
        const fields = Object.keys(filteredData).map(key => `${key} = ?`).join(', ');
        const values = Object.values(filteredData);
        
        if (fields.length === 0) {
            console.warn('No hay campos válidos para actualizar');
            return null;
        }

        // La consulta final incluye el ID al final del SET
        const query = `UPDATE users SET ${fields} WHERE id = ?`;
        
        try {
            console.log('Ejecutando UPDATE:', query, [...values, id]);
            const [result] = await db.execute(query, [...values, id]);
            return result;
        } catch (error) {
            console.error('Error en User.update:', error);
            throw error;
        }
    }

    // 4. BORRAR (Delete Lógico): Cambiar is_active a false
// 4. BORRAR (Delete Lógico): Cambiar is_active a false
    static async deleteLogical(id) {
        const query = 'UPDATE users SET is_active = 0 WHERE id = ?';
        try {
            console.log('Ejecutando baja lógica para usuario:', id); // Debug
            const [result] = await db.execute(query, [id]);
            console.log('Resultado:', result); // Debug
            return result;
        } catch (error) {
            console.error('Error en deleteLogical:', error);
            throw error;
        }
    }
}

export default User;