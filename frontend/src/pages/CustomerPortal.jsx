import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { PaymentModal } from '../components/PaymentModal';
import { FileText, Wallet, Clock, CreditCard, ShoppingCart, CheckCircle2 } from 'lucide-react';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const CustomerPortal = () => {
  const {
    currentUser,
    customerInvoices,
    vendorBills,
    purchaseOrders,
    contacts,
    confirmCustomerInvoice,
    registerInvoicePayment,
    vendorSubmitBill,
  } = useAccounting();

  const [payFor, setPayFor] = useState(null);
  const [billPo, setBillPo] = useState(null);
  const [vendorInvoiceRef, setVendorInvoiceRef] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [submittingBill, setSubmittingBill] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Customer Invoices belonging to this contact
  const myInvoices = customerInvoices.filter(
    (i) => (currentUser?.contactId && i.customerId === currentUser.contactId) || i.customerName === currentUser?.name
  );

  // Vendor Bills belonging to this contact (e.g. Azure Furniture)
  const myBills = vendorBills.filter(
    (b) => (currentUser?.contactId && b.vendorId === currentUser.contactId) ||
           (b.vendorName && currentUser?.name && b.vendorName.toLowerCase().includes(currentUser.name.toLowerCase().replace('(vendor)', '').trim()))
  );

  // Purchase Orders belonging to this vendor
  const myPOs = purchaseOrders.filter(
    (p) => (currentUser?.contactId && p.vendorId === currentUser.contactId) ||
           (p.vendorName && currentUser?.name && p.vendorName.toLowerCase().includes(currentUser.name.toLowerCase().replace('(vendor)', '').trim()))
  );

  const myContact = contacts.find((c) => c.id === currentUser?.contactId);
  const isVendor =
    (myContact && (myContact.type === 'VENDOR' || myContact.type === 'BOTH')) ||
    myBills.length > 0 ||
    myPOs.length > 0 ||
    currentUser?.name?.toLowerCase().includes('azure') ||
    currentUser?.name?.toLowerCase().includes('vendor');

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

  const handleOpenSendBill = (po) => {
    setBillPo(po);
    setVendorInvoiceRef(`AZ-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`);
    setBillDate(new Date().toISOString().split('T')[0]);
    setSubmitError('');
    setSubmitSuccess('');
  };

  const handleVendorSubmitBill = async (e) => {
    e.preventDefault();
    if (!billPo) return;
    if (!vendorInvoiceRef.trim()) {
      setSubmitError('Please enter your Vendor Invoice / Bill Reference.');
      return;
    }

    setSubmittingBill(true);
    setSubmitError('');
    try {
      const res = await vendorSubmitBill(billPo.id, {
        vendorInvoiceRef: vendorInvoiceRef.trim(),
        billDate,
      });
      if (res.success) {
        setSubmitSuccess(`Bill ${res.bill?.billNumber || ''} submitted successfully! Awaiting Urban Furniture accountant approval.`);
        setTimeout(() => {
          setBillPo(null);
          setSubmitSuccess('');
        }, 1500);
      } else {
        setSubmitError(res.error || 'Failed to submit bill.');
      }
    } catch (err) {
      setSubmitError(err?.message || 'Failed to submit bill.');
    } finally {
      setSubmittingBill(false);
    }
  };

  // 1. VENDOR PORTAL VIEW (e.g. Azure Furniture)
  if (isVendor) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
            Vendor Portal
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome, {currentUser?.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review Purchase Orders received from Urban Furniture, submit your vendor bills, and monitor payment settlements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {card(<ShoppingCart className="w-5 h-5 text-emerald-600" />, 'Total Bills Issued', inr(totalBilled), 'text-slate-900')}
          {card(<CheckCircle2 className="w-5 h-5 text-emerald-600" />, 'Settled / Paid by Urban Furniture', inr(totalReceived), 'text-emerald-700')}
          {card(<Clock className="w-5 h-5 text-amber-600" />, 'Pending Receivables', inr(pendingReceivables), pendingReceivables > 0 ? 'text-amber-600' : 'text-slate-400')}
        </div>

        {/* Section A: Purchase Orders Received from Urban Furniture */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 font-bold text-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <span>Purchase Orders from Urban Furniture</span>
            </div>
            <span className="text-xs font-medium text-slate-400">Showing {myPOs.length} orders</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3">PO Number</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Items Ordered</th>
                <th className="px-5 py-3 text-right">Total Amount</th>
                <th className="px-5 py-3">PO Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {myPOs.map((po) => {
                const canSendBill = po.status === 'CONFIRMED';
                const isBilled = po.status === 'BILLED';
                return (
                  <tr key={po.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{po.poNumber}</td>
                    <td className="px-5 py-3.5 text-slate-600">{po.date}</td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {po.lines && po.lines.length > 0 ? (
                        <span>{po.lines.map((l) => `${l.productName || 'Product'} (×${l.quantity})`).join(', ')}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">{inr(po.totalAmount)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        po.status === 'CONFIRMED'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : isBilled
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {canSendBill && (
                        <button
                          onClick={() => handleOpenSendBill(po)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 inline-flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" /> Send Bill
                        </button>
                      )}
                      {isBilled && (
                        <span className="text-xs font-medium text-emerald-600 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Bill Submitted
                        </span>
                      )}
                      {!canSendBill && !isBilled && (
                        <span className="text-xs text-slate-400">Awaiting PO Confirmation</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {myPOs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    No purchase orders found for your account.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section B: My Vendor Bills & Settlement Status */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 font-bold text-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>My Vendor Bills & Settlement Status</span>
            </div>
            <span className="text-xs font-medium text-slate-400">Showing {myBills.length} bills</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3">Bill Number</th>
                <th className="px-5 py-3">Vendor Invoice Ref</th>
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
                const isSubmitted = b.status === 'SUBMITTED';
                const isConfirmed = b.status === 'CONFIRMED';
                return (
                  <tr key={b.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{b.billNumber}</td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">{b.reference || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600">{b.billDate}</td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{b.purchaseOrder?.poNumber || 'Direct Bill'}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">{inr(b.totalAmount)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-emerald-700">{inr(b.paidAmount || (isPaid ? b.totalAmount : 0))}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isSubmitted
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : isConfirmed
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-slate-50 text-slate-700 border border-slate-200'
                      }`}>
                        {isPaid ? 'PAID / SETTLED' : isSubmitted ? 'SUBMITTED (Awaiting Approval)' : isConfirmed ? 'APPROVED (Payment Pending)' : b.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {myBills.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">No vendor bills found for your account.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal: Vendor Send Bill against PO */}
        {billPo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Send Bill to Urban Furniture</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Against PO: <span className="font-bold text-slate-800">{billPo.poNumber}</span></p>
                </div>
                <button onClick={() => setBillPo(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                  <span className="text-lg font-bold">×</span>
                </button>
              </div>

              <form onSubmit={handleVendorSubmitBill} className="mt-4 space-y-4">
                <div className="bg-slate-50 rounded-xl p-3.5 text-xs text-slate-600 space-y-1.5">
                  <div className="flex justify-between">
                    <span>Order Total:</span>
                    <span className="font-bold text-slate-900">{inr(billPo.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Order Date:</span>
                    <span>{billPo.date}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Your Invoice Reference / Bill # <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={vendorInvoiceRef}
                    onChange={(e) => setVendorInvoiceRef(e.target.value)}
                    placeholder="e.g. AZ-2026-001"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Enter the invoice reference from your own billing system.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Bill Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {submitError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    {submitError}
                  </div>
                )}

                {submitSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                    {submitSuccess}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBillPo(null)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingBill}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm transition-all"
                  >
                    {submittingBill ? 'Submitting…' : 'Submit Bill'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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
        onConfirm={async (method) => {
          if (payFor.status === 'DRAFT') await confirmCustomerInvoice(payFor.id);
          await registerInvoicePayment(payFor.id, method);
          setPayFor(null);
        }}
      />
    </div>
  );
};
