import { useEffect, useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPKR } from '../../lib/format';
import { withRunningBalance } from '../../lib/ledger';

/** Immutable customer ledger with a running balance. Printable as a statement. */
export default function LedgerTable({ customer, refreshKey, summary }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    supabase
      .from('customer_ledger')
      .select('id, seq, entry_type, description, debit, credit, created_at')
      .eq('customer_id', customer.id)
      .order('seq', { ascending: true })
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) setError(err.message);
        else setRows(data ?? []);
      });
    return () => { active = false; };
  }, [customer.id, refreshKey]);

  const withBalance = useMemo(() => withRunningBalance(rows ?? []), [rows]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (rows === null) return <p className="text-sm text-neutral-500">Loading ledger…</p>;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Customer ledger</h3>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-full border border-neutral-700 px-3 py-1.5 text-xs hover:border-lime-500">
          <Printer className="h-3.5 w-3.5" /> Print statement
        </button>
      </div>

      <div id="statement-print" className="overflow-x-auto rounded-xl border border-neutral-800">
        <div className="hidden p-4 print:block">
          <p className="text-lg font-bold">D.A STORE — Customer statement</p>
          <p>{customer.full_name} ({customer.customer_code}) · {customer.phone}</p>
          {summary && <p>Balance owed: {formatPKR(summary.outstanding)}</p>}
        </div>
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-neutral-950 text-xs uppercase tracking-wide text-neutral-400">
            <tr><th className="p-2">Date</th><th className="p-2">Type</th><th className="p-2">Description</th><th className="p-2 text-right">Debit</th><th className="p-2 text-right">Credit</th><th className="p-2 text-right">Balance</th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {withBalance.map((r) => (
              <tr key={r.id}>
                <td className="p-2 text-neutral-400">{new Date(r.created_at).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                <td className="p-2 capitalize text-neutral-400">{r.entry_type.replace('_', ' ')}</td>
                <td className="p-2">{r.description}</td>
                <td className="p-2 text-right">{Number(r.debit) ? formatPKR(r.debit) : '—'}</td>
                <td className="p-2 text-right">{Number(r.credit) ? formatPKR(r.credit) : '—'}</td>
                <td className="p-2 text-right font-semibold">{formatPKR(r.balance)}</td>
              </tr>
            ))}
            {withBalance.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-neutral-500">No transactions yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
