import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Printer, ScanLine, Shirt, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../hooks/useProducts';
import { usePosCart } from '../hooks/usePosCart';
import { formatPKR } from '../lib/format';
import StaffHeader from '../components/StaffHeader';
import StockBadge from '../components/StockBadge';
import PosCart from '../components/pos/PosCart';
import Receipt from '../components/pos/Receipt';

export default function PosPage() {
  const { user, profile } = useAuth();
  const { products, loading } = useProducts();
  const cart = usePosCart();

  const [category, setCategory] = useState('All');
  const [code, setCode] = useState('');
  const [flash, setFlash] = useState(null);
  const [method, setMethod] = useState('cash');
  const [tendered, setTendered] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  const scanRef = useRef(null);
  const flashTimer = useRef();
  const cashier = profile?.full_name || user?.email || 'Cashier';

  useEffect(() => { scanRef.current?.focus(); return () => clearTimeout(flashTimer.current); }, []);

  const showFlash = (type, text) => {
    clearTimeout(flashTimer.current);
    setFlash({ type, text });
    flashTimer.current = setTimeout(() => setFlash(null), 2500);
  };

  const categories = useMemo(() => ['All', ...new Set(products.map((p) => p.category).filter(Boolean))], [products]);
  const visible = useMemo(
    () => products.filter((p) => category === 'All' || p.category === category),
    [products, category]
  );

  const addToCart = (product) => {
    const inCart = cart.items.find((i) => i.id === product.id)?.quantity ?? 0;
    if (product.stock_count <= 0) return showFlash('error', `${product.name} is out of stock`);
    if (inCart >= product.stock_count) return showFlash('error', `Only ${product.stock_count} of ${product.name} in stock`);
    cart.add(product);
    showFlash('ok', `Added ${product.name}`);
  };

  const onScan = async (e) => {
    e.preventDefault();
    const barcode = code.trim();
    if (!barcode) return;
    setCode('');
    const { data, error: err } = await supabase
      .from('products').select('*').eq('barcode', barcode).eq('is_active', true).maybeSingle();
    if (err) showFlash('error', err.message);
    else if (!data) showFlash('error', `No product with barcode ${barcode}`);
    else addToCart(data);
    scanRef.current?.focus();
  };

  const change = method === 'cash' ? Math.max(0, Number(tendered || 0) - cart.total) : 0;
  const canComplete =
    cart.items.length > 0 && !busy && (method === 'card' || (tendered !== '' && Number(tendered) >= cart.total));

  const completeSale = async () => {
    setBusy(true);
    setError('');
    const snapshot = cart.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price }));
    const tenderedNum = method === 'cash' ? Number(tendered) : null;
    try {
      const { data: order, error: rpcErr } = await supabase.rpc('process_order', {
        p_channel: 'pos',
        p_payment_method: method,
        p_customer_info: { cashier, tendered: tenderedNum },
        p_items: cart.items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
      });
      if (rpcErr) throw rpcErr;

      // Use the prices the server actually charged
      const { data: lines } = await supabase
        .from('order_items').select('quantity, unit_price, products(name)').eq('order_id', order.id);
      const items = lines?.length
        ? lines.map((l) => ({ name: l.products?.name ?? 'Item', quantity: l.quantity, price: Number(l.unit_price) }))
        : snapshot;

      setReceipt({
        order, items, method, cashier, tendered: tenderedNum,
        change: tenderedNum != null ? Math.max(0, tenderedNum - Number(order.total_amount)) : 0,
      });
      cart.clear();
      setTendered('');
      setMethod('cash');
    } catch (err) {
      setError(err.message || 'Sale failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const closeReceipt = () => {
    setReceipt(null);
    scanRef.current?.focus();
  };

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      <StaffHeader title="POS Terminal" />

      <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] lg:grid-cols-[1fr_400px] lg:grid-rows-1">
        {/* Left: scanner + products */}
        <section className="flex min-h-0 flex-col gap-3 p-3">
          <form onSubmit={onScan} className="relative">
            <ScanLine className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-400" />
            <input
              ref={scanRef} value={code} onChange={(e) => setCode(e.target.value)}
              placeholder="Scan barcode and press Enter…" autoComplete="off"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 py-3 pl-11 pr-4 focus:border-amber-500 focus:outline-none"
            />
          </form>
          {flash && (
            <p className={`rounded-lg px-3 py-1.5 text-sm ${flash.type === 'ok' ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>
              {flash.text}
            </p>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c} onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full border px-4 py-1 text-sm ${
                  category === c ? 'border-amber-500 bg-amber-500 font-semibold text-black' : 'border-neutral-700 hover:border-amber-500'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-amber-400" /></div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {visible.map((p) => (
                  <button
                    key={p.id} onClick={() => addToCart(p)} disabled={p.stock_count <= 0}
                    className="relative overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 text-left transition hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="aspect-square bg-neutral-800">
                      {p.image_url
                        ? <img src={p.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        : <div className="flex h-full items-center justify-center"><Shirt className="h-8 w-8 text-neutral-600" /></div>}
                    </div>
                    <StockBadge stock={p.stock_count} className="absolute left-1.5 top-1.5" />
                    <div className="p-2">
                      <p className="truncate text-sm">{p.name}</p>
                      <p className="text-sm font-semibold text-amber-400">{formatPKR(p.price)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right: cart */}
        <div className="max-h-[55vh] min-h-0 lg:max-h-none">
          <PosCart
            cart={cart} method={method} setMethod={setMethod} tendered={tendered} setTendered={setTendered}
            change={change} canComplete={canComplete} busy={busy} error={error} onComplete={completeSale}
          />
        </div>
      </div>

      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="flex max-h-[92vh] flex-col gap-3 overflow-y-auto rounded-xl bg-neutral-900 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-green-400">Sale complete</h2>
              <button onClick={closeReceipt} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <Receipt sale={receipt} />
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-amber-500 py-2.5 font-semibold text-black hover:bg-amber-400">
                <Printer className="h-4 w-4" /> Print Receipt
              </button>
              <button onClick={closeReceipt} className="flex-1 rounded-full border border-neutral-600 py-2.5 hover:border-amber-500">New Sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
