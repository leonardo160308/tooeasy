// backend/controllers/adminController.js — UPDATED with full Category CRUD
import AdminModel from '../models/AdminModel.js';
import User from '../models/UserModel.js';

// ========================================
// MIDDLEWARE: Verificar si es Admin
// ========================================
export async function checkAdmin(req, res, next) {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
        const user = await User.findById(userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Acceso denegado. Solo administradores.' });
        }
        next();
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error de autenticación' });
    }
}

// ========================================
// GESTIÓN DE CATEGORÍAS — CRUD COMPLETO
// ========================================

export async function getCategories(req, res) {
    try {
        const categories = await AdminModel.getAllCategories();
        const stats = await AdminModel.getCategoriesStats();
        res.json({ success: true, data: categories, stats });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener categorías' });
    }
}

export async function createCategory(req, res) {
    try {
        const { nombre, descripcion, nivel_inicio, nivel_fin } = req.body;
        if (!nombre || nombre.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'El nombre debe tener al menos 2 caracteres.' });
        }
        const newCat = await AdminModel.createCategory(nombre, descripcion, nivel_inicio, nivel_fin);
        res.status(201).json({ success: true, data: newCat });
    } catch (error) {
        console.error(error);
        if (error.code === 'LIMIT_REACHED') return res.status(400).json({ success: false, message: error.message });
        if (error.code === 'DUPLICATE_NAME') return res.status(409).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: error.message || 'Error al crear categoría' });
    }
}

export async function updateCategory(req, res) {
    try {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;
        if (!nombre || nombre.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'El nombre debe tener al menos 2 caracteres.' });
        }
        const updated = await AdminModel.updateCategory(id, nombre, descripcion);
        res.json({ success: true, data: updated });
    } catch (error) {
        console.error(error);
        if (error.code === 'DUPLICATE_NAME') return res.status(409).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Error al actualizar categoría' });
    }
}

export async function deleteCategory(req, res) {
    try {
        const { id } = req.params;
        const result = await AdminModel.deleteCategory(id);
        if (!result.success) return res.status(400).json(result);
        res.json({ success: true, message: 'Categoría eliminada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al eliminar categoría' });
    }
}

// ========================================
// GESTIÓN DE NIVELES
// ========================================

export async function getLevels(req, res) {
    try {
        const levels = await AdminModel.getAllLevels();
        res.json({ success: true, data: levels });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener niveles' });
    }
}

export async function getLevelsByCategory(req, res) {
    try {
        const { categoryId } = req.params;
        const levels = await AdminModel.getLevelsByCategory(categoryId);
        res.json({ success: true, data: levels });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener niveles' });
    }
}

export async function createLevel(req, res) {
    try {
        const { nombre, descripcion, categoryId } = req.body;
        if (!nombre || !descripcion || !categoryId) {
            return res.status(400).json({ success: false, message: 'Nombre, descripción y categoría son obligatorios' });
        }
        const canCreate = await AdminModel.checkLevelsLimit(categoryId);
        if (!canCreate) {
            return res.status(400).json({ success: false, message: 'Esta categoría ya tiene todos sus niveles completos.' });
        }
        const newLevel = await AdminModel.createLevel(nombre, descripcion, categoryId);
        res.status(201).json({ success: true, data: newLevel });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Ya existe un nivel con ese nombre' });
        }
        res.status(500).json({ success: false, message: error.message || 'Error al crear nivel' });
    }
}

