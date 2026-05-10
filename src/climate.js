// climate.js
window.renderClimatePage = async function(container) {
  container.innerHTML = `
    <div class="content-header"><div class="content-title">Dados Climáticos</div></div>
    <div class="card">
      <button class="btn-primary" onclick="openClimateModal()">Registrar Clima</button>
      <div id="climateList" style="margin-top:15px;">Carregando...</div>
    </div>
  `;
  loadClimate();
};

async function loadClimate() {
  const el = document.getElementById("climateList");
  if (!el) return;
  const { data } = await s.from("climate_daily").select("*").order("date", { ascending: false });
  if (!data || !data.length) { el.innerHTML = "Sem registros."; return; }
  el.innerHTML = `<table><thead><tr><th>Data</th><th>Chuva (mm)</th><th>Temp. Média</th></tr></thead><tbody>${data.map(c => `
    <tr><td>${c.date}</td><td>${c.rain_mm || '-'}</td><td>${c.tmean_c || '-'}</td></tr>
  `).join('')}</tbody></table>`;
}

window.openClimateModal = () => {
  openModal("Registrar Clima", `<label>Data</label><input type="date" id="cDate"><label>Chuva (mm)</label><input type="number" step="0.1" id="cRain"><label>Temp. Média (°C)</label><input type="number" step="0.1" id="cTemp"><button class="btn-primary" onclick="saveClimate()">Salvar</button>`);
};

window.saveClimate = async () => {
  await s.from("climate_daily").insert({
    station_code: 'PADRAO',
    date: document.getElementById("cDate").value,
    rain_mm: parseFloat(document.getElementById("cRain").value),
    tmean_c: parseFloat(document.getElementById("cTemp").value)
  });
  closeModal(); loadClimate();
};
