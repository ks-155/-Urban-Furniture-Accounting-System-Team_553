import React, { useCallback, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { analyticsAPI, getApiError } from '../services/api';
import { useLiveList } from '../hooks/useLiveList';
import {
  ArrowLeft,
  Plus,
  Search,
  Layers,
  TrendingDown,
  TrendingUp,
  PieChart,
  Eye,
  Calendar,
  FileText,
  DollarSign,
  ChevronRight,
} from 'lucide-react';

const emptyForm = { name: '', type: 'EXPENSE' };
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const Analytics = () => {
  const [view, setView] = useState('list'); // 'list' | 'detail' | 'form'
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'EXPENSE' | 'INCOME'
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetcher = useCallback(() => analyticsAPI.list(), []);
  const { data: list, loading, error, refresh } = useLiveList(fetcher, 'analyticAccounts', []);

  // Filtered accounts
  const filteredList = useMemo(() => {
    return (list || []).filter((acc) => {
      const matchSearch = (acc.name || '').toLowerCase().includes(search.toLowerCase().trim());
      const matchType = typeFilter === 'ALL' || acc.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [list, search, typeFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const total = (list || []).length;
    const expense = (list || []).filter((a) => a.type === 'EXPENSE').length;
    const income = (list || []).filter((a) => a.type === 'INCOME').length;
    const totalPlanned = (list || []).reduce((sum, a) => {
      const bSum = (a.budgets || []).reduce((s, b) => s + Number(b.plannedAmount || 0), 0);
      return sum + bSum;
    }, 0);
    return { total, expense, income, totalPlanned };
  }, [list]);

  const openNew = () => {
    setForm(emptyForm);
    setFormError('');
    setView('form');
  };

  const openDetail = (acc) => {
    const fresh = list.find((a) => a.id === acc.id) || acc;
    setSelectedAccount(fresh);
    setView('detail');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) {
      setFormError('Analytic account name is required.');
      return;
    }
    setSaving(true);
    try {
      const res = await analyticsAPI.create({
        name: form.name.trim(),
        type: form.type,
      });
      if (res.data?.analyticAccount) {
        await refresh();
        setView('list');
      }
    } catch (err) {
      setFormError(err?.response?.data?.error || getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all';
  const labelClass = 'block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1';

  // ---------------- VIEW: CREATE FORM ----------------
  if (view === 'form') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">New Analytic Account</h1>
            <p className="text-xs text-slate-500 mt-0.5">Define a cost center or revenue category for financial tracking</p>
          </div>
          <button
            onClick={() => setView('list')}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          {formError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className={labelClass}>Account Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Warehouse Renovation Project, Q4 Marketing Campaign"
              className={inputClass}
              required
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass}>Account Type *</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className={inputClass}
            >
              <option value="EXPENSE">Expense (Cost Center / Procurement)</option>
              <option value="INCOME">Income (Revenue Stream / Product Line)</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Expense accounts track purchasing costs against budgets. Income accounts track sales revenue.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setForm(emptyForm);
                setFormError('');
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm transition"
            >
              {saving ? 'Creating…' : 'Create Analytic Account'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ---------------- VIEW: DRILLDOWN / DETAIL ----------------
  if (view === 'detail' && selectedAccount) {
    const acc = list.find((a) => a.id === selectedAccount.id) || selectedAccount;
    const budgets = acc.budgets || [];
    const journalItems = acc.journalItems || [];

    const totalPlanned = budgets.reduce((s, b) => s + Number(b.plannedAmount || 0), 0);
    const totalCommitted = budgets.reduce((s, b) => s + Number(b.committedAmount || 0), 0);
    const totalActual = journalItems.reduce((s, j) => {
      return acc.type === 'EXPENSE' ? s + Number(j.debit || 0) : s + Number(j.credit || 0);
    }, 0);

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('list')}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              title="Back to List"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{acc.name}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    acc.type === 'EXPENSE'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {acc.type}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Analytic ID: #{acc.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/budgets"
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition"
            >
              <PieChart className="w-4 h-4 text-blue-600" /> Go to Budgets
            </Link>
          </div>
        </div>

        {/* Drilldown Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Planned</span>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{inr(totalPlanned)}</p>
            <p className="text-xs text-slate-400 mt-1">Across {budgets.length} linked budget(s)</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Committed Amount</span>
              <TrendingDown className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{inr(totalCommitted)}</p>
            <p className="text-xs text-slate-400 mt-1">Confirmed purchase / sales orders</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Actual {acc.type === 'EXPENSE' ? 'Expense (Debit)' : 'Revenue (Credit)'}
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-700 mt-2">{inr(totalActual)}</p>
            <p className="text-xs text-slate-400 mt-1">Recorded in General Ledger</p>
          </div>
        </div>

        {/* Linked Budgets Section */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Linked Budgets</h2>
              <p className="text-xs text-slate-500 mt-0.5">Budgets tied specifically to this cost center</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {budgets.length} Budget{budgets.length === 1 ? '' : 's'}
            </span>
          </div>
          {budgets.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No budgets currently linked to this analytic account.{' '}
              <Link to="/budgets" className="text-blue-600 hover:underline font-medium">
                Create a budget now &rarr;
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Budget Name</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3 text-right">Planned Amount</th>
                    <th className="px-4 py-3 text-right">Committed Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {budgets.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-slate-900">{b.name}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {b.periodStart ? String(b.periodStart).slice(0, 10) : '—'} &rarr;{' '}
                        {b.periodEnd ? String(b.periodEnd).slice(0, 10) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{inr(b.plannedAmount)}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-600">{inr(b.committedAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            b.status === 'CONFIRMED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : b.status === 'REVISED'
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Linked Journal Items / Ledger Activity */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">General Ledger Activity</h2>
              <p className="text-xs text-slate-500 mt-0.5">Posted entries assigned to this analytic account</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {journalItems.length} Record{journalItems.length === 1 ? '' : 's'}
            </span>
          </div>
          {journalItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No journal transactions recorded for this analytic account yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Entry No.</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Reference / Label</th>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3 text-right">Debit</th>
                    <th className="px-4 py-3 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {journalItems.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-blue-600">{j.entry?.entryNumber || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {j.entry?.date ? String(j.entry.date).slice(0, 10) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        <div>{j.label || j.entry?.reference || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        <span className="font-mono font-semibold text-slate-900">{j.account?.code}</span>{' '}
                        {j.account?.name}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {Number(j.debit) > 0 ? inr(j.debit) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {Number(j.credit) > 0 ? inr(j.credit) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------- VIEW: LIST VIEW (DEFAULT) ----------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytic Accounts</h1>
          <p className="text-xs text-slate-500 mt-1">
            Cost centers and revenue lines for project-level accounting
          </p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" /> New Analytic Account
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Cost Centers</span>
            <p className="text-xl font-bold text-slate-900">{kpis.total}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Expense Accounts</span>
            <p className="text-xl font-bold text-slate-900">{kpis.expense}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Income Accounts</span>
            <p className="text-xl font-bold text-slate-900">{kpis.income}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Planned Budgets</span>
            <p className="text-xl font-bold text-slate-900">{inr(kpis.totalPlanned)}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search analytic accounts by name…"
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {['ALL', 'EXPENSE', 'INCOME'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                typeFilter === type
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type === 'ALL' ? 'All Types' : type === 'EXPENSE' ? 'Expense' : 'Income'}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium mb-4">
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && <p className="text-sm text-slate-500 py-6 text-center">Loading analytic accounts from database…</p>}

      {/* Table */}
      {!loading && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-3.5">Account Name</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5 text-center">Linked Budgets</th>
                <th className="px-4 py-3.5 text-right">Planned Budget</th>
                <th className="px-4 py-3.5 text-right">Committed</th>
                <th className="px-4 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.map((a) => {
                const bCount = a.budgets?.length || 0;
                const bPlanned = (a.budgets || []).reduce((s, b) => s + Number(b.plannedAmount || 0), 0);
                const bCommitted = (a.budgets || []).reduce((s, b) => s + Number(b.committedAmount || 0), 0);

                return (
                  <tr
                    key={a.id}
                    onClick={() => openDetail(a)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="px-4 py-3.5 font-semibold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {a.name}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          a.type === 'EXPENSE'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {a.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate-600 font-medium">
                      {bCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                          {bCount}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-900">
                      {bPlanned > 0 ? inr(bPlanned) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-600">
                      {bCommitted > 0 ? inr(bCommitted) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(a);
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 inline-flex items-center gap-1 text-xs font-semibold transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <p className="text-sm">No analytic accounts match your criteria.</p>
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="text-xs text-blue-600 hover:underline mt-1 font-semibold"
                      >
                        Clear search
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
