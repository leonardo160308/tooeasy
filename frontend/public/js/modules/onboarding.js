/**
 * onboarding.js — Tour interactivo para TOO-EASY
 *
 * Uso:
 *   import { initOnboarding, restartOnboarding } from './onboarding.js';
 *   initOnboarding(userId);          // llamar al cargar la página
 *   restartOnboarding(userId);       // llamar desde un botón "ver tour"
 */

import { updateUserData } from './api.js';

const OB_KEY = 'too_easy_onboarding';
const OB_GAP = 10; // px de padding alrededor del spotlight

// ─── Pasos del tour ───────────────────────────────────────────────────────────
const STEPS = [
    {
        title: '📊 Resumen Mensual y Metas',
        body:  'Aquí configuras tus ingresos y gastos fijos del mes. El sistema calcula tu ahorro automáticamente según el método que elijas.',
        target: '.module-calculator',
        position: 'right'
    },
    {
        title: '💸 Ingresos y Gastos Fijos',
        body:  'Ingresa tus cobros y pagos recurrentes mensuales: sueldo, renta, servicios, etc. Se suman a tus movimientos del calendario.',
        target: '.fixed-data-grid',
        position: 'right'
    },
    {
        title: '🎯 Método de Ahorro',
        body:  'Elige entre la regla 50/30/20, un porcentaje personalizado o una cantidad fija. El sistema valida que tu ahorro no supere tus ingresos reales.',
        target: '.saving-method-section',
        position: 'right'
    },
    {
        title: '📅 Calendario de Movimientos',
        body:  'Haz clic en cualquier día para registrar un ingreso o gasto. Verde = saldo positivo · Rojo = saldo negativo · Gris = empate.',
        target: '.module-calendar',
        position: 'left'
    },
    {
        title: '🧭 Módulos de la Aplicación',
        body:  'Explora Inversiones para simular portafolios, Retos para ganar recompensas, Lecciones para aprender finanzas y tu Perfil para personalizar todo.',
        target: '.nav',
        position: 'bottom'
    }
];

// ─── Persistencia ─────────────────────────────────────────────────────────────
function getState() {
    try { return JSON.parse(localStorage.getItem(OB_KEY) || 'null'); }
    catch { return null; }
}

function setState(patch) {
    const current = getState() || {};
    localStorage.setItem(OB_KEY, JSON.stringify({ ...current, ...patch }));
}

// ─── DOM helpers ──────────────────────────────────────────────────────────────
function el(id) { return document.getElementById(id); }

function createEl(tag, className, innerHTML = '') {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (innerHTML) e.innerHTML = innerHTML;
    return e;
}

// ─── Tour engine ──────────────────────────────────────────────────────────────
let currentStep = 0;
let tourActive   = false;
let userId       = null;

let overlay, spotlight, stepBox;

function buildTourUI() {
    // Overlay oscuro
    overlay   = createEl('div', 'ob-overlay');
    overlay.id = 'ob-overlay';

    // Spotlight (caja recortada)
    spotlight = createEl('div', 'ob-spotlight');
    spotlight.id = 'ob-spotlight';

    // Caja de paso
    stepBox   = createEl('div', 'ob-step-box');
    stepBox.id = 'ob-step-box';
    stepBox.innerHTML = `
        <div class="ob-step-header">
            <span class="ob-step-count" id="ob-count"></span>
            <button class="ob-btn-skip" id="ob-skip" title="Saltar el tour">Saltar</button>
        </div>
        <div class="ob-progress-bar"><div class="ob-progress-fill" id="ob-progress"></div></div>
        <h3 class="ob-step-title" id="ob-title"></h3>
        <p  class="ob-step-body"  id="ob-body"></p>
        <div class="ob-step-nav">
            <button class="ob-btn-prev" id="ob-prev">← Anterior</button>
            <div class="ob-dots" id="ob-dots"></div>
            <button class="ob-btn-next" id="ob-next">Siguiente →</button>
        </div>
    `;

    document.body.append(overlay, spotlight, stepBox);

    // Eventos
    el('ob-skip').addEventListener('click', finishTour);
    el('ob-prev').addEventListener('click', () => goToStep(currentStep - 1));
    el('ob-next').addEventListener('click', () => goToStep(currentStep + 1));

    // Dots
    const dotsContainer = el('ob-dots');
    STEPS.forEach((_, i) => {
        const dot = createEl('button', 'ob-dot');
        dot.title = `Ir al paso ${i + 1}`;
        dot.addEventListener('click', () => goToStep(i));
        dotsContainer.appendChild(dot);
    });
}

function positionSpotlight(rect) {
    const pad = OB_GAP;
    Object.assign(spotlight.style, {
        top:    `${rect.top  + window.scrollY - pad}px`,
        left:   `${rect.left + window.scrollX - pad}px`,
        width:  `${rect.width  + pad * 2}px`,
        height: `${rect.height + pad * 2}px`
    });
}

function positionStepBox(targetRect, position) {
    const boxW = stepBox.offsetWidth  || 340;
    const boxH = stepBox.offsetHeight || 220;
    const vw   = window.innerWidth;
    const vh   = window.innerHeight;
    const gap  = 20;

    // Limpiar clases de flecha
    stepBox.classList.remove('ob-arrow-left', 'ob-arrow-right', 'ob-arrow-top', 'ob-arrow-bottom');

    let top, left, arrowClass;

    // Intentar la posición solicitada; si se sale de pantalla, usar otra
    const tryPositions = [position, 'right', 'left', 'bottom', 'top'];
    for (const pos of tryPositions) {
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
        } else { // top
            left = targetRect.left + (targetRect.width / 2) - (boxW / 2);
            top  = targetRect.top - boxH - gap;
            arrowClass = 'ob-arrow-bottom';
        }

        // Comprobar si cabe
        if (left >= 8 && left + boxW <= vw - 8 && top >= 8 && top + boxH <= vh - 8) break;
    }

    // Clamp final
    left = Math.max(8, Math.min(left, vw - boxW - 8));
    top  = Math.max(8, Math.min(top,  vh - boxH - 8));

    Object.assign(stepBox.style, {
        left: `${left + window.scrollX}px`,
        top:  `${top  + window.scrollY}px`
    });
    stepBox.classList.add(arrowClass);
}

