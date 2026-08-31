import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { generateSampleData } from '../utils/sampleData';
import { generateId, getInstallmentStatus } from '../utils/formatters';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

const STORAGE_KEY = 'agiotopay_data';

const loadData = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // If stored data contains sample data (like cli_001), clear it to keep system clean
      if (parsed.clients && parsed.clients.some(c => c.id === 'cli_001')) {
        localStorage.removeItem(STORAGE_KEY);
        return generateSampleData();
      }
      return parsed;
    }
  } catch (e) {
    console.error('Error loading data:', e);
  }
  return generateSampleData();
};

const saveData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving data:', e);
  }
};

export const AppProvider = ({ children }) => {
  const [data, setData] = useState(loadData);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const addActivity = useCallback((type, description, relatedId = null) => {
    const activity = {
      id: generateId(),
      type,
      description,
      date: new Date().toISOString(),
      relatedId,
    };
    setData(prev => ({
      ...prev,
      activities: [activity, ...prev.activities],
    }));
  }, []);

  const addNotification = useCallback((type, message, relatedId = null) => {
    const notification = {
      id: generateId(),
      type,
      message,
      date: new Date().toISOString().split('T')[0],
      read: false,
      relatedId,
    };
    setData(prev => ({
      ...prev,
      notifications: [notification, ...prev.notifications],
    }));
  }, []);

  // Client CRUD
  const addClient = useCallback((client) => {
    const newClient = {
      ...client,
      id: generateId(),
      createdAt: new Date().toISOString(),
      tags: client.tags || [],
    };
    setData(prev => ({
      ...prev,
      clients: [...prev.clients, newClient],
    }));
    addActivity('client_created', `Novo cliente cadastrado: ${client.name}`, newClient.id);
    return newClient;
  }, [addActivity]);

  const updateClient = useCallback((id, updates) => {
    setData(prev => ({
      ...prev,
      clients: prev.clients.map(c => c.id === id ? { ...c, ...updates } : c),
    }));
    addActivity('client_updated', `Cliente atualizado: ${updates.name || id}`, id);
  }, [addActivity]);

  const deleteClient = useCallback((id) => {
    setData(prev => ({
      ...prev,
      clients: prev.clients.filter(c => c.id !== id),
    }));
    addActivity('client_deleted', `Cliente removido`, id);
  }, [addActivity]);

  // Loan CRUD
  const addLoan = useCallback((loan) => {
    const newLoan = {
      ...loan,
      id: loan.id || generateId(),
      title: loan.title || 'Empréstimo Sem Título',
      calculationMode: loan.calculationMode || 'amortized', // 'amortized' or 'interest_only_final_payoff'
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const count = parseInt(newLoan.installmentCount) || 1;
    const isInterestOnly = newLoan.calculationMode === 'interest_only_final_payoff';

    const newInstallments = [];
    if (isInterestOnly) {
      // In interest_only_final_payoff mode:
      // Installments 1 to (count - 1): Interest only, 0 principal amortized
      // Installment count: Interest + Full Principal payoff
      const interestPerInst = Math.round((newLoan.totalInterest / count) * 100) / 100;

      for (let i = 0; i < count; i++) {
        const dueDate = new Date(newLoan.firstDueDate + 'T00:00:00');
        if (newLoan.periodicity === 'monthly') dueDate.setMonth(dueDate.getMonth() + i);
        else if (newLoan.periodicity === 'weekly') dueDate.setDate(dueDate.getDate() + (i * 7));
        else if (newLoan.periodicity === 'biweekly') dueDate.setDate(dueDate.getDate() + (i * 15));
        else if (newLoan.periodicity === 'daily') dueDate.setDate(dueDate.getDate() + i);

        const isLast = i === count - 1;
        const principalAmount = isLast ? newLoan.principalAmount : 0;
        const interestAmount = interestPerInst;
        const totalAmount = principalAmount + interestAmount;

        newInstallments.push({
          id: `inst_${newLoan.id}_${i + 1}`,
          loanId: newLoan.id,
          clientId: newLoan.clientId,
          number: i + 1,
          dueDate: dueDate.toISOString().split('T')[0],
          principalAmount: Math.round(principalAmount * 100) / 100,
          interestAmount: Math.round(interestAmount * 100) / 100,
          totalAmount: Math.round(totalAmount * 100) / 100,
          paidAmount: 0,
          paidDate: null,
          status: 'open',
        });
      }

      // Update overall loan totalAmount to equal sum of all installments (Interest * count + Principal)
      newLoan.totalAmount = newInstallments.reduce((sum, inst) => sum + inst.totalAmount, 0);
    } else {
      // Standard Amortized mode
      const installmentAmount = newLoan.totalAmount / count;
      const principalPerInst = newLoan.principalAmount / count;
      const interestPerInst = newLoan.totalInterest / count;

      for (let i = 0; i < count; i++) {
        const dueDate = new Date(newLoan.firstDueDate + 'T00:00:00');
        if (newLoan.periodicity === 'monthly') dueDate.setMonth(dueDate.getMonth() + i);
        else if (newLoan.periodicity === 'weekly') dueDate.setDate(dueDate.getDate() + (i * 7));
        else if (newLoan.periodicity === 'biweekly') dueDate.setDate(dueDate.getDate() + (i * 15));
        else if (newLoan.periodicity === 'daily') dueDate.setDate(dueDate.getDate() + i);

        newInstallments.push({
          id: `inst_${newLoan.id}_${i + 1}`,
          loanId: newLoan.id,
          clientId: newLoan.clientId,
          number: i + 1,
          dueDate: dueDate.toISOString().split('T')[0],
          principalAmount: Math.round(principalPerInst * 100) / 100,
          interestAmount: Math.round(interestPerInst * 100) / 100,
          totalAmount: Math.round(installmentAmount * 100) / 100,
          paidAmount: 0,
          paidDate: null,
          status: 'open',
        });
      }
    }

    setData(prev => {
      const client = prev.clients.find(c => c.id === newLoan.clientId);
      return {
        ...prev,
        loans: [...prev.loans, newLoan],
        installments: [...prev.installments, ...newInstallments],
      };
    });

    const client = data.clients.find(c => c.id === newLoan.clientId);
    addActivity('loan_created', `Novo débito "${newLoan.title}": R$ ${newLoan.principalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para ${client?.name || 'Cliente'}`, newLoan.id);
    addNotification('loan_created', `Novo débito "${newLoan.title}" criado para ${client?.name || 'Cliente'}`, newLoan.id);

    return newLoan;
  }, [data.clients, addActivity, addNotification]);

  const updateLoan = useCallback((id, updates) => {
    setData(prev => ({
      ...prev,
      loans: prev.loans.map(l => l.id === id ? { ...l, ...updates } : l),
    }));
    addActivity('loan_updated', `Empréstimo atualizado`, id);
  }, [addActivity]);

  // Payment
  const registerPayment = useCallback((paymentData) => {
    const payment = {
      ...paymentData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };

    setData(prev => {
      let newInstallments = [...prev.installments];
      let remainingAmount = payment.amount;

      payment.installmentIds.forEach(instId => {
        const idx = newInstallments.findIndex(i => i.id === instId);
        if (idx !== -1) {
          const inst = { ...newInstallments[idx] };
          const remaining = inst.totalAmount - inst.paidAmount;
          const payForThis = Math.min(remainingAmount, remaining);
          inst.paidAmount += payForThis;
          inst.paidDate = payment.date;
          remainingAmount -= payForThis;

          if (inst.paidAmount >= inst.totalAmount) {
            inst.status = 'paid';
          } else if (inst.paidAmount > 0) {
            inst.status = 'partial';
          }

          newInstallments[idx] = inst;
        }
      });

      // Check if loan is completed
      const loanId = payment.loanId;
      const loanInstallments = newInstallments.filter(i => i.loanId === loanId);
      const allPaid = loanInstallments.every(i => i.paidAmount >= i.totalAmount);

      let newLoans = prev.loans;
      if (allPaid) {
        newLoans = prev.loans.map(l => l.id === loanId ? { ...l, status: 'completed' } : l);
      }

      return {
        ...prev,
        payments: [payment, ...prev.payments],
        installments: newInstallments,
        loans: newLoans,
      };
    });

    const client = data.clients.find(c => c.id === paymentData.clientId);
    addActivity('payment', `Pagamento de R$ ${paymentData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} recebido de ${client?.name || 'Cliente'}`, payment.id);
    addNotification('payment', `${client?.name || 'Cliente'} realizou um pagamento de R$ ${paymentData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, payment.id);

    return payment;
  }, [data.clients, addActivity, addNotification]);

  // Notifications
  const markNotificationRead = useCallback((id) => {
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
    }));
  }, []);

  // Markers
  const addMarker = useCallback((marker) => {
    const newMarker = { ...marker, id: generateId() };
    setData(prev => ({
      ...prev,
      markers: [...prev.markers, newMarker],
    }));
    return newMarker;
  }, []);

  const deleteMarker = useCallback((id) => {
    setData(prev => ({
      ...prev,
      markers: prev.markers.filter(m => m.id !== id),
    }));
  }, []);

  // Settings
  const updateSettings = useCallback((updates) => {
    setData(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }));
  }, []);

  // Reset data
  const resetData = useCallback(() => {
    const freshData = generateSampleData();
    setData(freshData);
    saveData(freshData);
  }, []);

  // Computed values
  const getClientLoans = useCallback((clientId) => {
    return data.loans.filter(l => l.clientId === clientId);
  }, [data.loans]);

  const getClientInstallments = useCallback((clientId) => {
    return data.installments.filter(i => i.clientId === clientId);
  }, [data.installments]);

  const getLoanInstallments = useCallback((loanId) => {
    return data.installments.filter(i => i.loanId === loanId);
  }, [data.installments]);

  const getClientPayments = useCallback((clientId) => {
    return data.payments.filter(p => p.clientId === clientId);
  }, [data.payments]);

  // Dashboard stats
  const stats = (() => {
    const activeLoans = data.loans.filter(l => l.status === 'active');
    const completedLoans = data.loans.filter(l => l.status === 'completed');

    const capitalEmprestado = activeLoans.reduce((sum, l) => sum + l.principalAmount, 0);
    const totalAReceber = activeLoans.reduce((sum, l) => sum + l.totalAmount, 0);
    const lucroPrevisto = activeLoans.reduce((sum, l) => sum + l.totalInterest, 0);

    const activeInstallments = data.installments.filter(i =>
      activeLoans.some(l => l.id === i.loanId)
    );

    const totalPaidActive = activeInstallments.reduce((sum, i) => sum + i.paidAmount, 0);
    const totalPaidCompleted = data.installments
      .filter(i => completedLoans.some(l => l.id === i.loanId))
      .reduce((sum, i) => sum + i.paidAmount, 0);

    const valorRecebido = totalPaidActive + totalPaidCompleted;
    const dinheiroNaRua = totalAReceber - totalPaidActive;

    // Calculate realized profit
    const totalPrincipalPaid = activeInstallments
      .reduce((sum, i) => sum + Math.min(i.paidAmount, i.principalAmount), 0);
    const lucroRealizadoActive = totalPaidActive - totalPrincipalPaid;
    const lucroRealizadoCompleted = completedLoans.reduce((sum, l) => sum + l.totalInterest, 0);
    const lucroRealizado = lucroRealizadoActive + lucroRealizadoCompleted;

    // Overdue installments
    const overdueInstallments = activeInstallments.filter(i => {
      const status = getInstallmentStatus(i);
      return status === 'overdue' || (i.status !== 'paid' && status === 'overdue');
    });
    const parcelasEmAtraso = overdueInstallments.length;
    const valorEmAtraso = overdueInstallments.reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0);

    // Near due installments
    const nearDueInstallments = activeInstallments.filter(i => {
      const status = getInstallmentStatus(i);
      return status === 'near_due' || status === 'due_today';
    });
    const parcelasAVencer = nearDueInstallments.length;
    const valorAVencer = nearDueInstallments.reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0);

    // Active clients
    const clientesAtivos = new Set(activeLoans.map(l => l.clientId)).size;

    return {
      capitalEmprestado,
      totalAReceber,
      dinheiroNaRua,
      lucroPrevisto,
      lucroRealizado,
      valorRecebido,
      parcelasEmAtraso,
      valorEmAtraso,
      parcelasAVencer,
      valorAVencer,
      clientesAtivos,
      totalEmprestimosAtivos: activeLoans.length,
      totalEmprestimosQuitados: completedLoans.length,
    };
  })();

  const value = {
    ...data,
    stats,
    searchQuery,
    setSearchQuery,
    sidebarOpen,
    setSidebarOpen,
    addClient,
    updateClient,
    deleteClient,
    addLoan,
    updateLoan,
    registerPayment,
    markNotificationRead,
    markAllNotificationsRead,
    addMarker,
    deleteMarker,
    updateSettings,
    resetData,
    getClientLoans,
    getClientInstallments,
    getLoanInstallments,
    getClientPayments,
    addActivity,
    addNotification,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
