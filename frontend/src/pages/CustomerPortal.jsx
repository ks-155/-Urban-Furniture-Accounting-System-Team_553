import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { PaymentModal } from '../components/PaymentModal';
import { FileText, Wallet, Clock, CreditCard, ShoppingCart, CheckCircle2 } from 'lucide-react';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const CustomerPortal = () => {
  const { currentUser, customerInvoices, vendorBills, confirmCustomerInvoice, registerInvoicePayment } = useAccounting();
  const [payFor, setPayFor] = useState(null);

  // Customer Invoices belonging to this contact
  const myInvoices = customerInvoices.filter(
    (i) => (currentUser?.contactId && i.customerId === currentUser.contactId) || i.customerName === currentUser?.name
  );

  // Vendor Bills belonging to this contact (e.g. Azure Furniture)
  const myBills = vendorBills.filter(
    (b) => (currentUser?.contactId && b.vendorId === currentUser.contactId) ||
           (b.vendorName && currentUser?.name && b.vendorName.toLowerCase().includes(currentUser.name.toLowerCase().replace('(vendor)', '').trim()))
  );

  const isVendor = myBills.length > 0 && myInvoices.length === 0;

  // Invoice calculations
  const totalPaidInvoices = myInvoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const pendingInvoices = myInvoices.filter((i) => i.status !== 'PAID').reduce((s, i) => s + (Number(i.totalAmount || 0) - Number(i.paidAmount || 0)), 0);

  // Vendor Bill calculations
  const totalBilled = myBills.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
  const totalReceived = myBills.filter((b) => b.status === 'PAID').reduce((s, b) => s + Number(b.totalAmount || 0), 0);
  const pendingReceivables = totalBilled - totalReceived;

  const card = (icon, label, value, accent) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">{icon}{label}</div>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );

  // 1. VENDOR PORTAL VIEW (e.g. Azure Furniture)
  if (isVendor) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
            Vendor Portal
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome, {currentUser?.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            View your purchase bills issued to Urban Furniture, payment settlement status, and receivables.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {card(<ShoppingCart className="w-5 h-5 text-emerald-600" />, 'Total Bills Issued', inr(totalBilled), 'text-slate-900')}
          {card(<CheckCircle2 className="w-5 h-5 text-emerald-600" />, 'Settled / Paid by Urban Furniture', inr(totalReceived), 'text-emerald-700')}
          {card(<Clock className="w-5 h-5 text-amber-600" />, 'Pending Receivables', inr(pendingReceivables), pendingReceivables > 0 ? 'text-amber-600' : 'text-slate-400')}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 font-bold text-slate-900 flex items-center justify-between">
            <span>My Vendor Bills & Orders</span>
            <span className="text-xs font-medium text-slate-400">Showing {myBills.length} bills</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3">Bill Number</th>
                <th className="px-5 py-3">Bill Date</th>
                <th className="px-5 py-3">Order Ref</th>
                <th className="px-5 py-3 text-right">Total Amount</th>
                <th className="px-5 py-3 text-right">Paid Amount</th>
                <th className="px-5 py-3">Settlement Status</th>
              </tr>
            </thead>
            <tbody>
              {myBills.map((b) => {
                const isPaid = b.status === 'PAID';
                return (
                  <tr key={b.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{b.billNumber}</td>
                    <td className="px-5 py-3.5 text-slate-600">{b.billDate}</td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{b.purchaseOrder?.poNumber || 'Direct Bill'}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">{inr(b.totalAmount)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-emerald-700">{inr(b.paidAmount || (isPaid ? b.totalAmount : 0))}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {isPaid ? 'PAID / SETTLED' : 'PAYMENT PENDING'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {myBills.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">No vendor bills found for your account.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 2. CUSTOMER PORTAL VIEW (e.g. Nimesh Pathak)
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
          Customer Portal
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome, {currentUser?.name}</h1>
        <p className="text-sm text-slate-500 mt-1">Your invoices, payment status & online dues payment.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {card(<FileText className="w-5 h-5 text-blue-600" />, 'Total Invoices', myInvoices.length, 'text-slate-900')}
        {card(<Wallet className="w-5 h-5 text-emerald-600" />, 'Total Paid', inr(totalPaidInvoices), 'text-emerald-700')}
        {card(<Clock className="w-5 h-5 text-amber-600" />, 'Pending Dues', inr(pendingInvoices), pendingInvoices > 0 ? 'text-red-600' : 'text-slate-400')}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 font-bold text-slate-900 flex items-center justify-between">
          <span>My Invoices & Bills</span>
          <span className="text-xs font-medium text-slate-400">Showing {myInvoices.length} invoices</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100 bg-slate-50/50">
              <th className="px-5 py-3">Invoice</th>
              <th className="px-5 py-3 hidden sm:table-cell">Date</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {myInvoices.map((i) => {
              const paid = i.status === 'PAID';
              return (
                <tr key={i.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-slate-900">{i.invNumber}</td>
                  <td className="px-5 py-3.5 text-slate-600 hidden sm:table-cell">{i.invoiceDate}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-slate-900">{inr(i.totalAmount)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      paid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {paid ? 'PAID' : 'UNPAID'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {!paid ? (
                      <button
                        onClick={() => setPayFor(i)}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 inline-flex items-center gap-1 shadow-sm transition-all"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Pay Dues (Online)
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-emerald-600 flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {myInvoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500">No invoices found for your account.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaymentModal
        open={!!payFor}
        title={`Pay Dues — ${payFor?.invNumber}`}
        dueAmount={payFor ? Number(payFor.totalAmount || 0) - Number(payFor.paidAmount || 0) : 0}
        onClose={() => setPayFor(null)}
        onConfirm={(method) => {
          if (payFor.status === 'DRAFT') confirmCustomerInvoice(payFor.id);
          registerInvoicePayment(payFor.id, method);
          setPayFor(null);
        }}
      />
    </div>
  );
};
