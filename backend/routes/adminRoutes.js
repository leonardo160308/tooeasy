// backend/routes/adminRoutes.js
import { Router } from 'express';
import {
    checkAdmin,
    getCategories,
    getLevels,
    getLevelsByCategory,
    createLevel,
    updateLevel,
    deleteLevel,
    getFlashcardsByLevel,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,
    moveFlashcard,
    getQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion
} from '../controllers/adminController.js';

const router = Router();

// ========================================
// CATEGORÍAS (PÚBLICO - Sin checkAdmin)
// ========================================
router.get('/admin/categories', getCategories);

// ========================================
// NIVELES
// ========================================
router.get('/admin/levels', getLevels); // ✅ PÚBLICO para usuarios
router.get('/levels', getLevels); // ✅ RUTA ALTERNATIVA PÚBLICA
router.get('/admin/levels/category/:categoryId', getLevelsByCategory);
router.post('/admin/levels', checkAdmin, createLevel);
router.put('/admin/levels/:id', checkAdmin, updateLevel);
router.delete('/admin/levels/:id', checkAdmin, deleteLevel);

// ========================================
// FLASHCARDS
// ========================================
router.get('/admin/flashcards/level/:levelId', getFlashcardsByLevel);
router.post('/admin/flashcards', checkAdmin, createFlashcard);
router.put('/admin/flashcards/:id', checkAdmin, updateFlashcard);
router.delete('/admin/flashcards/:id', checkAdmin, deleteFlashcard);
router.patch('/admin/flashcards/:id/move', checkAdmin, moveFlashcard);

// ========================================
// PREGUNTAS
// ========================================
router.get('/admin/questions/:levelId', getQuestions);
router.post('/admin/questions', checkAdmin, createQuestion);
router.put('/admin/questions/:id', checkAdmin, updateQuestion);
router.delete('/admin/questions/:id', checkAdmin, deleteQuestion);

export default router;