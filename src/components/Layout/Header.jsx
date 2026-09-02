import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Search, Bell, Menu, LogOut, Shield, Sun, Moon } from 'lucide-react';

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
          <div className="logo-sm">A</div>
          <span>AGIOTOPAY</span>
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

        {currentUser && (
          <div className="header-user-profile">
            <div className="avatar" title={currentUser.name}>
              {currentUser.name[0]}
            </div>
            <div className="user-details hide-mobile">
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