export async function updateLevel(req, res) {
    try {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;
        if (!nombre || !descripcion) {
            return res.status(400).json({ success: false, message: 'Nombre y descripción son obligatorios' });
        }
        const updated = await AdminModel.updateLevel(id, nombre, descripcion);
        res.json({ success: true, data: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar nivel' });
    }
}

export async function deleteLevel(req, res) {
    try {
        const { id } = req.params;
        const result = await AdminModel.deleteLevel(id);
        if (!result.success) return res.status(400).json(result);
        res.json({ success: true, message: 'Nivel eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al eliminar nivel' });
    }
}

// ========================================
// GESTIÓN DE FLASHCARDS
// ========================================

export async function getFlashcardsByLevel(req, res) {
    try {
        const { levelId } = req.params;
        const flashcards = await AdminModel.getFlashcardsByLevel(levelId);
        res.json({ success: true, data: flashcards });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener flashcards' });
    }
}

export async function createFlashcard(req, res) {
    try {
        const { levelId, titulo, contenido, imagen } = req.body;
        if (!levelId || !titulo || !contenido) {
            return res.status(400).json({ success: false, message: 'LevelId, título y contenido son obligatorios' });
        }
        const canCreatePerLevel = await AdminModel.checkFlashcardsLimit(levelId);
        const canCreateTotal = await AdminModel.checkFlashcardsLimit();
        if (!canCreatePerLevel) return res.status(400).json({ success: false, message: 'Este nivel ya tiene 30 flashcards (máximo permitido)' });
        if (!canCreateTotal) return res.status(400).json({ success: false, message: 'Has alcanzado el límite de 300 flashcards en total' });
        const newFlashcard = await AdminModel.createFlashcard(levelId, titulo, contenido, imagen);
        res.status(201).json({ success: true, data: newFlashcard });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear flashcard' });
    }
}

export async function updateFlashcard(req, res) {
    try {
        const { id } = req.params;
        const { titulo, contenido, imagen } = req.body;
        if (!titulo || !contenido) return res.status(400).json({ success: false, message: 'Título y contenido son obligatorios' });
        const updated = await AdminModel.updateFlashcard(id, titulo, contenido, imagen);
        res.json({ success: true, data: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar flashcard' });
    }
}

export async function deleteFlashcard(req, res) {
    try {
        const { id } = req.params;
        await AdminModel.deleteFlashcard(id);
        res.json({ success: true, message: 'Flashcard eliminada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al eliminar flashcard' });
    }
}

export async function moveFlashcard(req, res) {
    try {
        const { id } = req.params;
        const { newLevelId } = req.body;
        const canMove = await AdminModel.checkFlashcardsLimit(newLevelId);
        if (!canMove) return res.status(400).json({ success: false, message: 'El nivel destino ya tiene 30 flashcards' });
        await AdminModel.moveFlashcard(id, newLevelId);
        res.json({ success: true, message: 'Flashcard movida correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al mover flashcard' });
    }
}

// ========================================
// GESTIÓN DE PREGUNTAS
// ========================================

export async function getQuestions(req, res) {
    try {
        const { levelId } = req.params;
        const questions = await AdminModel.getQuestionsByLevel(levelId);
        res.json({ success: true, data: questions });
    } catch (error) {
        console.error('Error en getQuestions:', error);
        res.status(500).json({ success: false, message: 'Error al obtener preguntas', error: error.message });
    }
}

export async function createQuestion(req, res) {
    try {
        const { levelId, pregunta, opciones, correcta, dificultad, imagen } = req.body;
        if (!levelId || !pregunta || !opciones || !correcta) return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
        const numOpciones = Object.keys(opciones).length;
        if (numOpciones < 3 || numOpciones > 5) return res.status(400).json({ success: false, message: 'Debes tener entre 3 y 5 opciones' });
        if (!opciones[correcta]) return res.status(400).json({ success: false, message: 'La opción correcta no existe en las opciones' });
        const canCreatePerLevel = await AdminModel.checkQuestionsLimit(levelId);
        const canCreateTotal = await AdminModel.checkQuestionsLimit();
        if (!canCreatePerLevel) return res.status(400).json({ success: false, message: 'Este nivel ya tiene 15 preguntas (máximo permitido)' });
        if (!canCreateTotal) return res.status(400).json({ success: false, message: 'Has alcanzado el límite de 200 preguntas en total' });
        const newQuestion = await AdminModel.createQuestion(levelId, pregunta, opciones, correcta, dificultad, imagen);
        res.status(201).json({ success: true, data: newQuestion });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear pregunta' });
    }
}

export async function updateQuestion(req, res) {
    try {
        const { id } = req.params;
        const { pregunta, opciones, correcta, dificultad, imagen } = req.body;
        if (!pregunta || !opciones || !correcta) return res.status(400).json({ success: false, message: 'Pregunta, opciones y correcta son obligatorios' });
        const numOpciones = Object.keys(opciones).length;
        if (numOpciones < 3 || numOpciones > 5) return res.status(400).json({ success: false, message: 'Debes tener entre 3 y 5 opciones' });
        if (!opciones[correcta]) return res.status(400).json({ success: false, message: 'La opción correcta no existe' });
        const updated = await AdminModel.updateQuestion(id, pregunta, opciones, correcta, dificultad, imagen);
        res.json({ success: true, data: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar pregunta' });
    }
}

export async function deleteQuestion(req, res) {
    try {
        const { id } = req.params;
        await AdminModel.deleteQuestion(id);
        res.json({ success: true, message: 'Pregunta eliminada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al eliminar pregunta' });
    }
}