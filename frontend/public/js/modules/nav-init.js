import { logout, isAdmin, getAuthData } from './auth.js';
import { alertaConfirmacion } from './alerts.js';
import './nav-active.js';

// ── Inyectar CSS del support FAB ─────────────────────────────────────────────
(function injectSupportFabCss() {
    if (!document.querySelector('link[href*="support-fab.css"]')) {
        const link = document.createElement('link');
        link.rel  = 'stylesheet';
        link.href = '/public/css/support-fab.css';
        document.head.appendChild(link);
    }
})();

// ── Botón flotante de soporte (bottom-left, todas las páginas) ───────────────
(function injectSupportFab() {
    if (document.querySelector('.support-fab')) return;
    const isSuportePage = window.location.pathname.includes('soporte');
    if (isSuportePage) return;

    const fab = document.createElement('a');
    fab.className  = 'support-fab';
    fab.href       = '/soporte.html';
    fab.title      = 'Centro de Soporte';
    fab.setAttribute('aria-label', 'Abrir Centro de Soporte');
    fab.innerHTML  = '<i class="fas fa-wrench"></i>';
    document.body.appendChild(fab);
})();

const nav        = document.querySelector('.nav');
const _authData  = getAuthData();
const _userRole  = _authData?.role || '';

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
