// backend/routes/adminRoutes.js
import { Router } from 'express';
import {
    checkAdmin,
    // Categories
    getCategories, createCategory, updateCategory,
    getCategoryDeleteStats, deleteCategory,
    // Levels
    getLevels, getLevelsByCategory, createLevel, updateLevel,
    getLevelDeleteStats, deleteLevel,
    // Flashcards
    getFlashcardsByLevel, createFlashcard, updateFlashcard, deleteFlashcard, moveFlashcard,
    // Questions
    getQuestions, createQuestion, updateQuestion, deleteQuestion
} from '../controllers/adminController.js';

const router = Router();

// ── CATEGORÍAS ──────────────────────────────────────────────────────────────
router.get('/admin/categories',                    getCategories);
router.post('/admin/categories',                   checkAdmin, createCategory);
router.put('/admin/categories/:id',                checkAdmin, updateCategory);
// Stats previos a eliminar (para mostrar en el diálogo de confirmación)
router.get('/admin/categories/:id/delete-stats',   getCategoryDeleteStats);
// Eliminación en cascada
router.delete('/admin/categories/:id',             checkAdmin, deleteCategory);

// ── NIVELES ──────────────────────────────────────────────────────────────────
router.get('/admin/levels',                        getLevels);
router.get('/levels',                              getLevels);   // alias público
router.get('/admin/levels/category/:categoryId',   getLevelsByCategory);
router.post('/admin/levels',                       checkAdmin, createLevel);
router.put('/admin/levels/:id',                    checkAdmin, updateLevel);
router.get('/admin/levels/:id/delete-stats',       getLevelDeleteStats);
router.delete('/admin/levels/:id',                 checkAdmin, deleteLevel);

// ── FLASHCARDS ───────────────────────────────────────────────────────────────
router.get('/admin/flashcards/level/:levelId',     checkAdmin, getFlashcardsByLevel);
router.post('/admin/flashcards',                   checkAdmin, createFlashcard);
router.put('/admin/flashcards/:id',                checkAdmin, updateFlashcard);
router.delete('/admin/flashcards/:id',             checkAdmin, deleteFlashcard);
router.patch('/admin/flashcards/:id/move',         checkAdmin, moveFlashcard);

// ── PREGUNTAS ────────────────────────────────────────────────────────────────
router.get('/admin/questions/:levelId',            checkAdmin, getQuestions);
router.post('/admin/questions',                    checkAdmin, createQuestion);
router.put('/admin/questions/:id',                 checkAdmin, updateQuestion);
router.delete('/admin/questions/:id',              checkAdmin, deleteQuestion);

export default router;