import React, { useCallback, useState } from 'react';
import { analyticsAPI } from '../services/api';
import { useLiveList } from '../hooks/useLiveList';
import { Plus, Wifi, WifiOff } from 'lucide-react';

export const Analytics = () => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'EXPENSE' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetcher = useCallback(() => analyticsAPI.list(), []);
  const { data: list, loading, error, live, refresh } = useLiveList(fetcher, 'analyticAccounts', []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const res = await analyticsAPI.create(form);
      if (res.data?.analyticAccount) { setForm({ name: '', type: 'EXPENSE' }); setShowForm(false); await refresh(); }
    } catch (err) {
      setFormError(err?.response?.data?.error || 'Failed to create analytic account. Is the backend running?');
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm';
  const label = 'block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Analyticals (Budget Tracking Cost Centers)</h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            {live ? <><Wifi className="w-3.5 h-3.5 text-emerald-600" /> Live from backend</> : <><WifiOff className="w-3.5 h-3.5 text-amber-600" /> Offline — backend required</>}
          </p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setFormError(''); }} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-1.5"><Plus className="w-4 h-4" /> New</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div><label className={label}>Analytic Account</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Q3 Furniture Manufacturing" className={input} required /></div>
          <div>
            <label className={label}>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={input}>
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </select>
          </div>
          <div><button type="submit" disabled={saving} className="w-full px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : 'Create'}</button></div>
          {formError && <div className="sm:col-span-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{formError}</div>}
        </form>
      )}

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
