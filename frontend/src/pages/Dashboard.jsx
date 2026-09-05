import React from 'react';
import { Link } from 'react-router-dom';
import { useAccounting } from '../context/AccountingContext';
import { CustomerPortal } from './CustomerPortal';
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

  // Excalidraw role rule: USER (customer portal) must NEVER see company books
  if (currentUser?.role === 'USER') {
    return <CustomerPortal />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">App Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Welcome, {currentUser?.name} <span className="uppercase text-[11px] font-bold text-slate-400">({currentUser?.role})</span>
          {' '}• Net: ₹{(revenue - expense).toLocaleString('en-IN')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 font-bold text-slate-900 mb-2"><ShoppingBag className="w-5 h-5 text-blue-600" /> Sales</div>
          <Stat label="All" value={salesAll} />
          <Stat label="Confirmed" value={salesConfirmed} />
          <Stat label="Draft" value={salesDraft} />
          <div className="border-t border-slate-100 mt-2 pt-2 text-xs text-slate-500">Revenue (paid): <b className="text-slate-800">₹{revenue.toLocaleString('en-IN')}</b></div>
          <Link to="/sales-orders" className="mt-3 w-full px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" /> New</Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 font-bold text-slate-900 mb-2"><ShoppingCart className="w-5 h-5 text-emerald-600" /> Purchase</div>
          <Stat label="All" value={purchAll} />
          <Stat label="Confirmed" value={purchConfirmed} />
          <Stat label="Draft" value={purchDraft} />
          <div className="border-t border-slate-100 mt-2 pt-2 text-xs text-slate-500">Expense (paid): <b className="text-slate-800">₹{expense.toLocaleString('en-IN')}</b></div>
          <Link to="/purchase-orders" className="mt-3 w-full px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" /> New</Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 font-bold text-slate-900 mb-2"><PiggyBank className="w-5 h-5 text-amber-600" /> Budget Reports</div>
          <Stat label="Achieved" value={achieved} />
          <Stat label="Budget" value={budgets.length} />
          <Stat label="Committed" value={committed} />
          <div className="border-t border-slate-100 mt-2 pt-2 text-xs text-slate-500">Planned vs actuals overview.</div>
          <Link to="/reports/budget-report" className="mt-3 w-full px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 flex items-center justify-center gap-1.5"><FileBarChart className="w-4 h-4" /> Report</Link>
        </div>
      </div>

      <div className="mt-5 bg-blue-50/60 border border-blue-100 rounded-2xl p-4 text-xs text-slate-600">
        First demo target: <b>Purchase Order → Vendor Bill → Bank Payment → Journal Entry</b>. Master Data (Contacts/Products) and transaction screens land in Phase 2–4; this dashboard already reflects mock + live session state.
      </div>
    </div>
  );
};
