// monitoring_drone.js
window.renderMonitoringDronePage = async function(container) {
  const exp = window.currentExperiment;
  if (!exp) { container.innerHTML = '<div class="card"><p>Selecione um experimento.</p></div>'; return; }
  container.innerHTML = `
    <div class="content-header"><div class="content-title">Monitoramento por Drone</div></div>
    <div class="card">
      <button class="btn-primary" onclick="openDroneFlightModal()">Novo voo</button>
      <div id="droneFlightsList" style="margin-top:15px;">Carregando...</div>
    </div>
  `;
  loadDroneFlights();
};

async function loadDroneFlights() {
  const el = document.getElementById("droneFlightsList");
  if (!el) return;
  const { data } = await s.from("drone_monitoring").select("*").eq("experiment_id", window.currentExperiment?.id);
  if (!data || !data.length) { el.innerHTML = "Sem voos."; return; }
  el.innerHTML = `<table><thead><tr><th>Data</th><th>NDVI</th><th>Ações</th></tr></thead><tbody>${data.map(f => `
    <tr><td>${f.flight_date}</td><td>${f.ndvi_mean || '-'}</td><td><button class="btn-danger" onclick="deleteDroneFlight('${f.id}')">Excluir</button></td></tr>
  `).join('')}</tbody></table>`;
}

window.openDroneFlightModal = () => {
  openModal("Novo voo", `<label>Data</label><input type="date" id="dfDate"><label>NDVI Médio</label><input type="number" step="0.01" id="dfNdvi"><button class="btn-primary" onclick="saveDroneFlight()">Salvar</button>`);
};

window.saveDroneFlight = async () => {
  await s.from("drone_monitoring").insert({
    experiment_id: window.currentExperiment.id,
    flight_date: document.getElementById("dfDate").value,
    ndvi_mean: parseFloat(document.getElementById("dfNdvi").value)
  });
  closeModal(); loadDroneFlights();
};

window.deleteDroneFlight = async (id) => { if(confirm('Excluir?')) { await s.from("drone_monitoring").delete().eq("id", id); loadDroneFlights(); } };
