// reports.js
window.renderReportsPage = function(container) {
  container.innerHTML = `
    <div class="content-header"><div class="content-title">Relatórios e Exportação</div></div>
    <div class="card">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
        <button class="btn-secondary" onclick="alert('Exportando Excel...')">Exportar Excel (.xlsx)</button>
        <button class="btn-secondary" onclick="alert('Exportando PDF...')">Exportar PDF (.pdf)</button>
      </div>
    </div>
  `;
};
