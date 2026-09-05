import React, { useCallback, useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { productsAPI } from '../services/api';
import { useLiveList } from '../hooks/useLiveList';
import { ArrowLeft, Plus, Search, Wifi, WifiOff } from 'lucide-react';

const emptyForm = { name: '', type: 'GOODS', category: '', salesPrice: '', costPrice: '' };
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const Products = () => {
  const { products: mockProducts, addProduct } = useAccounting();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [view, setView] = useState('list');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetcher = useCallback(
    () => productsAPI.list({ ...(typeFilter ? { type: typeFilter } : {}), ...(search ? { search } : {}) }),
    [typeFilter, search]
  );
  const { data: list, loading, error, live, refresh } = useLiveList(fetcher, 'products', mockProducts);

  const openNew = () => { setEditing(null); setForm(emptyForm); setFormError(''); setView('form'); };
  const resetNew = () => { setEditing(null); setForm(emptyForm); setFormError(''); };
  const [listMode, setListMode] = useState('list');
  const openRow = (p) => {
    setEditing(p);
    setForm({ name: p.name || '', type: p.type || 'GOODS', category: p.category || '', salesPrice: String(p.salesPrice ?? ''), costPrice: String(p.costPrice ?? '') });
    setFormError('');
    setView('form');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('Product name is required.'); return; }
    setSaving(true);
    const payload = { ...form, salesPrice: parseFloat(form.salesPrice), costPrice: parseFloat(form.costPrice) };
    try {
      const res = editing?.id && live
        ? await productsAPI.update(editing.id, payload)
        : await productsAPI.create(payload);
      if (res.data?.product) { await refresh(); setView('list'); return; }
      addProduct({ ...payload, salesPrice: payload.salesPrice || 0, costPrice: payload.costPrice || 0 });
      await refresh();
      setView('list');
    } catch (err) {
      if (err?.response?.data?.error) setFormError(err.response.data.error);
      else {
        if (!editing) addProduct({ ...payload, salesPrice: payload.salesPrice || 0, costPrice: payload.costPrice || 0 });
        setView('list');
      }
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all';
  const label = 'block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1';

  if (view === 'form') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-slate-900">Product Master Form View</h1>
          <button onClick={() => setView('list')} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
        </div>
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          {formError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{formError}</div>}
          <div>
            <label className={label}>Product Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Office Chair" className={input} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Product Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={input}>
                <option value="GOODS">Goods</option>
                <option value="SERVICE">Service</option>
                <option value="COMBO">Combo</option>
              </select>
            </div>
            <div>
              <label className={label}>Category</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Office Furniture" className={input} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Sales Price (₹)</label>
              <input type="number" min="0" step="0.01" value={form.salesPrice} onChange={(e) => setForm({ ...form, salesPrice: e.target.value })} placeholder="2000" className={input} required />
            </div>
            <div>
              <label className={label}>Cost (₹)</label>
              <input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} placeholder="1500" className={input} required />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={resetNew} className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">New</button>
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold">{saving ? 'Saving…' : 'Confirm'}</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Product Master List View</h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            {live ? <><Wifi className="w-3.5 h-3.5 text-emerald-600" /> Live from backend</> : <><WifiOff className="w-3.5 h-3.5 text-amber-600" /> Offline demo data</>}
          </p>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-1.5"><Plus className="w-4 h-4" /> New</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or category…" className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm">
          <option value="">All types</option>
          <option value="GOODS">Goods</option>
          <option value="SERVICE">Service</option>
          <option value="COMBO">Combo</option>
        </select>
        <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm font-semibold">
          <button onClick={() => setListMode('list')} className={`px-3 py-2 ${listMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>List View</button>
          <button onClick={() => setListMode('kanban')} className={`px-3 py-2 ${listMode === 'kanban' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Kanban View</button>
        </div>
      </div>
      {loading && <p className="text-sm text-slate-500">Loading products…</p>}
      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium mb-4">{error}</div>}
      {!loading && listMode === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((p) => (
            <div key={p.id} onClick={() => openRow(p)} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all text-center">
              <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-500">{p.name.charAt(0)}</div>
              <p className="font-bold text-slate-900 mt-2">{p.name}</p>
              <p className="text-xs text-slate-500 mt-1">Sales Price {inr(p.salesPrice)} • Cost {inr(p.costPrice)}</p>
            </div>
          ))}
          {list.length === 0 && <p className="text-sm text-slate-500 col-span-full text-center py-8">No products found.</p>}
        </div>
      )}
      {!loading && listMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3">Select</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 hidden sm:table-cell">Category</th>
                <th className="px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="px-4 py-3">Sales Price</th>
                <th className="px-4 py-3">Cost</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} onClick={() => openRow(p)} className="border-b border-slate-50 last:border-0 hover:bg-blue-50/40 cursor-pointer">
                  <td className="px-4 py-3 text-slate-400">Select</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{p.category}</td>
                  <td className="px-4 py-3 hidden sm:table-cell"><span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">{p.type}</span></td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{inr(p.salesPrice)}</td>
                  <td className="px-4 py-3 text-slate-600">{inr(p.costPrice)}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No products found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
