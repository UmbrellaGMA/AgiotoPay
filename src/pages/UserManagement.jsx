import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/formatters';
import { UserPlus, Shield, UserCheck, Lock, Trash2, Edit3, X, Check, AlertTriangle, Key } from 'lucide-react';

export default function UserManagement() {
  const { users = [], currentUser, addUser, updateUser, deleteUser } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operator', // 'admin' or 'operator'
  });

  const handleOpenModal = (userToEdit = null) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (userToEdit) {
      setEditingUser(userToEdit);
      setForm({
        name: userToEdit.name,
        email: userToEdit.email,
        password: '', // leave empty unless updating
        role: userToEdit.role,
      });
    } else {
      setEditingUser(null);
      setForm({ name: '', email: '', password: '', role: 'operator' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (editingUser) {
      const updates = {
        name: form.name,
        email: form.email,
        role: form.role,
      };
      if (form.password) updates.password = form.password;

      await updateUser(editingUser.id, updates);
      setSuccessMsg('Usuário atualizado com sucesso!');
      setShowModal(false);
    } else {
      if (!form.password) {
        setErrorMsg('A senha é obrigatória para novos usuários.');
        return;
      }
      const result = await addUser(form);
      if (result?.success) {
        setSuccessMsg(`Usuário ${form.name} criado com sucesso!`);
        setShowModal(false);
      } else {
        setErrorMsg(result?.error || 'Erro ao criar usuário.');
      }
    }
  };

  const handleToggleStatus = async (user) => {
    if (user.id === currentUser?.id) {
      alert('Você não pode alterar seu próprio status.');
      return;
    }
    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    await updateUser(user.id, { status: newStatus });
  };

  const handleDelete = async (user) => {
    if (user.id === currentUser?.id) {
      alert('Você não pode excluir sua própria conta enquanto estiver conectado.');
      return;
    }
    if (window.confirm(`Tem certeza que deseja excluir o acesso de ${user.name}?`)) {
      const res = await deleteUser(user.id);
      if (res && !res.success) alert(res.error);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Gestão de Usuários & Agiotas</h1>
          <p>Cadastre e gerencie acessos de outros operadores do AgiotoPay</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <UserPlus size={16} /> Novo Usuário / Agiota
        </button>
      </div>

      {successMsg && (
        <div className="alert alert-success mb-16" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px 16px', borderRadius: 8 }}>
          {successMsg}
        </div>
      )}

      {/* Info Card */}
      <div className="stat-card mb-24" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
        <div className="flex align-center gap-8 text-purple">
          <Shield size={20} />
          <strong>Controle de Acessos AgiotoPay</strong>
        </div>
        <p style={{ marginTop: 6, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Como <strong>Gestor Principal ({currentUser?.email})</strong>, você tem autoridade total para adicionar novos agiotas/operadores, redefinir senhas ou revogar acessos a qualquer momento.
        </p>
      </div>

      {/* Users Table */}
      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome / Usuário</th>
                <th>E-mail de Acesso</th>
                <th>Nível de Acesso</th>
                <th>Status</th>
                <th>Data de Criação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isSelf = u.id === currentUser?.id;
                const isAdmin = u.role === 'admin';

                return (
                  <tr key={u.id}>
                    <td>
                      <div className="flex align-center gap-8">
                        <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.85rem' }}>{u.name[0]}</div>
                        <div>
                          <strong>{u.name}</strong>
                          {isSelf && <span className="badge-status blue ml-8" style={{ fontSize: '0.7rem' }}>Você</span>}
                        </div>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge-status ${isAdmin ? 'purple' : 'gray'}`}>
                        {isAdmin ? '🛡️ Gestor Principal' : '👤 Operador / Agiota'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-status ${u.status === 'active' ? 'green' : 'red'}`}>
                        {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td>{u.createdAt ? formatDate(u.createdAt.split('T')[0]) : '-'}</td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-secondary btn-sm" title="Editar Usuário" onClick={() => handleOpenModal(u)}>
                          <Edit3 size={14} />
                        </button>
                        {!isSelf && (
                          <>
                            <button
                              className={`btn btn-sm ${u.status === 'active' ? 'btn-secondary' : 'btn-primary'}`}
                              title={u.status === 'active' ? 'Bloquear Acesso' : 'Desbloquear Acesso'}
                              onClick={() => handleToggleStatus(u)}
                            >
                              {u.status === 'active' ? <Lock size={14} color="#f87171" /> : <UserCheck size={14} />}
                            </button>
                            <button className="btn btn-secondary btn-sm" title="Excluir Usuário" onClick={() => handleDelete(u)}>
                              <Trash2 size={14} color="#f87171" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create/Edit User */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Editar Usuário' : 'Novo Usuário Agiota'}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {errorMsg && (
                  <div className="alert alert-danger mb-16" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '10px 14px', borderRadius: 6, fontSize: '0.88rem' }}>
                    {errorMsg}
                  </div>
                )}

                <div className="form-group mb-16">
                  <label className="form-label">Nome Completo *</label>
                  <input className="form-input" placeholder="Ex: Carlos Agiota" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>

                <div className="form-group mb-16">
                  <label className="form-label">E-mail de Login *</label>
                  <input className="form-input" type="email" placeholder="carlos@exemplo.com" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>

                <div className="form-group mb-16">
                  <label className="form-label">
                    {editingUser ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha de Acesso *'}
                  </label>
                  <input className="form-input" type="password" placeholder="••••••••••••" required={!editingUser} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">Nível de Permissão</label>
                  <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="operator">👤 Operador / Agiota (Acesso às operações)</option>
                    <option value="admin">🛡️ Gestor Principal (Acesso total + Gerenciar Usuários)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
