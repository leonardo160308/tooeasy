function openConfirmDelete() {
    document.getElementById('confirmOverlay').classList.add('active');
}
function closeConfirmDelete() {
    document.getElementById('confirmOverlay').classList.remove('active');
}

function toggleAvatarPickerModal(e) {
    e.stopPropagation();
    document.getElementById('avatarPickerModal').classList.toggle('open');
}
function closeAvatarPickerModal() {
    document.getElementById('avatarPickerModal').classList.remove('open');
}

let _avatarSeleccionadoModal = null;

function selectAvatarModal(avatarKey) {
    const paths = {
        avatar1: '/public/img/avatars/perfil1.png',
        avatar2: '/public/img/avatars/perfil2.png',
        avatar3: '/public/img/avatars/perfil3.png',
        avatar4: '/public/img/avatars/perfil4.png',
    };
    document.getElementById('avatarPreview').src = paths[avatarKey];
    document.getElementById('user-avatar').src   = paths[avatarKey];
    window._avatarSeleccionadoModal = avatarKey;
    closeAvatarPickerModal();
}

document.addEventListener('click', function(e) {
    const container = document.getElementById('avatarContainerModal');
    if (container && !container.contains(e.target)) closeAvatarPickerModal();
});

function showToastPerfil(msg) {
    const t = document.getElementById('toastPerfil');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

document.getElementById('profileOverlay').addEventListener('click', function(e) {
    if (e.target === this) {
        if (window.closeProfileModal) window.closeProfileModal();
    }
});

// Wire up onclick handlers (removed from HTML)
document.querySelector('.btn-edit').addEventListener('click', () => {
    if (window.openProfileModal) window.openProfileModal();
});
document.querySelector('.btn-close-modal').addEventListener('click', () => {
    if (window.closeProfileModal) window.closeProfileModal();
});
document.querySelector('.avatar-edit-btn-modal').addEventListener('click', toggleAvatarPickerModal);
document.querySelectorAll('.avatar-opt').forEach((el, i) => {
    const key = 'avatar' + (i + 1);
    el.addEventListener('click', () => selectAvatarModal(key));
});
document.querySelector('.btn-delete-modal').addEventListener('click', openConfirmDelete);
document.querySelector('.btn-accept-modal').addEventListener('click', () => {
    if (window.saveProfile) window.saveProfile();
});
document.querySelector('.btn-cancel-confirm').addEventListener('click', closeConfirmDelete);
document.querySelector('.btn-confirm-delete').addEventListener('click', () => {
    if (window.deleteAccountFromModal) window.deleteAccountFromModal();
});

const inputEdad = document.getElementById('inputEdad');
if (inputEdad) {
    inputEdad.addEventListener('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '').slice(0, 2);
    });
    inputEdad.addEventListener('keydown', function (e) {
        if (e.key === 'e' || e.key === '.' || e.key === '-') e.preventDefault();
    });
}
