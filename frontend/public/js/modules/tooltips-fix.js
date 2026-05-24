/**
 * tooltips-fix.js — Reposicionamiento automático de tooltips + soporte táctil
 *
 * Mejoras sobre el sistema CSS puro:
 *  1. Detecta si el tooltip saldría de pantalla y cambia la clase de posición.
 *  2. Añade soporte para toque en móvil (tap para mostrar/ocultar).
 *  3. Restaura la clase original al salir del hover.
 */
(function () {
    'use strict';

    const TT_WIDTH = {
        default: 250,
        wide:    300,
        narrow:  180
    };

    function getTooltipWidth(icon) {
        if (icon.classList.contains('tt-wide'))   return TT_WIDTH.wide;
        if (icon.classList.contains('tt-narrow')) return TT_WIDTH.narrow;
        return TT_WIDTH.default;
    }

    function saveOriginalClass(icon) {
        if (!icon.dataset.obOrigClass) {
            icon.dataset.obOrigClass = icon.className;
        }
    }

    function restoreClass(icon) {
        if (icon.dataset.obOrigClass) {
            icon.className = icon.dataset.obOrigClass;
        }
    }

    function fixPosition(icon) {
        saveOriginalClass(icon);

        const rect  = icon.getBoundingClientRect();
        const vw    = window.innerWidth;
        const vh    = window.innerHeight;
        const ttW   = getTooltipWidth(icon);
        const ttH   = 90; // estimación razonable de altura del tooltip
        const GAP   = 16;

        const isRight  = icon.classList.contains('tt-right');
        const isLeft   = icon.classList.contains('tt-left');
        const isBottom = icon.classList.contains('tt-bottom');
        // Sin clase → tooltip arriba por defecto

        // ── Tooltip arriba (default) ──
        if (!isRight && !isLeft && !isBottom) {
            if (rect.top - ttH - GAP < 0) {
                icon.classList.add('tt-bottom');
            } else {
                // Corregir desbordamiento horizontal
                const centeredLeft = rect.left + rect.width / 2 - ttW / 2;
                if (centeredLeft < 0) {
                    icon.style.setProperty('--tt-shift', `${-centeredLeft}px`);
                } else if (centeredLeft + ttW > vw) {
                    icon.style.setProperty('--tt-shift', `${vw - centeredLeft - ttW - 8}px`);
                }
            }
        }

        // ── Tooltip derecha ──
        if (isRight) {
            if (rect.right + ttW + GAP > vw) {
                icon.classList.remove('tt-right');
                // ¿Cabe a la izquierda?
                if (rect.left - ttW - GAP > 0) {
                    icon.classList.add('tt-left');
                } else {
                    // Si no cabe ni a derecha ni a izquierda → abajo
                    icon.classList.add('tt-bottom');
                }
            }
        }

        // ── Tooltip izquierda ──
        if (isLeft) {
            if (rect.left - ttW - GAP < 0) {
                icon.classList.remove('tt-left');
                if (rect.right + ttW + GAP < vw) {
                    icon.classList.add('tt-right');
                } else {
                    icon.classList.add('tt-bottom');
                }
            }
        }

        // ── Tooltip abajo ──
        if (isBottom) {
            if (rect.bottom + ttH + GAP > vh) {
                icon.classList.remove('tt-bottom');
                // Subir al tope
            }
        }
    }

    // ── Soporte táctil ────────────────────────────────────────────────────────
    let activeTouchIcon = null;

    function onTouchStart(e) {
        const icon = e.currentTarget;
        if (activeTouchIcon && activeTouchIcon !== icon) {
            activeTouchIcon.classList.remove('tt-touch');
            restoreClass(activeTouchIcon);
            activeTouchIcon = null;
        }
        if (icon.classList.contains('tt-touch')) {
            icon.classList.remove('tt-touch');
            restoreClass(icon);
            activeTouchIcon = null;
        } else {
            fixPosition(icon);
            icon.classList.add('tt-touch');
            activeTouchIcon = icon;
        }
    }

    function closeOnOutsideTouch(e) {
        if (activeTouchIcon && !activeTouchIcon.contains(e.target)) {
            activeTouchIcon.classList.remove('tt-touch');
            restoreClass(activeTouchIcon);
            activeTouchIcon = null;
        }
    }

    // ── Init ─────────────────────────────────────────────────────────────────
    function init() {
        const icons = document.querySelectorAll('.tooltip-icon[data-tooltip]');

        icons.forEach(icon => {
            icon.addEventListener('mouseenter', () => fixPosition(icon));
            icon.addEventListener('mouseleave', () => restoreClass(icon));
            icon.addEventListener('touchstart', onTouchStart, { passive: true });
        });

        document.addEventListener('touchstart', closeOnOutsideTouch, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
