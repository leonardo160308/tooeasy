/**
 * onboarding.js — Tour interactivo por módulo para TOO-EASY
 *
 * Uso:
 *   import { initOnboarding, restartOnboarding } from './onboarding.js';
 *   initOnboarding(userId, 'dashboard');
 *   restartOnboarding(userId, 'dashboard');
 */

import { updateUserData } from './api.js';

const OB_KEY_PREFIX = 'too_easy_ob_';
const OB_GAP        = 8;   // px de padding alrededor del spotlight
const NAVBAR_H      = 70;  // altura aproximada del header fijo

// ─── Etiquetas de módulo ──────────────────────────────────────────────────────
const MODULE_LABELS = {
    dashboard:   'Panel de Finanzas',
    inversiones: 'Inversiones',
    retos:       'Retos',
    lecciones:   'Lecciones',
    perfil:      'Perfil',
    soporte:     'Soporte'
};

// ─── Pasos por módulo ─────────────────────────────────────────────────────────
const MODULE_STEPS = {
    dashboard: [
        {
            title: 'Resumen Mensual y Metas',
            body: 'Aquí configuras tus ingresos y gastos fijos del mes. El sistema calcula tu ahorro automáticamente según el método que elijas.',
            target: '.module-calculator',
            position: 'right'
        },
        {
            title: 'Ingresos y Gastos Fijos',
            body: 'Ingresa tus cobros y pagos recurrentes mensuales: sueldo, renta, servicios. Se suman a los movimientos del calendario.',
            target: '.fixed-data-grid',
            position: 'right'
        },
        {
            title: 'Método de Ahorro',
            body: 'Elige entre la regla 50/30/20, un porcentaje personalizado o una cantidad fija. El sistema valida que tu ahorro no supere tus ingresos reales.',
            target: '.saving-method-section',
            position: 'right'
        },
        {
            title: 'Calendario de Movimientos',
            body: 'Haz clic en cualquier día para registrar un ingreso o gasto. Verde indica saldo positivo, rojo saldo negativo y gris indica empate.',
            target: '.module-calendar',
            position: 'left'
        },
        {
            title: 'Navegación entre Módulos',
            body: 'Explora Inversiones para simular portafolios, Retos para ganar recompensas, Lecciones para aprender finanzas y tu Perfil para personalizar todo.',
            target: '.nav',
            position: 'bottom'
        }
    ],

    inversiones: [
        {
            title: 'Módulo de Inversiones',
            body: 'Simula portafolios financieros con el método Monte Carlo. Configura tu capital, plazo, instrumentos y perfil de riesgo para proyectar distintos escenarios posibles.',
            target: '.inv-sidebar',
            position: 'right'
        },
        {
            title: 'Crear una Simulación',
            body: 'El asistente de 3 pasos te guía: primero configuras el portafolio, luego seleccionas instrumentos financieros y finalmente ejecutas 500 escenarios Monte Carlo.',
            target: '#section-inicio .section-title',
            position: 'bottom'
        },
        {
            title: 'Iniciar y Gestionar Simulaciones',
            body: 'Crea nuevas simulaciones o consulta el historial de las anteriores. El motor calcula correlaciones reales entre activos para una diversificación auténtica.',
            target: '.inicio-actions',
            position: 'top'
        },
        {
            title: 'Resultados, Historial y Comparación',
            body: 'Cada simulación incluye percentiles P10/P50/P90, Sharpe Ratio, VaR 95% y probabilidad de ganancia. Compara varias simulaciones lado a lado para evaluar estrategias.',
            target: '.nav',
            position: 'bottom'
        }
    ],

    retos: [
        {
            title: 'Sistema de Retos',
            body: 'Los retos son desafíos financieros que se completan al registrar ciertos movimientos en el Dashboard. Cada reto completado entrega una recompensa.',
            target: '.top-stats-card',
            position: 'right'
        },
        {
            title: 'Progreso y Reclamación',
            body: 'Cada reto muestra una barra de progreso con la condición a cumplir. Al alcanzar el objetivo, aparece el botón "Reclamar" para cobrar tu recompensa.',
            target: '#challenges-container',
            position: 'right'
        },
        {
            title: 'Madera — Recurso de Mejora',
            body: 'Completar retos te da Madera. Este recurso se usa en la sección Perfil para mejorar tu Casa hasta el nivel 10 y desbloquear skins más avanzados.',
            target: '.stats-bar',
            position: 'right'
        }
    ],

    lecciones: [
        {
            title: 'Categorías de Aprendizaje',
            body: 'Cada tarjeta representa una categoría de educación financiera. Haz clic en una para desplegar sus niveles disponibles y comenzar a aprender.',
            target: '.pagina-principal',
            position: 'bottom'
        },
        {
            title: 'Tu Progreso Educativo',
            body: 'El indicador superior muestra cuántas categorías has completado. Completar todas las categorías eleva tu nivel educativo, visible en tu Perfil.',
            target: '.edu-progress-banner',
            position: 'bottom'
        },
        {
            title: 'Niveles y Monedas',
            body: 'Dentro de cada categoría los niveles se desbloquean en orden. Completa el quiz de cada nivel para avanzar y ganar Monedas que sirven para mejorar tu Castor.',
            target: '.tarjetas',
            position: 'top'
        }
    ],

    perfil: [
        {
            title: 'Tu Perfil',
            body: 'Aquí encuentras tu información personal: nombre, género y edad. Usa el botón "Editar" para modificar tus datos o cambiar tu avatar.',
            target: '.info-card',
            position: 'right'
        },
        {
            title: 'Monedas y Madera',
            body: 'Las Monedas se obtienen completando niveles en Lecciones y la Madera completando Retos. Ambos recursos sirven para mejorar tu personaje.',
            target: '.stats-bar',
            position: 'right'
        },
        {
            title: 'Mejorar Casa y Castor',
            body: 'Usa Madera para mejorar tu Casa hasta nivel 10 y Monedas para entrenar tu Castor hasta nivel 10. Cada mejora desbloquea nuevos skins visuales.',
            target: '.upgrade-actions',
            position: 'right'
        },
        {
            title: 'Skins y Personalización',
            body: 'Usa las flechas para navegar entre los skins disponibles. Los skins se desbloquean al subir el nivel correspondiente. Pulsa "Equipar" para activar el que prefieras.',
            target: '.skin-controls-container',
            position: 'top'
        }
    ],

    soporte: [
        {
            title: 'Centro de Soporte',
            body: 'Desde aquí puedes crear tickets de soporte, consultar tus solicitudes anteriores y leer las preguntas frecuentes para resolver dudas comunes.',
            target: '.soporte-hero',
            position: 'bottom'
        },
        {
            title: 'Crear un Ticket',
            body: 'Completa el formulario con el tipo de consulta, asunto y descripción detallada. Puedes adjuntar una imagen si ayuda a explicar el problema.',
            target: '#create-ticket-card',
            position: 'right'
        },
        {
            title: 'Seguimiento de Tickets',
            body: 'En "Mis Tickets" consulta el estado de cada solicitud: Abierto, En revisión o Cerrado. Haz clic en un ticket para ver el hilo de conversación y responder.',
            target: '#my-tickets-card',
            position: 'left'
        }
    ]
};

