import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAccounting } from '../context/AccountingContext';
import {
  Armchair,
  ShoppingBag,
  ShoppingCart,
  BookOpen,
  BarChart3,
  ChevronDown,
  User,
  LogOut,
  UserPlus,
  ShieldAlert,
  Sliders
} from 'lucide-react';

export const Navbar = ({ onOpenCreateUser }) => {
  const { currentUser, logout, setCurrentUser, users } = useAccounting();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeDropdown, setActiveDropdown] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const navRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setActiveDropdown(null);
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (menu) => {
    setActiveDropdown(prev => prev === menu ? null : menu);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const switchRole = (role) => {
    const targetUser = users.find(u => u.role === role);
    if (targetUser) {
      setCurrentUser(targetUser);
      setProfileOpen(false);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm" ref={navRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand / Logo */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Armchair className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                  Urban Furniture
                </span>
                <span className="text-[11px] font-semibold tracking-wider text-slate-600 uppercase">
                  Accounting System
                </span>
              </div>
            </Link>

            {/* Main Navigation Menus — hidden for USER (customer portal sees no company books) */}
            {currentUser && currentUser.role === 'USER' && (
              <nav className="hidden md:flex items-center space-x-1 pl-4">
                <Link
                  to="/"
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  My Invoices
                </Link>
              </nav>
            )}
            {currentUser && currentUser.role !== 'USER' && (
              <nav className="hidden md:flex items-center space-x-1 pl-4">
                
                {/* 1. SALES */}
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown('sales')}
                    className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeDropdown === 'sales' || location.pathname.startsWith('/sales') || location.pathname.startsWith('/invoices')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                    <span>Sales</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'sales' ? 'rotate-180 text-blue-700' : 'text-slate-600'}`} />
                  </button>

                  {activeDropdown === 'sales' && (
                    <div className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                      <Link
                        to="/sales-orders"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                      >
                        Sales Orders
                      </Link>
                      <Link
                        to="/customer-invoices"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                      >
                        Customer Invoices
                      </Link>
                      <Link
                        to="/payments?type=receipts"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                      >
                        Payment Receipts
                      </Link>
                    </div>
                  )}
                </div>

                {/* 2. PURCHASE */}
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown('purchase')}
                    className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeDropdown === 'purchase' || location.pathname.startsWith('/purchases') || location.pathname.startsWith('/bills')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4 text-emerald-600" />
                    <span>Purchase</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'purchase' ? 'rotate-180 text-blue-700' : 'text-slate-600'}`} />
                  </button>

                  {activeDropdown === 'purchase' && (
                    <div className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                      <Link
                        to="/purchase-orders"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                      >
                        Purchase Orders
                      </Link>
                      <Link
                        to="/vendor-bills"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                      >
                        Vendor Bills
                      </Link>
                      <Link
                        to="/payments?type=payments"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                      >
                        Vendor Payments
                      </Link>
                    </div>
                  )}
                </div>

                {/* 3. ACCOUNT */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggleDropdown('account')}
                    aria-haspopup="menu"
                    aria-expanded={activeDropdown === 'account'}
                    className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeDropdown === 'account'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-violet-600" />
                    <span>Account</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'account' ? 'rotate-180 text-blue-700' : 'text-slate-600'}`} />
                  </button>

                  {activeDropdown === 'account' && (
                    <div className="absolute left-0 top-full mt-2 w-64 max-h-[calc(100vh-5rem)] overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-[60] animate-in fade-in slide-in-from-top-1 duration-150">
                      <Link
                        to="/contacts"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                      >
                        Contacts (Customers & Vendors)
                      </Link>
                      <Link
                        to="/products"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                      >
                        Products & Furniture
                      </Link>
                      <Link
                        to="/chart-of-accounts"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                      >
                        Chart of Accounts
                      </Link>
                      <Link
                        to="/budgets"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                      >
                        Budgets (Draft/Confirmed/Revised)
                      </Link>
                      <Link
                        to="/analytics"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                      >
                        Analyticals (Cost Centers)
                      </Link>
                      <div className="border-t border-slate-100 my-1"></div>
                      <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                        Ledgers & Entries
                      </div>
                      <Link
                        to="/journals"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                      >
                        Journals (Sales/Purchase/Bank/Cash)
                      </Link>
                      <Link
                        to="/journal-entries"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 font-medium text-indigo-600"
                      >
                        Journal Entries (Double-Entry)
                      </Link>
                    </div>
                  )}
                </div>

                {/* 4. REPORT */}
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown('report')}
                    className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeDropdown === 'report' || location.pathname.startsWith('/reports')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 text-amber-600" />
                    <span>Report</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'report' ? 'rotate-180 text-blue-700' : 'text-slate-600'}`} />
                  </button>

                  {activeDropdown === 'report' && (
                    <div className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                      <Link
                        to="/reports/balance-sheet"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                      >
                        Balance Sheet
                      </Link>
                      <Link
                        to="/reports/profit-loss"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                      >
                        Profit & Loss (P&L)
                      </Link>
                      <Link
                        to="/reports/budget-report"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                      >
                        Budget Report
                      </Link>
                    </div>
                  )}
                </div>

              </nav>
            )}
          </div>

          {/* Right Section: User & Quick Actions */}
          <div className="flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-2">
                
                {/* Admin Quick User Creation */}
                {currentUser.role === 'ADMIN' && (
                  <button
                    onClick={onOpenCreateUser}
                    className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors"
                    title="Create User (Admin)"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Create User</span>
                  </button>
                )}

                {/* Profile / Role Switcher Pill */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center space-x-2 pl-2 pr-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100/50 transition-all text-left"
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                      currentUser.role === 'ADMIN' ? 'bg-purple-600' :
                      currentUser.role === 'ACCOUNTANT' ? 'bg-blue-600' : 'bg-emerald-600'
                    }`}>
                      {currentUser.name.charAt(0)}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-semibold text-slate-800 leading-none">
                        {currentUser.name}
                      </span>
                      <span className="text-[10px] font-medium text-slate-600 uppercase mt-0.5">
                        {currentUser.role}
                      </span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-slate-600" />
                  </button>

                  {/* Profile Dropdown & 1-Click Role Switcher (For Demo Judges) */}
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 z-50">
                      <div className="px-4 pb-2 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-900">{currentUser.name}</p>
                        <p className="text-[11px] text-slate-600 truncate">{currentUser.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          Role: {currentUser.role}
                        </span>
                      </div>

                      {/* Demo Quick Role Switcher */}
                      <div className="px-4 py-2">
                        <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                          ⚡ Switch Role (Demo Mode)
                        </p>
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={() => switchRole('ADMIN')}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left ${currentUser.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            <span>Administrator</span>
                            {currentUser.role === 'ADMIN' && <span className="text-[10px]">● Active</span>}
                          </button>
                          <button
                            onClick={() => switchRole('ACCOUNTANT')}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left ${currentUser.role === 'ACCOUNTANT' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            <span>Accountant</span>
                            {currentUser.role === 'ACCOUNTANT' && <span className="text-[10px]">● Active</span>}
                          </button>
                          <button
                            onClick={() => switchRole('USER')}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left ${currentUser.role === 'USER' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            <span>Customer Portal (Nimesh)</span>
                            {currentUser.role === 'USER' && <span className="text-[10px]">● Active</span>}
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-2 px-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
