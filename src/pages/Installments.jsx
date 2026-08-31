import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getInstallmentStatus, getStatusLabel, getDaysUntilDue } from '../utils/formatters';

export default function Installments() {
  const { installments, loans, clients } = useApp();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const instData = useMemo(() => {
    return installments.map(i => {
      const loan = loans.find(l => l.id === i.loanId);
      const client = clients.find(c => c.id === i.clientId);
      const status = getInstallmentStatus(i);
      const days = getDaysUntilDue(i.dueDate);
      return { ...i, clientName: client?.name || '-', loanStatus: loan?.status, computedStatus: status, days };
    }).filter(i => i.loanStatus === 'active');
  }, [installments, loans, clients]);

  const filtered = useMemo(() => {
    let r = instData;
    if (search) { const q = search.toLowerCase(); r = r.filter(i => i.clientName.toLowerCase().includes(q)); }
    if (filter === 'open') r = r.filter(i => i.computedStatus === 'open');
    else if (filter === 'paid') r = r.filter(i => i.computedStatus === 'paid');
    else if (filter === 'overdue') r = r.filter(i => i.computedStatus === 'overdue');
    else if (filter === 'near_due') r = r.filter(i => i.computedStatus === 'near_due' || i.computedStatus === 'due_today');
    else if (filter === 'partial') r = r.filter(i => i.computedStatus === 'partial');
    return r.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [instData, filter, search]);

  const statusColors = { paid: 'green', open: 'blue', near_due: 'yellow', due_today: 'orange', overdue: 'red', partial: 'gray', renegotiated: 'gray' };
  const statusEmojis = { paid: '🟢', open: '🔵', near_due: '🟡', due_today: '🟠', overdue: '🔴', partial: '⚫', renegotiated: '⚪' };

  return (
    <>
      <div className="page-header"><div><h1>Controle de Parcelas</h1><p>{instData.length} parcelas em empréstimos ativos</p></div></div>

      <div className="filters-bar">
        <input className="search-input" placeholder="Pesquisar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        {['all', 'open', 'near_due', 'overdue', 'partial', 'paid'].map(f => (
          <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {{ all: 'Todas', open: '🔵 Em Aberto', near_due: '🟡 Próximas', overdue: '🔴 Atrasadas', partial: '⚫ Parciais', paid: '🟢 Pagas' }[f]}
          </button>
        ))}
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Cliente</th><th>Vencimento</th><th>Valor</th><th>Juros</th><th>Total</th><th>Pago</th><th>Saldo</th><th>Status</th><th>Dias</th></tr></thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id}>
                  <td>{i.number}</td>
                  <td><strong>{i.clientName}</strong></td>
                  <td>{formatDate(i.dueDate)}</td>
                  <td>{formatCurrency(i.principalAmount)}</td>
                  <td>{formatCurrency(i.interestAmount)}</td>
                  <td>{formatCurrency(i.totalAmount)}</td>
                  <td className="text-green">{formatCurrency(i.paidAmount)}</td>
                  <td className="text-red">{formatCurrency(i.totalAmount - i.paidAmount)}</td>
                  <td><span className={`badge-status ${statusColors[i.computedStatus]}`}>{statusEmojis[i.computedStatus]} {getStatusLabel(i.computedStatus)}</span></td>
                  <td>{i.computedStatus === 'paid' ? '-' : i.computedStatus === 'overdue' ? <span className="text-red font-bold">{Math.abs(i.days)}d</span> : `${i.days}d`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
