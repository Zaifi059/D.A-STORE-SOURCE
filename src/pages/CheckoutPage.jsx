import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatPKR } from '../lib/format';

const PAYMENT_OPTIONS = [
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_wallet', label: 'Mobile Wallet' },
];

const inputCls =
  'w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none';

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
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-amber-400" />
        <h1 className="font-serif text-2xl font-bold">Order placed!</h1>
        <p className="text-neutral-300">
          Order <span className="font-semibold text-amber-400">#{order.order_number}</span> — total{' '}
          <span className="font-semibold text-amber-400">{formatPKR(order.total_amount)}</span>
        </p>
        <p className="text-sm text-neutral-500">We'll confirm it shortly. Thank you for shopping at D.A STORE.</p>
        <Link to="/" className="inline-block rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-black hover:bg-amber-400">
          Continue shopping
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-neutral-400">Your cart is empty.</p>
        <Link to="/" className="mt-4 inline-block text-amber-400 hover:underline">Browse products</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <form onSubmit={submit} className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Checkout</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <input required placeholder="Full name" value={form.name} onChange={set('name')} className={inputCls} />
          <input required type="tel" placeholder="Phone (e.g. 0300 1234567)" value={form.phone} onChange={set('phone')} className={inputCls} />
        </div>
        <input required placeholder="Delivery address" value={form.address} onChange={set('address')} className={inputCls} />
        <input required placeholder="City" value={form.city} onChange={set('city')} className={inputCls} />
        <textarea placeholder="Order notes (optional)" rows={3} value={form.notes} onChange={set('notes')} className={inputCls} />

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm text-neutral-400">Payment method</legend>
          {PAYMENT_OPTIONS.map((p) => (
            <label key={p.value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-800 px-3 py-2 text-sm has-[:checked]:border-amber-500">
              <input type="radio" name="payment" value={p.value} checked={form.payment === p.value} onChange={set('payment')} className="accent-amber-500" />
              {p.label}
            </label>
          ))}
        </fieldset>

        {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3 font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Place Order · {formatPKR(subtotal)}
        </button>
      </form>

      <aside className="h-fit space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="font-semibold">Order summary</h2>
        {items.map((i) => (
          <div key={i.id} className="flex justify-between gap-3 text-sm">
            <span className="truncate text-neutral-300">{i.name} × {i.quantity}</span>
            <span>{formatPKR(i.price * i.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-neutral-800 pt-3 font-semibold">
          <span>Total</span>
          <span className="text-amber-400">{formatPKR(subtotal)}</span>
        </div>
        <p className="text-xs text-neutral-500">Final prices and stock are confirmed by the store when you place the order.</p>
      </aside>
    </div>
  );
}
