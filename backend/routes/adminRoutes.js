// backend/routes/adminRoutes.js — UPDATED with Category CRUD
import { Router } from 'express';
import {
    checkAdmin,
    // Categories
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    // Levels
    getLevels,
    getLevelsByCategory,
    createLevel,
    updateLevel,
    deleteLevel,
    // Flashcards
    getFlashcardsByLevel,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,
    moveFlashcard,
    // Questions
    getQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion
} from '../controllers/adminController.js';

const router = Router();

// ========================================
// CATEGORÍAS — CRUD COMPLETO
// ========================================
router.get('/admin/categories',          getCategories);                    // GET all + stats
router.post('/admin/categories',         checkAdmin, createCategory);       // CREATE
router.put('/admin/categories/:id',      checkAdmin, updateCategory);       // UPDATE
router.delete('/admin/categories/:id',   checkAdmin, deleteCategory);       // DELETE

// ========================================
// NIVELES
// ========================================
router.get('/admin/levels',                          getLevels);
router.get('/levels',                                getLevels);            // public alias
router.get('/admin/levels/category/:categoryId',     getLevelsByCategory);
router.post('/admin/levels',                         checkAdmin, createLevel);
router.put('/admin/levels/:id',                      checkAdmin, updateLevel);
router.delete('/admin/levels/:id',                   checkAdmin, deleteLevel);

// ========================================
// FLASHCARDS
// ========================================
router.get('/admin/flashcards/level/:levelId',       getFlashcardsByLevel);
router.post('/admin/flashcards',                     checkAdmin, createFlashcard);
router.put('/admin/flashcards/:id',                  checkAdmin, updateFlashcard);
router.delete('/admin/flashcards/:id',               checkAdmin, deleteFlashcard);
router.patch('/admin/flashcards/:id/move',           checkAdmin, moveFlashcard);

// ========================================
// PREGUNTAS
// ========================================
router.get('/admin/questions/:levelId',              getQuestions);
router.post('/admin/questions',                      checkAdmin, createQuestion);
router.put('/admin/questions/:id',                   checkAdmin, updateQuestion);
router.delete('/admin/questions/:id',                checkAdmin, deleteQuestion);

export default router;