// ─── Persistencia por módulo ──────────────────────────────────────────────────
function getModuleKey(moduleId) { return `${OB_KEY_PREFIX}${moduleId}`; }

function getState(moduleId) {
    try { return JSON.parse(localStorage.getItem(getModuleKey(moduleId)) || 'null'); }
    catch { return null; }
}

function setState(moduleId, patch) {
    const current = getState(moduleId) || {};
    localStorage.setItem(getModuleKey(moduleId), JSON.stringify({ ...current, ...patch }));
}

// ─── DOM helpers ──────────────────────────────────────────────────────────────
function el(id) { return document.getElementById(id); }

function createEl(tag, className, innerHTML = '') {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (innerHTML) e.innerHTML = innerHTML;
    return e;
}

// ─── Tour state ───────────────────────────────────────────────────────────────
let currentStep    = 0;
let tourActive     = false;
let activeUserId   = null;
let activeModuleId = null;
let activeSteps    = [];
let stepRenderGen  = 0;   // Anti-race counter for async renders

let overlay, spotlight, stepBox;

// ─── Dynamic position management ─────────────────────────────────────────────
let _liveTarget   = null;
let _livePosition = null;
let _scrollFn     = null;
let _resizeObs    = null;

function attachLiveUpdates(targetEl, position) {
    _liveTarget   = targetEl;
    _livePosition = position;

    const tick = () => {
        if (!_liveTarget || !spotlight) return;
        const rect = _liveTarget.getBoundingClientRect();
        _applySpotlight(rect);
        if (window.innerWidth > 600) _applyStepBox(rect, _livePosition);
    };

    _scrollFn = tick;
    window.addEventListener('scroll', _scrollFn, { passive: true });

    if (typeof ResizeObserver !== 'undefined') {
        _resizeObs = new ResizeObserver(tick);
        _resizeObs.observe(document.documentElement);
    } else {
        // Fallback: window resize event
        window.addEventListener('resize', tick);
    }
}

