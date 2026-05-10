// dashboard.js
window.renderExperimentDashboardPage = function(container) {
  const exp = window.currentExperiment;
  if (!exp) { container.innerHTML = '<div class="card"><p>Selecione um experimento.</p></div>'; return; }
  
  container.innerHTML = `
    <div class="content-header"><div class="content-title">Identificação do Experimento</div></div>
    <div class="card">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <h4 style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">Código</h4>
          <p style="font-weight: 600; font-size: 1.1rem;">${exp.code}</p>
        </div>
        <div>
          <h4 style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">Nome</h4>
          <p style="font-weight: 600;">${exp.name || 'Sem nome'}</p>
        </div>
        <div>
          <h4 style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">Fazenda</h4>
          <p>${exp.farm || '-'}</p>
        </div>
        <div>
          <h4 style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">Data de Plantio</h4>
          <p>${formatExperimentDate(exp.planting_date)}</p>
        </div>
      </div>
      <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
        <h4 style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">Objetivo</h4>
        <p style="font-size: 14px; line-height: 1.5; color: #374151;">${exp.objective || 'Nenhum objetivo descrito.'}</p>
      </div>
    </div>
  `;
};
