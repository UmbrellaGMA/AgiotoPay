import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getInstallmentStatus, getDaysUntilDue } from '../utils/formatters';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Agenda() {
  const { installments, loans, clients, payments } = useApp();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const days = [];
    // Previous month fill
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, otherMonth: true });
    }
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), otherMonth: false });
    }
    // Next month fill
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), otherMonth: true });
    }
    return days;
  }, [year, month]);

  const activeLoans = loans.filter(l => l.status === 'active');
  const activeInsts = installments.filter(i => activeLoans.some(l => l.id === i.loanId));

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const events = [];
    activeInsts.forEach(i => {
      if (i.dueDate === dateStr) {
        const client = clients.find(c => c.id === i.clientId);
        const st = getInstallmentStatus(i);
        events.push({ type: st === 'paid' ? 'paid' : st === 'overdue' ? 'overdue' : 'due', label: `${client?.name?.split(' ')[0] || ''} #${i.number}`, clientId: i.clientId });
      }
    });
    payments.forEach(p => {
      if (p.date === dateStr) {
        const client = clients.find(c => c.id === p.clientId);
        events.push({ type: 'paid', label: `Pgto ${client?.name?.split(' ')[0] || ''}`, clientId: p.clientId });
      }
    });
    return events;
  };

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Today's dues & upcoming
  const todayDues = activeInsts.filter(i => i.dueDate === todayStr && i.paidAmount < i.totalAmount);
  const upcoming = activeInsts.filter(i => {
    const d = getDaysUntilDue(i.dueDate);
    return d > 0 && d <= 7 && i.paidAmount < i.totalAmount;
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdue = activeInsts.filter(i => getInstallmentStatus(i) === 'overdue').sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const InstList = ({ items, title, color }) => (
    <div className="table-card" style={{ marginBottom: 16 }}>
      <div className="table-card-header"><h3 style={{ color }}>{title} ({items.length})</h3></div>
      {items.map(i => {
        const client = clients.find(c => c.id === i.clientId);
        return (
          <div key={i.id} className="activity-item clickable" onClick={() => navigate(`/clientes/${i.clientId}`)}>
            <div className={`activity-dot`} style={{ background: color }} />
            <div style={{ flex: 1 }}>
              <div className="activity-text"><strong>{client?.name}</strong> - Parcela {i.number}</div>
              <div className="activity-time">{formatDate(i.dueDate)} • {formatCurrency(i.totalAmount - i.paidAmount)}</div>
            </div>
          </div>
        );
      })}
      {items.length === 0 && <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum item</div>}
    </div>
  );

  return (
    <>
      <div className="page-header"><div><h1>Agenda Financeira</h1><p>Calendário de vencimentos e pagamentos</p></div></div>

      <div className="chart-card mb-16">
        <div className="flex-between mb-16">
          <button className="btn btn-secondary btn-sm" onClick={prevMonth}><ChevronLeft size={16} /></button>
          <h3>{monthNames[month]} {year}</h3>
          <button className="btn btn-secondary btn-sm" onClick={nextMonth}><ChevronRight size={16} /></button>
        </div>
        <div className="calendar-grid">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="calendar-header-cell">{d}</div>
          ))}
          {calendarDays.map((day, idx) => {
            const isToday = day.date.toISOString().split('T')[0] === todayStr;
            const events = getEventsForDate(day.date);
            return (
              <div key={idx} className={`calendar-cell ${isToday ? 'today' : ''} ${day.otherMonth ? 'other-month' : ''}`}>
                <div className="calendar-day">{day.date.getDate()}</div>
                {events.slice(0, 3).map((e, i) => (
                  <div key={i} className={`calendar-event ${e.type}`} onClick={() => navigate(`/clientes/${e.clientId}`)}>{e.label}</div>
                ))}
                {events.length > 3 && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>+{events.length - 3}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <InstList items={todayDues} title="🟠 Vencimentos de Hoje" color="var(--orange)" />
        <InstList items={upcoming} title="🟡 Próximos Vencimentos" color="var(--yellow)" />
        <InstList items={overdue} title="🔴 Pagamentos Atrasados" color="var(--red)" />
      </div>
    </>
  );
}
