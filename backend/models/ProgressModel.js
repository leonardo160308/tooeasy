// backend/models/ProgressModel.js
import { supabase, supabaseAdmin } from '../config/supabase.js';

class ProgressModel {

    // ── Get all category progress for a user ────────────────────────────
    // Returns: [{ category_id, completed_levels: [levelId, ...] }, ...]
    static async getAllProgressForUser(userId) {
        const { data, error } = await supabase
            .from('user_category_progress')
            .select('category_id, completed_levels')
            .eq('user_id', userId);

        if (error) throw error;
        return data || [];
    }

    // ── Get progress for one category ────────────────────────────────────
    // Returns: number[]  (array of completed level IDs)
    static async getCategoryProgress(userId, categoryId) {
        const { data, error } = await supabase
            .from('user_category_progress')
            .select('completed_levels')
            .eq('user_id', userId)
            .eq('category_id', categoryId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return []; // no row yet → empty
            throw error;
        }
        return (data?.completed_levels || []).map(Number);
    }

    // ── Mark a level as complete for a user ─────────────────────────────
    // Returns: { alreadyCompleted: boolean, completedLevels: number[] }
    static async completeLevel(userId, categoryId, levelId) {
        const lvlId = Number(levelId);
        const catId = Number(categoryId);
        const uid   = Number(userId);

        // Fetch current progress
        const { data: existing, error: fetchErr } = await supabase
            .from('user_category_progress')
            .select('completed_levels')
            .eq('user_id', uid)
            .eq('category_id', catId)
            .single();

        if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;

        const currentLevels = (existing?.completed_levels || []).map(Number);

        // Idempotent: already completed
        if (currentLevels.includes(lvlId)) {
            return { alreadyCompleted: true, completedLevels: currentLevels };
        }

        const updatedLevels = [...currentLevels, lvlId];

        // Upsert — insert row if not exists, update completed_levels if it does
        const { error: upsertErr } = await supabaseAdmin
            .from('user_category_progress')
            .upsert(
                { user_id: uid, category_id: catId, completed_levels: updatedLevels },
                { onConflict: 'user_id,category_id' }
            );

        if (upsertErr) throw upsertErr;

        return { alreadyCompleted: false, completedLevels: updatedLevels };
    }
}

export default ProgressModel;