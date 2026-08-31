import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/formatters';
import { Bell, Check, CheckCheck } from 'lucide-react';

export default function Notifications() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const unread = notifications.filter(n => !n.read).length;

  const getIcon = (type) => {
    const map = { due_today: '🟠', overdue: '🔴', near_due: '🟡', payment: '💰', loan_created: '📋', loan_completed: '✅' };
    return map[type] || '🔔';
  };
  const getColor = (type) => {
    const map = { due_today: 'var(--orange)', overdue: 'var(--red)', near_due: 'var(--yellow)', payment: 'var(--green)', loan_created: 'var(--blue)', loan_completed: 'var(--green)' };
    return map[type] || 'var(--accent)';
  };

  return (
    <>
      <div className="page-header">
        <div><h1>Notificações</h1><p>{unread} não lidas</p></div>
        {unread > 0 && <button className="btn btn-secondary" onClick={markAllNotificationsRead}><CheckCheck size={16} /> Marcar todas como lidas</button>}
      </div>

      <div className="table-card">
        {notifications.length === 0 && <div className="empty-state"><Bell size={48} /><h3>Nenhuma notificação</h3></div>}
        {notifications.map(n => (
          <div key={n.id} className={`notification-item ${!n.read ? 'unread' : ''}`} onClick={() => markNotificationRead(n.id)} style={{ cursor: 'pointer' }}>
            <div className="notification-icon" style={{ background: getColor(n.type) + '20', color: getColor(n.type), fontSize: '1.1rem' }}>
              {getIcon(n.type)}
            </div>
            <div style={{ flex: 1 }}>
              <div className="notification-text">{n.message}</div>
              <div className="notification-time">{formatDate(n.date)}</div>
            </div>
            {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
          </div>
        ))}
      </div>
    </>
  );
}
