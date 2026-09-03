import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Search, Bell, Menu, LogOut, Shield, Sun, Moon, Settings } from 'lucide-react';

import Logo from '../Common/Logo';

export default function Header() {
  const { searchQuery, setSearchQuery, notifications, setSidebarOpen, currentUser, logout, theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/clientes?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-btn header-btn hide-desktop" onClick={() => setSidebarOpen(true)} title="Abrir Menu">
          <Menu size={18} />
        </button>
        <div className="header-brand-mobile hide-desktop">
          <Logo variant="header" />
        </div>
        <div className="header-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
      </div>

      <div className="header-right">
        {/* Theme Switcher Button */}
        <button
          className="header-btn"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Tema Escuro' : 'Tema Claro'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Notifications Button */}
        <button className="header-btn" onClick={() => navigate('/notificacoes')} title="Notificações">
          <Bell size={18} />
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </button>

        {/* Configurações / Logo Button */}
        <button className="header-btn" onClick={() => navigate('/configuracoes')} title="Configurações e Logo">
          <Settings size={18} />
        </button>

        {currentUser && (
          <div className="header-user-profile">
            <div
              className="avatar"
              title="Ir para Configurações"
              onClick={() => navigate('/configuracoes')}
              style={{ cursor: 'pointer' }}
            >
              {currentUser.name[0]}
            </div>
            <div
              className="user-details hide-mobile"
              onClick={() => navigate('/configuracoes')}
              style={{ cursor: 'pointer' }}
              title="Ir para Configurações"
            >
              <strong>{currentUser.name}</strong>
              <small>
                {currentUser.role === 'admin' && <Shield size={10} />}
                {currentUser.role === 'admin' ? 'GESTOR PRINCIPAL' : 'OPERADOR'}
              </small>
            </div>
            <button
              className="btn-logout-icon"
              onClick={handleLogout}
              title="Sair da Conta"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
