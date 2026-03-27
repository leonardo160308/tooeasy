/* assets/js/pages/profile.js */

import { getUserData, upgradeItem, equipSkin, deleteUser, updateUserData } from '../modules/api.js';
import { protectRoute, getAuthData, logout } from '../modules/auth.js';
import { alertaExito, alertaError, alertaInfo, alertaAdvertencia, alertaConfirmacion } from '../modules/alerts.js';

document.addEventListener('DOMContentLoaded', async () => {

    if (!protectRoute()) return;
    const sessionUser = getAuthData();
    const userId = sessionUser.id;

    const MAX_LEVEL = 10;
    const COSTO_CASA_BASE = 20;
    const COSTO_CASTOR_BASE = 34;

    const DB_SKINS = {
        "skin_default": "../public/img/casaBase.png",
        "skin_1": "../public/img/casaN1.png",
        "skin_2": "../public/img/casaN2.png",
        "skin_3": "../public/img/casaN3.png",
        "skin_4": "../public/img/casaN4.png",
        "skin_5": "../public/img/casaN5.png"
    };

    const SKIN_NAMES = {
        "skin_default": "Choza Inicial",
        "skin_1": "Casa Nivel 2",
        "skin_2": "Casa Nivel 4",
        "skin_3": "Casa Nivel 6",
        "skin_4": "Casa Nivel 8",
        "skin_5": "Mansión Nivel 10"
    };

    const DB_CASTORES = {
        "castor_default": "../public/img/mapacheBase.png",
        "castor_1": "../public/img/mapacheN1.png",
        "castor_2": "../public/img/mapacheN2.png",
        "castor_3": "../public/img/mapacheN3.png",
        "castor_4": "../public/img/mapacheN4.png",
        "castor_5": "../public/img/mapacheN5.png"
    };

    const CASTOR_NAMES = {
        "castor_default": "Castor Bebé",
        "castor_1": "Castor Aprendiz",
        "castor_2": "Castor Obrero",
        "castor_3": "Castor Ingeniero",
        "castor_4": "Castor Maestro",
        "castor_5": "Rey Castor"
    };

    const UNLOCKS_CASA_LIST   = ["skin_default","skin_1","skin_2","skin_3","skin_4","skin_5"];
    const UNLOCKS_CASTOR_LIST = ["castor_default","castor_1","castor_2","castor_3","castor_4","castor_5"];

    // ── Helper: ruta de imagen de avatar ──────────────────────────────────
    function avatarSrc(key) {
        if (!key) return null;
        const num = key.replace('avatar', '');
        return `/public/img/avatars/perfil${num}.png`;
    }

    // ── Estado local ──────────────────────────────────────────────────────
    let currentUserData = null;
    let idxCasa   = 0;
    let idxCastor = 0;

    // ── Referencias DOM ───────────────────────────────────────────────────
    const domMonedas    = document.getElementById('coin-count');
    const domMadera     = document.getElementById('wood-count');
    const lblHouseLevel = document.getElementById('lbl-house-level');
    const lblBeaverLevel= document.getElementById('lbl-beaver-level');
    const btnHouse      = document.getElementById('btn-upgrade-house');
    const txtCostHouse  = document.getElementById('cost-house');
    const btnBeaver     = document.getElementById('btn-upgrade-beaver');
    const txtCostBeaver = document.getElementById('cost-beaver');
    const welcomeMsg    = document.getElementById('welcome-msg');
    const userNameLbl   = document.getElementById('user-name');
    const userAvatar    = document.getElementById('user-avatar');
    const btnChangeAvatar = document.getElementById('btn-change-avatar');
    const avatarModal   = document.getElementById('avatar-modal');
    const closeAvatarModal = document.getElementById('close-avatar-modal');
    const btnConfirmAvatar = document.getElementById('btn-confirm-avatar');
    const btnDeleteAccount = document.getElementById('btn-delete-account');
    const inputEdad     = document.getElementById('inputEdad');

    if (inputEdad) {
        inputEdad.addEventListener('input', () => {
            inputEdad.value = inputEdad.value.replace(/[^0-9]/g, '');
            if (inputEdad.value.length > 2) inputEdad.value = inputEdad.value.slice(0, 2);
        });
        inputEdad.addEventListener('keydown', (e) => {
            if (e.key === 'e' || e.key === '.' || e.key === '-') e.preventDefault();
        });
    }

    let selectedAvatar = null;

    // ── Aplicar avatar en pantalla ────────────────────────────────────────
    function applyAvatar(key) {
        if (!key || !userAvatar) return;
        const src = avatarSrc(key);
        if (src) userAvatar.src = src;
    }

    // ── Cargar datos ──────────────────────────────────────────────────────
    async function init() {
        // Mostrar avatar guardado en localStorage de inmediato (sin esperar red)
        const localAvatar = localStorage.getItem('userAvatar');
        if (localAvatar) applyAvatar(localAvatar);

        const loadingAlert = alertaInfo('Cargando tu perfil...', { duration: 0, closable: false });

        try {
            currentUserData = await getUserData(userId);
            loadingAlert.close();

            if (welcomeMsg)  welcomeMsg.textContent  = `Hola, ${currentUserData.nombre}!`;
            if (userNameLbl) userNameLbl.textContent = currentUserData.nombre;

            // Avatar: fuente autoritativa = BD. Si BD tiene valor, usarlo y sincronizar localStorage.
            if (currentUserData.foto) {
                applyAvatar(currentUserData.foto);
                localStorage.setItem('userAvatar', currentUserData.foto);
            } else if (localAvatar) {
                // BD sin valor pero localStorage sí → mantener el que ya se mostró
                applyAvatar(localAvatar);
            }

            actualizarUI();

            idxCasa   = obtenerIndiceSkin(currentUserData.current_appearance, UNLOCKS_CASA_LIST);
            idxCastor = obtenerIndiceSkin(currentUserData.current_beaver,     UNLOCKS_CASTOR_LIST);
            renderizarCasa();
            renderizarCastor();

        } catch (error) {
            loadingAlert.close();
            console.error('💥 Error:', error);
            alertaError('Error al cargar datos del servidor. Recarga la página.');
        }
    }

    // ── Actualizar UI ─────────────────────────────────────────────────────
    function actualizarUI() {
        if (domMonedas)     domMonedas.textContent     = currentUserData.coins || 0;
        if (domMadera)      domMadera.textContent      = currentUserData.wood  || 0;
        if (lblHouseLevel)  lblHouseLevel.textContent  = currentUserData.house_level  || 1;
        if (lblBeaverLevel) lblBeaverLevel.textContent = currentUserData.beaver_level || 1;

        const generoEl = document.getElementById('user-genero');
        const edadEl   = document.getElementById('user-edad');
        const levelEl  = document.getElementById('user-level');
        if (generoEl) generoEl.textContent = currentUserData.genero || '—';
        if (edadEl)   edadEl.textContent   = currentUserData.edad ? `${currentUserData.edad} años` : '—';
        if (levelEl)  levelEl.textContent  = currentUserData.level || 1;

        if (txtCostHouse)  txtCostHouse.textContent  = COSTO_CASA_BASE;
        if (txtCostBeaver) txtCostBeaver.textContent = COSTO_CASTOR_BASE;

        if (currentUserData.house_level >= MAX_LEVEL) {
            btnHouse.textContent = '¡Casa al Máximo! 🏠';
            btnHouse.disabled = true;
        } else if (currentUserData.wood < COSTO_CASA_BASE) {
            btnHouse.disabled = true;
            btnHouse.title = `Necesitas ${COSTO_CASA_BASE} madera (tienes ${currentUserData.wood})`;
        } else {
            btnHouse.disabled = false;
            btnHouse.title = '';
        }

        if (currentUserData.beaver_level >= MAX_LEVEL) {
            btnBeaver.textContent = '¡Castor al Máximo! 🦫';
            btnBeaver.disabled = true;
        } else if (currentUserData.coins < COSTO_CASTOR_BASE) {
            btnBeaver.disabled = true;
            btnBeaver.title = `Necesitas ${COSTO_CASTOR_BASE} monedas (tienes ${currentUserData.coins})`;
        } else {
            btnBeaver.disabled = false;
            btnBeaver.title = '';
        }
    }

    // ── Mejoras ───────────────────────────────────────────────────────────
    btnHouse.addEventListener('click', async () => {
        if (btnHouse.disabled) {
            alertaError(`Necesitas ${COSTO_CASA_BASE} madera. Actualmente tienes: ${currentUserData.wood} 🪵`);
            return;
        }
        try {
            alertaInfo('Mejorando tu hogar...', { duration: 2000 });
            const result = await upgradeItem(userId, 'house');
            if (result.success) {
                currentUserData.wood        = result.new_stats.wood;
                currentUserData.house_level = result.new_stats.house_level;
                alertaExito(`¡Casa mejorada a nivel ${result.new_stats.house_level}! 🏠`, { title: '¡Mejora completada!', duration: 4000 });
                actualizarUI();
            } else { alertaError(result.message); }
        } catch (error) { console.error(error); alertaError('Error de conexión al mejorar casa.'); }
    });

    btnBeaver.addEventListener('click', async () => {
        if (btnBeaver.disabled) {
            alertaError(`Necesitas ${COSTO_CASTOR_BASE} monedas. Actualmente tienes: ${currentUserData.coins} 🪙`);
            return;
        }
        try {
            alertaInfo('Entrenando a tu castor...', { duration: 2000 });
            const result = await upgradeItem(userId, 'beaver');
            if (result.success) {
                currentUserData.coins        = result.new_stats.coins;
                currentUserData.beaver_level = result.new_stats.beaver_level;
                alertaExito(`¡Castor entrenado a nivel ${result.new_stats.beaver_level}! 🦫`, { title: '¡Entrenamiento exitoso!', duration: 4000 });
                actualizarUI();
            } else { alertaError(result.message); }
        } catch (error) { console.error(error); alertaError('Error de conexión al entrenar castor.'); }
    });

    // ── Visores de skins ───────────────────────────────────────────────────
    function getSkinsDesbloqueadas(tipo) {
        return tipo === 'house' ? UNLOCKS_CASA_LIST : UNLOCKS_CASTOR_LIST;
    }

    function renderizarCasa() {
        const listaSkins = getSkinsDesbloqueadas('house');
        const skinId = listaSkins[idxCasa];
        const nivelRequerido = idxCasa === 0 ? 1 : idxCasa * 2;
        const estaDesbloqueada = currentUserData.house_level >= nivelRequerido;

        document.getElementById('house-img').src = DB_SKINS[skinId];
        const lblNombre = document.getElementById('house-name-lbl');
        if (estaDesbloqueada) {
            lblNombre.textContent = SKIN_NAMES[skinId];
            document.getElementById('house-img').style.filter = 'none';
        } else {
            lblNombre.textContent = `🔒 Nivel ${nivelRequerido}`;
            document.getElementById('house-img').style.filter = 'grayscale(100%)';
        }

        const btn    = document.getElementById('btn-equip-house');
        const status = document.getElementById('house-status');
        if (skinId === currentUserData.current_appearance) {
            status.style.display = 'block';
            btn.textContent = 'Equipado'; btn.disabled = true; btn.style.background = '#4CAF50';
        } else {
            status.style.display = 'none';
            if (estaDesbloqueada) {
                btn.textContent = 'Equipar'; btn.disabled = false; btn.style.background = '#2c3e50';
                btn.onclick = () => equiparSkinAPI(skinId, 'house');
            } else {
                btn.textContent = 'Bloqueado'; btn.disabled = true; btn.style.background = '#999';
            }
        }
    }

    function renderizarCastor() {
        const listaSkins = getSkinsDesbloqueadas('beaver');
        const skinId = listaSkins[idxCastor];
        const nivelRequerido = idxCastor === 0 ? 1 : idxCastor * 2;
        const estaDesbloqueada = currentUserData.beaver_level >= nivelRequerido;

        document.getElementById('beaver-img').src = DB_CASTORES[skinId];
        const lblNombre = document.getElementById('beaver-name-lbl');
        if (estaDesbloqueada) {
            lblNombre.textContent = CASTOR_NAMES[skinId];
            document.getElementById('beaver-img').style.filter = 'none';
        } else {
            lblNombre.textContent = `🔒 Nivel ${nivelRequerido}`;
            document.getElementById('beaver-img').style.filter = 'grayscale(100%)';
        }

        const btn    = document.getElementById('btn-equip-beaver');
        const status = document.getElementById('beaver-status');
        if (skinId === currentUserData.current_beaver) {
            status.style.display = 'block';
            btn.textContent = 'Equipado'; btn.disabled = true; btn.style.background = '#4CAF50';
        } else {
            status.style.display = 'none';
            if (estaDesbloqueada) {
                btn.textContent = 'Equipar'; btn.disabled = false; btn.style.background = '#2c3e50';
                btn.onclick = () => equiparSkinAPI(skinId, 'beaver');
            } else {
                btn.textContent = 'Bloqueado'; btn.disabled = true; btn.style.background = '#999';
            }
        }
    }

    async function equiparSkinAPI(skinId, type) {
        try {
            const tipoTexto = type === 'house' ? 'apariencia del hogar' : 'apariencia del castor';
            alertaInfo(`Actualizando ${tipoTexto}...`, { duration: 1500 });
            const result = await equipSkin(userId, skinId, type);
            if (result.success) {
                if (type === 'house')   currentUserData.current_appearance = skinId;
                if (type === 'beaver')  currentUserData.current_beaver     = skinId;
                const nombreSkin = type === 'house' ? SKIN_NAMES[skinId] : CASTOR_NAMES[skinId];
                alertaExito(`¡${nombreSkin} equipado correctamente!`, { title: 'Apariencia actualizada', duration: 3000 });
                renderizarCasa();
                renderizarCastor();
            }
        } catch (error) { console.error(error); alertaError('Error al equipar apariencia.'); }
    }

    function obtenerIndiceSkin(skinId, lista) {
        const idx = lista.indexOf(skinId);
        return idx === -1 ? 0 : idx;
    }

    // ── Navegación de skins ────────────────────────────────────────────────
    document.getElementById('btn-prev-house').onclick  = () => { if (idxCasa > 0)                            idxCasa--;   renderizarCasa();   };
    document.getElementById('btn-next-house').onclick  = () => { if (idxCasa < UNLOCKS_CASA_LIST.length-1)   idxCasa++;   renderizarCasa();   };
    document.getElementById('btn-prev-beaver').onclick = () => { if (idxCastor > 0)                          idxCastor--; renderizarCastor(); };
    document.getElementById('btn-next-beaver').onclick = () => { if (idxCastor < UNLOCKS_CASTOR_LIST.length-1) idxCastor++; renderizarCastor(); };

    // ── Eliminar cuenta ────────────────────────────────────────────────────
    if (btnDeleteAccount) {
        btnDeleteAccount.onclick = async () => {
            const c1 = await alertaConfirmacion('¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.', 'Eliminar Cuenta');
            if (!c1) return;
            const c2 = await alertaConfirmacion('⚠️ ÚLTIMA ADVERTENCIA: Todos tus datos se perderán permanentemente. ¿Continuar?', 'Confirmación Final');
            if (!c2) return;
            try {
                btnDeleteAccount.disabled = true;
                btnDeleteAccount.textContent = 'Eliminando...';
                alertaInfo('Eliminando cuenta...', { duration: 0, closable: false });
                const result = await deleteUser(userId);
                if (result.success) {
                    alertaExito('Cuenta eliminada exitosamente. Redirigiendo...', { duration: 2000, onClose: () => logout() });
                    setTimeout(() => logout(), 2000);
                } else {
                    alertaError('Error: ' + result.message);
                    btnDeleteAccount.disabled = false;
                    btnDeleteAccount.textContent = 'Eliminar Cuenta';
                }
            } catch (error) {
                console.error(error);
                alertaError('Error de conexión al intentar eliminar la cuenta.');
                btnDeleteAccount.disabled = false;
                btnDeleteAccount.textContent = 'Eliminar Cuenta';
            }
        };
    }

    // ── Modal avatar (standalone) ─────────────────────────────────────────
    if (btnChangeAvatar)  btnChangeAvatar.onclick  = () => { avatarModal.style.display = 'flex'; };
    if (closeAvatarModal) closeAvatarModal.onclick = () => { avatarModal.style.display = 'none'; };

    document.querySelectorAll('.avatar-option').forEach(option => {
        option.onclick = () => {
            document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selectedAvatar = option.dataset.avatar;
        };
    });

    if (btnConfirmAvatar) {
        btnConfirmAvatar.onclick = async () => {
            if (!selectedAvatar) {
                alertaAdvertencia('Por favor, selecciona un avatar primero');
                return;
            }
            btnConfirmAvatar.disabled = true;
            btnConfirmAvatar.textContent = 'Guardando...';
            alertaInfo('Actualizando avatar...', { duration: 1500 });

            try {
                const result = await equipSkin(userId, selectedAvatar, 'avatar');
                if (result.success) {
                    // Actualizar en memoria, DOM y localStorage
                    currentUserData.foto = selectedAvatar;
                    applyAvatar(selectedAvatar);
                    localStorage.setItem('userAvatar', selectedAvatar);

                    avatarModal.style.display = 'none';
                    alertaExito('¡Avatar actualizado correctamente!', { title: '¡Genial!', duration: 3000 });

                    // Actualizar vista previa en el modal de edición si está abierto
                    const preview = document.getElementById('avatarPreview');
                    if (preview) preview.src = avatarSrc(selectedAvatar);
                } else {
                    alertaError('Error: ' + result.message);
                }
            } catch (error) {
                console.error(error);
                alertaError('Error de conexión al actualizar avatar.');
            } finally {
                btnConfirmAvatar.disabled = false;
                btnConfirmAvatar.textContent = 'Guardar Avatar';
            }
        };
    }

    // ══════════════════════════════════════════════════════════════════════
    // FUNCIONES GLOBALES PARA EL MODAL DE EDITAR PERFIL
    // ══════════════════════════════════════════════════════════════════════

    window.openProfileModal = function () {
        document.getElementById('profileOverlay').classList.add('active');
        if (!currentUserData) return;

        document.getElementById('inputUsername').value = currentUserData.nombre || '';
        document.getElementById('inputEdad').value     = currentUserData.edad   || '';

        // Género: normalizar a minúsculas para que coincida con los values del select
        const generoDB = (currentUserData.genero || '').toLowerCase();
        const selectGenero = document.getElementById('selectGenero');
        if (selectGenero) {
            // Intentar coincidencia directa
            selectGenero.value = generoDB;
            // Si no coincide (valor de BD distinto), recorrer opciones
            if (selectGenero.value !== generoDB) {
                Array.from(selectGenero.options).forEach(opt => {
                    if (opt.value.toLowerCase() === generoDB) selectGenero.value = opt.value;
                });
            }
        }

        // Mostrar avatar actual en el modal de edición
        const preview = document.getElementById('avatarPreview');
        if (preview && currentUserData.foto) {
            preview.src = avatarSrc(currentUserData.foto);
        } else if (preview) {
            const local = localStorage.getItem('userAvatar');
            if (local) preview.src = avatarSrc(local);
        }
    };

    window.closeProfileModal = function () {
        document.getElementById('profileOverlay').classList.remove('active');
    };

    window.saveProfile = async function () {
        const nombre  = document.getElementById('inputUsername').value.trim();
        const edadRaw = document.getElementById('inputEdad').value;
        const genero  = document.getElementById('selectGenero').value;
        const edad    = parseInt(edadRaw);

        if (!nombre || nombre.length < 3 || nombre.length > 16) {
            alertaAdvertencia('El nombre debe tener entre 3 y 16 caracteres.');
            return;
        }
        if (!edad || edad < 15 || edad > 99) {
            alertaAdvertencia('La edad debe ser entre 15 y 99 años.');
            return;
        }

        // Guardar avatar del modal de edición si cambió
        if (window._avatarSeleccionadoModal) {
            try {
                const avatarResult = await equipSkin(userId, window._avatarSeleccionadoModal, 'avatar');
                if (avatarResult.success) {
                    currentUserData.foto = window._avatarSeleccionadoModal;
                    applyAvatar(window._avatarSeleccionadoModal);
                    localStorage.setItem('userAvatar', window._avatarSeleccionadoModal);
                }
            } catch (e) { console.error('Error guardando avatar:', e); }
            window._avatarSeleccionadoModal = null;
        }

        try {
            alertaInfo('Guardando cambios...', { duration: 1500 });
            const result = await updateUserData(userId, { nombre, edad, genero });

            if (result && result.success !== false) {
                currentUserData.nombre = nombre;
                currentUserData.edad   = edad;
                currentUserData.genero = genero;

                if (welcomeMsg)  welcomeMsg.textContent  = `Hola, ${nombre}!`;
                if (userNameLbl) userNameLbl.textContent = nombre;

                const generoEl = document.getElementById('user-genero');
                const edadEl   = document.getElementById('user-edad');
                if (generoEl) generoEl.textContent = genero  || '—';
                if (edadEl)   edadEl.textContent   = `${edad} años`;

                alertaExito('Perfil actualizado correctamente');
                setTimeout(() => document.getElementById('profileOverlay').classList.remove('active'), 1200);
            } else {
                const msg = result?.message || 'Error al guardar';
                alertaError(msg.includes('23505') || msg.includes('duplicate')
                    ? 'Ese nombre de usuario ya está en uso.'
                    : msg);
            }
        } catch (error) {
            console.error('Error en saveProfile:', error);
            alertaError('Error de conexión al guardar el perfil.');
        }
    };

    window.deleteAccountFromModal = function () {
        window.closeConfirmDelete?.();
        window.closeProfileModal?.();
        document.getElementById('btn-delete-account')?.click();
    };

    // ── Iniciar ───────────────────────────────────────────────────────────
    init();
});