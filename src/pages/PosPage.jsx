import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, Check, Package, Plus, Printer, RefreshCw, ScanLine, Search, Shirt, ShoppingCart, Store, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCustomerSummary } from '../hooks/useCustomerSummary';
import { useProducts } from '../hooks/useProducts';
import { usePosCart } from '../hooks/usePosCart';
import { computeTotals } from '../lib/posMath';
import { formatPKR } from '../lib/format';
import { activeVariants, defaultVariant, hasVariants, stockFor, unitPriceFor } from '../lib/pricing';
import { LOW_STOCK_THRESHOLD } from '../components/StockBadge';
import VariantChooser from '../components/pos/VariantChooser';
import CustomerPanel from '../components/pos/CustomerPanel';
import PosCart from '../components/pos/PosCart';
import Receipt from '../components/pos/Receipt';

function availableUnits(product) {
  const variants = activeVariants(product);
  return variants.length
    ? variants.reduce((sum, variant) => sum + Number(variant.stock_count || 0), 0)
    : Number(product.stock_count || 0);
}

function stockLabel(stock) {
  if (stock <= 0) return { text: 'Out of stock', className: 'border-red-500/30 bg-red-500/10 text-red-300' };
  if (stock <= LOW_STOCK_THRESHOLD) return { text: 'Low stock', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' };
  return { text: 'In stock', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' };
}

export default function PosPage() {
  const { user, profile, isAdmin } = useAuth();
  const { products, loading: productsLoading, error: productsError, refresh: refreshProducts, realtimeStatus } = useProducts();
  const cart = usePosCart();
  const syncStock = cart.syncStock;
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [chooser, setChooser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [method, setMethod] = useState('cash');
  const [discount, setDiscount] = useState('');
  const [tendered, setTendered] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(null);
  const [heldSales, setHeldSales] = useState([]);
  const [heldOpen, setHeldOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [draftNumber, setDraftNumber] = useState(1);
  const [now, setNow] = useState(() => new Date());
  const scanRef = useRef(null);
  const submitLock = useRef(false);
  const flashTimer = useRef(null);
  const { summary, loading: summaryLoading, error: summaryError } = useCustomerSummary(customer?.id);
  const cashier = profile?.full_name || user?.email || 'Cashier';
  const draftLabel = `#${String(draftNumber).padStart(3, '0')}`;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    syncStock(products);
  }, [syncStock, products]);

  useEffect(() => {
    if (scanOpen) scanRef.current?.focus();
  }, [scanOpen]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const categories = useMemo(
    () => ['All', ...new Set(products.map((product) => product.category?.trim()).filter(Boolean))],
    [products]
  );
  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      if (category !== 'All' && product.category !== category) return false;
      if (!term) return true;
      return [product.name, product.sku, product.barcode]
        .some((value) => String(value ?? '').toLowerCase().includes(term))
        || activeVariants(product).some((variant) => String(variant.sku ?? '').toLowerCase().includes(term));
    });
  }, [products, category, search]);

  const creditAllowed = Boolean(customer) && Number(summary?.credit_limit ?? 0) > 0;
  const totals = computeTotals({ lines: cart.lines, discount, method, tendered, creditAllowed });
  const overLimit = creditAllowed && totals.shortBy > Number(summary?.available_credit ?? 0);
  const credit = {
    customerSelected: Boolean(customer),
    creditAllowed,
    creditAvailable: Number(summary?.available_credit ?? 0),
    overLimit,
    isAdmin,
    canSubmit: !overLimit || (isAdmin && overrideReason.trim().length >= 3),
    overrideReason,
    setOverrideReason,
  };
  const stockIssues = cart.lines.filter((line) => {
    const product = products.find((item) => item.id === line.product_id);
    if (!product || !product.is_active) return true;
    const variant = line.variant_id
      ? product.product_variants?.find((item) => item.id === line.variant_id && item.is_active)
      : null;
    if (line.variant_id && !variant) return true;
    return line.quantity > stockFor(product, variant);
  });
  const stockError = stockIssues.length
    ? 'One or more items are no longer available in the requested quantity. Update the cart before checkout.'
    : '';
  const connectionLost = ['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(realtimeStatus);
  const liveStatus = connectionLost
    ? 'Live updates unavailable · stock checked at checkout'
    : realtimeStatus === 'SUBSCRIBED'
      ? 'Live stock updates'
      : 'Connecting to live stock updates…';

  const showFlash = (type, text) => {
    setFlash({ type, text });
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 2600);
  };

  const addLine = (product, variant = null) => {
    const stock = stockFor(product, variant);
    const id = variant ? `${product.id}:${variant.id}` : product.id;
    const inCart = cart.lines.find((line) => line.id === id)?.quantity ?? 0;
    const label = variant ? `${product.name} ${variant.size}/${variant.color}` : product.name;
    if (stock <= 0) return showFlash('error', `${label} is out of stock.`);
    if (inCart >= stock) return showFlash('error', `Only ${stock} of ${label} available.`);
    cart.add(product, variant);
    showFlash('success', `Added ${label}.`);
  };

  const selectProduct = (product) => {
    if (availableUnits(product) <= 0) return showFlash('error', `${product.name} is out of stock.`);
    if (hasVariants(product)) setChooser(product);
    else addLine(product);
  };

  const submitScan = (event) => {
    event.preventDefault();
    const value = scanCode.trim().toLowerCase();
    if (!value) return;
    const product = products.find((item) =>
      [item.barcode, item.sku].some((code) => String(code ?? '').toLowerCase() === value)
    );
    if (product) {
      setScanCode('');
      selectProduct(product);
      scanRef.current?.focus();
      return;
    }
    const variantProduct = products.find((item) =>
      activeVariants(item).some((variant) => String(variant.sku ?? '').toLowerCase() === value)
    );
    const variant = variantProduct && activeVariants(variantProduct).find((item) => String(item.sku ?? '').toLowerCase() === value);
    setScanCode('');
    if (variantProduct && variant) addLine(variantProduct, variant);
    else showFlash('error', `No product found for barcode or SKU "${scanCode.trim()}".`);
    scanRef.current?.focus();
  };

  const resetDraft = () => {
    cart.clear();
    setCustomer(null);
    setDiscount('');
    setTendered('');
    setMethod('cash');
    setOverrideReason('');
    setError('');
    setDraftNumber((number) => number + 1);
    setMobileCartOpen(false);
  };

  const holdSale = () => {
    if (!cart.lines.length) return;
    setHeldSales((sales) => [{
      id: `${Date.now()}-${draftNumber}`,
      label: draftLabel,
      heldAt: new Date().toISOString(),
      lines: cart.lines.map((line) => ({ ...line })),
      customer,
      discount,
      tendered,
      method,
    }, ...sales]);
    resetDraft();
    showFlash('success', `Draft ${draftLabel} held on this device.`);
  };

  const resumeSale = (sale) => {
    if (cart.lines.length) {
      setHeldSales((sales) => [{
        id: `${Date.now()}-${draftNumber}`,
        label: draftLabel,
        heldAt: new Date().toISOString(),
        lines: cart.lines.map((line) => ({ ...line })),
        customer,
        discount,
        tendered,
        method,
      }, ...sales]);
    }
    cart.replace(sale.lines);
    setCustomer(sale.customer);
    setDiscount(sale.discount);
    setTendered(sale.tendered);
    setMethod(sale.method);
    setHeldSales((sales) => sales.filter((item) => item.id !== sale.id));
    setDraftNumber((number) => number + 1);
    setHeldOpen(false);
    setMobileCartOpen(false);
  };

  const cancelDraft = () => {
    if (cart.lines.length && !window.confirm('Cancel this unsaved sale and clear the cart?')) return;
    resetDraft();
    showFlash('success', 'Current draft cancelled.');
  };

  const completeSale = async () => {
    if (submitLock.current || !totals.canComplete || !credit.canSubmit || stockIssues.length || productsError) return;
    submitLock.current = true;
    setBusy(true);
    setError('');
    const saleLines = cart.lines.map((line) => ({ ...line }));
    try {
      const { data: order, error: rpcError } = await supabase.rpc('create_pos_sale', {
        p_items: saleLines.map((line) => ({
          product_id: line.product_id,
          variant_id: line.variant_id,
          quantity: line.quantity,
        })),
        p_customer_id: customer?.id ?? null,
        p_discount: totals.discount,
        p_payment_method: method,
        p_amount_received: totals.received,
        p_override_reason: overLimit && isAdmin ? overrideReason.trim() : null,
      });
      if (rpcError) throw rpcError;

      const { data: savedLines, error: itemsError } = await supabase.from('order_items')
        .select('quantity,unit_price,size,color,products(name,sku)')
        .eq('order_id', order.id);
      const receiptItems = itemsError
        ? saleLines.map((line) => ({
          name: line.name, size: line.size, color: line.color, sku: line.sku,
          quantity: line.quantity, price: line.price,
        }))
        : (savedLines ?? []).map((line) => ({
          name: line.products?.name ?? 'Item', sku: line.products?.sku ?? '', size: line.size, color: line.color,
          quantity: line.quantity, price: Number(line.unit_price),
        }));
      setReceipt({
        order,
        items: receiptItems,
        method,
        cashier,
        message: itemsError ? 'Sale completed, but saved receipt details could not be reloaded. Values shown are from the cart.' : '',
      });
      setReceiptOpen(true);
      cart.clear();
      setCustomer(null);
      setDiscount('');
      setTendered('');
      setMethod('cash');
      setOverrideReason('');
      setDraftNumber((number) => number + 1);
      setMobileCartOpen(false);
      refreshProducts();
    } catch (saleError) {
      setError(saleError.message || 'Sale failed. Please try again.');
    } finally {
      submitLock.current = false;
      setBusy(false);
      scanRef.current?.focus();
    }
  };

  const printLastReceipt = () => {
    if (receipt) setReceiptOpen(true);
  };

  const customerSlot = (
    <CustomerPanel
      selected={customer}
      onSelect={setCustomer}
      summary={summary}
      summaryLoading={summaryLoading}
      summaryError={summaryError}
    />
  );
  const cartProps = {
    lines: cart.lines,
    totals,
    method,
    setMethod,
    discount,
    setDiscount,
    tendered,
    setTendered,
    busy,
    error,
    onComplete: completeSale,
    onQty: cart.setQty,
    onRemove: cart.remove,
    onClear: cart.clear,
    customerSlot,
    credit,
    orderNumber: draftLabel,
    dateTime: now.toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }),
    cashier,
    heldCount: heldSales.length,
    onHold: holdSale,
    onShowHeld: () => setHeldOpen(true),
    onCancel: cancelDraft,
    onPrint: printLastReceipt,
    hasReceipt: Boolean(receipt),
    checkoutDisabled: Boolean(productsError) || stockIssues.length > 0,
    stockError,
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#080D14]">
      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(320px,36fr)_minmax(0,64fr)]">
        <div className="hidden min-h-0 lg:block"><PosCart {...cartProps} /></div>

        <section className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-[#253244] bg-[#0B111B] px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#FF9A45]">Retail point of sale</p>
                <h1 className="mt-0.5 text-lg font-semibold">Product catalog</h1>
              </div>
              <div className="flex items-center gap-2">
                <span title="Store selection is not supported by the current product/inventory schema." className="hidden items-center gap-1.5 rounded-lg border border-[#253244] px-2.5 py-2 text-[10px] text-[#91A0B5] sm:flex">
                  <Store size={13} className="text-[#FF9A45]" /> Default catalog
                </span>
                <button onClick={() => setScanOpen((open) => !open)} className="flex items-center gap-1.5 rounded-lg border border-[#253244] px-2.5 py-2 text-xs text-[#91A0B5] transition hover:border-[#FF7818] hover:text-[#FF9A45]" aria-expanded={scanOpen}>
                  <ScanLine size={14} /> <span className="hidden sm:inline">Scan</span>
                </button>
                <button onClick={refreshProducts} className="rounded-lg border border-[#253244] p-2 text-[#91A0B5] transition hover:border-[#FF7818] hover:text-[#FF9A45]" aria-label="Refresh products" title="Refresh products">
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#91A0B5]" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products by name, SKU or barcode…" aria-label="Search products" className="w-full rounded-lg border border-[#253244] bg-[#151F2B] py-2.5 pl-9 pr-3 text-xs text-[#F5F7FA] outline-none placeholder:text-[#91A0B5] focus:border-[#FF7818]" />
              </label>
              <span className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-[10px] ${connectionLost ? 'border-amber-500/30 bg-amber-500/5 text-amber-200' : 'border-[#253244] bg-[#151F2B] text-[#91A0B5]'}`}>
                <i className={`h-1.5 w-1.5 rounded-full ${realtimeStatus === 'SUBSCRIBED' ? 'bg-emerald-400' : 'bg-amber-300'}`} />
                {liveStatus}
              </span>
            </div>
            {scanOpen && (
              <form onSubmit={submitScan} className="mt-2 flex gap-2">
                <label className="relative min-w-0 flex-1">
                  <ScanLine size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#91A0B5]" />
                  <input ref={scanRef} value={scanCode} onChange={(event) => setScanCode(event.target.value)} placeholder="Scan or enter barcode / SKU, then press Enter" autoComplete="off" className="w-full rounded-lg border border-[#253244] bg-[#151F2B] py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#FF7818]" />
                </label>
                <button type="submit" className="rounded-lg bg-[#FF7818] px-3 text-xs font-semibold text-white transition hover:bg-[#FF9A45]">Add</button>
              </form>
            )}
          </div>

          {flash && <p role="status" className={`mx-4 mt-3 rounded-lg border px-3 py-2 text-xs sm:mx-5 ${flash.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200' : 'border-red-500/30 bg-red-500/5 text-red-300'}`}>{flash.type === 'success' ? <Check size={14} className="mr-1 inline" /> : <AlertCircle size={14} className="mr-1 inline" />}{flash.text}</p>}
          {productsError && <p role="alert" className="mx-4 mt-3 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300 sm:mx-5">Products unavailable: {productsError}. Refresh after connectivity returns.</p>}

          <div className="scrollbar-none flex shrink-0 gap-2 overflow-x-auto px-4 py-3 sm:px-5" aria-label="Product categories">
            {categories.map((name) => (
              <button key={name} onClick={() => setCategory(name)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] transition ${category === name ? 'border-[#FF7818] bg-[#FF7818] font-semibold text-white' : 'border-[#253244] bg-[#111A25] text-[#91A0B5] hover:border-[#FF7818]/60 hover:text-[#F5F7FA]'}`} aria-pressed={category === name}>
                {name}
              </button>
            ))}
          </div>

          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5">
            {productsLoading ? (
              <div role="status" aria-label="Loading products" className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 8 }, (_, index) => <div key={index} className="overflow-hidden rounded-xl border border-[#253244] bg-[#111A25]"><div className="aspect-[4/4.5] animate-pulse bg-[#151F2B]" /><div className="space-y-2 p-3"><div className="h-3 w-3/4 animate-pulse rounded bg-[#253244]" /><div className="h-3 w-1/2 animate-pulse rounded bg-[#253244]" /></div></div>)}
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center text-center">
                <Package size={28} className="text-[#253244]" />
                <p className="mt-3 text-sm font-medium">{search ? 'No matching products' : 'No products in this category'}</p>
                <p className="mt-1 text-xs text-[#91A0B5]">{search ? 'Try another name, SKU, barcode, or product code.' : 'Products will appear here when available in the catalog.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
                {visibleProducts.map((product) => {
                  const stock = availableUnits(product);
                  const status = stockLabel(stock);
                  const initialVariant = defaultVariant(product);
                  return (
                    <button key={product.id} onClick={() => selectProduct(product)} disabled={stock <= 0} className="group min-w-0 overflow-hidden rounded-xl border border-[#253244] bg-[#111A25] text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#FF7818]/60 hover:shadow-xl hover:shadow-black/20 disabled:cursor-not-allowed disabled:opacity-55">
                      <div className="relative aspect-[4/4.5] overflow-hidden bg-[#151F2B]">
                        {product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center text-[#91A0B5]"><Shirt size={36} /></div>}
                        <span className={`absolute left-2 top-2 rounded-md border px-2 py-1 text-[9px] font-medium ${status.className}`}>{status.text} · {stock}</span>
                        {hasVariants(product) && <span className="absolute right-2 top-2 rounded-md border border-[#253244] bg-[#080D14]/85 px-2 py-1 text-[9px] text-[#F5F7FA]">{activeVariants(product).length} variants</span>}
                        <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#FF7818] text-white opacity-0 shadow-lg transition group-hover:opacity-100"><Plus size={16} /></span>
                      </div>
                      <div className="space-y-1.5 p-3">
                        <p className="line-clamp-2 min-h-9 text-xs font-semibold leading-4 text-[#F5F7FA]">{product.name}</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[10px] text-[#91A0B5]">SKU {product.sku || '—'}</span>
                          <span className="shrink-0 text-xs font-bold text-[#FF9A45]">{formatPKR(unitPriceFor(product, initialVariant))}</span>
                        </div>
                        {product.category && <p className="truncate text-[10px] text-[#91A0B5]">{product.category}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[#253244] bg-[#0B111B] p-3 lg:hidden">
            <button onClick={() => setMobileCartOpen(true)} className="flex w-full items-center justify-between rounded-lg bg-[#FF7818] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-950/25 transition hover:bg-[#FF9A45]">
              <span className="flex items-center gap-2"><ShoppingCart size={16} /> Review cart · {cart.lines.reduce((sum, line) => sum + line.quantity, 0)} items</span>
              <span>{formatPKR(totals.payable)}</span>
            </button>
          </div>
        </section>
      </div>

      {mobileCartOpen && (
        <div className="fixed inset-0 z-[70] bg-black/70 lg:hidden">
          <button onClick={() => setMobileCartOpen(false)} className="absolute inset-0 h-full w-full" aria-label="Close billing drawer" />
          <div className="absolute inset-x-0 bottom-0 h-[92dvh] overflow-hidden rounded-t-2xl border-t border-[#253244] shadow-2xl">
            <PosCart {...cartProps} />
            <button onClick={() => setMobileCartOpen(false)} className="absolute right-3 top-3 rounded-md bg-[#151F2B] p-1.5 text-[#F5F7FA]" aria-label="Close cart"><X size={15} /></button>
          </div>
        </div>
      )}

      {chooser && <VariantChooser product={chooser} onPick={(variant) => { addLine(chooser, variant); setChooser(null); }} onClose={() => setChooser(null)} />}

      {heldOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
          <section role="dialog" aria-modal="true" aria-label="Held sales" className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#253244] bg-[#111A25] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-base font-semibold">Held sales</h2><p className="mt-1 text-xs text-[#91A0B5]">Temporary drafts on this device; they clear when this POS page closes.</p></div>
              <button onClick={() => setHeldOpen(false)} className="rounded-md p-1.5 text-[#91A0B5] hover:bg-[#151F2B]" aria-label="Close held sales"><X size={17} /></button>
            </div>
            {heldSales.length === 0 ? <p className="py-10 text-center text-sm text-[#91A0B5]">No held sales.</p> : (
              <ul className="mt-4 space-y-2">
                {heldSales.map((sale) => (
                  <li key={sale.id} className="flex items-center gap-3 rounded-xl border border-[#253244] bg-[#0B111B] p-3">
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium">Draft {sale.label} · {sale.lines.reduce((sum, line) => sum + line.quantity, 0)} items</p><p className="mt-1 truncate text-xs text-[#91A0B5]">{sale.customer?.full_name || 'Walk-in'} · held {new Date(sale.heldAt).toLocaleTimeString()}</p></div>
                    <button onClick={() => resumeSale(sale)} className="rounded-lg bg-[#FF7818] px-3 py-2 text-xs font-semibold text-white hover:bg-[#FF9A45]">Resume</button>
                    <button onClick={() => setHeldSales((items) => items.filter((item) => item.id !== sale.id))} className="rounded-md p-2 text-[#91A0B5] hover:bg-red-500/10 hover:text-red-300" aria-label={`Discard draft ${sale.label}`}><X size={15} /></button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {receipt && receiptOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4">
          <div className="flex max-h-[94vh] max-w-full flex-col gap-3 overflow-y-auto rounded-xl border border-[#253244] bg-[#111A25] p-4">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-emerald-300">Sale completed</h2><p className="text-xs text-[#91A0B5]">Order #{receipt.order.order_number}</p></div><button onClick={() => setReceiptOpen(false)} aria-label="Close receipt"><X size={18} /></button></div>
            {receipt.message && <p role="status" className="max-w-[302px] text-xs text-amber-300">{receipt.message}</p>}
            <Receipt sale={receipt} />
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#FF7818] py-2.5 text-sm font-semibold text-white transition hover:bg-[#FF9A45]"><Printer size={15} /> Print receipt</button>
              <button onClick={() => setReceiptOpen(false)} className="flex-1 rounded-lg border border-[#253244] py-2.5 text-sm text-[#F5F7FA] hover:border-[#FF7818]">New sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
