import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccounting } from '../context/AccountingContext';
import { ArrowLeft, Plus } from 'lucide-react';
import { phoneOf } from '../hooks/useLiveList';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const SalesOrders = () => {
  const { salesOrders, contacts, products, createSalesOrder, confirmSalesOrder, createInvoiceFromSO, customerInvoices } = useAccounting();
  const [view, setView] = useState('list');
  const [selected, setSelected] = useState(null);
  const [customerId, setCustomerId] = useState('');
  const [soDate, setSoDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState([{ productId: '', analytic: '', quantity: 1, unitPrice: '' }]);
  const [formError, setFormError] = useState('');

  const customers = contacts.filter((c) => c.type === 'CUSTOMER' || c.type === 'BOTH');
  const invForSO = (soId) => customerInvoices.find((i) => i.salesOrderId === soId);

  const openNew = () => {
    setSelected(null);
    setCustomerId(customers[0] ? String(customers[0].id) : '');
    setSoDate(new Date().toISOString().split('T')[0]);
    setLines([{ productId: products[0] ? String(products[0].id) : '', analytic: '', quantity: 1, unitPrice: products[0] ? products[0].salesPrice : '' }]);
    setFormError('');
    setView('form');
  };
  const resetNew = () => openNew();
  const openDetail = (so) => { setSelected(so); setView('detail'); };
  const setLine = (i, patch) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const pickProduct = (i, pid) => {
    const p = products.find((x) => String(x.id) === String(pid));
    setLine(i, { productId: pid, unitPrice: p ? p.salesPrice : '' });
  };
  const lineTotal = (l) => Number(l.quantity || 0) * Number(l.unitPrice || 0);
  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const tax = Math.round((subtotal * 18) / 100);

  const handleConfirm = (e) => {
    e.preventDefault();
    setFormError('');
    if (!customerId) { setFormError('Select a customer from Contact Master.'); return; }
    if (lines.some((l) => !l.productId || Number(l.quantity) <= 0)) { setFormError('Each row needs a product and quantity > 0.'); return; }
    const so = createSalesOrder(customerId, lines, { date: soDate });
    setSelected(so);
    setView('detail');
  };

  const input = 'w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm';
  const label = 'block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1';

  if (view === 'form') {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-slate-900">Sales Order — Form View</h1>
          <button onClick={() => setView('list')} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
        </div>
        <form onSubmit={handleConfirm} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          {formError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{formError}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className={label}>SO No. (auto)</label><input value="(S00001 sequence on save)" disabled className={`${input} bg-slate-50 text-slate-500`} /></div>
            <div>
              <label className={label}>Customer Name (Many2one Contact)</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={input} required>
                <option value="">Select customer…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {phoneOf(c)}</option>)}
              </select>
            </div>
            <div><label className={label}>SO Date</label><input type="date" value={soDate} onChange={(e) => setSoDate(e.target.value)} className={input} /></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="py-2 pr-2">Sr.</th><th className="py-2 pr-2">Product</th><th className="py-2 pr-2">Budget Analytics</th><th className="py-2 pr-2">Qty</th><th className="py-2 pr-2">Unit Price</th><th className="py-2 text-right">Total</th><th />
              </tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 pr-2 text-slate-500">{i + 1}.</td>
                    <td className="py-2 pr-2 min-w-[160px]">
                      <select value={l.productId} onChange={(e) => pickProduct(i, e.target.value)} className={input} required>
                        <option value="">Select…</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name} — ₹{p.salesPrice}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-2 min-w-[130px]"><input value={l.analytic} onChange={(e) => setLine(i, { analytic: e.target.value })} placeholder="e.g. Project 1" className={input} /></td>
                    <td className="py-2 pr-2 w-20"><input type="number" min="1" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} className={input} /></td>
                    <td className="py-2 pr-2 w-28"><input type="number" min="0" step="0.01" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} className={input} /></td>
                    <td className="py-2 text-right font-semibold">{inr(lineTotal(l))}</td>
                    <td className="py-2 pl-2"><button type="button" onClick={() => setLines(lines.filter((_, x) => x !== i))} className="text-red-500 text-xs font-bold">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => setLines([...lines, { productId: '', analytic: '', quantity: 1, unitPrice: '' }])} className="text-xs font-bold text-blue-600">+ Add row</button>
          <div className="flex justify-end gap-4 text-sm"><span className="text-slate-500">Subtotal {inr(subtotal)}</span><span className="text-slate-500">Tax 18% {inr(tax)}</span><b>Total {inr(subtotal + tax)}</b></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={resetNew} className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">New</button>
            <button type="submit" className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Confirm</button>
          </div>
        </form>
      </div>
    );
  }

  if (view === 'detail' && selected) {
    const so = salesOrders.find((s) => s.id === selected.id) || selected;
    const inv = invForSO(so.id);
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-slate-900">Sales Order {so.soNumber}</h1>
          <button onClick={() => setView('list')} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><p className="text-[11px] uppercase font-bold text-slate-500">SO No.</p><p className="font-bold">{so.soNumber}</p></div>
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Customer</p><p className="font-semibold">{so.customerName}</p></div>
            <div><p className="text-[11px] uppercase font-bold text-slate-500">SO Date</p><p>{so.date}</p></div>
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Status</p><p className="font-bold">{so.status}</p></div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase text-slate-500 border-b border-slate-100">
              <th className="py-2">Sr.</th><th className="py-2">Product</th><th className="py-2">Budget Analytics</th><th className="py-2">Qty</th><th className="py-2">Unit Price</th><th className="py-2 text-right">Total</th>
            </tr></thead>
            <tbody>
              {so.lines.map((l, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0">
                  <td className="py-2">{i + 1}.</td><td className="py-2 font-semibold">{l.productName}</td>
                  <td className="py-2 text-slate-600">{l.analytic || '—'}</td><td className="py-2">{l.quantity}</td>
                  <td className="py-2">{inr(l.unitPrice)}</td><td className="py-2 text-right font-semibold">{inr(l.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end text-sm"><span className="text-slate-500 mr-2">Total (incl. tax)</span><b>{inr(so.totalAmount)}</b></div>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button onClick={openNew} className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">New</button>
            {so.status === 'DRAFT' && <button onClick={() => confirmSalesOrder(so.id)} className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Confirm</button>}
            {so.status === 'CONFIRMED' && !inv && <button onClick={() => createInvoiceFromSO(so.id)} className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">Create Invoice</button>}
            {inv && <Link to="/customer-invoices" className="px-6 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold">Open Invoice {inv.invNumber}</Link>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-900">Sales Orders (List View)</h1>
        <button onClick={openNew} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-1.5"><Plus className="w-4 h-4" /> New</button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase text-slate-500 border-b border-slate-100">
            <th className="px-4 py-3">SO No.</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th>
          </tr></thead>
          <tbody>
            {salesOrders.map((so) => (
              <tr key={so.id} onClick={() => openDetail(so)} className="border-b border-slate-50 last:border-0 hover:bg-blue-50/40 cursor-pointer">
                <td className="px-4 py-3 font-bold">{so.soNumber}</td><td className="px-4 py-3">{so.customerName}</td>
                <td className="px-4 py-3 text-slate-600">{so.date}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">{so.status}</span></td>
                <td className="px-4 py-3 text-right font-semibold">{inr(so.totalAmount)}</td>
              </tr>
            ))}
            {salesOrders.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No sales orders.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
