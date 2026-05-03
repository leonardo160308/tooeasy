// backend/models/KbModel.js
import { supabaseAdmin } from '../config/supabase.js';

class KbModel {

    static async getPublished() {
        const { data, error } = await supabaseAdmin
            .from('kb_articles')
            .select('id, title, tags, created_at')
            .eq('is_published', true)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    static async getById(id) {
        const { data, error } = await supabaseAdmin
            .from('kb_articles')
            .select('*')
            .eq('id', id)
            .eq('is_published', true)
            .single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    }

    static async search(query) {
        const { data, error } = await supabaseAdmin
            .from('kb_articles')
            .select('id, title, tags')
            .eq('is_published', true)
            .ilike('title', `%${query}%`);
        if (error) throw error;
        return data || [];
    }

    static async create({ title, content, tags, createdBy }) {
        const { data, error } = await supabaseAdmin
            .from('kb_articles')
            .insert({ title, content, tags, created_by: createdBy })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    static async listMacros() {
        const { data, error } = await supabaseAdmin
            .from('support_macros')
            .select('id, title, body, created_at')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    static async createMacro({ title, body, createdBy }) {
        const { data, error } = await supabaseAdmin
            .from('support_macros')
            .insert({ title, body, created_by: createdBy })
            .select()
            .single();
        if (error) throw error;
        return data;
    }
}

export default KbModel;
