import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getInstallmentStatus, getStatusLabel, getDaysUntilDue } from '../utils/formatters';
import { ArrowLeft, Info, MessageCircle, FileText, Link2, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loans, clients, installments, settings } = useApp();
  const [copiedId, setCopiedId] = useState(null);

  const loan = loans.find(l => l.id === id);
  if (!loan) return <div className="empty-state"><h3>Empréstimo / Débito não encontrado</h3></div>;

  const client = clients.find(c => c.id === loan.clientId);
  const insts = installments.filter(i => i.loanId === id).sort((a, b) => a.number - b.number);
  const totalPaid = insts.reduce((s, i) => s + i.paidAmount, 0);
  const saldoDevedor = loan.totalAmount - totalPaid;
  const progress = loan.totalAmount > 0 ? (totalPaid / loan.totalAmount * 100) : 0;

  const isInterestOnly = loan.calculationMode === 'interest_only_final_payoff';
  const statusColors = { paid: 'green', open: 'blue', near_due: 'yellow', due_today: 'orange', overdue: 'red', partial: 'gray', renegotiated: 'gray' };

  // Generate receipt URL
  const getReceiptUrl = (installment) => {
    return `${window.location.origin}/recibo/${installment.id}`;
  };

  // Copy receipt link
  const handleCopyLink = (installment) => {
    navigator.clipboard.writeText(getReceiptUrl(installment));
    setCopiedId(installment.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Generate WhatsApp message for collection
  const handleWhatsApp = (installment) => {
    const whatsappNumber = (client?.whatsapp || client?.phone || '').replace(/\D/g, '');
    if (!whatsappNumber) {
      alert('Este cliente não tem número de WhatsApp cadastrado. Cadastre na área do cliente.');
      return;
    }

    const st = getInstallmentStatus(installment);
    const saldo = installment.totalAmount - installment.paidAmount;
    const receiptLink = getReceiptUrl(installment);
    const companyName = settings?.companyName || 'AgiotoPay';

    let greeting = '';
    const hora = new Date().getHours();
    if (hora < 12) greeting = 'Bom dia';
    else if (hora < 18) greeting = 'Boa tarde';
    else greeting = 'Boa noite';

    let message = '';

    if (st === 'paid') {
      // Confirmation message for paid installment
      message = `${greeting}, ${client.name}! 🙏\n\n` +
        `✅ *Confirmação de Pagamento*\n\n` +
        `Informamos que o pagamento da parcela *${installment.number}/${loan.installmentCount}* ` +
        `do débito *"${loan.title}"* foi registrado com sucesso.\n\n` +
        `💰 Valor: *${formatCurrency(installment.totalAmount)}*\n` +
        `📅 Pago em: *${installment.paidDate ? formatDate(installment.paidDate) : 'N/A'}*\n\n` +
        `📄 Recibo disponível em:\n${receiptLink}\n\n` +
        `Obrigado pela pontualidade! 🤝\n` +
        `— *${companyName}*`;
    } else if (st === 'overdue') {
      const diasAtraso = Math.abs(getDaysUntilDue(installment.dueDate));
      // Overdue collection message
      message = `${greeting}, ${client.name}.\n\n` +
        `⚠️ *Aviso de Parcela em Atraso*\n\n` +
        `Identificamos que a parcela *${installment.number}/${loan.installmentCount}* ` +
        `do débito *"${loan.title}"* está com *${diasAtraso} dia(s) de atraso*.\n\n` +
        `📋 *Detalhes:*\n` +
        `• Vencimento: *${formatDate(installment.dueDate)}*\n` +
        `• Valor da parcela: *${formatCurrency(installment.totalAmount)}*\n` +
        `• Saldo pendente: *${formatCurrency(saldo)}*\n\n` +
        `📄 Recibo e assinatura digital:\n${receiptLink}\n\n` +
        `Por favor, regularize o pagamento o mais breve possível para evitar acúmulo.\n\n` +
        `Aguardamos seu retorno. 🤝\n` +
        `— *${companyName}*`;
    } else if (st === 'due_today') {
      // Due today message
      message = `${greeting}, ${client.name}!\n\n` +
        `🔔 *Lembrete: Parcela Vence Hoje*\n\n` +
        `A parcela *${installment.number}/${loan.installmentCount}* ` +
        `do débito *"${loan.title}"* vence *hoje*.\n\n` +
        `💰 Valor: *${formatCurrency(installment.totalAmount)}*\n\n` +
        `📄 Recibo e assinatura digital:\n${receiptLink}\n\n` +
        `Qualquer dúvida, estou à disposição. 🤝\n` +
        `— *${companyName}*`;
    } else {
      // Regular upcoming installment
      const diasRestantes = getDaysUntilDue(installment.dueDate);
      message = `${greeting}, ${client.name}!\n\n` +
        `📬 *Cobrança de Parcela*\n\n` +
        `Segue o lembrete referente à parcela *${installment.number}/${loan.installmentCount}* ` +
        `do débito *"${loan.title}"*.\n\n` +
        `📋 *Detalhes:*\n` +
        `• Vencimento: *${formatDate(installment.dueDate)}* (em ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''})\n` +
        `• Valor da parcela: *${formatCurrency(installment.totalAmount)}*\n`;

      if (installment.paidAmount > 0) {
        message += `• Já pago: *${formatCurrency(installment.paidAmount)}*\n` +
          `• Saldo restante: *${formatCurrency(saldo)}*\n`;
      }

      message += `\n📄 Recibo e assinatura digital:\n${receiptLink}\n\n` +
        `Qualquer dúvida, estou à disposição. 🤝\n` +
        `— *${companyName}*`;
    }

    const encoded = encodeURIComponent(message);
    const fullNumber = whatsappNumber.startsWith('55') ? whatsappNumber : `55${whatsappNumber}`;
    window.open(`https://wa.me/${fullNumber}?text=${encoded}`, '_blank');
  };

  return (
    <>
      <button className="btn btn-secondary mb-16" onClick={() => navigate('/emprestimos')}><ArrowLeft size={16} /> Voltar</button>

      <div className="profile-header mb-16">
        <div className="profile-info" style={{ width: '100%' }}>
          <div className="flex-between">
            <div>
              <h2>{loan.title || `Débito #${id.slice(-6).toUpperCase()}`}</h2>
              <div className="flex align-center gap-8 mt-4">
                <small className="text-muted">Código: #{id.slice(-6).toUpperCase()}</small>
                <span>•</span>
                <small className="text-muted">Cliente: <strong className="clickable" onClick={() => navigate(`/clientes/${loan.clientId}`)} style={{ color: 'var(--accent-hover)' }}>{client?.name}</strong></small>
                <span className="badge-status gray">
                  {isInterestOnly ? 'Juros Periódicos + Quitação Final' : 'Capital + Juros Amortizados'}
                </span>
              </div>
            </div>
            <span className={`badge-status ${loan.status === 'active' ? 'blue' : 'green'}`}>{loan.status === 'active' ? 'Ativo' : 'Quitado'}</span>
          </div>
        </div>
      </div>

      {isInterestOnly && (
        <div className="stat-card mb-16" style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <div className="flex align-center gap-8 text-blue">
            <Info size={18} />
            <strong>Modalidade: Juros Periódicos com Quitação Final do Capital</strong>
          </div>
          <p style={{ marginTop: 6, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Nesta modalidade, as parcelas intermediárias se referem exclusivamente ao pagamento dos juros. O capital principal de <strong>{formatCurrency(loan.principalAmount)}</strong> é mantido integralmente em aberto até a quitação final.
          </p>
        </div>
      )}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <div className="stat-card blue"><div className="stat-card-label">Capital Principal</div><div className="stat-card-value" style={{ fontSize: '1.2rem' }}>{formatCurrency(loan.principalAmount)}</div></div>
        <div className="stat-card yellow"><div className="stat-card-label">Juros ({loan.interestRate}%)</div><div className="stat-card-value" style={{ fontSize: '1.2rem' }}>{formatCurrency(loan.totalInterest)}</div></div>
        <div className="stat-card purple"><div className="stat-card-label">Valor Total Débito</div><div className="stat-card-value" style={{ fontSize: '1.2rem' }}>{formatCurrency(loan.totalAmount)}</div></div>
        <div className="stat-card green"><div className="stat-card-label">Total Pago</div><div className="stat-card-value text-green" style={{ fontSize: '1.2rem' }}>{formatCurrency(totalPaid)}</div></div>
        <div className="stat-card red"><div className="stat-card-label">Saldo Devedor</div><div className="stat-card-value text-red" style={{ fontSize: '1.2rem' }}>{formatCurrency(saldoDevedor)}</div></div>
        <div className="stat-card accent"><div className="stat-card-label">Progresso</div><div className="stat-card-value" style={{ fontSize: '1.2rem' }}>{progress.toFixed(0)}%</div>
          <div style={{ background: 'var(--bg-input)', borderRadius: 4, height: 6, marginTop: 8 }}>
            <div style={{ background: 'var(--green)', borderRadius: 4, height: '100%', width: `${progress}%`, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      </div>

      <div className="table-card mt-24">
        <div className="table-card-header"><h3>Cronograma de Parcelas e Quitações</h3></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Vencimento</th><th>Capital</th><th>Juros</th><th>Total</th><th>Pago</th><th>Saldo</th><th>Status</th><th>Dias</th><th>Ações</th></tr></thead>
            <tbody>
              {insts.map(i => {
                const st = getInstallmentStatus(i);
                const days = getDaysUntilDue(i.dueDate);
                const isPaid = i.paidAmount >= i.totalAmount;
                return (
                  <tr key={i.id}>
                    <td>{i.number}</td>
                    <td>{formatDate(i.dueDate)}</td>
                    <td>{formatCurrency(i.principalAmount)}</td>
                    <td>{formatCurrency(i.interestAmount)}</td>
                    <td><strong>{formatCurrency(i.totalAmount)}</strong></td>
                    <td className="text-green">{formatCurrency(i.paidAmount)}</td>
                    <td className="text-red">{formatCurrency(i.totalAmount - i.paidAmount)}</td>
                    <td><span className={`badge-status ${statusColors[st]}`}>{getStatusLabel(st)}</span></td>
                    <td>{st === 'paid' ? '-' : st === 'overdue' ? <span className="text-red font-bold">{Math.abs(days)}d atraso</span> : `${days}d`}</td>
                    <td>
                      <div className="flex gap-4" style={{ flexWrap: 'nowrap' }}>
                        {/* WhatsApp Button */}
                        <button
                          className="btn-action whatsapp"
                          title={isPaid ? 'Enviar Confirmação via WhatsApp' : 'Enviar Cobrança via WhatsApp'}
                          onClick={() => handleWhatsApp(i)}
                        >
                          <MessageCircle size={14} />
                        </button>

                        {/* Receipt Link Button */}
                        <button
                          className="btn-action receipt"
                          title="Abrir Recibo com Assinatura Digital"
                          onClick={() => window.open(getReceiptUrl(i), '_blank')}
                        >
                          <FileText size={14} />
                        </button>

                        {/* Copy Link Button */}
                        <button
                          className="btn-action copy-link"
                          title="Copiar Link do Recibo"
                          onClick={() => handleCopyLink(i)}
                        >
                          {copiedId === i.id ? <Check size={14} /> : <Link2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {loan.notes && (
        <div className="stat-card mt-24" style={{ background: 'var(--bg-card)' }}>
          <div className="stat-card-label">Observações</div>
          <p style={{ marginTop: 8, color: 'var(--text-secondary)' }}>{loan.notes}</p>
        </div>
      )}
    </>
  );
}
