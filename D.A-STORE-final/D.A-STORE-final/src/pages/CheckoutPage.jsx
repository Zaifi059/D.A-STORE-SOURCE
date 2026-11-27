import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, Shirt } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatPKR } from '../lib/format';
import { inputCls, labelCls, primaryBtnCls } from '../lib/ui';

const PAYMENT_OPTIONS = [
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_wallet', label: 'Mobile Wallet' },
];

export default function CheckoutPage() {
  const { user, profile } = useAuth();
  const { items, subtotal, clear } = useCart();
  const [form, setForm] = useState({
    name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    address: '',
    city: '',
    notes: '',
    payment: 'cod',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('process_order', {
        p_channel: 'online',
        p_payment_method: form.payment,
        p_customer_info: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: user.email,
          address: form.address.trim(),
          city: form.city.trim(),
          notes: form.notes.trim(),
        },
        p_items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
      });
      if (rpcError) throw rpcError;
      setOrder(data);
      clear();
    } catch (err) {
      setError(err.message || 'Could not place your order. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (order) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-md space-y-5 py-16 text-center"
      >
        <CheckCircle2 className="mx-auto h-16 w-16 text-lime-400" />
        <h1 className="font-display text-4xl font-bold">Order placed</h1>
        <p className="text-soft/70">
          Order <span className="font-semibold text-lime-400">#{order.order_number}</span> — total{' '}
          <span className="font-semibold text-lime-400">{formatPKR(order.total_amount)}</span>
        </p>
        <p className="text-sm text-soft/45">We'll confirm it shortly. Thank you for shopping at D.A STORE.</p>
        <Link to="/shop" className="inline-block rounded-full bg-lime-500 px-6 py-3 font-semibold text-midnight shadow-lime transition hover:bg-lime-400">
          Continue shopping
        </Link>
      </motion.div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-soft/50">Your cart is empty.</p>
        <Link to="/shop" className="mt-4 inline-block text-lime-400 hover:underline">Browse products</Link>
      </div>
    );
  }

  const summary = (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold">Order summary</h2>
      <ul className="space-y-3">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-3">
            <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-teal/30">
              {i.image_url ? (
                <img src={i.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center"><Shirt className="h-4 w-4 text-soft/20" /></div>
              )}
            </div>
            <span className="min-w-0 flex-1 truncate text-sm text-soft/80">{i.name} × {i.quantity}</span>
            <span className="text-sm">{formatPKR(i.price * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between border-t border-white/10 pt-4 font-semibold">
        <span>Total</span>
        <span className="font-display text-lg text-lime-400">{formatPKR(subtotal)}</span>
      </div>
      <p className="text-xs text-soft/40">Final prices and stock are confirmed by the store when you place the order.</p>
    </div>
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="mb-8 font-display text-4xl font-bold sm:text-5xl">Checkout</h1>

        {/* Summary first on small screens so the total is visible before paying. */}
        <div className="mb-8 rounded-3xl border border-white/10 bg-teal-deep/40 p-5 lg:hidden">
          {summary}
        </div>

        <form onSubmit={submit} className="space-y-6">
          <fieldset className="grid gap-5 sm:grid-cols-2">
            <legend className="sr-only">Delivery details</legend>
            <div>
              <label htmlFor="co-name" className={labelCls}>Full name</label>
              <input id="co-name" required autoComplete="name" value={form.name} onChange={set('name')} className={inputCls} />
            </div>
            <div>
              <label htmlFor="co-phone" className={labelCls}>Phone</label>
              <input id="co-phone" required type="tel" autoComplete="tel" placeholder="0300 1234567" value={form.phone} onChange={set('phone')} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="co-address" className={labelCls}>Delivery address</label>
              <input id="co-address" required autoComplete="street-address" value={form.address} onChange={set('address')} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="co-city" className={labelCls}>City</label>
              <input id="co-city" required autoComplete="address-level2" value={form.city} onChange={set('city')} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="co-notes" className={labelCls}>Order notes (optional)</label>
              <textarea id="co-notes" rows={3} value={form.notes} onChange={set('notes')} className={inputCls} />
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className={labelCls}>Payment method</legend>
            {PAYMENT_OPTIONS.map((p) => (
              <label
                key={p.value}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                  form.payment === p.value ? 'border-lime-500/70 bg-lime-500/10' : 'border-white/10 hover:border-white/25'
                }`}
              >
                <input type="radio" name="payment" value={p.value} checked={form.payment === p.value} onChange={set('payment')} className="accent-lime-500" />
                {p.label}
              </label>
            ))}
          </fieldset>

          {error && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

          <button type="submit" disabled={busy} className={primaryBtnCls}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Place order · {formatPKR(subtotal)}
          </button>
        </form>
      </div>

      <aside className="hidden h-fit space-y-4 rounded-3xl border border-white/10 bg-teal-deep/40 p-6 lg:sticky lg:top-28 lg:block">
        {summary}
      </aside>
    </div>
  );
}
