import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatPKR } from '../../lib/format';

const inputCls = 'w-full rounded-lg border border-[#253244] bg-[#080D14] px-3 py-2 text-sm text-[#F5F7FA] outline-none placeholder:text-[#91A0B5] focus:border-[#FF7818]';
/** Payments for this customer. Admins can reverse an active payment with a reason. */
export default function PaymentHistory({ customer, isAdmin, refreshKey, onChanged }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [reversing, setReversing] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('payments')
      .select('id, payment_number, amount, payment_method, reference_number, status, reversal_reason, received_at')
      .eq('customer_id', customer.id)
      .order('received_at', { ascending: false });
    if (err) setError(err.message);
    else setRows(data ?? []);
  }, [customer.id]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const reverse = async (p) => {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.rpc('reverse_payment', { p_payment_id: p.id, p_reason: reason.trim() });
    setBusy(false);
    if (err) return setError(err.message);
    setReversing(null);
    setReason('');
    onChanged?.();
  };

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (rows === null) return <p role="status" className="text-sm text-[#91A0B5]">Loading payments…</p>;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Payments</h3>
      {rows.length === 0 && <p className="text-sm text-[#91A0B5]">No payments recorded.</p>}
      <ul className="divide-y divide-[#253244] rounded-xl border border-[#253244] bg-[#111A25]">
        {rows.map((p) => (
          <li key={p.id} className="space-y-2 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className={p.status === 'reversed' ? 'text-[#91A0B5] line-through' : ''}>
                  {p.payment_number} · {formatPKR(p.amount)} · {p.payment_method === 'cash' ? 'Cash' : 'Bank transfer'}
                  {p.reference_number ? ` · ref ${p.reference_number}` : ''}
                </p>
                <p className="text-xs text-[#91A0B5]">{new Date(p.received_at).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                {p.status === 'reversed' && <p className="text-xs text-red-300">Reversed: {p.reversal_reason}</p>}
              </div>
              {isAdmin && p.status === 'active' && reversing !== p.id && (
                <button onClick={() => setReversing(p.id)} className="rounded-full border border-red-500/40 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10">
                  Reverse
                </button>
              )}
            </div>
            {reversing === p.id && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <input className={inputCls} placeholder="Reason for reversal (required)" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reversal reason" />
                <button onClick={() => reverse(p)} disabled={busy || reason.trim().length < 3} className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Confirm reversal</button>
                <button onClick={() => { setReversing(null); setReason(''); }} className="rounded-lg border border-[#253244] px-4 py-2 text-sm transition hover:border-[#FF7818]">Cancel</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
