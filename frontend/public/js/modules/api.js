// frontend/public/js/modules/api.js
// Funciones para comunicarse con el Backend

const API_BASE_URL = 'http://localhost:3000/api';

// ========================================
// 1. AUTENTICACIÓN
// ========================================

/**
 * Inicia sesión con credenciales
 * @param {string} nombre - Nombre de usuario
 * @param {string} password - Contraseña
 * @returns {Promise<Object>} { success, user, message }
 */
export async function login(nombre, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            return { 
                success: true, 
                user: data.user, 
                message: 'Inicio de sesión exitoso.' 
            };
        } else {
            return { 
                success: false, 
                message: data.message || 'Credenciales incorrectas.' 
            };
        }
    } catch (error) {
        console.error('Error en login:', error);
        return { 
            success: false, 
            message: 'Error de conexión con el servidor.' 
        };
    }
}

/**
 * Registra un nuevo usuario
 * @param {Object} userData - Datos del nuevo usuario
 * @returns {Promise<Object>} { success, data, message }
 */
export async function register(userData) {
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        return await response.json();
    } catch (error) {
        console.error('Error en register:', error);
        return { 
            success: false, 
            message: 'Error al crear usuario.' 
        };
    }
}

// ========================================
// 2. USUARIOS
// ========================================

/**
 * Obtiene los datos completos de un usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<Object>} Datos del usuario
 */
export async function getUserData(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`);
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        throw error;
    }
}

/**
 * Actualiza datos del usuario
 * @param {number} userId - ID del usuario
 * @param {Object} updateData - Datos a actualizar
 * @returns {Promise<Object>}
 */
export async function updateUserData(userId, updateData) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        return await response.json();
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        throw error;
    }
}

/**
 * Actualiza el avatar del usuario
 * NOTA: Internamente usa equipSkin del backend con type='avatar'
 * @param {number} userId - ID del usuario
 * @param {string} avatar - Nombre del avatar (ej: "avatar1", "avatar2")
 * @returns {Promise<Object>}
 */
export async function updateAvatar(userId, avatar) {
    try {
        // Usamos la misma ruta de equipSkin pero la llamamos desde aquí
        const response = await fetch(`${API_BASE_URL}/equip`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: userId, 
                skinId: avatar, 
                type: 'avatar' 
            })
        });
        return await response.json();
    } catch (error) {
        console.error('Error actualizando avatar:', error);
        throw error;
    }
}

/**
 * Elimina (baja lógica) la cuenta de un usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<Object>}
 */
export async function deleteUser(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.json();
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        throw error;
    }
}



// ========================================
// 3. DASHBOARD Y MOVIMIENTOS
// ========================================

/**
 * Obtiene los datos fijos del dashboard (Meta y Sueldo)
 * @param {number} userId
 * @returns {Promise<Object>}
 */
export async function getDashboardFixed(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard-fixed/${userId}`);
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo dashboard fijo:', error);
        throw error;
    }
}

/**
 * Actualiza los datos fijos del dashboard
 * @param {number} userId
 * @param {Object} goalData - { ingreso_fijo, egreso_fijo, meta_nombre, meta_cantidad }
 * @returns {Promise<Object>}
 */
export async function updateGoal(userId, goalData) {
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard-fixed/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(goalData)
        });
        return await response.json();
    } catch (error) {
        console.error('Error actualizando metas:', error);
        throw error;
    }
}

/**
 * Obtiene el historial de movimientos del usuario
 * @param {number} userId
 * @returns {Promise<Object>} { success, totals, history }
 */
export async function getDashboardData(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/movements/user/${userId}`);
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo movimientos:', error);
        throw error;
    }
}

/**
 * Crea un nuevo movimiento (Ingreso o Gasto)
 * @param {Object} movementData - { user_id, fecha, tipo, categoria, monto, descripcion }
 * @returns {Promise<Object>}
 */
export async function createMovement(movementData) {
    try {
        const response = await fetch(`${API_BASE_URL}/movements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(movementData)
        });
        return await response.json();
    } catch (error) {
        console.error('Error creando movimiento:', error);
        throw error;
    }
}

/**
 * Elimina un movimiento
 * @param {number} movementId
 * @param {number} userId
 * @returns {Promise<Object>}
 */
export async function deleteMovement(movementId, userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/movements/${movementId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        return await response.json();
    } catch (error) {
        console.error('Error eliminando movimiento:', error);
        throw error;
    }
}

// ========================================
// 4. PERFIL Y MEJORAS
// ========================================

/**
 * Mejora Casa o Castor
 * @param {number} userId
 * @param {string} type - 'house' o 'beaver'
 * @returns {Promise<Object>}
 */
export async function upgradeItem(userId, type) {
    try {
        const response = await fetch(`${API_BASE_URL}/upgrade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, type })
        });
        return await response.json();
    } catch (error) {
        console.error('Error en mejora:', error);
        throw error;
    }
}

/**
 * Equipar una skin
 * @param {number} userId
 * @param {string} skinId
 * @param {string} type - 'house' o 'beaver'
 * @returns {Promise<Object>}
 */
export async function equipSkin(userId, skinId, type) {
    try {
        const response = await fetch(`${API_BASE_URL}/equip`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, skinId, type })
        });
        return await response.json();
    } catch (error) {
        console.error('Error equipando skin:', error);
        throw error;
    }
}

// ========================================
// 5. RETOS (CHALLENGES)
// ========================================

/**
 * Obtiene el estado de los retos del usuario
 * @param {number} userId
 * @returns {Promise<Object>} { success, completedIds: [] }
 */
export async function getChallengesStatus(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/challenges/status/${userId}`);
        if (!response.ok) {
            throw new Error('No se pudo obtener el estado de los retos.');
        }
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo retos:', error);
        throw error;
    }
}

/**
 * Intenta completar un reto
 * @param {number} userId
 * @param {number} challengeId
 * @returns {Promise<Object>} { success, message, new_stats }
 */
export async function completeChallenge(userId, challengeId) {
    try {
        const response = await fetch(`${API_BASE_URL}/challenges/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, challengeId })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Error al completar el reto');
        }
        
        return data;
    } catch (error) {
        console.error('Error completando reto:', error);
        return { 
            success: false, 
            message: error.message || 'Error de red/servidor.' 
        };
    }
}

// ========================================
// 6. TIENDA DE SKINS
// ========================================

/**
 * Obtiene el catálogo de skins disponibles
 * @returns {Promise<Object>}
 */
export async function getShopSkins() {
    try {
        const response = await fetch(`${API_BASE_URL}/skins`);
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo tienda:', error);
        throw error;
    }
}

/**
 * Compra una skin
 * @param {number} userId
 * @param {number} skinId
 * @param {number} cost
 * @param {string} currency - 'coins' o 'wood'
 * @returns {Promise<Object>}
 */
export async function purchaseSkin(userId, skinId, cost, currency) {
    try {
        const response = await fetch(`${API_BASE_URL}/skins/purchase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, skinId, cost, currency })
        });
        return await response.json();
    } catch (error) {
        console.error('Error comprando skin:', error);
        throw error;
    }
}