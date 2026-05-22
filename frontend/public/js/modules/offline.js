/**
 * Offline detection & recovery module.
 * Usage: import { initOfflineBanner } from './offline.js';
 *        initOfflineBanner(onReconnect);   // onReconnect is called when network returns
 */

export function initOfflineBanner(onReconnect) {
    const banner = _ensureBanner();

    function showBanner() {
        banner.classList.add('visible');
    }

    function hideBanner() {
        banner.classList.remove('visible');
    }

    function handleOffline() {
        showBanner();
    }

    function handleOnline() {
        hideBanner();
        if (typeof onReconnect === 'function') {
            onReconnect();
        }
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online',  handleOnline);

    if (!navigator.onLine) {
        showBanner();
    }

    return { showBanner, hideBanner };
}

function _ensureBanner() {
    const existing = document.getElementById('offline-banner');
    if (existing) return existing;

    const banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'polite');
    banner.innerHTML = '<i class="fas fa-wifi-slash"></i> Sin conexión — reconectando…';
    document.body.appendChild(banner);
    return banner;
}
