// monitoring.js
(function () {
  function formatDateShort(isoDate) {
    if (!isoDate) return '–';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const map = {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'};
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  window.renderPlantCircles = function(plantStatuses, lodgingStatuses, biometrics, options = {}) {
    const { size = 30, fontSize = 12, showLabels = true, compact = false, gridLayout = false } = options;
    const positions = Object.keys(plantStatuses || {}).sort((a,b) => parseInt(a) - parseInt(b));
    if (positions.length === 0) return '';
    
    const circlesHtml = positions.map(pos => {
      const status = plantStatuses[pos];
      const isLodged = lodgingStatuses?.[pos] === true;
      const isSample = biometrics?.[pos]?.is_reference_plant === true;
      
      let bgColor = '#dcfce7', borderColor = '#22c55e', textColor = '#166534';
      if (status === 'dead') { bgColor = '#fee2e2'; borderColor = '#ef4444'; textColor = '#991b1b'; }
      else if (status === 'not_sprouted') { bgColor = '#f3f4f6'; borderColor = '#9ca3af'; textColor = '#6b7280'; }
      if (isLodged) { bgColor = '#fed7aa'; borderColor = '#f97316'; textColor = '#9a3412'; }
      
      return `
        <div style="position:relative; width:${size}px; height:${size}px; border-radius:50%; background:${bgColor}; border:${isSample ? 3 : 2}px solid ${borderColor}; display:flex; align-items:center; justify-content:center; font-size:${fontSize}px; font-weight:600; color:${textColor}; ${compact?'margin:1px;':'margin:4px;'}">
          ${showLabels ? pos : ''}
          ${isSample ? '<div style="position:absolute; top:-2px; right:-2px; width:8px; height:8px; background:#3b82f6; border-radius:50%; border:1px solid white;"></div>' : ''}
        </div>
      `;
    }).join('');
    
    if (gridLayout) {
      return `<div style="display:grid !important; grid-template-columns:repeat(3, ${size}px) !important; gap:${compact?'3px':'6px'}; justify-content:center;">${circlesHtml}</div>`;
    }
    return `<div style="display:flex; flex-wrap:wrap; gap:${compact?'2px':'4px'}; justify-content:center;">${circlesHtml}</div>`;
  };

  let currentMonitoringId = null;
  let currentBiometrics = {};

  window.renderMonitoringPage = function(container) {
    const experiment = window.currentExperiment;
    if (!experiment) {
      container.innerHTML = '<div class="card"><p>Selecione um experimento primeiro.</p></div>';
      return;
    }
    container.innerHTML = `
      <div class="content-header"><div class="content-title">Monitoramento manual</div></div>
      <div class="card">
        <div style="display:flex; gap:10px; margin-bottom:12px;">
          <div style="flex:1;"><label>Bloco</label><select id="monBlock"><option value="1">Bloco 1</option><option value="2">Bloco 2</option><option value="3">Bloco 3</option></select></div>
          <div style="flex:1;"><label>Parcela</label><select id="monPlot"><option value="T1">T1</option><option value="T2">T2</option><option value="T3">T3</option><option value="T4">T4</option></select></div>
        </div>
        <button class="btn-primary" onclick="openBiometricCollectionDialog()">Coletar dados</button>
      </div>
      <div class="card"><div id="monitoringList">Carregando lista...</div></div>
    `;
    loadMonitoringList();
  };

  async function loadMonitoringList() {
    const el = document.getElementById("monitoringList");
    if (!el) return;
    const { data } = await s.from("monitoring_events").select("*").eq("experiment_id", window.currentExperiment?.id);
    if (!data || !data.length) { el.innerHTML = "Sem registros."; return; }
    el.innerHTML = `<table><thead><tr><th>Data</th><th>Parcela</th><th>B</th><th>Ações</th></tr></thead><tbody>${data.map(m => `
      <tr>
        <td>${formatDateShort(m.monitoring_date)}</td>
        <td>${m.plot_code}</td>
        <td>${m.block_number}</td>
        <td><button class="btn-secondary" onclick="editMonitoring('${m.id}')">Editar</button></td>
      </tr>
    `).join('')}</tbody></table>`;
  }

  window.openBiometricCollectionDialog = function() {
    const block = document.getElementById("monBlock").value;
    const plot = document.getElementById("monPlot").value;
    let html = `<div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:12px;">`;
    for(let i=1; i<=9; i++) {
      html += `<button class="btn-secondary" style="height:50px; border-radius:50%;" onclick="alert('Planta '+${i})">${i}</button>`;
    }
    html += `</div><button class="btn-primary" onclick="saveMockMon('${block}','${plot}')">Salvar</button>`;
    openModal("Monitoramento "+plot, html);
  };

  window.saveMockMon = async function(b, p) {
    await s.from("monitoring_events").insert({
      experiment_id: window.currentExperiment.id,
      plot_code: p,
      block_number: parseInt(b),
      monitoring_date: new Date().toISOString().split('T')[0]
    });
    closeModal();
    loadMonitoringList();
  };

  window.editMonitoring = (id) => alert("Editando "+id);
})();
