// harvest.js
window.renderHarvestPage = async function(container) {
  const exp = window.currentExperiment;
  if (!exp) { container.innerHTML = '<div class="card"><p>Selecione um experimento.</p></div>'; return; }
  container.innerHTML = `
    <div class="content-header"><div class="content-title">Colheita</div></div>
    <div class="card">
      <button class="btn-primary" onclick="openHarvestModal()">Registrar Colheita</button>
      <div id="harvestList" style="margin-top:15px;">Carregando...</div>
    </div>
  `;
  loadHarvestList();
};

async function loadHarvestList() {
  const el = document.getElementById("harvestList");
  if (!el) return;
  const { data } = await s.from("harvest_records").select("*").eq("experiment_id", window.currentExperiment?.id);
  if (!data || !data.length) { el.innerHTML = "Sem registros."; return; }
  el.innerHTML = `<table><thead><tr><th>Data</th><th>Parcela</th><th>Peso (kg)</th></tr></thead><tbody>${data.map(h => `
    <tr><td>${h.harvest_date}</td><td>${h.plot_code}</td><td>${h.total_weight || '-'}</td></tr>
  `).join('')}</tbody></table>`;
}

window.openHarvestModal = () => {
  openModal("Nova Colheita", `<label>Data</label><input type="date" id="hDate"><label>Parcela</label><input type="text" id="hPlot"><label>Peso (kg)</label><input type="number" step="0.01" id="hWeight"><button class="btn-primary" onclick="saveHarvest()">Salvar</button>`);
};

window.saveHarvest = async () => {
  await s.from("harvest_records").insert({
    experiment_id: window.currentExperiment.id,
    harvest_date: document.getElementById("hDate").value,
    plot_code: document.getElementById("hPlot").value,
    total_weight: parseFloat(document.getElementById("hWeight").value)
  });
  closeModal(); loadHarvestList();
};
