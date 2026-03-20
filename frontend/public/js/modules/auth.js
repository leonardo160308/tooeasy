// frontend/public/js/modules/auth.js
// Manejo de sesión del usuario

const USER_KEY = 'too_easy_user_data';

/**
 * Guarda los datos del usuario en localStorage
 * @param {Object} userData - Datos del usuario (id, nombre, level, etc.)
 */
export function saveAuthData(userData) {
    const sessionData = {
        id: userData.id,
        nombre: userData.nombre,
        level: userData.level || 1,
        // Si tu backend enviara un Token JWT, también lo guardarías aquí:
        // token: userData.token,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(sessionData));
    console.log('✅ Sesión guardada:', sessionData);
}

/**
 * Obtiene los datos de la sesión actual
 * @returns {Object|null} Datos del usuario o null si no hay sesión
 */
export function getAuthData() {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
}

/**
 * Verifica si el usuario está logueado
 * @returns {boolean} true si hay sesión activa
 */
export function isAuthenticated() {
    return getAuthData() !== null;
}

/**
 * Verifica la sesión y retorna el ID del usuario
 * @returns {number|null} ID del usuario o null si no está logueado
 */
export function checkSession() {
    const data = getAuthData();
    return data ? data.id : null;
}

/**
 * Obtiene solo el ID del usuario actual
 * @returns {number|null} ID del usuario o null
 */
export function getCurrentUserId() {
    const data = getAuthData();
    return data ? data.id : null;
}

/**
 * Obtiene el nombre del usuario actual
 * @returns {string} Nombre del usuario o "Usuario"
 */
export function getCurrentUserName() {
    const data = getAuthData();
    return data ? data.nombre : 'Usuario';
}

/**
 * Cierra la sesión del usuario
 */
/**
 * Cierra la sesión del usuario
 */
export function logout() {
    localStorage.removeItem(USER_KEY);
    console.log('🚪 Sesión cerrada');
    // ✅ CAMBIO AQUÍ: Usar ruta absoluta
    window.location.href = '/index.html';
}
/**
 * Protección de rutas - Redirige si no hay sesión
 * Usar al inicio de cada página privada
 * @returns {boolean} true si está autenticado, false si no
 */
export function protectRoute() {
    if (!isAuthenticated()) {
        alert("⚠️ Acceso denegado. Debes iniciar sesión.");
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

/**
 * Actualiza los datos locales del usuario (útil después de mejoras)
 * @param {Object} updates - Campos a actualizar
 */
export function updateLocalUserData(updates) {
    const currentData = getAuthData();
    if (!currentData) return;
    
    const updatedData = { ...currentData, ...updates };
    localStorage.setItem(USER_KEY, JSON.stringify(updatedData));
    console.log('🔄 Datos locales actualizados:', updatedData);
}