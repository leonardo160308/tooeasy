
const API_BASE_URL = '/api';
const FETCH_TIMEOUT_MS = 15000;

function fetchWithTimeout(url, options = {}) {
    if (!navigator.onLine) {
        return Promise.reject(Object.assign(new Error('Sin conexión a internet.'), { offline: true }));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timer));
}

// ========================================
// 1. AUTENTICACIÓN
// ========================================
export async function login(nombre, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
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
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
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
        const response = await fetchWithTimeout(`${API_BASE_URL}/dashboard-fixed/${userId}`);
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
        const response = await fetchWithTimeout(`${API_BASE_URL}/movements/user/${userId}`);
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
        const response = await fetchWithTimeout(`${API_BASE_URL}/challenges/status/${userId}`);
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
        const response = await fetchWithTimeout(`${API_BASE_URL}/challenges/progress/${userId}`);
        if (!response.ok) throw new Error('No se pudo obtener el progreso de los retos.');
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo progreso de retos:', error);
        return { success: false, progress: {} };
    }
}

// ========================================
// 7. SOPORTE — USUARIO
// ========================================
export async function createTicket(formData, userId) {
    try {
        // userId se pasa como query param para que requireAuth pueda leerlo
        // antes de que multer procese el body multipart
        const url = userId
            ? `${API_BASE_URL}/tickets?userId=${encodeURIComponent(userId)}`
            : `${API_BASE_URL}/tickets`;
        const response = await fetch(url, {
            method: 'POST',
            body:   formData
        });
        return await response.json();
    } catch (error) {
        console.error('Error creando ticket:', error);
        return { success: false, message: 'Error de conexión con el servidor.' };
    }
}

export async function getMyTickets(userId) {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/tickets/my?userId=${userId}`);
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo tickets:', error);
        return { success: false, data: [], offline: !!error.offline };
    }
}

export async function getMyTicketDetail(userId, ticketId) {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/tickets/my/${ticketId}?userId=${userId}`);
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo detalle de ticket:', error);
        return { success: false, message: error.offline ? 'Sin conexión.' : 'Error de conexión.' };
    }
}

export async function replyToMyTicket(userId, ticketId, message) {
    try {
        const response = await fetch(`${API_BASE_URL}/tickets/my/${ticketId}/reply`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ userId, message })
        });
        return await response.json();
    } catch (error) {
        console.error('Error respondiendo a ticket:', error);
        return { success: false, message: 'Error de conexión.' };
    }
}

export async function closeMyTicket(userId, ticketId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tickets/my/${ticketId}/close`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ userId })
        });
        return await response.json();
    } catch (error) {
        console.error('Error cerrando ticket:', error);
        return { success: false, message: 'Error de conexión.' };
    }
}

// ========================================
// 8. SOPORTE — PANEL SUPPORT
// ========================================
export async function getSupportTickets(userId, filters = {}) {
    try {
        const params = new URLSearchParams({ userId });
        if (filters.status)      params.set('status',      filters.status);
        if (filters.priority)    params.set('priority',    filters.priority);
        if (filters.assigned_to) params.set('assigned_to', filters.assigned_to);
        const response = await fetch(`${API_BASE_URL}/support/tickets?${params}`);
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo tickets de soporte:', error);
        return { success: false, data: [] };
    }
}

export async function getSupportTicketDetail(userId, ticketId) {
    try {
        const response = await fetch(`${API_BASE_URL}/support/tickets/${ticketId}?userId=${userId}`);
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo detalle de soporte:', error);
        return { success: false, message: 'Error de conexión.' };
    }
}

export async function takeTicket(userId, ticketId) {
    try {
        const response = await fetch(`${API_BASE_URL}/support/tickets/${ticketId}/take`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ userId })
        });
        return await response.json();
    } catch (error) {
        console.error('Error tomando ticket:', error);
        return { success: false, message: 'Error de conexión.' };
    }
}

export async function changeTicketStatus(userId, ticketId, status) {
    try {
        const response = await fetch(`${API_BASE_URL}/support/tickets/${ticketId}/status`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ userId, status })
        });
        return await response.json();
    } catch (error) {
        console.error('Error cambiando estado de ticket:', error);
        return { success: false, message: 'Error de conexión.' };
    }
}

export async function changeTicketPriority(userId, ticketId, priority) {
    try {
        const response = await fetch(`${API_BASE_URL}/support/tickets/${ticketId}/priority`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ userId, priority })
        });
        return await response.json();
    } catch (error) {
        console.error('Error cambiando prioridad de ticket:', error);
        return { success: false, message: 'Error de conexión.' };
    }
}

export async function replyAsSupport(userId, ticketId, message, isInternal = false) {
    try {
        const endpoint = isInternal
            ? `${API_BASE_URL}/support/tickets/${ticketId}/note`
            : `${API_BASE_URL}/support/tickets/${ticketId}/reply`;
        const response = await fetch(endpoint, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ userId, message })
        });
        return await response.json();
    } catch (error) {
        console.error('Error enviando mensaje de soporte:', error);
        return { success: false, message: 'Error de conexión.' };
    }
}

export async function deleteMyTicket(userId, ticketId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tickets/my/${ticketId}?userId=${userId}`, {
            method: 'DELETE'
        });
        return await response.json();
    } catch (error) {
        console.error('Error eliminando ticket:', error);
        return { success: false, message: 'Error de conexión.' };
    }
}

