import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getInstallmentStatus } from '../utils/formatters';
import { Plus, X } from 'lucide-react';

export default function Payments() {
  const { clients, loans, installments, payments, registerPayment } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ clientId: '', loanId: '', installmentIds: [], amount: '', date: new Date().toISOString().split('T')[0], method: 'pix', notes: '' });

  const clientLoans = useMemo(() => {
    if (!form.clientId) return [];
    return loans.filter(l => l.clientId === form.clientId && l.status === 'active');
  }, [form.clientId, loans]);

  const loanInstallments = useMemo(() => {
    if (!form.loanId) return [];
    return installments.filter(i => i.loanId === form.loanId && i.paidAmount < i.totalAmount).sort((a, b) => a.number - b.number);
  }, [form.loanId, installments]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || !form.clientId || !form.loanId || form.installmentIds.length === 0) return;
    registerPayment({ clientId: form.clientId, loanId: form.loanId, installmentIds: form.installmentIds, amount: amt, date: form.date, method: form.method, notes: form.notes });
    setForm({ clientId: '', loanId: '', installmentIds: [], amount: '', date: new Date().toISOString().split('T')[0], method: 'pix', notes: '' });
    setShowModal(false);
  };

  const toggleInst = (id) => {
    setForm(prev => ({
      ...prev,
      installmentIds: prev.installmentIds.includes(id) ? prev.installmentIds.filter(i => i !== id) : [...prev.installmentIds, id],
    }));
  };

  const selectedTotal = useMemo(() => {
    return loanInstallments.filter(i => form.installmentIds.includes(i.id)).reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);
  }, [form.installmentIds, loanInstallments]);

  return (
    <>
      <div className="page-header">
        <div><h1>Pagamentos</h1><p>{payments.length} pagamentos registrados</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Registrar Pagamento</button>
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Cliente</th><th>Valor</th><th>Forma</th><th>Empréstimo</th><th>Observações</th></tr></thead>
            <tbody>
              {payments.sort((a, b) => b.date.localeCompare(a.date)).map(p => {
                const client = clients.find(c => c.id === p.clientId);
                return (
                  <tr key={p.id}>
                    <td>{formatDate(p.date)}</td>
                    <td><strong>{client?.name || '-'}</strong></td>
                    <td className="text-green font-bold">{formatCurrency(p.amount)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.method}</td>
                    <td style={{ fontFamily: 'monospace' }}>{p.loanId?.slice(-6).toUpperCase()}</td>
                    <td>{p.notes || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Registrar Pagamento</h2><button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}><X size={16} /></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Cliente *</label>
                    <select className="form-select" required value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value, loanId: '', installmentIds: [] })}>
                      <option value="">Selecionar</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Empréstimo *</label>
                    <select className="form-select" required value={form.loanId} onChange={e => setForm({ ...form, loanId: e.target.value, installmentIds: [] })}>
                      <option value="">Selecionar</option>
                      {clientLoans.map(l => <option key={l.id} value={l.id}>{l.id.slice(-6).toUpperCase()} - {formatCurrency(l.totalAmount)}</option>)}
                    </select>
                  </div>
                </div>

                {loanInstallments.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Parcelas *</label>
                    <div style={{ maxHeight: 200, overflowY: 'auto', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: 12, border: '1px solid var(--border)' }}>
                      {loanInstallments.map(i => {
                        const st = getInstallmentStatus(i);
                        return (
                          <label key={i.id} style={{ display: 'flex', gap: 8, padding: '6px 0', cursor: 'pointer', alignItems: 'center' }}>
                            <input type="checkbox" checked={form.installmentIds.includes(i.id)} onChange={() => toggleInst(i.id)} />
                            <span>Parcela {i.number} - {formatDate(i.dueDate)} - {formatCurrency(i.totalAmount - i.paidAmount)}</span>
                            <span className={`badge-status ${st === 'overdue' ? 'red' : st === 'due_today' ? 'orange' : 'blue'}`} style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>
                              {st === 'overdue' ? 'Atrasada' : st === 'due_today' ? 'Vence Hoje' : 'Aberta'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {selectedTotal > 0 && <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Saldo das parcelas selecionadas: <strong className="text-yellow">{formatCurrency(selectedTotal)}</strong></p>}
                  </div>
                )}

                <div className="form-row-3">
                  <div className="form-group"><label className="form-label">Valor Pago *</label><input className="form-input" type="number" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder={selectedTotal > 0 ? selectedTotal.toFixed(2) : ''} /></div>
                  <div className="form-group"><label className="form-label">Data</label><input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Forma de Pagamento</label>
                    <select className="form-select" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                      <option value="dinheiro">Dinheiro</option><option value="pix">PIX</option><option value="transferencia">Transferência</option><option value="cartao">Cartão</option><option value="outro">Outro</option>
                    </select>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Observações</label><input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button><button type="submit" className="btn btn-success">Confirmar Pagamento</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