function detachLiveUpdates() {
    if (_scrollFn) { window.removeEventListener('scroll', _scrollFn); _scrollFn = null; }
    if (_resizeObs) { _resizeObs.disconnect(); _resizeObs = null; }
    else { window.removeEventListener('resize', _scrollFn || (() => {})); }
    _liveTarget = _livePosition = null;
}

// ─── Scroll-to-element with scroll-end detection ──────────────────────────────
function scrollToElement(targetEl) {
    return new Promise(resolve => {
        const rect         = targetEl.getBoundingClientRect();
        const topOk        = rect.top    >= NAVBAR_H + 10;
        const bottomOk     = rect.bottom <= window.innerHeight - 60;
        const alreadyInView = topOk && bottomOk;

        if (alreadyInView) { resolve(); return; }

        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // scrollend: Chrome 109+, Safari 17.4+
        if ('onscrollend' in window) {
            const h = () => { window.removeEventListener('scrollend', h); resolve(); };
            window.addEventListener('scrollend', h, { once: true });
            setTimeout(() => { window.removeEventListener('scrollend', h); resolve(); }, 1200);
        } else {
            // Fallback: resolve when scroll stops (150ms idle)
            let timer;
            const h = () => {
                clearTimeout(timer);
                timer = setTimeout(() => { window.removeEventListener('scroll', h); resolve(); }, 180);
            };
            window.addEventListener('scroll', h, { passive: true });
            // Hard timeout
            setTimeout(() => { clearTimeout(timer); window.removeEventListener('scroll', h); resolve(); }, 900);
        }
    });
}

// ─── Spotlight ────────────────────────────────────────────────────────────────
function _applySpotlight(rect) {
    // position: fixed uses viewport coords — do NOT add scrollY/scrollX
    Object.assign(spotlight.style, {
        top:    `${rect.top    - OB_GAP}px`,
        left:   `${rect.left   - OB_GAP}px`,
        width:  `${rect.width  + OB_GAP * 2}px`,
        height: `${rect.height + OB_GAP * 2}px`
    });
}

