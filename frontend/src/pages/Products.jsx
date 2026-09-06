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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSave} className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm p-8">
          {/* Top Buttons matching wireframe */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex gap-4">
              <button type="button" onClick={resetNew} className="px-8 py-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-lg hover:bg-slate-200">New</button>
              <button type="submit" disabled={saving} className="px-8 py-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-lg hover:bg-slate-200">{saving ? 'Saving...' : 'Confirm'}</button>
            </div>
            <button type="button" onClick={() => setView('list')} className="px-8 py-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-lg hover:bg-slate-200">Back</button>
          </div>
          
          <h1 className="text-2xl font-bold text-slate-800 mb-8 text-center" style={{ fontFamily: 'cursive', color: '#db2777' }}>Product Master Form View</h1>

          {formError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium mb-6">{formError}</div>}
          
          <div className="flex flex-col gap-6">
            <div className="flex items-center">
              <label className="w-1/3 text-xl font-medium text-pink-600" style={{ fontFamily: 'cursive' }}>Product Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="flex-1 border-b-2 border-pink-300 focus:border-pink-500 outline-none px-2 py-1 bg-transparent text-lg" required />
            </div>
            <div className="flex items-center">
              <label className="w-1/3 text-xl font-medium text-pink-600" style={{ fontFamily: 'cursive' }}>Product Type</label>
              <div className="flex-1 relative">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border-b-2 border-pink-300 focus:border-pink-500 outline-none px-2 py-1 bg-transparent text-lg appearance-none cursor-pointer">
                  <option value="GOODS">Goods</option>
                  <option value="SERVICE">Service</option>
                  <option value="COMBO">Combo</option>
                </select>
                <div className="absolute right-0 top-0 text-blue-500 text-sm pointer-events-none translate-x-full ml-4 whitespace-nowrap">
                  Provide Drop down selection of<br/>Goods<br/>Service<br/>Combo
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <label className="w-1/3 text-xl font-medium text-pink-600" style={{ fontFamily: 'cursive' }}>Category</label>
              <div className="flex-1 relative">
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Selection" className="w-full border-b-2 border-pink-300 focus:border-pink-500 outline-none px-2 py-1 bg-transparent text-lg text-center" />
                <div className="absolute right-0 top-0 text-orange-500 text-sm pointer-events-none translate-x-full ml-4 whitespace-nowrap pt-2">
                  Category Can be created and saved on the fly<br/>(Many2one Field)
                </div>
              </div>
            </div>

            <div className="flex items-end mt-8 gap-12">
              <div className="w-48 h-48 border-2 border-pink-600 rounded-3xl flex items-center justify-center bg-white cursor-pointer hover:bg-slate-50">
                <span className="text-pink-600 text-xl font-medium" style={{ fontFamily: 'cursive' }}>Upload<br/>Image</span>
              </div>
              
              <div className="flex-1 space-y-8 mb-4">
                <div className="flex items-center">
                  <label className="w-1/3 text-xl font-medium text-pink-600" style={{ fontFamily: 'cursive' }}>Sales Price</label>
                  <div className="flex-1 flex items-center border-b-2 border-pink-300">
                    <span className="text-slate-500 px-2">Rs.</span>
                    <input type="number" step="0.01" value={form.salesPrice} onChange={(e) => setForm({ ...form, salesPrice: e.target.value })} className="w-full focus:outline-none py-1 bg-transparent text-lg" required />
                  </div>
                </div>
                <div className="flex items-center">
                  <label className="w-1/3 text-xl font-medium text-pink-600" style={{ fontFamily: 'cursive' }}>Cost</label>
                  <div className="flex-1 flex items-center border-b-2 border-pink-300">
                    <span className="text-slate-500 px-2">Rs.</span>
                    <input type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} className="w-full focus:outline-none py-1 bg-transparent text-lg" required />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Keeping essential fields not in wireframe but required by backend */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Additional Inventory Settings</h3>
              <div className="flex gap-8">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">SKU</label>
                  <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full border-b-2 border-slate-300 px-2 py-1 outline-none" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Stock</label>
                  <input type="number" value={form.stock} readOnly className="w-full border-b-2 border-slate-300 px-2 py-1 outline-none bg-slate-50 text-slate-500" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.status === 'ACTIVE'} onChange={(e) => setForm({ ...form, status: e.target.checked ? 'ACTIVE' : 'INACTIVE' })} className="w-5 h-5 accent-blue-600" />
                    <span className="font-semibold text-slate-700">Active</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  const filteredList = list.filter(p => statusFilter === 'ALL' || p.status === statusFilter);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center" style={{ fontFamily: 'cursive' }}>{listMode === 'list' ? 'Product Master List View' : 'Product Master Kanban View'}</h1>
        
        {/* Top bar matching wireframe */}
        <div className="flex items-center justify-between mb-8 gap-4">
          <button onClick={openNew} className="px-8 py-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-lg hover:bg-slate-200">New</button>
          
          <div className="flex-1 max-w-xl">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-full px-4 py-2 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-500" />
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => {}} className="px-8 py-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-lg hover:bg-slate-200">Back</button>
            <ViewModeButtons value={listMode} onChange={setListMode} />
          </div>
        </div>

        <div className="mb-4">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm">
            <option value="">All Types</option>
            <option value="GOODS">Goods</option>
            <option value="SERVICE">Service</option>
          </select>
        </div>

        {loading && <p className="text-sm text-slate-500">Loading...</p>}
        {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm mb-4">{error}</div>}
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
        <div className="overflow-x-auto border-t-2 border-slate-200">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-800 font-medium text-lg" style={{ fontFamily: 'cursive' }}>
                <th className="py-4 px-4 w-16 text-center">Select</th>
                <th className="py-4 px-4 text-center">Product</th>
                <th className="py-4 px-4 text-center">Category</th>
                <th className="py-4 px-4 text-center">Type</th>
                <th className="py-4 px-4 text-center">Sales Price</th>
                <th className="py-4 px-4 text-center">Cost</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((p) => (
                <tr key={p.id} onClick={() => openRow(p)} className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer text-center text-slate-700 font-medium text-base">
                  <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="w-5 h-5 accent-blue-600 rounded border-slate-300 cursor-pointer" /></td>
                  <td className="py-4 px-4 font-semibold">{p.name}</td>
                  <td className="py-4 px-4">{p.category || '—'}</td>
                  <td className="py-4 px-4">{p.type}</td>
                  <td className="py-4 px-4">{Number(p.salesPrice).toLocaleString('en-IN')}</td>
                  <td className="py-4 px-4">{Number(p.costPrice).toLocaleString('en-IN')}</td>
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
