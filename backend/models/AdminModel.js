// backend/models/AdminModel.js
import { supabase, supabaseAdmin } from '../config/supabase.js';

class AdminModel {

    // ========================================
    // CATEGORÍAS
    // ========================================
    static async getAllCategories() {
        const { data, error } = await supabase
            .from('learning_categories')
            .select('*')
            .order('orden');
        if (error) throw error;
        return data || [];
    }

    static async getCategoryById(categoryId) {
        const { data, error } = await supabase
            .from('learning_categories')
            .select('*')
            .eq('id', categoryId)
            .single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    }

    static async getCategoriesStats() {
        const [cat, lev, flash, quest] = await Promise.all([
            supabase.from('learning_categories').select('id', { count: 'exact', head: true }),
            supabase.from('educational_levels').select('id', { count: 'exact', head: true }),
            supabase.from('flashcards').select('id', { count: 'exact', head: true }),
            supabase.from('quiz_questions').select('id', { count: 'exact', head: true })
        ]);

        const total = cat.count || 0;
        return {
            count:         total,
            max:           10,
            maxReached:    total >= 10,
            totalLevels:   lev.count   || 0,
            totalFlashcards: flash.count || 0,
            totalQuestions:  quest.count || 0
        };
    }

    static async createCategory(nombre, descripcion, nivel_inicio, nivel_fin) {
        const { data: existing } = await supabase
            .from('learning_categories')
            .select('id')
            .ilike('nombre', nombre)
            .maybeSingle();

        if (existing) {
            const err = new Error('Ya existe una categoría con ese nombre');
            err.code = 'DUPLICATE_NAME';
            throw err;
        }
         const { data: existing } = await supabase
        .from('learning_categories')
        .select('id, nombre, nivel_inicio, nivel_fin');

    const overlap = (existing || []).find(cat =>
        nivel_inicio <= cat.nivel_fin && nivel_fin >= cat.nivel_inicio
    );

    if (overlap) {
        const err = new Error(
            `El rango N${nivel_inicio}–N${nivel_fin} se solapa con la categoría "${overlap.nombre}" (N${overlap.nivel_inicio}–N${overlap.nivel_fin})`
        );
        err.code = 'RANGE_OVERLAP';
        throw err;
    }
        const { data: maxData } = await supabase
            .from('learning_categories')
            .select('orden')
            .order('orden', { ascending: false })
            .limit(1);

        const next_orden = (maxData && maxData.length > 0) ? maxData[0].orden + 1 : 1;

        const { data, error } = await supabaseAdmin
            .from('learning_categories')
            .insert({
                nombre,
                descripcion,
                nivel_inicio: nivel_inicio || 1,
                nivel_fin:    nivel_fin    || 10,
                orden:        next_orden
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async updateCategory(id, nombre, descripcion) {
        const { data: existing } = await supabase
            .from('learning_categories')
            .select('id')
            .ilike('nombre', nombre)
            .neq('id', id)
            .maybeSingle();

        if (existing) {
            const err = new Error('Ya existe otra categoría con ese nombre');
            err.code = 'DUPLICATE_NAME';
            throw err;
        }

        const { data, error } = await supabaseAdmin
            .from('learning_categories')
            .update({ nombre, descripcion })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Eliminación en CASCADA de categoría:
     * flashcards → quiz_questions → educational_levels → learning_categories
     */
    static async deleteCategory(id) {
        // 1. Obtener todos los niveles de la categoría
        const { data: catLevels, error: lvErr } = await supabase
            .from('educational_levels')
            .select('id')
            .eq('category_id', id);

        if (lvErr) throw lvErr;

        if (catLevels && catLevels.length > 0) {
            const levelIds = catLevels.map(l => l.id);

            // 2. Eliminar flashcards de esos niveles
            const { error: fcErr } = await supabaseAdmin
                .from('flashcards')
                .delete()
                .in('level_id', levelIds);
            if (fcErr) throw fcErr;

            // 3. Eliminar preguntas de esos niveles
            const { error: qErr } = await supabaseAdmin
                .from('quiz_questions')
                .delete()
                .in('level_id', levelIds);
            if (qErr) throw qErr;

            // 4. Eliminar los niveles
            const { error: lvDelErr } = await supabaseAdmin
                .from('educational_levels')
                .delete()
                .eq('category_id', id);
            if (lvDelErr) throw lvDelErr;
        }

        // 5. Eliminar la categoría
        const { error } = await supabaseAdmin
            .from('learning_categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    }

    // ── Estadísticas previas a la eliminación (para el diálogo de confirmación) ──
    static async getCategoryDeleteStats(id) {
        const { data: levels } = await supabase
            .from('educational_levels')
            .select('id')
            .eq('category_id', id);

        const levelIds = (levels || []).map(l => l.id);
        let flashcardCount = 0;
        let questionCount  = 0;

        if (levelIds.length > 0) {
            const [fcRes, qRes] = await Promise.all([
                supabase.from('flashcards').select('id', { count: 'exact', head: true }).in('level_id', levelIds),
                supabase.from('quiz_questions').select('id', { count: 'exact', head: true }).in('level_id', levelIds)
            ]);
            flashcardCount = fcRes.count || 0;
            questionCount  = qRes.count  || 0;
        }

        return {
            levels:     levels?.length   || 0,
            flashcards: flashcardCount,
            questions:  questionCount
        };
    }

    // ========================================
    // LÍMITES
    // ========================================
    static async checkLevelsLimit(categoryId) {
        const category = await this.getCategoryById(categoryId);
        if (!category) return false;
        const totalAllowed = category.nivel_fin - category.nivel_inicio + 1;
        const { count, error } = await supabase
            .from('educational_levels')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', categoryId);
        if (error) throw error;
        return count < totalAllowed;
    }

    static async checkFlashcardsLimit(levelId = null) {
        if (levelId) {
            const { count, error } = await supabase
                .from('flashcards')
                .select('id', { count: 'exact', head: true })
                .eq('level_id', levelId);
            if (error) throw error;
            return count < 30;
        }
        const { count, error } = await supabase
            .from('flashcards')
            .select('id', { count: 'exact', head: true });
        if (error) throw error;
        return count < 300;
    }

    static async checkQuestionsLimit(levelId = null) {
        if (levelId) {
            const { count, error } = await supabase
                .from('quiz_questions')
                .select('id', { count: 'exact', head: true })
                .eq('level_id', levelId);
            if (error) throw error;
            return count < 15;
        }
        const { count, error } = await supabase
            .from('quiz_questions')
            .select('id', { count: 'exact', head: true });
        if (error) throw error;
        return count < 200;
    }

    // ========================================
    // NIVELES
    // ========================================
    static async getAllLevels() {
        const { data, error } = await supabase
            .from('educational_levels')
            .select('*, learning_categories (nombre)')
            .order('category_id')
            .order('orden');
        if (error) throw error;
        return (data || []).map(level => ({
            ...level,
            categoria_nombre: level.learning_categories?.nombre || null,
            learning_categories: undefined
        }));
    }

    static async getLevelsByCategory(categoryId) {
        const { data, error } = await supabase
            .from('educational_levels')
            .select('*')
            .eq('category_id', categoryId)
            .order('orden');
        if (error) throw error;
        return data || [];
    }

    static async createLevel(nombre, descripcion, categoryId) {
        const category = await this.getCategoryById(categoryId);
        if (!category) throw new Error('Categoría no encontrada');

        const canCreate = await this.checkLevelsLimit(categoryId);
        if (!canCreate) throw new Error('Esta categoría ya tiene todos sus niveles completos según su rango');

        const { data: maxData } = await supabase
            .from('educational_levels')
            .select('orden')
            .eq('category_id', categoryId)
            .order('orden', { ascending: false })
            .limit(1);

        const next_orden = maxData && maxData.length > 0
            ? maxData[0].orden + 1
            : category.nivel_inicio;

        if (next_orden > category.nivel_fin) {
            throw new Error('Se ha alcanzado el límite superior de niveles para esta categoría');
        }

        const { data, error } = await supabaseAdmin
            .from('educational_levels')
            .insert({ nombre, descripcion, orden: next_orden, category_id: categoryId })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async updateLevel(id, nombre, descripcion) {
        const { data, error } = await supabaseAdmin
            .from('educational_levels')
            .update({ nombre, descripcion })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    /**
     * Eliminación en CASCADA de nivel:
     * flashcards + quiz_questions → educational_level
     */
    static async deleteLevel(id) {
        // 1. Eliminar flashcards del nivel
        const { error: fcErr } = await supabaseAdmin
            .from('flashcards')
            .delete()
            .eq('level_id', id);
        if (fcErr) throw fcErr;

        // 2. Eliminar preguntas del nivel
        const { error: qErr } = await supabaseAdmin
            .from('quiz_questions')
            .delete()
            .eq('level_id', id);
        if (qErr) throw qErr;

        // 3. Eliminar el nivel
        const { error } = await supabaseAdmin
            .from('educational_levels')
            .delete()
            .eq('id', id);
        if (error) throw error;

        return { success: true };
    }

    // Estadísticas para el diálogo de confirmación de nivel
    static async getLevelDeleteStats(id) {
        const [fcRes, qRes] = await Promise.all([
            supabase.from('flashcards').select('id', { count: 'exact', head: true }).eq('level_id', id),
            supabase.from('quiz_questions').select('id', { count: 'exact', head: true }).eq('level_id', id)
        ]);
        return {
            flashcards: fcRes.count || 0,
            questions:  qRes.count  || 0
        };
    }

    // ========================================
    // FLASHCARDS
    // ========================================
    static async getFlashcardsByLevel(levelId) {
        const { data, error } = await supabase
            .from('flashcards')
            .select('*')
            .eq('level_id', levelId)
            .order('orden');
        if (error) throw error;
        return data || [];
    }

    static async createFlashcard(levelId, titulo, contenido, imagen) {
        const { data: maxData } = await supabase
            .from('flashcards')
            .select('orden')
            .eq('level_id', levelId)
            .order('orden', { ascending: false })
            .limit(1);

        const next_orden = (maxData && maxData.length > 0) ? maxData[0].orden + 1 : 1;

        const { data, error } = await supabaseAdmin
            .from('flashcards')
            .insert({ level_id: levelId, titulo, contenido, imagen: imagen || null, orden: next_orden })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async updateFlashcard(id, titulo, contenido, imagen) {
        const { data, error } = await supabaseAdmin
            .from('flashcards')
            .update({ titulo, contenido, imagen: imagen || null })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    static async deleteFlashcard(id) {
        const { error } = await supabaseAdmin.from('flashcards').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    }

    static async moveFlashcard(id, newLevelId) {
        const { error } = await supabaseAdmin
            .from('flashcards')
            .update({ level_id: newLevelId })
            .eq('id', id);
        if (error) throw error;
        return { success: true };
    }

    // ========================================
    // PREGUNTAS
    // ========================================
    static async getQuestionsByLevel(levelId) {
        const { data, error } = await supabase
            .from('quiz_questions')
            .select('*')
            .eq('level_id', levelId)
            .order('id');
        if (error) throw error;
        return (data || []).map(q => ({
            ...q,
            opciones: typeof q.opciones === 'string' ? JSON.parse(q.opciones) : q.opciones
        }));
    }

    static async createQuestion(levelId, pregunta, opciones, correcta, dificultad, imagen) {
        const { data, error } = await supabaseAdmin
            .from('quiz_questions')
            .insert({
                level_id: levelId,
                pregunta,
                opciones,
                correcta,
                dificultad: dificultad || 'media',
                imagen: imagen || null
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    static async updateQuestion(id, pregunta, opciones, correcta, dificultad, imagen) {
        const { data, error } = await supabaseAdmin
            .from('quiz_questions')
            .update({ pregunta, opciones, correcta, dificultad, imagen: imagen || null })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    static async deleteQuestion(id) {
        const { error } = await supabaseAdmin.from('quiz_questions').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    }
}

export default AdminModel;