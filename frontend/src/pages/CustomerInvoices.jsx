import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAccounting } from '../context/AccountingContext';
import { PaymentModal } from '../components/PaymentModal';
import { ArrowLeft, Plus, Search, FileText, BarChart2, X } from 'lucide-react';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const STATUS_COLORS = {
  DRAFT: 'bg-slate-100 text-slate-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

// 3-state status badge pills: Paid | Partial | Not Paid
const StatusPills = ({ status }) => {
  const isPaid = status === 'PAID';
  const isPartial = status === 'PARTIALLY_PAID';
  const isNotPaid = status === 'CONFIRMED'; // confirmed but no payment
  const isDraft = status === 'DRAFT';
  const isCancelled = status === 'CANCELLED';

  if (isCancelled) return <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700">CANCELLED</span>;
  if (isDraft) return <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">DRAFT</span>;

  return (
    <div className="flex items-center gap-1">
      <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${isPaid ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 text-slate-400'}`}>Paid</span>
      <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${isPartial ? 'bg-amber-500 text-white border-amber-500' : 'border-slate-200 text-slate-400'}`}>Partial</span>
      <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${isNotPaid ? 'bg-red-500 text-white border-red-500' : 'border-slate-200 text-slate-400'}`}>Not Paid</span>
    </div>
  );
};

export const CustomerInvoices = () => {
  const { customerInvoices, salesOrders, payments, confirmCustomerInvoice, registerInvoicePayment, syncAllData } = useAccounting();

  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view') || 'list';
  const idParam = searchParams.get('id') ? parseInt(searchParams.get('id'), 10) : null;

  const goList = () => setSearchParams({});
  const goDetail = (invId) => setSearchParams({ view: 'detail', id: String(invId) });

  useEffect(() => {
    if (syncAllData) syncAllData();
  }, []);

  const [payOpen, setPayOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const visibleInvoices = customerInvoices.filter((i) => {
    if (!search.trim()) return true;
    const t = search.trim().toLowerCase();
    return i.invNumber?.toLowerCase().includes(t) || i.customerName?.toLowerCase().includes(t) || i.status?.toLowerCase().includes(t);
  });

  // Get selected invoice
  const inv = idParam ? (customerInvoices.find((i) => i.id === idParam) || null) : null;
  const so = inv?.salesOrderId ? salesOrders.find((s) => s.id === inv.salesOrderId) : null;
  const invPayments = inv ? payments.filter((p) => p.invoiceId === inv.id) : [];
  const paidCash = invPayments.filter((p) => p.paymentMethod === 'CASH').reduce((s, p) => s + Number(p.amount || 0), 0);
  const paidBank = invPayments.filter((p) => p.paymentMethod === 'BANK').reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalPaid = Number(inv?.paidAmount || 0);
  const due = inv ? Math.max(0, Number(inv.totalAmount || 0) - totalPaid) : 0;

  const doConfirm = async () => {
    setActionError('');
    setBusy(true);
    try {
      const res = await confirmCustomerInvoice(inv.id);
      if (res && res.success === false) setActionError(res.error || 'Confirm failed.');
    } catch (err) { setActionError(err?.message || 'Confirm failed.'); } finally { setBusy(false); }
  };

  const doPay = async (payData) => {
    setActionError('');
    try {
      const res = await registerInvoicePayment(inv.id, payData.paymentMethod, payData.amount, payData.note);
      if (res && res.success === false) setActionError(res.error || 'Payment failed.');
    } catch (err) { setActionError(err?.message || 'Payment failed.'); } finally { setPayOpen(false); }
  };

  // ---- DETAIL VIEW ----
  if (viewParam === 'detail' && idParam) {
    if (!inv) return (
      <div className="max-w-5xl mx-auto px-4 py-8 text-center">
        <p className="text-slate-500 mb-4">Invoice not found or loading…</p>
        <button onClick={goList} className="px-4 py-2 rounded-xl border border-slate-200 text-sm">Back to List</button>
      </div>
    );

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top action bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Smart Buttons */}
            {so && (
              <Link to={`/sales-orders?view=detail&id=${so.id}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition">
                <FileText className="w-3.5 h-3.5" /> SO: {so.soNumber}
              </Link>
            )}
            <Link to="/analytics" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 transition">
              <BarChart2 className="w-3.5 h-3.5" /> Budget
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <StatusPills status={inv.status} />
            <button onClick={goList} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          {/* Header fields */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Invoice No.</p><p className="font-bold text-slate-900">{inv.invNumber}</p></div>
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Ref.</p><p className="text-slate-600">{so ? so.soNumber : '—'}</p></div>
            <div className="col-span-2 sm:col-span-1"><p className="text-[11px] uppercase font-bold text-slate-500">Customer</p><p className="font-semibold text-slate-900">{inv.customerName}</p></div>
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Invoice Date</p><p className="text-slate-700">{inv.invoiceDate}</p></div>
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Due Date</p><p className="text-slate-700">{inv.dueDate}</p></div>
            <div><p className="text-[11px] uppercase font-bold text-slate-500">GST Rate</p><p className="text-slate-700">{inv.taxRate || 18}%</p></div>
          </div>

          {/* Invoice Lines Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase text-slate-500 border-b border-slate-100">
                <th className="py-2">Sr.</th>
                <th className="py-2">Product</th>
                <th className="py-2">Chart of Accounts</th>
                <th className="py-2">Budget Analytics</th>
                <th className="py-2">Qty</th>
                <th className="py-2">Unit Price</th>
                <th className="py-2 text-right">Total</th>
              </tr></thead>
              <tbody>
                {(inv.lines || []).map((l, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-2">{i + 1}.</td>
                    <td className="py-2 font-semibold">{l.productName}</td>
                    <td className="py-2 text-slate-600 text-xs">Sales (4001 Sales Income)</td>
                    <td className="py-2 text-slate-600">{l.analytic || '—'}</td>
                    <td className="py-2">{l.quantity}</td>
                    <td className="py-2">{inr(l.unitPrice)}</td>
                    <td className="py-2 text-right font-semibold">{inr(l.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm bg-slate-50/70 rounded-xl p-4">
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Total</p><p className="font-bold text-slate-900">{inr(inv.totalAmount)}</p></div>
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Paid Via Cash</p><p className="font-semibold text-slate-700">{inr(paidCash)}</p></div>
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Paid Via Bank</p><p className="font-semibold text-slate-700">{inr(paidBank)}</p></div>
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Amount Due</p><p className={`font-bold ${due > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{inr(due)}</p></div>
          </div>

          {/* Action Buttons */}
          {actionError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{actionError}</div>}
          <div className="flex flex-wrap gap-2 pt-1">
            {inv.status === 'DRAFT' && (
              <button onClick={doConfirm} disabled={busy} className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold">
                {busy ? 'Posting…' : 'Confirm (Dr Debtors / Cr Sales)'}
              </button>
            )}
            {(inv.status === 'CONFIRMED' || inv.status === 'PARTIALLY_PAID') && (
              <button onClick={() => setPayOpen(true)} className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
                {inv.status === 'PARTIALLY_PAID' ? `Pay Remaining ${inr(due)}` : 'Receive Payment'}
              </button>
            )}
            {inv.status === 'PAID' && (
              <span className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold border border-emerald-200">✓ PAID IN FULL</span>
            )}
          </div>
        </div>

        <PaymentModal
          open={payOpen}
          title={`Invoice Payment — ${inv.invNumber}`}
          partnerName={inv.customerName}
          dueAmount={due}
          defaultPaymentType="RECEIVE"
          onClose={() => setPayOpen(false)}
          onConfirm={doPay}
        />
      </div>
    );
  }

  // ---- LIST VIEW ----
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-900">Customer Invoices (List View)</h1>
        <Link to="/sales-orders?view=form" className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New (via Sales Order)
        </Link>
      </div>
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice number, customer, status..." className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase text-slate-500 border-b border-slate-100">
            <th className="px-4 py-3">Invoice No.</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Due Date</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Paid</th>
            <th className="px-4 py-3 text-right">Total</th>
          </tr></thead>
          <tbody>
            {visibleInvoices.map((i) => {
              const invDue = Math.max(0, Number(i.totalAmount || 0) - Number(i.paidAmount || 0));
              return (
                <tr key={i.id} onClick={() => goDetail(i.id)} className="border-b border-slate-50 last:border-0 hover:bg-blue-50/40 cursor-pointer">
                  <td className="px-4 py-3 font-bold">{i.invNumber}</td>
                  <td className="px-4 py-3">{i.customerName}</td>
                  <td className="px-4 py-3 text-slate-600">{i.invoiceDate}</td>
                  <td className="px-4 py-3 text-slate-600">{i.dueDate}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_COLORS[i.status] || 'bg-slate-100 text-slate-700'}`}>
                      {i.status === 'PARTIALLY_PAID' ? 'PARTIAL' : i.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{inr(i.paidAmount || 0)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{inr(i.totalAmount)}</td>
                </tr>
              );
            })}
            {visibleInvoices.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No invoices found — create one from a Sales Order.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
