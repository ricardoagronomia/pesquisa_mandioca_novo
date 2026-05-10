// app.js
const s = supabase.createClient();
window.s = s;
window.currentUser = null;
window.currentRole = 'admin'; // Forçando admin para acesso local
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
  const { data: { session } } = await s.auth.getSession();
  
  const authScreen = document.getElementById('authScreen');
  const appScreen = document.getElementById('appScreen');
  const userEmailEl = document.getElementById('userEmail');

  if (session) {
    currentUser = session.user;
    authScreen.style.display = 'none';
    appScreen.style.display = 'flex';
    if (userEmailEl) userEmailEl.innerHTML = `<span style="font-weight:600">${currentUser.email} ${currentUser.role === 'admin' ? '(Admin)' : ''}</span>`;
    
    // Mostrar menu de usuários apenas para admin
    const sideUsers = document.getElementById('sideUsers');
    if (sideUsers && currentUser.role === 'admin') {
      sideUsers.style.display = 'flex';
    }

    renderPage();
  } else {
    authScreen.style.display = 'flex';
    appScreen.style.display = 'none';
  }

  // Lógica de abas
  const tabLogin = document.getElementById('tabLogin');
  const tabSignup = document.getElementById('tabSignup');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  if (tabLogin) tabLogin.onclick = () => {
    tabLogin.style.borderBottom = '2px solid var(--green)';
    tabSignup.style.borderBottom = 'none';
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
  };

  if (tabSignup) tabSignup.onclick = () => {
    tabSignup.style.borderBottom = '2px solid var(--green)';
    tabLogin.style.borderBottom = 'none';
    signupForm.style.display = 'block';
    loginForm.style.display = 'none';
  };

  // Botões de ação
  const btnLogin = document.getElementById('btnLogin');
  const btnSignup = document.getElementById('btnSignup');
  const authMsg = document.getElementById('authMessage');

  if (btnLogin) btnLogin.onclick = async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    authMsg.style.color = '#ef4444';
    authMsg.textContent = "Entrando...";
    
    const { data, error } = await s.auth.signInWithPassword({ email, password });
    if (error) {
      authMsg.textContent = error;
    } else {
      window.location.reload();
    }
  };

  if (btnSignup) btnSignup.onclick = async () => {
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    authMsg.style.color = '#ef4444';
    authMsg.textContent = "Criando conta...";

    const res = await s.auth.signUp({ email, password });
    if (res.error) {
      authMsg.textContent = res.error;
    } else {
      authMsg.style.color = 'var(--green)';
      authMsg.textContent = res.message || "Solicitação enviada!";
      if (!res.message.includes('Admin')) {
         alert("Cadastro recebido! Você poderá acessar assim que o administrador aprovar sua conta.");
      }
      tabLogin.click();
    }
  };

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) btnLogout.onclick = async () => {
    await s.auth.signOut();
    location.reload();
  };

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
    'reports': 'renderReportsPage',
    'users': 'renderUsersPage'
  };
  
  var fn = map[currentPage];
  if (fn && typeof window[fn] === 'function') {
    window[fn](area);
  } else {
    area.innerHTML = '<p style="color:#6b7280;padding:24px">Modulo <b>' + currentPage + '</b> não carregado ou não implementado.</p>';
  }
}
