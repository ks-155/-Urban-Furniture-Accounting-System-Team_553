import React, { useCallback, useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { accountsAPI, journalsAPI, contactsAPI } from '../services/api';
import { useLiveList } from '../hooks/useLiveList';
import { ArrowLeft, Plus, Search } from 'lucide-react';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const entryTotal = (e) => e.items.reduce((s, i) => s + Number(i.debit || 0), 0);

export const JournalEntries = () => {
  const { journalEntries, accounts: mockAccounts, journals: mockJournals, contacts: mockContacts, createJournalEntry, syncAllData } = useAccounting();

  React.useEffect(() => {
    if (syncAllData) syncAllData();
  }, [syncAllData]);

  const accountsFetcher = useCallback(() => accountsAPI.list(), []);
  const { data: liveAccounts } = useLiveList(accountsFetcher, 'accounts', mockAccounts);
  const journalsFetcher = useCallback(() => journalsAPI.list(), []);
  const { data: liveJournals } = useLiveList(journalsFetcher, 'journals', mockJournals);
  const contactsFetcher = useCallback(() => contactsAPI.list(), []);
  const { data: liveContacts } = useLiveList(contactsFetcher, 'contacts', mockContacts);

  const accounts = liveAccounts.length ? liveAccounts : mockAccounts;
  const journals = liveJournals.length ? liveJournals : mockJournals;
  const contacts = liveContacts.length ? liveContacts : mockContacts;
  const [selectedId, setSelectedId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [jName, setJName] = useState(journals[0]?.name || 'Purchase Journal');
  const [jDate, setJDate] = useState(new Date().toISOString().split('T')[0]);
  const [jRef, setJRef] = useState('');
  const [rows, setRows] = useState([{ accountId: '', partnerId: '', debit: '', credit: '' }, { accountId: '', partnerId: '', debit: '', credit: '' }]);
  const [formError, setFormError] = useState('');
  const [posting, setPosting] = useState(false);
  const [search, setSearch] = useState('');

  const visibleEntries = journalEntries.filter((e) => {
    if (!search.trim()) return true;
    const t = search.trim().toLowerCase();
    return e.entryNumber?.toLowerCase().includes(t) || e.reference?.toLowerCase().includes(t) || e.journalName?.toLowerCase().includes(t);
  });

  const selected = journalEntries.find((e) => e.id === selectedId) || null;
  const accName = (id) => { const a = accounts.find((x) => String(x.id) === String(id)); return a ? `${a.code} — ${a.name}` : ''; };
  const totD = rows.reduce((s, r) => s + Number(r.debit || 0), 0);
  const totC = rows.reduce((s, r) => s + Number(r.credit || 0), 0);
  const balanced = Math.abs(totD - totC) < 0.005 && totD > 0;

  const handlePost = async () => {
    setFormError('');
    const jMatch = journals.find((j) => j.name === jName);
    const lines = rows.filter((r) => r.accountId).map((r) => {
      const a = accounts.find((x) => String(x.id) === String(r.accountId));
      const p = contacts.find((x) => String(x.id) === String(r.partnerId));
      return { 
        accountId: r.accountId, 
        accountCode: a?.code || '', 
        accountName: a?.name || '', 
        partnerId: r.partnerId || null,
        partnerName: p?.name || '',
        debit: Number(r.debit || 0), 
        credit: Number(r.credit || 0) 
      };
    });
    if (lines.length < 2) { setFormError('Add at least two lines with accounts.'); return; }
    setPosting(true);
    try {
      const res = await createJournalEntry({ journalName: jName, journalId: jMatch?.id, date: jDate, reference: jRef, lines });
      if (!res.success) { setFormError(res.error); return; } // blocking warning when unbalanced
      setShowNew(false);
      setRows([{ accountId: '', debit: '', credit: '' }, { accountId: '', debit: '', credit: '' }]);
      setJRef('');
      if (res.entry) setSelectedId(res.entry.id);
    } finally {
      setPosting(false);
    }
  };

  const input = 'w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-900">Journal Entries (List View)</h1>
        <button onClick={() => { setShowNew(!showNew); setFormError(''); }} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-1.5"><Plus className="w-4 h-4" /> New</button>
      </div>
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entry number, reference, journal..." className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
      </div>

      {showNew && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Journal (Many2one)</label>
              <select value={jName} onChange={(e) => setJName(e.target.value)} className={input}>{journals.map((j) => <option key={j.id} value={j.name}>{j.name}</option>)}</select></div>
            <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Accounting Date</label><input type="date" value={jDate} onChange={(e) => setJDate(e.target.value)} className={input} /></div>
            <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reference</label><input value={jRef} onChange={(e) => setJRef(e.target.value)} placeholder="e.g. Adjustment" className={input} /></div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase text-slate-500 border-b border-slate-100"><th className="py-2">Account (CoA)</th><th className="py-2">Partner (Contact)</th><th className="py-2">Debit</th><th className="py-2">Credit</th><th /></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="py-2 pr-2 min-w-[180px]"><select value={r.accountId} onChange={(e) => setRows(rows.map((x, xi) => xi === i ? { ...x, accountId: e.target.value } : x))} className={input}>
                    <option value="">Select…</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                  </select></td>
                  <td className="py-2 pr-2 min-w-[150px]">
                    <select value={r.partnerId} onChange={(e) => setRows(rows.map((x, xi) => xi === i ? { ...x, partnerId: e.target.value } : x))} className={input}>
                      <option value="">None</option>
                      {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-2 w-28"><input type="number" min="0" value={r.debit} onChange={(e) => setRows(rows.map((x, xi) => xi === i ? { ...x, debit: e.target.value } : x))} className={input} /></td>
                  <td className="py-2 pr-2 w-28"><input type="number" min="0" value={r.credit} onChange={(e) => setRows(rows.map((x, xi) => xi === i ? { ...x, credit: e.target.value } : x))} className={input} /></td>
                  <td className="py-2"><button onClick={() => setRows(rows.filter((_, xi) => xi !== i))} className="text-red-500 text-xs font-bold">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setRows([...rows, { accountId: '', debit: '', credit: '' }])} className="text-xs font-bold text-blue-600">+ Add line</button>
          <div className={`text-sm font-bold p-3 rounded-xl ${balanced ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            Total Debit {inr(totD)} = Total Credit {inr(totC)} {balanced ? '✓ Balanced' : "✕ Blocking warning: debit and credit don't match"}
          </div>
          {formError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{formError}</div>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNew(false)} className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold">Cancel</button>
            <button onClick={handlePost} disabled={posting} className="px-6 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">{posting ? 'Posting…' : 'Post'}</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-fit">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase text-slate-500 border-b border-slate-100">
              <th className="px-4 py-3">Date</th><th className="px-4 py-3">Number</th><th className="px-4 py-3">Journal</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Status</th>
            </tr></thead>
            <tbody>
              {visibleEntries.map((e) => (
                <tr key={e.id} onClick={() => setSelectedId(e.id)} className={`border-b border-slate-50 last:border-0 hover:bg-blue-50/40 cursor-pointer ${e.id === selectedId ? 'bg-blue-50/60' : ''}`}>
                  <td className="px-4 py-3 text-slate-600">{e.date}</td>
                  <td className="px-4 py-3 font-bold">{e.entryNumber}</td>
                  <td className="px-4 py-3">{e.journalName}</td>
                  <td className="px-4 py-3 text-right font-semibold">{inr(entryTotal(e))}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">{e.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          {!selected && <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-sm text-slate-500">Click an entry to open its form view.</div>}
          {selected && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900">{selected.entryNumber} — {selected.status}</h2>
                <button onClick={() => setSelectedId(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</button>
              </div>
              <p className="text-xs text-slate-500">{selected.date} • {selected.journalName} • {selected.reference}</p>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase text-slate-500 border-b border-slate-100"><th className="py-2">Account</th><th className="py-2">Partner</th><th className="py-2 text-right">Debit</th><th className="py-2 text-right">Credit</th></tr></thead>
                <tbody>
                  {selected.items.map((it, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 font-semibold">{it.accountName}</td>
                      <td className="py-2 text-slate-600 text-xs">{it.partnerName || (it.accountName?.includes('(') ? it.accountName : '—')}</td>
                      <td className="py-2 text-right">{it.debit ? inr(it.debit) : ''}</td>
                      <td className="py-2 text-right">{it.credit ? inr(it.credit) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
