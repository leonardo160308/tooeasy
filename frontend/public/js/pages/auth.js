// frontend/public/js/pages/auth.js - VERSIÓN FINAL CON BLOQUEO DE TECLAS
import { login, register } from '../modules/api.js';
import { saveAuthData } from '../modules/auth.js';
import { alertaExito, alertaError, alertaInfo, alertaAdvertencia } from '../modules/alerts.js';

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================
    // 1. VALIDACIONES EN TIEMPO REAL (LO QUE NO DEJA ESCRIBIR)
    // =========================================================
    const inputEdad = document.getElementById('registerEdad');
    
    if (inputEdad) {
        // Bloquear teclas: punto, coma, 'e' (exponente), signos menos/mas
        inputEdad.addEventListener('keydown', (e) => {
            const teclasProhibidas = ['.', ',', 'e', 'E', '-', '+'];
            if (teclasProhibidas.includes(e.key)) {
                e.preventDefault();
            }
        });

        // Limpieza extra: Si pegan texto o escriben muy rápido
        inputEdad.addEventListener('input', () => {
            // Borra cualquier cosa que no sea número
            inputEdad.value = inputEdad.value.replace(/[^0-9]/g, '');
            
            // Si escriben más de 2 dígitos (ej: 100), corta el string
            if (inputEdad.value.length > 2) {
                inputEdad.value = inputEdad.value.slice(0, 2);
            }
        });
    }

    // Opcional: Evitar espacios en el Nombre de Usuario (si quieres)
    const inputNombre = document.getElementById('registerNombre');
    if (inputNombre) {
        inputNombre.addEventListener('keydown', (e) => {
            // Si presionan espacio, no hace nada
            if (e.key === ' ') {
                e.preventDefault();
            }
        });
    }

    // =========================================================
    // 2. LÓGICA DE LOGIN
    // =========================================================

    
    // =========================================================
    // 3. LÓGICA DE REGISTRO
    // =========================================================
    // frontend/public/js/pages/auth.js — reemplazar la sección de registro

const registerForm = document.getElementById('registerForm');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombre   = document.getElementById('registerNombre').value.trim();
        const email    = document.getElementById('registerEmail')?.value.trim();
        const password = document.getElementById('registerContraseña').value;
        const edadRaw  = document.getElementById('registerEdad').value;
        const genero   = document.getElementById('registerGenero').value;
        const terminos = document.getElementById('terminos').checked;

        // Validaciones client-side
        if (!nombre || !email || !password || !edadRaw || !genero) {
            return alertaError('Por favor completa todos los campos.');
        }
        if (!terminos) {
            return alertaError('Debes aceptar los Términos y Condiciones.');
        }
        if (nombre.length < 3 || nombre.length > 16) {
            return alertaError('El nombre debe tener entre 3 y 16 caracteres.');
        }
        if (password.length < 6 || password.length > 16) {
            return alertaError('La contraseña debe tener entre 6 y 16 caracteres.');
        }
        const edad = Number(edadRaw);
        if (edad < 15 || edad > 99) {
            return alertaError('Debes tener entre 15 y 99 años.');
        }

        alertaInfo('Creando tu cuenta...', { duration: 3000 });

        try {
            const res = await fetch('/api/auth/register', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ nombre, email, password, edad, genero }),
            });
            const data = await res.json();

            if (data.success && data.requiresVerification) {
                // Guardar userId temporalmente para el paso de verificación
                sessionStorage.setItem('pendingVerificationUserId', data.userId);
                sessionStorage.setItem('pendingVerificationEmail', email);
                alertaExito('¡Cuenta creada! Revisa tu correo para verificarla.', {
                    duration: 3000,
                    onClose:  () => { window.location.href = '/verificar-email.html'; },
                });
                setTimeout(() => { window.location.href = '/verificar-email.html'; }, 3000);
            } else {
                alertaError(data.message || 'Error al registrarse.');
            }
        } catch {
            alertaError('Error de conexión con el servidor.');
        }
    });
}

// ── Login: manejar cuenta no verificada ──────────────────────────────────────
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombre   = document.getElementById('Nombre').value.trim();
        const password = document.getElementById('contraseña').value;

        if (!nombre || !password) return alertaError('Completa todos los campos.');

        try {
            const res = await fetch('/api/auth/login', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ nombre, password }),
            });
            const data = await res.json();

            if (data.success) {
                saveAuthData(data.user);
                alertaExito('¡Bienvenido/a!', {
                    onClose: () => { window.location.href = '/dashboard.html'; },
                });
                setTimeout(() => { window.location.href = '/dashboard.html'; }, 1500);

            } else if (data.requiresVerification) {
                // Cuenta existe pero email no verificado
                sessionStorage.setItem('pendingVerificationUserId', data.userId);
                alertaAdvertencia('Debes verificar tu correo primero.', {
                    duration: 4000,
                    onClose:  () => { window.location.href = '/verificar-email.html'; },
                });

            } else {
                alertaError(data.message || 'Credenciales incorrectas.');
            }
        } catch {
            alertaError('Error de conexión.');
        }
    });
}

    // MutationObserver removido: no había lógica implementada y acumulaba referencias DOM.
});