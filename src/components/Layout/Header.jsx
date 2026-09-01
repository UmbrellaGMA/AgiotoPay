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
        <button className="menu-btn header-btn" onClick={() => setSidebarOpen(true)}>
          <Menu size={18} />
        </button>
        <div className="header-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Pesquisar cliente, telefone, CPF..."
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
          title={theme === 'light' ? 'Mudar para Tema Escuro' : 'Mudar para Tema Claro'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Notifications Button */}
        <button className="header-btn" onClick={() => navigate('/notificacoes')} title="Notificações">
          <Bell size={18} />
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </button>

        {currentUser && (
          <div className="header-user-profile" style={{ display: 'flex', alignItems: 'center', gap: 10, borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 14 }}>
            <div className="avatar" style={{ width: 34, height: 34, fontSize: '0.85rem', background: 'rgba(255,255,255,0.25)', color: '#fff', fontWeight: 700, border: '1px solid rgba(255,255,255,0.3)' }}>
              {currentUser.name[0]}
            </div>
            <div className="user-details hide-mobile" style={{ display: 'flex', flexDirection: 'column' }}>
              <strong style={{ fontSize: '0.86rem', color: '#fff', lineHeight: 1.2 }}>{currentUser.name}</strong>
              <small style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
                {currentUser.role === 'admin' && <Shield size={10} />}
                {currentUser.role === 'admin' ? 'GESTOR PRINCIPAL' : 'OPERADOR'}
              </small>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleLogout}
              title="Sair da Conta"
              style={{
                marginLeft: 4,
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255, 255, 255, 0.16)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                color: '#fff',
                fontWeight: 600
              }}
            >
              <LogOut size={14} />
              <span className="hide-mobile">Sair</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
