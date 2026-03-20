import { supabase } from '../config/supabase.js';

// GET: Obtener datos fijos (Meta y Sueldo)
export const getDashboardFixed = async (req, res) => {
    try {
        const { userId } = req.params;

        const { data, error } = await supabase
            .from('dashboard_fixed')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        const result = data || { ingreso_fijo: 0, egreso_fijo: 0, meta_nombre: '', meta_cantidad: 0 };
        res.json({ success: true, data: result });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PUT: Guardar/Actualizar datos fijos
export const updateDashboardFixed = async (req, res) => {
    try {
        const { userId } = req.params;
        const { ingreso_fijo, egreso_fijo, meta_nombre, meta_cantidad } = req.body;

        // Verificar si ya existe
        const { data: existing } = await supabase
            .from('dashboard_fixed')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (existing) {
            // UPDATE
            const { error } = await supabase
                .from('dashboard_fixed')
                .update({ ingreso_fijo, egreso_fijo, meta_nombre, meta_cantidad })
                .eq('user_id', userId);

            if (error) throw error;
        } else {
            // INSERT
            const { error } = await supabase
                .from('dashboard_fixed')
                .insert({ user_id: userId, ingreso_fijo, egreso_fijo, meta_nombre, meta_cantidad });

            if (error) throw error;
        }

        res.json({ success: true, message: 'Dashboard actualizado' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};