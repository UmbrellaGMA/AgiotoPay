import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, formatPhone, formatCPF, getClientStatus, getClientStatusLabel, getClientStatusColor, getInstallmentStatus, getDaysUntilDue } from '../utils/formatters';
import { Users, Search, Grid, List, Plus, X } from 'lucide-react';

export default function Clients() {
  const { clients, loans, installments, payments, addClient } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState('table');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', cpf: '', phone: '', whatsapp: '', email: '', address: '', city: '', state: '', birthDate: '', notes: '' });

  const clientsData = useMemo(() => {
    return clients.map(c => {
      const cls = loans.filter(l => l.clientId === c.id);
      const activeLoans = cls.filter(l => l.status === 'active');
      const clInst = installments.filter(i => i.clientId === c.id);
      const totalEmprestado = cls.reduce((s, l) => s + l.principalAmount, 0);
      const totalPago = clInst.reduce((s, i) => s + i.paidAmount, 0);
      const totalAberto = activeLoans.reduce((s, l) => s + l.totalAmount, 0) - clInst.filter(i => activeLoans.some(l => l.id === i.loanId)).reduce((s, i) => s + i.paidAmount, 0);
      const pendentes = clInst.filter(i => activeLoans.some(l => l.id === i.loanId) && i.paidAmount < i.totalAmount).length;
      const atrasadas = clInst.filter(i => activeLoans.some(l => l.id === i.loanId) && getInstallmentStatus(i) === 'overdue').length;
      const status = getClientStatus(c, loans, installments);

      const paidInst = clInst.filter(i => i.paidDate).sort((a, b) => b.paidDate.localeCompare(a.paidDate));
      const openInst = clInst.filter(i => activeLoans.some(l => l.id === i.loanId) && i.paidAmount < i.totalAmount).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

      return {
        ...c, totalEmprestado, totalPago, totalAberto, pendentes, atrasadas, status,
        activeCount: activeLoans.length, totalLoans: cls.length,
        ultimoPagamento: paidInst[0]?.paidDate || null,
        proximoVencimento: openInst[0]?.dueDate || null,
      };
    });
  }, [clients, loans, installments]);

  const filtered = useMemo(() => {
    let result = clientsData;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.cpf?.includes(q) || c.id.includes(q));
    }
    if (filter === 'active') result = result.filter(c => c.activeCount > 0);
    else if (filter === 'no_loans') result = result.filter(c => c.activeCount === 0);
    else if (filter === 'overdue') result = result.filter(c => c.status === 'atrasado' || c.status === 'critico');
    else if (filter === 'settled') result = result.filter(c => c.status === 'quitado');
    else if (filter === 'near_due') result = result.filter(c => c.status === 'proximo_vencimento' || c.status === 'vence_hoje');
    else if (filter === 'high_value') result = [...result].sort((a, b) => b.totalAberto - a.totalAberto);
    return result;
  }, [clientsData, search, filter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addClient(form);
    setForm({ name: '', cpf: '', phone: '', whatsapp: '', email: '', address: '', city: '', state: '', birthDate: '', notes: '' });
    setShowModal(false);
  };

  return (
    <>
      <div className="page-header">
        <div><h1>Carteira de Clientes</h1><p>{clients.length} clientes cadastrados</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Novo Cliente</button>
      </div>

      <div className="filters-bar">
        <input className="search-input" placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} />
        {['all', 'active', 'overdue', 'near_due', 'settled', 'no_loans', 'high_value'].map(f => (
          <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {{ all: 'Todos', active: 'Ativos', overdue: 'Em Atraso', near_due: 'Vencimento Próx.', settled: 'Quitados', no_loans: 'Sem Empréstimos', high_value: 'Maior Valor' }[f]}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button className={`btn btn-icon btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('table')}><List size={16} /></button>
          <button className={`btn btn-icon btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('cards')}><Grid size={16} /></button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th><th>Status</th><th>Telefone</th><th>Empréstimos</th><th>Total Emprestado</th><th>Total Pago</th><th>Em Aberto</th><th>Pendentes</th><th>Atrasadas</th><th>Próx. Vencimento</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="clickable" onClick={() => navigate(`/clientes/${c.id}`)}>
                    <td><div className="flex gap-8" style={{ alignItems: 'center' }}><div className="avatar">{c.name[0]}</div><div><strong>{c.name}</strong><br /><span className="text-muted" style={{ fontSize: '0.75rem' }}>{formatCPF(c.cpf)}</span></div></div></td>
                    <td><span className="badge-status" style={{ background: getClientStatusColor(c.status) + '20', color: getClientStatusColor(c.status) }}>{getClientStatusLabel(c.status)}</span></td>
                    <td>{formatPhone(c.phone)}</td>
                    <td>{c.activeCount}/{c.totalLoans}</td>
                    <td>{formatCurrency(c.totalEmprestado)}</td>
                    <td className="text-green">{formatCurrency(c.totalPago)}</td>
                    <td className="text-red">{formatCurrency(c.totalAberto)}</td>
                    <td>{c.pendentes}</td>
                    <td><span className={c.atrasadas > 0 ? 'text-red font-bold' : ''}>{c.atrasadas}</span></td>
                    <td>{c.proximoVencimento ? formatDate(c.proximoVencimento) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="clients-grid">
          {filtered.map(c => (
            <div key={c.id} className="client-card" onClick={() => navigate(`/clientes/${c.id}`)}>
              <div className="client-card-top">
                <div className="avatar">{c.name[0]}</div>
                <div className="client-card-info">
                  <h4>{c.name}</h4>
                  <p>{formatPhone(c.phone)}</p>
                </div>
                <span className="badge-status" style={{ background: getClientStatusColor(c.status) + '20', color: getClientStatusColor(c.status), marginLeft: 'auto' }}>{getClientStatusLabel(c.status)}</span>
              </div>
              <div className="client-card-stats">
                <div className="client-card-stat"><span>Em Aberto</span><strong className="text-red">{formatCurrency(c.totalAberto)}</strong></div>
                <div className="client-card-stat"><span>Total Pago</span><strong className="text-green">{formatCurrency(c.totalPago)}</strong></div>
                <div className="client-card-stat"><span>Pendentes</span><strong>{c.pendentes}</strong></div>
                <div className="client-card-stat"><span>Atrasadas</span><strong className={c.atrasadas > 0 ? 'text-red' : ''}>{c.atrasadas}</strong></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Novo Cliente</h2><button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}><X size={16} /></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Nome Completo *</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">CPF/Documento</label><input className="form-input" value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} /></div>
                </div>
                <div className="form-row-3">
                  <div className="form-group"><label className="form-label">Telefone</label><input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">WhatsApp</label><input className="form-input" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">E-mail</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Data de Nascimento</label><input className="form-input" type="date" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Estado</label><input className="form-input" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Endereço</label><input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Cidade</label><input className="form-input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
                </div>
                <div className="form-group"><label className="form-label">Observações</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Cadastrar</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
