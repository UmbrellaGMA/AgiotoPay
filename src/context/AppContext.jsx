import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { getInstallmentStatus } from '../utils/formatters';

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

const USER_STORAGE_KEY = 'agiotopay_current_user';

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
    related_id: 'relatedId', calculation_mode: 'calculationMode', user_id: 'userId',
    signed_at: 'signedAt', admin_name: 'adminName', company_name: 'companyName', company_logo: 'companyLogo',
    date_format: 'dateFormat', alert_days: 'alertDays', payment_methods: 'paymentMethods',
    birth_date: 'birthDate', document_image: 'documentImage',
  };
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[map[k] || k] = v;
  }
  return out;
};

// Helper: convert camelCase JS object to snake_case for DB
const DATE_FIELDS = new Set(['birth_date', 'start_date', 'first_due_date', 'due_date', 'paid_date', 'signed_at', 'created_at', 'date']);

const toSnake = (obj) => {
  if (!obj) return obj;
  const map = {
    clientId: 'client_id', loanId: 'loan_id', principalAmount: 'principal_amount',
    interestType: 'interest_type', interestRate: 'interest_rate',
    fixedInterestAmount: 'fixed_interest_amount', totalInterest: 'total_interest',
    totalAmount: 'total_amount', installmentCount: 'installment_count',
    startDate: 'start_date', firstDueDate: 'first_due_date', createdAt: 'created_at',
    dueDate: 'due_date', paidAmount: 'paid_amount', paidDate: 'paid_date',
    interestAmount: 'interest_amount', installmentIds: 'installment_ids',
    relatedId: 'related_id', calculationMode: 'calculation_mode', userId: 'user_id',
    signedAt: 'signed_at', adminName: 'admin_name', companyName: 'company_name', companyLogo: 'company_logo',
    dateFormat: 'date_format', alertDays: 'alert_days', paymentMethods: 'payment_methods',
    birthDate: 'birth_date', documentImage: 'document_image',
  };
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const targetKey = map[k] || k;
    if (DATE_FIELDS.has(targetKey) && v === '') {
      out[targetKey] = null;
    } else {
      out[targetKey] = v;
    }
  }
  return out;
};

