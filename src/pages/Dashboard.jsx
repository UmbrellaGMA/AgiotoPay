import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getInstallmentStatus, getDaysUntilDue } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Landmark, TrendingUp, TrendingDown, DollarSign,
  AlertTriangle, Clock, Users, BarChart3, CircleDollarSign,
  ArrowUpRight, ArrowDownRight, Target, Wallet
} from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a2235', borderColor: '#2a3a5c', borderWidth: 1, titleColor: '#f1f5f9', bodyColor: '#94a3b8', padding: 10, cornerRadius: 8 } },
  scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } } }
};

export default function Dashboard() {
  const { stats, loans, installments, payments, activities, clients } = useApp();
  const navigate = useNavigate();

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'];

  // Chart data: monthly lending evolution
  const lendingByMonth = months.map((_, i) => {
    const m = i + 1;
    return loans.filter(l => {
      const d = new Date(l.startDate);
      return d.getMonth() + 1 <= m && l.status === 'active';
    }).reduce((s, l) => s + l.principalAmount, 0);
  });

  // Chart data: monthly received
  const receivedByMonth = months.map((_, i) => {
    const m = i + 1;
    return payments.filter(p => {
      const d = new Date(p.date);
      return d.getMonth() + 1 === m && d.getFullYear() === 2026;
    }).reduce((s, p) => s + p.amount, 0);
  });

  // Chart data: monthly profit
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
      backgroundColor: ['#6366f1', '#10b981', '#ef4444'],
      borderWidth: 0,
    }]
  };

  const capitalVsJurosData = {
    labels: months,
    datasets: [
      { label: 'Capital', data: lendingByMonth, backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 6 },
      { label: 'Juros', data: profitByMonth, backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6 },
    ]
  };

  const recentActs = activities.slice(0, 8);

  const getActColor = (type) => {
    const map = { client_created: 'blue', loan_created: 'purple', payment: 'green', installment_overdue: 'red', loan_completed: 'green', client_updated: 'yellow' };
    return map[type] || 'blue';
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Visão geral do seu negócio financeiro</p>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-primary" onClick={() => navigate('/emprestimos?new=1')}>+ Novo Empréstimo</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card orange" onClick={() => navigate('/dinheiro-na-rua')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-header">
            <div className="stat-card-icon orange"><MapPin size={20} /></div>
          </div>
          <div className="stat-card-label">Dinheiro na Rua</div>
          <div className="stat-card-value">{formatCurrency(stats.dinheiroNaRua)}</div>
          <div className="stat-card-sub">{stats.totalEmprestimosAtivos} empréstimos ativos</div>
        </div>

        <div className="stat-card blue">
          <div className="stat-card-header">
            <div className="stat-card-icon blue"><Landmark size={20} /></div>
          </div>
          <div className="stat-card-label">Capital Emprestado</div>
          <div className="stat-card-value">{formatCurrency(stats.capitalEmprestado)}</div>
          <div className="stat-card-sub">Valor original dos empréstimos ativos</div>
        </div>

        <div className="stat-card purple">
          <div className="stat-card-header">
            <div className="stat-card-icon purple"><Target size={20} /></div>
          </div>
          <div className="stat-card-label">Total a Receber</div>
          <div className="stat-card-value">{formatCurrency(stats.totalAReceber)}</div>
          <div className="stat-card-sub">Incluindo juros</div>
        </div>

        <div className="stat-card cyan">
          <div className="stat-card-header">
            <div className="stat-card-icon cyan"><TrendingUp size={20} /></div>
          </div>
          <div className="stat-card-label">Lucro Previsto</div>
          <div className="stat-card-value">{formatCurrency(stats.lucroPrevisto)}</div>
          <div className="stat-card-sub">Juros dos empréstimos ativos</div>
        </div>

        <div className="stat-card green">
          <div className="stat-card-header">
            <div className="stat-card-icon green"><CircleDollarSign size={20} /></div>
          </div>
          <div className="stat-card-label">Lucro Realizado</div>
          <div className="stat-card-value text-green">{formatCurrency(stats.lucroRealizado)}</div>
          <div className="stat-card-sub">Juros já recebidos</div>
        </div>

        <div className="stat-card green">
          <div className="stat-card-header">
            <div className="stat-card-icon green"><Wallet size={20} /></div>
          </div>
          <div className="stat-card-label">Valor Recebido</div>
          <div className="stat-card-value">{formatCurrency(stats.valorRecebido)}</div>
          <div className="stat-card-sub">Total de pagamentos recebidos</div>
        </div>

        <div className="stat-card red">
          <div className="stat-card-header">
            <div className="stat-card-icon red"><AlertTriangle size={20} /></div>
          </div>
          <div className="stat-card-label">Parcelas em Atraso</div>
          <div className="stat-card-value text-red">{stats.parcelasEmAtraso}</div>
          <div className="stat-card-sub">{formatCurrency(stats.valorEmAtraso)} em atraso</div>
        </div>

        <div className="stat-card yellow">
          <div className="stat-card-header">
            <div className="stat-card-icon yellow"><Clock size={20} /></div>
          </div>
          <div className="stat-card-label">Parcelas a Vencer</div>
          <div className="stat-card-value">{stats.parcelasAVencer}</div>
          <div className="stat-card-sub">{formatCurrency(stats.valorAVencer)} nos próximos dias</div>
        </div>

        <div className="stat-card accent">
          <div className="stat-card-header">
            <div className="stat-card-icon accent"><Users size={20} /></div>
          </div>
          <div className="stat-card-label">Clientes Ativos</div>
          <div className="stat-card-value">{stats.clientesAtivos}</div>
          <div className="stat-card-sub">{clients.length} clientes cadastrados</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Evolução do Dinheiro Emprestado</h3>
          <div className="chart-container">
            <Line data={{
              labels: months,
              datasets: [{
                data: lendingByMonth,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99,102,241,0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#6366f1',
                borderWidth: 2,
              }]
            }} options={chartOpts} />
          </div>
        </div>

        <div className="chart-card">
          <h3>Recebimentos por Mês</h3>
          <div className="chart-container">
            <Bar data={{
              labels: months,
              datasets: [{
                data: receivedByMonth,
                backgroundColor: 'rgba(16,185,129,0.7)',
                borderRadius: 6,
              }]
            }} options={chartOpts} />
          </div>
        </div>

        <div className="chart-card">
          <h3>Capital Emprestado vs Juros</h3>
          <div className="chart-container">
            <Bar data={capitalVsJurosData} options={{ ...chartOpts, plugins: { ...chartOpts.plugins, legend: { display: true, labels: { color: '#94a3b8', font: { size: 11 } } } } }} />
          </div>
        </div>

        <div className="chart-card">
          <h3>Status dos Empréstimos</h3>
          <div className="chart-container" style={{ display: 'flex', justifyContent: 'center' }}>
            <Doughnut data={statusData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 16, font: { size: 12 } } } },
              cutout: '65%',
            }} />
          </div>
        </div>
      </div>

      <div className="activity-list">
        <div className="activity-header">Atividades Recentes</div>
        {recentActs.map(a => (
          <div key={a.id} className="activity-item">
            <div className={`activity-dot ${getActColor(a.type)}`} />
            <div>
              <div className="activity-text">{a.description}</div>
              <div className="activity-time">{formatDate(a.date?.split('T')[0])}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
