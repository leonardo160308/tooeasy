// frontend/public/js/pages/admin.js
import { protectRoute, getAuthData, logout, isAdmin } from '../modules/auth.js';
import { alertaExito, alertaError, alertaAdvertencia, alertaConfirmacion } from '../modules/alerts.js';

const API_URL = '/api';

document.addEventListener('DOMContentLoaded', async () => {
    // Seguridad
    if (!protectRoute()) return;
    const sessionUser = getAuthData();
    const userId = sessionUser.id;
    if (!isAdmin()) {
        alertaError('Acceso denegado. Solo administradores.', {
            duration: 3000,
            onClose: () => { window.location.href = '/dashboard.html'; }
        });
        return;
    }
    // NAVEGACIÓN ENTRE TABS
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            // Actualizar botones
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Actualizar contenido
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`tab-${tab}`).classList.add('active');
        });
    });

    // CERRAR SESIÓN
    document.getElementById('logout-btn-admin')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const confirmar = await alertaConfirmacion(
            '¿Estás seguro de que deseas cerrar sesión?',
            '👋 Salir del Panel Admin'
        );
        if (confirmar) logout();
    });

    // ========================================
    // GESTIÓN DE NIVELES
    // ========================================
    let levels = [];

    async function loadLevels() {
        try {
            const res = await fetch(`${API_URL}/admin/levels`);
            const data = await res.json();
            
            if (data.success) {
                levels = data.data;
                renderLevels();
                updateLevelFilters();
            }
        } catch (error) {
            console.error(error);
            alertaError('Error al cargar niveles');
        }
    }

    function renderLevels() {
        const container = document.getElementById('levels-list');
        
        if (levels.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay niveles creados</p>';
            return;
        }
        
        container.innerHTML = levels.map(level => `
            <div class="item-card">
                <h3>Nivel ${level.orden}: ${level.nombre}</h3>
                <p>${level.descripcion}</p>
                <div class="item-actions">
                    <button class="btn-secondary btn-small btn-edit-level" data-id="${level.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-danger btn-small btn-delete-level" data-id="${level.id}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');
        
        // Eventos
        document.querySelectorAll('.btn-edit-level').forEach(btn => {
            btn.addEventListener('click', () => openLevelModal(btn.dataset.id));
        });
        
        document.querySelectorAll('.btn-delete-level').forEach(btn => {
            btn.addEventListener('click', () => deleteLevel(btn.dataset.id));
        });
    }

    function updateLevelFilters() {
        const flashcardFilter = document.getElementById('flashcard-level-filter');
        const questionFilter = document.getElementById('question-level-filter');
        const flashcardLevel = document.getElementById('flashcard-level');
        const questionLevel = document.getElementById('question-level');
        
        const options = levels.map(l => 
            `<option value="${l.id}">Nivel ${l.orden}: ${l.nombre}</option>`
        ).join('');
        
        flashcardFilter.innerHTML = '<option value="">Selecciona un nivel</option>' + options;
        questionFilter.innerHTML = '<option value="">Selecciona un nivel</option>' + options;
        flashcardLevel.innerHTML = '<option value="">Selecciona un nivel</option>' + options;
        questionLevel.innerHTML = '<option value="">Selecciona un nivel</option>' + options;
    }

    // Modal de Nivel
    const modalLevel = document.getElementById('modal-level');
    const formLevel = document.getElementById('form-level');

    document.getElementById('btn-new-level').addEventListener('click', () => {
        openLevelModal();
    });

    function openLevelModal(id = null) {
        if (id) {
            const level = levels.find(l => l.id == id);
            document.getElementById('modal-level-title').textContent = 'Editar Nivel';
            document.getElementById('level-id').value = level.id;
            document.getElementById('level-nombre').value = level.nombre;
            document.getElementById('level-descripcion').value = level.descripcion;
        } else {
            document.getElementById('modal-level-title').textContent = 'Nuevo Nivel';
            formLevel.reset();
        }
        
        modalLevel.classList.add('active');
    }

    formLevel.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('level-id').value;
        const nombre = document.getElementById('level-nombre').value.trim();
        const descripcion = document.getElementById('level-descripcion').value.trim();
        
        if (!nombre || !descripcion) {
            alertaAdvertencia('Completa todos los campos');
            return;
        }
        
        try {
            const url = id ? `${API_URL}/admin/levels/${id}` : `${API_URL}/admin/levels`;
            const method = id ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, nombre, descripcion })
            });
            
            const data = await res.json();
            
            if (data.success) {
                alertaExito(id ? 'Nivel actualizado' : 'Nivel creado correctamente');
                modalLevel.classList.remove('active');
                loadLevels();
            } else {
                alertaError(data.message);
            }
        } catch (error) {
            console.error(error);
            alertaError('Error al guardar nivel');
        }
    });

    async function deleteLevel(id) {
        const confirmar = await alertaConfirmacion(
            '¿Eliminar este nivel? Si tiene flashcards o preguntas, se te avisará.',
            '⚠️ Confirmar Eliminación'
        );
        
        if (!confirmar) return;
        
        try {
            const res = await fetch(`${API_URL}/admin/levels/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            
            const data = await res.json();
            
            if (data.success) {
                alertaExito('Nivel eliminado');
                loadLevels();
            } else {
                alertaAdvertencia(data.message);
            }
        } catch (error) {
            console.error(error);
            alertaError('Error al eliminar nivel');
        }
    }

    // ========================================
    // GESTIÓN DE FLASHCARDS
    // ========================================
    let flashcards = [];

    document.getElementById('flashcard-level-filter').addEventListener('change', (e) => {
        if (e.target.value) loadFlashcards(e.target.value);
    });

    async function loadFlashcards(levelId) {
        try {
            const res = await fetch(`${API_URL}/admin/flashcards/level/${levelId}`);
            const data = await res.json();
            
            if (data.success) {
                flashcards = data.data;
                renderFlashcards();
            }
        } catch (error) {
            console.error(error);
            alertaError('Error al cargar flashcards');
        }
    }

    function renderFlashcards() {
        const container = document.getElementById('flashcards-list');
        
        if (flashcards.length === 0) {
            container.innerHTML = '<p class="empty-state">Este nivel no tiene flashcards</p>';
            return;
        }
        
        container.innerHTML = flashcards.map(f => `
            <div class="item-card">
                <h3>${f.titulo}</h3>
                <p>${f.contenido.substring(0, 100)}...</p>
                <div class="item-actions">
                    <button class="btn-secondary btn-small btn-edit-flashcard" data-id="${f.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-danger btn-small btn-delete-flashcard" data-id="${f.id}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.btn-edit-flashcard').forEach(btn => {
            btn.addEventListener('click', () => openFlashcardModal(btn.dataset.id));
        });
        
        document.querySelectorAll('.btn-delete-flashcard').forEach(btn => {
            btn.addEventListener('click', () => deleteFlashcard(btn.dataset.id));
        });
    }

    const modalFlashcard = document.getElementById('modal-flashcard');
    const formFlashcard = document.getElementById('form-flashcard');

    document.getElementById('btn-new-flashcard').addEventListener('click', () => {
        const levelId = document.getElementById('flashcard-level-filter').value;
        if (!levelId) {
            alertaAdvertencia('Selecciona un nivel primero');
            return;
        }
        openFlashcardModal(null, levelId);
    });

    function openFlashcardModal(id = null, preselectedLevel = null) {
        if (id) {
            const flashcard = flashcards.find(f => f.id == id);
            document.getElementById('modal-flashcard-title').textContent = 'Editar Flashcard';
            document.getElementById('flashcard-id').value = flashcard.id;
            document.getElementById('flashcard-level').value = flashcard.level_id;
            document.getElementById('flashcard-titulo').value = flashcard.titulo;
            document.getElementById('flashcard-contenido').value = flashcard.contenido;
            document.getElementById('flashcard-imagen').value = flashcard.imagen || '';
        } else {
            document.getElementById('modal-flashcard-title').textContent = 'Nueva Flashcard';
            formFlashcard.reset();
            if (preselectedLevel) {
                document.getElementById('flashcard-level').value = preselectedLevel;
            }
        }
        
        modalFlashcard.classList.add('active');
    }

    formFlashcard.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('flashcard-id').value;
        const levelId = document.getElementById('flashcard-level').value;
        const titulo = document.getElementById('flashcard-titulo').value.trim();
        const contenido = document.getElementById('flashcard-contenido').value.trim();
        const imagen = document.getElementById('flashcard-imagen').value.trim();
        
        try {
            const url = id ? `${API_URL}/admin/flashcards/${id}` : `${API_URL}/admin/flashcards`;
            const method = id ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, levelId, titulo, contenido, imagen })
            });
            
            const data = await res.json();
            
            if (data.success) {
                alertaExito(id ? 'Flashcard actualizada' : 'Flashcard creada');
                modalFlashcard.classList.remove('active');
                loadFlashcards(levelId);
            } else {
                alertaError(data.message);
            }
        } catch (error) {
            console.error(error);
            alertaError('Error al guardar flashcard');
        }
    });

    async function deleteFlashcard(id) {
        const confirmar = await alertaConfirmacion(
            '¿Eliminar esta flashcard?',
            '⚠️ Confirmar'
        );
        
        if (!confirmar) return;
        
        try {
            const res = await fetch(`${API_URL}/admin/flashcards/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            
            const data = await res.json();
            
            if (data.success) {
                alertaExito('Flashcard eliminada');
                const levelId = document.getElementById('flashcard-level-filter').value;
                loadFlashcards(levelId);
            }
        } catch (error) {
            console.error(error);
            alertaError('Error al eliminar flashcard');
        }
    }

    // ========================================
    // GESTIÓN DE PREGUNTAS (Similar a Flashcards)
    // ========================================
    let questions = [];

    document.getElementById('question-level-filter').addEventListener('change', (e) => {
        if (e.target.value) loadQuestions(e.target.value);
    });

    async function loadQuestions(levelId) {
        try {
            const res = await fetch(`${API_URL}/admin/questions/${levelId}`);
            const data = await res.json();
            
            if (data.success) {
                questions = data.data;
                renderQuestions();
            }
        } catch (error) {
            console.error(error);
            alertaError('Error al cargar preguntas');
        }
    }

    function renderQuestions() {
        const container = document.getElementById('questions-list');
        
        if (questions.length === 0) {
            container.innerHTML = '<p class="empty-state">Este nivel no tiene preguntas</p>';
            return;
        }
        
        container.innerHTML = questions.map(q => `
            <div class="item-card">
                <h3>${q.pregunta.substring(0, 60)}...</h3>
                <div class="meta">
                    <span><i class="fas fa-list"></i> ${Object.keys(q.opciones).length} opciones</span>
                    <span><i class="fas fa-check-circle"></i> Correcta: ${q.correcta}</span>
                    <span><i class="fas fa-signal"></i> ${q.dificultad}</span>
                </div>
                <div class="item-actions">
                    <button class="btn-secondary btn-small btn-edit-question" data-id="${q.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-danger btn-small btn-delete-question" data-id="${q.id}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.btn-edit-question').forEach(btn => {
            btn.addEventListener('click', () => openQuestionModal(btn.dataset.id));
        });
        
        document.querySelectorAll('.btn-delete-question').forEach(btn => {
            btn.addEventListener('click', () => deleteQuestion(btn.dataset.id));
        });
    }

    const modalQuestion = document.getElementById('modal-question');
    const formQuestion = document.getElementById('form-question');

    document.getElementById('btn-new-question').addEventListener('click', () => {
        const levelId = document.getElementById('question-level-filter').value;
        if (!levelId) {
            alertaAdvertencia('Selecciona un nivel primero');
            return;
        }
        openQuestionModal(null, levelId);
    });

    function openQuestionModal(id = null, preselectedLevel = null) {
        // Resetear opciones dinámicas
        const container = document.getElementById('options-container');
        container.innerHTML = `
            <div class="option-row">
                <input type="text" class="option-input" data-key="A" placeholder="Opción A" required>
            </div>
            <div class="option-row">
                <input type="text" class="option-input" data-key="B" placeholder="Opción B" required>
            </div>
            <div class="option-row">
                <input type="text" class="option-input" data-key="C" placeholder="Opción C" required>
            </div>
        `;
        
        if (id) {
            const question = questions.find(q => q.id == id);
            document.getElementById('modal-question-title').textContent = 'Editar Pregunta';
            document.getElementById('question-id').value = question.id;
            document.getElementById('question-level').value = question.level_id;
            document.getElementById('question-pregunta').value = question.pregunta;
            document.getElementById('question-correcta').value = question.correcta;
            document.getElementById('question-dificultad').value = question.dificultad;
            document.getElementById('question-imagen').value = question.imagen || '';
            
            // Cargar opciones existentes
            container.innerHTML = '';
            Object.keys(question.opciones).forEach(key => {
                container.insertAdjacentHTML('beforeend', `
                    <div class="option-row">
                        <input type="text" class="option-input" data-key="${key}" placeholder="Opción ${key}" value="${question.opciones[key]}" required>
                        ${container.children.length >= 3 ? '<button type="button" class="btn-remove-option">&times;</button>' : ''}
                    </div>
                `);
            });
            
            updateOptionActions();
            updateCorrectaOptions();
        } else {
            document.getElementById('modal-question-title').textContent = 'Nueva Pregunta';
            formQuestion.reset();
            if (preselectedLevel) {
                document.getElementById('question-level').value = preselectedLevel;
            }
        }
        
        modalQuestion.classList.add('active');
    }

    document.getElementById('btn-add-option').addEventListener('click', () => {
        const container = document.getElementById('options-container');
        const count = container.children.length;
        
        if (count >= 5) {
            alertaAdvertencia('Máximo 5 opciones');
            return;
        }
        
        const keys = ['A', 'B', 'C', 'D', 'E'];
        const nextKey = keys[count];
        
        container.insertAdjacentHTML('beforeend', `
            <div class="option-row">
                <input type="text" class="option-input" data-key="${nextKey}" placeholder="Opción ${nextKey}" required>
                <button type="button" class="btn-remove-option">&times;</button>
            </div>
        `);
        
        updateOptionActions();
        updateCorrectaOptions();
    });

    function updateOptionActions() {
        document.querySelectorAll('.btn-remove-option').forEach(btn => {
            btn.onclick = () => {
                const container = document.getElementById('options-container');
                if (container.children.length <= 3) {
                    alertaAdvertencia('Mínimo 3 opciones');
                    return;
                }
                btn.closest('.option-row').remove();
                updateCorrectaOptions();
            };
        });
    }

    function updateCorrectaOptions() {
        const select = document.getElementById('question-correcta');
        const inputs = document.querySelectorAll('.option-input');
        const keys = Array.from(inputs).map(i => i.dataset.key);
        
        const currentValue = select.value;
        select.innerHTML = '<option value="">Selecciona la correcta</option>' +
            keys.map(k => `<option value="${k}">${k}</option>`).join('');
        
        if (keys.includes(currentValue)) {
            select.value = currentValue;
        }
    }

    formQuestion.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('question-id').value;
        const levelId = document.getElementById('question-level').value;
        const pregunta = document.getElementById('question-pregunta').value.trim();
        const correcta = document.getElementById('question-correcta').value;
        const dificultad = document.getElementById('question-dificultad').value;
        const imagen = document.getElementById('question-imagen').value.trim();
        
        // Recopilar opciones
        const opciones = {};
        document.querySelectorAll('.option-input').forEach(input => {
            opciones[input.dataset.key] = input.value.trim();
        });
        
        try {
            const url = id ? `${API_URL}/admin/questions/${id}` : `${API_URL}/admin/questions`;
            const method = id ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    levelId,
                    pregunta,
                    opciones,
                    correcta,
                    dificultad,
                    imagen
                })
            });
            
            const data = await res.json();
            
            if (data.success) {
                alertaExito(id ? 'Pregunta actualizada' : 'Pregunta creada');
                modalQuestion.classList.remove('active');
                loadQuestions(levelId);
            } else {
                alertaError(data.message);
            }
        } catch (error) {
            console.error(error);
            alertaError('Error al guardar pregunta');
        }
    });

    async function deleteQuestion(id) {
        const confirmar = await alertaConfirmacion(
            '¿Eliminar esta pregunta?',
            '⚠️ Confirmar'
        );
        
        if (!confirmar) return;
        
        try {
            const res = await fetch(`${API_URL}/admin/questions/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            
            const data = await res.json();
            
            if (data.success) {
                alertaExito('Pregunta eliminada');
                const levelId = document.getElementById('question-level-filter').value;
                loadQuestions(levelId);
            }
        } catch (error) {
            console.error(error);
            alertaError('Error al eliminar pregunta');
        }
    }

    // CERRAR MODALES
    document.querySelectorAll('.modal-close, [data-modal]').forEach(el => {
        el.addEventListener('click', () => {
            const modalId = el.dataset.modal || el.closest('.modal').id;
            document.getElementById(modalId).classList.remove('active');
        });
    });

    // INICIALIZAR
    loadLevels();
});