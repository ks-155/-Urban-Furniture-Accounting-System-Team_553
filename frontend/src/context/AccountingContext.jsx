import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, getApiError, USE_MOCK_FALLBACK, purchasesAPI, billsAPI, journalEntriesAPI, journalsAPI } from '../services/api';

const AccountingContext = createContext();

// Seed Chart of Accounts
const initialAccounts = [
  { id: 1, code: '1001', name: 'Cash on Hand', type: 'ASSET' },
  { id: 2, code: '1002', name: 'Bank Account (HDFC)', type: 'ASSET' },
  { id: 3, code: '1003', name: 'Debtors (Accounts Receivable)', type: 'ASSET' },
  { id: 4, code: '2001', name: 'Creditors (Accounts Payable)', type: 'LIABILITY' },
  { id: 5, code: '2002', name: 'Tax Payable (GST 18%)', type: 'LIABILITY' },
  { id: 6, code: '3001', name: "Owner's Capital", type: 'CAPITAL' },
  { id: 7, code: '4001', name: 'Sales Income', type: 'INCOME' },
  { id: 8, code: '5001', name: 'Purchase Expense', type: 'EXPENSE' },
];

// Seed Contacts
const initialContacts = [
  {
    id: 1,
    name: 'Azure Furniture',
    type: 'VENDOR',
    email: 'contact@azurefurniture.com',
    mobile: '+91 98200 11223',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    address: '12 Industrial Area, Andheri East'
  },
  {
    id: 2,
    name: 'Nimesh Pathak',
    type: 'CUSTOMER',
    email: 'nimesh.pathak@gmail.com',
    mobile: '+91 98765 43210',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380015',
    address: '404 Galaxy Towers, SG Highway'
  },
  {
    id: 3,
    name: 'Urban Timber Suppliers',
    type: 'VENDOR',
    email: 'timber@urbansupply.com',
    mobile: '+91 99001 88776',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395007',
    address: 'Plot 78 GIDC Ring Road'
  }
];

// Seed Products
const initialProducts = [
  { id: 1, name: 'Ergonomic Office Chair', type: 'GOODS', salesPrice: 5500, costPrice: 3800, category: 'Chairs' },
  { id: 2, name: 'Solid Teak Wooden Table', type: 'GOODS', salesPrice: 18000, costPrice: 12500, category: 'Tables' },
  { id: 3, name: '3-Seater Urban Fabric Sofa', type: 'GOODS', salesPrice: 32000, costPrice: 22000, category: 'Sofas' },
  { id: 4, name: '6-Seater Dining Table Set', type: 'GOODS', salesPrice: 42000, costPrice: 29000, category: 'Dining' },
];

// Seed Journals
const initialJournals = [
  { id: 1, name: 'Sales Journal', code: 'SJ', type: 'SALES', defaultAccountId: 7 },
  { id: 2, name: 'Purchase Journal', code: 'PJ', type: 'PURCHASE', defaultAccountId: 8 },
  { id: 3, name: 'Bank Journal', code: 'BNK', type: 'BANK', defaultAccountId: 2 },
  { id: 4, name: 'Cash Journal', code: 'CSH', type: 'CASH', defaultAccountId: 1 },
];

// Seed Budgets
const initialBudgets = [
  {
    id: 1,
    name: 'Q3 Furniture Manufacturing Budget',
    analyticAccount: 'Manufacturing & Procurement',
    periodStart: '2026-07-01',
    periodEnd: '2026-09-30',
    responsiblePerson: 'Rahul Sharma',
    plannedAmount: 150000,
    committedAmount: 45000,
    achievedAmount: 38000,
    status: 'CONFIRMED'
  },
  {
    id: 2,
    name: 'Office Store Expansion Project',
    analyticAccount: 'Capital Projects',
    periodStart: '2026-08-01',
    periodEnd: '2026-12-31',
    responsiblePerson: 'Priya Patel',
    plannedAmount: 200000,
    committedAmount: 85000,
    achievedAmount: 62000,
    status: 'CONFIRMED'
  }
];

