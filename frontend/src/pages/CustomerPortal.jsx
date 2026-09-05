import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { PaymentModal } from '../components/PaymentModal';
import { FileText, Wallet, Clock, CreditCard } from 'lucide-react';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Dedicated portal for Role USER (customer). Never shows company books —
// only the logged-in contact's own invoices with PAID / UNPAID status.
export const CustomerPortal = () => {
  const { currentUser, customerInvoices, confirmCustomerInvoice, registerInvoicePayment } = useAccounting();
  const [payFor, setPayFor] = useState(null);

  const mine = customerInvoices.filter(
    (i) => (currentUser?.contactId && i.customerId === currentUser.contactId) || i.customerName === currentUser?.name
  );
  const totalPaid = mine.filter((i) => i.status === 'PAID').reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const pending = mine.filter((i) => i.status !== 'PAID').reduce((s, i) => s + (Number(i.totalAmount || 0) - Number(i.paidAmount || 0)), 0);

  const card = (icon, label, value, accent) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">{icon}{label}</div>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Portal — Welcome, {currentUser?.name}</h1>
        <p className="text-sm text-slate-500 mt-1">Your invoices, payment status & online dues payment.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        {card(<FileText className="w-5 h-5 text-blue-600" />, 'Total Invoices', mine.length, 'text-slate-900')}
        {card(<Wallet className="w-5 h-5 text-emerald-600" />, 'Total Paid', inr(totalPaid), 'text-emerald-700')}
        {card(<Clock className="w-5 h-5 text-amber-600" />, 'Pending Dues', inr(pending), 'text-red-600')}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-bold text-slate-900">My Invoices & Bills</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3 hidden sm:table-cell">Date</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((i) => {
              const paid = i.status === 'PAID';
              return (
                <tr key={i.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-bold text-slate-900">{i.invNumber}</td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{i.invoiceDate}</td>
                  <td className="px-4 py-3 text-right font-semibold">{inr(i.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {paid ? 'PAID' : 'UNPAID'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!paid ? (
                      <button onClick={() => setPayFor(i)} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 inline-flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5" /> Pay Dues (Pay Online)
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {mine.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No invoices found for your account.</td></tr>}
          </tbody>
        </table>
      </div>

      <PaymentModal
        open={!!payFor}
        title={`Pay Dues — ${payFor?.invNumber}`}
        dueAmount={payFor ? Number(payFor.totalAmount || 0) - Number(payFor.paidAmount || 0) : 0}
        onClose={() => setPayFor(null)}
        onConfirm={(method) => {
          // Portal convenience: confirm-then-pay so a DRAFT invoice can be paid in one click
          if (payFor.status === 'DRAFT') confirmCustomerInvoice(payFor.id);
          registerInvoicePayment(payFor.id, method);
          setPayFor(null);
        }}
      />
    </div>
  );
};
