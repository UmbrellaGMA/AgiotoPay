import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Settings as SettingsIcon, Plus, Trash2, RotateCcw, X, Upload, Check } from 'lucide-react';

export default function Settings() {
  const { settings, updateSettings, markers, addMarker, deleteMarker, activities, resetData, currentUser, updateUser } = useApp();

  const isAdmin = currentUser?.role === 'admin';
  const [tab, setTab] = useState('general');
  const [showMarkerModal, setShowMarkerModal] = useState(false);
  const [markerForm, setMarkerForm] = useState({ name: '', color: '#6366f1', icon: '🔖', description: '' });
  const [showReset, setShowReset] = useState(false);

  // Per-user profile settings
  const [adminName, setAdminName] = useState(currentUser?.name || settings.adminName || '');
  const [companyName, setCompanyName] = useState(currentUser?.companyName || settings.companyName || '');
  const [companyLogo, setCompanyLogo] = useState(currentUser?.companyLogo || settings.companyLogo || null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setAdminName(currentUser.name || settings.adminName || '');
      setCompanyName(currentUser.companyName || settings.companyName || '');
      setCompanyLogo(currentUser.companyLogo || settings.companyLogo || null);
    }
  }, [currentUser, settings]);

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    if (currentUser?.id) {
      await updateUser(currentUser.id, {
        name: adminName,
        companyName,
        companyLogo,
      });
    }
    await updateSettings({
      adminName,
      companyName,
      companyLogo,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleMarkerSubmit = (e) => {
    e.preventDefault();
    addMarker(markerForm);
    setMarkerForm({ name: '', color: '#6366f1', icon: '🔖', description: '' });
    setShowMarkerModal(false);
  };

  const tabOptions = isAdmin
    ? [['general', 'Geral / Marca D\'água'], ['markers', 'Marcadores'], ['audit', 'Auditoria'], ['danger', 'Dados']]
    : [['general', 'Geral / Marca D\'água']];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Configurações do Perfil</h1>
          <p>Personalize o seu nome, nome da empresa e a foto/logo que aparece nos seus recibos</p>
        </div>
      </div>

      <div className="tabs mb-16">
        {tabOptions.map(([k, v]) => (
          <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{v}</button>
        ))}
      </div>

      {tab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="chart-card">
          <div className="flex-between mb-16">
            <h3>Seus Dados & Marca D'água do Recibo</h3>
            {savedSuccess && (
              <span className="badge-status green flex align-center gap-6" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                <Check size={14} /> Salvo com sucesso!
              </span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Seu Nome / Responsável</label>
              <input
                className="form-input"
                value={adminName}
                onChange={e => setAdminName(e.target.value)}
                placeholder="Ex: Gustavo Melo"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nome da Sua Empresa (Recibo)</label>
              <input
                className="form-input"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Ex: AgiotoPay Empréstimos"
              />
            </div>
          </div>

          <h3 style={{ marginTop: 24, marginBottom: 16 }}>Logo Personalizada para Recibo & Marca D'água</h3>
          <div className="form-group mb-24">
            <label className="form-label">Sua Foto / Logo da Empresa</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {companyLogo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-input)', padding: '12px 18px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <img src={companyLogo} alt="Logo Personalizada" style={{ maxHeight: 60, maxWidth: 160, objectFit: 'contain' }} />
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => setCompanyLogo(null)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Trash2 size={14} /> Remover Logo
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    id="company-logo-file"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 3 * 1024 * 1024) {
                          alert('A imagem deve ter no máximo 3MB.');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          setCompanyLogo(evt.target.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label htmlFor="company-logo-file" className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
                    <Upload size={16} /> Selecionar Foto / Logo
                  </label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Envie a imagem (PNG, JPG ou SVG) da sua empresa para ser exibida no topo e como marca d'água em todos os seus recibos.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group"><label className="form-label">Moeda</label><input className="form-input" value={settings.currency || 'BRL (R$)'} readOnly /></div>
            <div className="form-group"><label className="form-label">Formato de Data</label><input className="form-input" value={settings.dateFormat || 'DD/MM/YYYY'} readOnly /></div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', fontSize: '0.95rem' }}>
              💾 Salvar Alterações
            </button>
          </div>
        </form>
      )}

      {tab === 'markers' && isAdmin && (
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

      {tab === 'audit' && isAdmin && (
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

      {tab === 'danger' && isAdmin && (
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
