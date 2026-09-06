import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccounting } from '../context/AccountingContext';
import { contactsAPI, productsAPI } from '../services/api';
import { useLiveList, phoneOf } from '../hooks/useLiveList';
import { ArrowLeft, Plus, Search } from 'lucide-react';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const PurchaseOrders = () => {
  const { purchaseOrders, contacts: mockContacts, products: mockProducts, createPurchaseOrder, confirmPurchaseOrder, createBillFromPO, vendorBills, syncAllData } = useAccounting();

  React.useEffect(() => {
    if (syncAllData) syncAllData();
  }, [syncAllData]);

  const contactsFetcher = useCallback(() => contactsAPI.list(), []);
  const { data: liveContacts } = useLiveList(contactsFetcher, 'contacts', mockContacts);
  const productsFetcher = useCallback(() => productsAPI.list(), []);
  const { data: liveProducts } = useLiveList(productsFetcher, 'products', mockProducts);
  const contacts = liveContacts.length ? liveContacts : mockContacts;
  const products = liveProducts.length ? liveProducts : mockProducts;
  const [view, setView] = useState('list'); // list | form | detail
  const [selected, setSelected] = useState(null);
  const [vendorId, setVendorId] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState([{ productId: '', analytic: '', quantity: 1, unitPrice: '' }]);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const visiblePOs = purchaseOrders.filter((po) => {
    if (!search.trim()) return true;
    const t = search.trim().toLowerCase();
    return po.poNumber?.toLowerCase().includes(t) || po.vendorName?.toLowerCase().includes(t) || po.status?.toLowerCase().includes(t);
  });

  const vendors = contacts.filter((c) => c.type === 'VENDOR' || c.type === 'BOTH');
  const billForPO = (poId) => vendorBills.find((b) => b.purchaseOrderId === poId);

  const openNew = () => {
    setSelected(null);
    setVendorId(vendors[0] ? String(vendors[0].id) : '');
    setPoDate(new Date().toISOString().split('T')[0]);
    setLines([{ productId: products[0] ? String(products[0].id) : '', analytic: '', quantity: 1, unitPrice: products[0] ? products[0].costPrice : '' }]);
    setFormError('');
    setView('form');
  };
  const resetNew = () => openNew();
  const openDetail = (po) => { setSelected(po); setView('detail'); };

  const setLine = (i, patch) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const pickProduct = (i, pid) => {
    const p = products.find((x) => String(x.id) === String(pid));
    setLine(i, { productId: pid, unitPrice: p ? p.costPrice : '' });
  };
  const lineTotal = (l) => Number(l.quantity || 0) * Number(l.unitPrice || 0);
  const formTotal = lines.reduce((s, l) => s + lineTotal(l), 0);

  const handleConfirm = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!vendorId) { setFormError('Select a vendor from Contact Master.'); return; }
    if (lines.some((l) => !l.productId || Number(l.quantity) <= 0)) { setFormError('Each row needs a product and quantity > 0.'); return; }
    setBusy(true);
    try {
      const po = await createPurchaseOrder(vendorId, lines, { date: poDate });
      setSelected(po);
      setView('detail');
    } catch (err) {
      setFormError(err?.message || 'Failed to create purchase order.');
    } finally {
      setBusy(false);
    }
  };

  const doConfirmPO = async (id) => {
    setActionError('');
    try { await confirmPurchaseOrder(id); } catch (err) { setActionError(err?.message || 'Confirm failed.'); }
  };
  const doCreateBill = async (id) => {
    setActionError('');
    setBusy(true);
    try { await createBillFromPO(id); } catch (err) { setActionError(err?.message || 'Create Bill failed.'); } finally { setBusy(false); }
  };

  const input = 'w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm';
  const label = 'block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1';

  if (view === 'form') {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-slate-900">Purchase Order — Form View</h1>
          <button onClick={() => setView('list')} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
        </div>
        <form onSubmit={handleConfirm} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          {formError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{formError}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className={label}>PO No. (auto)</label><input value="(P00001 sequence on save)" disabled className={`${input} bg-slate-50 text-slate-500`} /></div>
            <div>
              <label className={label}>Vendor Name (Many2one Contact)</label>
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={input} required>
                <option value="">Select vendor…</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name} — {phoneOf(v)}</option>)}
              </select>
            </div>
            <div><label className={label}>PO Date</label><input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} className={input} /></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="py-2 pr-2">Sr.</th><th className="py-2 pr-2">Product (Many2one)</th><th className="py-2 pr-2">Budget Analytics</th><th className="py-2 pr-2">Qty</th><th className="py-2 pr-2">Unit Price</th><th className="py-2 text-right">Total</th><th />
              </tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 pr-2 text-slate-500">{i + 1}.</td>
                    <td className="py-2 pr-2 min-w-[160px]">
                      <select value={l.productId} onChange={(e) => pickProduct(i, e.target.value)} className={input} required>
                        <option value="">Select…</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
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
          <button type="button" onClick={() => setLines([...lines, { productId: '', analytic: '', quantity: 1, unitPrice: '' }])} className="text-xs font-bold text-blue-600 hover:text-blue-700">+ Add row</button>
          <div className="flex justify-end text-sm"><span className="text-slate-500 mr-2">Total</span><b>{inr(formTotal)}</b></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={resetNew} className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">New</button>
            <button type="submit" disabled={busy} className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold">{busy ? 'Saving…' : 'Confirm'}</button>
          </div>
        </form>
      </div>
    );
  }

  if (view === 'detail' && selected) {
    const po = purchaseOrders.find((p) => p.id === selected.id) || selected;
    const bill = billForPO(po.id);
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-slate-900">Purchase Order {po.poNumber}</h1>
          <button onClick={() => setView('list')} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><p className="text-[11px] uppercase font-bold text-slate-500">PO No.</p><p className="font-bold">{po.poNumber}</p></div>
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Vendor</p><p className="font-semibold">{po.vendorName}</p></div>
            <div><p className="text-[11px] uppercase font-bold text-slate-500">PO Date</p><p>{po.date}</p></div>
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Status</p><p className="font-bold">{po.status}</p></div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <th className="py-2">Sr.</th><th className="py-2">Product</th><th className="py-2">Budget Analytics</th><th className="py-2">Qty</th><th className="py-2">Unit Price</th><th className="py-2 text-right">Total</th>
            </tr></thead>
            <tbody>
              {po.lines.map((l, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0">
                  <td className="py-2">{i + 1}.</td><td className="py-2 font-semibold">{l.productName}</td>
                  <td className="py-2 text-slate-600">{l.analytic || '—'}</td><td className="py-2">{l.quantity}</td>
                  <td className="py-2">{inr(l.unitPrice)}</td><td className="py-2 text-right font-semibold">{inr(l.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end text-sm"><span className="text-slate-500 mr-2">Total</span><b>{inr(po.totalAmount)}</b></div>
          {actionError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{actionError}</div>}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button onClick={openNew} className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">New</button>
            {po.status === 'DRAFT' && <button onClick={() => doConfirmPO(po.id)} className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Confirm</button>}
            {(po.status === 'CONFIRMED') && !bill && (
              <button onClick={() => doCreateBill(po.id)} disabled={busy} className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold">{busy ? 'Creating…' : 'Create Bill'}</button>
            )}
            {bill && <Link to="/vendor-bills" className="px-6 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold">Open Bill {bill.billNumber}</Link>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-900">Purchase Orders (List View)</h1>
        <button onClick={openNew} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-1.5"><Plus className="w-4 h-4" /> New</button>
      </div>
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search PO number, vendor, status..." className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
            <th className="px-4 py-3">PO No.</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th>
          </tr></thead>
          <tbody>
            {visiblePOs.map((po) => (
              <tr key={po.id} onClick={() => openDetail(po)} className="border-b border-slate-50 last:border-0 hover:bg-blue-50/40 cursor-pointer">
                <td className="px-4 py-3 font-bold text-slate-900">{po.poNumber}</td>
                <td className="px-4 py-3">{po.vendorName}</td>
                <td className="px-4 py-3 text-slate-600">{po.date}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">{po.status}</span></td>
                <td className="px-4 py-3 text-right font-semibold">{inr(po.totalAmount)}</td>
              </tr>
            ))}
            {visiblePOs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No purchase orders.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
