import React, { useEffect, useMemo, useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { reportsAPI } from '../services/api';
import { ArrowLeft, Printer } from 'lucide-react';

const inr = (n) => `\u20B9${Number(n || 0).toLocaleString('en-IN')}`;

// ---------- offline compute fallback (mock journal entries) ----------
const useYearFilter = (entries) => {
  const years = useMemo(() => {
    const ys = [...new Set(entries.map((e) => (e.date || '').slice(0, 4)).filter(Boolean))];
    return ys.length ? ys.sort().reverse() : ['2026'];
  }, [entries]);
  const [year, setYear] = useState(years[0]);
  const filtered = useMemo(() => entries.filter((e) => (e.date || '').startsWith(year)), [entries, year]);
  return { years, year, setYear, filtered };
};

const nets = (entries) => {
  const m = {};
  entries.forEach((e) => e.items.forEach((it) => {
    const c = it.accountCode;
    m[c] = m[c] || { debit: 0, credit: 0, name: it.accountName };
    m[c].debit += Number(it.debit || 0);
    m[c].credit += Number(it.credit || 0);
  }));
  return m;
};

const FilterBar = ({ title, live, years, year, setYear, yearOptions }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
    <div>
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
    </div>
    <div className="flex items-center gap-2 no-print">
      {(yearOptions || (!live && years)) && (
        <select value={year} onChange={(e) => setYear(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold">
          {(yearOptions || years.map((y) => ({ value: y, label: y }))).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 flex items-center gap-1.5"><Printer className="w-4 h-4" /> Print / PDF</button>
    </div>
  </div>
);

const LIVE_YEARS = [{ value: '', label: 'All time' }, { value: '2026', label: '2026' }, { value: '2025', label: '2025' }];

// ---------- Balance Sheet (live-first) ----------
export const BalanceSheet = () => {
  const { journalEntries } = useAccounting();
  const { years, year, setYear, filtered } = useYearFilter(journalEntries);
  const [live, setLive] = useState(undefined); // undefined = loading (no fallback flicker)
  const [liveYear, setLiveYear] = useState('');

  useEffect(() => {
    setLive(undefined);
    reportsAPI.balanceSheet(liveYear ? { year: liveYear } : {})
      .then((res) => setLive(res.data))
      .catch(() => setLive(null));
  }, [liveYear]);

  const row = (label, val) => (
    <div className="flex justify-between py-2 border-b border-slate-50 text-sm"><span className="text-slate-600">{label}</span><b>{inr(val)}</b></div>
  );

  if (live === undefined) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-sm text-slate-500">Loading Balance Sheet...</div>;
  }

  if (live) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FilterBar title={`Balance Sheet${liveYear ? ` ${liveYear}` : ''}`} live yearOptions={LIVE_YEARS} year={liveYear} setYear={setLiveYear} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-bold text-slate-900 mb-2">Assets</h2>
            {live.assets.map((a) => row(`${a.name} (${a.code})`, a.balance))}
            <div className="flex justify-between py-2 text-sm"><span className="font-bold">Total Asset</span><b>{inr(live.totalAssets)}</b></div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-bold text-slate-900 mb-2">Liabilities</h2>
            {live.liabilities.map((l) => row(`${l.name} (${l.code})`, l.balance))}
            <h2 className="font-bold text-slate-900 mt-4 mb-2">Capital (Equity)</h2>
            {(live.equity || []).map((e) => row(`${e.name} (${e.code})`, e.balance))}
            <div className="flex justify-between py-2 text-sm"><span className="font-bold">Total Liability + Equity</span><b>{inr(Number(live.totalLiabilities || 0) + Number(live.totalEquity || 0))}</b></div>
          </div>
        </div>
        <p className={`mt-4 text-xs font-bold p-3 rounded-xl ${live.isBalanced ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {live.isBalanced ? 'Balanced: Assets = Liabilities + Equity.' : 'Note: out of balance - post missing entries.'}
        </p>
      </div>
    );
  }

  const m = nets(filtered);
  const cash = (m['1001']?.debit || 0) - (m['1001']?.credit || 0);
  const bank = (m['1002']?.debit || 0) - (m['1002']?.credit || 0);
  const debtors = (m['1003']?.debit || 0) - (m['1003']?.credit || 0);
  const creditors = (m['2001']?.credit || 0) - (m['2001']?.debit || 0);
  const tax = (m['2002']?.credit || 0) - (m['2002']?.debit || 0);
  const capital = (m['3001']?.credit || 0) - (m['3001']?.debit || 0);
  const totalAssets = cash + bank + debtors;
  const totalLiab = creditors + tax + capital;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FilterBar title={`Balance Sheet ${year}`} live={false} years={years} year={year} setYear={setYear} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 mb-2">Assets</h2>
          {row('Cash', cash)}{row('Bank', bank)}{row('Debtors', debtors)}
          <div className="flex justify-between py-2 text-sm"><span className="font-bold">Total Asset</span><b>{inr(totalAssets)}</b></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 mb-2">Liabilities</h2>
          {row('Creditors', creditors)}{row('Tax Payable', tax)}{row('Capital', capital)}
          <div className="flex justify-between py-2 text-sm"><span className="font-bold">Total Liability</span><b>{inr(totalLiab)}</b></div>
        </div>
      </div>
      <p className={`mt-4 text-xs font-bold p-3 rounded-xl ${Math.abs(totalAssets - totalLiab) < 0.01 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
        {Math.abs(totalAssets - totalLiab) < 0.01 ? 'Balanced: Total Assets match Total Liabilities.' : 'Note: totals differ - post opening Capital / pending entries to balance (demo data).'}
      </p>
    </div>
  );
};

// ---------- Profit & Loss (live-first) ----------
export const ProfitLoss = () => {
  const { journalEntries } = useAccounting();
  const { years, year, setYear, filtered } = useYearFilter(journalEntries);
  const [live, setLive] = useState(undefined); // undefined = loading
  const [liveYear, setLiveYear] = useState('');

  useEffect(() => {
    setLive(undefined);
    reportsAPI.profitLoss(liveYear ? { year: liveYear } : {})
      .then((res) => setLive(res.data))
      .catch(() => setLive(null));
  }, [liveYear]);

  const row = (label, val, bold) => (
    <div className="flex justify-between py-2 border-b border-slate-50 text-sm"><span className={bold ? 'font-bold' : 'text-slate-600'}>{label}</span><b>{inr(val)}</b></div>
  );

  if (live) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FilterBar title={`Profit and Loss Report${liveYear ? ` ${liveYear}` : ''}`} live yearOptions={LIVE_YEARS} year={liveYear} setYear={setLiveYear} />
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 mb-2">Income</h2>
          {(live.income || []).map((a) => row(a.account || a.name, a.amount, false))}
          <div className="flex justify-between py-2 text-sm"><span className="font-bold">Total Income</span><b>{inr(live.totalIncome)}</b></div>
          <h2 className="font-bold text-slate-900 mt-4 mb-2">Expenses</h2>
          {(live.expenses || []).map((a) => row(a.account || a.name, a.amount, false))}
          <div className="flex justify-between py-2 text-sm"><span className="font-bold">Total Expenses</span><b>{inr(live.totalExpenses)}</b></div>
          <div className="flex justify-between py-3 mt-2 border-t-2 border-slate-900 text-base"><span className="font-bold">Net Profit (Income - Expenses)</span><b className={Number(live.netProfit) >= 0 ? 'text-emerald-700' : 'text-red-600'}>{inr(live.netProfit)}</b></div>
        </div>
      </div>
    );
  }

  if (live === undefined) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-sm text-slate-500">Loading P&amp;L...</div>;
  }

  const m = nets(filtered);
  const sales = (m['4001']?.credit || 0) - (m['4001']?.debit || 0);
  const purchase = (m['5001']?.debit || 0) - (m['5001']?.credit || 0);
  const expenses = purchase;
  const net = sales - expenses;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FilterBar title={`Profit and Loss Report ${year}`} live={false} years={years} year={year} setYear={setYear} />
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-bold text-slate-900 mb-2">Income</h2>
        {row('Income from Sales', sales)}
        <div className="flex justify-between py-2 text-sm"><span className="font-bold">Total Income</span><b>{inr(sales)}</b></div>
        <h2 className="font-bold text-slate-900 mt-4 mb-2">Expenses</h2>
        {row('Purchase Expense', purchase)}
        {row('Other Expense', 0)}
        <div className="flex justify-between py-2 text-sm"><span className="font-bold">Total Expenses</span><b>{inr(expenses)}</b></div>
        <div className="flex justify-between py-3 mt-2 border-t-2 border-slate-900 text-base"><span className="font-bold">Net Income (Income - Expenses)</span><b className={net >= 0 ? 'text-emerald-700' : 'text-red-600'}>{inr(net)}</b></div>
      </div>
    </div>
  );
};

// ---------- Budget Report (live-first) ----------
export const BudgetReport = () => {
  const { budgets: mockBudgets } = useAccounting();
  const [live, setLive] = useState(undefined);

  useEffect(() => {
    reportsAPI.budget()
      .then((res) => setLive(Array.isArray(res.data) ? res.data : res.data?.budgets || []))
      .catch(() => setLive(null));
  }, []);

  if (Array.isArray(live)) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Budget Report - Planned vs Actual</h1>
          </div>
          <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 flex items-center gap-1.5"><Printer className="w-4 h-4" /> Print / PDF</button>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase text-slate-500 border-b border-slate-100">
              <th className="px-4 py-3">Budget</th><th className="px-4 py-3">Analytic</th><th className="px-4 py-3 text-right">Planned</th>
              <th className="px-4 py-3 text-right">Committed</th><th className="px-4 py-3 text-right">Achieved</th>
              <th className="px-4 py-3 text-right">Achieved %</th><th className="px-4 py-3 text-right">To Achieve</th><th className="px-4 py-3">Status</th>
            </tr></thead>
            <tbody>
              {live.map((b, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-bold">{b.budgetName}</td>
                  <td className="px-4 py-3 text-slate-600">{b.analyticAccount}</td>
                  <td className="px-4 py-3 text-right">{inr(b.planned)}</td>
                  <td className="px-4 py-3 text-right">{inr(b.committed)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{inr(b.achieved)}</td>
                  <td className="px-4 py-3 text-right">{Number(b.achievedPercent || 0).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right">{inr(b.amountToAchieve)}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">{b.status}</span></td>
                </tr>
              ))}
              {live.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No budgets yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (live === undefined) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-sm text-slate-500">Loading budget report...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Budget Report - Planned vs Actual</h1>
        </div>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 flex items-center gap-1.5"><Printer className="w-4 h-4" /> Print / PDF</button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase text-slate-500 border-b border-slate-100">
            <th className="px-4 py-3">Budget</th><th className="px-4 py-3">Analytic</th><th className="px-4 py-3 text-right">Planned</th>
            <th className="px-4 py-3 text-right">Committed</th><th className="px-4 py-3 text-right">Achieved</th>
            <th className="px-4 py-3 text-right">Achieved %</th><th className="px-4 py-3 text-right">To Achieve</th><th className="px-4 py-3">Status</th>
          </tr></thead>
          <tbody>
            {mockBudgets.map((b) => {
              const c = Number(b.committedAmount || 0), a = Number(b.achievedAmount || 0);
              return (
                <tr key={b.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-bold">{b.name}</td>
                  <td className="px-4 py-3 text-slate-600">{b.analyticAccount}</td>
                  <td className="px-4 py-3 text-right">{inr(b.plannedAmount)}</td>
                  <td className="px-4 py-3 text-right">{inr(c)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{inr(a)}</td>
                  <td className="px-4 py-3 text-right">{c ? `${((a / c) * 100).toFixed(1)}%` : '-'}</td>
                  <td className="px-4 py-3 text-right">{inr(c - a)}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">{b.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const BackBtn = () => (
  <button onClick={() => window.history.back()} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
);
