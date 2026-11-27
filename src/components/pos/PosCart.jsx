import { Banknote, Clock3, Landmark, Loader2, Minus, Plus, Printer, ReceiptText, Trash2, UserRound } from 'lucide-react';
import { formatPKR } from '../../lib/format';

const METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'bank_transfer', label: 'Bank transfer', icon: Landmark },
];

export default function PosCart({
  lines, totals, method, setMethod, discount, setDiscount, tendered, setTendered,
  busy, error, onComplete, onQty, onRemove, onClear, customerSlot, credit,
  orderNumber, dateTime, cashier, heldCount, onHold, onShowHeld, onCancel,
  onPrint, hasReceipt, checkoutDisabled, stockError,
}) {
  const paymentMethodClass = (active) => `flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition ${
    active ? 'border-[#FF7818] bg-[#FF7818]/10 text-[#FF9A45]' : 'border-[#253244] text-[#91A0B5] hover:border-[#FF7818]/60 hover:text-[#F5F7FA]'
  }`;

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-[#253244] bg-[#0B111B]">
      <div className="shrink-0 border-b border-[#253244] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#FF9A45]">Billing / checkout</p>
            <h2 className="mt-1 text-base font-semibold">Draft {orderNumber}</h2>
          </div>
          <button onClick={onShowHeld} className="flex items-center gap-1.5 rounded-lg border border-[#253244] px-2.5 py-1.5 text-[10px] text-[#91A0B5] transition hover:border-[#FF7818] hover:text-[#FF9A45]" title="Held sales stay on this device until the POS page is closed">
            <ReceiptText size={13} /> Held <span className="rounded bg-[#151F2B] px-1.5 py-0.5">{heldCount}</span>
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-[#91A0B5]">
          <div className="flex min-w-0 items-center gap-1.5"><Clock3 size={12} className="shrink-0 text-[#FF9A45]" /><span className="truncate">{dateTime}</span></div>
          <div className="flex min-w-0 items-center gap-1.5"><UserRound size={12} className="shrink-0 text-[#FF9A45]" /><span className="truncate">{cashier}</span></div>
        </div>
      </div>

      <div className="shrink-0 border-b border-[#253244] p-3">{customerSlot}</div>

      <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#F5F7FA]">Cart items <span className="ml-1 text-[#91A0B5]">({lines.reduce((sum, line) => sum + line.quantity, 0)})</span></h3>
          <p className="mt-1 text-[10px] text-[#91A0B5]">Review size, color and quantity</p>
        </div>
        {lines.length > 0 && <button onClick={onClear} className="text-[10px] text-[#91A0B5] transition hover:text-red-300">Clear cart</button>}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {lines.length === 0 ? (
          <div className="flex h-full min-h-28 flex-col items-center justify-center gap-2 text-center text-xs text-[#91A0B5]">
            <ReceiptText size={22} className="text-[#253244]" />
            <p>Your sale is empty.</p>
            <p className="text-[10px]">Choose a product from the catalog to begin.</p>
          </div>
        ) : lines.map((line) => (
          <article key={line.id} className="rounded-xl border border-[#253244] bg-[#111A25] p-2.5">
            <div className="flex gap-2.5">
              <div className="h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-[#151F2B]">
                {line.image_url ? <img src={line.image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[#91A0B5]"><ReceiptText size={16} /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-[#F5F7FA]">{line.name}</p>
                    <p className="mt-0.5 truncate text-[10px] text-[#91A0B5]">
                      {line.size ? `${line.size} / ${line.color}` : 'Standard'} · SKU {line.sku || '—'}
                    </p>
                  </div>
                  <button onClick={() => onRemove(line.id)} className="shrink-0 rounded p-1 text-[#91A0B5] transition hover:bg-red-500/10 hover:text-red-300" aria-label={`Remove ${line.name}`}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => onQty(line.id, line.quantity - 1)} className="rounded-md border border-[#253244] p-1 text-[#91A0B5] hover:border-[#FF7818] hover:text-[#FF9A45]" aria-label={`Decrease ${line.name}`}><Minus size={12} /></button>
                    <span className="w-5 text-center text-xs tabular-nums">{line.quantity}</span>
                    <button onClick={() => onQty(line.id, line.quantity + 1)} disabled={line.quantity >= line.stock_count} className="rounded-md border border-[#253244] p-1 text-[#91A0B5] hover:border-[#FF7818] hover:text-[#FF9A45] disabled:opacity-30" aria-label={`Increase ${line.name}`}><Plus size={12} /></button>
                    <span className="ml-1 text-[10px] text-[#91A0B5]">{formatPKR(line.price)} ea.</span>
                  </div>
                  <b className="shrink-0 text-xs text-[#F5F7FA]">{formatPKR(line.price * line.quantity)}</b>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="max-h-[58%] shrink-0 space-y-2 overflow-y-auto border-t border-[#253244] bg-[#0B111B] p-3">
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-[#91A0B5]"><span>Subtotal</span><span>{formatPKR(totals.subtotal)}</span></div>
          <div className="flex items-center justify-between gap-2 text-[#91A0B5]">
            <label htmlFor="pos-discount">Discount</label>
            <input id="pos-discount" type="number" min="0" max={totals.subtotal} step="0.01" inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value)} placeholder="0.00" className="w-24 rounded-md border border-[#253244] bg-[#080D14] px-2 py-1.5 text-right text-xs text-[#F5F7FA] outline-none focus:border-[#FF7818]" />
          </div>
          {totals.discountError && <p className="text-[10px] text-red-300">{totals.discountError}</p>}
          <div className="flex justify-between text-[#91A0B5]"><span>Tax</span><span title="No tax rate is configured in the current business settings">Not configured</span></div>
          <div className="flex justify-between border-t border-[#253244] pt-2 text-sm font-bold"><span>Grand total</span><span className="text-[#FF9A45]">{formatPKR(totals.payable)}</span></div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {METHODS.map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => setMethod(value)} className={paymentMethodClass(method === value)} aria-pressed={method === value}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="number" min="0" max={method === 'bank_transfer' ? totals.payable : undefined} step="0.01" inputMode="decimal" value={tendered} onChange={(event) => setTendered(event.target.value)} placeholder={method === 'cash' ? 'Cash received' : 'Transfer received'} aria-label={method === 'cash' ? 'Cash received' : 'Transfer received'} className="min-w-0 flex-1 rounded-lg border border-[#253244] bg-[#080D14] px-3 py-2 text-xs text-[#F5F7FA] outline-none focus:border-[#FF7818]" />
          <button onClick={() => setTendered(String(totals.payable))} className="rounded-lg border border-[#253244] px-3 text-[10px] text-[#91A0B5] transition hover:border-[#FF7818] hover:text-[#FF9A45]">Exact</button>
        </div>
        {totals.paymentError && <p className="text-[10px] text-red-300">{totals.paymentError}</p>}
        {totals.shortBy > 0 && (
          <div className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[10px]">
            <div className="flex justify-between text-amber-200"><span>Remaining balance</span><span>{formatPKR(totals.shortBy)}</span></div>
            {!credit.customerSelected && <p className="text-amber-200">Partial payment needs a customer account.</p>}
            {credit.customerSelected && !credit.creditAllowed && <p className="text-amber-200">Credit is not enabled for this customer.</p>}
            {credit.creditAllowed && !credit.overLimit && <p className="text-amber-100">Available account credit: {formatPKR(credit.creditAvailable)}.</p>}
            {credit.creditAllowed && credit.overLimit && (
              <div className="space-y-2">
                <p className="text-red-300">Credit limit exceeded. Available: {formatPKR(credit.creditAvailable)}.</p>
                {credit.isAdmin ? (
                  <input value={credit.overrideReason} onChange={(event) => credit.setOverrideReason(event.target.value)} placeholder="Admin override reason (required)" aria-label="Credit limit override reason" className="w-full rounded-md border border-[#253244] bg-[#080D14] px-2 py-1.5 text-[10px] text-[#F5F7FA] outline-none focus:border-[#FF7818]" />
                ) : <p className="text-red-300">An administrator must approve an override.</p>}
              </div>
            )}
          </div>
        )}
        {method === 'cash' && totals.change > 0 && <div className="flex justify-between text-xs"><span className="text-[#91A0B5]">Change due</span><span className="font-semibold text-emerald-300">{formatPKR(totals.change)}</span></div>}
        {stockError && <p role="alert" className="text-[10px] text-red-300">{stockError}</p>}
        {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-[10px] text-red-300">{error}</p>}

        <button onClick={onComplete} disabled={!totals.canComplete || busy || !credit.canSubmit || checkoutDisabled} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF7818] py-3 text-sm font-bold text-white shadow-lg shadow-orange-950/25 transition hover:bg-[#FF9A45] disabled:cursor-not-allowed disabled:opacity-40">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Banknote size={16} />}
          {busy ? 'Completing sale…' : 'Complete payment'}
        </button>
        <div className="grid grid-cols-3 gap-1.5">
          <button onClick={onHold} disabled={!lines.length || busy} className="rounded-md border border-[#253244] px-1 py-2 text-[9px] text-[#91A0B5] transition hover:border-[#FF7818] hover:text-[#FF9A45] disabled:opacity-40">Hold sale</button>
          <button onClick={onCancel} disabled={!lines.length || busy} className="rounded-md border border-[#253244] px-1 py-2 text-[9px] text-[#91A0B5] transition hover:border-red-500/50 hover:text-red-300 disabled:opacity-40">Cancel order</button>
          <button onClick={onPrint} disabled={!hasReceipt} className="flex items-center justify-center gap-1 rounded-md border border-[#253244] px-1 py-2 text-[9px] text-[#91A0B5] transition hover:border-[#FF7818] hover:text-[#FF9A45] disabled:opacity-40"><Printer size={11} /> Print</button>
        </div>
      </div>
    </aside>
  );
}
