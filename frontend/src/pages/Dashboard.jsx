import React from 'react';
import { Link } from 'react-router-dom';
import { useAccounting } from '../context/AccountingContext';
import { ShoppingBag, ShoppingCart, PiggyBank, Plus, FileBarChart } from 'lucide-react';

const Stat = ({ label, value }) => (
  <div className="flex items-center justify-between py-1.5 text-sm">
    <span className="text-slate-500 font-medium">{label}</span>
    <span className="font-bold text-slate-900">{value}</span>
  </div>
);

export const Dashboard = () => {
  const { salesOrders, purchaseOrders, budgets, customerInvoices, vendorBills, currentUser } = useAccounting();

  const salesAll = salesOrders.length;
  const salesConfirmed = salesOrders.filter((s) => s.status === 'CONFIRMED' || s.status === 'INVOICED').length;
  const salesDraft = salesOrders.filter((s) => s.status === 'DRAFT').length;

  const purchAll = purchaseOrders.length;
  const purchConfirmed = purchaseOrders.filter((p) => p.status === 'CONFIRMED' || p.status === 'BILLED').length;
  const purchDraft = purchaseOrders.filter((p) => p.status === 'DRAFT').length;

  const achieved = budgets.filter((b) => (b.achievedAmount || 0) > 0).length;
  const committed = budgets.filter((b) => (b.committedAmount || 0) > 0).length;

  const revenue = customerInvoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const expense = vendorBills.filter((b) => b.status === 'PAID').reduce((s, b) => s + Number(b.totalAmount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">App Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome, {currentUser?.name} <span className="uppercase text-[11px] font-bold text-slate-400">({currentUser?.role})</span>
            {' '}• Net: ₹{(revenue - expense).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/sales-orders" className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-1.5"><Plus className="w-4 h-4" /> New Sale</Link>
          <Link to="/purchase-orders" className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><Plus className="w-4 h-4" /> New Purchase</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 font-bold text-slate-900"><ShoppingBag className="w-5 h-5 text-blue-600" /> Sales</div>
            <Link to="/sales-orders" className="text-xs font-bold text-blue-600 hover:text-blue-700">New →</Link>
          </div>
          <Stat label="All" value={salesAll} />
          <Stat label="Confirmed" value={salesConfirmed} />
          <Stat label="Draft" value={salesDraft} />
          <div className="border-t border-slate-100 mt-2 pt-2 text-xs text-slate-500">Revenue (paid): <b className="text-slate-800">₹{revenue.toLocaleString('en-IN')}</b></div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 font-bold text-slate-900"><ShoppingCart className="w-5 h-5 text-emerald-600" /> Purchase</div>
            <Link to="/purchase-orders" className="text-xs font-bold text-blue-600 hover:text-blue-700">New →</Link>
          </div>
          <Stat label="All" value={purchAll} />
          <Stat label="Confirmed" value={purchConfirmed} />
          <Stat label="Draft" value={purchDraft} />
          <div className="border-t border-slate-100 mt-2 pt-2 text-xs text-slate-500">Expense (paid): <b className="text-slate-800">₹{expense.toLocaleString('en-IN')}</b></div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 font-bold text-slate-900"><PiggyBank className="w-5 h-5 text-amber-600" /> Budget Reports</div>
            <Link to="/reports/budget-report" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"><FileBarChart className="w-3.5 h-3.5" /> Report →</Link>
          </div>
          <Stat label="Achieved" value={achieved} />
          <Stat label="Budget" value={budgets.length} />
          <Stat label="Committed" value={committed} />
          <div className="border-t border-slate-100 mt-2 pt-2 text-xs text-slate-500">Open <b className="text-slate-800">Budget Report</b> for planned vs actuals.</div>
        </div>
      </div>

      <div className="mt-5 bg-blue-50/60 border border-blue-100 rounded-2xl p-4 text-xs text-slate-600">
        First demo target: <b>Purchase Order → Vendor Bill → Bank Payment → Journal Entry</b>. Master Data (Contacts/Products) and transaction screens land in Phase 2–4; this dashboard already reflects mock + live session state.
      </div>
    </div>
  );
};
