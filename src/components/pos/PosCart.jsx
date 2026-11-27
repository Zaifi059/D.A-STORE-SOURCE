import { Banknote, Landmark, Loader2, Minus, Plus, Trash2 } from 'lucide-react';
import { formatPKR } from '../../lib/format';

const METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'bank_transfer', label: 'Bank transfer', icon: Landmark },
];

export default function PosCart({
  lines, totals, method, setMethod, discount, setDiscount, tendered, setTendered,
  busy, error, onComplete, onQty, onRemove, onClear, customerSlot, credit,
}) {
  const optCls = (active) =>
    `flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-semibold transition ${
      active ? 'border-lime-500 bg-lime-500 text-black' : 'border-neutral-700 hover:border-lime-500'
    }`;

  return (
    <aside className="flex h-full min-h-0 flex-col border-neutral-800 bg-neutral-900 lg:border-l">
      <div className="space-y-3 border-b border-neutral-800 p-3">{customerSlot}</div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {lines.length === 0 && <p className="py-10 text-center text-sm text-neutral-500">Scan or tap a product to begin.</p>}
        {lines.map((i) => (
          <div key={i.id} className="rounded-lg border border-neutral-800 bg-neutral-950 p-2">
            <div className="flex justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">{i.name}{i.size && <span className="text-neutral-500"> · {i.size} / {i.color}</span>}</span>
              <span className="font-semibold text-lime-400">{formatPKR(i.price * i.quantity)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-neutral-500">{formatPKR(i.price)} each</span>
              <div className="flex items-center gap-2">
                <button onClick={() => onQty(i.id, i.quantity - 1)} aria-label="Decrease"><Minus className="h-4 w-4" /></button>
                <span className="w-6 text-center text-sm">{i.quantity}</span>
                <button onClick={() => onQty(i.id, i.quantity + 1)} disabled={i.quantity >= i.stock_count} className="disabled:opacity-30" aria-label="Increase"><Plus className="h-4 w-4" /></button>
                <button onClick={() => onRemove(i.id)} className="text-neutral-500 hover:text-red-400" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 border-t border-neutral-800 p-3">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-neutral-400"><span>Subtotal</span><span>{formatPKR(totals.subtotal)}</span></div>
          <div className="flex items-center justify-between gap-2 text-neutral-400">
            <label htmlFor="pos-discount">Discount</label>
            <input
              id="pos-discount" type="number" min="0" inputMode="decimal" value={discount}
              onChange={(e) => setDiscount(e.target.value)} placeholder="0"
              className="w-28 rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1 text-right text-sm focus:border-lime-500 focus:outline-none"
            />
          </div>
          {totals.discountError && <p className="text-xs text-red-400">{totals.discountError}</p>}
          <div className="flex justify-between pt-1 text-xl font-bold"><span>Total</span><span className="text-lime-400">{formatPKR(totals.payable)}</span></div>
        </div>

        <div className="flex gap-2">
          {METHODS.map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => setMethod(value)} className={optCls(method === value)}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {(
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="number" min="0" inputMode="decimal" placeholder={method === 'cash' ? 'Cash received' : 'Amount received'} aria-label={method === 'cash' ? 'Cash received' : 'Amount received'}
                value={tendered} onChange={(e) => setTendered(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none"
              />
              <button onClick={() => setTendered(String(totals.payable))} className="rounded-lg border border-neutral-700 px-3 text-sm hover:border-lime-500">Exact</button>
            </div>
            {totals.shortBy > 0 && (
              <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs">
                {!credit.customerSelected && <p className="text-amber-200">Partial payment needs a customer account. Select a customer, or collect the full amount.</p>}
                {credit.customerSelected && !credit.creditAllowed && <p className="text-amber-200">Credit is not enabled for this customer. Collect the full amount.</p>}
                {credit.creditAllowed && !credit.overLimit && (
                  <p className="text-amber-100">{formatPKR(totals.shortBy)} goes on account. Available credit: {formatPKR(credit.creditAvailable)}.</p>
                )}
                {credit.creditAllowed && credit.overLimit && (
                  <div className="space-y-2">
                    <p className="text-red-300">Over the credit limit. Available credit is {formatPKR(credit.creditAvailable)}.</p>
                    {credit.isAdmin ? (
                      <input
                        value={credit.overrideReason} onChange={(e) => credit.setOverrideReason(e.target.value)}
                        placeholder="Reason for override (required)" aria-label="Credit limit override reason"
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs focus:border-lime-500 focus:outline-none"
                      />
                    ) : (
                      <p className="text-red-300">Only an admin can approve going over the limit.</p>
                    )}
                  </div>
                )}
              </div>
            )}
            {method === 'cash' && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Change due</span>
                <span className="font-semibold text-green-400">{formatPKR(totals.change)}</span>
              </div>
            )}
          </div>
        )}

        {error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-300">{error}</p>}

        <button
          onClick={onComplete} disabled={!totals.canComplete || busy || !credit.canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-lime-500 py-3 font-semibold text-black hover:bg-lime-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Complete sale
        </button>
        {lines.length > 0 && (
          <button onClick={onClear} className="w-full text-center text-xs text-neutral-500 hover:text-red-400">Clear cart</button>
        )}
      </div>
    </aside>
  );
}
