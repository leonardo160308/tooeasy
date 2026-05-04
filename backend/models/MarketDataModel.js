// backend/models/MarketDataModel.js
import { supabaseAdmin } from '../config/supabase.js';

class MarketDataModel {

    // Retorna { instrumento_id: { tasa_base, volatilidad, fuente, last_updated } }
    static async getAllParameters() {
        const { data, error } = await supabaseAdmin
            .from('market_parameters')
            .select('instrumento_id, tasa_base, volatilidad, fuente, last_updated')
            .order('instrumento_id');
        if (error) throw error;
        return Object.fromEntries((data || []).map(r => [r.instrumento_id, r]));
    }

    static async upsertParameter(instrId, tasa_base, volatilidad, fuente, datosExtra = {}) {
        const { error } = await supabaseAdmin
            .from('market_parameters')
            .upsert({
                instrumento_id: instrId,
                tasa_base,
                volatilidad,
                fuente,
                last_updated: fuente === 'static' ? null : new Date().toISOString(),
                datos_extra:  datosExtra
            }, { onConflict: 'instrumento_id' });
        if (error) throw error;
    }

    // Inserta múltiples filas en un solo round-trip
    static async upsertMany(rows) {
        const { error } = await supabaseAdmin
            .from('market_parameters')
            .upsert(rows, { onConflict: 'instrumento_id' });
        if (error) throw error;
    }

    // Devuelve true si algún instrumento de la API tiene > maxAgeHours de antigüedad
    static async isStale(maxAgeHours = 24) {
        const { data, error } = await supabaseAdmin
            .from('market_parameters')
            .select('last_updated')
            .eq('fuente', 'alpha_vantage')
            .order('last_updated', { ascending: true })
            .limit(1);
        if (error || !data?.length) return true;
        const oldest = new Date(data[0].last_updated);
        const cutoff = new Date(Date.now() - maxAgeHours * 3600 * 1000);
        return oldest < cutoff;
    }
}

export default MarketDataModel;
