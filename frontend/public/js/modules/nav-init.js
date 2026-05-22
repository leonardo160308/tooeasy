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

// ── HAMBURGER MENU (mobile) ──────────────────────────────────────────────────
(function injectHamburger() {
    const header = document.querySelector('.header');
    const navEl  = document.querySelector('.nav');
    if (!header || !navEl || document.querySelector('.nav-hamburger')) return;

    // Hamburger toggle button
    const hamburger = document.createElement('button');
    hamburger.className = 'nav-hamburger';
    hamburger.setAttribute('aria-label', 'Abrir menú de navegación');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.innerHTML = '<i class="fas fa-bars"></i>';
    header.appendChild(hamburger);

    // Dark overlay
    const overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    document.body.appendChild(overlay);

    // Side drawer
    const drawer = document.createElement('nav');
    drawer.className = 'nav-drawer';
    drawer.setAttribute('aria-label', 'Navegación móvil');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'nav-drawer-close';
    closeBtn.setAttribute('aria-label', 'Cerrar menú');
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    drawer.appendChild(closeBtn);

    // Clone nav links into drawer; wire logout clones to the original element
    Array.from(navEl.children).forEach(child => {
        const clone = child.cloneNode(true);
        if (child.id) {
            clone.removeAttribute('id');
            if (child.id.startsWith('logout-btn')) {
                clone.addEventListener('click', e => {
                    e.preventDefault();
                    child.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                });
            }
        }
        drawer.appendChild(clone);
    });

    document.body.appendChild(drawer);

    const openDrawer = () => {
        drawer.classList.add('open');
        overlay.classList.add('open');
        hamburger.setAttribute('aria-expanded', 'true');
        hamburger.innerHTML = '<i class="fas fa-times"></i>';
    };

    const closeDrawer = () => {
        drawer.classList.remove('open');
        overlay.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.innerHTML = '<i class="fas fa-bars"></i>';
    };

    hamburger.addEventListener('click', () =>
        drawer.classList.contains('open') ? closeDrawer() : openDrawer()
    );
    closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    // Close drawer when a regular link (not the logout icon) is tapped
    drawer.querySelectorAll('a').forEach(a => {
        if (!a.querySelector('img')) a.addEventListener('click', closeDrawer);
    });
})();
