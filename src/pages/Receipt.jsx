import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useRef, useState, useEffect } from 'react';

import Logo from '../components/Common/Logo';

export default function Receipt() {
  const { id } = useParams(); // installment ID
  const { installments, loans, clients, settings, saveSignature, loading } = useApp();
  const canvasRef = useRef(null);

  const installment = installments.find(i => i.id === id);
  const loan = installment ? loans.find(l => l.id === installment.loanId) : null;
  const client = loan ? clients.find(c => c.id === loan.clientId) : null;

  const [signed, setSigned] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Sync state if installment loads or changes
  useEffect(() => {
    if (installment?.signature) {
      setSigned(true);
      setSignatureData(installment.signature);
    }
  }, [installment]);

  // Canvas setup
  useEffect(() => {
    if (signed || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
  }, [installment, signed]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    setDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!drawing || !canvasRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = () => {
    setDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
    setSignatureData(null);
  };

  const confirmSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL('image/png');
    setSignatureData(data);
    setSigned(true);
    if (installment) {
      saveSignature(installment.id, data);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Show loading while Supabase data loads
  if (loading) {
    return (
      <div className="receipt-page">
        <div className="receipt-container">
          <div className="receipt-not-found">
            <div className="receipt-not-found-icon" style={{ animation: 'pulse 1.5s infinite' }}>⏳</div>
            <h2>Carregando recibo...</h2>
            <p>Aguarde enquanto buscamos os dados.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!installment || !loan || !client) {
    return (
      <div className="receipt-page">
        <div className="receipt-container">
          <div className="receipt-not-found">
            <div className="receipt-not-found-icon">📄</div>
            <h2>Recibo não encontrado</h2>
            <p>O recibo solicitado não existe ou o link é inválido.</p>
          </div>
        </div>
      </div>
    );
  }

  const saldo = installment.totalAmount - installment.paidAmount;
  const isPaid = installment.paidAmount >= installment.totalAmount;
  const isInterestOnly = loan.calculationMode === 'interest_only_final_payoff';
  const now = new Date();
  const signedDateStr = installment.signedAt ? new Date(installment.signedAt).toLocaleDateString('pt-BR') : now.toLocaleDateString('pt-BR');
  const signedTimeStr = installment.signedAt ? new Date(installment.signedAt).toLocaleTimeString('pt-BR') : now.toLocaleTimeString('pt-BR');

  return (
    <div className="receipt-page">
      <div className="receipt-container">
        {/* Actions bar — hidden on print */}
        <div className="receipt-actions no-print">
          <button className="receipt-btn" onClick={copyLink}>
            {copied ? '✅ Link Copiado!' : '🔗 Copiar Link do Recibo'}
          </button>
          <button className="receipt-btn primary" onClick={handlePrint}>
            🖨️ Imprimir / Salvar PDF (A4)
          </button>
        </div>

        {/* Receipt Card */}
        <div className="receipt-card">
          {/* Header */}
          <div className="receipt-header">
            <div className="receipt-header-text">
              <Logo variant="full" size={38} />
              <p style={{ marginTop: '4px', fontSize: '0.8rem', color: '#64748b' }}>{settings?.companyName || 'Sistema de Gerenciamento Financeiro'}</p>
            </div>
            <div className="receipt-badge-wrapper">
              <span className={`receipt-badge ${isPaid ? 'paid' : 'pending'}`}>
                {isPaid ? 'QUITADA' : 'PENDENTE'}
              </span>
            </div>
          </div>

          <div className="receipt-divider" />

          {/* Receipt Title */}
          <div className="receipt-title-section">
            <h2>RECIBO DE COBRANÇA</h2>
            <p className="receipt-subtitle">Parcela {installment.number} de {loan.installmentCount}</p>
            <p className="receipt-code">Código: #{(installment.id || '').slice(-8).toUpperCase()}</p>
          </div>

          <div className="receipt-divider" />

          {/* Client Info */}
          <div className="receipt-section">
            <h3>Dados do Cliente</h3>
            <div className="receipt-info-grid">
              <div className="receipt-info-item">
                <label>Nome Completo</label>
                <span>{client.name}</span>
              </div>
              <div className="receipt-info-item">
                <label>CPF / Documento</label>
                <span>{client.cpf || '-'}</span>
              </div>
              <div className="receipt-info-item">
                <label>Telefone / WhatsApp</label>
                <span>{client.whatsapp || client.phone || '-'}</span>
              </div>
              <div className="receipt-info-item">
                <label>E-mail</label>
                <span>{client.email || '-'}</span>
              </div>
            </div>
          </div>

          <div className="receipt-divider" />

          {/* Loan Info */}
          <div className="receipt-section">
            <h3>Dados do Empréstimo</h3>
            <div className="receipt-info-grid">
              <div className="receipt-info-item">
                <label>Título do Débito</label>
                <span>{loan.title}</span>
              </div>
              <div className="receipt-info-item">
                <label>Capital Principal</label>
                <span>{formatCurrency(loan.principalAmount)}</span>
              </div>
              <div className="receipt-info-item">
                <label>Taxa de Juros</label>
                <span>{loan.interestRate}% por período</span>
              </div>
              <div className="receipt-info-item">
                <label>Modalidade</label>
                <span>{isInterestOnly ? 'Juros Periódicos + Quitação Final' : 'Amortização Tradicional'}</span>
              </div>
              <div className="receipt-info-item">
                <label>Total de Parcelas</label>
                <span>{loan.installmentCount}x</span>
              </div>
              <div className="receipt-info-item">
                <label>Valor Total do Débito</label>
                <span>{formatCurrency(loan.totalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="receipt-divider" />

          {/* Installment Details */}
          <div className="receipt-section">
            <h3>Detalhes desta Parcela</h3>
            <div className="receipt-highlight-grid">
              <div className="receipt-highlight-card blue">
                <label>Parcela Nº</label>
                <span>{installment.number}/{loan.installmentCount}</span>
              </div>
              <div className="receipt-highlight-card yellow">
                <label>Vencimento</label>
                <span>{formatDate(installment.dueDate)}</span>
              </div>
              <div className="receipt-highlight-card purple">
                <label>Capital</label>
                <span>{formatCurrency(installment.principalAmount)}</span>
              </div>
              <div className="receipt-highlight-card orange">
                <label>Juros</label>
                <span>{formatCurrency(installment.interestAmount)}</span>
              </div>
              <div className="receipt-highlight-card accent">
                <label>Valor Total</label>
                <span className="receipt-total">{formatCurrency(installment.totalAmount)}</span>
              </div>
              <div className={`receipt-highlight-card ${isPaid ? 'green' : 'red'}`}>
                <label>{isPaid ? 'Valor Pago' : 'Saldo Pendente'}</label>
                <span>{isPaid ? formatCurrency(installment.paidAmount) : formatCurrency(saldo)}</span>
              </div>
            </div>
          </div>

          {isPaid && installment.paidDate && (
            <>
              <div className="receipt-divider" />
              <div className="receipt-section">
                <h3>Confirmação de Pagamento</h3>
                <div className="receipt-paid-info">
                  <p>Pagamento registrado em <strong>{formatDate(installment.paidDate)}</strong></p>
                  <p>Valor pago: <strong className="text-green">{formatCurrency(installment.paidAmount)}</strong></p>
                </div>
              </div>
            </>
          )}

          <div className="receipt-divider" />

          {/* Digital Signature */}
          <div className="receipt-section">
            <h3>Assinatura Digital do Cliente</h3>
            <p className="receipt-sign-info no-print">
              Ao assinar abaixo, o cliente confirma que está ciente dos valores, condições e vencimento desta parcela.
            </p>

            {signed && signatureData ? (
              <div className="receipt-signed-area">
                <img src={signatureData} alt="Assinatura Digital" className="receipt-signature-img" />
                <div className="receipt-signed-meta">
                  <p>📌 Assinado digitalmente em {signedDateStr} às {signedTimeStr}</p>
                  <p>🔒 Assinatura registrada e vinculada ao recibo #{(installment.id || '').slice(-8).toUpperCase()}</p>
                </div>
              </div>
            ) : (
              <div className="receipt-signature-box">
                <canvas
                  ref={canvasRef}
                  className="receipt-canvas"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
                <p className="receipt-canvas-hint no-print">Assine com o mouse ou toque na tela</p>
                <div className="receipt-sign-actions no-print">
                  <button className="receipt-btn secondary" onClick={clearSignature}>🗑️ Limpar</button>
                  <button className="receipt-btn primary" onClick={confirmSignature}>💾 Confirmar e Salvar Assinatura</button>
                </div>
              </div>
            )}
          </div>

          <div className="receipt-divider" />

          {/* Footer */}
          <div className="receipt-footer">
            <p>Documento gerado automaticamente pelo sistema <strong>AGIOTOPAY</strong></p>
            <p>{now.toLocaleDateString('pt-BR')} às {now.toLocaleTimeString('pt-BR')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