function renderStep(index) {
    const step  = STEPS[index];
    const total = STEPS.length;

    // Texto
    el('ob-count').textContent = `Paso ${index + 1} de ${total}`;
    el('ob-title').textContent = step.title;
    el('ob-body').textContent  = step.body;

    // Progreso
    el('ob-progress').style.width = `${((index + 1) / total) * 100}%`;

    // Prev / Next
    const prevBtn  = el('ob-prev');
    const nextBtn  = el('ob-next');
    prevBtn.disabled = (index === 0);

    if (index === total - 1) {
        nextBtn.textContent = '¡Finalizar! 🎉';
        nextBtn.onclick = finishTour;
    } else {
        nextBtn.textContent = 'Siguiente →';
        nextBtn.onclick = () => goToStep(currentStep + 1);
    }

    // Dots
    document.querySelectorAll('.ob-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });

    // Target element
    const targetEl = document.querySelector(step.target);
    if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // Esperar al scroll antes de posicionar
        setTimeout(() => {
            const rect = targetEl.getBoundingClientRect();
            positionSpotlight(rect);
            positionStepBox(rect, step.position);
            spotlight.classList.add('ob-visible');
        }, 300);
    } else {
        // Sin target: spotlight mínimo centrado
        const center = { top: window.innerHeight / 2 - 10, left: window.innerWidth / 2 - 10, width: 20, height: 20 };
        positionSpotlight(center);
    }
}

function goToStep(index) {
    if (index < 0 || index >= STEPS.length) return;
    currentStep = index;
    renderStep(currentStep);
}

function startTour(uid) {
    if (tourActive) return;
    tourActive = true;
    userId = uid;
    currentStep = 0;

    if (!el('ob-overlay')) buildTourUI();

    overlay.classList.add('ob-visible');
    setTimeout(() => {
        stepBox.classList.add('ob-visible');
        renderStep(0);
    }, 100);
}

function finishTour() {
    tourActive = false;
    setState({ seen: true, completedAt: new Date().toISOString() });

    // Sync con BD en background
    if (userId) {
        updateUserData(userId, {
            has_seen_tutorial: true,
            tutorial_completed_at: new Date().toISOString()
        }).catch(() => {}); // silencioso
    }

    // Animar salida
    if (overlay)   overlay.classList.remove('ob-visible');
    if (spotlight) spotlight.classList.remove('ob-visible');
    if (stepBox) {
        stepBox.classList.remove('ob-visible');
        setTimeout(() => {
            overlay?.remove();
            spotlight?.remove();
            stepBox?.remove();
            overlay = spotlight = stepBox = null;
        }, 350);
    }
}

// ─── Modal de bienvenida ──────────────────────────────────────────────────────
function showWelcomeModal(uid) {
    const welcomeOverlay = createEl('div', 'ob-welcome-overlay');
    welcomeOverlay.id = 'ob-welcome';
    welcomeOverlay.innerHTML = `
        <div class="ob-welcome-modal">
            <span class="ob-welcome-icon">🎯</span>
            <h2>¡Bienvenido a TOO-EASY!</h2>
            <p>Parece que es tu primera vez aquí.<br>
               ¿Quieres un recorrido rápido para conocer todos los módulos?</p>
            <div class="ob-welcome-actions">
                <button class="ob-btn-start" id="ob-btn-start">Sí, muéstrame el tour ✨</button>
                <button class="ob-btn-later" id="ob-btn-later">Ahora no</button>
                <button class="ob-btn-never" id="ob-btn-never">No volver a mostrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(welcomeOverlay);

    requestAnimationFrame(() => welcomeOverlay.classList.add('ob-visible'));

    const closeWelcome = () => {
        welcomeOverlay.classList.remove('ob-visible');
        setTimeout(() => welcomeOverlay.remove(), 350);
    };

    el('ob-btn-start').addEventListener('click', () => {
        closeWelcome();
        setTimeout(() => startTour(uid), 200);
    });

    el('ob-btn-later').addEventListener('click', () => {
        setState({ seen: true });
        closeWelcome();
    });

    el('ob-btn-never').addEventListener('click', () => {
        setState({ seen: true, disabled: true });
        if (uid) updateUserData(uid, { has_seen_tutorial: true, tutorial_disabled: true }).catch(() => {});
        closeWelcome();
    });
}

// ─── API pública ─────────────────────────────────────────────────────────────
/**
 * Inicializa el onboarding. Muestra el modal de bienvenida si el usuario
 * no ha visto el tour y no lo ha desactivado.
 */
export function initOnboarding(uid) {
    const state = getState();
    if (state?.disabled || state?.seen) return;
    // Pequeño delay para que la página cargue visualmente
    setTimeout(() => showWelcomeModal(uid), 1200);
}

/**
 * Reinicia el tour desde cualquier lugar (botón en perfil/footer).
 */
export function restartOnboarding(uid) {
    // Eliminar estado previo para que el tour vuelva a mostrarse
    setState({ seen: false, disabled: false });
    // Cerrar welcome y arrancar tour directamente
    const existing = el('ob-welcome');
    if (existing) { existing.remove(); }
    startTour(uid || userId);
}
