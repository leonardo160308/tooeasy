import db from '../config/db.js';

// GET: Obtener datos fijos (Meta y Sueldo)
export const getDashboardFixed = async (req, res) => {
    try {
        const { userId } = req.params;
        const [rows] = await db.execute('SELECT * FROM dashboard_fixed WHERE user_id = ?', [userId]);
        
        // Si no existe, devolvemos valores en cero
        const data = rows[0] || { ingreso_fijo: 0, egreso_fijo: 0, meta_nombre: '', meta_cantidad: 0 };
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PUT: Guardar/Actualizar datos fijos
export const updateDashboardFixed = async (req, res) => {
    try {
        const { userId } = req.params;
        const { ingreso_fijo, egreso_fijo, meta_nombre, meta_cantidad } = req.body;

        // Verificar si ya existe registro para ese usuario
        const [exists] = await db.execute('SELECT id FROM dashboard_fixed WHERE user_id = ?', [userId]);

        if (exists.length > 0) {
            // Actualizar (UPDATE)
            await db.execute(
                `UPDATE dashboard_fixed SET 
                 ingreso_fijo = ?, egreso_fijo = ?, meta_nombre = ?, meta_cantidad = ? 
                 WHERE user_id = ?`,
                [ingreso_fijo, egreso_fijo, meta_nombre, meta_cantidad, userId]
            );
        } else {
            // Crear (INSERT)
            await db.execute(
                `INSERT INTO dashboard_fixed (user_id, ingreso_fijo, egreso_fijo, meta_nombre, meta_cantidad) 
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, ingreso_fijo, egreso_fijo, meta_nombre, meta_cantidad]
            );
        }

        res.json({ success: true, message: 'Dashboard actualizado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};