export const AccountingProvider = ({ children }) => {
  // Current active user / session (restored from localStorage when backend JWT exists)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('uf_user');
      return saved ? JSON.parse(saved) : {
        id: 1,
        name: 'Alex Accountant',
        loginId: 'accountant01',
        email: 'alex@urbanfurniture.com',
        role: 'ACCOUNTANT' // 'ADMIN' | 'ACCOUNTANT' | 'USER'
      };
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('uf_token') || null);
  const [authLoading, setAuthLoading] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);

  const [users, setUsers] = useState([
    { id: 1, name: 'Admin Master', loginId: 'admin01', email: 'admin@urbanfurniture.com', role: 'ADMIN', password: 'Password@123' },
    { id: 2, name: 'Alex Accountant', loginId: 'accountant01', email: 'alex@urbanfurniture.com', role: 'ACCOUNTANT', password: 'Password@123' },
    { id: 3, name: 'Nimesh Pathak', loginId: 'nimeshp', email: 'nimesh.pathak@gmail.com', role: 'USER', password: 'Password@123', contactId: 2 }
  ]);

  const [contacts, setContacts] = useState(initialContacts);
  const [products, setProducts] = useState(initialProducts);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [journals] = useState(initialJournals);
  const [budgets, setBudgets] = useState(initialBudgets);

  // Operational State
  const [purchaseOrders, setPurchaseOrders] = useState([
    {
      id: 1,
      poNumber: 'PO0001',
      vendorId: 1,
      vendorName: 'Azure Furniture',
      date: '2026-09-01',
      status: 'CONFIRMED', // DRAFT | CONFIRMED | BILLED
      totalAmount: 38000,
      lines: [
        { productId: 1, productName: 'Ergonomic Office Chair', quantity: 10, unitPrice: 3800, subtotal: 38000 }
      ]
    }
  ]);

  const [vendorBills, setVendorBills] = useState([
    {
      id: 1,
      billNumber: 'BILL0001',
      purchaseOrderId: 1,
      vendorId: 1,
      vendorName: 'Azure Furniture',
      billDate: '2026-09-02',
      dueDate: '2026-09-15',
      status: 'PAID', // DRAFT | CONFIRMED | PAID
      totalAmount: 38000,
      paidAmount: 38000,
      lines: [
        { productId: 1, productName: 'Ergonomic Office Chair', quantity: 10, unitPrice: 3800, subtotal: 38000 }
      ]
    }
  ]);

  const [salesOrders, setSalesOrders] = useState([
    {
      id: 1,
      soNumber: 'SO0001',
      customerId: 2,
      customerName: 'Nimesh Pathak',
      date: '2026-09-03',
      status: 'CONFIRMED', // DRAFT | CONFIRMED | INVOICED
      totalAmount: 27500,
      taxRate: 18,
      taxAmount: 4190,
      lines: [
        { productId: 1, productName: 'Ergonomic Office Chair', quantity: 5, unitPrice: 5500, subtotal: 27500 }
      ]
    }
  ]);

  const [customerInvoices, setCustomerInvoices] = useState([
    {
      id: 1,
      invNumber: 'INV0001',
      salesOrderId: 1,
      customerId: 2,
      customerName: 'Nimesh Pathak',
      invoiceDate: '2026-09-03',
      dueDate: '2026-09-17',
      status: 'PAID', // DRAFT | CONFIRMED | PAID
      totalAmount: 31690, // with tax
      paidAmount: 31690,
      lines: [
        { productId: 1, productName: 'Ergonomic Office Chair', quantity: 5, unitPrice: 5500, subtotal: 27500 }
      ]
    }
  ]);

  const [payments, setPayments] = useState([
    {
      id: 1,
      paymentNumber: 'PAY0001',
      paymentType: 'OUTBOUND',
      partnerId: 1,
      partnerName: 'Azure Furniture',
      billId: 1,
      billNumber: 'BILL0001',
      amount: 38000,
      paymentMethod: 'BANK',
      date: '2026-09-03',
      status: 'POSTED'
    },
    {
      id: 2,
      paymentNumber: 'PAY0002',
      paymentType: 'INBOUND',
      partnerId: 2,
      partnerName: 'Nimesh Pathak',
      invoiceId: 1,
      invNumber: 'INV0001',
      amount: 31690,
      paymentMethod: 'BANK',
      date: '2026-09-04',
      status: 'POSTED'
    }
  ]);

  // Initial balanced Journal Entries
  const [journalEntries, setJournalEntries] = useState([
    {
      id: 1,
      entryNumber: 'JE0001',
      date: '2026-09-02',
      reference: 'BILL0001 Confirm (Azure Furniture)',
      journalName: 'Purchase Journal',
      status: 'POSTED',
      items: [
        { accountCode: '5001', accountName: 'Purchase Expense', debit: 38000, credit: 0 },
        { accountCode: '2001', accountName: 'Creditors (Azure Furniture)', debit: 0, credit: 38000 }
      ]
    },
    {
      id: 2,
      entryNumber: 'JE0002',
      date: '2026-09-03',
      reference: 'Payment to Azure Furniture via Bank',
      journalName: 'Bank Journal',
      status: 'POSTED',
      items: [
        { accountCode: '2001', accountName: 'Creditors (Azure Furniture)', debit: 38000, credit: 0 },
        { accountCode: '1002', accountName: 'Bank Account (HDFC)', debit: 0, credit: 38000 }
      ]
    },
    {
      id: 3,
      entryNumber: 'JE0003',
      date: '2026-09-03',
      reference: 'INV0001 Confirm (Nimesh Pathak)',
      journalName: 'Sales Journal',
      status: 'POSTED',
      items: [
        { accountCode: '1003', accountName: 'Debtors (Nimesh Pathak)', debit: 31690, credit: 0 },
        { accountCode: '4001', accountName: 'Sales Income', debit: 0, credit: 27500 },
        { accountCode: '2002', accountName: 'Tax Payable (GST 18%)', debit: 0, credit: 4190 }
      ]
    },
    {
      id: 4,
      entryNumber: 'JE0004',
      date: '2026-09-04',
      reference: 'Receipt from Nimesh Pathak via Bank',
      journalName: 'Bank Journal',
      status: 'POSTED',
      items: [
        { accountCode: '1002', accountName: 'Bank Account (HDFC)', debit: 31690, credit: 0 },
        { accountCode: '1003', accountName: 'Debtors (Nimesh Pathak)', debit: 0, credit: 31690 }
      ]
    }
  ]);

  // Auth Functions — real API first (Phase 1 backend), mock fallback for offline demo
  const persistSession = (jwt, user) => {
    if (jwt) localStorage.setItem('uf_token', jwt);
    if (user) localStorage.setItem('uf_user', JSON.stringify(user));
    setToken(jwt || null);
    setCurrentUser(user || null);
  };

  // Validate session on mount when a token exists (GET /api/auth/me)
  useEffect(() => {
    const restore = async () => {
      const savedToken = localStorage.getItem('uf_token');
      if (!savedToken) { setSessionRestored(true); return; }
      try {
        const res = await authAPI.me();
        const user = res.data?.user || res.data;
        if (user?.loginId) {
          localStorage.setItem('uf_user', JSON.stringify(user));
          setCurrentUser(user);
          setToken(savedToken);
        }
      } catch {
        // Stale/invalid token: interceptor already cleared it; keep mock user for offline demo
        if (!localStorage.getItem('uf_token')) setToken(null);
      } finally {
        setSessionRestored(true);
      }
    };
    restore();
  }, []);

  const mockLogin = (loginId, password) => {
    const found = users.find(u => u.loginId.toLowerCase() === loginId.trim().toLowerCase() && u.password === password);
    if (found) {
      return { success: true, user: found, mock: true };
    }
    return { success: false, error: 'Invalid Login Id or Password' };
  };

  const login = async (loginId, password) => {
    setAuthLoading(true);
    try {
      const res = await authAPI.login(loginId?.trim(), password);
      const { token: jwt, user } = res.data || {};
      if (jwt && user) {
        persistSession(jwt, user);
        return { success: true, user };
      }
      return { success: false, error: 'Unexpected response from server.' };
    } catch (err) {
      // Backend validation/401 → show exact message, don't fall back (would mask real errors)
      if (err?.response?.data?.error) {
        return { success: false, error: err.response.data.error };
      }
      if (!USE_MOCK_FALLBACK) return { success: false, error: getApiError(err) };
      const mockRes = mockLogin(loginId, password);
      if (mockRes.success) {
        // Offline demo: keep working without a JWT
        setCurrentUser(mockRes.user);
        return { ...mockRes, offline: true };
      }
      return mockRes.success ? mockRes : { success: false, error: `${mockRes.error} (backend unreachable)` };
    } finally {
      setAuthLoading(false);
    }
  };

  const mockSignup = (userData) => {
    // Validation (mirrors backend rules in CONTRACT 1.2)
    if (!userData.loginId || userData.loginId.length < 6 || userData.loginId.length > 12) {
      return { success: false, error: 'Login ID must be between 6 and 12 characters.' };
    }
    if (users.some(u => u.loginId.toLowerCase() === userData.loginId.toLowerCase())) {
      return { success: false, error: 'Login ID is already taken.' };
    }
    if (users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
      return { success: false, error: 'Email is already registered.' };
    }
    // Password strength check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(userData.password)) {
      return { success: false, error: 'Password must be >8 characters, with lowercase, uppercase, and special character.' };
    }
    if (userData.password !== userData.confirmPassword) {
      return { success: false, error: 'Passwords do not match.' };
    }

    const newUser = {
      id: users.length + 1,
      name: userData.name || userData.loginId,
      loginId: userData.loginId,
      email: userData.email,
      role: userData.role || 'USER',
      password: userData.password
    };

    setUsers(prev => [...prev, newUser]);
    return { success: true, user: newUser, mock: true };
  };

  const signup = async (userData) => {
    setAuthLoading(true);
    try {
      // Backend /signup always creates USER role + auto-links Contact (CONTRACT 1.2)
      const res = await authAPI.signup({
        name: userData.name,
        loginId: userData.loginId?.trim(),
        email: userData.email?.trim(),
        password: userData.password,
        confirmPassword: userData.confirmPassword,
      });
      const { token: jwt, user } = res.data || {};
      if (jwt && user) persistSession(jwt, user);
      else if (res.data?.user) persistSession(null, res.data.user);
      return { success: true, user: res.data?.user || user };
    } catch (err) {
      if (err?.response?.data?.error) {
        return { success: false, error: err.response.data.error };
      }
      if (!USE_MOCK_FALLBACK) return { success: false, error: getApiError(err) };
      const mockRes = mockSignup(userData);
      if (mockRes.success) setCurrentUser(mockRes.user);
      return mockRes;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('uf_token');
    localStorage.removeItem('uf_user');
    setToken(null);
    setCurrentUser(null);
  };

  // Admin offline fallback: add user to local mock store (no session change)
  const addMockUser = (userData) => {
    const newUser = {
      id: users.length + 1,
      name: userData.name || userData.loginId,
      loginId: userData.loginId,
      email: userData.email,
      role: userData.role || 'USER',
      password: userData.password,
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  // Helper: Sequence generator
  const getNextSequence = (prefix, list, field = 'id') => {
    const nextNum = list.length + 1;
    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  };

  // Master Data Adders
  const addContact = (contact) => {
    const newId = contacts.length + 1;
    const newContact = { ...contact, id: newId };
    setContacts(prev => [newContact, ...prev]);
    return newContact;
  };

  const addProduct = (product) => {
    const newId = products.length + 1;
    const newProduct = { ...product, id: newId };
    setProducts(prev => [newProduct, ...prev]);
    return newProduct;
  };

  const addAccount = (account) => {
    const newAccount = { ...account, id: accounts.length + 1 };
    setAccounts(prev => [...prev, newAccount]);
    return newAccount;
  };

  // ---- Phase 3: live shapes (backend) normalized to the mock UI shape ----
  const day = (d) => (d ? String(d).slice(0, 10) : new Date().toISOString().split('T')[0]);
  const num = (v) => Number(v || 0);
  const [liveFlow, setLiveFlow] = useState(false); // true once purchase/ledger synced from backend

  const normPO = (po) => ({
    id: po.id,
    poNumber: po.poNumber,
    vendorId: po.vendorId,
    vendorName: po.vendor?.name || 'Vendor',
    date: day(po.date),
    status: po.status,
    totalAmount: num(po.totalAmount),
    lines: (po.lines || []).map((l) => ({
      productId: l.productId,
      productName: l.product?.name || 'Product',
      quantity: num(l.quantity),
      unitPrice: num(l.unitPrice),
      subtotal: num(l.subtotal),
    })),
  });

  const normBill = (b) => ({
    id: b.id,
    billNumber: b.billNumber,
    purchaseOrderId: b.purchaseOrderId ?? b.purchaseOrder?.id ?? null,
    vendorId: b.vendorId,
    vendorName: b.vendor?.name || 'Vendor',
    billDate: day(b.billDate),
    dueDate: day(b.dueDate),
    status: b.status,
    totalAmount: num(b.totalAmount),
    paidAmount: num(b.paidAmount),
    lines: (b.lines || []).map((l) => ({
      productId: l.productId,
      productName: l.product?.name || 'Product',
      quantity: num(l.quantity),
      unitPrice: num(l.unitPrice),
      subtotal: num(l.subtotal),
    })),
  });

  const normPayment = (p) => ({
    id: p.id,
    paymentNumber: p.paymentNumber,
    paymentType: p.paymentType,
    partnerId: p.partnerId,
    partnerName: '',
    billId: p.billId ?? null,
    invoiceId: p.invoiceId ?? null,
    billNumber: '',
    invNumber: '',
    amount: num(p.amount),
    paymentMethod: p.paymentMethod,
    journalId: p.journalId,
    date: day(p.date),
    status: p.status,
  });

  const normJE = (e) => ({
    id: e.id,
    entryNumber: e.entryNumber,
    date: day(e.date),
    reference: e.reference || '',
    journalName: e.journal?.name || '',
    journalId: e.journal?.id,
    status: e.status,
    items: (e.items || []).map((it) => ({
      accountCode: it.account?.code || '',
      accountName: it.account?.name || '',
      accountId: it.account?.id,
      partnerName: it.label || '',
      debit: num(it.debit),
      credit: num(it.credit),
    })),
  });

  // Pull live purchase/ledger state; returns true on success, false offline
  const syncPurchaseFlow = async () => {
    try {
      const isStaff = currentUser?.role === 'ADMIN' || currentUser?.role === 'ACCOUNTANT';
      const calls = [purchasesAPI.list(), billsAPI.list()];
      if (isStaff) {
        calls.push(journalEntriesAPI.list());
      }
      const results = await Promise.all(calls);
      const poRes = results[0];
      const billRes = results[1];
      const jeRes = isStaff ? results[2] : { data: { journalEntries: [] } };

      const livePOs = (poRes.data?.purchaseOrders || []).map(normPO);
      const liveBills = (billRes.data?.bills || []).map(normBill);
      const liveJEs = (jeRes.data?.journalEntries || []).map(normJE);
      // Live payments arrive nested inside bills
      const livePays = [];
      (billRes.data?.bills || []).forEach((b) => (b.payments || []).forEach((p) => livePays.push({ ...normPayment(p), billId: b.id })));
      setPurchaseOrders(livePOs);
      setVendorBills(liveBills);
      // Live is authoritative for purchase-side payments; keep mock sales receipts
      setPayments((prev) => [...prev.filter((p) => p.invoiceId != null && p.billId == null), ...livePays]);
      if (isStaff) setJournalEntries(liveJEs);
      setLiveFlow(true);
      return true;
    } catch {
      setLiveFlow(false);
      return false;
    }
  };

  // Sync once a session exists
  useEffect(() => {
    if (token) {
      syncPurchaseFlow();
    }
  }, [token, currentUser?.role]);

  // ---- Workflow: Purchase (live-first, mock fallback) ----
  const createPurchaseOrder = async (vendorId, lines, extra = {}) => {
    const payload = {
      vendorId: Number(vendorId),
      date: extra.date || new Date().toISOString().split('T')[0],
      lines: lines.map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
    };
    try {
      const res = await purchasesAPI.create(payload);
      await syncPurchaseFlow();
      return normPO(res.data.purchaseOrder);
    } catch {
      if (!USE_MOCK_FALLBACK) throw new Error('Backend unreachable.');
      const vendor = contacts.find(c => c.id === Number(vendorId));
    const totalAmount = lines.reduce((sum, l) => sum + (Number(l.quantity) * Number(l.unitPrice)), 0);
    const poNumber = getNextSequence('PO', purchaseOrders);

    const newPO = {
      id: purchaseOrders.length + 1,
      poNumber,
      vendorId: Number(vendorId),
      vendorName: vendor?.name || 'Unknown Vendor',
      date: extra.date || new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      totalAmount,
      lines: lines.map(l => ({
        productId: Number(l.productId),
        productName: products.find(p => p.id === Number(l.productId))?.name || 'Product',
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        subtotal: Number(l.quantity) * Number(l.unitPrice),
        ...(l.analytic ? { analytic: l.analytic } : {}),
      }))
    };

    setPurchaseOrders(prev => [newPO, ...prev]);
    return newPO;
    } // end catch (mock fallback)
  };

  const confirmPurchaseOrder = async (poId) => {
    try {
      await purchasesAPI.confirm(poId);
      await syncPurchaseFlow();
    } catch {
      if (!USE_MOCK_FALLBACK) throw new Error('Backend unreachable.');
      setPurchaseOrders(prev => prev.map(po => po.id === poId ? { ...po, status: 'CONFIRMED' } : po));
    }
  };

  const createBillFromPO = async (poId) => {
    try {
      const res = await purchasesAPI.createBill(poId);
      await syncPurchaseFlow();
      return normBill(res.data.bill);
    } catch {
      if (!USE_MOCK_FALLBACK) throw new Error('Backend unreachable.');
      const po = purchaseOrders.find(p => p.id === poId);
      if (!po) return null;

      const billNumber = getNextSequence('BILL', vendorBills);
      const newBill = {
        id: vendorBills.length + 1,
        billNumber,
        purchaseOrderId: po.id,
        vendorId: po.vendorId,
        vendorName: po.vendorName,
        billDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'DRAFT',
        totalAmount: po.totalAmount,
        paidAmount: 0,
        lines: po.lines
      };

      setVendorBills(prev => [newBill, ...prev]);
      setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, status: 'BILLED' } : p));
      return newBill;
    }
  };

  const vendorSubmitBill = async (poId, payload) => {
    try {
      const res = await purchasesAPI.vendorSubmitBill(poId, payload);
      await syncPurchaseFlow();
      return { success: true, bill: normBill(res.data.bill) };
    } catch (err) {
      return { success: false, error: getApiError(err) };
    }
  };

  const confirmVendorBill = async (billId) => {
    try {
      await billsAPI.confirm(billId);
      await syncPurchaseFlow();
      return { success: true };
    } catch (err) {
      if (!USE_MOCK_FALLBACK) return { success: false, error: getApiError(err) };
      const bill = vendorBills.find(b => b.id === billId);
      if (!bill) return { success: false };

      // Mock automated Double Entry: Dr Purchase Expense, Cr Creditors
      const entryNumber = getNextSequence('JE', journalEntries);
      const newEntry = {
        id: journalEntries.length + 1,
        entryNumber,
        date: bill.billDate,
        reference: `${bill.billNumber} Confirm (${bill.vendorName})`,
        journalName: 'Purchase Journal',
        status: 'POSTED',
        items: [
          { accountCode: '5001', accountName: 'Purchase Expense', debit: bill.totalAmount, credit: 0 },
          { accountCode: '2001', accountName: `Creditors (${bill.vendorName})`, debit: 0, credit: bill.totalAmount }
        ]
      };

      setJournalEntries(prev => [newEntry, ...prev]);
      setVendorBills(prev => prev.map(b => b.id === billId ? { ...b, status: 'CONFIRMED' } : b));
      return { success: true };
    }
  };

  const registerBillPayment = async (billId, paymentMethod = 'BANK') => {
    try {
      // No amount sent → backend settles full remaining due (matches Pay modal)
      const res = await billsAPI.pay(billId, { paymentMethod });
      await syncPurchaseFlow();
      return { success: true, amountDue: res.data?.amountDue ?? 0 };
    } catch (err) {
      if (!USE_MOCK_FALLBACK) return { success: false, error: getApiError(err) };
      const bill = vendorBills.find(b => b.id === billId);
      if (!bill) return { success: false };

    const payNumber = getNextSequence('PAY', payments);
    const newPayment = {
      id: payments.length + 1,
      paymentNumber: payNumber,
      paymentType: 'OUTBOUND',
      partnerId: bill.vendorId,
      partnerName: bill.vendorName,
      billId: bill.id,
      billNumber: bill.billNumber,
      amount: bill.totalAmount,
      paymentMethod,
      date: new Date().toISOString().split('T')[0],
      status: 'POSTED'
    };

    // Automated Double Entry: Dr Creditors, Cr Bank/Cash
    const creditAccountCode = paymentMethod === 'BANK' ? '1002' : '1001';
    const creditAccountName = paymentMethod === 'BANK' ? 'Bank Account (HDFC)' : 'Cash on Hand';
    const entryNumber = getNextSequence('JE', journalEntries);

    const newEntry = {
      id: journalEntries.length + 1,
      entryNumber,
      date: newPayment.date,
      reference: `Payment for ${bill.billNumber} via ${paymentMethod}`,
      journalName: paymentMethod === 'BANK' ? 'Bank Journal' : 'Cash Journal',
      status: 'POSTED',
      items: [
        { accountCode: '2001', accountName: `Creditors (${bill.vendorName})`, debit: bill.totalAmount, credit: 0 },
        { accountCode: creditAccountCode, accountName: creditAccountName, debit: 0, credit: bill.totalAmount }
      ]
    };

    setPayments(prev => [newPayment, ...prev]);
    setJournalEntries(prev => [newEntry, ...prev]);
    setVendorBills(prev => prev.map(b => b.id === billId ? { ...b, status: 'PAID', paidAmount: bill.totalAmount } : b));
    return { success: true };
    }
  };

  // Workflow: Sales
  const createSalesOrder = (customerId, lines, extra = {}) => {
    const customer = contacts.find(c => c.id === Number(customerId));
    const subtotal = lines.reduce((sum, l) => sum + (Number(l.quantity) * Number(l.unitPrice)), 0);
    const taxRate = 18;
    const taxAmount = Math.round((subtotal * taxRate) / 100);
    const totalAmount = subtotal + taxAmount;
    const soNumber = getNextSequence('SO', salesOrders);

    const newSO = {
      id: salesOrders.length + 1,
      soNumber,
      customerId: Number(customerId),
      customerName: customer?.name || 'Customer',
      date: extra.date || new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      taxRate,
      taxAmount,
      totalAmount,
      lines: lines.map(l => ({
        productId: Number(l.productId),
        productName: products.find(p => p.id === Number(l.productId))?.name || 'Product',
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        subtotal: Number(l.quantity) * Number(l.unitPrice),
        ...(l.analytic ? { analytic: l.analytic } : {}),
      }))
    };

    setSalesOrders(prev => [newSO, ...prev]);
    return newSO;
  };

  const confirmSalesOrder = (soId) => {
    setSalesOrders(prev => prev.map(so => so.id === soId ? { ...so, status: 'CONFIRMED' } : so));
  };

  const createInvoiceFromSO = (soId) => {
    const so = salesOrders.find(s => s.id === soId);
    if (!so) return null;

    const invNumber = getNextSequence('INV', customerInvoices);
    const newInvoice = {
      id: customerInvoices.length + 1,
      invNumber,
      salesOrderId: so.id,
      customerId: so.customerId,
      customerName: so.customerName,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'DRAFT',
      totalAmount: so.totalAmount,
      paidAmount: 0,
      lines: so.lines
    };

    setCustomerInvoices(prev => [newInvoice, ...prev]);
    setSalesOrders(prev => prev.map(s => s.id === soId ? { ...s, status: 'INVOICED' } : s));
    return newInvoice;
  };

  const confirmCustomerInvoice = (invId) => {
    const inv = customerInvoices.find(i => i.id === invId);
    if (!inv) return;

    // Automated Double Entry: Dr Debtors, Cr Sales Income, Cr Tax Payable
    const subtotal = inv.lines.reduce((s, l) => s + l.subtotal, 0);
    const taxAmount = inv.totalAmount - subtotal;
    const entryNumber = getNextSequence('JE', journalEntries);

    const items = [
      { accountCode: '1003', accountName: `Debtors (${inv.customerName})`, debit: inv.totalAmount, credit: 0 },
      { accountCode: '4001', accountName: 'Sales Income', debit: 0, credit: subtotal }
    ];
    if (taxAmount > 0) {
      items.push({ accountCode: '2002', accountName: 'Tax Payable (GST 18%)', debit: 0, credit: taxAmount });
    }

    const newEntry = {
      id: journalEntries.length + 1,
      entryNumber,
      date: inv.invoiceDate,
      reference: `${inv.invNumber} Confirm (${inv.customerName})`,
      journalName: 'Sales Journal',
      status: 'POSTED',
      items
    };

    setJournalEntries(prev => [newEntry, ...prev]);
    setCustomerInvoices(prev => prev.map(i => i.id === invId ? { ...i, status: 'CONFIRMED' } : i));
  };

  const registerInvoicePayment = (invId, paymentMethod = 'BANK') => {
    const inv = customerInvoices.find(i => i.id === invId);
    if (!inv) return;

    const payNumber = getNextSequence('PAY', payments);
    const newPayment = {
      id: payments.length + 1,
      paymentNumber: payNumber,
      paymentType: 'INBOUND',
      partnerId: inv.customerId,
      partnerName: inv.customerName,
      invoiceId: inv.id,
      invNumber: inv.invNumber,
      amount: inv.totalAmount,
      paymentMethod,
      date: new Date().toISOString().split('T')[0],
      status: 'POSTED'
    };

    // Automated Double Entry: Dr Bank/Cash, Cr Debtors
    const debitAccountCode = paymentMethod === 'BANK' ? '1002' : '1001';
    const debitAccountName = paymentMethod === 'BANK' ? 'Bank Account (HDFC)' : 'Cash on Hand';
    const entryNumber = getNextSequence('JE', journalEntries);

    const newEntry = {
      id: journalEntries.length + 1,
      entryNumber,
      date: newPayment.date,
      reference: `Receipt for ${inv.invNumber} via ${paymentMethod}`,
      journalName: paymentMethod === 'BANK' ? 'Bank Journal' : 'Cash Journal',
      status: 'POSTED',
      items: [
        { accountCode: debitAccountCode, accountName: debitAccountName, debit: inv.totalAmount, credit: 0 },
        { accountCode: '1003', accountName: `Debtors (${inv.customerName})`, debit: 0, credit: inv.totalAmount }
      ]
    };

    setPayments(prev => [newPayment, ...prev]);
    setJournalEntries(prev => [newEntry, ...prev]);
    setCustomerInvoices(prev => prev.map(i => i.id === invId ? { ...i, status: 'PAID', paidAmount: inv.totalAmount } : i));
  };

  // Manual Journal Entry (live-first; strict server balance check; mock fallback)
  const createJournalEntry = async ({ journalName, journalId, date, reference, lines }) => {
    const debit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const credit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
    if (Math.abs(debit - credit) > 0.005) {
      return { success: false, error: `Journal Entry is unbalanced! Total Debit (${debit}) != Total Credit (${credit})` };
    }
    try {
      let jId = journalId;
      if (!jId) {
        const jRes = await journalsAPI.list();
        const match = (jRes.data?.journals || []).find((j) => j.name === journalName);
        if (!match) throw new Error('Journal not found on backend.');
        jId = match.id;
      }
      const res = await journalEntriesAPI.create({
        date: date || new Date().toISOString().split('T')[0],
        journalId: jId,
        reference: reference || 'Manual Entry',
        lines: lines.map((l) => ({
          accountId: Number(l.accountId),
          debit: Number(l.debit || 0),
          credit: Number(l.credit || 0),
          label: l.partnerName || reference || 'Manual Entry',
        })),
      });
      await syncPurchaseFlow();
      const created = res.data?.journalEntry;
      return { success: true, entry: created ? normJE({ ...created, journal: created.journal || { name: journalName } }) : null };
    } catch (err) {
      if (err?.response?.data?.error) return { success: false, error: err.response.data.error };
      if (!USE_MOCK_FALLBACK) return { success: false, error: getApiError(err) };
    const entryNumber = getNextSequence('JE', journalEntries);
    const newEntry = {
      id: journalEntries.length + 1,
      entryNumber,
      date: date || new Date().toISOString().split('T')[0],
      reference: reference || 'Manual entry',
      journalName: journalName || 'General',
      status: 'POSTED',
      items: lines.map((l) => ({
        accountCode: l.accountCode || '',
        accountName: l.accountName || '',
        partnerName: l.partnerName || '',
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
      })),
    };
    setJournalEntries(prev => [newEntry, ...prev]);
    return { success: true, entry: newEntry };
    } // end catch (mock fallback)
  };

  return (
    <AccountingContext.Provider value={{
      currentUser,
      token,
      authLoading,
      sessionRestored,
      isAuthenticated: !!currentUser,
      setCurrentUser,
      users,
      addMockUser,
      login,
      signup,
      logout,
      contacts,
      addContact,
      products,
      addProduct,
      accounts,
      addAccount,
      journals,
      budgets,
      purchaseOrders,
      createPurchaseOrder,
      confirmPurchaseOrder,
      createBillFromPO,
      vendorSubmitBill,
      vendorBills,
      confirmVendorBill,
      registerBillPayment,
      salesOrders,
      createSalesOrder,
      confirmSalesOrder,
      createInvoiceFromSO,
      customerInvoices,
      confirmCustomerInvoice,
      registerInvoicePayment,
      payments,
      journalEntries,
      createJournalEntry,
      liveFlow,
      syncPurchaseFlow
    }}>{children}</AccountingContext.Provider>
  );
};

export const useAccounting = () => useContext(AccountingContext);
