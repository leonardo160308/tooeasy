import { logout, isAdmin } from './auth.js';
import { alertaConfirmacion } from './alerts.js';
import './nav-active.js';

if (isAdmin()) {
    const nav = document.querySelector('.nav');
    if (nav) {
        const adminLink = document.createElement('a');
        adminLink.href = '/admin.html';
        adminLink.textContent = 'ADMIN';
        adminLink.style.color = '#f39c12';
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
