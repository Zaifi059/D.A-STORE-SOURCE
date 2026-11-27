import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatPKR } from '../../lib/format';

/** Unpaid and part-paid POS sales for this customer, oldest first. */
export default function OpenInvoices({ customerId, refreshKey }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    supabase
      .from('orders')
      .select('id, order_number, created_at, total_amount, amount_paid, balance_due')
      .eq('customer_id', customerId)
      .gt('balance_due', 0)
      .order('created_at', { ascending: true })
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) setError(err.message);
        else setRows(data ?? []);
      });
    return () => { active = false; };
  }, [customerId, refreshKey]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (rows === null) return <p role="status" className="text-sm text-[#91A0B5]">Loading invoices…</p>;
  if (rows.length === 0) return <p className="text-sm text-[#91A0B5]">No open invoices.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-[#253244] bg-[#111A25]">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="bg-[#151F2B] text-xs uppercase tracking-wide text-[#91A0B5]">
          <tr><th className="p-2">Invoice</th><th className="p-2">Date</th><th className="p-2 text-right">Total</th><th className="p-2 text-right">Paid</th><th className="p-2 text-right">Balance</th></tr>
        </thead>
        <tbody className="divide-y divide-[#253244]">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="p-2">#{r.order_number}</td>
              <td className="p-2 text-[#91A0B5]">{new Date(r.created_at).toLocaleDateString('en-PK')}</td>
              <td className="p-2 text-right">{formatPKR(r.total_amount)}</td>
              <td className="p-2 text-right">{formatPKR(r.amount_paid)}</td>
              <td className="p-2 text-right font-semibold text-amber-300">{formatPKR(r.balance_due)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
