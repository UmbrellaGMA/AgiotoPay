import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Plus, X, Eye, FileText } from 'lucide-react';

export default function Loans() {
  const { clients, loans, installments, addLoan } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showModal, setShowModal] = useState(searchParams.get('new') === '1');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  
  const [form, setForm] = useState({
    clientId: '',
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

  const loanData = useMemo(() => loans.map(l => {
    const client = clients.find(c => c.id === l.clientId);
    const insts = installments.filter(i => i.loanId === l.id);
    const paid = insts.reduce((s, i) => s + i.paidAmount, 0);
    const remaining = l.totalAmount - paid;
    return {
      ...l,
      clientName: client?.name || 'Desconhecido',
      paid,
      remaining,
      progress: l.totalAmount > 0 ? (paid / l.totalAmount * 100) : 0,
    };
  }), [loans, clients, installments]);

  const filtered = useMemo(() => {
    let r = loanData;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(l => l.clientName.toLowerCase().includes(q) || (l.title && l.title.toLowerCase().includes(q)) || l.id.includes(q));
    }
    if (filter === 'active') r = r.filter(l => l.status === 'active');
    else if (filter === 'completed') r = r.filter(l => l.status === 'completed');
    return r;
  }, [loanData, search, filter]);

  // Preview calculation
  const preview = useMemo(() => {
    const p = parseFloat(form.principalAmount) || 0;
    const rate = parseFloat(form.interestRate) || 0;
    const count = parseInt(form.installmentCount) || 1;
    let totalInterest = 0;

    if (form.interestType === 'percentage') {
      totalInterest = p * (rate / 100) * count;
    } else {
      totalInterest = (parseFloat(form.fixedInterestAmount) || 0) * count;
    }

    const isInterestOnly = form.calculationMode === 'interest_only_final_payoff';
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
  }, [form]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.clientId || !form.principalAmount) return;

    const firstDue = form.firstDueDate || (() => {
      const d = new Date(form.startDate);
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().split('T')[0];
    })();

    addLoan({
      clientId: form.clientId,
      title: form.title || `Empréstimo R$ ${parseFloat(form.principalAmount).toLocaleString('pt-BR')}`,
      principalAmount: preview.principalAmount,
      interestType: form.interestType,
      interestRate: parseFloat(form.interestRate) || 0,
      fixedInterestAmount: parseFloat(form.fixedInterestAmount) || 0,
      calculationMode: form.calculationMode,
      totalInterest: preview.totalInterest,
      totalAmount: preview.totalAmount,
      installmentCount: preview.count,
      periodicity: form.periodicity,
      startDate: form.startDate,
      firstDueDate: firstDue,
      notes: form.notes,
    });

    setShowModal(false);
    setForm({
      clientId: '',
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
      <div className="page-header">
        <div>
          <h1>Empréstimos / Débitos</h1>
          <p>{loans.length} débitos registrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Novo Débito / Empréstimo
        </button>
      </div>

      <div className="filters-bar">
        <input className="search-input" placeholder="Pesquisar por cliente, título ou código..." value={search} onChange={e => setSearch(e.target.value)} />
        {['all', 'active', 'completed'].map(f => (
          <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {{ all: 'Todos', active: 'Ativos', completed: 'Quitados' }[f]}
          </button>
        ))}
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Título / Código</th><th>Cliente</th><th>Valor Principal</th><th>Juros Total</th><th>Total Débito</th><th>Modalidade</th><th>Parcelas</th><th>Pago</th><th>Saldo</th><th>Status</th><th>Ação</th></tr></thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} className="clickable" onClick={() => navigate(`/emprestimos/${l.id}`)}>
                  <td>
                    <div><strong>{l.title || `Débito #${l.id.slice(-6).toUpperCase()}`}</strong></div>
                    <small className="text-muted">#{l.id.slice(-6).toUpperCase()}</small>
                  </td>
                  <td><strong>{l.clientName}</strong></td>
                  <td>{formatCurrency(l.principalAmount)}</td>
                  <td>{formatCurrency(l.totalInterest)} ({l.interestRate}%)</td>
                  <td>{formatCurrency(l.totalAmount)}</td>
                  <td>
                    <span className="badge-status gray">
                      {l.calculationMode === 'interest_only_final_payoff' ? 'Juros Periódicos' : 'Juros + Capital'}
                    </span>
                  </td>
                  <td>{l.installmentCount}x</td>
                  <td className="text-green">{formatCurrency(l.paid)}</td>
                  <td className="text-red">{formatCurrency(l.remaining)}</td>
                  <td><span className={`badge-status ${l.status === 'active' ? 'blue' : 'green'}`}>{l.status === 'active' ? 'Ativo' : 'Quitado'}</span></td>
                  <td><button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/emprestimos/${l.id}`); }}><Eye size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FileText size={20} color="var(--accent)" /> Novo Débito / Empréstimo</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Cliente *</label>
                    <select className="form-select" required value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                      <option value="">Selecionar cliente</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Título do Débito *</label>
                    <input className="form-input" placeholder="Ex: Reforma da casa, Compra de veículo" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                  </div>
                </div>

                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Valor Emprestado (Capital) *</label>
                    <input className="form-input" type="number" step="0.01" required value={form.principalAmount} onChange={e => setForm({ ...form, principalAmount: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo de Juros</label>
                    <select className="form-select" value={form.interestType} onChange={e => setForm({ ...form, interestType: e.target.value })}>
                      <option value="percentage">Porcentagem (%)</option>
                      <option value="fixed">Valor Fixo (R$)</option>
                    </select>
                  </div>
                  {form.interestType === 'percentage' ? (
                    <div className="form-group">
                      <label className="form-label">Taxa (%) por Período</label>
                      <input className="form-input" type="number" step="0.1" value={form.interestRate} onChange={e => setForm({ ...form, interestRate: e.target.value })} />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">Juros Fixo (R$)</label>
                      <input className="form-input" type="number" step="0.01" value={form.fixedInterestAmount} onChange={e => setForm({ ...form, fixedInterestAmount: e.target.value })} />
                    </div>
                  )}
                </div>

                <div className="form-group mb-16">
                  <label className="form-label">Modalidade de Cobrança dos Juros *</label>
                  <select className="form-select" value={form.calculationMode} onChange={e => setForm({ ...form, calculationMode: e.target.value })}>
                    <option value="interest_only_final_payoff">
                      📌 Juros Periódicos + Quitação Final do Capital (Ex: R$ 3.000/mês de juros + R$ 10.000 no final)
                    </option>
                    <option value="amortized">
                      📊 Juros + Capital Amortizado em Cada Parcela (Tradicional parcelado)
                    </option>
                  </select>
                  <small className="text-muted" style={{ display: 'block', marginTop: 4 }}>
                    {form.calculationMode === 'interest_only_final_payoff'
                      ? '⚠️ O pagamento dos juros periódicos não reduz o saldo principal de R$ ' + (form.principalAmount || '10.000') + '. O saldo principal permanece em aberto até a quitação final.'
                      : 'ℹ️ O valor principal e os juros são divididos em parcelas iguais.'}
                  </small>
                </div>

                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Qtd. Parcelas / Períodos</label>
                    <input className="form-input" type="number" min="1" value={form.installmentCount} onChange={e => setForm({ ...form, installmentCount: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Periodicidade</label>
                    <select className="form-select" value={form.periodicity} onChange={e => setForm({ ...form, periodicity: e.target.value })}>
                      <option value="monthly">Mensal</option>
                      <option value="weekly">Semanal</option>
                      <option value="biweekly">Quinzenal</option>
                      <option value="daily">Diário</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data do Empréstimo</label>
                    <input className="form-input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Primeiro Vencimento</label>
                    <input className="form-input" type="date" value={form.firstDueDate} onChange={e => setForm({ ...form, firstDueDate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Observações</label>
                    <input className="form-input" placeholder="Observações e garantias..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>

                {preview.principalAmount > 0 && (
                  <div className="loan-preview">
                    <h4>📊 Simulação e Cronograma do Débito</h4>
                    <div className="loan-preview-grid">
                      <div className="loan-preview-item"><label>Capital Principal</label><span>{formatCurrency(preview.principalAmount)}</span></div>
                      <div className="loan-preview-item"><label>Juros por Período</label><span className="text-yellow">{formatCurrency(preview.periodicInterest)}</span></div>
                      <div className="loan-preview-item"><label>Total de Juros ({preview.count}x)</label><span className="text-yellow">{formatCurrency(preview.totalInterest)}</span></div>
                      {preview.isInterestOnly ? (
                        <>
                          <div className="loan-preview-item"><label>Parcelas 1 a {preview.count - 1}</label><span className="text-blue">{formatCurrency(preview.periodicInterest)} (Só juros)</span></div>
                          <div className="loan-preview-item"><label>Última Parcela ({preview.count}ª)</label><span className="text-green">{formatCurrency(preview.finalPayoff)} (Juros + Capital)</span></div>
                        </>
                      ) : (
                        <div className="loan-preview-item"><label>Valor da Parcela</label><span>{formatCurrency(preview.totalAmount / preview.count)}</span></div>
                      )}
                      <div className="loan-preview-item"><label>Total a Receber</label><span className="text-green">{formatCurrency(preview.totalAmount)}</span></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Confirmar Empréstimo / Débito</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
