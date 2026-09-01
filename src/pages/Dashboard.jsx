import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getInstallmentStatus } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Landmark, TrendingUp, TrendingDown,
  AlertTriangle, Clock, Users, CircleDollarSign,
  Target, Wallet, ArrowUpRight, ArrowDownRight, Plus
} from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);

export default function Dashboard() {
  const { stats, loans, installments, payments, activities, clients, theme } = useApp();
  const navigate = useNavigate();
  const [chartRange, setChartRange] = useState('1M');

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'];

  const chartTextColor = theme === 'dark' ? '#94a3b8' : '#8795a1';
  const chartGridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const chartTooltipBg = theme === 'dark' ? '#1c2232' : '#ffffff';
  const chartTooltipText = theme === 'dark' ? '#f1f5f9' : '#1f2937';

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: chartTooltipBg,
        borderColor: 'var(--border)',
        borderWidth: 1,
        titleColor: chartTooltipText,
        bodyColor: chartTooltipText,
        padding: 10,
        cornerRadius: 8,
      }
    },
    scales: {
      x: { grid: { color: chartGridColor }, ticks: { color: chartTextColor, font: { size: 11, family: 'Plus Jakarta Sans' } } },
      y: { grid: { color: chartGridColor }, ticks: { color: chartTextColor, font: { size: 11, family: 'Plus Jakarta Sans' } } }
    }
  };

  // Monthly lending evolution
  const lendingByMonth = months.map((_, i) => {
    const m = i + 1;
    return loans.filter(l => {
      const d = new Date(l.startDate);
      return d.getMonth() + 1 <= m && l.status === 'active';
    }).reduce((s, l) => s + l.principalAmount, 0);
  });

  // Monthly received
  const receivedByMonth = months.map((_, i) => {
    const m = i + 1;
    return payments.filter(p => {
      const d = new Date(p.date);
      return d.getMonth() + 1 === m && d.getFullYear() === 2026;
    }).reduce((s, p) => s + p.amount, 0);
  });

  // Monthly profit
  const profitByMonth = months.map((_, i) => {
    return Math.round(receivedByMonth[i] * 0.15);
  });

  const statusData = {
    labels: ['Ativos', 'Quitados', 'Atrasados'],
    datasets: [{
      data: [
        stats.totalEmprestimosAtivos,
        stats.totalEmprestimosQuitados,
        installments.filter(i => getInstallmentStatus(i) === 'overdue').length > 0 ? 1 : 0
      ],
      backgroundColor: ['#5B45D4', '#10b981', '#f43f5e'],
      borderWidth: 0,
    }]
  };

  const capitalVsJurosData = {
    labels: months,
    datasets: [
      { label: 'Capital', data: lendingByMonth, backgroundColor: '#5B45D4', borderRadius: 6 },
      { label: 'Juros', data: profitByMonth, backgroundColor: '#ff5630', borderRadius: 6 },
    ]
  };

  const recentActs = activities.slice(0, 6);

  return (
    <>
      {/* Page Title & Actions */}
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Visão geral do seu negócio financeiro</p>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-primary" onClick={() => navigate('/emprestimos?new=1')}>
            <Plus size={16} /> Novo Empréstimo
          </button>
        </div>
      </div>

      {/* MINIMIA SAAS STAT CARDS */}
      <div className="stats-grid">
        {/* Dinheiro na Rua */}
        <div className="stat-card" onClick={() => navigate('/dinheiro-na-rua')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-top">
            <div className="stat-card-icon orange">
              <MapPin size={22} />
            </div>
            <span className="stat-card-label">Dinheiro na Rua</span>
          </div>
          <div className="stat-card-value">{formatCurrency(stats.dinheiroNaRua)}</div>
          <div className="stat-card-footer">
            <span className="trend-badge up">
              <ArrowUpRight size={12} /> 3.02%
            </span>
            <span>{stats.totalEmprestimosAtivos} empréstimos ativos</span>
          </div>
        </div>

        {/* Capital Emprestado */}
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-card-icon blue">
              <Landmark size={22} />
            </div>
            <span className="stat-card-label">Capital Emprestado</span>
          </div>
          <div className="stat-card-value">{formatCurrency(stats.capitalEmprestado)}</div>
          <div className="stat-card-footer">
            <span>Valor principal em circulação</span>
          </div>
        </div>

        {/* Total a Receber */}
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-card-icon purple">
              <Target size={22} />
            </div>
            <span className="stat-card-label">Total a Receber</span>
          </div>
          <div className="stat-card-value">{formatCurrency(stats.totalAReceber)}</div>
          <div className="stat-card-footer">
            <span className="trend-badge up">
              <ArrowUpRight size={12} /> Com juros
            </span>
            <span>Previsão de retorno</span>
          </div>
        </div>

        {/* Lucro Previsto */}
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-card-icon cyan">
              <TrendingUp size={22} />
            </div>
            <span className="stat-card-label">Lucro Previsto</span>
          </div>
          <div className="stat-card-value">{formatCurrency(stats.lucroPrevisto)}</div>
          <div className="stat-card-footer">
            <span>Juros totais dos contratos</span>
          </div>
        </div>

        {/* Lucro Realizado */}
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-card-icon green">
              <CircleDollarSign size={22} />
            </div>
            <span className="stat-card-label">Lucro Realizado</span>
          </div>
          <div className="stat-card-value text-green">{formatCurrency(stats.lucroRealizado)}</div>
          <div className="stat-card-footer">
            <span className="trend-badge up">
              <ArrowUpRight size={12} /> Recebido
            </span>
            <span>Juros já pagos pelos clientes</span>
          </div>
        </div>

        {/* Valor Recebido */}
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-card-icon green">
              <Wallet size={22} />
            </div>
            <span className="stat-card-label">Valor Recebido</span>
          </div>
          <div className="stat-card-value">{formatCurrency(stats.valorRecebido)}</div>
          <div className="stat-card-footer">
            <span>Total arrecadado em pagamentos</span>
          </div>
        </div>

        {/* Parcelas em Atraso */}
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-card-icon red">
              <AlertTriangle size={22} />
            </div>
            <span className="stat-card-label">Parcelas em Atraso</span>
          </div>
          <div className="stat-card-value text-red">{stats.parcelasEmAtraso}</div>
          <div className="stat-card-footer">
            <span className="trend-badge down">
              <ArrowDownRight size={12} /> {formatCurrency(stats.valorEmAtraso)}
            </span>
            <span>Pendente de cobrança</span>
          </div>
        </div>

        {/* Parcelas a Vencer */}
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-card-icon yellow">
              <Clock size={22} />
            </div>
            <span className="stat-card-label">Parcelas a Vencer</span>
          </div>
          <div className="stat-card-value">{stats.parcelasAVencer}</div>
          <div className="stat-card-footer">
            <span>{formatCurrency(stats.valorAVencer)} a vencer</span>
          </div>
        </div>

        {/* Clientes Ativos */}
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-card-icon accent">
              <Users size={22} />
            </div>
            <span className="stat-card-label">Clientes Ativos</span>
          </div>
          <div className="stat-card-value">{stats.clientesAtivos}</div>
          <div className="stat-card-footer">
            <span>{clients.length} clientes na carteira</span>
          </div>
        </div>
      </div>

      {/* CHARTS GRID WITH PILL TABS */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Evolução do Dinheiro Emprestado</h3>
            <div className="chart-pills">
              <button className={`chart-pill ${chartRange === 'ALL' ? 'active' : ''}`} onClick={() => setChartRange('ALL')}>TODOS</button>
              <button className={`chart-pill ${chartRange === '1M' ? 'active' : ''}`} onClick={() => setChartRange('1M')}>1M</button>
              <button className={`chart-pill ${chartRange === '6M' ? 'active' : ''}`} onClick={() => setChartRange('6M')}>6M</button>
              <button className={`chart-pill ${chartRange === '1Y' ? 'active' : ''}`} onClick={() => setChartRange('1Y')}>1A</button>
            </div>
          </div>
          <div className="chart-container">
            <Line data={{
              labels: months,
              datasets: [{
                data: lendingByMonth,
                borderColor: '#5B45D4',
                backgroundColor: theme === 'dark' ? 'rgba(91,69,212,0.18)' : 'rgba(91,69,212,0.08)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#5B45D4',
                pointRadius: 4,
                borderWidth: 2,
              }]
            }} options={chartOpts} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Recebimentos por Mês</h3>
            <div className="chart-pills">
              <button className="chart-pill active">1M</button>
              <button className="chart-pill">6M</button>
              <button className="chart-pill">1A</button>
            </div>
          </div>
          <div className="chart-container">
            <Bar data={{
              labels: months,
              datasets: [{
                data: receivedByMonth,
                backgroundColor: '#10b981',
                borderRadius: 6,
              }]
            }} options={chartOpts} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Capital Emprestado vs Juros</h3>
          </div>
          <div className="chart-container">
            <Bar data={capitalVsJurosData} options={{
              ...chartOpts,
              plugins: {
                ...chartOpts.plugins,
                legend: { display: true, labels: { color: chartTextColor, font: { size: 11, family: 'Plus Jakarta Sans' } } }
              }
            }} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Status dos Empréstimos</h3>
          </div>
          <div className="chart-container" style={{ display: 'flex', justifyContent: 'center' }}>
            <Doughnut data={statusData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom', labels: { color: chartTextColor, padding: 16, font: { size: 12, family: 'Plus Jakarta Sans' } } }
              },
              cutout: '68%',
            }} />
          </div>
        </div>
      </div>

      {/* MINIMIA RECENT ORDERS & ACTIVITIES TABLE */}
      <div className="table-card">
        <div className="table-card-header">
          <h3>Atividades e Operações Recentes</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/relatorios')}>
            Ver Relatório Completo
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Operação</th>
                <th>Descrição</th>
                <th>Data</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentActs.map(a => (
                <tr key={a.id}>
                  <td>
                    <div className="user-cell">
                      <div className="avatar" style={{ width: 34, height: 34, fontSize: '0.8rem' }}>
                        {a.type[0].toUpperCase()}
                      </div>
                      <div className="user-cell-info">
                        <strong>{a.type === 'loan_created' ? 'Novo Empréstimo' : a.type === 'payment' ? 'Pagamento' : a.type === 'client_created' ? 'Novo Cliente' : 'Atividade'}</strong>
                        <span>ID #{a.id.slice(0, 6)}</span>
                      </div>
                    </div>
                  </td>
                  <td>{a.description}</td>
                  <td>{formatDate(a.date?.split('T')[0])}</td>
                  <td>
                    <span className={`badge-status ${a.type === 'payment' || a.type === 'loan_completed' ? 'green' : a.type === 'loan_created' ? 'purple' : 'blue'}`}>
                      {a.type === 'payment' ? 'Pago' : a.type === 'loan_created' ? 'Ativo' : 'Registrado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
