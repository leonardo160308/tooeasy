import { supabase } from '../config/supabase.js';

class Movement {

    // 1. CREAR movimiento
    static async create(movementData) {
        const { user_id, fecha, tipo, categoria, monto, descripcion } = movementData;

        const { data, error } = await supabase
            .from('movements')
            .insert({
                user_id,
                fecha,
                tipo,
                categoria: categoria || 'General',
                monto,
                descripcion: descripcion || null
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // 2. BUSCAR por usuario (alias findByUserId)
    static async findByUserId(userId) {
        const { data, error } = await supabase
            .from('movements')
            .select('*')
            .eq('user_id', userId)
            .order('fecha', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    // 3. BUSCAR por usuario (alias getByUserId)
    static async getByUserId(userId) {
        return this.findByUserId(userId);
    }

    // 4. TOTALES por usuario
    static async getTotalsByUserId(userId) {
        const movements = await this.findByUserId(userId);

        const totals = { income: 0, expense: 0 };
        movements.forEach(m => {
            const monto = parseFloat(m.monto) || 0;
            if (m.tipo === 'income') totals.income += monto;
            else if (m.tipo === 'expense') totals.expense += monto;
        });

        return totals;
    }

    // 5. BUSCAR por ID
    static async findById(movementId) {
        const { data, error } = await supabase
            .from('movements')
            .select('*')
            .eq('id', movementId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return data;
    }

    // 6. ELIMINAR por ID con usuario
    static async deleteById(movementId, userId) {
        const { error } = await supabase
            .from('movements')
            .delete()
            .eq('id', movementId)
            .eq('user_id', userId);

        if (error) throw error;
        return { affectedRows: 1 };
    }

    // Alias para compatibilidad
    static async delete(movementId) {
        const { error } = await supabase
            .from('movements')
            .delete()
            .eq('id', movementId);

        if (error) throw error;
        return { affectedRows: 1 };
    }

    // 7. ACTUALIZAR tipo, categoria y monto
    static async update(movementId, updateData) {
        const { tipo, categoria, monto } = updateData;

        const { data, error } = await supabase
            .from('movements')
            .update({ tipo, categoria, monto })
            .eq('id', movementId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

export default Movement;