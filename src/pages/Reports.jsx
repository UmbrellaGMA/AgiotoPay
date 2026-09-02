import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getInstallmentStatus, getDaysUntilDue } from '../utils/formatters';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function Reports() {
  const { loans, installments, payments, clients } = useApp();
  const [period, setPeriod] = useState('all');
  const [reportType, setReportType] = useState('summary');

  const activeLoans = loans.filter(l => l.status === 'active');
  const completedLoans = loans.filter(l => l.status === 'completed');

  const filterByPeriod = (dateStr) => {
    if (period === 'all') return true;
    const d = new Date(dateStr);
    const now = new Date();
    if (period === 'today') return d.toISOString().split('T')[0] === now.toISOString().split('T')[0];
    if (period === '7d') return (now - d) / 86400000 <= 7;
    if (period === '30d') return (now - d) / 86400000 <= 30;
    if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'year') return d.getFullYear() === now.getFullYear();
    return true;
  };

  const filteredPayments = payments.filter(p => filterByPeriod(p.date));
  const filteredLoans = loans.filter(l => filterByPeriod(l.startDate));

  const totalEmprestado = filteredLoans.reduce((s, l) => s + l.principalAmount, 0);
  const totalRecebido = filteredPayments.reduce((s, p) => s + p.amount, 0);
  const totalJurosPrevistos = filteredLoans.filter(l => l.status === 'active').reduce((s, l) => s + l.totalInterest, 0);

  const overdueInsts = installments.filter(i => activeLoans.some(l => l.id === i.loanId) && getInstallmentStatus(i) === 'overdue');
  const totalOverdue = overdueInsts.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);

  // Client rankings
  const clientRanking = useMemo(() => {
    return clients.map(c => {
      const cls = loans.filter(l => l.clientId === c.id);
      const totalEmp = cls.reduce((s, l) => s + l.principalAmount, 0);
      const totalLucro = cls.reduce((s, l) => s + l.totalInterest, 0);
      const paidTotal = installments.filter(i => i.clientId === c.id).reduce((s, i) => s + i.paidAmount, 0);
      return { ...c, totalEmp, totalLucro, paidTotal };
    }).sort((a, b) => b.totalEmp - a.totalEmp);
  }, [clients, loans, installments]);

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a2235', borderColor: '#2a3a5c', borderWidth: 1, titleColor: '#f1f5f9', bodyColor: '#94a3b8' } },
    scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } } }
  };

  return (
    <>
      <div className="page-header"><div><h1>Relatórios Financeiros</h1><p>Análises detalhadas do seu negócio</p></div></div>

      <div className="filters-bar mb-16">
        {[['all', 'Tudo'], ['today', 'Hoje'], ['7d', '7 Dias'], ['30d', '30 Dias'], ['month', 'Este Mês'], ['year', 'Este Ano']].map(([k, v]) => (
          <button key={k} className={`filter-btn ${period === k ? 'active' : ''}`} onClick={() => setPeriod(k)}>{v}</button>
        ))}
      </div>

      <div className="tabs mb-16">
        {[['summary', 'Resumo'], ['clients', 'Ranking Clientes'], ['overdue', 'Inadimplência'], ['payments_list', 'Histórico Pagamentos']].map(([k, v]) => (
          <button key={k} className={`tab ${reportType === k ? 'active' : ''}`} onClick={() => setReportType(k)}>{v}</button>
        ))}
      </div>

      {reportType === 'summary' && (
        <>
          <div className="stats-grid">
            <div className="stat-card blue"><div className="stat-card-label">Total Emprestado</div><div className="stat-card-value" style={{ fontSize: '1.3rem' }}>{formatCurrency(totalEmprestado)}</div></div>
            <div className="stat-card green"><div className="stat-card-label">Total Recebido</div><div className="stat-card-value text-green" style={{ fontSize: '1.3rem' }}>{formatCurrency(totalRecebido)}</div></div>
            <div className="stat-card purple"><div className="stat-card-label">Juros Previstos</div><div className="stat-card-value" style={{ fontSize: '1.3rem' }}>{formatCurrency(totalJurosPrevistos)}</div></div>
            <div className="stat-card red"><div className="stat-card-label">Inadimplência</div><div className="stat-card-value text-red" style={{ fontSize: '1.3rem' }}>{formatCurrency(totalOverdue)}</div></div>
            <div className="stat-card accent"><div className="stat-card-label">Empréstimos Ativos</div><div className="stat-card-value" style={{ fontSize: '1.3rem' }}>{activeLoans.length}</div></div>
            <div className="stat-card green"><div className="stat-card-label">Empréstimos Quitados</div><div className="stat-card-value" style={{ fontSize: '1.3rem' }}>{completedLoans.length}</div></div>
          </div>

          <div className="chart-card mt-16">
            <h3>Recebimentos no Período</h3>
            <div className="chart-container">
              <Bar data={{
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'],
                datasets: [{ data: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'].map((_, i) => payments.filter(p => new Date(p.date).getMonth() === i).reduce((s, p) => s + p.amount, 0)), backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6 }]
              }} options={chartOpts} />
            </div>
          </div>
        </>
      )}

      {reportType === 'clients' && (
        <div className="table-card">
          <div className="table-card-header"><h3>Ranking de Clientes</h3></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Cliente</th><th>Total Emprestado</th><th>Lucro (Juros)</th><th>Total Pago</th></tr></thead>
              <tbody>
                {clientRanking.map((c, i) => (
                  <tr key={c.id}><td>{i + 1}</td><td><strong>{c.name}</strong></td><td>{formatCurrency(c.totalEmp)}</td><td className="text-green">{formatCurrency(c.totalLucro)}</td><td>{formatCurrency(c.paidTotal)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === 'overdue' && (
        <div className="table-card">
          <div className="table-card-header"><h3>Parcelas Atrasadas ({overdueInsts.length})</h3></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Cliente</th><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Saldo</th><th>Dias Atraso</th></tr></thead>
              <tbody>
                {overdueInsts.map(i => {
                  const client = clients.find(c => c.id === i.clientId);
                  return (
                    <tr key={i.id}><td><strong>{client?.name}</strong></td><td>{i.number}</td><td>{formatDate(i.dueDate)}</td><td>{formatCurrency(i.totalAmount)}</td><td className="text-red">{formatCurrency(i.totalAmount - i.paidAmount)}</td><td className="text-red font-bold">{Math.abs(getDaysUntilDue(i.dueDate))}d</td></tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === 'payments_list' && (
        <div className="table-card">
          <div className="table-card-header"><h3>Histórico de Pagamentos ({filteredPayments.length})</h3></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Data</th><th>Cliente</th><th>Valor</th><th>Forma</th></tr></thead>
              <tbody>
                {[...filteredPayments].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(p => {
                  const client = clients.find(c => c.id === p.clientId);
                  return (<tr key={p.id}><td>{formatDate(p.date)}</td><td>{client?.name}</td><td className="text-green font-bold">{formatCurrency(p.amount)}</td><td style={{ textTransform: 'capitalize' }}>{p.method}</td></tr>);
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