export async function deleteSupportTicket(userId, ticketId) {
    try {
        const response = await fetch(`${API_BASE_URL}/support/tickets/${ticketId}?userId=${userId}`, {
            method: 'DELETE'
        });
        return await response.json();
    } catch (error) {
        console.error('Error eliminando ticket (soporte):', error);
        return { success: false, message: 'Error de conexión.' };
    }
}

export async function getMacros(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/support/macros?userId=${userId}`);
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo macros:', error);
        return { success: false, data: [] };
    }
}

// ========================================
// 8b. TICKETS — NOTIFICACIONES
// ========================================
export async function getTicketUnreadCount(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tickets/unread-count?userId=${encodeURIComponent(userId)}`);
        return await response.json();
    } catch {
        return { success: false, data: { count: 0 } };
    }
}

// ========================================
// 9. RECOMENDACIONES INTELIGENTES
// ========================================
export async function getRecommendations(userId, month, year) {
    try {
        const params = new URLSearchParams();
        if (month) params.set('month', month);
        if (year)  params.set('year',  year);
        const qs = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`${API_BASE_URL}/recommendations/${userId}${qs}`);
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo recomendaciones:', error);
        return { success: false, data: { recommendations: [], summary: {} } };
    }
}

export async function getRecReadState(userId, month, year) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/recommendations/read-state?userId=${encodeURIComponent(userId)}&month=${month}&year=${year}`
        );
        return await response.json();
    } catch {
        return { success: false, data: { seen_count: 0 } };
    }
}

export async function markRecRead(userId, month, year, count) {
    try {
        const response = await fetch(`${API_BASE_URL}/recommendations/mark-read`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ userId, month, year, count })
        });
        return await response.json();
    } catch {
        return { success: false };
    }
}

export async function createMacro(userId, title, body) {
    try {
        const response = await fetch(`${API_BASE_URL}/support/macros`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ userId, title, body })
        });
        return await response.json();
    } catch (error) {
        console.error('Error creando macro:', error);
        return { success: false, message: 'Error de conexión.' };
    }
}

// ========================================
// 10. FAQ
// ========================================
export async function trackFaqClick(userId, faqKey) {
    try {
        const response = await fetch(`${API_BASE_URL}/faq/click`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ userId, faqKey })
        });
        return await response.json();
    } catch {
        return { success: false };
    }
}

export async function getFaqStats(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/support/faq-stats?userId=${userId}`);
        return await response.json();
    } catch {
        return { success: false, data: [] };
    }
}