import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Printer, ScanLine, Shirt, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCustomerSummary } from '../hooks/useCustomerSummary';
import { useProducts } from '../hooks/useProducts';
import { usePosCart } from '../hooks/usePosCart';
import { computeTotals } from '../lib/posMath';
import { formatPKR } from '../lib/format';
import { hasVariants, unitPriceFor, activeVariants, stockFor } from '../lib/pricing';
import StaffHeader from '../components/StaffHeader';
import StockBadge from '../components/StockBadge';
import PosCart from '../components/pos/PosCart';
import Receipt from '../components/pos/Receipt';
import CustomerPanel from '../components/pos/CustomerPanel';
import VariantChooser from '../components/pos/VariantChooser';

export default function PosPage() {
  const { user, profile, isAdmin } = useAuth();
  const { products, loading } = useProducts();
  const cart = usePosCart();

  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');
  const [flash, setFlash] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [chooser, setChooser] = useState(null);
  const [method, setMethod] = useState('cash');
  const [discount, setDiscount] = useState('');
  const [tendered, setTendered] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const { summary, refresh: refreshSummary } = useCustomerSummary(customer?.id);

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
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (category === 'All' || p.category === category) &&
        (!term || [p.name, p.sku, p.barcode].some((v) => v?.toLowerCase().includes(term)))
    );
  }, [products, category, search]);

  // Adds a product (or a chosen variant) to the cart, enforcing stock on the client as a courtesy.
  // The database enforces it again at checkout.
  const addLine = (product, variant = null) => {
    const stock = stockFor(product, variant);
    const inCart = cart.lines.find((l) => l.id === (variant ? `${product.id}:${variant.id}` : product.id))?.quantity ?? 0;
    const label = variant ? `${product.name} ${variant.size}/${variant.color}` : product.name;
    if (stock <= 0) return showFlash('error', `${label} is out of stock`);
    if (inCart >= stock) return showFlash('error', `Only ${stock} of ${label} in stock`);
    cart.add(product, variant);
    showFlash('ok', `Added ${label}`);
  };

  const tapProduct = (product) => {
    if (hasVariants(product)) return setChooser(product);
    addLine(product);
  };

  const onScan = (e) => {
    e.preventDefault();
    const value = code.trim();
    if (!value) return;
    setCode('');
    // Match a product barcode, or a variant SKU.
    for (const p of products) {
      if (p.barcode === value) return tapProduct(p);
      const v = activeVariants(p).find((x) => x.sku === value);
      if (v) return addLine(p, v);
    }
    showFlash('error', `No product with barcode or SKU ${value}`);
    scanRef.current?.focus();
  };

  const creditAllowed = Boolean(customer) && Number(summary?.credit_limit ?? 0) > 0;
  const creditAvailable = Number(summary?.available_credit ?? 0);

  const totals = computeTotals({ lines: cart.lines, discount, method, tendered, creditAllowed });
  const overLimit = creditAllowed && totals.shortBy > creditAvailable;
  const overrideOk = !overLimit || (isAdmin && overrideReason.trim().length >= 3);
  const creditPanel = {
    customerSelected: Boolean(customer),
    creditAllowed,
    creditAvailable,
    overLimit,
    isAdmin,
    overrideReason,
    setOverrideReason,
    canSubmit: overrideOk,
  };

  const completeSale = async () => {
    setBusy(true);
    setError('');
    try {
      const { data: order, error: rpcErr } = await supabase.rpc('create_pos_sale', {
        p_items: cart.lines.map((l) => ({ product_id: l.product_id, variant_id: l.variant_id, quantity: l.quantity })),
        p_customer_id: customer?.id ?? null,
        p_discount: totals.discount,
        p_payment_method: method,
        p_amount_received: totals.received,
        p_override_reason: overLimit && isAdmin ? overrideReason.trim() : null,
      });
      if (rpcErr) throw rpcErr;

      const { data: lines } = await supabase
        .from('order_items')
        .select('quantity, unit_price, size, color, products(name)')
        .eq('order_id', order.id);
      const items = (lines ?? []).map((l) => ({
        name: l.products?.name ?? 'Item', size: l.size, color: l.color, quantity: l.quantity, price: Number(l.unit_price),
      }));

      setReceipt({ order, items, method, cashier });
      cart.clear();
      setCustomer(null);
      setDiscount('');
      setTendered('');
      setOverrideReason('');
      setMethod('cash');
      refreshSummary();
    } catch (err) {
      setError(err.message || 'Sale failed. Please try again.');
    } finally {
      setBusy(false);
      scanRef.current?.focus();
    }
  };

  const closeReceipt = () => {
    setReceipt(null);
    scanRef.current?.focus();
  };

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      <StaffHeader title="POS Terminal" />

      <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] lg:grid-cols-[1fr_420px] lg:grid-rows-1">
        <section className="flex min-h-0 flex-col gap-3 p-3">
          <form onSubmit={onScan} className="relative">
            <ScanLine className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-lime-400" />
            <input
              ref={scanRef} value={code} onChange={(e) => setCode(e.target.value)}
              placeholder="Scan barcode or SKU and press Enter…" autoComplete="off"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 py-3 pl-11 pr-4 focus:border-lime-500 focus:outline-none"
            />
          </form>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products by name or SKU"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm focus:border-lime-500 focus:outline-none"
          />
          {flash && (
            <p className={`rounded-lg px-3 py-1.5 text-sm ${flash.type === 'ok' ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>{flash.text}</p>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full border px-4 py-1 text-sm ${category === c ? 'border-lime-500 bg-lime-500 font-semibold text-black' : 'border-neutral-700 hover:border-lime-500'}`}>
                {c}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-lime-400" /></div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {visible.map((p) => {
                  const soldOut = stockFor(p) <= 0 && !activeVariants(p).some((v) => v.stock_count > 0);
                  return (
                    <button key={p.id} onClick={() => tapProduct(p)} disabled={soldOut}
                      className="relative overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 text-left transition hover:border-lime-500 disabled:cursor-not-allowed disabled:opacity-50">
                      <div className="aspect-square bg-neutral-800">
                        {p.image_url
                          ? <img src={p.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                          : <div className="flex h-full items-center justify-center"><Shirt className="h-8 w-8 text-neutral-600" /></div>}
                      </div>
                      {!hasVariants(p) && <StockBadge stock={p.stock_count} className="absolute left-1.5 top-1.5" />}
                      <div className="p-2">
                        <p className="truncate text-sm">{p.name}</p>
                        <p className="text-sm font-semibold text-lime-400">{formatPKR(unitPriceFor(p))}</p>
                        {hasVariants(p) && <p className="text-[11px] text-neutral-500">{activeVariants(p).length} size/color options</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <div className="max-h-[60vh] min-h-0 lg:max-h-none">
          <PosCart
            lines={cart.lines} totals={totals}
            method={method} setMethod={setMethod}
            discount={discount} setDiscount={setDiscount}
            tendered={tendered} setTendered={setTendered}
            busy={busy} error={error} onComplete={completeSale}
            onQty={cart.setQty} onRemove={cart.remove} onClear={cart.clear}
            customerSlot={<CustomerPanel selected={customer} onSelect={setCustomer} summary={summary} />}
            credit={creditPanel}
          />
        </div>
      </div>

      {chooser && (
        <VariantChooser
          product={chooser}
          onClose={() => setChooser(null)}
          onPick={(variant) => { addLine(chooser, variant); setChooser(null); }}
        />
      )}

      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="flex max-h-[92vh] flex-col gap-3 overflow-y-auto rounded-xl bg-neutral-900 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-green-400">Sale complete</h2>
              <button onClick={closeReceipt} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <Receipt sale={receipt} />
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-lime-500 py-2.5 font-semibold text-black hover:bg-lime-400">
                <Printer className="h-4 w-4" /> Print receipt
              </button>
              <button onClick={closeReceipt} className="flex-1 rounded-full border border-neutral-600 py-2.5 hover:border-lime-500">New sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
