import React, { useState, useEffect } from 'react';
import { X, Settings, Printer, Mail } from 'lucide-react';

// Invoice / Bill Payment Modal matching Excalidraw Image 4 wireframe
export const PaymentModal = ({
  open,
  title = 'Invoice Payment',
  defaultPaymentType = 'RECEIVE', // 'RECEIVE' for Customer Invoice, 'SEND' for Vendor Bill
  partnerName = '',
  dueAmount = 0,
  onConfirm,
  onClose,
}) => {
  const [paymentType, setPaymentType] = useState(defaultPaymentType);
  const [paymentVia, setPaymentVia] = useState('BANK');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(dueAmount || '');
  const [note, setNote] = useState('');
  const [gearOpen, setGearOpen] = useState(false);
  const [stage, setStage] = useState('Draft'); // Draft | Confirm | Cancelled
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPaymentType(defaultPaymentType);
      setPaymentVia('BANK');
      setDate(new Date().toISOString().split('T')[0]);
      setAmount(dueAmount || '');
      setNote('');
      setStage('Draft');
      setGearOpen(false);
      setBusy(false);
    }
  }, [open, defaultPaymentType, dueAmount]);

  if (!open) return null;

  const handleConfirm = async (e) => {
    if (e) e.preventDefault();
    setBusy(true);
    setStage('Confirm');
    try {
      await onConfirm({
        paymentType,
        paymentMethod: paymentVia,
        amount: parseFloat(amount) || dueAmount,
        date,
        note,
      });
    } catch {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    setStage('Cancelled');
    setTimeout(() => onClose(), 150);
  };

  const handlePrint = () => {
    window.print();
    setGearOpen(false);
  };

  const handleSend = () => {
    alert(`Payment receipt notification prepared for ${partnerName || 'partner'}.`);
    setGearOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Wireframe Bar: Buttons on left, Status Stages on right */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white text-sm font-semibold shadow-sm transition"
            >
              {busy ? 'Confirming…' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>

            {/* Gear Icon with Dropdown (Options: 1. Print, 2. Send) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setGearOpen(!gearOpen)}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
                title="Options"
              >
                <Settings className="w-4 h-4" />
              </button>
              {gearOpen && (
                <div className="absolute left-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-20 animate-in fade-in duration-100">
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Provide Option
                  </div>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" /> 1. Print
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    className="w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-500" /> 2. Send
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Breadcrumb stages: Draft -> Confirm -> Cancelled */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
            <span
              className={`px-3 py-1 rounded-lg transition ${
                stage === 'Draft' ? 'bg-white text-purple-700 shadow-sm font-bold' : ''
              }`}
            >
              Draft
            </span>
            <span className="text-slate-300 px-1">›</span>
            <span
              className={`px-3 py-1 rounded-lg transition ${
                stage === 'Confirm' ? 'bg-white text-emerald-700 shadow-sm font-bold' : ''
              }`}
            >
              Confirm
            </span>
            <span className="text-slate-300 px-1">›</span>
            <span
              className={`px-3 py-1 rounded-lg transition ${
                stage === 'Cancelled' ? 'bg-white text-red-700 shadow-sm font-bold' : ''
              }`}
            >
              Cancelled
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 ml-auto sm:ml-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title */}
        <div className="px-6 pt-5 pb-1">
          <h2 className="text-xl font-bold text-amber-600 font-sans tracking-tight">{title}</h2>
        </div>

        {/* Form Body matching Excalidraw Wireframe */}
        <form onSubmit={handleConfirm} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Field 1: Payment Type (Send / Receive Radio) */}
            <div>
              <label className="block text-xs font-bold text-pink-700 uppercase tracking-wider mb-2">
                Payment Type
              </label>
              <div className="flex items-center gap-5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    name="paymentType"
                    value="SEND"
                    checked={paymentType === 'SEND'}
                    onChange={() => setPaymentType('SEND')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>Send</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    name="paymentType"
                    value="RECEIVE"
                    checked={paymentType === 'RECEIVE'}
                    onChange={() => setPaymentType('RECEIVE')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-blue-600 font-semibold">Receive</span>
                </label>
              </div>
            </div>

            {/* Field 2: Date (Default Today's Date) */}
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <label className="block text-xs font-bold text-pink-700 uppercase tracking-wider">
                  Date
                </label>
                <span className="text-[11px] text-slate-400">(Default Today's Date)</span>
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                required
              />
            </div>

            {/* Field 3: Partner */}
            <div>
              <label className="block text-xs font-bold text-pink-700 uppercase tracking-wider mb-1">
                Partner
              </label>
              <input
                type="text"
                value={partnerName}
                readOnly
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-semibold"
              />
              <p className="text-[10px] text-slate-400 mt-1">Autofill Partner Name from Invoice/Bill</p>
            </div>

            {/* Field 4: Payment Via */}
            <div>
              <label className="block text-xs font-bold text-pink-700 uppercase tracking-wider mb-1">
                Payment Via
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentVia('BANK')}
                  className={`py-2 px-3 rounded-xl border text-sm font-bold transition-all ${
                    paymentVia === 'BANK'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  Bank
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentVia('CASH')}
                  className={`py-2 px-3 rounded-xl border text-sm font-bold transition-all ${
                    paymentVia === 'CASH'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  Cash
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Default set to Bank, can be selected to Cash</p>
            </div>

            {/* Field 5: Amount */}
            <div>
              <label className="block text-xs font-bold text-pink-700 uppercase tracking-wider mb-1">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Autofill Amount Due from Invoice/Bill</p>
            </div>
          </div>

          {/* Field 6: Note (Alpha Numeric Text) */}
          <div className="border-t border-slate-100 pt-4">
            <label className="block text-xs font-bold text-pink-700 uppercase tracking-wider mb-1">
              Note
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Alpha Numeric (Text)"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
            />
          </div>

          {/* Bottom Confirmation Bar */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-6 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white text-sm font-semibold shadow-sm"
            >
              {busy ? 'Recording…' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

