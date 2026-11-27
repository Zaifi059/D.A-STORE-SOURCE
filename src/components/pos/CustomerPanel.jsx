import { useRef, useState } from 'react';
import { Loader2, Search, UserPlus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { normalizePhone } from '../../lib/posMath';
import { formatPKR } from '../../lib/format';

const EMPTY_NEW = { full_name: '', phone: '', city: '', address: '', email: '', customer_type: 'retail' };
const inputCls = 'w-full rounded-lg border border-[#253244] bg-[#080D14] px-3 py-2 text-sm text-[#F5F7FA] outline-none placeholder:text-[#91A0B5] focus:border-[#FF7818]';

/** Find, select or create a customer without leaving the POS. Leaving this empty means a walk-in sale. */
export default function CustomerPanel({ selected, onSelect, summary, summaryLoading = false, summaryError = '' }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_NEW);
  const [existing, setExisting] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const searchRequest = useRef(0);

  const search = async (term) => {
    setQ(term);
    const clean = term.trim().replace(/[(),*%]/g, '');
    const digits = normalizePhone(clean);
    const requestId = ++searchRequest.current;
    if (clean.length < 2 && digits.length < 3) {
      setResults([]);
      setError('');
      setSearching(false);
      return;
    }
    setSearching(true);
    setError('');
    try {
      const filter = digits.length >= 3
        ? `phone_key.like.%${digits}%`
        : `full_name.ilike.%${clean}%,customer_code.ilike.%${clean}%`;
      const { data, error: err } = await supabase
        .from('customers')
        .select('id, customer_code, full_name, phone, city, address, email, customer_type')
        .eq('status', 'active')
        .or(filter)
        .limit(8);
      if (requestId !== searchRequest.current) return;
      if (err) throw err;
      setResults(data ?? []);
    } catch (err) {
      if (requestId === searchRequest.current) setError(err.message || 'Could not search customers.');
    } finally {
      if (requestId === searchRequest.current) setSearching(false);
    }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const checkDuplicate = async () => {
    const digits = normalizePhone(form.phone);
    if (digits.length < 7) return setExisting(null);
    try {
      const { data, error: err } = await supabase
        .from('customers').select('id, customer_code, full_name, phone').eq('phone_key', digits).maybeSingle();
      if (err) throw err;
      setExisting(data ?? null);
    } catch (err) {
      setError(err.message || 'Could not check for an existing customer.');
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.full_name.trim()) return setError('Enter the customer name.');
    if (normalizePhone(form.phone).length < 7) return setError('Enter a valid phone number.');
    setBusy(true);
    try {
      const { data, error: err } = await supabase
        .from('customers')
        .insert({
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          city: form.city.trim() || null,
          address: form.address.trim() || null,
          email: form.email.trim() || null,
          customer_type: form.customer_type,
        })
        .select('id, customer_code, full_name, phone, city, address, email, customer_type')
        .single();
      if (err) throw err;
      onSelect(data);
      setCreating(false);
      setForm(EMPTY_NEW);
      setExisting(null);
    } catch (err) {
      setError(err.code === '23505' ? 'A customer with this phone number already exists.' : err.message || 'Could not create this customer.');
    } finally {
      setBusy(false);
    }
  };

  if (selected) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-lg border border-[#FF7818]/30 bg-[#FF7818]/5 p-3">
        <div className="min-w-0 space-y-1 text-sm">
          <p className="truncate font-semibold">{selected.full_name}</p>
          <p className="text-xs text-[#91A0B5]">{selected.customer_code} · {selected.phone}{selected.city ? ` · ${selected.city}` : ''}</p>
          {summaryError ? (
            <p role="alert" className="text-xs text-amber-300">
              Credit balance unavailable: {summaryError}. Full payment is still available.
            </p>
          ) : summary ? (
            <div className="space-y-0.5">
              <p className="text-xs text-[#F5F7FA]">
                Owes {formatPKR(summary.outstanding)} · Limit {formatPKR(summary.credit_limit)} · Available {formatPKR(summary.available_credit)}
              </p>
              <p className="text-[10px] text-[#91A0B5]">
                Purchases {formatPKR(summary.total_purchases)} · Paid {formatPKR(summary.total_payments)}
                {Number(summary.overdue) > 0 && <span className="ml-1 text-amber-300">· Overdue {formatPKR(summary.overdue)}</span>}
              </p>
            </div>
          ) : (
            <p className="text-xs text-[#91A0B5]">{summaryLoading ? 'Loading balance…' : 'Credit balance unavailable.'}</p>
          )}
        </div>
        <button onClick={() => onSelect(null)} className="text-[#91A0B5] hover:text-red-400" aria-label="Remove customer"><X className="h-4 w-4" /></button>
      </div>
    );
  }

  if (creating) {
    return (
      <form onSubmit={create} className="space-y-2 rounded-lg border border-[#253244] bg-[#080D14] p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">New customer</p>
          <button type="button" onClick={() => { setCreating(false); setError(''); }} className="text-xs text-[#91A0B5] hover:text-[#F5F7FA]">Cancel</button>
        </div>
        <input required placeholder="Full name" value={form.full_name} onChange={set('full_name')} className={inputCls} />
        <input required placeholder="Phone" inputMode="tel" value={form.phone} onChange={set('phone')} onBlur={checkDuplicate} className={inputCls} />
        {existing && (
          <button type="button" onClick={() => { onSelect(existing); setCreating(false); }} className="w-full rounded-lg border border-[#FF7818]/50 px-3 py-2 text-left text-xs text-[#FF9A45]">
            Already registered as {existing.full_name} ({existing.customer_code}). Use this customer.
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="City" value={form.city} onChange={set('city')} className={inputCls} />
          <select value={form.customer_type} onChange={set('customer_type')} className={inputCls} aria-label="Customer type">
            <option value="retail">Retail</option>
            <option value="wholesale">Wholesale</option>
          </select>
        </div>
        <input placeholder="Address" value={form.address} onChange={set('address')} className={inputCls} />
        <input type="email" placeholder="Email (optional)" value={form.email} onChange={set('email')} className={inputCls} />
        {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
        <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF7818] py-2 text-sm font-semibold text-white transition hover:bg-[#FF9A45] disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save and select
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#91A0B5]" />
        <input
          value={q} onChange={(e) => search(e.target.value)} placeholder="Customer: name, phone or code (walk-in if empty)"
          className="w-full rounded-lg border border-[#253244] bg-[#080D14] py-2 pl-9 pr-3 text-sm text-[#F5F7FA] outline-none placeholder:text-[#91A0B5] focus:border-[#FF7818]"
        />
      </div>
      {searching && <p className="text-xs text-[#91A0B5]">Searching…</p>}
      {error && !creating && <p role="alert" className="text-xs text-red-400">{error}</p>}
      {results.length > 0 && (
        <ul className="max-h-40 overflow-y-auto rounded-lg border border-[#253244] bg-[#111A25]">
          {results.map((c) => (
            <li key={c.id}>
              <button onClick={() => { onSelect(c); setQ(''); setResults([]); }} className="flex w-full flex-col px-3 py-2 text-left text-sm transition hover:bg-[#151F2B]">
                <span>{c.full_name}</span>
                <span className="text-xs text-[#91A0B5]">{c.customer_code} · {c.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => { setCreating(true); setError(''); }} className="flex items-center gap-1.5 text-xs text-[#FF9A45] hover:text-[#FF7818]">
        <UserPlus className="h-3.5 w-3.5" /> New customer
      </button>
    </div>
  );
}
