import React, { useCallback, useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { accountsAPI, getApiError } from '../services/api';
import { useLiveList } from '../hooks/useLiveList';
import { ArrowLeft, Plus } from 'lucide-react';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const emptyForm = { code: '', name: '', type: 'ASSET' };
const typeColor = (t) => ({
  ASSET: 'bg-blue-50 text-blue-700', LIABILITY: 'bg-red-50 text-red-700', CAPITAL: 'bg-purple-50 text-purple-700',
  INCOME: 'bg-emerald-50 text-emerald-700', EXPENSE: 'bg-amber-50 text-amber-700',
}[t] || 'bg-slate-100 text-slate-700');

export const ChartOfAccounts = () => {
  const { accounts: mockAccounts, addAccount, syncAllData } = useAccounting();
  const [view, setView] = useState('list'); // list | form (Excalidraw: New opens blank form)
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetcher = useCallback(() => accountsAPI.list(), []);
  const { data: list, loading, error, refresh } = useLiveList(fetcher, 'accounts', mockAccounts);

  const openNew = () => { setForm(emptyForm); setFormError(''); setView('form'); };
  const resetNew = () => { setForm(emptyForm); setFormError(''); };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const res = await accountsAPI.create(form);
      if (res.data?.account) {
        if (syncAllData) await syncAllData();
        await refresh();
        setView('list');
        return;
      }
      setFormError('Failed to create account.');
    } catch (err) {
      setFormError(err?.response?.data?.error || getApiError(err));
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
          <h1 className="text-xl font-bold text-slate-900">Chart of Account — Form View</h1>
          <button onClick={() => setView('list')} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
        </div>
        <form onSubmit={handleConfirm} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          {formError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{formError}</div>}
          <div><label className={label}>Account Code (unique, e.g. 1004)</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="1004" className={input} required /></div>
          <div><label className={label}>Account Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Office Rent" className={input} required /></div>
          <div>
            <label className={label}>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={input}>
              <option value="ASSET">Asset</option>
              <option value="LIABILITY">Liability</option>
              <option value="CAPITAL">Capital</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
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
          <h1 className="text-xl font-bold text-slate-900">Chart of Accounts (List View)</h1>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-1.5"><Plus className="w-4 h-4" /> New</button>
      </div>
      {loading && <p className="text-sm text-slate-500 mb-3">Loading latest accounts…</p>}
      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium mb-4">{error}</div>}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Account Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id || a.code} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-mono text-slate-600">{a.code}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{a.name}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${typeColor(a.type)}`}>{a.type}</span></td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">{a.balance !== undefined ? inr(a.balance) : '—'}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">{loading ? 'Loading accounts…' : 'No accounts found.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
