// app.js
const s = supabase.createClient();
window.s = s;
window.currentUser = { id: 'local-user', email: 'pesquisador@local' };
window.currentRole = 'admin';
var currentPage = 'experiments';

window.formatDate = function(d) {
  if (!d) return '-';
  var str = d.split('T')[0];
  var parts = str.split('-');
  return parts[2] + '/' + parts[1] + '/' + parts[0];
};

window.openModal = function(title, bodyHtml) {
  var root = document.getElementById('modalRoot');
  if (!root) return;
  var t = document.getElementById('modalTitle');
  var b = document.getElementById('modalBody');
  if (t) t.innerHTML = title;
  if (b) b.innerHTML = bodyHtml;
  root.classList.add('active');
};
window.closeModal = function() {
  var root = document.getElementById('modalRoot');
  if (root) root.classList.remove('active');
};

document.addEventListener('DOMContentLoaded', async function () {
  // Pular autenticação
  const authScreen = document.getElementById('authScreen');
  const appScreen = document.getElementById('appScreen');
  const userEmailEl = document.getElementById('userEmail');

  if (authScreen) authScreen.style.display = 'none';
  if (appScreen) appScreen.style.display = 'flex';
  if (userEmailEl) userEmailEl.innerHTML = `<span style="font-weight:600">${currentUser.email}</span>`;

  // Renderizar a primeira página
  renderPage();

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) btnLogout.onclick = () => location.reload();

  // Modal controls
  const mc = document.getElementById('modalClose');
  if (mc) mc.onclick = closeModal;
  const mr = document.getElementById('modalRoot');
  if (mr) mr.addEventListener('click', (e) => {
    if (e.target.id === 'modalRoot') closeModal();
  });

  // Sidebar controls
  const items = document.querySelectorAll('.sidebar-item');
  items.forEach((item) => {
    item.addEventListener('click', () => {
      if (item.classList.contains('disabled')) return;
      items.forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
      currentPage = item.dataset.page;
      renderPage();
    });
  });
});

function renderPage() {
  var area = document.getElementById('contentArea');
  if (!area) return;
  area.innerHTML = '<p style="color:#6b7280;padding:24px;font-size:13px">Carregando...</p>';
  
  var map = {
    'experiments': 'renderExperimentsPage',
    'dbc': 'renderDbcMapPage',
    'experiment': 'renderExperimentDashboardPage',
    'monitoring': 'renderMonitoringPage',
    'monitoring-drone': 'renderMonitoringDronePage',
    'harvest': 'renderHarvestPage',
    'interventions': 'renderInterventionsPage',
    'climate': 'renderClimatePage',
    'charts': 'renderChartsPage',
    'reports': 'renderReportsPage'
  };
  
  var fn = map[currentPage];
  if (fn && typeof window[fn] === 'function') {
    window[fn](area);
  } else {
    area.innerHTML = '<p style="color:#6b7280;padding:24px">Modulo <b>' + currentPage + '</b> não carregado ou não implementado.</p>';
  }
}
