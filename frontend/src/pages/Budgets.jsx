import React, { useEffect, useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { budgetsAPI } from '../services/api';
import { ArrowLeft, Plus, Wifi, WifiOff } from 'lucide-react';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const pct = (a, c) => (!c ? '0%' : `${((Number(a || 0) / Number(c)) * 100).toFixed(1)}%`);

export const Budgets = () => {
  const { budgets: seedBudgets, contacts } = useAccounting();
  const [budgets, setBudgets] = useState(seedBudgets);
  const [live, setLive] = useState(false);
  const [view, setView] = useState('list'); // list | form
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [form, setForm] = useState({
    name: '',
    periodStart: '',
    periodEnd: '',
    responsiblePerson: '',
    analyticAccount: '',
    plannedAmount: '',
    committedAmount: '',
    achievedAmount: 0,
  });

  const loadBudgets = async () => {
    try {
      const res = await budgetsAPI.list();
      if (res.data?.budgets && Array.isArray(res.data.budgets)) {
        setBudgets(res.data.budgets);
        setLive(true);
      }
    } catch {
      setLive(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, []);

  const selected = budgets.find((b) => b.id === selectedId) || null;
  const openRecord = (b) => { setSelectedId(b.id); setView('form'); setActionError(''); };
  const openNew = () => {
    setSelectedId(null);
    setForm({
      name: '',
      periodStart: '',
      periodEnd: '',
      responsiblePerson: contacts[0]?.name || '',
      analyticAccount: '',
      plannedAmount: '',
      committedAmount: '',
      achievedAmount: 0,
    });
    setActionError('');
    setView('form');
  };
  const resetNew = () => openNew();

  const saveNew = async (e) => {
    e.preventDefault();
    setActionError('');
    setBusy(true);
    try {
      if (live) {
        const res = await budgetsAPI.create({
          name: form.name,
          periodStart: form.periodStart,
          periodEnd: form.periodEnd,
          responsiblePerson: form.responsiblePerson,
          plannedAmount: Number(form.plannedAmount || 0),
          committedAmount: Number(form.committedAmount || 0),
        });
        if (res.data?.budget) {
          await loadBudgets();
          setSelectedId(res.data.budget.id);
          setView('form');
          return;
        }
      }
    } catch (err) {
      if (err?.response?.data?.error) {
        setActionError(err.response.data.error);
        setBusy(false);
        return;
      }
    } finally {
      setBusy(false);
    }

    // Offline / fallback save
    const nb = {
      id: Math.max(0, ...budgets.map((b) => b.id)) + 1,
      name: form.name,
      analyticAccount: form.analyticAccount,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      responsiblePerson: form.responsiblePerson,
      plannedAmount: Number(form.plannedAmount || 0),
      committedAmount: Number(form.committedAmount || 0),
      achievedAmount: 0,
      status: 'DRAFT',
      revisedFrom: null,
      revisedTo: null,
    };
    setBudgets([nb, ...budgets]);
    setSelectedId(nb.id);
  };

  const confirmBudget = async () => {
    if (!selectedId) return;
    setBusy(true);
    setActionError('');
    try {
      if (live) {
        await budgetsAPI.confirm(selectedId);
        await loadBudgets();
        return;
      }
    } catch (err) {
      if (err?.response?.data?.error) setActionError(err.response.data.error);
    } finally {
      setBusy(false);
    }
    setBudgets(budgets.map((b) => (b.id === selectedId ? { ...b, status: 'CONFIRMED' } : b)));
  };

  const reviseBudget = async () => {
    if (!selectedId) return;
    setBusy(true);
    setActionError('');
    try {
      if (live) {
        const res = await budgetsAPI.revise(selectedId);
        await loadBudgets();
        if (res.data?.revisedBudget) {
          setSelectedId(res.data.revisedBudget.id);
        }
        return;
      }
    } catch (err) {
      if (err?.response?.data?.error) setActionError(err.response.data.error);
    } finally {
      setBusy(false);
    }

    const orig = budgets.find((b) => b.id === selectedId);
    if (!orig || orig.status !== 'CONFIRMED') return;
    const nb = {
      ...orig,
      id: Math.max(0, ...budgets.map((b) => b.id)) + 1,
      name: `${orig.name} Revised`,
      status: 'DRAFT',
      revisedFrom: orig.id,
      revisedTo: null,
    };
    setBudgets(budgets.map((b) => (b.id === orig.id ? { ...b, status: 'REVISED', revisedTo: nb.id } : b)).concat([nb]));
    setSelectedId(nb.id);
  };

  const input = 'w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm';
  const label = 'block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1';
  const stageColor = (s) => (s === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700' : s === 'REVISED' ? 'bg-purple-50 text-purple-700' : s === 'CANCELLED' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700');

  if (view === 'form' && selected) {
    const toAchieve = Number(selected.committedAmount || 0) - Number(selected.achievedAmount || 0);
    const revisedLink = selected.revisedTo ? budgets.find((b) => b.id === selected.revisedTo) : null;
    const origLink = selected.revisedFrom ? budgets.find((b) => b.id === selected.revisedFrom) : null;
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Budget (Form View) — {selected.status}</h1>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              {live ? <><Wifi className="w-3.5 h-3.5 text-emerald-600" /> Live DB</> : <><WifiOff className="w-3.5 h-3.5 text-amber-600" /> Offline</>}
            </p>
          </div>
          <button onClick={() => setView('list')} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold">
            {['DRAFT', 'CONFIRMED', 'REVISED'].map((s) => (
              <span key={s} className={`px-2.5 py-1 rounded-full ${selected.status === s ? stageColor(s) + ' ring-1 ring-current' : 'bg-slate-50 text-slate-400'}`}>{s}</span>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Budget Name</p><p className="font-bold text-base">{selected.name}</p></div>
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Responsible</p><p className="font-semibold">{selected.responsiblePerson}</p></div>
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Budget Period</p><p>{selected.periodStart} To {selected.periodEnd}</p></div>
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Analytic Account</p><p className="font-semibold">{selected.analyticAccount}</p></div>
          </div>
          {origLink && <p className="text-xs">Revision Of: <button onClick={() => setSelectedId(origLink.id)} className="text-blue-700 font-bold underline">Original Budget — {origLink.name}</button></p>}
          {revisedLink && <p className="text-xs">Revised Budget: <button onClick={() => setSelectedId(revisedLink.id)} className="text-blue-700 font-bold underline">{revisedLink.name}</button> (click to open revised)</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm bg-slate-50/70 rounded-xl p-4">
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Committed Amount</p><p className="font-bold">{inr(selected.committedAmount)}</p></div>
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Achieved Amount</p><p className="font-bold">{selected.status === 'DRAFT' ? '— (visible when Confirmed)' : inr(selected.achievedAmount)}</p></div>
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Achieved %</p><p className="font-bold">{selected.status === 'DRAFT' ? '—' : pct(selected.achievedAmount, selected.committedAmount)}</p></div>
            <div><p className="text-[11px] uppercase font-bold text-slate-500">Amount To Achieve</p><p className="font-bold">{selected.status === 'DRAFT' ? '—' : inr(toAchieve)}</p></div>
          </div>
          {actionError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{actionError}</div>}
          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={openNew} className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">New</button>
            {selected.status === 'DRAFT' && <button onClick={confirmBudget} disabled={busy} className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold">Confirm</button>}
            {selected.status === 'CONFIRMED' && <button onClick={reviseBudget} disabled={busy} className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-semibold">Revise</button>}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'form' && !selected) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-slate-900">Budget — New (Fresh Budget)</h1>
          <button onClick={() => setView('list')} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
        </div>
        <form onSubmit={saveNew} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          {actionError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{actionError}</div>}
          <div><label className={label}>Budget Name (alphanumeric)</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} required /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={label}>Start Date</label><input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} className={input} required /></div>
            <div><label className={label}>End Date</label><input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} className={input} required /></div>
          </div>
          <div>
            <label className={label}>Responsible (select from Contacts)</label>
            <select value={form.responsiblePerson} onChange={(e) => setForm({ ...form, responsiblePerson: e.target.value })} className={input}>
              {contacts.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div><label className={label}>Analytic Account</label><input value={form.analyticAccount} onChange={(e) => setForm({ ...form, analyticAccount: e.target.value })} placeholder="e.g. Manufacturing & Procurement" className={input} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={label}>Planned Amount (₹)</label><input type="number" min="0" value={form.plannedAmount} onChange={(e) => setForm({ ...form, plannedAmount: e.target.value })} className={input} required /></div>
            <div><label className={label}>Committed Amount (₹)</label><input type="number" min="0" value={form.committedAmount} onChange={(e) => setForm({ ...form, committedAmount: e.target.value })} className={input} required /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={resetNew} className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold">New</button>
            <button type="submit" disabled={busy} className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold">Confirm</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Budget Report (List View)</h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            {live ? <><Wifi className="w-3.5 h-3.5 text-emerald-600" /> Live DB</> : <><WifiOff className="w-3.5 h-3.5 text-amber-600" /> Offline</>}
          </p>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-1.5"><Plus className="w-4 h-4" /> New</button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase text-slate-500 border-b border-slate-100">
            <th className="px-4 py-3">Budget</th><th className="px-4 py-3">Start Date</th><th className="px-4 py-3">End Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Achieved %</th>
          </tr></thead>
          <tbody>
            {budgets.map((b) => (
              <tr key={b.id} onClick={() => openRecord(b)} className="border-b border-slate-50 last:border-0 hover:bg-blue-50/40 cursor-pointer">
                <td className="px-4 py-3 font-bold">{b.name}</td>
                <td className="px-4 py-3 text-slate-600">{b.periodStart}</td>
                <td className="px-4 py-3 text-slate-600">{b.periodEnd}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${stageColor(b.status)}`}>{b.status}</span></td>
                <td className="px-4 py-3 text-right font-semibold">{b.status === 'DRAFT' ? '—' : pct(b.achievedAmount, b.committedAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
