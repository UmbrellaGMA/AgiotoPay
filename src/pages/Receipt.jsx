import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useRef, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import Logo from '../components/Common/Logo';

// Helper: convert snake_case DB row to camelCase JS object
const toCamel = (row) => {
  if (!row) return row;
  const map = {
    client_id: 'clientId', loan_id: 'loanId', principal_amount: 'principalAmount',
    interest_type: 'interestType', interest_rate: 'interestRate',
    fixed_interest_amount: 'fixedInterestAmount', total_interest: 'totalInterest',
    total_amount: 'totalAmount', installment_count: 'installmentCount',
    start_date: 'startDate', first_due_date: 'firstDueDate', created_at: 'createdAt',
    due_date: 'dueDate', paid_amount: 'paidAmount', paid_date: 'paidDate',
    interest_amount: 'interestAmount', installment_ids: 'installmentIds',
    related_id: 'relatedId', calculation_mode: 'calculationMode',
    signed_at: 'signedAt', admin_name: 'adminName', company_name: 'companyName',
    date_format: 'dateFormat', alert_days: 'alertDays', payment_methods: 'paymentMethods',
    birth_date: 'birthDate', document_image: 'documentImage',
  };
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[map[k] || k] = v;
  }
  return out;
};

export default function Receipt() {
  const { id } = useParams(); // installment ID
  const { installments, loans, clients, settings: globalSettings, saveSignature, loading: contextLoading } = useApp();
  const canvasRef = useRef(null);

  const [directData, setDirectData] = useState(null);
  const [directLoading, setDirectLoading] = useState(false);
  const [signed, setSigned] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Try finding records in global context
  const contextInstallment = installments.find(i => String(i.id).toLowerCase() === String(id || '').toLowerCase());
  const contextLoan = contextInstallment ? loans.find(l => String(l.id).toLowerCase() === String(contextInstallment.loanId || '').toLowerCase()) : null;
  const contextClient = contextLoan ? clients.find(c => String(c.id).toLowerCase() === String(contextLoan.clientId || '').toLowerCase()) : null;

  // 2. Direct fetch fallback if unauthenticated public link or context missing
  useEffect(() => {
    let active = true;
    async function loadDirectReceipt() {
      if (contextInstallment && contextLoan && contextClient) return;
      if (!id) return;

      setDirectLoading(true);
      try {
        const { data: inst, error: instErr } = await supabase
          .from('installments')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (instErr || !inst) {
          if (active) setDirectLoading(false);
          return;
        }

        const { data: loan } = await supabase
          .from('loans')
          .select('*')
          .eq('id', inst.loan_id)
          .maybeSingle();

        const { data: client } = loan ? await supabase
          .from('clients')
          .select('*')
          .eq('id', loan.client_id)
          .maybeSingle() : { data: null };

        const { data: settingsArr } = await supabase
          .from('settings')
          .select('*')
          .limit(1);

        if (active) {
          setDirectData({
            installment: toCamel(inst),
            loan: loan ? toCamel(loan) : null,
            client: client ? toCamel(client) : null,
            settings: settingsArr?.[0] ? toCamel(settingsArr[0]) : {},
          });
        }
      } catch (err) {
        console.error('Direct receipt fetch error:', err);
      } finally {
        if (active) setDirectLoading(false);
      }
    }

    loadDirectReceipt();

    return () => { active = false; };
  }, [id, contextInstallment, contextLoan, contextClient]);

  const installment = contextInstallment || directData?.installment;
  const loan = contextLoan || directData?.loan;
  const client = contextClient || directData?.client;
  const settings = globalSettings && Object.keys(globalSettings).length > 0 ? globalSettings : (directData?.settings || {});

  const isLoading = (contextLoading && !installment) || directLoading;

  // Sync state if installment loads or has signature
  useEffect(() => {
    if (installment?.signature) {
      setSigned(true);
      setSignatureData(installment.signature);
    }
  }, [installment]);

  // Setup Canvas
  const initCanvas = useCallback(() => {
    if (signed || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = window.devicePixelRatio || 2;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
  }, [signed]);

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', initCanvas);
    return () => window.removeEventListener('resize', initCanvas);
  }, [initCanvas, installment, signed]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDraw = (e) => {
    if (!canvasRef.current) return;
    setDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!drawing || !canvasRef.current) return;
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

  const confirmSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if canvas is empty before confirming
    const ctx = canvas.getContext('2d');
    const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let hasSignature = false;
    for (let i = 3; i < pixelData.length; i += 4) {
      if (pixelData[i] > 0) {
        hasSignature = true;
        break;
      }
    }

    if (!hasSignature) {
      alert('Por favor, faça sua assinatura no quadro antes de confirmar.');
      return;
    }

    const data = canvas.toDataURL('image/png');
    setIsSaving(true);
    setSignatureData(data);
    setSigned(true);

    try {
      const signedAt = new Date().toISOString();
      const { error } = await supabase
        .from('installments')
        .update({ signature: data, signed_at: signedAt })
        .eq('id', installment.id);

      if (error) {
        console.error('Error saving signature:', error);
        alert('Erro ao salvar assinatura no banco de dados: ' + error.message);
        setSigned(false);
      } else {
        if (saveSignature) {
          saveSignature(installment.id, data);
        }
        alert('Assinatura registrada e salva com sucesso!');
      }
    } catch (err) {
      console.error('Error confirming signature:', err);
      alert('Erro ao processar assinatura.');
    } finally {
      setIsSaving(false);
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

  // Loading view
  if (isLoading) {
    return (
      <div className="receipt-page">
        <div className="receipt-container">
          <div className="receipt-not-found">
            <div className="receipt-not-found-icon" style={{ animation: 'pulse 1.5s infinite' }}>⏳</div>
            <h2>Carregando recibo...</h2>
            <p>Aguarde enquanto buscamos os dados no sistema.</p>
          </div>
        </div>
      </div>
    );
  }

  // Not found view
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
                <button
                  className="receipt-btn secondary no-print mt-12"
                  onClick={clearSignature}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  ✏️ Refazer Assinatura
                </button>
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
                  <button className="receipt-btn secondary" onClick={clearSignature} disabled={isSaving}>
                    🗑️ Limpar
                  </button>
                  <button className="receipt-btn primary" onClick={confirmSignature} disabled={isSaving}>
                    {isSaving ? '⏳ Salvando...' : '💾 Confirmar e Salvar Assinatura'}
                  </button>
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
