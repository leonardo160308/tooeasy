
const API_BASE_URL = '/api';

// ========================================
// 1. AUTENTICACIÓN
// ========================================
export async function login(nombre, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, password })
        });

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Respuesta NO es JSON:', text);
            return { success: false, message: 'Error del servidor: Respuesta inválida' };
        }

        if (response.ok) {
            return { success: true, user: data.user, message: 'Inicio de sesión exitoso.' };
        } else {
            return { success: false, message: data.message || 'Credenciales incorrectas.' };
        }
    } catch (error) {
        console.error('Error en login:', error);
        return { success: false, message: 'Error de conexión con el servidor.' };
    }
}

export async function register(userData) {
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Respuesta NO es JSON:', text);
            return { success: false, message: 'Error interno del servidor (respuesta inválida)' };
        }

        if (!response.ok) {
            return { success: false, message: data.message || 'Error al crear usuario.' };
        }

        return data;
    } catch (error) {
        console.error('Error en register:', error);
        return { success: false, message: 'No se pudo conectar con el servidor.' };
    }
}

// ========================================
// 2. USUARIOS
// ========================================
export async function getUserData(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`);
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        throw error;
    }
}

export async function updateUserData(userId, data) {
    try {
        const res = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (error) {
        console.error('Error updateUserData:', error);
        return { success: false, message: 'Error de conexión' };
    }
}

export async function updateAvatar(userId, avatar) {
    try {
        const response = await fetch(`${API_BASE_URL}/equip`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, skinId: avatar, type: 'avatar' })
        });
        return await response.json();
    } catch (error) {
        console.error('Error actualizando avatar:', error);
        throw error;
    }
}

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
export async function getDashboardFixed(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard-fixed/${userId}`);
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo dashboard fijo:', error);
        throw error;
    }
}

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

export async function getDashboardData(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/movements/user/${userId}`);
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo movimientos:', error);
        throw error;
    }
}

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
 * Actualiza tipo, categoría y monto de un movimiento existente
 * @param {number} movementId
 * @param {Object} updateData - { tipo, categoria, monto }
 */
export async function updateMovement(movementId, updateData) {
    try {
        const response = await fetch(`${API_BASE_URL}/movements/${movementId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        return await response.json();
    } catch (error) {
        console.error('Error actualizando movimiento:', error);
        throw error;
    }
}

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
export async function getChallengesStatus(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/challenges/status/${userId}`);
        if (!response.ok) throw new Error('No se pudo obtener el estado de los retos.');
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo retos:', error);
        throw error;
    }
}

export async function completeChallenge(userId, challengeId) {
    try {
        const response = await fetch(`${API_BASE_URL}/challenges/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, challengeId })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error al completar el reto');
        return data;
    } catch (error) {
        console.error('Error completando reto:', error);
        return { success: false, message: error.message || 'Error de red/servidor.' };
    }
}

// ========================================
// 6. TIENDA DE SKINS
// ========================================
export async function getShopSkins() {
    try {
        const response = await fetch(`${API_BASE_URL}/skins`);
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo tienda:', error);
        throw error;
    }
}

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

export async function getChallengesProgress(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/challenges/progress/${userId}`);
        if (!response.ok) throw new Error('No se pudo obtener el progreso de los retos.');
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo progreso de retos:', error);
        return { success: false, progress: {} };
    }
}