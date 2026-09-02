import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { LayoutDashboard, Users, Landmark, Receipt, Menu } from 'lucide-react';

export default function BottomNav() {
  const { setSidebarOpen } = useApp();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Início', end: true },
    { to: '/clientes', icon: Users, label: 'Clientes' },
    { to: '/emprestimos', icon: Landmark, label: 'Empréstimos' },
    { to: '/parcelas', icon: Receipt, label: 'Parcelas' },
  ];

  return (
    <div className="bottom-nav">
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <item.icon size={20} />
          <span>{item.label}</span>
        </NavLink>
      ))}

      <button
        type="button"
        className="bottom-nav-item"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu size={20} />
        <span>Menu</span>
      </button>
    </div>
  );
}
