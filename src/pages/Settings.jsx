import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Settings as SettingsIcon, Plus, Trash2, RotateCcw, X } from 'lucide-react';

export default function Settings() {
  const { settings, updateSettings, markers, addMarker, deleteMarker, activities, resetData, currentUser } = useApp();

  // Only admin can access settings
  if (currentUser?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  const [tab, setTab] = useState('general');
  const [showMarkerModal, setShowMarkerModal] = useState(false);
  const [markerForm, setMarkerForm] = useState({ name: '', color: '#6366f1', icon: '🔖', description: '' });
  const [showReset, setShowReset] = useState(false);

  const handleMarkerSubmit = (e) => {
    e.preventDefault();
    addMarker(markerForm);
    setMarkerForm({ name: '', color: '#6366f1', icon: '🔖', description: '' });
    setShowMarkerModal(false);
  };

  return (
    <>
      <div className="page-header"><div><h1>Configurações</h1><p>Personalize o AgiotoPay</p></div></div>

      <div className="tabs mb-16">
        {[['general', 'Geral'], ['markers', 'Marcadores'], ['audit', 'Auditoria'], ['danger', 'Dados']].map(([k, v]) => (
          <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{v}</button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="chart-card">
          <h3 style={{ marginBottom: 20 }}>Dados do Administrador</h3>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Nome do Administrador</label><input className="form-input" value={settings.adminName} onChange={e => updateSettings({ adminName: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Nome da Empresa</label><input className="form-input" value={settings.companyName} onChange={e => updateSettings({ companyName: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Moeda</label><input className="form-input" value={settings.currency} readOnly /></div>
            <div className="form-group"><label className="form-label">Formato de Data</label><input className="form-input" value={settings.dateFormat} readOnly /></div>
          </div>
          <h3 style={{ marginTop: 24, marginBottom: 12 }}>Formas de Pagamento</h3>
          <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
            {settings.paymentMethods.map((m, i) => (
              <span key={i} className="badge-status blue">{m}</span>
            ))}
          </div>
          <h3 style={{ marginTop: 24, marginBottom: 12 }}>Alertas de Vencimento</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Alertas configurados para: {settings.alertDays.map(d => d === 0 ? 'No dia' : `${d} dia(s) antes`).join(', ')}</p>
        </div>
      )}

      {tab === 'markers' && (
        <div className="chart-card">
          <div className="flex-between mb-16">
            <h3>Marcadores Personalizados</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowMarkerModal(true)}><Plus size={14} /> Novo Marcador</button>
          </div>
          {markers.map(m => (
            <div key={m.id} className="activity-item" style={{ borderColor: 'var(--border)' }}>
              <span style={{ fontSize: '1.3rem' }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <strong style={{ color: m.color }}>{m.name}</strong>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>{m.description}</div>
              </div>
              <button className="btn btn-icon btn-sm btn-danger" onClick={() => deleteMarker(m.id)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {tab === 'audit' && (
        <div className="table-card">
          <div className="table-card-header"><h3>Histórico de Auditoria</h3></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Data/Hora</th><th>Ação</th><th>Descrição</th></tr></thead>
              <tbody>
                {activities.slice(0, 50).map(a => (
                  <tr key={a.id}>
                    <td style={{ fontSize: '0.8rem' }}>{new Date(a.date).toLocaleString('pt-BR')}</td>
                    <td><span className="badge-status blue" style={{ textTransform: 'capitalize' }}>{a.type.replace(/_/g, ' ')}</span></td>
                    <td>{a.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'danger' && (
        <div className="chart-card">
          <h3 style={{ marginBottom: 16, color: 'var(--red)' }}>Zona de Perigo</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Restaurar todos os dados para o estado inicial. Esta ação não pode ser desfeita.</p>
          {!showReset ? (
            <button className="btn btn-danger" onClick={() => setShowReset(true)}><RotateCcw size={16} /> Resetar Dados</button>
          ) : (
            <div className="flex gap-8">
              <button className="btn btn-danger" onClick={() => { resetData(); setShowReset(false); }}>Confirmar Reset</button>
              <button className="btn btn-secondary" onClick={() => setShowReset(false)}>Cancelar</button>
            </div>
          )}
        </div>
      )}

      {showMarkerModal && (
        <div className="modal-overlay" onClick={() => setShowMarkerModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Novo Marcador</h2><button className="btn btn-icon btn-secondary" onClick={() => setShowMarkerModal(false)}><X size={16} /></button></div>
            <form onSubmit={handleMarkerSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Nome</label><input className="form-input" required value={markerForm.name} onChange={e => setMarkerForm({ ...markerForm, name: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Ícone (emoji)</label><input className="form-input" value={markerForm.icon} onChange={e => setMarkerForm({ ...markerForm, icon: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Cor</label><input className="form-input" type="color" value={markerForm.color} onChange={e => setMarkerForm({ ...markerForm, color: e.target.value })} style={{ height: 42 }} /></div>
                  <div className="form-group"><label className="form-label">Descrição</label><input className="form-input" value={markerForm.description} onChange={e => setMarkerForm({ ...markerForm, description: e.target.value })} /></div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowMarkerModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Criar Marcador</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
