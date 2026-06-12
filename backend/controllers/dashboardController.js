import { supabase } from '../config/supabase.js';

const VALID_METHODS = ['automatic_50_30_20', 'percentage', 'manual'];

// GET: Obtener datos fijos (Meta y Sueldo)
export const getDashboardFixed = async (req, res) => {
    try {
        const { userId } = req.params;

        if (Number(userId) !== req.userId) {
            return res.status(403).json({ success: false, message: 'Acceso denegado.' });
        }

        const { data, error } = await supabase
            .from('dashboard_fixed')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        const result = data || {
            ingreso_fijo: 0, egreso_fijo: 0, meta_nombre: '', meta_cantidad: 0,
            saving_method: 'automatic_50_30_20', saving_percentage: null, manual_saving_amount: null
        };
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

        if (Number(userId) !== req.userId) {
            return res.status(403).json({ success: false, message: 'Acceso denegado.' });
        }

        const {
            ingreso_fijo, egreso_fijo, meta_nombre, meta_cantidad,
            saving_method, saving_percentage, manual_saving_amount
        } = req.body;

        const ingresoNum = Number(ingreso_fijo)  || 0;
        const egresoNum  = Number(egreso_fijo)   || 0;
        const metaNum    = Number(meta_cantidad) || 0;
        const metaNomStr = typeof meta_nombre === 'string' ? meta_nombre.slice(0, 100).trim() : '';

        if (ingresoNum < 0 || egresoNum < 0 || metaNum < 0) {
            return res.status(400).json({ success: false, message: 'Los valores no pueden ser negativos.' });
        }
        if (ingresoNum > 99999999 || egresoNum > 99999999 || metaNum > 99999999) {
            return res.status(400).json({ success: false, message: 'Los valores exceden el máximo permitido.' });
        }

        const methodStr = VALID_METHODS.includes(saving_method) ? saving_method : 'automatic_50_30_20';

        let pctNum = null;
        if (methodStr === 'percentage') {
            pctNum = Number(saving_percentage);
            if (!Number.isFinite(pctNum) || pctNum < 0 || pctNum > 100) {
                return res.status(400).json({ success: false, message: 'El porcentaje debe estar entre 0 y 100.' });
            }
            pctNum = Math.round(pctNum * 100) / 100;
        }

        let manualNum = null;
        if (methodStr === 'manual') {
            manualNum = Number(manual_saving_amount);
            if (!Number.isFinite(manualNum) || manualNum < 0) {
                return res.status(400).json({ success: false, message: 'El monto de ahorro no puede ser negativo.' });
            }
            if (manualNum > 99999999.99) {
                return res.status(400).json({ success: false, message: 'El monto excede el máximo permitido (8 dígitos enteros y 2 decimales).' });
            }
            manualNum = Math.round(manualNum * 100) / 100;
            if (manualNum > 0 && ingresoNum > 0 && manualNum > ingresoNum) {
                return res.status(400).json({
                    success: false,
                    message: `La cantidad de ahorro ($${manualNum.toFixed(2)}) no puede ser mayor a tu ingreso mensual fijo ($${ingresoNum.toFixed(2)}).`
                });
            }
        }

        const { error } = await supabase
            .from('dashboard_fixed')
            .upsert(
                {
                    user_id: userId,
                    ingreso_fijo: ingresoNum,
                    egreso_fijo: egresoNum,
                    meta_nombre: metaNomStr,
                    meta_cantidad: metaNum,
                    saving_method: methodStr,
                    saving_percentage: pctNum,
                    manual_saving_amount: manualNum
                },
                { onConflict: 'user_id' }
            );

        if (error) throw error;

        res.json({ success: true, message: 'Dashboard actualizado' });

    } catch (error) {
        console.error('Error en updateDashboardFixed:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el dashboard.' });
    }
};