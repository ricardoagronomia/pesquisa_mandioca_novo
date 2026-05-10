// mapadbc.js
window.renderDbcMapPage = async function(container) {
  const exp = window.currentExperiment;
  if (!exp) { container.innerHTML = '<div class="card"><p>Selecione um experimento.</p></div>'; return; }
  
  container.innerHTML = `
    <div class="content-header"><div class="content-title">Mapa DBC (Delineamento de Blocos Casualizados)</div></div>
    <div class="card">
      <div id="dbcGrid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
        <div class="dbc-block" style="border: 1px solid #ddd; padding: 10px; border-radius: 8px;">
          <h4 style="margin-bottom:10px; text-align:center;">Bloco 1</h4>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;" id="block1Grid"></div>
        </div>
        <div class="dbc-block" style="border: 1px solid #ddd; padding: 10px; border-radius: 8px;">
          <h4 style="margin-bottom:10px; text-align:center;">Bloco 2</h4>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;" id="block2Grid"></div>
        </div>
        <div class="dbc-block" style="border: 1px solid #ddd; padding: 10px; border-radius: 8px;">
          <h4 style="margin-bottom:10px; text-align:center;">Bloco 3</h4>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;" id="block3Grid"></div>
        </div>
      </div>
    </div>
  `;

  // Preencher grids com parcelas fictícias ou do banco
  for(let b=1; b<=3; b++) {
    const grid = document.getElementById(`block${b}Grid`);
    for(let p=1; p<=12; p++) {
      grid.innerHTML += `<div style="background: #f0fdf4; border: 1px solid #bbf7d0; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border-radius: 4px;">T${p}</div>`;
    }
  }
};
