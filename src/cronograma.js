// cronograma.js
window.openExperimentScheduleModal = async function(experimentId) {
  const { data: actions } = await s.from("scheduled_actions").select("*").eq("experiment_id", experimentId);
  let html = `
    <div style="margin-bottom:15px;"><button class="btn-primary" onclick="alert('Adicionar ação')">+ Adicionar Ação</button></div>
    <div style="max-height: 400px; overflow-y: auto;">
      ${actions && actions.length ? actions.map(a => `
        <div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
          <span>${a.name}</span>
          <span style="font-size: 12px; color: ${a.completed_at ? 'green' : 'orange'}">${a.completed_at ? '✓' : 'Pend.'}</span>
        </div>
      `).join('') : '<p>Sem ações no cronograma.</p>'}
    </div>
  `;
  openModal("Cronograma do Experimento", html);
};
