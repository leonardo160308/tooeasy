document.querySelectorAll('.chart-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = parseInt(btn.dataset.chartType);
        const legend = document.getElementById('chart-legend');
        legend.className = 'chart-legend';
        if (type === 2) legend.classList.add('show-ingresos');
        else if (type === 3) legend.classList.add('show-egresos');
    });
});
// Initial state: balance is visible by default (CSS handles .legend-ingresos and .legend-egresos as hidden)
