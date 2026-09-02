// Currency and date formatters for Brazilian format

export const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const cleanStr = String(dateStr).split('T')[0];
  const date = new Date(cleanStr + 'T00:00:00');
  if (isNaN(date.getTime())) return String(dateStr);
  return date.toLocaleDateString('pt-BR');
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return String(dateStr);
  return date.toLocaleString('pt-BR');
};

export const formatPhone = (phone) => {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

export const formatCPF = (cpf) => {
  if (!cpf) return '-';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }
  return cpf;
};

export const getDaysUntilDue = (dueDate) => {
  if (!dueDate) return 0;
  const cleanStr = String(dueDate).split('T')[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(cleanStr + 'T00:00:00');
  if (isNaN(due.getTime())) return 0;
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getInstallmentStatus = (installment) => {
  if (!installment) return 'open';
  if (installment.status === 'renegotiated') return 'renegotiated';
  const paid = installment.paidAmount || 0;
  const total = installment.totalAmount || 0;
  if (paid >= total && total > 0) return 'paid';
  if (paid > 0 && paid < total) return 'partial';

  const days = getDaysUntilDue(installment.dueDate);
  if (days < 0) return 'overdue';
  if (days === 0) return 'due_today';
  if (days <= 3) return 'near_due';
  return 'open';
};

export const getStatusLabel = (status) => {
  const labels = {
    paid: 'Paga',
    open: 'Em Aberto',
    near_due: 'Próxima do Vencimento',
    due_today: 'Vence Hoje',
    overdue: 'Atrasada',
    partial: 'Pagamento Parcial',
    renegotiated: 'Renegociada',
  };
  return labels[status] || status;
};

export const getStatusColor = (status) => {
  const colors = {
    paid: '#10b981',
    open: '#3b82f6',
    near_due: '#f59e0b',
    due_today: '#f97316',
    overdue: '#ef4444',
    partial: '#374151',
    renegotiated: '#9ca3af',
  };
  return colors[status] || '#6b7280';
};

export const getClientStatus = (client, loans = [], installments = []) => {
  if (!client || !client.id) return 'sem_emprestimos';
  const clientLoans = (loans || []).filter(l => l && (l.clientId === client.id || String(l.clientId || '').toLowerCase() === String(client.id).toLowerCase()) && l.status === 'active');
  if (clientLoans.length === 0) {
    const hasQuitado = (loans || []).some(l => l && (l.clientId === client.id || String(l.clientId || '').toLowerCase() === String(client.id).toLowerCase()) && l.status === 'completed');
    return hasQuitado ? 'quitado' : 'sem_emprestimos';
  }

  const clientInstallments = (installments || []).filter(i =>
    i && clientLoans.some(l => String(l.id || '').toLowerCase() === String(i.loanId || '').toLowerCase()) && getInstallmentStatus(i) !== 'paid'
  );

  const overdueInsts = clientInstallments.filter(i => getInstallmentStatus(i) === 'overdue');
  const hasOverdue = overdueInsts.length > 0;
  const hasDueToday = clientInstallments.some(i => getInstallmentStatus(i) === 'due_today');
  const hasNearDue = clientInstallments.some(i => getInstallmentStatus(i) === 'near_due');

  if (hasOverdue) {
    const overdueDays = overdueInsts.map(i => Math.abs(getDaysUntilDue(i.dueDate)));
    const maxDays = overdueDays.length > 0 ? Math.max(...overdueDays) : 0;
    if (maxDays > 30) return 'critico';
    return 'atrasado';
  }
  if (hasDueToday) return 'vence_hoje';
  if (hasNearDue) return 'proximo_vencimento';
  return 'em_dia';
};

export const getClientStatusLabel = (status) => {
  const labels = {
    em_dia: 'Em Dia',
    proximo_vencimento: 'Próximo do Vencimento',
    vence_hoje: 'Vence Hoje',
    atrasado: 'Atrasado',
    critico: 'Crítico',
    quitado: 'Quitado',
    sem_emprestimos: 'Sem Empréstimos',
  };
  return labels[status] || status;
};

export const getClientStatusColor = (status) => {
  const colors = {
    em_dia: '#10b981',
    proximo_vencimento: '#f59e0b',
    vence_hoje: '#f97316',
    atrasado: '#ef4444',
    critico: '#7f1d1d',
    quitado: '#6b7280',
    sem_emprestimos: '#9ca3af',
  };
  return colors[status] || '#6b7280';
};

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};
