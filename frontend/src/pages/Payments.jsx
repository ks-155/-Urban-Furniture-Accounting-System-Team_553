import React, { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAccounting } from '../context/AccountingContext';
import { paymentsAPI } from '../services/api';
import { useLiveList } from '../hooks/useLiveList';
import { Search, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const Payments = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get('type') || '';
  const { payments: mockPayments } = useAccounting();

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(
    typeParam === 'receipts' ? 'INBOUND' : typeParam === 'payments' ? 'OUTBOUND' : 'ALL'
  );

  const fetcher = useCallback(() => {
    const params = {};
    if (tab === 'INBOUND') params.type = 'receipts';
    if (tab === 'OUTBOUND') params.type = 'payments';
    if (search) params.search = search;
    return paymentsAPI.list(params);
  }, [tab, search]);

  const { data: rawList, loading, error } = useLiveList(fetcher, 'payments', mockPayments);

  const list = (rawList || []).filter((p) => {
    if (tab === 'INBOUND') return p.paymentType === 'INBOUND';
    if (tab === 'OUTBOUND') return p.paymentType === 'OUTBOUND';
    return true;
  }).filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (p.paymentNumber && p.paymentNumber.toLowerCase().includes(term)) ||
      (p.partner?.name && p.partner.name.toLowerCase().includes(term)) ||
      (p.partnerName && p.partnerName.toLowerCase().includes(term)) ||
      (p.invoice?.invNumber && p.invoice.invNumber.toLowerCase().includes(term)) ||
      (p.bill?.billNumber && p.bill.billNumber.toLowerCase().includes(term))
    );
  });

  const totalInbound = (rawList || [])
    .filter((p) => p.paymentType === 'INBOUND')
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  const totalOutbound = (rawList || [])
    .filter((p) => p.paymentType === 'OUTBOUND')
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    if (newTab === 'INBOUND') setSearchParams({ type: 'receipts' });
    else if (newTab === 'OUTBOUND') setSearchParams({ type: 'payments' });
    else setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {tab === 'INBOUND' ? 'Customer Receipts' : tab === 'OUTBOUND' ? 'Vendor Payments' : 'Payments & Receipts Ledger'}
          </h1>
        </div>

        {/* Tab Buttons */}
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm text-xs font-semibold">
          <button
            onClick={() => handleTabChange('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${tab === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            All Ledger
          </button>
          <button
            onClick={() => handleTabChange('INBOUND')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${tab === 'INBOUND' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" /> Receipts (Customer)
          </button>
          <button
            onClick={() => handleTabChange('OUTBOUND')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${tab === 'OUTBOUND' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> Payments (Vendor)
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Total Entries</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{rawList.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs font-bold uppercase text-emerald-600 flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5" /> Total Receipts Received
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{inr(totalInbound)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs font-bold uppercase text-blue-600 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Total Vendor Payments Paid
          </p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{inr(totalOutbound)}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payment #, customer, vendor, invoice or bill ref…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
          />
        </div>
      </div>

      {/* Ledger Table */}
      {loading && <p className="text-sm text-slate-500">Loading payments ledger…</p>}
      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{error}</div>}

      {!loading && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3">Payment #</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Partner / Contact</th>
                <th className="px-4 py-3 hidden sm:table-cell">Doc Ref</th>
                <th className="px-4 py-3 hidden md:table-cell">Method / Journal</th>
                <th className="px-4 py-3 hidden md:table-cell">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const isInbound = p.paymentType === 'INBOUND';
                const partnerName = p.partner?.name || p.partnerName || '—';
                const ref = isInbound
                  ? (p.invoice?.invNumber || p.invoiceNumber || '—')
                  : (p.bill?.billNumber || p.billNumber || '—');
                const journalName = p.journal?.name || `${p.paymentMethod || 'BANK'} Journal`;
                const dateStr = p.date ? String(p.date).split('T')[0] : '—';

                return (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{p.paymentNumber}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isInbound ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {isInbound ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {isInbound ? 'Receipt' : 'Payment'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{partnerName}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs hidden sm:table-cell">{ref}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs hidden md:table-cell">
                      <span className="font-semibold">{p.paymentMethod || 'BANK'}</span> ({journalName})
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">{dateStr}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{inr(p.amount)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> {p.status || 'POSTED'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    No transactions found in this ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
