// backend/models/InversionModel.js
import { supabase, supabaseAdmin } from '../config/supabase.js';

class InversionModel {

    // ── Configuración ─────────────────────────────────────────────────────────
    static async getSettings(userId) {
        const { data, error } = await supabase
            .from('investment_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return { inflacion: 4.50 };
            throw error;
        }
        return data;
    }

    static async upsertSettings(userId, inflacion) {
        const { data, error } = await supabaseAdmin
            .from('investment_settings')
            .upsert(
                { user_id: userId, inflacion, updated_at: new Date().toISOString() },
                { onConflict: 'user_id' }
            )
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // ── Historial ─────────────────────────────────────────────────────────────
    static async getHistorial(userId, limit = 20) {
        const { data, error } = await supabase
            .from('investment_simulations')
            .select(`
                id, nombre, capital_inicial, plazo_anios, aportacion_mensual,
                num_instrumentos, riesgo_global, capital_final, total_aportado,
                ganancia_total, rendimiento_pct, capital_final_real, created_at,
                simulation_instruments(instrumento_id, instrumento_nombre, riesgo, posicion, capital_final, rendimiento_pct)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }

    static async getSimulacion(id, userId) {
        const { data, error } = await supabase
            .from('investment_simulations')
            .select('*, simulation_instruments(*)')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    }

    // ── Guardar ───────────────────────────────────────────────────────────────
    static async saveSimulacion(userId, simulacionData, instrumentosData) {
        const { data: sim, error: simError } = await supabaseAdmin
            .from('investment_simulations')
            .insert({ user_id: userId, ...simulacionData })
            .select()
            .single();

        if (simError) throw simError;

        if (instrumentosData?.length > 0) {
            const rows = instrumentosData.map(i => ({ simulation_id: sim.id, ...i }));
            const { error: instrError } = await supabaseAdmin
                .from('simulation_instruments')
                .insert(rows);
            if (instrError) throw instrError;
        }

        return sim;
    }

    // ── Eliminar ──────────────────────────────────────────────────────────────
    static async deleteSimulacion(id, userId) {
        const { error } = await supabaseAdmin
            .from('investment_simulations')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
        return { success: true };
    }
}

export default InversionModel;