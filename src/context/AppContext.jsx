import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { generateSampleData, defaultMasterUser } from '../utils/sampleData';
import { generateId, getInstallmentStatus } from '../utils/formatters';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

const STORAGE_KEY = 'agiotopay_data';
const USER_STORAGE_KEY = 'agiotopay_current_user';

const loadData = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure users array exists with at least default master user
      if (!parsed.users || parsed.users.length === 0) {
        parsed.users = [defaultMasterUser];
      } else {
        const masterIdx = parsed.users.findIndex(u => u.email === defaultMasterUser.email || u.id === 'usr_master');
        if (masterIdx !== -1) {
          parsed.users[masterIdx] = { ...parsed.users[masterIdx], ...defaultMasterUser };
        } else {
          parsed.users.unshift(defaultMasterUser);
        }
      }

      // Guarantee fallback userId: 'usr_master' for any legacy items without userId
      ['clients', 'loans', 'installments', 'payments', 'activities', 'notifications'].forEach(key => {
        if (Array.isArray(parsed[key])) {
          parsed[key] = parsed[key].map(item => ({
            ...item,
            userId: item.userId || 'usr_master',
          }));
        } else {
          parsed[key] = [];
        }
      });

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
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      return storedUser ? JSON.parse(storedUser) : defaultMasterUser;
    } catch {
      return defaultMasterUser;
    }
  });

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('agiotopay_theme') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('agiotopay_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    saveData(data);
  }, [data]);

  // ─────────────────────────────────────────────────────────────
  // DATA ISOLATION: Each user sees ONLY their own data
  // ─────────────────────────────────────────────────────────────
  const userData = useMemo(() => {
    const empty = {
      clients: [], loans: [], installments: [], payments: [],
      activities: [], notifications: [],
      markers: data.markers || [], settings: data.settings || {}, users: data.users || [],
    };

    const uid = currentUser?.id || 'usr_master';
    return {
      clients: (data.clients || []).filter(c => c.userId === uid || !c.userId),
      loans: (data.loans || []).filter(l => l.userId === uid || !l.userId),
      installments: (data.installments || []).filter(i => i.userId === uid || !i.userId),
      payments: (data.payments || []).filter(p => p.userId === uid || !p.userId),
      activities: (data.activities || []).filter(a => a.userId === uid || !a.userId),
      notifications: (data.notifications || []).filter(n => n.userId === uid || !n.userId),
      markers: data.markers || [],
      settings: data.settings || {},
      users: data.users || [],
    };
  }, [data, currentUser]);

  // ─────────────────────────────────────────────────────────────
  // Activity & Notification helpers
  // ─────────────────────────────────────────────────────────────
  const addActivity = useCallback((type, description, relatedId = null) => {
    const activity = {
      id: generateId(),
      type,
      description,
      date: new Date().toISOString(),
      relatedId,
      userId: currentUser?.id || 'usr_master',
    };
    setData(prev => ({
      ...prev,
      activities: [activity, ...(prev.activities || [])],
    }));
  }, [currentUser]);

  const addNotification = useCallback((type, message, relatedId = null) => {
    const notification = {
      id: generateId(),
      type,
      message,
      date: new Date().toISOString().split('T')[0],
      read: false,
      relatedId,
      userId: currentUser?.id || 'usr_master',
    };
    setData(prev => ({
      ...prev,
      notifications: [notification, ...(prev.notifications || [])],
    }));
  }, [currentUser]);

  // ─────────────────────────────────────────────────────────────
  // Client CRUD
  // ─────────────────────────────────────────────────────────────
  const addClient = useCallback((client) => {
    const newClient = {
      ...client,
      id: generateId(),
      createdAt: new Date().toISOString(),
      tags: client.tags || [],
      userId: currentUser?.id || 'usr_master',
    };
    setData(prev => ({
      ...prev,
      clients: [...(prev.clients || []), newClient],
    }));
    addActivity('client_created', `Novo cliente cadastrado: ${client.name}`, newClient.id);
    return newClient;
  }, [addActivity, currentUser]);

  const updateClient = useCallback((id, updates) => {
    setData(prev => ({
      ...prev,
      clients: (prev.clients || []).map(c => c.id === id ? { ...c, ...updates } : c),
    }));
    addActivity('client_updated', `Cliente atualizado: ${updates.name || id}`, id);
  }, [addActivity]);

  const deleteClient = useCallback((id) => {
    setData(prev => ({
      ...prev,
      clients: (prev.clients || []).filter(c => c.id !== id),
    }));
    addActivity('client_deleted', `Cliente removido`, id);
  }, [addActivity]);

  // ─────────────────────────────────────────────────────────────
  // Loan CRUD
  // ─────────────────────────────────────────────────────────────
  const addLoan = useCallback((loan) => {
    const uid = currentUser?.id || 'usr_master';
    const newLoan = {
      ...loan,
      id: loan.id || generateId(),
      title: loan.title || 'Empréstimo Sem Título',
      calculationMode: loan.calculationMode || 'amortized',
      status: 'active',
      createdAt: new Date().toISOString(),
      userId: uid,
    };

    const count = parseInt(newLoan.installmentCount) || 1;
    const isInterestOnly = newLoan.calculationMode === 'interest_only_final_payoff';

    const newInstallments = [];
    if (isInterestOnly) {
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
          userId: uid,
        });
      }

      newLoan.totalAmount = newInstallments.reduce((sum, inst) => sum + inst.totalAmount, 0);
    } else {
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
          userId: uid,
        });
      }
    }

    setData(prev => ({
      ...prev,
      loans: [...(prev.loans || []), newLoan],
      installments: [...(prev.installments || []), ...newInstallments],
    }));

    const client = (data.clients || []).find(c => c.id === newLoan.clientId);
    addActivity('loan_created', `Novo débito "${newLoan.title}": R$ ${newLoan.principalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para ${client?.name || 'Cliente'}`, newLoan.id);
    addNotification('loan_created', `Novo débito "${newLoan.title}" criado para ${client?.name || 'Cliente'}`, newLoan.id);

    return newLoan;
  }, [data.clients, addActivity, addNotification, currentUser]);

  const updateLoan = useCallback((id, updates) => {
    setData(prev => ({
      ...prev,
      loans: (prev.loans || []).map(l => l.id === id ? { ...l, ...updates } : l),
    }));
    addActivity('loan_updated', `Empréstimo atualizado`, id);
  }, [addActivity]);

  // ─────────────────────────────────────────────────────────────
  // Payment
  // ─────────────────────────────────────────────────────────────
  const registerPayment = useCallback((paymentData) => {
    const payment = {
      ...paymentData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      userId: currentUser?.id || 'usr_master',
    };

    setData(prev => {
      let newInstallments = [...(prev.installments || [])];
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

      const loanId = payment.loanId;
      const loanInstallments = newInstallments.filter(i => i.loanId === loanId);
      const allPaid = loanInstallments.every(i => i.paidAmount >= i.totalAmount);

      let newLoans = prev.loans || [];
      if (allPaid) {
        newLoans = newLoans.map(l => l.id === loanId ? { ...l, status: 'completed' } : l);
      }

      return {
        ...prev,
        payments: [payment, ...(prev.payments || [])],
        installments: newInstallments,
        loans: newLoans,
      };
    });

    const client = (data.clients || []).find(c => c.id === paymentData.clientId);
    addActivity('payment', `Pagamento de R$ ${paymentData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} recebido de ${client?.name || 'Cliente'}`, payment.id);
    addNotification('payment', `${client?.name || 'Cliente'} realizou um pagamento de R$ ${paymentData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, payment.id);

    return payment;
  }, [data.clients, addActivity, addNotification, currentUser]);

  // ─────────────────────────────────────────────────────────────
  // Save Signature for Receipts Permanently
  // ─────────────────────────────────────────────────────────────
  const saveSignature = useCallback((installmentId, signatureData) => {
    const signedAt = new Date().toISOString();
    setData(prev => ({
      ...prev,
      installments: (prev.installments || []).map(i =>
        i.id === installmentId
          ? { ...i, signature: signatureData, signedAt }
          : i
      )
    }));
    addActivity('signature_saved', `Assinatura digital registrada no recibo #${installmentId.toUpperCase()}`, installmentId);
  }, [addActivity]);

  // ─────────────────────────────────────────────────────────────
  // Notifications
  // ─────────────────────────────────────────────────────────────
  const markNotificationRead = useCallback((id) => {
    setData(prev => ({
      ...prev,
      notifications: (prev.notifications || []).map(n => n.id === id ? { ...n, read: true } : n),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    const uid = currentUser?.id || 'usr_master';
    setData(prev => ({
      ...prev,
      notifications: (prev.notifications || []).map(n =>
        n.userId === uid ? { ...n, read: true } : n
      ),
    }));
  }, [currentUser]);

  // ─────────────────────────────────────────────────────────────
  // Markers
  // ─────────────────────────────────────────────────────────────
  const addMarker = useCallback((marker) => {
    const newMarker = { ...marker, id: generateId() };
    setData(prev => ({
      ...prev,
      markers: [...(prev.markers || []), newMarker],
    }));
    return newMarker;
  }, []);

  const deleteMarker = useCallback((id) => {
    setData(prev => ({
      ...prev,
      markers: (prev.markers || []).filter(m => m.id !== id),
    }));
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Settings
  // ─────────────────────────────────────────────────────────────
  const updateSettings = useCallback((updates) => {
    setData(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }));
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Reset data
  // ─────────────────────────────────────────────────────────────
  const resetData = useCallback(() => {
    const uid = currentUser?.id || 'usr_master';
    if (!uid) return;
    setData(prev => ({
      ...prev,
      clients: (prev.clients || []).filter(c => c.userId !== uid),
      loans: (prev.loans || []).filter(l => l.userId !== uid),
      installments: (prev.installments || []).filter(i => i.userId !== uid),
      payments: (prev.payments || []).filter(p => p.userId !== uid),
      activities: (prev.activities || []).filter(a => a.userId !== uid),
      notifications: (prev.notifications || []).filter(n => n.userId !== uid),
    }));
  }, [currentUser]);

  // ─────────────────────────────────────────────────────────────
  // Computed helpers
  // ─────────────────────────────────────────────────────────────
  const getClientLoans = useCallback((clientId) => {
    return userData.loans.filter(l => l.clientId === clientId);
  }, [userData.loans]);

  const getClientInstallments = useCallback((clientId) => {
    return userData.installments.filter(i => i.clientId === clientId);
  }, [userData.installments]);

  const getLoanInstallments = useCallback((loanId) => {
    return userData.installments.filter(i => i.loanId === loanId);
  }, [userData.installments]);

  const getClientPayments = useCallback((clientId) => {
    return userData.payments.filter(p => p.clientId === clientId);
  }, [userData.payments]);

  // ─────────────────────────────────────────────────────────────
  // Dashboard stats
  // ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const activeLoans = userData.loans.filter(l => l.status === 'active');
    const completedLoans = userData.loans.filter(l => l.status === 'completed');

    const capitalEmprestado = activeLoans.reduce((sum, l) => sum + l.principalAmount, 0);
    const totalAReceber = activeLoans.reduce((sum, l) => sum + l.totalAmount, 0);
    const lucroPrevisto = activeLoans.reduce((sum, l) => sum + l.totalInterest, 0);

    const activeInstallments = userData.installments.filter(i =>
      activeLoans.some(l => l.id === i.loanId)
    );

    const totalPaidActive = activeInstallments.reduce((sum, i) => sum + i.paidAmount, 0);
    const totalPaidCompleted = userData.installments
      .filter(i => completedLoans.some(l => l.id === i.loanId))
      .reduce((sum, i) => sum + i.paidAmount, 0);

    const valorRecebido = totalPaidActive + totalPaidCompleted;
    const dinheiroNaRua = totalAReceber - totalPaidActive;

    const totalPrincipalPaid = activeInstallments
      .reduce((sum, i) => sum + Math.min(i.paidAmount, i.principalAmount), 0);
    const lucroRealizadoActive = totalPaidActive - totalPrincipalPaid;
    const lucroRealizadoCompleted = completedLoans.reduce((sum, l) => sum + l.totalInterest, 0);
    const lucroRealizado = lucroRealizadoActive + lucroRealizadoCompleted;

    const overdueInstallments = activeInstallments.filter(i => {
      const status = getInstallmentStatus(i);
      return status === 'overdue' || (i.status !== 'paid' && status === 'overdue');
    });
    const parcelasEmAtraso = overdueInstallments.length;
    const valorEmAtraso = overdueInstallments.reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0);

    const nearDueInstallments = activeInstallments.filter(i => {
      const status = getInstallmentStatus(i);
      return status === 'near_due' || status === 'due_today';
    });
    const parcelasAVencer = nearDueInstallments.length;
    const valorAVencer = nearDueInstallments.reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0);

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
  }, [userData.loans, userData.installments]);

  // ─────────────────────────────────────────────────────────────
  // Auth & User Management Functions
  // ─────────────────────────────────────────────────────────────
  const login = useCallback((email, password) => {
    const user = data.users?.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      return { success: false, error: 'Usuário não encontrado.' };
    }
    if (user.password !== password) {
      return { success: false, error: 'Senha incorreta.' };
    }
    if (user.status === 'blocked') {
      return { success: false, error: 'Usuário bloqueado. Entre em contato com o gestor principal.' };
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };
    setCurrentUser(sessionUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sessionUser));
    return { success: true, user: sessionUser };
  }, [data.users]);

  const logout = useCallback(() => {
    setCurrentUser(defaultMasterUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(defaultMasterUser));
  }, []);

  const addUser = useCallback((newUser) => {
    const exists = data.users?.some(u => u.email.toLowerCase() === newUser.email.trim().toLowerCase());
    if (exists) {
      return { success: false, error: 'Já existe um usuário cadastrado com este e-mail.' };
    }

    const created = {
      id: generateId(),
      name: newUser.name,
      email: newUser.email.trim(),
      password: newUser.password,
      role: newUser.role || 'operator',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    setData(prev => ({
      ...prev,
      users: [...(prev.users || []), created],
    }));
    addActivity('user_created', `Novo usuário cadastrado: ${created.name} (${created.email})`);
    return { success: true, user: created };
  }, [data.users, addActivity]);

  const updateUser = useCallback((id, updates) => {
    setData(prev => ({
      ...prev,
      users: (prev.users || []).map(u => u.id === id ? { ...u, ...updates } : u),
    }));
    if (currentUser?.id === id) {
      const updatedSession = { ...currentUser, ...updates };
      delete updatedSession.password;
      setCurrentUser(updatedSession);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedSession));
    }
    addActivity('user_updated', `Usuário atualizado: ${id}`);
  }, [currentUser, addActivity]);

  const deleteUser = useCallback((id) => {
    if (currentUser?.id === id) {
      return { success: false, error: 'Você não pode excluir sua própria conta enquanto estiver conectado.' };
    }
    setData(prev => ({
      ...prev,
      users: (prev.users || []).filter(u => u.id !== id),
      clients: (prev.clients || []).filter(c => c.userId !== id),
      loans: (prev.loans || []).filter(l => l.userId !== id),
      installments: (prev.installments || []).filter(i => i.userId !== id),
      payments: (prev.payments || []).filter(p => p.userId !== id),
      activities: (prev.activities || []).filter(a => a.userId !== id),
      notifications: (prev.notifications || []).filter(n => n.userId !== id),
    }));
    addActivity('user_deleted', `Usuário excluído: ${id}`);
    return { success: true };
  }, [currentUser, addActivity]);

  const value = {
    ...userData,
    stats,
    currentUser,
    login,
    logout,
    addUser,
    updateUser,
    deleteUser,
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
    saveSignature,
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
    theme,
    setTheme,
    toggleTheme,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