// ─── Step box positioning (desktop only; mobile uses CSS bottom-fixed) ─────────
function _applyStepBox(targetRect, position) {
    const isMobile = window.innerWidth <= 600;
    if (isMobile) return;  // CSS handles layout on mobile

    const boxW    = stepBox.offsetWidth  || 340;
    const boxH    = stepBox.offsetHeight || 210;
    const vw      = window.innerWidth;
    const vh      = window.innerHeight;
    const gap     = 18;
    const minTop  = NAVBAR_H + 8;
    const maxTop  = vh - boxH - 8;
    const minLeft = 8;
    const maxLeft = vw - boxW - 8;

    stepBox.classList.remove('ob-arrow-left', 'ob-arrow-right', 'ob-arrow-top', 'ob-arrow-bottom');

    let top, left, arrowClass;
    const order = [position, 'bottom', 'right', 'left', 'top'];

    for (const pos of order) {
        if (pos === 'right') {
            left = targetRect.right + gap;
            top  = targetRect.top + (targetRect.height / 2) - (boxH / 2);
            arrowClass = 'ob-arrow-left';
        } else if (pos === 'left') {
            left = targetRect.left - boxW - gap;
            top  = targetRect.top + (targetRect.height / 2) - (boxH / 2);
            arrowClass = 'ob-arrow-right';
        } else if (pos === 'bottom') {
            left = targetRect.left + (targetRect.width / 2) - (boxW / 2);
            top  = targetRect.bottom + gap;
            arrowClass = 'ob-arrow-top';
        } else {
            left = targetRect.left + (targetRect.width / 2) - (boxW / 2);
            top  = targetRect.top - boxH - gap;
            arrowClass = 'ob-arrow-bottom';
        }
        const fits = left >= minLeft && left + boxW <= vw - 8 && top >= minTop && top + boxH <= vh - 8;
        if (fits) break;
    }

    left = Math.max(minLeft, Math.min(left, maxLeft));
    top  = Math.max(minTop,  Math.min(top,  maxTop));

    // position: fixed — no scrollX/scrollY
    Object.assign(stepBox.style, { left: `${left}px`, top: `${top}px` });
    if (arrowClass) stepBox.classList.add(arrowClass);
}

// ─── Tour UI construction ─────────────────────────────────────────────────────
function buildTourUI() {
    overlay = createEl('div', 'ob-overlay');
    overlay.id = 'ob-overlay';

    spotlight = createEl('div', 'ob-spotlight');
    spotlight.id = 'ob-spotlight';

    stepBox = createEl('div', 'ob-step-box');
    stepBox.id = 'ob-step-box';
    stepBox.innerHTML = `
        <div class="ob-step-header">
            <span class="ob-step-count" id="ob-count"></span>
            <button class="ob-btn-skip" id="ob-skip">Saltar</button>
        </div>
        <div class="ob-progress-bar"><div class="ob-progress-fill" id="ob-progress"></div></div>
        <h3 class="ob-step-title" id="ob-title"></h3>
        <p  class="ob-step-body"  id="ob-body"></p>
        <div class="ob-step-nav">
            <button class="ob-btn-prev" id="ob-prev">Anterior</button>
            <div class="ob-dots" id="ob-dots"></div>
            <button class="ob-btn-next" id="ob-next">Siguiente</button>
        </div>
    `;

    document.body.append(overlay, spotlight, stepBox);

    el('ob-skip').addEventListener('click', finishTour);
    el('ob-prev').addEventListener('click', () => goToStep(currentStep - 1));
    el('ob-next').addEventListener('click', () => goToStep(currentStep + 1));

    const dotsContainer = el('ob-dots');
    activeSteps.forEach((_, i) => {
        const dot = createEl('button', 'ob-dot');
        dot.title = `Paso ${i + 1}`;
        dot.addEventListener('click', () => goToStep(i));
        dotsContainer.appendChild(dot);
    });
}

