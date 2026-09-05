import React, { useCallback, useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { contactsAPI } from '../services/api';
import { useLiveList } from '../hooks/useLiveList';
import { PaymentModal } from '../components/PaymentModal';
import { FileText, Wallet, Clock, CreditCard, ShoppingCart, Send, X } from 'lucide-react';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Dual portal for Role USER. Vendors (VENDOR/BOTH contact or Azure match) get the
// Vendor Portal (own POs + Send Bill); customers get the Customer Portal
// (own invoices + Pay Dues). Neither ever sees company books.
export const CustomerPortal = () => {
  const {
    currentUser, contacts: mockContacts, customerInvoices, purchaseOrders, vendorBills,
    registerInvoicePayment, vendorSubmitBill,
  } = useAccounting();
  const contactsFetcher = useCallback(() => contactsAPI.list(), []);
  const { data: liveContacts } = useLiveList(contactsFetcher, 'contacts', mockContacts);
  const contacts = liveContacts.length ? liveContacts : mockContacts;

  const [payFor, setPayFor] = useState(null);
  const [payError, setPayError] = useState('');
  const [billPO, setBillPO] = useState(null);
  const [vendorInvoiceRef, setVendorInvoiceRef] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitOk, setSubmitOk] = useState('');

  const myContact = contacts.find((c) => c.id === currentUser?.contactId);
  const nameLower = (currentUser?.name || '').toLowerCase();
  const isVendor =
    (myContact && (myContact.type === 'VENDOR' || myContact.type === 'BOTH')) ||
    nameLower.includes('azure') || nameLower.includes('vendor') || nameLower.includes('supplier');

  const card = (icon, label, value, accent) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">{icon}{label}</div>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );

  const doPay = async (method) => {
    setPayError('');
    try {
      const res = await registerInvoicePayment(payFor.id, method);
      if (res && res.success === false) { setPayError(res.error || 'Payment failed.'); return; }
      setPayFor(null);
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
    if (!vendorInvoiceRef.trim()) { setSubmitError('Enter your invoice reference (e.g. AZ-2026-001).'); return; }
    setSubmitting(true);
    try {
      const res = await vendorSubmitBill(billPO.id, { vendorInvoiceRef: vendorInvoiceRef.trim(), billDate });
      if (!res.success) { setSubmitError(res.error || 'Submit failed.'); return; }
      setSubmitOk(`Bill ${res.bill?.billNumber} SUBMITTED — awaiting accountant approval. No journal entry yet.`);
      setTimeout(() => { setBillPO(null); setSubmitOk(''); }, 1600);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- VENDOR PORTAL ----------------
  if (isVendor) {
    const myPOs = purchaseOrders.filter(
      (p) => (currentUser?.contactId && p.vendorId === currentUser.contactId) || p.vendorName === currentUser?.name
    );
    const myBills = vendorBills.filter(
      (b) => (currentUser?.contactId && b.vendorId === currentUser.contactId) || b.vendorName === currentUser?.name
    );
    const billed = myBills.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
    const received = myBills.filter((b) => b.status === 'PAID').reduce((s, b) => s + Number(b.paidAmount || 0), 0);
    const badge = (s) => (s === 'PAID' ? 'bg-emerald-50 text-emerald-700' : s === 'SUBMITTED' ? 'bg-amber-50 text-amber-700' : s === 'CONFIRMED' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700');

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vendor Portal — Welcome, {currentUser?.name}</h1>
          <p className="text-sm text-slate-500 mt-1">Your purchase orders, submitted bills & payouts. Submit bills with your own invoice reference.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          {card(<ShoppingCart className="w-5 h-5 text-blue-600" />, 'My Purchase Orders', myPOs.length, 'text-slate-900')}
          {card(<FileText className="w-5 h-5 text-amber-600" />, 'Bills Submitted', myBills.length, 'text-slate-900')}
          {card(<Wallet className="w-5 h-5 text-emerald-600" />, 'Received (PAID)', inr(received), 'text-emerald-700')}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
          <div className="px-4 py-3 border-b border-slate-100 font-bold text-slate-900">My Purchase Orders</div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase text-slate-500 border-b border-slate-100">
              <th className="px-4 py-3">PO No.</th><th className="px-4 py-3 hidden sm:table-cell">Date</th>
              <th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th>
            </tr></thead>
            <tbody>
              {myPOs.map((p) => {
                const billedAlready = myBills.some((b) => b.purchaseOrderId === p.id) || p.status === 'BILLED';
                return (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 font-bold">{p.poNumber}</td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{p.date}</td>
                    <td className="px-4 py-3 text-right font-semibold">{inr(p.totalAmount)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${badge(p.status)}`}>{p.status}</span></td>
                    <td className="px-4 py-3 text-right">
                      {p.status === 'CONFIRMED' && !billedAlready ? (
                        <button onClick={() => openSendBill(p)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 inline-flex items-center gap-1">
                          <Send className="w-3.5 h-3.5" /> Send Bill
                        </button>
                      ) : <span className="text-xs text-slate-400">{p.status === 'DRAFT' ? 'Awaiting confirm' : 'Billed ✓'}</span>}
                    </td>
                  </tr>
                );
              })}
              {myPOs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No purchase orders for your account.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 font-bold text-slate-900">My Bills (billed {inr(billed)})</div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase text-slate-500 border-b border-slate-100">
              <th className="px-4 py-3">Bill</th><th className="px-4 py-3 hidden sm:table-cell">My Ref</th>
              <th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Status</th>
            </tr></thead>
            <tbody>
              {myBills.map((b) => (
                <tr key={b.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-bold">{b.billNumber}</td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{b.reference || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{inr(b.totalAmount)}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${badge(b.status)}`}>{b.status}</span></td>
                </tr>
              ))}
              {myBills.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No bills yet — send one from a confirmed PO.</td></tr>}
            </tbody>
          </table>
        </div>

        {billPO && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Send Bill — {billPO.poNumber} ({inr(billPO.totalAmount)})</h3>
                <button onClick={() => setBillPO(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={doSubmitBill} className="p-6 space-y-4 text-sm">
                {submitError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{submitError}</div>}
                {submitOk && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">{submitOk}</div>}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">My Invoice Ref (e.g. AZ-2026-001)</label>
                  <input value={vendorInvoiceRef} onChange={(e) => setVendorInvoiceRef(e.target.value)} placeholder="AZ-2026-001" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bill Date</label>
                  <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" />
                </div>
                <p className="text-[11px] text-slate-500">Submits as SUBMITTED — no journal entry until the accountant approves & posts.</p>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setBillPO(null)} className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold">{submitting ? 'Submitting…' : 'Submit Bill'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------- CUSTOMER PORTAL ----------------
  const mine = customerInvoices.filter(
    (i) => (currentUser?.contactId && i.customerId === currentUser.contactId) || i.customerName === currentUser?.name
  );
  const totalPaid = mine.filter((i) => i.status === 'PAID').reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const pending = mine.filter((i) => i.status !== 'PAID').reduce((s, i) => s + (Number(i.totalAmount || 0) - Number(i.paidAmount || 0)), 0);
  const statusBadge = (s) => (s === 'PAID' ? 'bg-emerald-50 text-emerald-700' : s === 'CONFIRMED' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Portal — Welcome, {currentUser?.name}</h1>
        <p className="text-sm text-slate-500 mt-1">Your invoices, payment status & online dues payment.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        {card(<FileText className="w-5 h-5 text-blue-600" />, 'Total Invoices', mine.length, 'text-slate-900')}
        {card(<Wallet className="w-5 h-5 text-emerald-600" />, 'Total Paid', inr(totalPaid), 'text-emerald-700')}
        {card(<Clock className="w-5 h-5 text-amber-600" />, 'Pending Dues', inr(pending), 'text-red-600')}
      </div>

      {payError && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{payError}</div>}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-bold text-slate-900">My Invoices & Bills</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3 hidden sm:table-cell">Date</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((i) => {
              const paid = i.status === 'PAID';
              const payable = i.status === 'CONFIRMED';
              return (
                <tr key={i.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-bold text-slate-900">{i.invNumber}</td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{i.invoiceDate}</td>
                  <td className="px-4 py-3 text-right font-semibold">{inr(i.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${statusBadge(i.status)}`}>
                      {paid ? 'PAID' : i.status === 'CONFIRMED' ? 'UNPAID' : i.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {payable ? (
                      <button onClick={() => { setPayError(''); setPayFor(i); }} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 inline-flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5" /> Pay Dues (Pay Online)
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">{paid ? '—' : 'Awaiting confirmation'}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {mine.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No invoices found for your account.</td></tr>}
          </tbody>
        </table>
      </div>

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
