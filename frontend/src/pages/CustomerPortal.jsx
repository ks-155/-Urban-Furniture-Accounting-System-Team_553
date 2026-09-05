import React, { useCallback, useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { contactsAPI, productsAPI } from '../services/api';
import { useLiveList } from '../hooks/useLiveList';
import { PaymentModal } from '../components/PaymentModal';
import {
  FileText,
  Wallet,
  Clock,
  CreditCard,
  ShoppingCart,
  Send,
  X,
  Plus,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const CustomerPortal = () => {
  const {
    currentUser,
    contacts: mockContacts,
    products: mockProducts,
    customerInvoices,
    purchaseOrders,
    vendorBills,
    salesOrders,
    createSalesOrder,
    registerInvoicePayment,
    vendorSubmitBill,
  } = useAccounting();

  const contactsFetcher = useCallback(() => contactsAPI.list(), []);
  const { data: liveContacts } = useLiveList(contactsFetcher, 'contacts', mockContacts);
  const contacts = liveContacts.length ? liveContacts : mockContacts;

  const productsFetcher = useCallback(() => productsAPI.list(), []);
  const { data: liveProducts } = useLiveList(productsFetcher, 'products', mockProducts);
  const products = liveProducts.length ? liveProducts : mockProducts;

  // Invoice Payment Modal state
  const [payFor, setPayFor] = useState(null);
  const [payError, setPayError] = useState('');
  const [paySuccessMessage, setPaySuccessMessage] = useState('');

  // Vendor Bill Submission Modal state
  const [billPO, setBillPO] = useState(null);
  const [vendorInvoiceRef, setVendorInvoiceRef] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitOk, setSubmitOk] = useState('');

  // Customer Place Order Modal state
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderLines, setOrderLines] = useState([
    { productId: products[0]?.id ? String(products[0].id) : '', quantity: 1 },
  ]);
  const [orderPlacing, setOrderPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderOk, setOrderOk] = useState('');

  const myContact = contacts.find((c) => c.id === currentUser?.contactId);
  const nameLower = (currentUser?.name || '').toLowerCase();
  const isVendor =
    (myContact && (myContact.type === 'VENDOR' || myContact.type === 'BOTH')) ||
    nameLower.includes('azure') ||
    nameLower.includes('vendor') ||
    nameLower.includes('supplier');

  const card = (icon, label, value, accent) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
        {icon}
        {label}
      </div>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );

  const doPay = async (method) => {
    setPayError('');
    try {
      const res = await registerInvoicePayment(payFor.id, method);
      if (res && res.success === false) {
        setPayError(res.error || 'Payment failed.');
        return;
      }
      const paidInv = payFor;
      setPayFor(null);
      setPaySuccessMessage(`Payment of ${inr(paidInv.totalAmount || paidInv.amountDue)} for invoice ${paidInv.invNumber || ''} completed successfully! Receipts ledger and accounting entries updated.`);
      setTimeout(() => setPaySuccessMessage(''), 6000);
    } catch (err) {
      setPayError(err?.message || 'Payment failed.');
    }
  };

  const openSendBill = (po) => {
    setBillPO(po);
    setVendorInvoiceRef('');
    setBillDate(new Date().toISOString().split('T')[0]);
    setSubmitError('');
    setSubmitOk('');
  };

  const doSubmitBill = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitOk('');
    if (!vendorInvoiceRef.trim()) {
      setSubmitError('Enter your invoice reference (e.g. AZ-2026-001).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await vendorSubmitBill(billPO.id, {
        vendorInvoiceRef: vendorInvoiceRef.trim(),
        billDate,
      });
      if (!res.success) {
        setSubmitError(res.error || 'Submit failed.');
        return;
      }
      setSubmitOk(`Bill ${res.bill?.billNumber || ''} SUBMITTED — awaiting accountant approval. No journal entry yet.`);
      setTimeout(() => {
        setBillPO(null);
        setSubmitOk('');
      }, 1600);
    } finally {
      setSubmitting(false);
    }
  };

  // Customer Place Order Logic
  const handleOpenOrderModal = () => {
    const firstProd = products[0];
    setOrderLines([{ productId: firstProd?.id ? String(firstProd.id) : '', quantity: 1 }]);
    setOrderError('');
    setOrderOk('');
    setOrderModalOpen(true);
  };

  const handleAddOrderLine = () => {
    const firstProd = products[0];
    setOrderLines((prev) => [...prev, { productId: firstProd?.id ? String(firstProd.id) : '', quantity: 1 }]);
  };

  const handleUpdateOrderLine = (index, patch) => {
    setOrderLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const handleRemoveOrderLine = (index) => {
    setOrderLines((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateOrderSubtotal = () => {
    return orderLines.reduce((sum, l) => {
      const p = products.find((x) => String(x.id) === String(l.productId));
      const price = p ? Number(p.salesPrice || 0) : 0;
      return sum + price * Number(l.quantity || 1);
    }, 0);
  };

  const handlePlaceCustomerOrder = async (e) => {
    e.preventDefault();
    setOrderError('');
    setOrderOk('');

    if (orderLines.some((l) => !l.productId || Number(l.quantity) <= 0)) {
      setOrderError('Please select a valid product and quantity greater than 0.');
      return;
    }

    setOrderPlacing(true);
    try {
      const lines = orderLines.map((l) => {
        const p = products.find((x) => String(x.id) === String(l.productId));
        return {
          productId: Number(l.productId),
          quantity: Number(l.quantity),
          unitPrice: p ? Number(p.salesPrice || 0) : 0,
        };
      });

      const customerId = currentUser?.contactId || 2;
      const res = await createSalesOrder(customerId, lines, {
        date: new Date().toISOString().split('T')[0],
      });

      setOrderOk(`Order ${res?.soNumber || 'SO'} placed successfully! Awaiting Urban Furniture confirmation.`);
      setTimeout(() => {
        setOrderModalOpen(false);
        setOrderOk('');
      }, 1500);
    } catch (err) {
      setOrderError(err?.message || 'Failed to place order.');
    } finally {
      setOrderPlacing(false);
    }
  };

  // =========================================================================
  // 🏭 1. VENDOR PORTAL VIEW
  // =========================================================================
  if (isVendor) {
    const myPOs = purchaseOrders.filter(
      (p) => (currentUser?.contactId && p.vendorId === currentUser.contactId) || p.vendorName === currentUser?.name
    );
    const myBills = vendorBills.filter(
      (b) => (currentUser?.contactId && b.vendorId === currentUser.contactId) || b.vendorName === currentUser?.name
    );
    const billed = myBills.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
    const received = myBills
      .filter((b) => b.status === 'PAID')
      .reduce((s, b) => s + Number(b.paidAmount || b.totalAmount || 0), 0);

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
            Vendor Portal
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome, {currentUser?.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review Purchase Orders received from Urban Furniture, submit your vendor bills, and monitor payment settlements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {card(<ShoppingCart className="w-5 h-5 text-blue-600" />, 'Purchase Orders Received', myPOs.length, 'text-slate-900')}
          {card(<FileText className="w-5 h-5 text-amber-600" />, 'Bills Submitted', myBills.length, 'text-slate-900')}
          {card(<Wallet className="w-5 h-5 text-emerald-600" />, 'Settled / Paid by Urban Furniture', inr(received), 'text-emerald-700')}
        </div>

        {/* Section A: Purchase Orders Received */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 font-bold text-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <span>Purchase Orders from Urban Furniture</span>
            </div>
            <span className="text-xs font-medium text-slate-400">Showing {myPOs.length} orders</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3">PO No.</th>
                <th className="px-5 py-3 hidden sm:table-cell">Date</th>
                <th className="px-5 py-3 text-right">Total Amount</th>
                <th className="px-5 py-3">Order Status</th>
                <th className="px-5 py-3 text-right">Vendor Action</th>
              </tr>
            </thead>
            <tbody>
              {myPOs.map((p) => {
                const billedAlready = myBills.some((b) => b.purchaseOrderId === p.id) || p.status === 'BILLED';
                return (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{p.poNumber}</td>
                    <td className="px-5 py-3.5 text-slate-600 hidden sm:table-cell">{p.date}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-900">{inr(p.totalAmount)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        p.status === 'CONFIRMED' || p.status === 'BILLED'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {p.status === 'CONFIRMED' && !billedAlready ? (
                        <button
                          onClick={() => openSendBill(p)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 inline-flex items-center gap-1 shadow-sm transition-all"
                        >
                          <Send className="w-3.5 h-3.5" /> + Send / Submit Bill
                        </button>
                      ) : billedAlready ? (
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full inline-flex items-center gap-1 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Billed ✓
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full inline-flex items-center gap-1" title="Urban Furniture accountant must verify and confirm this purchase order first">
                          <Clock className="w-3 h-3 text-amber-500" /> Waiting for Urban Furniture to confirm order
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {myPOs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    No purchase orders found for your account.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section B: Submitted Bills */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 font-bold text-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>My Submitted Vendor Bills</span>
            </div>
            <span className="text-xs font-medium text-slate-400">Total Billed: {inr(billed)}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3">Bill #</th>
                <th className="px-5 py-3 hidden sm:table-cell">My Invoice Ref</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3">Status & Accountant Audit</th>
              </tr>
            </thead>
            <tbody>
              {myBills.map((b) => {
                const isPaid = b.status === 'PAID';
                const isSubmitted = b.status === 'SUBMITTED';
                const isConfirmed = b.status === 'CONFIRMED';
                return (
                  <tr key={b.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{b.billNumber}</td>
                    <td className="px-5 py-3.5 text-slate-700 font-mono text-xs hidden sm:table-cell">
                      {b.reference || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-900">{inr(b.totalAmount)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isSubmitted
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : isConfirmed
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isPaid
                          ? 'PAID / SETTLED ✓'
                          : isSubmitted
                          ? 'SUBMITTED (Awaiting Urban Furniture Verification)'
                          : isConfirmed
                          ? 'APPROVED (Payment Pending from Urban Furniture)'
                          : b.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {myBills.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                    No bills submitted yet — click [ + Send / Submit Bill ] on a confirmed order above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal: Vendor Send Bill against PO */}
        {billPO && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-slate-900">Send Bill to Urban Furniture</h3>
                  <p className="text-xs text-slate-500 mt-0.5">PO: {billPO.poNumber} • Amount: {inr(billPO.totalAmount)}</p>
                </div>
                <button onClick={() => setBillPO(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={doSubmitBill} className="p-6 space-y-4 text-sm">
                {submitError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    {submitError}
                  </div>
                )}
                {submitOk && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                    {submitOk}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Your Invoice Reference / Bill # <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={vendorInvoiceRef}
                    onChange={(e) => setVendorInvoiceRef(e.target.value)}
                    placeholder="e.g. AZ-2026-001"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Invoice number from your own accounting system.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Bill Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Submits as <b>SUBMITTED</b>. No accounting entries will be created until Urban Furniture's accountant audits and approves your bill.</span>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBillPO(null)}
                    className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm"
                  >
                    {submitting ? 'Submitting…' : 'Submit Bill'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 👤 2. CUSTOMER PORTAL VIEW
  // =========================================================================
  const myOrders = salesOrders.filter(
    (s) => (currentUser?.contactId && s.customerId === currentUser.contactId) || s.customerName === currentUser?.name
  );

  const mine = customerInvoices.filter(
    (i) => (currentUser?.contactId && i.customerId === currentUser.contactId) || i.customerName === currentUser?.name
  );

  const totalPaid = mine
    .filter((i) => i.status === 'PAID')
    .reduce((s, i) => s + Number(i.paidAmount || i.totalAmount || 0), 0);

  const pending = mine
    .filter((i) => i.status !== 'PAID')
    .reduce((s, i) => s + (Number(i.totalAmount || 0) - Number(i.paidAmount || 0)), 0);

  const subtotalOrder = calculateOrderSubtotal();
  const taxOrder = Math.round((subtotalOrder * 18) / 100);
  const totalOrder = subtotalOrder + taxOrder;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Customer Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            Customer Portal
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome, {currentUser?.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse furniture products, place customer orders, view invoices & settle dues online.
          </p>
        </div>

        {/* ALWAYS CLICKABLE: Buy Furniture / Place Order */}
        <button
          onClick={handleOpenOrderModal}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 inline-flex items-center gap-2 transition-all transform hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" /> [ + Place New Order / Buy Furniture ]
        </button>
      </div>

      {paySuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{paySuccessMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {card(<ShoppingBag className="w-5 h-5 text-blue-600" />, 'My Orders Placed', myOrders.length, 'text-slate-900')}
        {card(<Wallet className="w-5 h-5 text-emerald-600" />, 'Total Paid', inr(totalPaid), 'text-emerald-700')}
        {card(<Clock className="w-5 h-5 text-amber-600" />, 'Pending Dues to Settle', inr(pending), pending > 0 ? 'text-red-600' : 'text-slate-400')}
      </div>

      {payError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          {payError}
        </div>
      )}

      {/* Section A: Customer's Placed Orders */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 font-bold text-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            <span>My Furniture Orders (Purchase Requests)</span>
          </div>
          <span className="text-xs font-medium text-slate-400">Showing {myOrders.length} orders</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase text-slate-500 border-b border-slate-100 bg-slate-50/50">
              <th className="px-5 py-3">Order No.</th>
              <th className="px-5 py-3 hidden sm:table-cell">Date</th>
              <th className="px-5 py-3 text-right">Total (incl. 18% GST)</th>
              <th className="px-5 py-3">Order Stage</th>
              <th className="px-5 py-3 text-right">Workflow Status</th>
            </tr>
          </thead>
          <tbody>
            {myOrders.map((s) => {
              const isDraft = s.status === 'DRAFT';
              const isConfirmed = s.status === 'CONFIRMED';
              const isInvoiced = s.status === 'INVOICED';
              return (
                <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-slate-900">{s.soNumber}</td>
                  <td className="px-5 py-3.5 text-slate-600 hidden sm:table-cell">{s.date}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-slate-900">{inr(s.totalAmount)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      isInvoiced
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isConfirmed
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {isDraft && (
                      <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full inline-flex items-center gap-1 border border-amber-200">
                        <Clock className="w-3 h-3" /> Order Placed — Waiting for Urban Furniture to confirm
                      </span>
                    )}
                    {isConfirmed && (
                      <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full inline-flex items-center gap-1 border border-blue-200">
                        <CheckCircle2 className="w-3 h-3" /> Order Confirmed — Invoice being prepared
                      </span>
                    )}
                    {isInvoiced && (
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full inline-flex items-center gap-1 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Invoiced ✓ — Ready to pay below ↓
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {myOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                  No orders placed yet. Click <b>[ + Place New Order / Buy Furniture ]</b> above to purchase!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Section B: Invoices & Payment Dues */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 font-bold text-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>My Invoices & Dues Payment</span>
          </div>
          <span className="text-xs font-medium text-slate-400">Showing {mine.length} invoices</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase text-slate-500 border-b border-slate-100 bg-slate-50/50">
              <th className="px-5 py-3">Invoice #</th>
              <th className="px-5 py-3 hidden sm:table-cell">Invoice Date</th>
              <th className="px-5 py-3 text-right">Invoice Amount</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Payment Action</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((i) => {
              const paid = i.status === 'PAID';
              const payable = i.status === 'CONFIRMED';
              return (
                <tr key={i.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-slate-900">{i.invNumber}</td>
                  <td className="px-5 py-3.5 text-slate-600 hidden sm:table-cell">{i.invoiceDate}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-slate-900">{inr(i.totalAmount)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      paid
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : payable
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {paid ? 'PAID' : payable ? 'UNPAID' : i.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {payable ? (
                      <button
                        onClick={() => {
                          setPayError('');
                          setPayFor(i);
                        }}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 inline-flex items-center gap-1 shadow-sm transition-all transform hover:scale-[1.02]"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> [ Pay Invoice (Online) ]
                      </button>
                    ) : paid ? (
                      <span className="text-xs font-medium text-emerald-600 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Paid in Full ✓
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-500" /> Awaiting Urban Furniture invoice confirmation
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {mine.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                  No invoices generated yet. Once your purchase order is confirmed, the invoice will appear here for payment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Customer Place New Furniture Order */}
      {orderModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900">Buy Furniture — Place New Order</h3>
                <p className="text-xs text-slate-500 mt-0.5">Select products and quantities from Urban Furniture catalog.</p>
              </div>
              <button onClick={() => setOrderModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePlaceCustomerOrder} className="p-6 space-y-4 text-sm">
              {orderError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {orderError}
                </div>
              )}
              {orderOk && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                  {orderOk}
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Select Furniture Items
                </label>
                {orderLines.map((line, idx) => {
                  const selectedProd = products.find((p) => String(p.id) === String(line.productId));
                  return (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                      <select
                        value={line.productId}
                        onChange={(e) => handleUpdateOrderLine(idx, { productId: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-medium"
                        required
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {inr(p.salesPrice)}
                          </option>
                        ))}
                      </select>
                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => handleUpdateOrderLine(idx, { quantity: e.target.value })}
                          placeholder="Qty"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-medium"
                          required
                        />
                      </div>
                      <div className="text-right w-24 font-bold text-slate-800 text-xs">
                        {selectedProd ? inr(Number(selectedProd.salesPrice || 0) * Number(line.quantity || 1)) : '—'}
                      </div>
                      {orderLines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOrderLine(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={handleAddOrderLine}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> + Add Another Item
                </button>
              </div>

              {/* Order Cost Summary (Read-Only) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{inr(subtotalOrder)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST (18% standard):</span>
                  <span className="font-semibold">{inr(taxOrder)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200">
                  <span>Estimated Total:</span>
                  <span className="text-blue-700">{inr(totalOrder)}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Submits directly as a customer purchase request. Urban Furniture sales team will review and confirm your order before invoice generation.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderModalOpen(false)}
                  className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={orderPlacing}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold shadow-md shadow-blue-500/20"
                >
                  {orderPlacing ? 'Placing Order…' : 'Submit Furniture Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Payment Modal */}
      <PaymentModal
        open={!!payFor}
        title={`Pay Dues — ${payFor?.invNumber}`}
        dueAmount={payFor ? Number(payFor.totalAmount || 0) - Number(payFor.paidAmount || 0) : 0}
        onClose={() => setPayFor(null)}
        onConfirm={doPay}
      />
    </div>
  );
};
