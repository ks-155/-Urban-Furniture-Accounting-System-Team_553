import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { X, ShieldCheck, AlertCircle } from 'lucide-react';

export const CreateUserModal = ({ isOpen, onClose }) => {
  const { signup, authLoading } = useAccounting();

  const [formData, setFormData] = useState({
    name: '',
    loginId: '',
    email: '',
    role: 'ACCOUNTANT',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const res = await signup(formData);
    if (!res.success) {
      setError(res.error);
    } else {
      setSuccessMsg(`User "${formData.name}" created successfully as ${formData.role}!`);
      setTimeout(() => {
        onClose();
        setSuccessMsg('');
        setFormData({
          name: '',
          loginId: '',
          email: '',
          role: 'ACCOUNTANT',
          password: '',
          confirmPassword: ''
        });
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Create User</h3>
              <p className="text-xs text-slate-500">Add administrative, accounting, or portal user</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="flex items-start space-x-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center space-x-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Name
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Login ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Login ID
              </label>
              <input
                type="text"
                name="loginId"
                required
                value={formData.loginId}
                onChange={handleChange}
                placeholder="6-12 characters"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all"
              />
              <span className="text-[10px] text-slate-600 mt-1 block">Unique (6–12 characters)</span>
            </div>

            {/* Email ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                E-mail ID
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="name@company.com"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all"
              />
              <span className="text-[10px] text-slate-600 mt-1 block">Must be unique</span>
            </div>
          </div>

          {/* Role Selection (from Excalidraw wireframe) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className={`flex flex-col items-center p-3 rounded-xl border cursor-pointer transition-all ${
                formData.role === 'ADMIN'
                  ? 'border-purple-600 bg-purple-50/60 text-purple-900 font-bold'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="role"
                  value="ADMIN"
                  checked={formData.role === 'ADMIN'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="text-xs">Administrator</span>
                <span className="text-[10px] text-slate-600 font-normal">Full Access</span>
              </label>

              <label className={`flex flex-col items-center p-3 rounded-xl border cursor-pointer transition-all ${
                formData.role === 'ACCOUNTANT'
                  ? 'border-blue-600 bg-blue-50/60 text-blue-900 font-bold'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="role"
                  value="ACCOUNTANT"
                  checked={formData.role === 'ACCOUNTANT'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="text-xs">Accountant</span>
                <span className="text-[10px] text-slate-600 font-normal">Ops & Reports</span>
              </label>

              <label className={`flex flex-col items-center p-3 rounded-xl border cursor-pointer transition-all ${
                formData.role === 'USER'
                  ? 'border-emerald-600 bg-emerald-50/60 text-emerald-900 font-bold'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="role"
                  value="USER"
                  checked={formData.role === 'USER'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="text-xs">Portal User</span>
                <span className="text-[10px] text-slate-600 font-normal">Invoices & Pay</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all"
              />
            </div>

            {/* Re-Enter Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Re-Enter Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 space-y-0.5">
            <span className="font-semibold block text-slate-700">Credential Rules (Excalidraw):</span>
            <p>1. Login ID unique & 6–12 characters.</p>
            <p>2. Email unique in database.</p>
            <p>3. Password &gt; 8 chars with uppercase, lowercase, and special character.</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={authLoading}
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all"
            >
              {authLoading ? 'Creating…' : 'Create'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
