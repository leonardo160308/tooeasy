import { supabase, supabaseAdmin } from '../config/supabase.js';

class User {

    // 1. CREAR usuario
    static async create(userData) {
        const { nombre, email, password_hash, edad, genero, foto } = userData;

        const { data, error } = await supabase
            .from('users')
            .insert({ nombre, email, password_hash, edad, genero, foto })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                const dupError = new Error(error.message);
                dupError.code = 'ER_DUP_ENTRY';
                throw dupError;
            }
            throw error;
        }

        return data;
    }

    // 2. BUSCAR por ID
    static async findById(id) {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return data;
    }

    // 3. ACTUALIZAR
    static async update(id, updateData) {
        const allowedFields = [
            'nombre', 'password_hash', 'edad', 'genero', 'foto',
            'level', 'coins', 'wood', 'dashboard_balance',
            'house_level', 'beaver_level', 'current_appearance', 'current_beaver',
            'email_verified', 'email_verified_at', 'is_active',
            'failed_login_attempts', 'locked_until', 'last_login_at'
        ];

        const filteredData = {};
        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key)) {
                filteredData[key] = updateData[key];
            }
        });

        if (Object.keys(filteredData).length === 0) {
            console.warn('UserModel.update: no hay campos válidos para actualizar');
            return { affectedRows: 0, data: null };
        }

        const { data, error } = await supabase
            .from('users')
            .update(filteredData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                const field = error.message.includes('nombre') ? 'nombre de usuario' : 'correo';
                const friendly = new Error(`Ese ${field} ya está en uso.`);
                friendly.code = 'ER_DUP_ENTRY';
                throw friendly;
            }
            if (error.code === 'PGRST116') {
                return { affectedRows: 0, data: null };
            }
            throw error;
        }

        return { affectedRows: data ? 1 : 0, data };
    }

    // 4. ELIMINAR (DELETE directo)
    // NOTA: Antes se usaba update({ is_active: false }) pero el trigger
    // trg_hard_delete_on_deactivate cancelaba el UPDATE (RETURN NULL) y
    // Supabase lanzaba PGRST116 al no recibir filas, causando un 500.
    // Solución: DELETE directo que bypasea el trigger.
    static async deleteLogical(id) {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return { affectedRows: 1 };
    }
}

export default User;