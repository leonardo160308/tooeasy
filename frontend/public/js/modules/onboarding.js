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
const OB_GAP        = 8;
const NAVBAR_H      = 70;

// ─── Etiquetas de módulo ──────────────────────────────────────────────────────
const MODULE_LABELS = {
    dashboard:   'Panel de Finanzas',
    inversiones: 'Inversiones',
    retos:       'Retos',
    lecciones:   'Lecciones',
    perfil:      'Perfil',
    soporte:     'Soporte'
};

// ─── Contenido del modal de bienvenida ───────────────────────────────────────
const MODULE_WELCOME = {
    dashboard: {
        title:   'Bienvenido a tu Panel',
        desc:    'Controla tus finanzas mes a mes: ingresos, gastos y tu meta de ahorro en un solo lugar.',
        bullets: [
            'Configura ingresos y gastos fijos mensuales',
            'Registra movimientos día a día en el calendario',
            'Elige tu método de ahorro y sigue tu progreso'
        ]
    },
    inversiones: {
        title:   'Simulador de Portafolios',
        desc:    'Proyecta el rendimiento de tus inversiones usando el método Monte Carlo con datos reales.',
        bullets: [
            'Define capital inicial, plazo y perfil de riesgo',
            'Selecciona acciones, bonos, ETFs y criptomonedas',
            'Analiza escenarios pesimista, esperado y optimista'
        ]
    },
    retos: {
        title:   'Sistema de Retos',
        desc:    'Cumple desafíos financieros reales y gana recursos para mejorar tu perfil.',
        bullets: [
            'Completa condiciones registrando movimientos en el Dashboard',
            'Reclama Madera al superar cada reto exitosamente',
            'Sube el nivel de tu Casa y Castor con tus ganancias'
        ]
    },
    lecciones: {
        title:   'Centro de Aprendizaje',
        desc:    'Aprende educación financiera a tu ritmo y eleva tu nivel educativo paso a paso.',
        bullets: [
            'Explora categorías temáticas de finanzas personales',
            'Completa quizzes de opción múltiple y gana Monedas',
            'Sube tu nivel educativo completando cada categoría'
        ]
    },
    perfil: {
        title:   'Tu Perfil Personal',
        desc:    'Personaliza tu experiencia y gestiona todos los recursos que has acumulado.',
        bullets: [
            'Edita tu información personal y elige tu avatar',
            'Mejora tu Casa y tu Castor con Madera y Monedas',
            'Navega y equipa los skins que has desbloqueado'
        ]
    },
    soporte: {
        title:   'Centro de Soporte',
        desc:    'Resuelve dudas, reporta problemas y consulta el estado de tus solicitudes.',
        bullets: [
            'Crea tickets con categoría y descripción detallada',
            'Consulta el estado: Abierto, En revisión o Cerrado',
            'Revisa el FAQ antes de escribir — el 80% ya tiene respuesta'
        ]
    }
};

