/**
 * nav-active.js
 * Marca el enlace activo del header según la página actual.
 * Importar en cada página (excepto admin).
 * 
 * Uso: <script type="module" src="/public/js/modules/nav-active.js"></script>
 * O importar dentro de un módulo existente: import '/public/js/modules/nav-active.js';
 */

(function markActiveNav() {
    // Mapa: fragmento de pathname → texto del enlace (case-insensitive)
    const routeMap = [
        { pattern: /\/dashboard/i,   text: 'DASHBOARD' },
        { pattern: /\/inversiones/i, text: 'INVERSIONES' },
        { pattern: /\/retos/i,       text: 'RETOS' },
        { pattern: /\/lecciones/i,   text: 'LECCIONES' },
        { pattern: /\/perfil/i,      text: 'PERFIL' },
        { pattern: /\/nivel/i,       text: 'LECCIONES' },
        { pattern: /\/quiz/i,        text: 'LECCIONES' },
    ];

    const currentPath = window.location.pathname;

    // Buscar coincidencia
    const match = routeMap.find(r => r.pattern.test(currentPath));
    if (!match) return;

    // Marcar el enlace correspondiente
    const navLinks = document.querySelectorAll('.nav a');
    navLinks.forEach(link => {
        const linkText = (link.textContent || '').trim().toUpperCase();
        if (linkText === match.text.toUpperCase()) {
            link.classList.add('active');
        }
    });
})();