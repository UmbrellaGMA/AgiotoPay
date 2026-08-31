import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard, MapPin, Users, Landmark, Receipt, CreditCard,
  Calendar, FileBarChart, Bell, Settings, X
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dinheiro-na-rua', icon: MapPin, label: 'Dinheiro na Rua' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/emprestimos', icon: Landmark, label: 'Empréstimos' },
  { to: '/parcelas', icon: Receipt, label: 'Parcelas' },
  { to: '/pagamentos', icon: CreditCard, label: 'Pagamentos' },
];

const navItems2 = [
  { to: '/agenda', icon: Calendar, label: 'Agenda' },
  { to: '/relatorios', icon: FileBarChart, label: 'Relatórios' },
  { to: '/notificacoes', icon: Bell, label: 'Notificações' },
  { to: '/configuracoes', icon: Settings, label: 'Configurações' },
];

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useApp();

  return (
    <>
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo">A</div>
          <h2>AgiotoPay</h2>
          <button className="menu-btn header-btn" style={{ marginLeft: 'auto' }} onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setSidebarOpen(false)}>
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
          <div className="sidebar-section">
            <div className="sidebar-section-title">Ferramentas</div>
            {navItems2.map(item => (
              <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}>
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
}
