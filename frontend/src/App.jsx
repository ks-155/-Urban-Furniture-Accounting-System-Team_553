import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AccountingProvider } from './context/AccountingContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
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
        <Route path="/sales-orders" element={<ProtectedRoute><SalesOrders /></ProtectedRoute>} />
        <Route path="/customer-invoices" element={<ProtectedRoute><CustomerInvoices /></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
        <Route path="/vendor-bills" element={<ProtectedRoute><VendorBills /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><ComingSoon title="Payments ledger (Phase 3/4 — pay from Bill/Invoice)" /></ProtectedRoute>} />
        <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
        <Route path="/chart-of-accounts" element={<ProtectedRoute><ChartOfAccounts /></ProtectedRoute>} />
        <Route path="/journals" element={<ProtectedRoute><Journals /></ProtectedRoute>} />
        <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/journal-entries" element={<ProtectedRoute><JournalEntries /></ProtectedRoute>} />
        <Route path="/reports/balance-sheet" element={<ProtectedRoute><BalanceSheet /></ProtectedRoute>} />
        <Route path="/reports/profit-loss" element={<ProtectedRoute><ProfitLoss /></ProtectedRoute>} />
        <Route path="/reports/budget-report" element={<ProtectedRoute><BudgetReport /></ProtectedRoute>} />
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
