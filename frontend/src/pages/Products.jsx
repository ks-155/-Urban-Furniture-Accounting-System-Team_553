import React, { useCallback, useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { productsAPI, getApiError } from '../services/api';
import { useLiveList } from '../hooks/useLiveList';
import { ArrowLeft, Plus, Search, Archive } from 'lucide-react';
import { ViewModeButtons } from '../components/ViewModeButtons';

const emptyForm = { name: '', sku: '', type: 'GOODS', category: '', salesPrice: '', costPrice: '', stock: '0', status: 'ACTIVE' };
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const Products = () => {
  const { products: mockProducts, syncAllData, currentUser } = useAccounting();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [view, setView] = useState('list');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetcher = useCallback(
    () => productsAPI.list({ status: 'ALL', ...(typeFilter ? { type: typeFilter } : {}), ...(search ? { search } : {}) }),
    [typeFilter, search]
  );
  const { data: list, loading, error, refresh } = useLiveList(fetcher, 'products', mockProducts);

  const openNew = () => { setEditing(null); setForm(emptyForm); setFormError(''); setView('form'); };
  const resetNew = () => { setEditing(null); setForm(emptyForm); setFormError(''); };
  const [listMode, setListMode] = useState('list');
  const openRow = (p) => {
    setEditing(p);
    setForm({ 
      name: p.name || '', 
      sku: p.sku || '',
      type: p.type || 'GOODS', 
      category: p.category || '', 
      salesPrice: String(p.salesPrice ?? ''), 
      costPrice: String(p.costPrice ?? ''),
      stock: String(p.stock ?? '0'),
      status: p.status || 'ACTIVE'
    });
    setFormError('');
    setView('form');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('Product name is required.'); return; }
    if (!form.salesPrice || isNaN(parseFloat(form.salesPrice))) { setFormError('Valid sales price is required.'); return; }
    if (!form.costPrice || isNaN(parseFloat(form.costPrice))) { setFormError('Valid cost price is required.'); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || undefined,
      type: form.type || 'GOODS',
      category: form.category?.trim() || 'Furniture',
      salesPrice: parseFloat(form.salesPrice),
      costPrice: parseFloat(form.costPrice),
      stock: parseInt(form.stock || '0', 10),
      status: form.status,
    };
    try {
      const res = editing?.id
        ? await productsAPI.update(editing.id, payload)
        : await productsAPI.create(payload);
      if (res.data?.product) {
        if (syncAllData) await syncAllData();
        await refresh();
        setView('list');
        return;
      }
      setFormError('Unexpected response from server.');
    } catch (err) {
      setFormError(err?.response?.data?.error || getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!editing?.id) return;
    if (!window.confirm(`Are you sure you want to archive/delete ${editing.name}?`)) return;
    setSaving(true);
    try {
      await productsAPI.delete(editing.id);
      if (syncAllData) await syncAllData();
      await refresh();
      setView('list');
    } catch (err) {
      setFormError(err?.response?.data?.error || getApiError(err));
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
          
          {editing && (
            <div className="flex justify-end mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${form.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {form.status}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Product Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Office Chair" className={input} required />
            </div>
            <div>
              <label className={label}>SKU</label>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. CHR-001" className={input} />
            </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Current Stock (Inventory)</label>
              <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} disabled={editing !== null} className={`${input} ${editing ? 'bg-slate-50 text-slate-500' : ''}`} />
              {editing && <p className="text-[10px] text-slate-400 mt-1">Stock is managed automatically via Vendor Bills (Goods Received) and Sales Orders.</p>}
            </div>
            <div>
              <label className={label}>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={input}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive / Archived</option>
              </select>
            </div>
          </div>
          <div className="flex justify-between items-center pt-2">
            <div>
              {editing && currentUser?.role === 'ADMIN' && (
                 <button type="button" onClick={handleArchive} disabled={saving} className="px-4 py-2 rounded-xl text-red-600 hover:bg-red-50 text-sm font-semibold flex items-center gap-1.5 transition">
                   <Archive className="w-4 h-4" /> Archive / Delete
                 </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={resetNew} className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">New</button>
              <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold">{saving ? 'Saving…' : 'Confirm'}</button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  const filteredList = list.filter(p => statusFilter === 'ALL' || p.status === statusFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Product Master List</h1>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-1.5"><Plus className="w-4 h-4" /> New</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, category or SKU…" className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm">
          <option value="">All types</option>
          <option value="GOODS">Goods</option>
          <option value="SERVICE">Service</option>
          <option value="COMBO">Combo</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm">
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active Only</option>
          <option value="INACTIVE">Archived Only</option>
        </select>
        <ViewModeButtons value={listMode} onChange={setListMode} />
      </div>
      {loading && <p className="text-sm text-slate-500">Loading products…</p>}
      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium mb-4">{error}</div>}
      {!loading && listMode === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((p) => (
            <div key={p.id} onClick={() => openRow(p)} className={`bg-white rounded-2xl border ${p.status === 'INACTIVE' ? 'border-slate-300 opacity-60' : 'border-slate-100'} shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all text-center`}>
              <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-500">{p.name.charAt(0)}</div>
              <p className="font-bold text-slate-900 mt-2">{p.name}</p>
              {p.sku && <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">{p.sku}</p>}
              <p className="text-xs text-slate-500 mt-1">Price: {inr(p.salesPrice)} • Stock: {p.type === 'GOODS' ? (p.stock ?? '0') : 'N/A'}</p>
              {p.status === 'INACTIVE' && <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">ARCHIVED</span>}
            </div>
          ))}
          {filteredList.length === 0 && <p className="text-sm text-slate-500 col-span-full text-center py-8">No products found.</p>}
        </div>
      )}
      {!loading && listMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3 hidden sm:table-cell">SKU</th>
                <th className="px-4 py-3 hidden sm:table-cell">Category</th>
                <th className="px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="px-4 py-3">Sales Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((p) => (
                <tr key={p.id} onClick={() => openRow(p)} className={`border-b border-slate-50 last:border-0 hover:bg-blue-50/40 cursor-pointer ${p.status === 'INACTIVE' ? 'bg-slate-50 opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono hidden sm:table-cell">{p.sku || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{p.category}</td>
                  <td className="px-4 py-3 hidden sm:table-cell"><span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">{p.type}</span></td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{inr(p.salesPrice)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{p.type === 'GOODS' ? (p.stock ?? '0') : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
              {filteredList.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No products found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
