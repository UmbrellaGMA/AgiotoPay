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
    related_id: 'relatedId', calculation_mode: 'calculationMode',
    signed_at: 'signedAt', admin_name: 'adminName', company_name: 'companyName',
    date_format: 'dateFormat', alert_days: 'alertDays', payment_methods: 'paymentMethods',
    birth_date: 'birthDate',
  };
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[map[k] || k] = v;
  }
  return out;
};

// Helper: convert camelCase JS object to snake_case for DB
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
    relatedId: 'related_id', calculationMode: 'calculation_mode',
    signedAt: 'signed_at', adminName: 'admin_name', companyName: 'company_name',
    dateFormat: 'date_format', alertDays: 'alert_days', paymentMethods: 'payment_methods',
    birthDate: 'birth_date',
  };
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'userId') continue; // skip legacy field
    out[map[k] || k] = v;
  }
  return out;
};

export const AppProvider = ({ children }) => {
  const [clients, setClients] = useState([]);
  const [loans, setLoans] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [notifications, setNotifications] = useState([]);
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
        supabase.from('activities').select('*').order('date', { ascending: false }).limit(200),
        supabase.from('notifications').select('*').order('date', { ascending: false }).limit(200),
        supabase.from('markers').select('*'),
        supabase.from('settings').select('*').limit(1),
        supabase.from('app_users').select('*').order('created_at'),
      ]);
      setClients((cR.data || []).map(toCamel));
      setLoans((lR.data || []).map(toCamel));
      setInstallments((iR.data || []).map(toCamel));
      setPayments((pR.data || []).map(toCamel));
      setActivities((aR.data || []).map(toCamel));
      setNotifications((nR.data || []).map(toCamel));
      setMarkers((mR.data || []).map(toCamel));
      setSettings(sR.data?.[0] ? toCamel(sR.data[0]) : {});
      setUsers((uR.data || []).map(toCamel));
    } catch (e) { console.error('Fetch error:', e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── ACTIVITY & NOTIFICATION HELPERS ──
  const addActivity = useCallback(async (type, description, relatedId = null) => {
    const row = { type, description, date: new Date().toISOString(), related_id: relatedId };
    const { data } = await supabase.from('activities').insert(row).select().single();
    if (data) setActivities(prev => [toCamel(data), ...prev]);
  }, []);

  const addNotification = useCallback(async (type, message, relatedId = null) => {
    const row = { type, message, date: new Date().toISOString().split('T')[0], read: false, related_id: relatedId };
    const { data } = await supabase.from('notifications').insert(row).select().single();
    if (data) setNotifications(prev => [toCamel(data), ...prev]);
  }, []);

  // ── CLIENT CRUD ──
  const addClient = useCallback(async (client) => {
    const row = toSnake({ ...client, tags: client.tags || [] });
    delete row.id;
    const { data, error } = await supabase.from('clients').insert(row).select().single();
    if (error) { console.error(error); return null; }
    const c = toCamel(data);
    setClients(prev => [c, ...prev]);
    addActivity('client_created', `Novo cliente cadastrado: ${client.name}`, c.id);
    return c;
  }, [addActivity]);

  const updateClient = useCallback(async (id, updates) => {
    const row = toSnake(updates);
    delete row.id;
    await supabase.from('clients').update(row).eq('id', id);
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    addActivity('client_updated', `Cliente atualizado: ${updates.name || id}`, id);
  }, [addActivity]);

  const deleteClient = useCallback(async (id) => {
    await supabase.from('payments').delete().eq('client_id', id);
    await supabase.from('installments').delete().eq('client_id', id);
    await supabase.from('loans').delete().eq('client_id', id);
    await supabase.from('clients').delete().eq('id', id);
    setPayments(prev => prev.filter(p => p.clientId !== id));
    setInstallments(prev => prev.filter(i => i.clientId !== id));
    setLoans(prev => prev.filter(l => l.clientId !== id));
    setClients(prev => prev.filter(c => c.id !== id));
    addActivity('client_deleted', 'Cliente e todos os seus débitos foram removidos', id);
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
    const newLoan = {
      ...loan,
      title: loan.title || 'Empréstimo Sem Título',
      calculationMode: loan.calculationMode || 'amortized',
      status: 'active',
    };

    const loanRow = toSnake(newLoan);
    delete loanRow.id;
    delete loanRow.user_id;

    const { data: loanData, error: loanErr } = await supabase.from('loans').insert(loanRow).select().single();
    if (loanErr) { console.error(loanErr); return null; }

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
          loan_id: savedLoan.id, client_id: savedLoan.clientId, number: i + 1,
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
          loan_id: savedLoan.id, client_id: savedLoan.clientId, number: i + 1,
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
      if (instData) setInstallments(prev => [...prev, ...instData.map(toCamel)]);
    }

    setLoans(prev => [savedLoan, ...prev]);
    const client = clients.find(c => c.id === savedLoan.clientId);
    addActivity('loan_created', `Novo débito "${savedLoan.title}": R$ ${Number(savedLoan.principalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para ${client?.name || 'Cliente'}`, savedLoan.id);
    addNotification('loan_created', `Novo débito "${savedLoan.title}" criado para ${client?.name || 'Cliente'}`, savedLoan.id);
    return savedLoan;
  }, [clients, addActivity, addNotification]);

  const updateLoan = useCallback(async (id, updates) => {
    const row = toSnake(updates);
    delete row.id;
    await supabase.from('loans').update(row).eq('id', id);
    setLoans(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    addActivity('loan_updated', 'Empréstimo atualizado', id);
  }, [addActivity]);

  const deleteLoan = useCallback(async (id) => {
    await supabase.from('payments').delete().eq('loan_id', id);
    await supabase.from('installments').delete().eq('loan_id', id);
    await supabase.from('loans').delete().eq('id', id);
    setPayments(prev => prev.filter(p => p.loanId !== id));
    setInstallments(prev => prev.filter(i => i.loanId !== id));
    setLoans(prev => prev.filter(l => l.id !== id));
    addActivity('loan_deleted', `Empréstimo removido: ${id}`);
  }, [addActivity]);

  // ── PAYMENT ──
  const registerPayment = useCallback(async (paymentData) => {
    const payRow = {
      client_id: paymentData.clientId, loan_id: paymentData.loanId,
      installment_ids: paymentData.installmentIds || [],
      amount: paymentData.amount, date: paymentData.date,
      method: paymentData.method || 'pix', notes: paymentData.notes || '',
    };
    const { data: payData, error: payErr } = await supabase.from('payments').insert(payRow).select().single();
    if (payErr) { console.error(payErr); return null; }
    const payment = toCamel(payData);
    setPayments(prev => [payment, ...prev]);

    // Update installments
    let remaining = payment.amount;
    const instIds = paymentData.installmentIds || [];
    for (const instId of instIds) {
      const inst = installments.find(i => i.id === instId);
      if (!inst) continue;
      const owed = inst.totalAmount - inst.paidAmount;
      const payForThis = Math.min(remaining, owed);
      const newPaid = inst.paidAmount + payForThis;
      remaining -= payForThis;
      const newStatus = newPaid >= inst.totalAmount ? 'paid' : newPaid > 0 ? 'partial' : inst.status;
      await supabase.from('installments').update({ paid_amount: newPaid, paid_date: payment.date, status: newStatus }).eq('id', instId);
      setInstallments(prev => prev.map(i => i.id === instId ? { ...i, paidAmount: newPaid, paidDate: payment.date, status: newStatus } : i));
    }

    // Check if loan is completed
    const loanInsts = installments.filter(i => i.loanId === paymentData.loanId);
    const allPaid = loanInsts.every(i => {
      if (instIds.includes(i.id)) {
        const owed = i.totalAmount - i.paidAmount;
        return (i.paidAmount + Math.min(payment.amount, owed)) >= i.totalAmount;
      }
      return i.paidAmount >= i.totalAmount;
    });
    if (allPaid) {
      await supabase.from('loans').update({ status: 'completed' }).eq('id', paymentData.loanId);
      setLoans(prev => prev.map(l => l.id === paymentData.loanId ? { ...l, status: 'completed' } : l));
    }

    const client = clients.find(c => c.id === paymentData.clientId);
    addActivity('payment', `Pagamento de R$ ${paymentData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} recebido de ${client?.name || 'Cliente'}`, payment.id);
    addNotification('payment', `${client?.name || 'Cliente'} realizou um pagamento de R$ ${paymentData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, payment.id);
    return payment;
  }, [clients, installments, addActivity, addNotification]);

  const deletePayment = useCallback(async (paymentId) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;

    await supabase.from('payments').delete().eq('id', paymentId);
    setPayments(prev => prev.filter(p => p.id !== paymentId));

    if (payment.installmentIds && payment.installmentIds.length > 0) {
      const remainingPayments = payments.filter(p => p.id !== paymentId && p.loanId === payment.loanId);
      const loanInsts = installments.filter(i => i.loanId === payment.loanId);

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
        setInstallments(prev => prev.map(i => i.id === inst.id ? { ...i, paidAmount: paidForInst, paidDate: paidForInst > 0 ? lastPaidDate : null, status: newStatus } : i));
      }
      await supabase.from('loans').update({ status: 'active' }).eq('id', payment.loanId);
      setLoans(prev => prev.map(l => l.id === payment.loanId ? { ...l, status: 'active' } : l));
    }

    addActivity('payment_deleted', `Pagamento de R$ ${payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi estornado/removido.`, paymentId);
  }, [payments, installments, addActivity]);

  // ── SIGNATURE ──
  const saveSignature = useCallback(async (installmentId, signatureData) => {
    const signedAt = new Date().toISOString();
    await supabase.from('installments').update({ signature: signatureData, signed_at: signedAt }).eq('id', installmentId);
    setInstallments(prev => prev.map(i => i.id === installmentId ? { ...i, signature: signatureData, signedAt } : i));
    addActivity('signature_saved', `Assinatura digital registrada no recibo #${installmentId}`, installmentId);
  }, [addActivity]);

  // ── NOTIFICATIONS ──
  const markNotificationRead = useCallback(async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.read).map(n => n.id);
    if (unread.length > 0) {
      await supabase.from('notifications').update({ read: true }).in('id', unread);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  }, [notifications]);

  // ── MARKERS ──
  const addMarker = useCallback(async (marker) => {
    const row = toSnake(marker);
    delete row.id;
    const { data } = await supabase.from('markers').insert(row).select().single();
    if (data) { const m = toCamel(data); setMarkers(prev => [...prev, m]); return m; }
    return null;
  }, []);

  const deleteMarker = useCallback(async (id) => {
    await supabase.from('markers').delete().eq('id', id);
    setMarkers(prev => prev.filter(m => m.id !== id));
  }, []);

  // ── SETTINGS ──
  const updateSettings = useCallback(async (updates) => {
    const row = toSnake(updates);
    if (settings.id) {
      await supabase.from('settings').update(row).eq('id', settings.id);
    } else {
      const { data } = await supabase.from('settings').insert(row).select().single();
      if (data) { setSettings(toCamel(data)); return; }
    }
    setSettings(prev => ({ ...prev, ...updates }));
  }, [settings]);

  // ── RESET DATA ──
  const resetData = useCallback(async () => {
    await Promise.all([
      supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('installments').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('loans').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    ]);
    setClients([]); setLoans([]); setInstallments([]);
    setPayments([]); setActivities([]); setNotifications([]);
  }, []);

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
    const session = { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status };
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
