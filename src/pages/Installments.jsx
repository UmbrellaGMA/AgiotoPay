import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getInstallmentStatus, getStatusLabel, getDaysUntilDue } from '../utils/formatters';
import { MessageCircle, FileText, Link2, Check } from 'lucide-react';

export default function Installments() {
  const { installments, loans, clients, settings } = useApp();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const instData = useMemo(() => {
    return installments.map(i => {
      const loan = loans.find(l => l.id === i.loanId);
      const client = clients.find(c => c.id === i.clientId);
      const status = getInstallmentStatus(i);
      const days = getDaysUntilDue(i.dueDate);
      return {
        ...i,
        clientObj: client,
        loanObj: loan,
        clientName: client?.name || '-',
        loanStatus: loan?.status,
        computedStatus: status,
        days
      };
    }).filter(i => i.loanStatus === 'active');
  }, [installments, loans, clients]);

  const filtered = useMemo(() => {
    let r = instData;
    if (search) { const q = search.toLowerCase(); r = r.filter(i => i.clientName.toLowerCase().includes(q)); }
    if (filter === 'open') r = r.filter(i => i.computedStatus === 'open');
    else if (filter === 'paid') r = r.filter(i => i.computedStatus === 'paid');
    else if (filter === 'overdue') r = r.filter(i => i.computedStatus === 'overdue');
    else if (filter === 'near_due') r = r.filter(i => i.computedStatus === 'near_due' || i.computedStatus === 'due_today');
    else if (filter === 'partial') r = r.filter(i => i.computedStatus === 'partial');
    return [...r].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  }, [instData, filter, search]);

  const statusColors = { paid: 'green', open: 'blue', near_due: 'yellow', due_today: 'orange', overdue: 'red', partial: 'gray', renegotiated: 'gray' };
  const statusEmojis = { paid: '🟢', open: '🔵', near_due: '🟡', due_today: 'orange', overdue: '🔴', partial: '⚫', renegotiated: '⚪' };

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
    const client = installment.clientObj;
    const loan = installment.loanObj;
    const whatsappNumber = (client?.whatsapp || client?.phone || '').replace(/\D/g, '');
    if (!whatsappNumber) {
      alert('Este cliente não tem número de WhatsApp cadastrado. Cadastre na área do cliente.');
      return;
    }

    const st = installment.computedStatus;
    const saldo = installment.totalAmount - installment.paidAmount;
    const companyName = settings?.companyName || 'AgiotoPay';

    let greeting = '';
    const hora = new Date().getHours();
    if (hora < 12) greeting = 'Bom dia';
    else if (hora < 18) greeting = 'Boa tarde';
    else greeting = 'Boa noite';

    let message = '';

    if (st === 'paid') {
      message = `${greeting}, ${client.name}! 🙏\n\n` +
        `✅ *Confirmação de Pagamento*\n\n` +
        `Informamos que o pagamento da parcela *${installment.number}/${loan?.installmentCount || 1}* ` +
        `do débito *"${loan?.title || 'Empréstimo'}"* foi registrado com sucesso.\n\n` +
        `💰 Valor: *${formatCurrency(installment.totalAmount)}*\n` +
        `📅 Pago em: *${installment.paidDate ? formatDate(installment.paidDate) : 'N/A'}*\n\n` +
        `📄 Recibo disponível em:\n${getReceiptUrl(installment)}\n\n` +
        `Obrigado pela pontualidade! 🤝\n` +
        `— *${companyName}*`;
    } else if (st === 'overdue') {
      const diasAtraso = Math.abs(getDaysUntilDue(installment.dueDate));
      message = `${greeting}, ${client.name}.\n\n` +
        `⚠️ *Aviso de Parcela em Atraso*\n\n` +
        `Identificamos que a parcela *${installment.number}/${loan?.installmentCount || 1}* ` +
        `do débito *"${loan?.title || 'Empréstimo'}"* está com *${diasAtraso} dia(s) de atraso*.\n\n` +
        `📋 *Detalhes:*\n` +
        `• Vencimento: *${formatDate(installment.dueDate)}*\n` +
        `• Valor da parcela: *${formatCurrency(installment.totalAmount)}*\n` +
        `• Saldo pendente: *${formatCurrency(saldo)}*\n\n` +
        `📄 Recibo para assinatura e conferência:\n${getReceiptUrl(installment)}\n\n` +
        `Por favor, regularize o pagamento o mais breve possível.\n\n` +
        `Aguardamos seu retorno. 🤝\n` +
        `— *${companyName}*`;
    } else if (st === 'due_today') {
      message = `${greeting}, ${client.name}!\n\n` +
        `🔔 *Lembrete: Parcela Vence Hoje*\n\n` +
        `A parcela *${installment.number}/${loan?.installmentCount || 1}* ` +
        `do débito *"${loan?.title || 'Empréstimo'}"* vence *hoje*.\n\n` +
        `💰 Valor: *${formatCurrency(installment.totalAmount)}*\n\n` +
        `📄 Recibo e Assinatura Digital:\n${getReceiptUrl(installment)}\n\n` +
        `Qualquer dúvida, estou à disposição. 🤝\n` +
        `— *${companyName}*`;
    } else {
      const diasRestantes = getDaysUntilDue(installment.dueDate);
      message = `${greeting}, ${client.name}!\n\n` +
        `📬 *Cobrança de Parcela*\n\n` +
        `Segue o lembrete referente à parcela *${installment.number}/${loan?.installmentCount || 1}* ` +
        `do débito *"${loan?.title || 'Empréstimo'}"*.\n\n` +
        `📋 *Detalhes:*\n` +
        `• Vencimento: *${formatDate(installment.dueDate)}* (em ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''})\n` +
        `• Valor da parcela: *${formatCurrency(installment.totalAmount)}*\n`;

      if (installment.paidAmount > 0) {
        message += `• Já pago: *${formatCurrency(installment.paidAmount)}*\n` +
          `• Saldo restante: *${formatCurrency(saldo)}*\n`;
      }

      message += `\n📄 Recibo:\n${getReceiptUrl(installment)}\n\n` +
        `Qualquer dúvida, estou à disposição. 🤝\n` +
        `— *${companyName}*`;
    }

    const encoded = encodeURIComponent(message);
    const fullNumber = whatsappNumber.startsWith('55') ? whatsappNumber : `55${whatsappNumber}`;
    window.open(`https://wa.me/${fullNumber}?text=${encoded}`, '_blank');
  };

  return (
    <>
      <div className="page-header"><div><h1>Controle de Parcelas</h1><p>{instData.length} parcelas em empréstimos ativos</p></div></div>

      <div className="filters-bar">
        <input className="search-input" placeholder="Pesquisar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        {['all', 'open', 'near_due', 'overdue', 'partial', 'paid'].map(f => (
          <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {{ all: 'Todas', open: '🔵 Em Aberto', near_due: '🟡 Próximas', overdue: '🔴 Atrasadas', partial: '⚫ Parciais', paid: '🟢 Pagas' }[f]}
          </button>
        ))}
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Cliente</th><th>Vencimento</th><th>Valor</th><th>Juros</th><th>Total</th><th>Pago</th><th>Saldo</th><th>Status</th><th>Dias</th><th>Ações</th></tr></thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id}>
                  <td>{i.number}</td>
                  <td><strong>{i.clientName}</strong></td>
                  <td>{formatDate(i.dueDate)}</td>
                  <td>{formatCurrency(i.principalAmount)}</td>
                  <td>{formatCurrency(i.interestAmount)}</td>
                  <td>{formatCurrency(i.totalAmount)}</td>
                  <td className="text-green">{formatCurrency(i.paidAmount)}</td>
                  <td className="text-red">{formatCurrency(i.totalAmount - i.paidAmount)}</td>
                  <td><span className={`badge-status ${statusColors[i.computedStatus]}`}>{statusEmojis[i.computedStatus]} {getStatusLabel(i.computedStatus)}</span></td>
                  <td>{i.computedStatus === 'paid' ? '-' : i.computedStatus === 'overdue' ? <span className="text-red font-bold">{Math.abs(i.days)}d</span> : `${i.days}d`}</td>
                  <td>
                    <div className="flex gap-4" style={{ flexWrap: 'nowrap' }}>
                      {/* WhatsApp Button */}
                      <button
                        className="btn-action whatsapp"
                        title={i.computedStatus === 'paid' ? 'Enviar Confirmação via WhatsApp' : 'Enviar Cobrança via WhatsApp'}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
