import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  authAPI,
  getApiError,
  USE_MOCK_FALLBACK,
  contactsAPI,
  productsAPI,
  accountsAPI,
  journalsAPI,
  budgetsAPI,
  analyticsAPI,
  purchasesAPI,
  billsAPI,
  journalEntriesAPI,
  salesAPI,
  invoicesAPI,
  paymentsAPI,
} from '../services/api';

const AccountingContext = createContext();

export const AccountingProvider = ({ children }) => {
  // Current active user / session (restored from localStorage when backend JWT exists)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('uf_user');
      const savedToken = localStorage.getItem('uf_token');
      return saved && savedToken ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('uf_token') || null);
  const [authLoading, setAuthLoading] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);

  const [users, setUsers] = useState([
    { id: 1, name: 'Admin Master', loginId: 'admin', email: 'admin@urbanfurniture.in', role: 'ADMIN', password: 'Admin@123' },
    { id: 2, name: 'Alex Accountant', loginId: 'accountant01', email: 'alex@urbanfurniture.in', role: 'ACCOUNTANT', password: 'Password@123' },
    { id: 3, name: 'Nimesh Pathak', loginId: 'nimeshp', email: 'nimesh@gmail.com', role: 'USER', password: 'Password@123' }
  ]);

  const [contacts, setContacts] = useState([]);
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [journals, setJournals] = useState([]);
  const [budgets, setBudgets] = useState([]);

  // Operational State - 100% Live from PostgreSQL backend
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendorBills, setVendorBills] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);

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
      if (savedToken) {
        try {
          const res = await authAPI.me();
          const user = res.data?.user || res.data;
          if (user && user.loginId) {
            localStorage.setItem('uf_user', JSON.stringify(user));
            setCurrentUser(user);
            setToken(savedToken);
            syncAllData();
          } else {
            throw new Error('Invalid user payload');
          }
        } catch {
          // Stale or invalid token: clear session
          localStorage.removeItem('uf_token');
          localStorage.removeItem('uf_user');
          setToken(null);
          setCurrentUser(null);
        }
      } else {
        localStorage.removeItem('uf_token');
        localStorage.removeItem('uf_user');
        setToken(null);
        setCurrentUser(null);
      }
      setSessionRestored(true);
    };
    restore();
  }, []);

  const login = async (loginId, password) => {
    setAuthLoading(true);
    try {
      const res = await authAPI.login(loginId?.trim(), password);
      const { token: jwt, user } = res.data || {};
      if (jwt && user) {
        localStorage.removeItem('uf_logged_out');
        persistSession(jwt, user);
        syncAllData();
        return { success: true, user };
      }
      return { success: false, error: 'Unexpected response from server.' };
    } catch (err) {
      if (err?.response?.data?.error) {
        return { success: false, error: err.response.data.error };
      }
      return { success: false, error: getApiError(err) };
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
      return { success: false, error: getApiError(err) };
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('uf_logged_out');
    localStorage.removeItem('uf_token');
    localStorage.removeItem('uf_user');
    setToken(null);
    setCurrentUser(null);
    setContacts([]);
    setProducts([]);
    setAccounts([]);
    setBudgets([]);
    setPurchaseOrders([]);
    setVendorBills([]);
    setSalesOrders([]);
    setCustomerInvoices([]);
    setPayments([]);
    setJournalEntries([]);
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

  // Master Data Adders & Live Persistence
  const createContact = async (contact) => {
    const res = await contactsAPI.create(contact);
    await syncAllData();
    return res.data?.contact;
  };

  const addContact = async (contact) => {
    try {
      const res = await contactsAPI.create(contact);
      await syncAllData();
      return res.data?.contact || contact;
    } catch {
      const newId = contacts.length + 1;
      const newContact = { ...contact, id: newId };
      setContacts(prev => [newContact, ...prev]);
      return newContact;
    }
  };

  const createProduct = async (product) => {
    const res = await productsAPI.create(product);
    await syncAllData();
    return res.data?.product;
  };

  const addProduct = async (product) => {
    try {
      const res = await productsAPI.create(product);
      await syncAllData();
      return res.data?.product || product;
    } catch {
      const newId = products.length + 1;
      const newProduct = { ...product, id: newId };
      setProducts(prev => [newProduct, ...prev]);
      return newProduct;
    }
  };

  const createAccount = async (account) => {
    const res = await accountsAPI.create(account);
    await syncAllData();
    return res.data?.account;
  };

  const addAccount = async (account) => {
    try {
      const res = await accountsAPI.create(account);
      await syncAllData();
      return res.data?.account || account;
    } catch {
      const newAccount = { ...account, id: accounts.length + 1 };
      setAccounts(prev => [...prev, newAccount]);
      return newAccount;
    }
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
    reference: b.reference || '',
    purchaseOrderId: b.purchaseOrderId ?? b.purchaseOrder?.id ?? null,
    poNumber: b.purchaseOrder?.poNumber || '',
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

  const normSO = (so) => ({
    id: so.id,
    soNumber: so.soNumber,
    customerId: so.customerId,
    customerName: so.customer?.name || 'Customer',
    date: day(so.date),
    status: so.status,
    taxRate: num(so.taxRate),
    taxAmount: num(so.taxAmount),
    totalAmount: num(so.totalAmount),
    lines: (so.lines || []).map((l) => ({
      productId: l.productId,
      productName: l.product?.name || 'Product',
      quantity: num(l.quantity),
      unitPrice: num(l.unitPrice),
      subtotal: num(l.subtotal),
    })),
  });

  const normInv = (inv) => ({
    id: inv.id,
    invNumber: inv.invNumber,
    salesOrderId: inv.salesOrderId ?? inv.salesOrder?.id ?? null,
    soNumber: inv.salesOrder?.soNumber || '',
    customerId: inv.customerId,
    customerName: inv.customer?.name || 'Customer',
    invoiceDate: day(inv.invoiceDate),
    dueDate: day(inv.dueDate),
    taxRate: num(inv.taxRate),
    taxAmount: num(inv.taxAmount),
    status: inv.status,
    totalAmount: num(inv.totalAmount),
    paidAmount: num(inv.paidAmount),
    lines: (inv.lines || []).map((l) => ({
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
    partnerName: p.partner?.name || '',
    billId: p.billId ?? null,
    invoiceId: p.invoiceId ?? null,
    billNumber: p.bill?.billNumber || '',
    invNumber: p.invoice?.invNumber || '',
    amount: num(p.amount),
    paymentMethod: p.paymentMethod || 'BANK',
    journalId: p.journalId,
    journalName: p.journal?.name || '',
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

  // Pull ALL live state from PostgreSQL backend
  const syncAllData = async () => {
    const savedToken = localStorage.getItem('uf_token');
    if (!savedToken) return false;
    try {
      const [
        contactsRes,
        productsRes,
        accountsRes,
        journalsRes,
        budgetsRes,
        poRes,
        billRes,
        soRes,
        invRes,
        payRes,
      ] = await Promise.all([
        contactsAPI.list().catch(() => ({ data: { contacts: [] } })),
        productsAPI.list().catch(() => ({ data: { products: [] } })),
        accountsAPI.list().catch(() => ({ data: { accounts: [] } })),
        journalsAPI.list().catch(() => ({ data: { journals: [] } })),
        budgetsAPI.list().catch(() => ({ data: { budgets: [] } })),
        purchasesAPI.list().catch(() => ({ data: { purchaseOrders: [] } })),
        billsAPI.list().catch(() => ({ data: { bills: [] } })),
        salesAPI.list().catch(() => ({ data: { salesOrders: [] } })),
        invoicesAPI.list().catch(() => ({ data: { invoices: [] } })),
        paymentsAPI.list().catch(() => ({ data: { payments: [] } })),
      ]);

      if (contactsRes.data?.contacts?.length) {
        setContacts(contactsRes.data.contacts);
      }
      if (productsRes.data?.products?.length) {
        setProducts(productsRes.data.products);
      }
      if (accountsRes.data?.accounts?.length) {
        setAccounts(accountsRes.data.accounts);
      }
      if (journalsRes.data?.journals?.length) {
        setJournals(journalsRes.data.journals);
      }
      if (budgetsRes.data?.budgets?.length) {
        setBudgets(budgetsRes.data.budgets);
      }

      const livePOs = (poRes.data?.purchaseOrders || []).map(normPO);
      const liveBills = (billRes.data?.bills || []).map(normBill);
      const liveSOs = (soRes.data?.salesOrders || []).map(normSO);
      const liveInvs = (invRes.data?.invoices || []).map(normInv);

      setPurchaseOrders(livePOs);
      setVendorBills(liveBills);
      setSalesOrders(liveSOs);
      setCustomerInvoices(liveInvs);

      if (payRes.data?.payments?.length) {
        setPayments(payRes.data.payments.map(normPayment));
      } else {
        // Fallback to nested payments from bills and invoices
        const liveBillPays = [];
        (billRes.data?.bills || []).forEach((b) =>
          (b.payments || []).forEach((p) =>
            liveBillPays.push({
              ...normPayment(p),
              billId: b.id,
              billNumber: b.billNumber,
              partnerName: b.vendor?.name || '',
            })
          )
        );
        const liveInvPays = [];
        (invRes.data?.invoices || []).forEach((i) =>
          (i.payments || []).forEach((p) =>
            liveInvPays.push({
              ...normPayment(p),
              invoiceId: i.id,
              invNumber: i.invNumber,
              partnerName: i.customer?.name || '',
            })
          )
        );
        setPayments([...liveBillPays, ...liveInvPays]);
      }

      // Journal entries are staff-only (USER gets 403) — sync separately
      try {
        const jeRes = await journalEntriesAPI.list();
        if (jeRes.data?.journalEntries) {
          setJournalEntries(jeRes.data.journalEntries.map(normJE));
        }
      } catch {
        /* portal roles keep existing entries */
      }
      setLiveFlow(true);
      return true;
    } catch {
      setLiveFlow(false);
      return false;
    }
  };

  const syncPurchaseFlow = syncAllData;

  // Sync once a session exists (reads are role-filtered server-side)
  useEffect(() => {
    if (token && currentUser) {
      syncAllData();
    }
  }, [token, currentUser]);

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

  // ---- Workflow: Sales (live-first, mock fallback) ----
  const createSalesOrder = async (customerId, lines, extra = {}) => {
    const payload = {
      customerId: Number(customerId),
      date: extra.date || new Date().toISOString().split('T')[0],
      taxRate: 18,
      lines: lines.map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
    };
    try {
      const res = await salesAPI.create(payload);
      await syncPurchaseFlow();
      return normSO(res.data.salesOrder);
    } catch {
      if (!USE_MOCK_FALLBACK) throw new Error('Backend unreachable.');
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
    } // end catch (mock fallback)
  };

  const confirmSalesOrder = async (soId) => {
    try {
      await salesAPI.confirm(soId);
      await syncPurchaseFlow();
    } catch {
      if (!USE_MOCK_FALLBACK) throw new Error('Backend unreachable.');
      setSalesOrders(prev => prev.map(so => so.id === soId ? { ...so, status: 'CONFIRMED' } : so));
    }
  };

  const cancelSalesOrder = async (soId) => {
    try {
      await salesAPI.cancel(soId);
      await syncPurchaseFlow();
    } catch (err) {
      throw new Error(err?.response?.data?.error || getApiError(err) || 'Cancel failed.');
    }
  };

  const createInvoiceFromSO = async (soId) => {
    try {
      const res = await salesAPI.createInvoice(soId);
      await syncPurchaseFlow();
      return normInv(res.data.invoice);
    } catch {
      if (!USE_MOCK_FALLBACK) throw new Error('Backend unreachable.');
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
    } // end catch (mock fallback)
  };

  const confirmCustomerInvoice = async (invId) => {
    try {
      await invoicesAPI.confirm(invId);
      await syncPurchaseFlow();
      return { success: true };
    } catch (err) {
      if (!USE_MOCK_FALLBACK) return { success: false, error: getApiError(err) };
      const inv = customerInvoices.find(i => i.id === invId);
      if (!inv) return { success: false };

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
    return { success: true };
    } // end catch (mock fallback)
  };

  const registerInvoicePayment = async (invId, paymentMethod = 'BANK') => {
    try {
      // No amount sent → backend settles full remaining due (portal + staff)
      const res = await invoicesAPI.pay(invId, { paymentMethod });
      await syncPurchaseFlow();
      return { success: true, amountDue: res.data?.amountDue ?? 0 };
    } catch (err) {
      if (!USE_MOCK_FALLBACK) return { success: false, error: getApiError(err) };
      const inv = customerInvoices.find(i => i.id === invId);
      if (!inv) return { success: false };

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
    return { success: true };
    } // end catch (mock fallback)
  };

  // Vendor Portal: vendor submits bill with own invoice ref (SUBMITTED, no JE yet)
  const vendorSubmitBill = async (poId, { vendorInvoiceRef, billDate } = {}) => {
    try {
      const res = await purchasesAPI.vendorSubmitBill(poId, { vendorInvoiceRef, billDate });
      await syncPurchaseFlow();
      return { success: true, bill: normBill(res.data.bill) };
    } catch (err) {
      return { success: false, error: err?.response?.data?.error || getApiError(err) };
    }
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
      createContact,
      products,
      addProduct,
      createProduct,
      accounts,
      addAccount,
      createAccount,
      journals,
      budgets,
      purchaseOrders,
      createPurchaseOrder,
      confirmPurchaseOrder,
      createBillFromPO,
      vendorBills,
      confirmVendorBill,
      registerBillPayment,
      vendorSubmitBill,
      salesOrders,
      createSalesOrder,
      confirmSalesOrder,
      cancelSalesOrder,
      createInvoiceFromSO,
      customerInvoices,
      confirmCustomerInvoice,
      registerInvoicePayment,
      payments,
      journalEntries,
      createJournalEntry,
      liveFlow,
      syncPurchaseFlow,
      syncAllData,
      refreshAllData: syncAllData,
    }}>{children}</AccountingContext.Provider>
  );
};

export const useAccounting = () => useContext(AccountingContext);
