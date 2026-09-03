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
  const { installments = [], loans = [], clients = [], settings: globalSettings = {}, saveSignature, loading: contextLoading } = useApp() || {};
  const canvasRef = useRef(null);

  const [directData, setDirectData] = useState(null);
  const [directLoading, setDirectLoading] = useState(false);
  const [signed, setSigned] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Try finding records in global context using case-insensitive comparison
  const contextInstallment = installments.find(i => String(i.id || '').toLowerCase() === String(id || '').toLowerCase());
  const contextLoan = contextInstallment ? loans.find(l => String(l.id || '').toLowerCase() === String(contextInstallment.loanId || '').toLowerCase()) : null;
  const contextClient = contextLoan ? clients.find(c => String(c.id || '').toLowerCase() === String(contextLoan.clientId || '').toLowerCase()) : null;

  // 2. Direct fetch fallback if missing from context
  useEffect(() => {
    let isMounted = true;

    if (contextInstallment && contextLoan && contextClient) {
      setDirectLoading(false);
      return;
    }
    if (!id) return;

    setDirectLoading(true);

    async function loadDirectReceipt() {
      try {
        const { data: inst, error: instErr } = await supabase
          .from('installments')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (instErr || !inst) {
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

        if (isMounted) {
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
        if (isMounted) {
          setDirectLoading(false);
        }
      }
    }

    loadDirectReceipt();

    return () => { isMounted = false; };
  }, [id, contextInstallment, contextLoan, contextClient]);

  const installment = contextInstallment || directData?.installment;
  const loan = contextLoan || directData?.loan;
  const client = contextClient || directData?.client;
  const settings = (globalSettings && Object.keys(globalSettings).length > 0) ? globalSettings : (directData?.settings || {});

  const hasData = Boolean(installment && loan && client);
  const isLoading = !hasData && (contextLoading || directLoading);

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
    const t1 = setTimeout(initCanvas, 100);
    const t2 = setTimeout(initCanvas, 400);
    window.addEventListener('resize', initCanvas);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', initCanvas);
    };
  }, [initCanvas, installment, signed]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    const touch = e.touches?.[0] || e.changedTouches?.[0];
    if (touch) {
      clientX = touch.clientX;
      clientY = touch.clientY;
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
    if (e.cancelable) e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = () => {
    if (!drawing) return;
    setDrawing(false);
  };

  const clearSignature = () => {
    setSigned(false);
    setSignatureData(null);
    setTimeout(initCanvas, 50);
  };

  const confirmSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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

  const saldo = (installment.totalAmount || 0) - (installment.paidAmount || 0);
  const isPaid = (installment.paidAmount || 0) >= (installment.totalAmount || 0);
  const isInterestOnly = loan.calculationMode === 'interest_only_final_payoff';
  const now = new Date();
  const signedDateStr = installment.signedAt ? new Date(installment.signedAt).toLocaleDateString('pt-BR') : now.toLocaleDateString('pt-BR');
  const signedTimeStr = installment.signedAt ? new Date(installment.signedAt).toLocaleTimeString('pt-BR') : now.toLocaleTimeString('pt-BR');

  return (
    <div className="receipt-page">
      <div className="receipt-container">
        {/* Actions bar — hidden on print */}
        <div className="receipt-actions no-print">
          <button className="receipt-btn secondary" onClick={copyLink}>
            {copied ? '✅ Link Copiado!' : '🔗 Copiar Link'}
          </button>
          <button className="receipt-btn primary" onClick={handlePrint}>
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>

        {/* Printable Receipt Card */}
        <div className="receipt-card">
          {/* Watermark Logo Background */}
          <div className="receipt-watermark" aria-hidden="true">
            <img src="/logo-icon.png" alt="AgiotoPay Marca D'água" />
          </div>

          {/* Header */}
          <div className="receipt-header">
            <div className="receipt-header-brand">
              <Logo size={36} showSubtitle={true} />
              <div className="receipt-company-info mt-8">
                <strong>{settings.companyName || 'AgiotoPay'}</strong>
                {settings.adminName && <span>Resp.: {settings.adminName}</span>}
              </div>
            </div>
            <div className="receipt-badge-wrap">
              <span className={`receipt-badge ${isPaid ? 'paid' : 'pending'}`}>
                {isPaid ? 'PAGO' : 'EM ABERTO'}
              </span>
              <div className="receipt-number mt-8">
                RECIBO Nº #{String(installment.id || '').slice(-8).toUpperCase()}
              </div>
            </div>
          </div>

          <div className="receipt-divider" />

          {/* Client & Loan Details */}
          <div className="receipt-grid">
            <div className="receipt-section">
              <h4 className="receipt-section-title">CLIENTE</h4>
              <div className="receipt-field">
                <label>Nome:</label>
                <span>{client.name || '-'}</span>
              </div>
              {client.cpf && (
                <div className="receipt-field">
                  <label>CPF:</label>
                  <span>{client.cpf}</span>
                </div>
              )}
              {client.phone && (
                <div className="receipt-field">
                  <label>Telefone:</label>
                  <span>{client.phone}</span>
                </div>
              )}
            </div>

            <div className="receipt-section">
              <h4 className="receipt-section-title">DETALHES DO DÉBITO</h4>
              <div className="receipt-field">
                <label>Título / Contrato:</label>
                <span>{loan.title || `Débito #${String(loan.id || '').slice(-6).toUpperCase()}`}</span>
              </div>
              <div className="receipt-field">
                <label>Modalidade:</label>
                <span>{isInterestOnly ? 'Juros Periódicos' : 'Amortizado'}</span>
              </div>
              <div className="receipt-field">
                <label>Capital Principal:</label>
                <span>{formatCurrency(loan.principalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="receipt-divider" />

          {/* Installment Summary */}
          <div className="receipt-section mb-16">
            <h4 className="receipt-section-title">PARCELA E VALORES</h4>
            <div className="receipt-table-wrap">
              <table className="receipt-table">
                <thead>
                  <tr>
                    <th>Parcela</th>
                    <th>Vencimento</th>
                    <th>Juros</th>
                    <th>Valor Parcela</th>
                    <th>Valor Pago</th>
                    <th>Saldo Restante</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>{installment.number} / {loan.installmentCount}</strong></td>
                    <td>{formatDate(installment.dueDate)}</td>
                    <td>{formatCurrency(installment.interestAmount)}</td>
                    <td><strong>{formatCurrency(installment.totalAmount)}</strong></td>
                    <td className="text-green"><strong>{formatCurrency(installment.paidAmount)}</strong></td>
                    <td className="text-red"><strong>{formatCurrency(saldo)}</strong></td>
                  </tr>
                </tbody>
                </table>
            </div>
          </div>

          {/* Declaration Text */}
          <div className="receipt-declaration">
            <p>
              Declaramos para os devidos fins que o(a) Sr(a). <strong>{client.name}</strong> efetuou o pagamento da quantia de{' '}
              <strong>{formatCurrency(installment.paidAmount || 0)}</strong> referente à parcela{' '}
              <strong>#{installment.number}</strong> do débito <strong>"{loan.title || 'Empréstimo'}"</strong>.
            </p>
          </div>

          {/* Signature Section */}
          <div className="receipt-signature-section">
            <h4 className="receipt-section-title">ASSINATURA DIGITAL DO CLIENTE</h4>
            {signed && signatureData ? (
              <div className="receipt-signed-box">
                <img src={signatureData} alt="Assinatura Digital" className="receipt-signature-img" />
                <div className="receipt-signature-meta">
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
                  style={{ touchAction: 'none' }}
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
            <p>Emitido em {now.toLocaleDateString('pt-BR')} às {now.toLocaleTimeString('pt-BR')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
