import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, formatPhone, formatCPF, getInstallmentStatus, getStatusLabel, getClientStatus, getClientStatusLabel, getClientStatusColor } from '../utils/formatters';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Edit, Plus, FileText, Upload, Image as ImageIcon, X, Eye } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../utils/supabase';

// Helper: convert snake_case DB row to camelCase JS object
const toCamel = (row) => {
  if (!row) return row;
  const map = {
    birth_date: 'birthDate', document_image: 'documentImage', created_at: 'createdAt',
    user_id: 'userId',
  };
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[map[k] || k] = v;
  }
  return out;
};

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients = [], loans = [], installments = [], payments = [], updateClient, addLoan, currentUser, loading: contextLoading } = useApp() || {};
  
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [showDebitModal, setShowDebitModal] = useState(false);
  const [showDocZoom, setShowDocZoom] = useState(false);
  const [directClient, setDirectClient] = useState(null);
  const [directLoading, setDirectLoading] = useState(false);

  // Match in context using case-insensitive ID
  const contextClient = clients.find(c => String(c.id || '').toLowerCase() === String(id || '').toLowerCase());

  // Direct fetch fallback if deep linking or context reloading
  useEffect(() => {
    let isMounted = true;

    if (contextClient || !id || !currentUser?.id) {
      setDirectLoading(false);
      return;
    }

    setDirectLoading(true);

    async function fetchSingleClient() {
      try {
        const { data, error } = await supabase.from('clients').select('*').eq('id', id).eq('user_id', currentUser.id).maybeSingle();
        if (isMounted && data && !error) {
          setDirectClient(toCamel(data));
        }
      } catch (err) {
        console.error('Error fetching single client directly:', err);
      } finally {
        if (isMounted) setDirectLoading(false);
      }
    }

    fetchSingleClient();
    return () => { isMounted = false; };
  }, [id, contextClient, currentUser?.id]);

  const client = contextClient || directClient;
  const hasData = Boolean(client);
  const isLoading = !hasData && (contextLoading || directLoading);

  // New Debit Form State
  const [debitForm, setDebitForm] = useState({
    title: '',
    principalAmount: '',
    interestType: 'percentage',
    interestRate: '30',
    fixedInterestAmount: '',
    calculationMode: 'interest_only_final_payoff',
    installmentCount: '3',
    periodicity: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    firstDueDate: '',
    notes: '',
  });

  const [clientForm, setClientForm] = useState({});

  useEffect(() => {
    if (client) {
      setClientForm(client);
    }
  }, [client]);

  // Loading state render
  if (isLoading) {
    return (
      <div className="empty-state" style={{ minHeight: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '2.5rem', animation: 'pulse 1.5s infinite', marginBottom: '12px' }}>⏳</div>
        <h3>Carregando dados do cliente...</h3>
        <p className="text-muted">Aguarde enquanto os registros são atualizados.</p>
      </div>
    );
  }

  // Not found render
  if (!client) {
    return (
      <div className="empty-state" style={{ minHeight: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>👤</div>
        <h3>Cliente não encontrado</h3>
        <p className="text-muted" style={{ marginBottom: '16px' }}>O cliente solicitado não existe ou foi removido.</p>
        <button className="btn btn-primary" onClick={() => navigate('/clientes')}>Voltar para Lista de Clientes</button>
      </div>
    );
  }

  const clientId = client.id;
  const clientLoans = (loans || []).filter(l => String(l.clientId || '').toLowerCase() === String(clientId || '').toLowerCase());
  const activeLoans = clientLoans.filter(l => l.status === 'active');
  const clientInst = (installments || []).filter(i => String(i.clientId || '').toLowerCase() === String(clientId || '').toLowerCase());
  const clientPayments = (payments || []).filter(p => String(p.clientId || '').toLowerCase() === String(clientId || '').toLowerCase());

  const totalEmprestado = clientLoans.reduce((s, l) => s + (l.principalAmount || 0), 0);
  const totalPago = clientInst.reduce((s, i) => s + (i.paidAmount || 0), 0);
  const totalAberto = activeLoans.reduce((s, l) => s + (l.totalAmount || 0), 0) - clientInst.filter(i => activeLoans.some(l => l.id === i.loanId)).reduce((s, i) => s + (i.paidAmount || 0), 0);
  const totalJuros = clientLoans.reduce((s, l) => s + (l.totalInterest || 0), 0);
  const pendentes = clientInst.filter(i => activeLoans.some(l => l.id === i.loanId) && (i.paidAmount || 0) < (i.totalAmount || 0)).length;
  const atrasadas = clientInst.filter(i => activeLoans.some(l => l.id === i.loanId) && getInstallmentStatus(i) === 'overdue').length;
  const status = getClientStatus(client, loans, installments);

  const handleSaveClient = async () => {
    if (updateClient) {
      await updateClient(clientId, clientForm);
    }
    setEditing(false);
  };

  // Handle Document Upload
  const handleDocUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const updated = { ...clientForm, documentImage: reader.result };
        setClientForm(updated);
        if (updateClient) {
          await updateClient(clientId, { documentImage: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Debit Simulation
  const debitPreview = useMemo(() => {
    const p = parseFloat(debitForm.principalAmount) || 0;
    const rate = parseFloat(debitForm.interestRate) || 0;
    const count = parseInt(debitForm.installmentCount) || 1;
    let totalInterest = 0;

    if (debitForm.interestType === 'percentage') {
      totalInterest = p * (rate / 100) * count;
    } else {
      totalInterest = (parseFloat(debitForm.fixedInterestAmount) || 0) * count;
    }

    const isInterestOnly = debitForm.calculationMode === 'interest_only_final_payoff';
    const periodicInterest = totalInterest / count;
    const totalAmount = p + totalInterest;
    const finalPayoff = isInterestOnly ? (periodicInterest + p) : (totalAmount / count);

    return {
      principalAmount: p,
      totalInterest,
      totalAmount,
      periodicInterest,
      finalPayoff,
      count,
      isInterestOnly,
    };
  }, [debitForm]);

  const handleCreateDebit = async (e) => {
    e.preventDefault();
    if (!debitForm.principalAmount) return;

    const firstDue = debitForm.firstDueDate || (() => {
      const d = new Date(debitForm.startDate);
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().split('T')[0];
    })();

    if (addLoan) {
      await addLoan({
        clientId: clientId,
        title: debitForm.title || `Débito R$ ${parseFloat(debitForm.principalAmount).toLocaleString('pt-BR')}`,
        principalAmount: debitPreview.principalAmount,
        interestType: debitForm.interestType,
        interestRate: parseFloat(debitForm.interestRate) || 0,
        fixedInterestAmount: parseFloat(debitForm.fixedInterestAmount) || 0,
        calculationMode: debitForm.calculationMode,
        totalInterest: debitPreview.totalInterest,
        totalAmount: debitPreview.totalAmount,
        installmentCount: debitPreview.count,
        periodicity: debitForm.periodicity,
        startDate: debitForm.startDate,
        firstDueDate: firstDue,
        notes: debitForm.notes,
      });
    }

    setShowDebitModal(false);
    setDebitForm({
      title: '',
      principalAmount: '',
      interestType: 'percentage',
      interestRate: '30',
      fixedInterestAmount: '',
      calculationMode: 'interest_only_final_payoff',
      installmentCount: '3',
      periodicity: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      firstDueDate: '',
      notes: '',
    });
  };

  return (
    <>
      <div className="flex-between mb-16">
        <button className="btn btn-secondary" onClick={() => navigate('/clientes')}><ArrowLeft size={16} /> Voltar</button>
        <button className="btn btn-primary" onClick={() => setShowDebitModal(true)}>
          <Plus size={16} /> Abrir Débito
        </button>
      </div>

      <div className="profile-header">
        <div className="avatar avatar-lg">{(client.name || 'C')[0].toUpperCase()}</div>
        <div className="profile-info">
          <div className="flex-between">
            <div>
              <h2>{client.name}</h2>
              <span className="badge-status" style={{ background: getClientStatusColor(status) + '20', color: getClientStatusColor(status) }}>{getClientStatusLabel(status)}</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(!editing)}><Edit size={14} /> Editar</button>
          </div>

          {editing ? (
            <div className="mt-16">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Nome Completo</label><input className="form-input" value={clientForm.name || ''} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">CPF / Documento</label><input className="form-input" value={clientForm.cpf || ''} onChange={e => setClientForm({ ...clientForm, cpf: e.target.value })} /></div>
              </div>
              <div className="form-row-3">
                <div className="form-group"><label className="form-label">Telefone</label><input className="form-input" value={clientForm.phone || ''} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">WhatsApp</label><input className="form-input" value={clientForm.whatsapp || ''} onChange={e => setClientForm({ ...clientForm, whatsapp: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">E-mail</label><input className="form-input" value={clientForm.email || ''} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Endereço</label><input className="form-input" value={clientForm.address || ''} onChange={e => setClientForm({ ...clientForm, address: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Cidade</label><input className="form-input" value={clientForm.city || ''} onChange={e => setClientForm({ ...clientForm, city: e.target.value })} /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Anexar Documento (Foto/RG/CNH)</label>
                <input type="file" accept="image/*" className="form-input" onChange={handleDocUpload} />
              </div>
              <div className="form-group"><label className="form-label">Observações Internas</label><textarea className="form-textarea" value={clientForm.notes || ''} onChange={e => setClientForm({ ...clientForm, notes: e.target.value })} /></div>
              <div className="flex gap-8"><button className="btn btn-primary" onClick={handleSaveClient}>Salvar</button><button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancelar</button></div>
            </div>
          ) : (
            <div className="profile-info-grid">
              <div className="profile-info-item"><label>CPF</label><span>{formatCPF(client.cpf)}</span></div>
              <div className="profile-info-item"><label>Telefone</label><span>{formatPhone(client.phone)}</span></div>
              <div className="profile-info-item"><label>WhatsApp</label><span>{formatPhone(client.whatsapp)}</span></div>
              <div className="profile-info-item"><label>E-mail</label><span>{client.email || '-'}</span></div>
              <div className="profile-info-item"><label>Endereço</label><span>{client.address || '-'}</span></div>
              <div className="profile-info-item"><label>Cidade/Estado</label><span>{client.city || '-'} {client.state ? `- ${client.state}` : ''}</span></div>
              <div className="profile-info-item"><label>Nascimento</label><span>{client.birthDate ? formatDate(client.birthDate) : '-'}</span></div>
              <div className="profile-info-item"><label>Cadastro</label><span>{formatDate(client.createdAt)}</span></div>
            </div>
          )}
        </div>
      </div>

      {/* Document Image Section */}
      {client.documentImage && (
        <div className="stat-card mb-24" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex-between">
            <div className="flex align-center gap-8">
              <ImageIcon size={18} color="var(--accent)" />
              <strong style={{ fontSize: '0.95rem' }}>Documento Anexado do Cliente</strong>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowDocZoom(true)}><Eye size={14} /> Visualizar Documento</button>
          </div>
          <div className="mt-12" style={{ cursor: 'pointer' }} onClick={() => setShowDocZoom(true)}>
            <img src={client.documentImage} alt="Documento do Cliente" style={{ maxHeight: 120, borderRadius: 8, border: '1px solid var(--border)', objectFit: 'cover' }} />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <div className="stat-card blue"><div className="stat-card-label">Total Emprestado</div><div className="stat-card-value" style={{ fontSize: '1.2rem' }}>{formatCurrency(totalEmprestado)}</div></div>
        <div className="stat-card accent"><div className="stat-card-label">Débitos Ativos</div><div className="stat-card-value" style={{ fontSize: '1.2rem' }}>{activeLoans.length}</div></div>
        <div className="stat-card green"><div className="stat-card-label">Total Pago</div><div className="stat-card-value text-green" style={{ fontSize: '1.2rem' }}>{formatCurrency(totalPago)}</div></div>
        <div className="stat-card red"><div className="stat-card-label">Em Aberto</div><div className="stat-card-value text-red" style={{ fontSize: '1.2rem' }}>{formatCurrency(totalAberto)}</div></div>
        <div className="stat-card purple"><div className="stat-card-label">Total Juros</div><div className="stat-card-value" style={{ fontSize: '1.2rem' }}>{formatCurrency(totalJuros)}</div></div>
        <div className="stat-card yellow"><div className="stat-card-label">Parcelas Pendentes</div><div className="stat-card-value" style={{ fontSize: '1.2rem' }}>{pendentes}</div></div>
        <div className="stat-card red"><div className="stat-card-label">Parcelas Atrasadas</div><div className="stat-card-value" style={{ fontSize: '1.2rem' }}>{atrasadas}</div></div>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Débitos / Empréstimos</button>
        <button className={`tab ${tab === 'installments' ? 'active' : ''}`} onClick={() => setTab('installments')}>Parcelas</button>
        <button className={`tab ${tab === 'payments' ? 'active' : ''}`} onClick={() => setTab('payments')}>Histórico de Pagamentos</button>
      </div>

      {tab === 'overview' && (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Título / Código</th><th>Valor Emprestado</th><th>Juros</th><th>Total</th><th>Modalidade Juros</th><th>Parcelas</th><th>Status</th><th>Data Início</th><th>Ação</th></tr></thead>
              <tbody>
                {clientLoans.map(l => (
                  <tr key={l.id} className="clickable" onClick={() => navigate(`/emprestimos/${l.id}`)}>
                    <td>
                      <div><strong>{l.title || `Débito #${String(l.id || '').slice(-6).toUpperCase()}`}</strong></div>
                      <small className="text-muted">#{String(l.id || '').slice(-6).toUpperCase()}</small>
                    </td>
                    <td>{formatCurrency(l.principalAmount)}</td>
                    <td>{formatCurrency(l.totalInterest)} ({l.interestRate}%)</td>
                    <td>{formatCurrency(l.totalAmount)}</td>
                    <td>
                      <span className="badge-status gray">
                        {l.calculationMode === 'interest_only_final_payoff' ? 'Juros Periódicos' : 'Juros + Capital'}
                      </span>
                    </td>
                    <td>{l.installmentCount}x</td>
                    <td><span className={`badge-status ${l.status === 'active' ? 'blue' : 'green'}`}>{l.status === 'active' ? 'Ativo' : 'Quitado'}</span></td>
                    <td>{formatDate(l.startDate)}</td>
                    <td><button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/emprestimos/${l.id}`); }}><Eye size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'installments' && (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Vencimento</th><th>Capital</th><th>Juros</th><th>Total Parcela</th><th>Pago</th><th>Saldo</th><th>Status</th></tr></thead>
              <tbody>
                {clientInst.filter(i => activeLoans.some(l => l.id === i.loanId)).map(i => {
                  const st = getInstallmentStatus(i);
                  const statusColors = { paid: 'green', open: 'blue', near_due: 'yellow', due_today: 'orange', overdue: 'red', partial: 'gray' };
                  return (
                    <tr key={i.id}>
                      <td>{i.number}</td>
                      <td>{formatDate(i.dueDate)}</td>
                      <td>{formatCurrency(i.principalAmount)}</td>
                      <td>{formatCurrency(i.interestAmount)}</td>
                      <td>{formatCurrency(i.totalAmount)}</td>
                      <td className="text-green">{formatCurrency(i.paidAmount)}</td>
                      <td className="text-red">{formatCurrency(i.totalAmount - (i.paidAmount || 0))}</td>
                      <td><span className={`badge-status ${statusColors[st] || 'gray'}`}>{getStatusLabel(st)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Data</th><th>Valor Pago</th><th>Forma</th><th>Observações</th></tr></thead>
              <tbody>
                {clientPayments.map(p => (
                  <tr key={p.id}>
                    <td>{formatDate(p.date)}</td>
                    <td className="text-green">{formatCurrency(p.amount)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.method}</td>
                    <td>{p.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Abrir Débito */}
      {showDebitModal && (
        <div className="modal-overlay" onClick={() => setShowDebitModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FileText size={20} color="var(--accent)" /> Abrir Débito para {client.name}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowDebitModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateDebit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Título do Débito *</label>
                  <input className="form-input" placeholder="Ex: Empréstimo Reforma, Compra de Moto, Débito Comercial" required value={debitForm.title} onChange={e => setDebitForm({ ...debitForm, title: e.target.value })} />
                </div>

                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Valor Emprestado (Capital) *</label>
                    <input className="form-input" type="number" step="0.01" placeholder="Ex: 10000" required value={debitForm.principalAmount} onChange={e => setDebitForm({ ...debitForm, principalAmount: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo de Juros</label>
                    <select className="form-select" value={debitForm.interestType} onChange={e => setDebitForm({ ...debitForm, interestType: e.target.value })}>
                      <option value="percentage">Porcentagem por Período (%)</option>
                      <option value="fixed">Valor Fixo por Período (R$)</option>
                    </select>
                  </div>
                  {debitForm.interestType === 'percentage' ? (
                    <div className="form-group">
                      <label className="form-label">Taxa de Juros (%) por Período</label>
                      <input className="form-input" type="number" step="0.1" value={debitForm.interestRate} onChange={e => setDebitForm({ ...debitForm, interestRate: e.target.value })} />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">Valor do Juros (R$)</label>
                      <input className="form-input" type="number" step="0.01" value={debitForm.fixedInterestAmount} onChange={e => setDebitForm({ ...debitForm, fixedInterestAmount: e.target.value })} />
                    </div>
                  )}
                </div>

                <div className="form-group mb-16">
                  <label className="form-label">Modalidade de Cobrança / Juros *</label>
                  <select className="form-select" value={debitForm.calculationMode} onChange={e => setDebitForm({ ...debitForm, calculationMode: e.target.value })}>
                    <option value="interest_only_final_payoff">
                      📌 Juros Periódicos + Quitação Final do Capital (Ex: R$ 3.000/mês de juros + R$ 10.000 no final)
                    </option>
                    <option value="amortized">
                      📊 Juros + Capital Amortizado em Cada Parcela (Amortização tradicional parcelada)
                    </option>
                  </select>
                  <small className="text-muted" style={{ display: 'block', marginTop: 4 }}>
                    {debitForm.calculationMode === 'interest_only_final_payoff'
                      ? '⚠️ O pagamento periódico dos juros NÃO reduz o saldo do capital principal. O capital permanece em aberto até a quitação final.'
                      : 'ℹ️ O valor principal e os juros são divididos igualmente em cada parcela.'}
                  </small>
                </div>

                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Nº de Parcelas / Períodos</label>
                    <input className="form-input" type="number" min="1" value={debitForm.installmentCount} onChange={e => setDebitForm({ ...debitForm, installmentCount: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Periodicidade</label>
                    <select className="form-select" value={debitForm.periodicity} onChange={e => setDebitForm({ ...debitForm, periodicity: e.target.value })}>
                      <option value="monthly">Mensal</option>
                      <option value="weekly">Semanal</option>
                      <option value="biweekly">Quinzenal</option>
                      <option value="daily">Diário</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data de Início</label>
                    <input className="form-input" type="date" value={debitForm.startDate} onChange={e => setDebitForm({ ...debitForm, startDate: e.target.value })} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Primeiro Vencimento</label>
                    <input className="form-input" type="date" value={debitForm.firstDueDate} onChange={e => setDebitForm({ ...debitForm, firstDueDate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Observações</label>
                    <input className="form-input" placeholder="Detalhes do acordo, garantias, etc." value={debitForm.notes} onChange={e => setDebitForm({ ...debitForm, notes: e.target.value })} />
                  </div>
                </div>

                {/* Simulation box */}
                {debitPreview.principalAmount > 0 && (
                  <div className="loan-preview">
                    <h4>📊 Cronograma e Simulação do Débito</h4>
                    <div className="loan-preview-grid">
                      <div className="loan-preview-item"><label>Capital Principal</label><span>{formatCurrency(debitPreview.principalAmount)}</span></div>
                      <div className="loan-preview-item"><label>Juros por Período</label><span className="text-yellow">{formatCurrency(debitPreview.periodicInterest)}</span></div>
                      <div className="loan-preview-item"><label>Total de Juros ({debitPreview.count}x)</label><span className="text-yellow">{formatCurrency(debitPreview.totalInterest)}</span></div>
                      {debitPreview.isInterestOnly ? (
                        <>
                          <div className="loan-preview-item"><label>Parcelas 1 a {debitPreview.count - 1}</label><span className="text-blue">{formatCurrency(debitPreview.periodicInterest)} (Só juros)</span></div>
                          <div className="loan-preview-item"><label>Última Parcela ({debitPreview.count}ª)</label><span className="text-green">{formatCurrency(debitPreview.finalPayoff)} (Juros + Capital)</span></div>
                        </>
                      ) : (
                        <div className="loan-preview-item"><label>Valor de Cada Parcela</label><span>{formatCurrency(debitPreview.totalAmount / debitPreview.count)}</span></div>
                      )}
                      <div className="loan-preview-item"><label>Total a Receber</label><span className="text-green">{formatCurrency(debitPreview.totalAmount)}</span></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDebitModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Confirmar e Abrir Débito</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Zoom Modal */}
      {showDocZoom && client.documentImage && (
        <div className="modal-overlay" onClick={() => setShowDocZoom(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Documento do Cliente - {client.name}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowDocZoom(false)}><X size={16} /></button>
            </div>
            <div className="modal-body text-center">
              <img src={client.documentImage} alt="Documento Ampliado" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8, objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
