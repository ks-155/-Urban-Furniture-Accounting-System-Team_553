import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AccountingProvider } from './context/AccountingContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute, StaffRoute } from './components/ProtectedRoute';
import { CreateUserModal } from './components/CreateUserModal';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Contacts } from './pages/Contacts';
import { Products } from './pages/Products';
import { ChartOfAccounts } from './pages/ChartOfAccounts';
import { Journals } from './pages/Journals';
import { Analytics } from './pages/Analytics';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { VendorBills } from './pages/VendorBills';
import { SalesOrders } from './pages/SalesOrders';
import { CustomerInvoices } from './pages/CustomerInvoices';
import { JournalEntries } from './pages/JournalEntries';
import { Budgets } from './pages/Budgets';
import { Payments } from './pages/Payments';
import { BalanceSheet, ProfitLoss, BudgetReport } from './pages/Reports';

const ComingSoon = ({ title }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
    <h1 className="text-xl font-bold text-slate-900">{title}</h1>
    <p className="text-sm text-slate-500 mt-2">Phase 2–4 screen — mock data lives in AccountingContext until then.</p>
    <Link to="/" className="inline-block mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Back to Dashboard</Link>
  </div>
);

function Shell() {
  const [createUserOpen, setCreateUserOpen] = useState(false);
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar onOpenCreateUser={() => setCreateUserOpen(true)} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/sales-orders" element={<StaffRoute><SalesOrders /></StaffRoute>} />
        <Route path="/sales" element={<StaffRoute><SalesOrders /></StaffRoute>} />
        <Route path="/customer-invoices" element={<StaffRoute><CustomerInvoices /></StaffRoute>} />
        <Route path="/invoices" element={<StaffRoute><CustomerInvoices /></StaffRoute>} />
        <Route path="/purchase-orders" element={<StaffRoute><PurchaseOrders /></StaffRoute>} />
        <Route path="/purchases" element={<StaffRoute><PurchaseOrders /></StaffRoute>} />
        <Route path="/vendor-bills" element={<StaffRoute><VendorBills /></StaffRoute>} />
        <Route path="/bills" element={<StaffRoute><VendorBills /></StaffRoute>} />
        <Route path="/payments" element={<StaffRoute><Payments /></StaffRoute>} />
        <Route path="/receipts" element={<StaffRoute><Payments /></StaffRoute>} />
        <Route path="/contacts" element={<StaffRoute><Contacts /></StaffRoute>} />
        <Route path="/products" element={<StaffRoute><Products /></StaffRoute>} />
        <Route path="/chart-of-accounts" element={<StaffRoute><ChartOfAccounts /></StaffRoute>} />
        <Route path="/journals" element={<StaffRoute><Journals /></StaffRoute>} />
        <Route path="/budgets" element={<StaffRoute><Budgets /></StaffRoute>} />
        <Route path="/analytics" element={<StaffRoute><Analytics /></StaffRoute>} />
        <Route path="/journal-entries" element={<StaffRoute><JournalEntries /></StaffRoute>} />
        <Route path="/reports" element={<StaffRoute><BalanceSheet /></StaffRoute>} />
        <Route path="/reports/balance-sheet" element={<StaffRoute><BalanceSheet /></StaffRoute>} />
        <Route path="/reports/profit-loss" element={<StaffRoute><ProfitLoss /></StaffRoute>} />
        <Route path="/reports/budget-report" element={<StaffRoute><BudgetReport /></StaffRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CreateUserModal isOpen={createUserOpen} onClose={() => setCreateUserOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AccountingProvider>
        <Shell />
      </AccountingProvider>
    </BrowserRouter>
  );
}

export default App;
