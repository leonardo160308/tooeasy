const btnVerHistorial = document.getElementById('btn-ver-historial');
if (btnVerHistorial) {
    btnVerHistorial.addEventListener('click', () => {
        const histBtn = document.querySelector('[data-section=historial]');
        if (histBtn) histBtn.click();
    });
}

const probGanEl  = document.getElementById('res-prob-gan');
const probGan2El = document.getElementById('res-prob-gan2');
const resVar95El = document.getElementById('res-var95');

if (probGanEl && probGan2El) {
    new MutationObserver(() => { probGan2El.textContent = probGanEl.textContent; })
        .observe(probGanEl, { childList: true, characterData: true, subtree: true });
}
if (resVar95El) {
    new MutationObserver(() => {
        const val = document.getElementById('res-var95').textContent;
        const colorEl = document.getElementById('res-var95');
        if (colorEl && val !== '—') colorEl.classList.add('val-negative');
    }).observe(resVar95El, { childList: true, characterData: true, subtree: true });
}
