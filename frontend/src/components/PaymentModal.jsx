import React, { useState } from 'react';
import { X } from 'lucide-react';

// Register/Receive Payment modal (Excalidraw: select Cash or Bank, Confirm/Cancel)
export const PaymentModal = ({ open, title, dueAmount, onConfirm, onClose }) => {
  const [method, setMethod] = useState('BANK');
  if (!open) return null;
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-900">{title || 'Register Payment'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4 text-sm">
          <div className="flex justify-between"><span className="text-slate-500 font-medium">Amount Due</span><b>₹{Number(dueAmount || 0).toLocaleString('en-IN')}</b></div>
          <div className="flex justify-between"><span className="text-slate-500 font-medium">Date</span><span>{today} (Today)</span></div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Payment Via (default Bank)</label>
            <div className="grid grid-cols-2 gap-2">
              {['BANK', 'CASH'].map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)}
                  className={`py-2.5 rounded-xl border text-sm font-bold transition-all ${method === m ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {m === 'BANK' ? 'Bank' : 'Cash'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button onClick={() => onConfirm(method)} className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Confirm</button>
          </div>
        </div>
      </div>
    </div>
  );
};
