/**
 * onboarding.js — Tour interactivo por módulo para TOO-EASY
 *
 * Uso:
 *   import { initOnboarding, restartOnboarding } from './onboarding.js';
 *   initOnboarding(userId, 'dashboard');     // llamar al cargar la página
 *   restartOnboarding(userId, 'dashboard');  // llamar desde un botón "ver tour"
 */

import { updateUserData } from './api.js';

const OB_KEY_PREFIX = 'too_easy_ob_';
const OB_GAP = 10; // px de padding alrededor del spotlight

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
            body: 'El indicador superior muestra cuántas categorías has completado. Completar todas las categorías de una categoría eleva tu nivel educativo, visible en tu Perfil.',
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

// ─── Tour engine ──────────────────────────────────────────────────────────────
let currentStep    = 0;
let tourActive     = false;
let activeUserId   = null;
let activeModuleId = null;
let activeSteps    = [];

let overlay, spotlight, stepBox;

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
            <button class="ob-btn-skip" id="ob-skip" title="Saltar el tour">Saltar</button>
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

    stepBox.classList.remove('ob-arrow-left', 'ob-arrow-right', 'ob-arrow-top', 'ob-arrow-bottom');

    let top, left, arrowClass;

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
        } else {
            left = targetRect.left + (targetRect.width / 2) - (boxW / 2);
            top  = targetRect.top - boxH - gap;
            arrowClass = 'ob-arrow-bottom';
        }
        if (left >= 8 && left + boxW <= vw - 8 && top >= 8 && top + boxH <= vh - 8) break;
    }

    left = Math.max(8, Math.min(left, vw - boxW - 8));
    top  = Math.max(8, Math.min(top,  vh - boxH - 8));

    Object.assign(stepBox.style, {
        left: `${left + window.scrollX}px`,
        top:  `${top  + window.scrollY}px`
    });
    stepBox.classList.add(arrowClass);
}

function renderStep(index) {
    const step  = activeSteps[index];
    const total = activeSteps.length;

    el('ob-count').textContent = `Paso ${index + 1} de ${total}`;
    el('ob-title').textContent = step.title;
    el('ob-body').textContent  = step.body;

    el('ob-progress').style.width = `${((index + 1) / total) * 100}%`;

    const prevBtn = el('ob-prev');
    const nextBtn = el('ob-next');
    prevBtn.disabled = (index === 0);

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

    const targetEl = document.querySelector(step.target);
    if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => {
            const rect = targetEl.getBoundingClientRect();
            positionSpotlight(rect);
            positionStepBox(rect, step.position);
            spotlight.classList.add('ob-visible');
        }, 300);
    } else {
        const center = {
            top: window.innerHeight / 2 - 10,
            left: window.innerWidth / 2 - 10,
            width: 20, height: 20
        };
        positionSpotlight(center);
    }
}

function goToStep(index) {
    if (index < 0 || index >= activeSteps.length) return;
    currentStep = index;
    renderStep(currentStep);
}

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
    }, 100);
}

function finishTour() {
    tourActive = false;
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
            overlay?.remove();
            spotlight?.remove();
            stepBox?.remove();
            overlay = spotlight = stepBox = null;
        }, 350);
    }
}

// ─── Modal de bienvenida ──────────────────────────────────────────────────────
function showWelcomeModal(uid, moduleId) {
    const label = MODULE_LABELS[moduleId] || moduleId;
    const welcomeOverlay = createEl('div', 'ob-welcome-overlay');
    welcomeOverlay.id = 'ob-welcome';
    welcomeOverlay.innerHTML = `
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
    document.body.appendChild(welcomeOverlay);

    requestAnimationFrame(() => welcomeOverlay.classList.add('ob-visible'));

    const closeWelcome = () => {
        welcomeOverlay.classList.remove('ob-visible');
        setTimeout(() => welcomeOverlay.remove(), 350);
    };

    el('ob-btn-start').addEventListener('click', () => {
        closeWelcome();
        setTimeout(() => startTour(uid, moduleId), 200);
    });

    el('ob-btn-later').addEventListener('click', () => {
        setState(moduleId, { seen: true });
        closeWelcome();
    });

    el('ob-btn-never').addEventListener('click', () => {
        setState(moduleId, { seen: true, disabled: true });
        if (uid) updateUserData(uid, { has_seen_tutorial: true, tutorial_disabled: true }).catch(() => {});
        closeWelcome();
    });
}

// ─── API pública ─────────────────────────────────────────────────────────────
/**
 * Inicializa el onboarding del módulo. Muestra el modal de bienvenida si el
 * usuario no ha visto el tour de este módulo ni lo ha desactivado.
 */
export function initOnboarding(uid, moduleId = 'dashboard') {
    if (!MODULE_STEPS[moduleId]) return;
    const state = getState(moduleId);
    if (state?.disabled || state?.seen) return;
    setTimeout(() => showWelcomeModal(uid, moduleId), 1200);
}

/**
 * Reinicia el tour del módulo desde cualquier lugar (botón en footer/ayuda).
 */
export function restartOnboarding(uid, moduleId = 'dashboard') {
    setState(moduleId, { seen: false, disabled: false });
    const existing = el('ob-welcome');
    if (existing) existing.remove();
    startTour(uid || activeUserId, moduleId);
}
