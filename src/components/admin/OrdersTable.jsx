import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPKR } from '../../lib/format';

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'];
const TABS = [['all', 'All'], ['online', 'Online'], ['pos', 'POS']];

export default function OrdersTable() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('orders')
      .select('*, order_items(quantity, unit_price, products(name))')
      .order('created_at', { ascending: false })
      .limit(200);
    if (err) setError(err.message);
    else { setOrders(data); setError(''); }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const counts = useMemo(
    () => ({
      all: orders.length,
      online: orders.filter((o) => o.channel === 'online').length,
      pos: orders.filter((o) => o.channel === 'pos').length,
    }),
    [orders]
  );
  const rows = tab === 'all' ? orders : orders.filter((o) => o.channel === tab);

  const updateStatus = async (id, status) => {
    const previous = orders;
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o))); // optimistic
    const { error: err } = await supabase.from('orders').update({ status }).eq('id', id);
    if (err) { setOrders(previous); setError(err.message); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-lime-400" /></div>;

  return (
    <section className="space-y-4">
      <div className="flex gap-2">
        {TABS.map(([key, label]) => (
          <button
            key={key} onClick={() => setTab(key)}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              tab === key ? 'border-lime-500 bg-lime-500 font-semibold text-black' : 'border-neutral-700 hover:border-lime-500'
            }`}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-neutral-900 text-xs uppercase tracking-wide text-neutral-400">
            <tr>
              <th className="p-3" /><th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Channel</th>
              <th className="p-3">Customer</th><th className="p-3">Payment</th><th className="p-3">Total</th><th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {rows.map((o) => {
              const open = expanded === o.id;
              const info = o.customer_info ?? {};
              return (
                <Fragment key={o.id}>
                  <tr className="hover:bg-neutral-900/50">
                    <td className="p-3">
                      <button onClick={() => setExpanded(open ? null : o.id)} aria-label="Toggle details">
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="p-3 font-semibold text-lime-400">#{o.order_number}</td>
                    <td className="p-3 text-neutral-300">{new Date(o.created_at).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${o.channel === 'pos' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                        {o.channel}
                      </span>
                    </td>
                    <td className="p-3">{info.name || 'Walk-in'}</td>
                    <td className="p-3 capitalize">{o.payment_method.replace('_', ' ')}</td>
                    <td className="p-3 font-semibold">{formatPKR(o.total_amount)}</td>
                    <td className="p-3">
                      <select
                        value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)}
                        className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs capitalize focus:border-lime-500 focus:outline-none"
                        aria-label={`Status for order ${o.order_number}`}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-neutral-900/60">
                      <td />
                      <td colSpan={7} className="space-y-2 p-3 text-xs text-neutral-300">
                        <ul className="space-y-0.5">
                          {o.order_items.map((it, idx) => (
                            <li key={idx}>{it.quantity} × {it.products?.name ?? 'Item'} @ {formatPKR(it.unit_price)}</li>
                          ))}
                        </ul>
                        <p className="text-neutral-400">
                          {[info.phone, info.email, info.address, info.city, info.cashier && `Cashier: ${info.cashier}`, info.notes && `Notes: ${info.notes}`]
                            .filter(Boolean).join(' · ') || 'No customer details'}
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={8} className="p-10 text-center text-neutral-500">No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
