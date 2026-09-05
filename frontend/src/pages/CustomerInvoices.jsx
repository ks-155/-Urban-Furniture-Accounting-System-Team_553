import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { PaymentModal } from '../components/PaymentModal';
import { ArrowLeft } from 'lucide-react';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const CustomerInvoices = () => {
  const { customerInvoices, salesOrders, payments, confirmCustomerInvoice, registerInvoicePayment } = useAccounting();
  const [selectedId, setSelectedId] = useState(customerInvoices[0]?.id || null);
  const [payOpen, setPayOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  const doConfirm = async () => {
    setActionError('');
    setBusy(true);
    try {
      const res = await confirmCustomerInvoice(inv.id);
      if (res && res.success === false) setActionError(res.error || 'Confirm failed.');
    } catch (err) { setActionError(err?.message || 'Confirm failed.'); } finally { setBusy(false); }
  };
  const doPay = async (method) => {
    setActionError('');
    try {
      const res = await registerInvoicePayment(inv.id, method);
      if (res && res.success === false) setActionError(res.error || 'Payment failed.');
    } catch (err) { setActionError(err?.message || 'Payment failed.'); } finally { setPayOpen(false); }
  };

  const inv = customerInvoices.find((i) => i.id === selectedId) || null;
  const so = inv?.salesOrderId ? salesOrders.find((s) => s.id === inv.salesOrderId) : null;
  const invPayments = inv ? payments.filter((p) => p.invoiceId === inv.id) : [];
  const paidCash = invPayments.filter((p) => p.paymentMethod === 'CASH').reduce((s, p) => s + Number(p.amount || 0), 0);
  const paidBank = invPayments.filter((p) => p.paymentMethod === 'BANK').reduce((s, p) => s + Number(p.amount || 0), 0);
  const due = inv ? Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-fit">
          <div className="px-4 py-3 border-b border-slate-100 font-bold text-slate-900">Customer Invoices (List)</div>
          {customerInvoices.map((i) => (
            <button key={i.id} onClick={() => setSelectedId(i.id)} className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-blue-50/40 ${i.id === selectedId ? 'bg-blue-50/60' : ''}`}>
              <p className="font-bold text-sm text-slate-900">{i.invNumber} <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{i.status}</span></p>
              <p className="text-xs text-slate-500">{i.customerName} • {inr(i.totalAmount)}</p>
            </button>
          ))}
          {customerInvoices.length === 0 && <p className="px-4 py-8 text-sm text-slate-500 text-center">No invoices yet — create one from a Sales Order.</p>}
        </div>

        <div className="lg:col-span-2">
          {!inv && <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-sm text-slate-500">Select an invoice, or create one via Sales Orders → Create Invoice.</div>}
          {inv && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-xl font-bold text-slate-900">Customer Invoice {inv.invNumber}</h1>
                <button onClick={() => setSelectedId(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div><p className="text-[11px] uppercase font-bold text-slate-500">Customer</p><p className="font-semibold">{inv.customerName}</p></div>
                <div><p className="text-[11px] uppercase font-bold text-slate-500">Invoice Date</p><p>{inv.invoiceDate}</p></div>
                <div><p className="text-[11px] uppercase font-bold text-slate-500">Due Date</p><p>{inv.dueDate}</p></div>
                <div><p className="text-[11px] uppercase font-bold text-slate-500">Status</p><p className="font-bold">{inv.status}</p></div>
              </div>
              {so && (
                <div className="text-sm">
                  <span className="text-slate-500 mr-2">Created from {so.soNumber}.</span>
                  <span className="font-semibold text-blue-700">Open Original SO: {so.soNumber} ({so.customerName})</span>
                </div>
              )}
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase text-slate-500 border-b border-slate-100">
                  <th className="py-2">Sr.</th><th className="py-2">Product</th><th className="py-2">Budget Analytics</th><th className="py-2">Qty</th><th className="py-2">Unit Price</th><th className="py-2 text-right">Total</th>
                </tr></thead>
                <tbody>
                  {inv.lines.map((l, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="py-2">{i + 1}.</td><td className="py-2 font-semibold">{l.productName}</td>
                      <td className="py-2 text-slate-600">{l.analytic || '—'}</td><td className="py-2">{l.quantity}</td>
                      <td className="py-2">{inr(l.unitPrice)}</td><td className="py-2 text-right font-semibold">{inr(l.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm bg-slate-50/70 rounded-xl p-4">
                <div><p className="text-[11px] uppercase font-bold text-slate-500">Total</p><p className="font-bold">{inr(inv.totalAmount)}</p></div>
                <div><p className="text-[11px] uppercase font-bold text-slate-500">Paid Via Cash</p><p className="font-semibold">{inr(paidCash)}</p></div>
                <div><p className="text-[11px] uppercase font-bold text-slate-500">Paid Via Bank</p><p className="font-semibold">{inr(paidBank)}</p></div>
                <div><p className="text-[11px] uppercase font-bold text-slate-500">Amount Due</p><p className="font-bold text-red-600">{inr(due)}</p></div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {inv.status === 'DRAFT' && <button onClick={doConfirm} disabled={busy} className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold">{busy ? 'Posting…' : 'Confirm (posts Dr Debtors / Cr Sales)'}</button>}
                {inv.status === 'CONFIRMED' && <button onClick={() => setPayOpen(true)} className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">Receive Payment</button>}
                {inv.status === 'PAID' && <span className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold">PAID in full</span>}
              </div>
              {actionError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{actionError}</div>}
            </div>
          )}
        </div>
      </div>
      <PaymentModal open={payOpen} title={`Invoice Receipt — ${inv?.invNumber}`} dueAmount={due} onClose={() => setPayOpen(false)}
        onConfirm={doPay} />
    </div>
  );
};