// ─── Step render (async for scroll) ──────────────────────────────────────────
async function renderStep(index) {
    const gen   = ++stepRenderGen;
    const step  = activeSteps[index];
    const total = activeSteps.length;

    el('ob-count').textContent = `Paso ${index + 1} de ${total}`;
    el('ob-title').textContent = step.title;
    el('ob-body').textContent  = step.body;
    el('ob-progress').style.width = `${((index + 1) / total) * 100}%`;

    el('ob-prev').disabled = (index === 0);

    const nextBtn = el('ob-next');
    if (index === total - 1) {
        nextBtn.textContent = 'Finalizar';
        nextBtn.onclick = finishTour;
    } else {
        nextBtn.textContent = 'Siguiente';
        nextBtn.onclick = () => goToStep(currentStep + 1);
    }

    document.querySelectorAll('.ob-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });

    // Tear down previous position listeners and hide spotlight during scroll
    detachLiveUpdates();
    spotlight.classList.remove('ob-visible');

    const targetEl = document.querySelector(step.target);

    if (targetEl) {
        // Scroll element into view and wait for scroll to settle
        await scrollToElement(targetEl);

        // Abort if user navigated to another step while we were waiting
        if (gen !== stepRenderGen) return;

        // Position spotlight and step box using current viewport coordinates
        const rect = targetEl.getBoundingClientRect();
        _applySpotlight(rect);
        if (window.innerWidth > 600) _applyStepBox(rect, step.position);
        spotlight.classList.add('ob-visible');

        // Attach real-time position updaters (scroll + resize)
        attachLiveUpdates(targetEl, step.position);
    } else {
        // No target element found: show minimal spotlight in center
        _applySpotlight({
            top:    window.innerHeight / 2 - 20,
            left:   window.innerWidth  / 2 - 20,
            width:  40,
            height: 40
        });
        spotlight.classList.add('ob-visible');
    }
}

function goToStep(index) {
    if (index < 0 || index >= activeSteps.length) return;
    currentStep = index;
    renderStep(currentStep);
}

// ─── Start / finish tour ──────────────────────────────────────────────────────
function startTour(uid, moduleId) {
    if (tourActive) return;
    tourActive     = true;
    activeUserId   = uid;
    activeModuleId = moduleId;
    activeSteps    = MODULE_STEPS[moduleId] || [];
    currentStep    = 0;

    if (!el('ob-overlay')) buildTourUI();

    overlay.classList.add('ob-visible');
    setTimeout(() => {
        stepBox.classList.add('ob-visible');
        renderStep(0);
    }, 120);
}

function finishTour() {
    tourActive = false;
    detachLiveUpdates();
    setState(activeModuleId, { seen: true, completedAt: new Date().toISOString() });

    if (activeUserId) {
        updateUserData(activeUserId, {
            has_seen_tutorial: true,
            tutorial_completed_at: new Date().toISOString()
        }).catch(() => {});
    }

    if (overlay)   overlay.classList.remove('ob-visible');
    if (spotlight) spotlight.classList.remove('ob-visible');
    if (stepBox) {
        stepBox.classList.remove('ob-visible');
        setTimeout(() => {
            overlay?.remove(); spotlight?.remove(); stepBox?.remove();
            overlay = spotlight = stepBox = null;
        }, 350);
    }
}

// ─── Welcome modal ────────────────────────────────────────────────────────────
function showWelcomeModal(uid, moduleId) {
    const label = MODULE_LABELS[moduleId] || moduleId;
    const modal = createEl('div', 'ob-welcome-overlay');
    modal.id = 'ob-welcome';
    modal.innerHTML = `
        <div class="ob-welcome-modal">
            <div class="ob-welcome-badge">${label}</div>
            <h2>Tour del módulo</h2>
            <p>Haz un recorrido guiado para conocer las funciones principales de este módulo y sacarle el máximo provecho.</p>
            <div class="ob-welcome-actions">
                <button class="ob-btn-start" id="ob-btn-start">Comenzar tour</button>
                <button class="ob-btn-later" id="ob-btn-later">Ahora no</button>
                <button class="ob-btn-never" id="ob-btn-never">No volver a mostrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('ob-visible'));

    const closeModal = () => {
        modal.classList.remove('ob-visible');
        setTimeout(() => modal.remove(), 350);
    };

    el('ob-btn-start').addEventListener('click', () => { closeModal(); setTimeout(() => startTour(uid, moduleId), 200); });
    el('ob-btn-later').addEventListener('click', () => { setState(moduleId, { seen: true }); closeModal(); });
    el('ob-btn-never').addEventListener('click', () => {
        setState(moduleId, { seen: true, disabled: true });
        if (uid) updateUserData(uid, { has_seen_tutorial: true, tutorial_disabled: true }).catch(() => {});
        closeModal();
    });
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function initOnboarding(uid, moduleId = 'dashboard') {
    if (!MODULE_STEPS[moduleId]) return;
    const state = getState(moduleId);
    if (state?.disabled || state?.seen) return;
    setTimeout(() => showWelcomeModal(uid, moduleId), 1200);
}

export function restartOnboarding(uid, moduleId = 'dashboard') {
    setState(moduleId, { seen: false, disabled: false });
    el('ob-welcome')?.remove();
    startTour(uid || activeUserId, moduleId);
}
