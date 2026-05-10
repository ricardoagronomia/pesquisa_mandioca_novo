// charts.js
window.renderChartsPage = function(container) {
  container.innerHTML = `
    <div class="content-header"><div class="content-title">Gráficos Analíticos</div></div>
    <div class="card" style="height: 400px; display: flex; align-items: center; justify-content: center; background: #f9fafb;">
      <p style="color: #6b7280;">Os gráficos serão renderizados aqui utilizando Chart.js com base nos dados do experimento.</p>
    </div>
  `;
};
