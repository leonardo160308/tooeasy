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

    // HTML interno
    alertBox.innerHTML = `
        <div class="alert-icon">${ALERT_ICONS[type]}</div>
        <div class="alert-content">
            <p class="alert-title">${title}</p>
            <p class="alert-message">${message}</p>
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
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 99998;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: fadeIn 0.3s;
        `;

        // Crear modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 20px;
            padding: 30px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        `;

        modal.innerHTML = `
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            </style>
            <h2 style="margin: 0 0 15px 0; color: #2C405B; font-size: 1.5rem; text-align: center;">
                ${titulo}
            </h2>
            <p style="color: #666; margin: 0 0 25px 0; line-height: 1.6; text-align: center;">
                ${mensaje}
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="modal-cancel" style="
                    flex: 1;
                    padding: 12px 24px;
                    border: 2px solid #ddd;
                    background: white;
                    color: #666;
                    border-radius: 12px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s;
                ">
                    Cancelar
                </button>
                <button id="modal-confirm" style="
                    flex: 1;
                    padding: 12px 24px;
                    border: none;
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                    border-radius: 12px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s;
                ">
                    Confirmar
                </button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Función para cerrar
        const close = (result) => {
            overlay.style.animation = 'fadeOut 0.3s';
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

        // Agregar animación de salida
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    });
}