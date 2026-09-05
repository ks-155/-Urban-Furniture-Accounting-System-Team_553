import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { PaymentModal } from '../components/PaymentModal';
import { ArrowLeft } from 'lucide-react';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const VendorBills = () => {
  const { vendorBills, purchaseOrders, payments, confirmVendorBill, registerBillPayment } = useAccounting();
  const [selectedId, setSelectedId] = useState(vendorBills[0]?.id || null);
  const [payOpen, setPayOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const visibleBills = vendorBills.filter((b) => {
    if (!search.trim()) return true;
    const t = search.trim().toLowerCase();
    return b.billNumber?.toLowerCase().includes(t) || b.vendorName?.toLowerCase().includes(t) || b.reference?.toLowerCase().includes(t) || b.status?.toLowerCase().includes(t);
  });

  const doConfirm = async () => {
    setActionError('');
    setBusy(true);
    try {
      const res = await confirmVendorBill(bill.id);
      if (res && res.success === false) setActionError(res.error || 'Confirm failed.');
    } catch (err) { setActionError(err?.message || 'Confirm failed.'); } finally { setBusy(false); }
  };
  const doPay = async (method) => {
    setActionError('');
    try {
      const res = await registerBillPayment(bill.id, method);
      if (res && res.success === false) setActionError(res.error || 'Payment failed.');
    } catch (err) { setActionError(err?.message || 'Payment failed.'); } finally { setPayOpen(false); }
  };

  const bill = vendorBills.find((b) => b.id === selectedId) || null;
  const po = bill?.purchaseOrderId ? purchaseOrders.find((p) => p.id === bill.purchaseOrderId) : null;
  const billPayments = bill ? payments.filter((p) => p.billId === bill.id) : [];
  const paidCash = billPayments.filter((p) => p.paymentMethod === 'CASH').reduce((s, p) => s + Number(p.amount || 0), 0);
  const paidBank = billPayments.filter((p) => p.paymentMethod === 'BANK').reduce((s, p) => s + Number(p.amount || 0), 0);
  const due = bill ? Number(bill.totalAmount || 0) - Number(bill.paidAmount || 0) : 0;

  const badge = (s) => (s === 'PAID' ? 'bg-emerald-100 text-emerald-700' : s === 'SUBMITTED' ? 'bg-amber-100 text-amber-800' : s === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-fit">
          <div className="px-4 py-3 border-b border-slate-100 font-bold text-slate-900">Vendor Bills (List)</div>
          <div className="p-2 border-b border-slate-100">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bills..." className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
          </div>
          {visibleBills.map((b) => (
            <button key={b.id} onClick={() => setSelectedId(b.id)} className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-blue-50/40 ${b.id === selectedId ? 'bg-blue-50/60' : ''}`}>
              <p className="font-bold text-sm text-slate-900">{b.billNumber} <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded font-bold ${badge(b.status)}`}>{b.status}</span></p>
              <p className="text-xs text-slate-500">{b.vendorName} - {inr(b.totalAmount)}{b.reference ? ` - Ref ${b.reference}` : ''}</p>
            </button>
          ))}
          {visibleBills.length === 0 && <p className="px-4 py-8 text-sm text-slate-500 text-center">No bills yet - create one from a Purchase Order.</p>}
        </div>

        <div className="lg:col-span-2">
          {!bill && <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-sm text-slate-500">Select a bill, or create one via Purchase Orders → Create Bill.</div>}
          {bill && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-xl font-bold text-slate-900">Vendor Bill {bill.billNumber}</h1>
                <button onClick={() => setSelectedId(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div><p className="text-[11px] uppercase font-bold text-slate-500">Vendor</p><p className="font-semibold">{bill.vendorName}</p></div>
                <div><p className="text-[11px] uppercase font-bold text-slate-500">Bill Date</p><p>{bill.billDate}</p></div>
                <div><p className="text-[11px] uppercase font-bold text-slate-500">Due Date</p><p>{bill.dueDate}</p></div>
                <div><p className="text-[11px] uppercase font-bold text-slate-500">Status</p><p className="font-bold">{bill.status}</p></div>
              </div>
              {bill.reference && (
                <div className="text-sm"><span className="text-slate-500 mr-2">Vendor Invoice Ref:</span><b>{bill.reference}</b>
                  {bill.status === 'SUBMITTED' && <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">SUBMITTED - awaiting approval (no JE yet)</span>}
                </div>
              )}
              {po && (
                <div className="text-sm">
                  <span className="text-slate-500 mr-2">Created from {po.poNumber}.</span>
                  <span className="font-semibold text-blue-700">Open Original PO: {po.poNumber} ({po.vendorName})</span>
                </div>
              )}
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="py-2">Sr.</th><th className="py-2">Product</th><th className="py-2">Budget Analytics</th><th className="py-2">Qty</th><th className="py-2">Unit Price</th><th className="py-2 text-right">Total</th>
                </tr></thead>
                <tbody>
                  {bill.lines.map((l, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="py-2">{i + 1}.</td><td className="py-2 font-semibold">{l.productName}</td>
                      <td className="py-2 text-slate-600">{l.analytic || '—'}</td><td className="py-2">{l.quantity}</td>
                      <td className="py-2">{inr(l.unitPrice)}</td><td className="py-2 text-right font-semibold">{inr(l.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm bg-slate-50/70 rounded-xl p-4">
                <div><p className="text-[11px] uppercase font-bold text-slate-500">Total</p><p className="font-bold">{inr(bill.totalAmount)}</p></div>
                <div><p className="text-[11px] uppercase font-bold text-slate-500">Paid Via Cash</p><p className="font-semibold">{inr(paidCash)}</p></div>
                <div><p className="text-[11px] uppercase font-bold text-slate-500">Paid Via Bank</p><p className="font-semibold">{inr(paidBank)}</p></div>
                <div><p className="text-[11px] uppercase font-bold text-slate-500">Amount Due</p><p className="font-bold text-red-600">{inr(due)}</p></div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {bill.status === 'DRAFT' && <button onClick={doConfirm} disabled={busy} className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold">{busy ? 'Posting...' : 'Confirm (posts Dr Purchase / Cr Creditors)'}</button>}
                {bill.status === 'SUBMITTED' && <button onClick={doConfirm} disabled={busy} className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-semibold">{busy ? 'Posting...' : 'Approve & Post Bill (posts Dr Purchase / Cr Creditors)'}</button>}
                {bill.status === 'CONFIRMED' && <button onClick={() => setPayOpen(true)} className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">Pay</button>}
                {bill.status === 'PAID' && <span className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold">PAID in full</span>}
              </div>
              {actionError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{actionError}</div>}
            </div>
          )}
        </div>
      </div>
      <PaymentModal open={payOpen} title={`Bill Payment — ${bill?.billNumber}`} dueAmount={due} onClose={() => setPayOpen(false)}
        onConfirm={doPay} />
    </div>
  );
};
