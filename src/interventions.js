// interventions.js
window.renderInterventionsPage = async function(container) {
  const exp = window.currentExperiment;
  if (!exp) { container.innerHTML = '<div class="card"><p>Selecione um experimento.</p></div>'; return; }
  container.innerHTML = `
    <div class="content-header"><div class="content-title">Intervenções / Diário de Campo</div></div>
    <div class="card">
      <button class="btn-primary" onclick="openInterventionModal()">Nova Intervenção</button>
      <div id="intList" style="margin-top:15px;">Carregando...</div>
    </div>
  `;
  loadInterventions();
};

async function loadInterventions() {
  const el = document.getElementById("intList");
  if (!el) return;
  const { data } = await s.from("interventions").select("*").eq("experiment_id", window.currentExperiment?.id);
  if (!data || !data.length) { el.innerHTML = "Sem registros."; return; }
  el.innerHTML = `<table><thead><tr><th>Data</th><th>Tipo</th><th>Produto</th></tr></thead><tbody>${data.map(i => `
    <tr><td>${i.intervention_date}</td><td>${i.intervention_type}</td><td>${i.product || '-'}</td></tr>
  `).join('')}</tbody></table>`;
}

window.openInterventionModal = () => {
  openModal("Nova Intervenção", `<label>Data</label><input type="date" id="iDate"><label>Tipo</label><select id="iType"><option value="adubacao">Adubação</option><option value="controle">Controle de Pragas</option></select><label>Produto</label><input type="text" id="iProduct"><button class="btn-primary" onclick="saveIntervention()">Salvar</button>`);
};

window.saveIntervention = async () => {
  await s.from("interventions").insert({
    experiment_id: window.currentExperiment.id,
    intervention_date: document.getElementById("iDate").value,
    intervention_type: document.getElementById("iType").value,
    product: document.getElementById("iProduct").value
  });
  closeModal(); loadInterventions();
};
