import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAccounting } from '../context/AccountingContext';
import { Armchair, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';

export const Signup = () => {
  const { signup, authLoading } = useAccounting();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', loginId: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const onChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(''); };

  const clientValidate = () => {
    if (!form.name.trim()) return 'Full name is required.';
    if (!form.loginId || form.loginId.trim().length < 6 || form.loginId.trim().length > 12)
      return 'Login ID must be between 6 and 12 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email address.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/.test(form.password))
      return 'Password must be 8+ characters with lowercase, uppercase, and special character.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setOk('');
    const v = clientValidate();
    if (v) { setError(v); return; }
    const res = await signup(form);
    if (!res.success) setError(res.error);
    else { setOk('Account created! Redirecting to dashboard…'); setTimeout(() => navigate('/'), 800); }
  };

  const input = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all bg-slate-50/50';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white shadow-xl shadow-blue-500/20 mb-4">
          <Armchair className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Urban Furniture</h2>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mt-1">Accounting Management System</p>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-100 sm:px-10">
          <div className="mb-6 text-center border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-800">Sign Up Page</h3>
            <p className="text-xs text-slate-500 mt-0.5">Creates a customer portal user (role: USER)</p>
          </div>
          {error && <div className="mb-5 flex items-start space-x-2 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
          {ok && <div className="mb-5 flex items-start space-x-2 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium"><CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{ok}</span></div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
              <input name="name" required value={form.name} onChange={onChange} placeholder="e.g. Nimesh Pathak" className={input} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Login ID</label>
                <input name="loginId" required value={form.loginId} onChange={onChange} placeholder="6–12 chars" className={input} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email ID</label>
                <input name="email" type="email" required value={form.email} onChange={onChange} placeholder="you@mail.com" className={input} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Enter Password</label>
              <input name="password" type="password" required value={form.password} onChange={onChange} placeholder="••••••••" className={input} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Re-Enter Password</label>
              <input name="confirmPassword" type="password" required value={form.confirmPassword} onChange={onChange} placeholder="••••••••" className={input} />
            </div>
            <button type="submit" disabled={authLoading} className="w-full py-3 px-4 rounded-xl text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2">
              <span>{authLoading ? 'CREATING…' : 'SIGN UP'}</span><ArrowRight className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-6 text-center border-t border-slate-100 pt-4 text-xs font-semibold text-slate-600">
            Already have an account? <Link to="/login" className="text-blue-600 hover:text-blue-700">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
