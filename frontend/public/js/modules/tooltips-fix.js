/**
 * tooltips-fix.js — Portal-based tooltip system
 *
 * Appends a single fixed-position element directly to <body>, bypassing
 * any overflow:hidden on ancestor containers.
 */
(function () {
    'use strict';

    var BG     = '#1a2332';
    var BORDER = 'rgba(182,130,62,0.35)';
    var GAP    = 12;
    var AS     = 6; // arrow half-size

    // ── Portal elements ────────────────────────────────────────────────
    var bubble = document.createElement('div');
    bubble.id  = 'tt-portal-bubble';
    setBase(bubble);
    Object.assign(bubble.style, {
        borderRadius:  '10px',
        padding:       '10px 14px',
        fontSize:      '12px',
        fontWeight:    '500',
        lineHeight:    '1.6',
        boxShadow:     '0 8px 28px rgba(26,35,50,0.32)',
        textAlign:     'left',
        letterSpacing: '0.1px',
        whiteSpace:    'normal',
        transition:    'opacity 0.18s ease',
        opacity:       '0',
        display:       'none',
        fontFamily:    'inherit',
        maxWidth:      '300px',
    });

    var arrowEl = document.createElement('div');
    arrowEl.id  = 'tt-portal-arrow';
    setBase(arrowEl);
    Object.assign(arrowEl.style, { width: '0', height: '0', display: 'none' });

    function setBase(el) {
        Object.assign(el.style, {
            position:      'fixed',
            zIndex:        '9999999',
            pointerEvents: 'none',
            background:    BG,
            color:         '#fff',
            border:        '1px solid ' + BORDER,
        });
    }

    function mount() {
        if (!document.getElementById('tt-portal-bubble')) {
            document.body.appendChild(bubble);
            document.body.appendChild(arrowEl);
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function ttWidth(icon) {
        if (icon.classList.contains('tt-wide'))   return 300;
        if (icon.classList.contains('tt-narrow')) return 180;
        return 250;
    }

    // ── Show / Hide ────────────────────────────────────────────────────
    function show(icon) {
        var text = icon.dataset.tooltip;
        if (!text) return;

        var ttW = ttWidth(icon);
        bubble.textContent   = text;
        bubble.style.width   = ttW + 'px';
        bubble.style.display = 'block';
        bubble.style.opacity = '0';

        var ttH  = bubble.offsetHeight || 80;
        var rect = icon.getBoundingClientRect();
        var vw   = window.innerWidth;
        var vh   = window.innerHeight;

        var pRight  = icon.classList.contains('tt-right');
        var pLeft   = icon.classList.contains('tt-left');
        var pBottom = icon.classList.contains('tt-bottom');

        var bTop, bLeft;

        // Clear arrow inline style completely each time
        arrowEl.removeAttribute('style');
        setBase(arrowEl);
        Object.assign(arrowEl.style, { width: '0', height: '0', display: 'block' });

        if (pRight && rect.right + ttW + GAP <= vw) {
            // ── Right ──
            bLeft = rect.right + GAP;
            bTop  = clamp(rect.top + rect.height / 2 - ttH / 2, 8, vh - ttH - 8);
            Object.assign(arrowEl.style, {
                top:          (rect.top + rect.height / 2 - AS) + 'px',
                left:         (rect.right + GAP - AS - 1) + 'px',
                border:       AS + 'px solid transparent',
                borderRight:  AS + 'px solid ' + BG,
                background:   'transparent',
            });

        } else if (pLeft && rect.left - ttW - GAP >= 0) {
            // ── Left ──
            bLeft = rect.left - ttW - GAP;
            bTop  = clamp(rect.top + rect.height / 2 - ttH / 2, 8, vh - ttH - 8);
            Object.assign(arrowEl.style, {
                top:         (rect.top + rect.height / 2 - AS) + 'px',
                left:        (rect.left - GAP) + 'px',
                border:      AS + 'px solid transparent',
                borderLeft:  AS + 'px solid ' + BG,
                background:  'transparent',
            });

        } else if (pBottom || rect.top - ttH - GAP < 8) {
            // ── Below ──
            bTop  = rect.bottom + GAP;
            bLeft = clamp(rect.left + rect.width / 2 - ttW / 2, 8, vw - ttW - 8);
            Object.assign(arrowEl.style, {
                top:           (rect.bottom + GAP - AS - 1) + 'px',
                left:          clamp(rect.left + rect.width / 2 - AS, 8, vw - AS * 2 - 8) + 'px',
                border:        AS + 'px solid transparent',
                borderBottom:  AS + 'px solid ' + BG,
                background:    'transparent',
            });

        } else {
            // ── Above (default) ──
            bTop  = rect.top - ttH - GAP;
            bLeft = clamp(rect.left + rect.width / 2 - ttW / 2, 8, vw - ttW - 8);
            Object.assign(arrowEl.style, {
                top:        (rect.top - GAP - 1) + 'px',
                left:       clamp(rect.left + rect.width / 2 - AS, 8, vw - AS * 2 - 8) + 'px',
                border:     AS + 'px solid transparent',
                borderTop:  AS + 'px solid ' + BG,
                background: 'transparent',
            });
        }

        bubble.style.top  = bTop + 'px';
        bubble.style.left = bLeft + 'px';
        bubble.style.opacity = '1';
    }

    function hide() {
        bubble.style.opacity = '0';
        bubble.style.display = 'none';
        arrowEl.style.display = 'none';
    }

    // ── Touch support ──────────────────────────────────────────────────
    var activeTouchIcon = null;

    function onTouchStart(e) {
        var icon = e.currentTarget;
        if (activeTouchIcon === icon) {
            hide();
            activeTouchIcon = null;
            return;
        }
        hide();
        show(icon);
        activeTouchIcon = icon;
    }

    document.addEventListener('touchstart', function (e) {
        if (activeTouchIcon && !activeTouchIcon.contains(e.target)) {
            hide();
            activeTouchIcon = null;
        }
    }, { passive: true });

    // ── Init ───────────────────────────────────────────────────────────
    function init() {
        mount();
        document.querySelectorAll('.tooltip-icon[data-tooltip]').forEach(function (icon) {
            icon.addEventListener('mouseenter', function () { show(icon); });
            icon.addEventListener('mouseleave', hide);
            icon.addEventListener('touchstart', onTouchStart, { passive: true });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
