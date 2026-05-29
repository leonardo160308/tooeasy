// Modal de confirmación para descargar la APK de TOO-EASY
export function initAppDownload() {
    document.querySelectorAll('[data-app-download]').forEach(btn => {
        btn.addEventListener('click', e => { e.preventDefault(); showDownloadModal(); });
    });
}

function showDownloadModal() {
    const overlay = document.createElement('div');
    overlay.className = 'apk-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Descargar aplicación móvil');

    overlay.innerHTML = `
        <div class="apk-modal-box">
            <span class="apk-modal-icon"><i class="fas fa-mobile-alt"></i></span>
            <p class="apk-modal-title">Descargar aplicación móvil</p>
            <p class="apk-modal-body">¿Seguro que quieres descargar nuestra aplicación móvil?<br>Se descargará el archivo APK para Android.</p>
            <div class="apk-modal-actions">
                <button class="apk-btn-cancel" type="button">Cancelar</button>
                <button class="apk-btn-confirm" type="button">
                    <i class="fas fa-download"></i> Sí, descargar
                </button>
            </div>
        </div>`;

    document.body.appendChild(overlay);

    function close() {
        overlay.classList.add('apk-closing');
        setTimeout(() => overlay.remove(), 190);
    }

    overlay.querySelector('.apk-btn-cancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function onKey(e) {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    });

    overlay.querySelector('.apk-btn-confirm').addEventListener('click', () => {
        close();
        // Pequeño delay para que se vea el cierre del modal antes de la descarga
        setTimeout(() => { window.location.href = '/api/app/download'; }, 200);
    });
}
