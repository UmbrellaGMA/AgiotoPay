import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard, MapPin, Users, Landmark, Receipt, CreditCard,
  Calendar, FileBarChart, Bell, Settings, X, UserCheck
} from 'lucide-react';

import Logo from '../Common/Logo';

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, currentUser, notifications } = useApp();
  const unreadCount = notifications.filter(n => !n.read).length;

  const menuItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', badge: 'Novo' },
    { to: '/dinheiro-na-rua', icon: MapPin, label: 'Dinheiro na Rua' },
    { to: '/clientes', icon: Users, label: 'Clientes' },
    { to: '/emprestimos', icon: Landmark, label: 'Empréstimos' },
    { to: '/parcelas', icon: Receipt, label: 'Parcelas' },
    { to: '/pagamentos', icon: CreditCard, label: 'Pagamentos' },
  ];

  const toolsItems = [
    { to: '/agenda', icon: Calendar, label: 'Agenda' },
    { to: '/relatorios', icon: FileBarChart, label: 'Relatórios' },
    { to: '/notificacoes', icon: Bell, label: 'Notificações', badge: unreadCount > 0 ? unreadCount : null },
  ];

  const adminItems = [
    { to: '/usuarios', icon: UserCheck, label: 'Usuários Agiotas' },
    { to: '/configuracoes', icon: Settings, label: 'Configurações' },
  ];

  return (
    <>
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Logo variant="full" size={32} />
          <button className="menu-btn header-btn" style={{ marginLeft: 'auto' }} onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">MENU</div>
          {menuItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setSidebarOpen(false)}>
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </NavLink>
          ))}

          <div className="sidebar-section-title" style={{ marginTop: 16 }}>FERRAMENTAS</div>
          {toolsItems.map(item => (
            <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}>
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge" style={{ background: 'var(--red)' }}>{item.badge}</span>}
            </NavLink>
          ))}

          {currentUser?.role === 'admin' && (
            <>
              <div className="sidebar-section-title" style={{ marginTop: 16 }}>ADMINISTRATIVO</div>
              {adminItems.map(item => (
                <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}>
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
