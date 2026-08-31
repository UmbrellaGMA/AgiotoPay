// Clean initial data schema for AgiotoPay

export const generateSampleData = () => {
  return {
    clients: [],
    loans: [],
    installments: [],
    payments: [],
    activities: [],
    notifications: [],
    markers: [
      { id: 'mrk_001', name: 'Cliente Prioritário', color: '#ef4444', icon: '🔥', description: 'Cliente com alta prioridade' },
      { id: 'mrk_002', name: 'Atenção', color: '#f59e0b', icon: '⚠️', description: 'Cliente que requer acompanhamento' },
      { id: 'mrk_003', name: 'Alto Valor', color: '#8b5cf6', icon: '💰', description: 'Empréstimo de alto valor' },
      { id: 'mrk_004', name: 'Vencimento Próximo', color: '#f97316', icon: '📅', description: 'Parcela próxima do vencimento' },
      { id: 'mrk_005', name: 'Bom Pagador', color: '#10b981', icon: '✅', description: 'Cliente com histórico positivo' },
    ],
    settings: {
      adminName: 'Administrador',
      companyName: 'AgiotoPay',
      currency: 'BRL',
      dateFormat: 'DD/MM/AAAA',
      alertDays: [0, 1, 3, 7],
      paymentMethods: ['Dinheiro', 'PIX', 'Transferência', 'Cartão', 'Outro'],
    },
  };
};
