import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getInstallmentStatus, getDaysUntilDue } from '../utils/formatters';
import { MapPin } from 'lucide-react';

export default function MoneyOnStreet() {
  const { loans, clients, installments, loading } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const data = useMemo(() => {
    const activeLoans = (loans || []).filter(l => l.status === 'active');
    return activeLoans.map(l => {
      const client = (clients || []).find(c => String(c.id || '').toLowerCase() === String(l.clientId || '').toLowerCase());
      const insts = (installments || []).filter(i => String(i.loanId || '').toLowerCase() === String(l.id || '').toLowerCase());
      const paid = insts.reduce((s, i) => s + (i.paidAmount || 0), 0);
      const saldo = (l.totalAmount || 0) - paid;
      const overdueInsts = insts.filter(i => getInstallmentStatus(i) === 'overdue');
      const pendingInsts = insts.filter(i => (i.paidAmount || 0) < (i.totalAmount || 0));
      const sortedPending = [...pendingInsts].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
      const nextDue = sortedPending[0];
      const overdueDaysList = overdueInsts.map(i => Math.abs(getDaysUntilDue(i.dueDate)));
      const maxOverdueDays = overdueDaysList.length > 0 ? Math.max(...overdueDaysList) : 0;

      return {
        ...l,
        clientName: client?.name || '-',
        clientId: l.clientId,
        paid,
        saldo,
        overdueCount: overdueInsts.length,
        maxOverdueDays,
        nextDueDate: nextDue?.dueDate || null,
        status: overdueInsts.length > 0 ? 'overdue' : (nextDue && getDaysUntilDue(nextDue.dueDate) <= 3) ? 'near_due' : 'ok',
      };
    });
  }, [loans, clients, installments]);

  const totalNaRua = data.reduce((s, d) => s + d.saldo, 0);

  const filtered = useMemo(() => {
    let r = data;
    if (filter === 'ok') r = r.filter(d => d.status === 'ok');
    else if (filter === 'overdue') r = r.filter(d => d.status === 'overdue');
    else if (filter === 'near_due') r = r.filter(d => d.status === 'near_due');
    else if (filter === 'high_value') r = [...r].sort((a, b) => b.saldo - a.saldo);
    return r;
  }, [data, filter]);

  if (loading && data.length === 0) {
    return (
      <div className="empty-state" style={{ minHeight: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '2.5rem', animation: 'pulse 1.5s infinite', marginBottom: '12px' }}>⏳</div>
        <h3>Carregando valores...</h3>
      </div>
    );
  }

  return (
    <>
      <div className="page-header"><div><h1><MapPin size={24} style={{ display: 'inline', verticalAlign: 'middle' }} /> Dinheiro na Rua</h1><p>Todos os valores atualmente emprestados</p></div></div>

      <div className="stat-card orange mb-16" style={{ textAlign: 'center', padding: 28 }}>
        <div className="stat-card-label" style={{ fontSize: '1rem' }}>TOTAL DE DINHEIRO NA RUA</div>
        <div className="stat-card-value" style={{ fontSize: '2.2rem', color: 'var(--orange)' }}>{formatCurrency(totalNaRua)}</div>
        <div className="stat-card-sub">{data.length} empréstimos ativos</div>
      </div>

      <div className="filters-bar">
        {['all', 'ok', 'overdue', 'near_due', 'high_value'].map(f => (
          <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {{ all: 'Todos', ok: 'Em Dia', overdue: 'Atrasados', near_due: 'Próx. Vencimento', high_value: 'Maior Valor' }[f]}
          </button>
        ))}
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cliente</th><th>Valor Original</th><th>Juros</th><th>Total</th><th>Pago</th><th>Saldo em Aberto</th><th>Próx. Vencimento</th><th>Status</th><th>Atraso</th></tr></thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="clickable" onClick={() => navigate(`/clientes/${d.clientId}`)}>
                  <td><strong>{d.clientName}</strong></td>
                  <td>{formatCurrency(d.principalAmount)}</td>
                  <td>{formatCurrency(d.totalInterest)}</td>
                  <td>{formatCurrency(d.totalAmount)}</td>
                  <td className="text-green">{formatCurrency(d.paid)}</td>
                  <td className="text-red font-bold">{formatCurrency(d.saldo)}</td>
                  <td>{d.nextDueDate ? formatDate(d.nextDueDate) : '-'}</td>
                  <td>
                    <span className={`badge-status ${d.status === 'overdue' ? 'red' : d.status === 'near_due' ? 'yellow' : 'green'}`}>
                      {d.status === 'overdue' ? 'Atrasado' : d.status === 'near_due' ? 'Próx. Venc.' : 'Em Dia'}
                    </span>
                  </td>
                  <td>{d.maxOverdueDays > 0 ? <span className="text-red font-bold">{d.maxOverdueDays}d</span> : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
