// frontend/public/js/modules/auth.js
// Manejo de sesión del usuario

const USER_KEY      = 'too_easy_user_data';
const SESSION_TTL   = 7 * 24 * 60 * 60 * 1000; // 7 días en ms

export function saveAuthData(userData, sessionToken = null) {
    const sessionData = {
        id:           userData.id,
        nombre:       userData.nombre,
        level:        userData.level || 1,
        role:         userData.role || 'user',
        expiresAt:    Date.now() + SESSION_TTL,
        sessionToken: sessionToken || null,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(sessionData));
}

export function getSessionToken() {
    const data = getAuthData();
    return data?.sessionToken || null;
}

export function isAdmin() {
    const data = getAuthData();
    return data && data.role === 'admin';
}

export function isSupport() {
    const data = getAuthData();
    return data && (data.role === 'support' || data.role === 'admin');
}

export function getAuthData() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    let data;
    try {
        data = JSON.parse(raw);
    } catch {
        localStorage.removeItem(USER_KEY);
        return null;
    }
    if (data.expiresAt && data.expiresAt < Date.now()) {
        localStorage.removeItem(USER_KEY);
        return null;
    }
    return data;
}

export function isAuthenticated() {
    return getAuthData() !== null;
}

export function checkSession() {
    const data = getAuthData();
    return data ? data.id : null;
}

export function getCurrentUserId() {
    const data = getAuthData();
    return data ? data.id : null;
}

export function getCurrentUserName() {
    const data = getAuthData();
    return data ? data.nombre : 'Usuario';
}

export function logout() {
    localStorage.removeItem(USER_KEY);
    window.location.href = '/index.html';
}

export function protectRoute() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

export function updateLocalUserData(updates) {
    const currentData = getAuthData();
    if (!currentData) return;
    const updatedData = { ...currentData, ...updates };
    localStorage.setItem(USER_KEY, JSON.stringify(updatedData));
}
