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
        console.error('Error en getDashboardFixed:', error);
        res.status(500).json({ success: false, message: 'Error al obtener el dashboard.' });
    }
};

// PUT: Guardar/Actualizar datos fijos
export const updateDashboardFixed = async (req, res) => {
    try {
        const { userId } = req.params;
        const { ingreso_fijo, egreso_fijo, meta_nombre, meta_cantidad } = req.body;

        // Validar campos numéricos
        const ingresoNum  = Number(ingreso_fijo)  || 0;
        const egresoNum   = Number(egreso_fijo)   || 0;
        const metaNum     = Number(meta_cantidad) || 0;
        const metaNomStr  = typeof meta_nombre === 'string' ? meta_nombre.slice(0, 100).trim() : '';

        if (ingresoNum < 0 || egresoNum < 0 || metaNum < 0) {
            return res.status(400).json({ success: false, message: 'Los valores no pueden ser negativos.' });
        }
        if (ingresoNum > 99999999 || egresoNum > 99999999 || metaNum > 99999999) {
            return res.status(400).json({ success: false, message: 'Los valores exceden el máximo permitido.' });
        }

        // UPSERT — Supabase maneja insert o update en una sola operación
        const { error } = await supabase
            .from('dashboard_fixed')
            .upsert(
                { user_id: userId, ingreso_fijo: ingresoNum, egreso_fijo: egresoNum, meta_nombre: metaNomStr, meta_cantidad: metaNum },
                { onConflict: 'user_id' }
            );

        if (error) throw error;

        res.json({ success: true, message: 'Dashboard actualizado' });

    } catch (error) {
        console.error('Error en updateDashboardFixed:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el dashboard.' });
    }
};