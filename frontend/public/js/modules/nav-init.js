import { logout, isAdmin, getAuthData } from './auth.js';
import { alertaConfirmacion } from './alerts.js';
import './nav-active.js';

const nav        = document.querySelector('.nav');
const _authData  = getAuthData();
const _userRole  = _authData?.role || '';

// Link SOPORTE para todos los usuarios autenticados (si no existe ya en el HTML)
if (nav && !nav.querySelector('a[href="/soporte.html"]')) {
    const soporteLink = document.createElement('a');
    soporteLink.href = '/soporte.html';
    soporteLink.textContent = 'SOPORTE';
    nav.insertBefore(soporteLink, nav.children[nav.children.length - 1]);
}

// Link PANEL solo para rol support (NO para admin)
if (_userRole === 'support' && nav && !nav.querySelector('a[href="/soporte-panel.html"]')) {
    const panelLink = document.createElement('a');
    panelLink.href = '/soporte-panel.html';
    panelLink.textContent = 'PANEL';
    panelLink.className = 'nav-link-admin';
    nav.insertBefore(panelLink, nav.children[nav.children.length - 1]);
}

// Link ADMIN solo para rol admin
if (isAdmin()) {
    if (nav && !nav.querySelector('a[href="/admin.html"]')) {
        const adminLink = document.createElement('a');
        adminLink.href = '/admin.html';
        adminLink.textContent = 'ADMIN';
        adminLink.className = 'nav-link-admin';
        nav.insertBefore(adminLink, nav.children[nav.children.length - 1]);
    }
}

const logoutBtn = document.getElementById('logout-btn-perfil')
    || document.getElementById('logout-btn-inv');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const confirmar = await alertaConfirmacion(
            '¿Estás seguro de que deseas cerrar sesión?',
            '👋 Salir de TOO-EASY'
        );
        if (confirmar) logout();
    });
}
