import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Search, Bell, Menu } from 'lucide-react';

export default function Header() {
  const { searchQuery, setSearchQuery, notifications, setSidebarOpen } = useApp();
  const navigate = useNavigate();
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/clientes?q=${encodeURIComponent(searchQuery.trim())}`);
    }
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
        <button className="header-btn" onClick={() => navigate('/notificacoes')}>
          <Bell size={18} />
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </button>
      </div>
    </header>
  );
}
