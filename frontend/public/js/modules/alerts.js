// ========================================
// SISTEMA DE ALERTAS MODERNAS - TOO-EASY
// Archivo: frontend/public/js/modules/alerts.js
// ========================================

/**
 * Configuración de iconos según tipo de alerta
 */
const ALERT_ICONS = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
};

/**
 * Configuración de títulos por defecto
 */
const ALERT_TITLES = {
    success: '¡Éxito!',
    error: 'Error',
    warning: 'Advertencia',
    info: 'Información'
};

/**
 * Escapa caracteres HTML para prevenir XSS al insertar texto dinámico
 */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Crea el contenedor de alertas si no existe
 */
function createAlertsContainer() {
    let container = document.getElementById('alerts-container');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'alerts-container';
        container.className = 'alerts-container';
        document.body.appendChild(container);
    }
    
    return container;
}

/**
 * Función principal para mostrar alertas
 * 
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
 * @param {object} options - Opciones adicionales
 * @param {string} options.title - Título personalizado
 * @param {number} options.duration - Duración en ms (0 = manual)
 * @param {boolean} options.closable - Mostrar botón cerrar
 * @param {function} options.onClose - Callback al cerrar
 */
export function mostrarAlerta(message, type = 'info', options = {}) {
    const {
        title = ALERT_TITLES[type],
        duration = 5000,
        closable = true,
        onClose = null
    } = options;

    // Crear contenedor si no existe
    const container = createAlertsContainer();

    // Crear elemento de alerta
    const alertBox = document.createElement('div');
    alertBox.className = `alert-box ${type}`;

    // HTML interno — escapamos title y message para prevenir XSS
    alertBox.innerHTML = `
        <div class="alert-icon">${ALERT_ICONS[type]}</div>
        <div class="alert-content">
            <p class="alert-title">${escapeHtml(title)}</p>
            <p class="alert-message">${escapeHtml(message)}</p>
        </div>
        ${closable ? '<button class="alert-close" aria-label="Cerrar">×</button>' : ''}
        ${duration > 0 ? '<div class="alert-progress"></div>' : ''}
    `;

    // Añadir al contenedor
    container.appendChild(alertBox);

    // Trigger animación (pequeño delay para que CSS tome efecto)
    setTimeout(() => alertBox.classList.add('show'), 10);

    // Función para cerrar la alerta
    const closeAlert = () => {
        alertBox.classList.remove('show');
        alertBox.classList.add('hide');
        
        setTimeout(() => {
            alertBox.remove();
            if (onClose) onClose();
            
            // Limpiar contenedor si está vacío
            if (container.children.length === 0) {
                container.remove();
            }
        }, 400);
    };

    // Evento del botón cerrar
    if (closable) {
        const closeBtn = alertBox.querySelector('.alert-close');
        closeBtn.addEventListener('click', closeAlert);
    }

    // Auto-cerrar si tiene duración
    if (duration > 0) {
        setTimeout(closeAlert, duration);
    }

    return {
        close: closeAlert,
        element: alertBox
    };
}

/**
 * Shortcuts para tipos específicos
 */
export function alertaExito(mensaje, options = {}) {
    return mostrarAlerta(mensaje, 'success', options);
}

export function alertaError(mensaje, options = {}) {
    return mostrarAlerta(mensaje, 'error', options);
}

export function alertaAdvertencia(mensaje, options = {}) {
    return mostrarAlerta(mensaje, 'warning', options);
}

export function alertaInfo(mensaje, options = {}) {
    return mostrarAlerta(mensaje, 'info', options);
}

/**
 * Alerta de confirmación (modal bloqueante)
 * Devuelve una Promise que se resuelve con true/false
 */
export function alertaConfirmacion(mensaje, titulo = '¿Estás seguro?') {
    return new Promise((resolve) => {
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';

        // Crear modal
        const modal = document.createElement('div');
        modal.className = 'confirm-modal';

        modal.innerHTML = `
            <h2 class="confirm-title">${escapeHtml(titulo)}</h2>
            <p class="confirm-message">${escapeHtml(mensaje)}</p>
            <div class="confirm-buttons">
                <button id="modal-cancel" class="confirm-btn confirm-btn-cancel">Cancelar</button>
                <button id="modal-confirm" class="confirm-btn confirm-btn-confirm">Confirmar</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Función para cerrar
        const close = (result) => {
            overlay.classList.add('hiding');
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, 300);
        };

        // Eventos
        modal.querySelector('#modal-cancel').onclick = () => close(false);
        modal.querySelector('#modal-confirm').onclick = () => close(true);
        overlay.onclick = (e) => {
            if (e.target === overlay) close(false);
        };

    });
}