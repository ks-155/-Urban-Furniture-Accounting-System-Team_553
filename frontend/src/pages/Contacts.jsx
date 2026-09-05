import React, { useCallback, useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { contactsAPI, getApiError } from '../services/api';
import { useLiveList, phoneOf } from '../hooks/useLiveList';
import { ArrowLeft, Plus, Search, Wifi, WifiOff } from 'lucide-react';

const emptyForm = { name: '', type: 'CUSTOMER', email: '', phone: '', city: '', state: '', pincode: '' };

export const Contacts = () => {
  const { contacts: mockContacts, addContact } = useAccounting();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [view, setView] = useState('list'); // list | form
  const [listMode, setListMode] = useState('list'); // list | kanban (Excalidraw view toggle)
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetcher = useCallback(
    () => contactsAPI.list({ ...(typeFilter ? { type: typeFilter } : {}), ...(search ? { search } : {}) }),
    [typeFilter, search]
  );
  const { data: list, loading, error, live, refresh } = useLiveList(fetcher, 'contacts', mockContacts);

  const openNew = () => { setEditing(null); setForm(emptyForm); setFormError(''); setView('form'); };
  const resetNew = () => { setEditing(null); setForm(emptyForm); setFormError(''); };
  const openRow = (c) => {
    setEditing(c);
    setForm({ name: c.name || '', type: c.type || 'CUSTOMER', email: c.email || '', phone: phoneOf(c) === '—' ? '' : phoneOf(c), city: c.city || '', state: c.state || '', pincode: c.pincode || '' });
    setFormError('');
    setView('form');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('Contact name is required.'); return; }
    setSaving(true);
    try {
      if (editing?.id && live) {
        const res = await contactsAPI.update(editing.id, form);
        if (res.data?.contact) { await refresh(); setView('list'); return; }
      }
      const res = await contactsAPI.create(form);
      if (res.data?.contact) { await refresh(); setView('list'); return; }
      // Unexpected shape — fall back to mock
      addContact({ ...form, mobile: form.phone });
      await refresh();
      setView('list');
    } catch (err) {
      if (err?.response?.data?.error) setFormError(err.response.data.error);
      else {
        // Offline: persist to mock store so demo continues
        try {
          if (editing) { await refresh(); }
          else addContact({ ...form, mobile: form.phone });
          setView('list');
        } catch {
          setFormError(getApiError(err));
        }
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
          <h1 className="text-xl font-bold text-slate-900">{editing ? 'Contact Details' : 'Contact Master Form View'}</h1>
          <button onClick={() => setView('list')} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
        </div>
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          {formError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{formError}</div>}
          <div>
            <label className={label}>Contact Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Azure Furniture" className={input} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={input}>
                <option value="CUSTOMER">Customer</option>
                <option value="VENDOR">Vendor</option>
                <option value="BOTH">Both</option>
              </select>
            </div>
            <div>
              <label className={label}>Email (Unique)</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" className={input} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 ..." className={input} />
            </div>
            <div>
              <label className={label}>City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={input} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>State</label>
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={input} />
            </div>
            <div>
              <label className={label}>Pincode</label>
              <input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className={input} />
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
          <h1 className="text-xl font-bold text-slate-900">Contact List View</h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            {live ? <><Wifi className="w-3.5 h-3.5 text-emerald-600" /> Live from backend</> : <><WifiOff className="w-3.5 h-3.5 text-amber-600" /> Offline demo data</>}
          </p>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-1.5"><Plus className="w-4 h-4" /> New</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone…" className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm">
          <option value="">All types</option>
          <option value="CUSTOMER">Customer</option>
          <option value="VENDOR">Vendor</option>
          <option value="BOTH">Both</option>
        </select>
        <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm font-semibold">
          <button onClick={() => setListMode('list')} className={`px-3 py-2 ${listMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>List View</button>
          <button onClick={() => setListMode('kanban')} className={`px-3 py-2 ${listMode === 'kanban' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Kanban View</button>
        </div>
        <button onClick={() => setView('list')} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back</button>
      </div>
      {loading && <p className="text-sm text-slate-500">Loading contacts…</p>}
      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium mb-4">{error}</div>}
      {!loading && listMode === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((c) => (
            <div key={c.id} onClick={() => openRow(c)} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all">
              <p className="font-bold text-slate-900">{c.name}</p>
              <p className="text-xs text-slate-500 mt-1">{c.email}</p>
              <p className="text-xs text-slate-500">{phoneOf(c)}</p>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[11px] font-bold ${c.type === 'VENDOR' ? 'bg-emerald-50 text-emerald-700' : c.type === 'BOTH' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>{c.type}</span>
            </div>
          ))}
          {list.length === 0 && <p className="text-sm text-slate-500 col-span-full text-center py-8">No contacts found.</p>}
        </div>
      )}
      {!loading && listMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 hidden md:table-cell">Phone</th>
                <th className="px-4 py-3 hidden md:table-cell">City</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} onClick={() => openRow(c)} className="border-b border-slate-50 last:border-0 hover:bg-blue-50/40 cursor-pointer">
                  <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${c.type === 'VENDOR' ? 'bg-emerald-50 text-emerald-700' : c.type === 'BOTH' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>{c.type}</span></td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{c.email}</td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{phoneOf(c)}</td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{c.city || '—'}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No contacts found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
