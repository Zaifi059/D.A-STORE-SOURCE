import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPKR } from '../../lib/format';

const inputCls = 'w-full rounded-lg border border-[#253244] bg-[#080D14] px-3 py-2 text-sm text-[#F5F7FA] outline-none placeholder:text-[#91A0B5] focus:border-[#FF7818]';
const labelCls = 'mb-1.5 block text-xs uppercase tracking-wide text-[#91A0B5]';
const primaryBtnCls = 'flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF7818] py-3 font-semibold text-white transition hover:bg-[#FF9A45] disabled:cursor-not-allowed disabled:opacity-50';
const newRequestId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

/**
 * Records a payment. The request id is created once per attempt and only replaced after success,
 * so a retry after a network error cannot record the same money twice.
 */
export default function RecordPaymentForm({ customer, owes, onSaved }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [requestId, setRequestId] = useState(newRequestId);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const value = Number(amount);
  const valid = value > 0 && (method === 'cash' || reference.trim().length > 0);
  const advance = value > Number(owes ?? 0) && Number(owes ?? 0) >= 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setMsg({ type: '', text: '' });
    const { data, error } = await supabase.rpc('record_customer_payment', {
      p_customer_id: customer.id,
      p_amount: value,
      p_payment_method: method,
      p_request_id: requestId,
      p_reference: method === 'bank_transfer' ? reference.trim() : null,
      p_notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) {
      const duplicate = error.code === '23505';
      setMsg({
        type: 'error',
        text: duplicate ? 'This bank reference was already recorded for this customer.' : error.message,
      });
      // Keep the same request id on a plain failure so a retry is safe; create a new one only for a duplicate reference.
      if (duplicate) setRequestId(newRequestId());
      return;
    }
    setMsg({ type: 'ok', text: `Recorded ${data.payment_number}: ${formatPKR(data.amount)}` });
    setAmount('');
    setReference('');
    setNotes('');
    setRequestId(newRequestId());
    onSaved?.(data);
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-[#253244] bg-[#111A25] p-4">
      <h3 className="text-sm font-semibold">Record a payment for {customer.full_name}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="pay-amount">Amount</label>
          <input id="pay-amount" type="number" min="0" step="0.01" inputMode="decimal" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="pay-method">Method</label>
          <select id="pay-method" className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank transfer</option>
          </select>
        </div>
        {method === 'bank_transfer' && (
          <div>
            <label className={labelCls} htmlFor="pay-ref">Bank reference (required)</label>
            <input id="pay-ref" className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        )}
        <div className={method === 'bank_transfer' ? '' : 'sm:col-span-2'}>
          <label className={labelCls} htmlFor="pay-notes">Notes (optional)</label>
          <input id="pay-notes" className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      {advance && value > 0 && (
        <p className="text-xs text-amber-300">This is more than the customer owes. The extra {formatPKR(value - Number(owes))} is kept as advance credit.</p>
      )}
      {msg.text && (
        <p role={msg.type === 'error' ? 'alert' : 'status'} className={`rounded-lg px-3 py-2 text-sm ${msg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
          {msg.text}
        </p>
      )}
      <button type="submit" disabled={!valid || busy} className={primaryBtnCls}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Record payment
      </button>
    </form>
  );
}
