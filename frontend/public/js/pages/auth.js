// frontend/public/js/pages/auth.js - ACTUALIZADO CON ALERTAS

import { login, register } from '../modules/api.js'; 
import { saveAuthData } from '../modules/auth.js'; 
import { alertaExito, alertaError, alertaInfo } from '../modules/alerts.js'; // ✅ NUEVO

document.addEventListener('DOMContentLoaded', () => {
    // ========== LÓGICA DE LOGIN ==========
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nombre = document.getElementById('Nombre').value.trim();
            const password = document.getElementById('contraseña').value;
            
            if (!nombre || !password) {
                alertaError('Por favor, completa todos los campos.'); // ✅ CAMBIO
                return;
            }
            
            // ✅ Mostrar indicador de carga
            alertaInfo('Verificando credenciales...', { duration: 2000 });
            
            try {
                const result = await login(nombre, password);
                
                if (result.success) {
                    saveAuthData(result.user);
                    
                    // ✅ Alerta de éxito y redirección con delay
                    alertaExito('¡Bienvenido! Redirigiendo...', {
                        onClose: () => {
                            window.location.href = '/dashboard.html';
                        }
                    });
                    
                    setTimeout(() => {
                        window.location.href = '/dashboard.html';
                    }, 1500);
                    
                } else {
                    // ✅ Mostrar error específico del servidor
                    alertaError(result.message || 'Credenciales incorrectas.');
                }
            } catch (error) {
                console.error('Error en login:', error);
                alertaError('Error de conexión. Verifica que el servidor esté activo.'); // ✅ CAMBIO
            }
        });
    }
    
    // ========== LÓGICA DE REGISTRO ==========
    const registerForm = document.getElementById('registerForm');
    
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nombre = document.getElementById('registerNombre').value.trim();
            const email = document.getElementById('registerEmail')?.value.trim();
            const password = document.getElementById('registerContraseña').value;
            const edad = parseInt(document.getElementById('registerEdad').value);
            const genero = document.getElementById('registerGenero').value;
            const terminos = document.getElementById('terminos').checked;
            
            // Validaciones con alertas visuales
            if (!nombre || !password || !edad || !genero) {
                alertaError('Por favor, completa todos los campos obligatorios.'); // ✅ CAMBIO
                return;
            }
            
            if (!terminos) {
                alertaError('Debes aceptar los Términos y Condiciones.'); // ✅ CAMBIO
                return;
            }
            
            if (edad < 15) {
                alertaError('Debes tener al menos 15 años para registrarte.'); // ✅ CAMBIO
                return;
            }
            
            // ✅ Indicador de proceso
            alertaInfo('Creando tu cuenta...', { duration: 3000 });
            
            try {
                const userData = {
                    nombre,
                    password,
                    edad,
                    genero,
                    email: email || null
                };
                
                const result = await register(userData);
                
                if (result.success) {
                    // ✅ Éxito con redirección automática
                    alertaExito('¡Cuenta creada exitosamente! Redirigiendo al login...', {
                        duration: 2500,
                        onClose: () => {
                            window.location.href = '/login.html';
                        }
                    });
                    
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 2500);
                    
                } else {
                    alertaError(result.message || 'Error al crear cuenta.'); // ✅ CAMBIO
                }
            } catch (error) {
                console.error('Error en registro:', error);
                alertaError('Error de conexión. Verifica que el servidor esté activo.'); // ✅ CAMBIO
            }
        });
    }
});