export const AppProvider = ({ children }) => {
  const [allClients, setAllClients] = useState([]);
  const [allLoans, setAllLoans] = useState([]);
  const [allInstallments, setAllInstallments] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [allActivities, setAllActivities] = useState([]);
  const [allNotifications, setAllNotifications] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [settings, setSettings] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('agiotopay_theme') || 'light'; } catch { return 'light'; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('agiotopay_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme(p => p === 'light' ? 'dark' : 'light'), []);

  // ── LOAD ALL DATA FROM SUPABASE ──
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cR, lR, iR, pR, aR, nR, mR, sR, uR] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('loans').select('*').order('created_at', { ascending: false }),
        supabase.from('installments').select('*').order('number'),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('activities').select('*').order('date', { ascending: false }).limit(500),
        supabase.from('notifications').select('*').order('date', { ascending: false }).limit(500),
        supabase.from('markers').select('*'),
        supabase.from('settings').select('*').limit(1),
        supabase.from('app_users').select('*').order('created_at'),
      ]);
      setAllClients((cR.data || []).map(toCamel));
      setAllLoans((lR.data || []).map(toCamel));
      setAllInstallments((iR.data || []).map(toCamel));
      setAllPayments((pR.data || []).map(toCamel));
      setAllActivities((aR.data || []).map(toCamel));
      setAllNotifications((nR.data || []).map(toCamel));
      setMarkers((mR.data || []).map(toCamel));
      setSettings(sR.data?.[0] ? toCamel(sR.data[0]) : {});
      setUsers((uR.data || []).map(toCamel));
    } catch (e) { console.error('Fetch error:', e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();

    // Subscribe to real-time database updates for instant multi-browser synchronization
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        () => {
          fetchAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll, currentUser?.id]);

  // ── FILTER DATA PER USER FOR ISOLATION ──
  const clients = useMemo(() => {
    if (!currentUser?.id) return allClients;
    return allClients.filter(c => c.userId === currentUser.id);
  }, [allClients, currentUser?.id]);

  const loans = useMemo(() => {
    if (!currentUser?.id) return allLoans;
    return allLoans.filter(l => l.userId === currentUser.id);
  }, [allLoans, currentUser?.id]);

  const installments = useMemo(() => {
    if (!currentUser?.id) return allInstallments;
    return allInstallments.filter(i => i.userId === currentUser.id);
  }, [allInstallments, currentUser?.id]);

  const payments = useMemo(() => {
    if (!currentUser?.id) return allPayments;
    return allPayments.filter(p => p.userId === currentUser.id);
  }, [allPayments, currentUser?.id]);

  const activities = useMemo(() => {
    if (!currentUser?.id) return allActivities;
    return allActivities.filter(a => a.userId === currentUser.id);
  }, [allActivities, currentUser?.id]);

  const notifications = useMemo(() => {
    if (!currentUser?.id) return allNotifications;
    return allNotifications.filter(n => n.userId === currentUser.id);
  }, [allNotifications, currentUser?.id]);

  // ── ACTIVITY & NOTIFICATION HELPERS ──
  const addActivity = useCallback(async (type, description, relatedId = null) => {
    const row = { type, description, date: new Date().toISOString(), related_id: relatedId, user_id: currentUser?.id };
    const { data } = await supabase.from('activities').insert(row).select().single();
    if (data) setAllActivities(prev => [toCamel(data), ...prev]);
  }, [currentUser?.id]);

  const addNotification = useCallback(async (type, message, relatedId = null) => {
    const row = { type, message, date: new Date().toISOString().split('T')[0], read: false, related_id: relatedId, user_id: currentUser?.id };
    const { data } = await supabase.from('notifications').insert(row).select().single();
    if (data) setAllNotifications(prev => [toCamel(data), ...prev]);
  }, [currentUser?.id]);

  // ── CLIENT CRUD ──
  const addClient = useCallback(async (client) => {
    const row = toSnake({
      ...client,
      userId: client.userId || currentUser?.id,
      tags: client.tags || []
    });
    delete row.id;
    const { data, error } = await supabase.from('clients').insert(row).select().single();
    if (error) {
      console.error('Error adding client:', error);
      alert('Erro ao salvar cliente no banco de dados: ' + error.message);
      return null;
    }
    const c = toCamel(data);
    setAllClients(prev => [c, ...prev]);
    await addActivity('client_created', `Novo cliente cadastrado: ${client.name}`, c.id);
    return c;
  }, [addActivity, currentUser?.id]);

  const updateClient = useCallback(async (id, updates) => {
    const row = toSnake(updates);
    delete row.id;
    const { error } = await supabase.from('clients').update(row).eq('id', id);
    if (error) {
      console.error('Error updating client:', error);
      alert('Erro ao atualizar cliente no banco de dados: ' + error.message);
      return;
    }
    setAllClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    await addActivity('client_updated', `Cliente atualizado: ${updates.name || id}`, id);
  }, [addActivity]);

  const deleteClient = useCallback(async (id) => {
    await supabase.from('payments').delete().eq('client_id', id);
    await supabase.from('installments').delete().eq('client_id', id);
    await supabase.from('loans').delete().eq('client_id', id);
    await supabase.from('clients').delete().eq('id', id);
    setAllPayments(prev => prev.filter(p => p.clientId !== id));
    setAllInstallments(prev => prev.filter(i => i.clientId !== id));
    setAllLoans(prev => prev.filter(l => l.clientId !== id));
    setAllClients(prev => prev.filter(c => c.id !== id));
    await addActivity('client_deleted', 'Cliente e todos os seus débitos foram removidos', id);
  }, [addActivity]);

  // Helper for due dates
  const calculateDueDate = (firstDueDateStr, periodicity, index) => {
    if (!firstDueDateStr) return new Date().toISOString().split('T')[0];
    const [year, month, day] = firstDueDateStr.split('-').map(Number);
    if (periodicity === 'monthly') {
      const d = new Date(year, month - 1 + index, day);
      const expectedMonth = (month - 1 + index) % 12;
      const targetMonth = expectedMonth < 0 ? expectedMonth + 12 : expectedMonth;
      if (d.getMonth() !== targetMonth) {
        d.setDate(0);
      }
      return d.toISOString().split('T')[0];
    } else {
      const d = new Date(year, month - 1, day);
      if (periodicity === 'weekly') d.setDate(d.getDate() + (index * 7));
      else if (periodicity === 'biweekly') d.setDate(d.getDate() + (index * 15));
      else if (periodicity === 'daily') d.setDate(d.getDate() + index);
      return d.toISOString().split('T')[0];
    }
  };

  // ── LOAN CRUD ──
  const addLoan = useCallback(async (loan) => {
    const userIdToUse = loan.userId || currentUser?.id;
    const newLoan = {
      ...loan,
      userId: userIdToUse,
      title: loan.title || 'Empréstimo Sem Título',
      calculationMode: loan.calculationMode || 'amortized',
      status: 'active',
    };

    const loanRow = toSnake(newLoan);
    delete loanRow.id;

    const { data: loanData, error: loanErr } = await supabase.from('loans').insert(loanRow).select().single();
    if (loanErr) {
      console.error('Error adding loan:', loanErr);
      alert('Erro ao salvar empréstimo no banco de dados: ' + loanErr.message);
      return null;
    }

    const savedLoan = toCamel(loanData);
    const count = parseInt(savedLoan.installmentCount) || 1;
    const isInterestOnly = savedLoan.calculationMode === 'interest_only_final_payoff';

    const newInstallments = [];
    if (isInterestOnly) {
      const interestPerInst = Math.round((savedLoan.totalInterest / count) * 100) / 100;
      for (let i = 0; i < count; i++) {
        const dueDateStr = calculateDueDate(savedLoan.firstDueDate, savedLoan.periodicity, i);
        const isLast = i === count - 1;
        const principal = isLast ? Number(savedLoan.principalAmount) : 0;
        newInstallments.push({
          loan_id: savedLoan.id, client_id: savedLoan.clientId, user_id: userIdToUse, number: i + 1,
          due_date: dueDateStr,
          principal_amount: Math.round(principal * 100) / 100,
          interest_amount: Math.round(interestPerInst * 100) / 100,
          total_amount: Math.round((principal + interestPerInst) * 100) / 100,
          paid_amount: 0, paid_date: null, status: 'open',
        });
      }
    } else {
      const installmentAmount = savedLoan.totalAmount / count;
      const principalPerInst = savedLoan.principalAmount / count;
      const interestPerInst = savedLoan.totalInterest / count;
      for (let i = 0; i < count; i++) {
        const dueDateStr = calculateDueDate(savedLoan.firstDueDate, savedLoan.periodicity, i);
        newInstallments.push({
          loan_id: savedLoan.id, client_id: savedLoan.clientId, user_id: userIdToUse, number: i + 1,
          due_date: dueDateStr,
          principal_amount: Math.round(principalPerInst * 100) / 100,
          interest_amount: Math.round(interestPerInst * 100) / 100,
          total_amount: Math.round(installmentAmount * 100) / 100,
          paid_amount: 0, paid_date: null, status: 'open',
        });
      }
    }

    if (newInstallments.length > 0) {
      const { data: instData } = await supabase.from('installments').insert(newInstallments).select();
      if (instData) setAllInstallments(prev => [...prev, ...instData.map(toCamel)]);
    }

    setAllLoans(prev => [savedLoan, ...prev]);
    const client = allClients.find(c => c.id === savedLoan.clientId);
    addActivity('loan_created', `Novo débito "${savedLoan.title}": R$ ${Number(savedLoan.principalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para ${client?.name || 'Cliente'}`, savedLoan.id);
    addNotification('loan_created', `Novo débito "${savedLoan.title}" criado para ${client?.name || 'Cliente'}`, savedLoan.id);
    return savedLoan;
  }, [allClients, addActivity, addNotification, currentUser?.id]);

  const updateLoan = useCallback(async (id, updates) => {
    const row = toSnake(updates);
    delete row.id;
    await supabase.from('loans').update(row).eq('id', id);
    setAllLoans(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    addActivity('loan_updated', 'Empréstimo atualizado', id);
  }, [addActivity]);

  const deleteLoan = useCallback(async (id) => {
    await supabase.from('payments').delete().eq('loan_id', id);
    await supabase.from('installments').delete().eq('loan_id', id);
    await supabase.from('loans').delete().eq('id', id);
    setAllPayments(prev => prev.filter(p => p.loanId !== id));
    setAllInstallments(prev => prev.filter(i => i.loanId !== id));
    setAllLoans(prev => prev.filter(l => l.id !== id));
    addActivity('loan_deleted', `Empréstimo removido: ${id}`);
  }, [addActivity]);

  // ── PAYMENT ──
  const registerPayment = useCallback(async (paymentData) => {
    const payRow = {
      client_id: paymentData.clientId, loan_id: paymentData.loanId,
      user_id: currentUser?.id,
      installment_ids: paymentData.installmentIds || [],
      amount: paymentData.amount, date: paymentData.date,
      method: paymentData.method || 'pix', notes: paymentData.notes || '',
    };
    const { data: payData, error: payErr } = await supabase.from('payments').insert(payRow).select().single();
    if (payErr) { console.error(payErr); return null; }
    const payment = toCamel(payData);
    setAllPayments(prev => [payment, ...prev]);

    // Update installments
    let remaining = payment.amount;
    const instIds = paymentData.installmentIds || [];
    for (const instId of instIds) {
      const inst = allInstallments.find(i => i.id === instId);
      if (!inst) continue;
      const owed = inst.totalAmount - inst.paidAmount;
      const payForThis = Math.min(remaining, owed);
      const newPaid = inst.paidAmount + payForThis;
      remaining -= payForThis;
      const newStatus = newPaid >= inst.totalAmount ? 'paid' : newPaid > 0 ? 'partial' : inst.status;
      await supabase.from('installments').update({ paid_amount: newPaid, paid_date: payment.date, status: newStatus }).eq('id', instId);
      setAllInstallments(prev => prev.map(i => i.id === instId ? { ...i, paidAmount: newPaid, paidDate: payment.date, status: newStatus } : i));
    }

    // Check if loan is completed
    const loanInsts = allInstallments.filter(i => i.loanId === paymentData.loanId);
    const allPaid = loanInsts.every(i => {
      if (instIds.includes(i.id)) {
        const owed = i.totalAmount - i.paidAmount;
        return (i.paidAmount + Math.min(payment.amount, owed)) >= i.totalAmount;
      }
      return i.paidAmount >= i.totalAmount;
    });
    if (allPaid) {
      await supabase.from('loans').update({ status: 'completed' }).eq('id', paymentData.loanId);
      setAllLoans(prev => prev.map(l => l.id === paymentData.loanId ? { ...l, status: 'completed' } : l));
    }

    const client = allClients.find(c => c.id === paymentData.clientId);
    addActivity('payment', `Pagamento de R$ ${paymentData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} recebido de ${client?.name || 'Cliente'}`, payment.id);
    addNotification('payment', `${client?.name || 'Cliente'} realizou um pagamento de R$ ${paymentData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, payment.id);
    return payment;
  }, [allClients, allInstallments, addActivity, addNotification, currentUser?.id]);

  const deletePayment = useCallback(async (paymentId) => {
    const payment = allPayments.find(p => p.id === paymentId);
    if (!payment) return;

    await supabase.from('payments').delete().eq('id', paymentId);
    setAllPayments(prev => prev.filter(p => p.id !== paymentId));

    if (payment.installmentIds && payment.installmentIds.length > 0) {
      const remainingPayments = allPayments.filter(p => p.id !== paymentId && p.loanId === payment.loanId);
      const loanInsts = allInstallments.filter(i => i.loanId === payment.loanId);

      for (const inst of loanInsts) {
        let paidForInst = 0;
        let lastPaidDate = null;
        for (const p of remainingPayments) {
          if (p.installmentIds?.includes(inst.id)) {
            paidForInst += Math.min(p.amount, inst.totalAmount - paidForInst);
            lastPaidDate = p.date;
          }
        }
        const newStatus = paidForInst >= inst.totalAmount ? 'paid' : paidForInst > 0 ? 'partial' : 'open';
        await supabase.from('installments').update({ paid_amount: paidForInst, paid_date: paidForInst > 0 ? lastPaidDate : null, status: newStatus }).eq('id', inst.id);
        setAllInstallments(prev => prev.map(i => i.id === inst.id ? { ...i, paidAmount: paidForInst, paidDate: paidForInst > 0 ? lastPaidDate : null, status: newStatus } : i));
      }
      await supabase.from('loans').update({ status: 'active' }).eq('id', payment.loanId);
      setAllLoans(prev => prev.map(l => l.id === payment.loanId ? { ...l, status: 'active' } : l));
    }

    addActivity('payment_deleted', `Pagamento de R$ ${payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi estornado/removido.`, paymentId);
  }, [allPayments, allInstallments, addActivity]);

  // ── SIGNATURE ──
  const saveSignature = useCallback(async (installmentId, signatureData) => {
    const signedAt = new Date().toISOString();
    await supabase.from('installments').update({ signature: signatureData, signed_at: signedAt }).eq('id', installmentId);
    setAllInstallments(prev => prev.map(i => i.id === installmentId ? { ...i, signature: signatureData, signedAt } : i));
    addActivity('signature_saved', `Assinatura digital registrada no recibo #${installmentId}`, installmentId);
  }, [addActivity]);

  // ── NOTIFICATIONS ──
  const markNotificationRead = useCallback(async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.read).map(n => n.id);
    if (unread.length > 0) {
      await supabase.from('notifications').update({ read: true }).in('id', unread);
      setAllNotifications(prev => prev.map(n => (unread.includes(n.id) ? { ...n, read: true } : n)));
    }
  }, [notifications]);

  // ── MARKERS ──
  const addMarker = useCallback(async (marker) => {
    const row = toSnake({ ...marker, userId: currentUser?.id });
    delete row.id;
    const { data } = await supabase.from('markers').insert(row).select().single();
    if (data) { const m = toCamel(data); setMarkers(prev => [...prev, m]); return m; }
    return null;
  }, [currentUser?.id]);

  const deleteMarker = useCallback(async (id) => {
    await supabase.from('markers').delete().eq('id', id);
    setMarkers(prev => prev.filter(m => m.id !== id));
  }, []);

  // ── SETTINGS ──
  const updateSettings = useCallback(async (updates) => {
    if (!currentUser?.id) return;

    // Update per-user company details in app_users
    const userUpdates = {};
    if (updates.companyName !== undefined) userUpdates.company_name = updates.companyName;
    if (updates.companyLogo !== undefined) userUpdates.company_logo = updates.companyLogo;
    if (updates.adminName !== undefined) userUpdates.name = updates.adminName;

    if (Object.keys(userUpdates).length > 0) {
      await supabase.from('app_users').update(userUpdates).eq('id', currentUser.id);
      const session = {
        ...currentUser,
        name: updates.adminName !== undefined ? updates.adminName : currentUser.name,
        companyName: updates.companyName !== undefined ? updates.companyName : currentUser.companyName,
        companyLogo: updates.companyLogo !== undefined ? updates.companyLogo : currentUser.companyLogo,
      };
      setCurrentUser(session);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session));
    }

    setSettings(prev => ({ ...prev, ...updates }));
  }, [currentUser]);

  // ── RESET DATA PER USER ──
  const resetData = useCallback(async () => {
    if (!currentUser?.id) return;
    await Promise.all([
      supabase.from('payments').delete().eq('user_id', currentUser.id),
      supabase.from('installments').delete().eq('user_id', currentUser.id),
      supabase.from('loans').delete().eq('user_id', currentUser.id),
      supabase.from('clients').delete().eq('user_id', currentUser.id),
      supabase.from('activities').delete().eq('user_id', currentUser.id),
      supabase.from('notifications').delete().eq('user_id', currentUser.id),
    ]);
    setAllClients(prev => prev.filter(c => c.userId !== currentUser.id));
    setAllLoans(prev => prev.filter(l => l.userId !== currentUser.id));
    setAllInstallments(prev => prev.filter(i => i.userId !== currentUser.id));
    setAllPayments(prev => prev.filter(p => p.userId !== currentUser.id));
    setAllActivities(prev => prev.filter(a => a.userId !== currentUser.id));
    setAllNotifications(prev => prev.filter(n => n.userId !== currentUser.id));
  }, [currentUser?.id]);

  // ── COMPUTED HELPERS ──
  const getClientLoans = useCallback((clientId) => loans.filter(l => l.clientId === clientId), [loans]);
  const getClientInstallments = useCallback((clientId) => installments.filter(i => i.clientId === clientId), [installments]);
  const getLoanInstallments = useCallback((loanId) => installments.filter(i => i.loanId === loanId), [installments]);
  const getClientPayments = useCallback((clientId) => payments.filter(p => p.clientId === clientId), [payments]);

  // ── DASHBOARD STATS ──
  const stats = useMemo(() => {
    const activeLoans = loans.filter(l => l.status === 'active');
    const completedLoans = loans.filter(l => l.status === 'completed');
    const capitalEmprestado = activeLoans.reduce((s, l) => s + Number(l.principalAmount || 0), 0);
    const totalAReceber = activeLoans.reduce((s, l) => s + Number(l.totalAmount || 0), 0);
    const lucroPrevisto = activeLoans.reduce((s, l) => s + Number(l.totalInterest || 0), 0);
    const activeInst = installments.filter(i => activeLoans.some(l => l.id === i.loanId));
    const totalPaidActive = activeInst.reduce((s, i) => s + Number(i.paidAmount || 0), 0);
    const totalPaidCompleted = installments.filter(i => completedLoans.some(l => l.id === i.loanId)).reduce((s, i) => s + Number(i.paidAmount || 0), 0);
    const valorRecebido = totalPaidActive + totalPaidCompleted;
    const dinheiroNaRua = totalAReceber - totalPaidActive;
    const totalPrincipalPaid = activeInst.reduce((s, i) => s + Math.min(Number(i.paidAmount || 0), Number(i.principalAmount || 0)), 0);
    const lucroRealizadoActive = totalPaidActive - totalPrincipalPaid;
    const lucroRealizadoCompleted = completedLoans.reduce((s, l) => s + Number(l.totalInterest || 0), 0);
    const lucroRealizado = lucroRealizadoActive + lucroRealizadoCompleted;
    const overdueInst = activeInst.filter(i => { const st = getInstallmentStatus(i); return st === 'overdue'; });
    const parcelasEmAtraso = overdueInst.length;
    const valorEmAtraso = overdueInst.reduce((s, i) => s + (Number(i.totalAmount) - Number(i.paidAmount)), 0);
    const nearDueInst = activeInst.filter(i => { const st = getInstallmentStatus(i); return st === 'near_due' || st === 'due_today'; });
    const parcelasAVencer = nearDueInst.length;
    const valorAVencer = nearDueInst.reduce((s, i) => s + (Number(i.totalAmount) - Number(i.paidAmount)), 0);
    const clientesAtivos = new Set(activeLoans.map(l => l.clientId)).size;
    return { capitalEmprestado, totalAReceber, dinheiroNaRua, lucroPrevisto, lucroRealizado, valorRecebido, parcelasEmAtraso, valorEmAtraso, parcelasAVencer, valorAVencer, clientesAtivos, totalEmprestimosAtivos: activeLoans.length, totalEmprestimosQuitados: completedLoans.length };
  }, [loans, installments]);

  // ── AUTH & USER MANAGEMENT ──
  const login = useCallback(async (email, password) => {
    const { data: rows } = await supabase.from('app_users').select('*').ilike('email', email.trim()).limit(1);
    const user = rows?.[0] ? toCamel(rows[0]) : null;
    if (!user) return { success: false, error: 'Usuário não encontrado.' };
    if (user.password !== password) return { success: false, error: 'Senha incorreta.' };
    if (user.status === 'blocked') return { success: false, error: 'Usuário bloqueado.' };
    const session = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      companyName: user.companyName,
      companyLogo: user.companyLogo,
    };
    setCurrentUser(session);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session));
    return { success: true, user: session };
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  const addUser = useCallback(async (newUser) => {
    const row = { name: newUser.name, email: newUser.email.trim(), password: newUser.password, role: newUser.role || 'operator', status: 'active' };
    const { data, error } = await supabase.from('app_users').insert(row).select().single();
    if (error) {
      if (error.code === '23505') return { success: false, error: 'Já existe um usuário com este e-mail.' };
      return { success: false, error: error.message };
    }
    const u = toCamel(data);
    setUsers(prev => [...prev, u]);
    addActivity('user_created', `Novo usuário cadastrado: ${u.name} (${u.email})`);
    return { success: true, user: u };
  }, [addActivity]);

  const updateUser = useCallback(async (id, updates) => {
    const row = toSnake(updates);
    delete row.id;
    await supabase.from('app_users').update(row).eq('id', id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    if (currentUser?.id === id) {
      const updated = { ...currentUser, ...updates };
      delete updated.password;
      setCurrentUser(updated);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    }
    addActivity('user_updated', `Usuário atualizado: ${id}`);
  }, [currentUser, addActivity]);

  const deleteUser = useCallback(async (id) => {
    if (currentUser?.id === id) return { success: false, error: 'Você não pode excluir sua própria conta.' };
    await supabase.from('app_users').delete().eq('id', id);
    setUsers(prev => prev.filter(u => u.id !== id));
    addActivity('user_deleted', `Usuário excluído: ${id}`);
    return { success: true };
  }, [currentUser, addActivity]);

  const value = {
    clients, loans, installments, payments, activities, notifications, markers, settings, users,
    allClients, allLoans, allInstallments, allPayments,
    stats, currentUser, loading,
    login, logout, addUser, updateUser, deleteUser,
    searchQuery, setSearchQuery, sidebarOpen, setSidebarOpen,
    addClient, updateClient, deleteClient,
    addLoan, updateLoan, deleteLoan, registerPayment, deletePayment, saveSignature,
    markNotificationRead, markAllNotificationsRead,
    addMarker, deleteMarker, updateSettings, resetData,
    getClientLoans, getClientInstallments, getLoanInstallments, getClientPayments,
    addActivity, addNotification,
    theme, setTheme, toggleTheme, fetchAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
