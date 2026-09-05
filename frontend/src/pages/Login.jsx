import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAccounting } from '../context/AccountingContext';
import { Armchair, Lock, User, AlertCircle, ArrowRight, Shield } from 'lucide-react';

export const Login = () => {
  const { login, authLoading } = useAccounting();
  const navigate = useNavigate();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [offlineNote, setOfflineNote] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setOfflineNote('');

    const res = await login(loginId, password);
    if (!res.success) {
      setError(res.error);
    } else {
      if (res.offline) setOfflineNote('Backend unreachable — signed in with offline demo data.');
      navigate('/');
    }
  };

  const handleQuickLogin = async (demoId, demoPass) => {
    setLoginId(demoId);
    setPassword(demoPass);
    setError('');
    const res = await login(demoId, demoPass);
    if (res.success) {
      navigate('/');
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        
        {/* App LoGo (as labeled in Excalidraw wireframe) */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white shadow-xl shadow-blue-500/20 mb-4">
          <Armchair className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Urban Furniture
        </h2>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mt-1">
          Accounting Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-100 sm:px-10">
          
          <div className="mb-6 text-center border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-800">Login Page</h3>
            <p className="text-xs text-slate-500 mt-0.5">Enter your credentials to access the system</p>
          </div>

          {error && (
            <div className="mb-5 flex items-start space-x-2 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {offlineNote && (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
              {offlineNote}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Login Id - */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Login Id -
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="e.g. accountant01 or admin01"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all bg-slate-50/50"
                />
              </div>
            </div>

            {/* Password - */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password -
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all bg-slate-50/50"
                />
              </div>
            </div>

            {/* SIGN IN Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 px-4 rounded-xl text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 font-bold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center space-x-2"
              >
                <span>{authLoading ? 'SIGNING IN…' : 'SIGN IN'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </form>

          {/* Forgot Password | Sign Up Links (from wireframe) */}
          <div className="mt-6 text-center border-t border-slate-100 pt-4 flex items-center justify-center space-x-3 text-xs font-semibold text-slate-600">
            <button
              onClick={() => alert('Password recovery: Please contact the system administrator or use the demo login.')}
              className="hover:text-blue-600 transition-colors"
            >
              Forgot Password
            </button>
            <span className="text-slate-300">|</span>
            <Link to="/signup" className="text-blue-600 hover:text-blue-700 transition-colors">
              Sign Up
            </Link>
          </div>

          {/* Quick Demo Credentials for Judges */}
          <div className="mt-6 pt-4 border-t border-dashed border-slate-200">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2.5">
              ⚡ 1-Click Demo Logins
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'Admin@123')}
                className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-center transition-all"
              >
                <span className="block text-[11px] font-bold">Admin</span>
                <span className="text-[9px] opacity-75">All access</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('accountant01', 'Password@123')}
                className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-center transition-all"
              >
                <span className="block text-[11px] font-bold">Accountant</span>
                <span className="text-[9px] opacity-75">Ops & Books</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('nimeshp', 'Password@123')}
                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-center transition-all"
              >
                <span className="block text-[11px] font-bold">Customer</span>
                <span className="text-[9px] opacity-75">Nimesh Pathak</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('azure01', 'Password@123')}
                className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-center transition-all"
              >
                <span className="block text-[11px] font-bold">Vendor</span>
                <span className="text-[9px] opacity-75">Azure Furniture</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
