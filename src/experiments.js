// experiments.js
let currentExperiment = null;
window.currentExperiment = null;

function formatExperimentDate(dateString) {
  if (!dateString) return "-";
  const [y, m, d] = dateString.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

async function renderExperimentsPage(container) {
  container.innerHTML = `
    <div class="content-header">
      <div class="content-title">Experimentos</div>
      <div class="content-subtitle">
        Selecione qual experimento será usado para edição e inserção de dados.
      </div>
    </div>

    <div class="card" id="experimentsActions" style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
      <div style="font-size:14px; color:#4b5563;">
        Gerencie os experimentos de campo cadastrados.
      </div>
      <button class="btn-primary" id="btnNewExperiment" style="width:auto; padding-inline:18px;">
        + Novo experimento
      </button>
    </div>

    <div id="experimentsList">
      <div class="card"><p>Carregando experimentos...</p></div>
    </div>
  `;

  document.getElementById("btnNewExperiment").onclick = () => openExperimentFormModal();
  await loadExperimentsIntoList();
}

async function loadExperimentsIntoList() {
  const listEl = document.getElementById("experimentsList");
  if (!listEl) return;

  const { data, error } = await s
    .from("experiments")
    .select("*")
    .order("planting_date", { ascending: false });

  if (error) {
    listEl.innerHTML = `<div class="card"><p style="color:#b91c1c;">Erro: ${error.message}</p></div>`;
    return;
  }

  const experiments = data || [];
  if (!window.currentExperiment && experiments.length > 0) {
    window.currentExperiment = experiments[0];
  }

  if (!experiments.length) {
    listEl.innerHTML = `
      <div class="card" style="text-align:center; padding:32px 16px;">
        <div style="font-size:18px; font-weight:700;">Nenhum experimento cadastrado</div>
        <button class="btn-primary" style="margin-top:12px;" onclick="openExperimentFormModal()">+ Criar experimento</button>
      </div>
    `;
    return;
  }

  listEl.innerHTML = experiments.map(exp => {
    const isSelected = window.currentExperiment && window.currentExperiment.id === exp.id;
    return `
      <div class="card" style="margin-bottom:12px; border-left: 4px solid ${isSelected ? 'var(--green)' : 'transparent'}">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="font-size:18px; font-weight:700; color:var(--green-dark);">${exp.code || "(sem código)"}</div>
            <div style="font-size:14px; color:#4b5563;">${exp.name || "Sem nome"}</div>
            <div style="font-size:12px; color:#6b7280;">Plantio: ${formatExperimentDate(exp.planting_date)} · Local: ${exp.farm || "-"}</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="${isSelected ? 'btn-primary' : 'btn-secondary'}" onclick="selectExperiment('${exp.id}')">
              ${isSelected ? 'Selecionado' : 'Selecionar'}
            </button>
            <button class="btn-secondary" onclick="openExperimentScheduleModal('${exp.id}')">Cronograma</button>
            <button class="btn-danger" onclick="confirmDeleteExperiment('${exp.id}', '${exp.code}')">Excluir</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function selectExperiment(id) {
  s.from("experiments").select("*").eq("id", id).single().then(({ data }) => {
    if (data) {
      window.currentExperiment = data;
      loadExperimentsIntoList();
      alert(`Experimento "${data.code}" selecionado.`);
    }
  });
}

function confirmDeleteExperiment(id, code) {
  if (confirm(`Excluir experimento "${code}"?`)) {
    s.from("experiments").delete().eq("id", id).then(() => loadExperimentsIntoList());
  }
}

function openExperimentFormModal(exp) {
  const isEdit = !!exp;
  const title = isEdit ? "Editar experimento" : "Novo experimento";
  const bodyHtml = `
    <form id="experimentForm">
      <label for="expCode">Código</label>
      <input id="expCode" type="text" value="${exp?.code || ""}" placeholder="Ex: 001" />
      <label for="expName">Nome</label>
      <input id="expName" type="text" value="${exp?.name || ""}" />
      <label for="expFarm">Fazenda</label>
      <input id="expFarm" type="text" value="${exp?.farm || ""}" />
      <label for="expPlantingDate">Data de Plantio</label>
      <input id="expPlantingDate" type="date" value="${exp?.planting_date ? exp.planting_date.split('T')[0] : ""}" />
      <label for="expObjective">Objetivo</label>
      <textarea id="expObjective" style="width:100%; padding:8px; border-radius:8px; border:1px solid #ddd;">${exp?.objective || ""}</textarea>
      <button type="button" class="btn-primary" style="margin-top:10px;" onclick="submitExperimentForm('${exp?.id || ""}')">
        Salvar
      </button>
    </form>
  `;
  openModal(title, bodyHtml);
}

async function submitExperimentForm(id) {
  const payload = {
    code: document.getElementById("expCode").value,
    name: document.getElementById("expName").value,
    farm: document.getElementById("expFarm").value,
    planting_date: document.getElementById("expPlantingDate").value,
    objective: document.getElementById("expObjective").value,
    status: 'active'
  };

  const { error } = id 
    ? await s.from("experiments").update(payload).eq("id", id)
    : await s.from("experiments").insert(payload);

  if (error) alert("Erro: " + error.message);
  else {
    closeModal();
    loadExperimentsIntoList();
  }
}

window.renderExperimentsPage = renderExperimentsPage;
window.openExperimentFormModal = openExperimentFormModal;
window.selectExperiment = selectExperiment;
window.confirmDeleteExperiment = confirmDeleteExperiment;
window.submitExperimentForm = submitExperimentForm;
window.loadExperimentsIntoList = loadExperimentsIntoList;
