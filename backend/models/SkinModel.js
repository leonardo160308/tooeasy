import { supabase } from '../config/supabase.js';

class Skin {

    // Obtener todas las skins
    static async getAll() {
        const { data, error } = await supabase
            .from('skins')
            .select('id, tipo, nombre, imagen, unlock_level')
            .order('tipo')
            .order('unlock_level');

        if (error) throw error;
        return data || [];
    }

    // Obtener skin por ID
    static async getById(skinId) {
        const { data, error } = await supabase
            .from('skins')
            .select('id, tipo, nombre, imagen, unlock_level')
            .eq('id', skinId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return data;
    }

    // Verificar si el usuario ya tiene la skin
    static async userHasSkin(userId, skinId) {
        const { data, error } = await supabase
            .from('user_skins')
            .select('id')
            .eq('user_id', userId)
            .eq('skin_id', skinId);

        if (error) throw error;
        return data && data.length > 0;
    }

    // Agregar skin al usuario
    static async addSkinToUser(userId, skinId) {
        const { data, error } = await supabase
            .from('user_skins')
            .insert({ user_id: userId, skin_id: skinId })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                throw new Error('Ya posees esta skin.');
            }
            throw error;
        }

        return data.id;
    }
}

export default Skin;