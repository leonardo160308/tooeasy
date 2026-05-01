document.querySelectorAll('.chart-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = parseInt(btn.dataset.chartType);
        const legend = document.getElementById('chart-legend');
        legend.querySelectorAll('span[class^="legend-"]').forEach(el => el.style.display = 'none');
        if (type === 1) {
            legend.querySelectorAll('.legend-balance').forEach(el => el.style.display = 'flex');
        } else if (type === 2) {
            legend.querySelectorAll('.legend-ingresos').forEach(el => el.style.display = 'flex');
        } else {
            legend.querySelectorAll('.legend-egresos').forEach(el => el.style.display = 'flex');
        }
    });
});
document.querySelectorAll('.legend-balance').forEach(el => el.style.display = 'flex');
