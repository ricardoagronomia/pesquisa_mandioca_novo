// users.js
window.renderUsersPage = async function(container) {
  container.innerHTML = `
    <div class="content-header">
      <div class="content-title">Gestão de Usuários</div>
      <div class="content-subtitle">Aprove ou remova usuários que solicitaram acesso ao sistema.</div>
    </div>
    <div class="card">
      <div id="usersListTable">Carregando usuários...</div>
    </div>
  `;
  loadUsersList();
};

async function loadUsersList() {
  const el = document.getElementById("usersListTable");
  if (!el) return;

  const token = localStorage.getItem('mandioca_token');
  try {
    const r = await fetch('/api/admin/users', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const res = await r.json();
    const users = res.data || [];

    if (!users.length) {
      el.innerHTML = "<p>Nenhum usuário cadastrado.</p>";
      return;
    }

    el.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>E-mail</th>
            <th>Data Cadastro</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td>${u.email} ${u.role === 'admin' ? '<b>(Admin)</b>' : ''}</td>
              <td>${new Date(u.created_at).toLocaleDateString()}</td>
              <td>
                <span style="color: ${u.is_approved ? 'var(--green)' : '#f59e0b'}; font-weight: bold;">
                  ${u.is_approved ? 'Aprovado' : 'Pendente'}
                </span>
              </td>
              <td>
                ${u.role !== 'admin' ? `
                  ${!u.is_approved ? `
                    <button class="btn-primary" style="padding: 4px 10px; font-size: 11px;" onclick="handleUserAction(${u.id}, true)">Aprovar</button>
                  ` : ''}
                  <button class="btn-danger" style="padding: 4px 10px; font-size: 11px;" onclick="handleUserAction(${u.id}, false)">Remover</button>
                ` : '-'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch(e) {
    el.innerHTML = "Erro ao carregar lista.";
  }
}

window.handleUserAction = async function(userId, approve) {
  const confirmMsg = approve ? "Deseja aprovar este usuário?" : "Deseja remover este usuário?";
  if (!confirm(confirmMsg)) return;

  const token = localStorage.getItem('mandioca_token');
  try {
    const r = await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token 
      },
      body: JSON.stringify({ userId, approve })
    });
    if (r.ok) {
      loadUsersList();
    }
  } catch(e) {
    alert("Erro na operação.");
  }
};