// ─── Pasos por módulo ─────────────────────────────────────────────────────────
const MODULE_STEPS = {

    dashboard: [
        {
            icon:     'fa-chart-bar',
            title:    'Tu Resumen Mensual',
            body:     'Aquí ves tu balance real del mes: ingresos totales, gastos acumulados y cuánto lograste ahorrar. El indicador de estado te dice de un vistazo si vas bien encaminado o si necesitas ajustar tu plan.',
            tip:      'El balance se recalcula automáticamente cada vez que registras un movimiento en el calendario.',
            target:   '.summary-results',
            position: 'left'
        },
        {
            icon:     'fa-list-alt',
            title:    'Ingresos y Gastos Fijos',
            body:     'Registra aquí los cobros y pagos que se repiten cada mes: tu sueldo, renta, suscripciones, etc. El sistema los suma automáticamente a todos tus períodos sin que tengas que volver a ingresarlos.',
            tip:      'Un gasto fijo bien registrado evita que olvides pagos importantes al final del mes.',
            target:   '.fixed-data-grid',
            position: 'right'
        },
        {
            icon:     'fa-piggy-bank',
            title:    'Elige Tu Método de Ahorro',
            body:     'Tienes tres opciones: la regla 50/30/20 donde el sistema calcula por ti, un porcentaje personalizado, o una cantidad fija mensual. El sistema te avisa si tu objetivo supera tus ingresos reales.',
            tip:      'Regla 50/30/20: 50% necesidades, 30% gustos personales, 20% ahorro. Ideal para empezar.',
            target:   '.saving-method-section',
            position: 'right'
        },
        {
            icon:     'fa-calendar-alt',
            title:    'Calendario de Movimientos',
            body:     'Haz clic en cualquier día para registrar un ingreso o gasto de ese día. El color de cada celda cambia en tiempo real: verde si el día cerró positivo, rojo si gastaste de más, gris si empataste.',
            tip:      'Registrar al día te da una foto exacta y honesta de tu situación financiera real.',
            target:   '.module-calendar',
            position: 'left'
        },
        {
            icon:     'fa-compass',
            title:    'Explora Todo el Ecosistema',
            body:     'Desde la barra superior accedes a Inversiones para simular portafolios, Retos para ganar recursos, Lecciones para aprender finanzas y tu Perfil para personalizar toda tu experiencia.',
            tip:      'Lo que aprendes en Lecciones se convierte en mejores decisiones financieras aquí en el Dashboard.',
            target:   '.header',
            position: 'bottom'
        }
    ],

    inversiones: [
        {
            icon:     'fa-sliders-h',
            title:    'Panel de Configuración',
            body:     'Desde el panel lateral configuras los parámetros de tu simulación: el capital inicial a invertir, el horizonte temporal en años y tu perfil de riesgo (conservador, moderado o agresivo).',
            tip:      'El perfil de riesgo determina qué instrumentos se priorizan y cómo se diversifica el portafolio.',
            target:   '.inv-sidebar',
            position: 'right'
        },
        {
            icon:     'fa-layer-group',
            title:    'Asistente de 3 Pasos',
            body:     'El simulador te guía en tres etapas: primero defines los parámetros del portafolio, luego seleccionas entre acciones, bonos, ETFs y criptomonedas, y finalmente lanzas 500 escenarios Monte Carlo.',
            tip:      'Combinar varios tipos de activo mejora la diversificación y reduce el riesgo total del portafolio.',
            target:   '#section-inicio .section-title',
            position: 'bottom'
        },
        {
            icon:     'fa-play-circle',
            title:    'Lanzar y Comparar Simulaciones',
            body:     'Ejecuta nuevas simulaciones o consulta el historial de las anteriores. Puedes comparar hasta 3 simulaciones en paralelo para evaluar y contrastar diferentes estrategias de inversión.',
            tip:      'El motor calcula correlaciones reales entre activos — no aleatorias — para una diversificación auténtica.',
            target:   '.inicio-actions',
            position: 'top'
        },
        {
            icon:     'fa-chart-area',
            title:    'Interpreta tus Resultados',
            body:     'Cada simulación entrega: valor esperado (P50), escenario optimista (P90) y pesimista (P10), Sharpe Ratio, VaR 95% y probabilidad de ganancia. Úsalos para tomar decisiones de inversión fundamentadas.',
            tip:      'Un Sharpe Ratio mayor a 1.0 indica que el retorno obtenido justifica el nivel de riesgo asumido.',
            target:   '.header',
            position: 'bottom'
        }
    ],

    retos: [
        {
            icon:     'fa-trophy',
            title:    'Tus Recursos Acumulados',
            body:     'Aquí ves tus dos recursos internos: Monedas y Madera. Las Monedas se ganan completando quizzes en Lecciones; la Madera se obtiene completando Retos. Ambos sirven para mejorar tu Perfil.',
            tip:      'Cuanto más alto sea tu nivel de Casa y Castor, más skins exclusivos desbloqueas para personalizar.',
            target:   '.top-stats-card',
            position: 'right'
        },
        {
            icon:     'fa-tasks',
            title:    'Tus Retos Activos',
            body:     'Cada reto tiene una condición financiera específica: ahorrar cierto monto, no exceder un límite de gasto o registrar movimientos por varios días seguidos. A mayor dificultad, mayor recompensa en Madera.',
            tip:      'Los retos actualizan su progreso automáticamente con tus registros en el Dashboard.',
            target:   '#challenges-container',
            position: 'right'
        },
        {
            icon:     'fa-gift',
            title:    'Reclamar tu Recompensa',
            body:     'Cuando la barra de progreso llega al 100%, aparece el botón Reclamar. Haz clic para cobrar tu Madera de inmediato. Algunos retos están asociados al período mensual, así que no los dejes pendientes.',
            tip:      'Reclama tan pronto completes un reto — si el período vence sin reclamar podrías perder la recompensa.',
            target:   '#challenges-container',
            position: 'left'
        },
        {
            icon:     'fa-link',
            title:    'Conectado con el Dashboard',
            body:     'Los retos detectan automáticamente tus movimientos registrados en el Dashboard. Sin registros activos, el progreso no avanza. Ingresa tus ingresos y gastos a diario para completar los retos más rápido.',
            tip:      'Registra un movimiento hoy en el Dashboard y regresa aquí para ver cómo avanza tu progreso.',
            target:   '.header',
            position: 'bottom'
        }
    ],

    lecciones: [
        {
            icon:     'fa-graduation-cap',
            title:    'Tu Nivel Educativo',
            body:     'Este indicador muestra cuántas categorías de educación financiera has completado en total. Cada categoría que terminas eleva tu nivel educativo — una medalla de conocimiento visible en tu Perfil.',
            tip:      'Completar todas las categorías disponibles te lleva al nivel educativo máximo de la plataforma.',
            target:   '.edu-progress-banner',
            position: 'bottom'
        },
        {
            icon:     'fa-th-large',
            title:    'Categorías de Aprendizaje',
            body:     'Cada tarjeta representa una categoría temática: ahorro, inversión, crédito y más. Haz clic en una tarjeta para desplegar sus niveles disponibles. Puedes tener varias categorías abiertas al mismo tiempo.',
            tip:      'Empieza por las categorías activas (sin candado) para desbloquear las siguientes en orden.',
            target:   '.tarjetas',
            position: 'top'
        },
        {
            icon:     'fa-coins',
            title:    'Quizzes y Monedas',
            body:     'Cada nivel tiene un quiz de opción múltiple. Apruébalo para avanzar al siguiente nivel y ganar Monedas como recompensa. Puedes repetir un nivel cuantas veces quieras para reforzar lo aprendido.',
            tip:      'Las Monedas que acumulas aquí se usan en el Perfil para entrenar a tu Castor hasta nivel 10.',
            target:   '.tarjetas',
            position: 'top'
        }
    ],

    perfil: [
        {
            icon:     'fa-user-circle',
            title:    'Tu Información Personal',
            body:     'Aquí ves y editas tu nombre de usuario, género y edad. Haz clic en "Editar" para actualizar tus datos o elegir entre los 4 avatares disponibles que te representan dentro de la plataforma.',
            tip:      'Tu nombre de usuario aparece en todos los módulos y personaliza tu experiencia en TOO-EASY.',
            target:   '.info-card',
            position: 'right'
        },
        {
            icon:     'fa-coins',
            title:    'Monedas y Madera',
            body:     'Las Monedas se ganan completando quizzes en Lecciones. La Madera se obtiene reclamando Retos. Son los dos recursos internos de la plataforma y la base de tu progreso de personalización.',
            tip:      'Visita el módulo de Retos regularmente para no dejar recompensas de Madera sin reclamar.',
            target:   '.stats-bar',
            position: 'right'
        },
        {
            icon:     'fa-arrow-up',
            title:    'Mejora tu Casa y Castor',
            body:     'Usa Madera para subir el nivel de tu Casa (hasta nivel 10) y Monedas para entrenar a tu Castor (también hasta nivel 10). Cada nivel que alcanzas desbloquea nuevos skins visuales exclusivos.',
            tip:      'El costo de cada mejora aumenta con el nivel — planifica bien antes de gastar tus recursos.',
            target:   '.upgrade-actions',
            position: 'right'
        },
        {
            icon:     'fa-palette',
            title:    'Skins y Personalización',
            body:     'Usa las flechas para navegar por los skins que has desbloqueado para tu Casa y tu Castor. Pulsa "Equipar" para activar el que prefieras. Los skins nuevos se desbloquean automáticamente al subir de nivel.',
            tip:      'Equipa tus mejores skins para que la escena central refleje todo tu progreso en la plataforma.',
            target:   '.skin-controls-container',
            position: 'top'
        },
        {
            icon:     'fa-home',
            title:    'Tu Escena Personal',
            body:     'La escena central muestra en tiempo real los skins equipados para tu Casa y tu Castor. Es la representación visual de todo tu esfuerzo y progreso acumulado dentro de TOO-EASY.',
            tip:      'Sigue completando Lecciones y Retos para desbloquear más skins y hacer tuya esta escena.',
            target:   '.profile-visual-zone',
            position: 'left'
        }
    ],

    soporte: [
        {
            icon:     'fa-headset',
            title:    'Centro de Soporte',
            body:     'Desde aquí puedes enviar consultas al equipo, reportar problemas técnicos y solicitar ayuda con tu cuenta. También encontrarás un FAQ completo con las dudas más frecuentes ya respondidas.',
            tip:      'El equipo responde en menos de 48 horas hábiles. Elegir el tipo de consulta correcto agiliza la atención.',
            target:   '.soporte-hero',
            position: 'bottom'
        },
        {
            icon:     'fa-paper-plane',
            title:    'Crear un Ticket',
            body:     'Completa el formulario con el tipo de consulta (técnica, financiera o de cuenta), un asunto claro y una descripción detallada del problema. Puedes adjuntar una imagen para explicar mejor la situación.',
            tip:      'Cuanta más información incluyas en tu ticket, más rápido y preciso será el soporte que recibirás.',
            target:   '#create-ticket-card',
            position: 'right'
        },
        {
            icon:     'fa-inbox',
            title:    'Estado de tus Tickets',
            body:     'En "Mis Tickets" consultas el estado de cada solicitud enviada: Abierto (pendiente de respuesta), En revisión (siendo atendido activamente) o Cerrado (resuelto). Haz clic en cualquier ticket para ver el hilo.',
            tip:      'Puedes reabrir un ticket cerrado respondiendo en el hilo si el problema no quedó completamente resuelto.',
            target:   '#my-tickets-card',
            position: 'left'
        },
        {
            icon:     'fa-question-circle',
            title:    'Preguntas Frecuentes',
            body:     'Antes de crear un ticket, revisa el FAQ del módulo de soporte. El 80% de las consultas más comunes ya tienen respuesta detallada ahí y puedes resolverlas en segundos sin necesidad de esperar.',
            tip:      'Si no encuentras tu respuesta en el FAQ, crea un ticket y el equipo te atenderá pronto.',
            target:   '.header',
            position: 'bottom'
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
let stepRenderGen  = 0;

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
        window.addEventListener('resize', tick);
    }
}

function detachLiveUpdates() {
    if (_scrollFn) { window.removeEventListener('scroll', _scrollFn); _scrollFn = null; }
    if (_resizeObs) { _resizeObs.disconnect(); _resizeObs = null; }
    else { window.removeEventListener('resize', _scrollFn || (() => {})); }
    _liveTarget = _livePosition = null;
}

// ─── Scroll-to-element con detección de fin de scroll ────────────────────────
function scrollToElement(targetEl) {
    return new Promise(resolve => {
        const rect         = targetEl.getBoundingClientRect();
        const topOk        = rect.top    >= NAVBAR_H + 10;
        const bottomOk     = rect.bottom <= window.innerHeight - 60;
        // Sticky header sits at rect.top ≈ 0 and spans full width — it's always visible
        const isStickyTop  = rect.top >= 0 && rect.top <= NAVBAR_H && rect.width > window.innerWidth * 0.5;
        const alreadyInView = (topOk && bottomOk) || isStickyTop;

        if (alreadyInView) { resolve(); return; }

        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

        if ('onscrollend' in window) {
            const h = () => { window.removeEventListener('scrollend', h); resolve(); };
            window.addEventListener('scrollend', h, { once: true });
            setTimeout(() => { window.removeEventListener('scrollend', h); resolve(); }, 1200);
        } else {
            let timer;
            const h = () => {
                clearTimeout(timer);
                timer = setTimeout(() => { window.removeEventListener('scroll', h); resolve(); }, 180);
            };
            window.addEventListener('scroll', h, { passive: true });
            setTimeout(() => { clearTimeout(timer); window.removeEventListener('scroll', h); resolve(); }, 900);
        }
    });
}

// ─── Spotlight ────────────────────────────────────────────────────────────────
function _applySpotlight(rect) {
    // position: fixed usa coordenadas del viewport — NO sumar scrollY/scrollX
    Object.assign(spotlight.style, {
        top:    `${rect.top    - OB_GAP}px`,
        left:   `${rect.left   - OB_GAP}px`,
        width:  `${rect.width  + OB_GAP * 2}px`,
        height: `${rect.height + OB_GAP * 2}px`
    });
}

// ─── Step box positioning (desktop; móvil usa CSS bottom-fixed) ───────────────
function _applyStepBox(targetRect, position) {
    if (window.innerWidth <= 600) return;

    const boxW    = stepBox.offsetWidth  || 360;
    const boxH    = stepBox.offsetHeight || 240;
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

    Object.assign(stepBox.style, { left: `${left}px`, top: `${top}px` });
    if (arrowClass) stepBox.classList.add(arrowClass);
}

// ─── Construcción del UI del tour ─────────────────────────────────────────────
function buildTourUI() {
    overlay = createEl('div', 'ob-overlay');
    overlay.id = 'ob-overlay';

    spotlight = createEl('div', 'ob-spotlight');
    spotlight.id = 'ob-spotlight';

    stepBox = createEl('div', 'ob-step-box');
    stepBox.id = 'ob-step-box';
    stepBox.innerHTML = `
        <div class="ob-step-header">
            <span class="ob-step-count" id="ob-count">1 / 1</span>
            <button class="ob-btn-skip" id="ob-skip">Saltar tour</button>
        </div>
        <div class="ob-progress-bar">
            <div class="ob-progress-fill" id="ob-progress"></div>
        </div>
        <div class="ob-step-content" id="ob-content">
            <div class="ob-step-icon-row">
                <div class="ob-step-icon" id="ob-icon">
                    <i class="fas fa-info-circle"></i>
                </div>
                <h3 class="ob-step-title" id="ob-title"></h3>
            </div>
            <p class="ob-step-body" id="ob-body"></p>
            <p class="ob-step-tip" id="ob-tip"></p>
        </div>
        <div class="ob-step-nav">
            <button class="ob-btn-prev" id="ob-prev" disabled>
                <i class="fas fa-arrow-left"></i>
                <span>Anterior</span>
            </button>
            <div class="ob-dots" id="ob-dots"></div>
            <button class="ob-btn-next" id="ob-next">
                <span>Siguiente</span>
                <i class="fas fa-arrow-right"></i>
            </button>
        </div>
    `;

    document.body.append(overlay, spotlight, stepBox);

    el('ob-skip').addEventListener('click', finishTour);

    el('ob-prev').addEventListener('click', () => {
        if (currentStep > 0) goToStep(currentStep - 1);
    });

    el('ob-next').addEventListener('click', () => {
        if (currentStep === activeSteps.length - 1) finishTour();
        else goToStep(currentStep + 1);
    });

    const dotsContainer = el('ob-dots');
    activeSteps.forEach((_, i) => {
        const dot = createEl('button', 'ob-dot');
        dot.setAttribute('aria-label', `Ir al paso ${i + 1}`);
        dot.addEventListener('click', () => goToStep(i));
        dotsContainer.appendChild(dot);
    });
}

// ─── Render de paso con animación y reposicionamiento ─────────────────────────
async function renderStep(index) {
    const gen   = ++stepRenderGen;
    const step  = activeSteps[index];
    const total = activeSteps.length;

    // Contador y barra de progreso
    el('ob-count').textContent = `${index + 1} / ${total}`;
    el('ob-progress').style.width = `${((index + 1) / total) * 100}%`;

    // Contenido con animación de fade
    el('ob-icon').innerHTML  = `<i class="fas ${step.icon || 'fa-info-circle'}"></i>`;
    el('ob-title').textContent = step.title;
    el('ob-body').textContent  = step.body;
    el('ob-tip').textContent   = step.tip || '';

    const content = el('ob-content');
    content.classList.remove('ob-content-fade');
    void content.offsetWidth; // forzar reflow para reiniciar animación
    content.classList.add('ob-content-fade');

    // Estado del botón Anterior
    el('ob-prev').disabled = (index === 0);

    // Botón Siguiente / Finalizar
    const nextBtn = el('ob-next');
    if (index === total - 1) {
        nextBtn.innerHTML = '<span>Finalizar</span><i class="fas fa-check"></i>';
        nextBtn.classList.add('ob-btn-finish');
    } else {
        nextBtn.innerHTML = '<span>Siguiente</span><i class="fas fa-arrow-right"></i>';
        nextBtn.classList.remove('ob-btn-finish');
    }

    // Dots de progreso
    document.querySelectorAll('.ob-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });

    // Spotlight y posicionamiento
    detachLiveUpdates();
    spotlight.classList.remove('ob-visible');

    const targetEl = document.querySelector(step.target);

    if (targetEl) {
        await scrollToElement(targetEl);
        if (gen !== stepRenderGen) return; // abort si el usuario navegó mientras esperábamos

        const rect = targetEl.getBoundingClientRect();
        _applySpotlight(rect);
        if (window.innerWidth > 600) _applyStepBox(rect, step.position);
        spotlight.classList.add('ob-visible');
        attachLiveUpdates(targetEl, step.position);
    } else {
        // Sin target: spotlight pequeño en el centro
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

// ─── Teclado ──────────────────────────────────────────────────────────────────
function _handleKey(e) {
    if (!tourActive) return;
    switch (e.key) {
        case 'Escape':     finishTour(); break;
        case 'ArrowRight': if (currentStep < activeSteps.length - 1) goToStep(currentStep + 1); break;
        case 'ArrowLeft':  if (currentStep > 0) goToStep(currentStep - 1); break;
    }
}

// ─── Iniciar / finalizar tour ─────────────────────────────────────────────────
function startTour(uid, moduleId) {
    if (tourActive) return;
    tourActive     = true;
    activeUserId   = uid;
    activeModuleId = moduleId;
    activeSteps    = MODULE_STEPS[moduleId] || [];
    currentStep    = 0;

    if (!el('ob-overlay')) buildTourUI();

    overlay.classList.add('ob-visible');
    document.addEventListener('keydown', _handleKey);

    setTimeout(() => {
        stepBox.classList.add('ob-visible');
        renderStep(0);
    }, 120);
}

function finishTour() {
    tourActive = false;
    detachLiveUpdates();
    document.removeEventListener('keydown', _handleKey);

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

// ─── Modal de bienvenida ──────────────────────────────────────────────────────
function showWelcomeModal(uid, moduleId) {
    const label   = MODULE_LABELS[moduleId] || moduleId;
    const welcome = MODULE_WELCOME[moduleId] || {
        title:   'Tour de este módulo',
        desc:    'Recorre las funciones principales y sácale el máximo provecho.',
        bullets: []
    };

    const bulletsHTML = welcome.bullets.length
        ? `<ul class="ob-welcome-bullets">${welcome.bullets.map(b =>
            `<li>
                <span class="ob-bullet-icon"><i class="fas fa-check"></i></span>
                <span>${b}</span>
            </li>`
          ).join('')}</ul>`
        : '';

    const modal = createEl('div', 'ob-welcome-overlay');
    modal.id = 'ob-welcome';
    modal.innerHTML = `
        <div class="ob-welcome-modal">
            <div class="ob-welcome-badge">${label}</div>
            <h2>${welcome.title}</h2>
            <p>${welcome.desc}</p>
            ${bulletsHTML}
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

    el('ob-btn-start').addEventListener('click', () => {
        closeModal();
        setTimeout(() => startTour(uid, moduleId), 200);
    });
    el('ob-btn-later').addEventListener('click', () => {
        setState(moduleId, { seen: true });
        closeModal();
    });
    el('ob-btn-never').addEventListener('click', () => {
        setState(moduleId, { seen: true, disabled: true });
        if (uid) updateUserData(uid, { has_seen_tutorial: true, tutorial_disabled: true }).catch(() => {});
        closeModal();
    });
}

// ─── API pública ──────────────────────────────────────────────────────────────
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
