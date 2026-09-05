import React, { useCallback, useState } from 'react';
import { analyticsAPI } from '../services/api';
import { useLiveList } from '../hooks/useLiveList';
import { ArrowLeft, Plus } from 'lucide-react';

const emptyForm = { name: '', type: 'EXPENSE' };

export const Analytics = () => {
  const [view, setView] = useState('list');
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetcher = useCallback(() => analyticsAPI.list(), []);
  const { data: list, loading, error, refresh } = useLiveList(fetcher, 'analyticAccounts', []);

  const openNew = () => { setForm(emptyForm); setFormError(''); setView('form'); };
  const resetNew = () => { setForm(emptyForm); setFormError(''); };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const res = await analyticsAPI.create(form);
      if (res.data?.analyticAccount) { await refresh(); setView('list'); }
    } catch (err) {
      setFormError(err?.response?.data?.error || 'Failed to create analytic account. Is the backend running?');
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm';
  const label = 'block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1';

  if (view === 'form') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-slate-900">Analyticals — Form View</h1>
          <button onClick={() => setView('list')} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
        </div>
        <form onSubmit={handleConfirm} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          {formError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{formError}</div>}
          <div><label className={label}>Analytic Account</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Q3 Furniture Manufacturing" className={input} required /></div>
          <div>
            <label className={label}>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={input}>
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </select>
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
          <h1 className="text-xl font-bold text-slate-900">Analyticals (List View)</h1>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-1.5"><Plus className="w-4 h-4" /> New</button>
      </div>
      {loading && <p className="text-sm text-slate-500">Loading analytic accounts…</p>}
      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium mb-4">{error}</div>}
      {!loading && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Budgets</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-semibold text-slate-900">{a.name}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">{a.type}</span></td>
                  <td className="px-4 py-3 text-slate-600">{a.budgets?.length || 0}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">No analytic accounts found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
