import { Banknote, CreditCard, Loader2, Minus, Plus, Trash2 } from 'lucide-react';
import { formatPKR } from '../../lib/format';

export default function PosCart({
  cart, method, setMethod, tendered, setTendered, change, canComplete, busy, error, onComplete,
}) {
  const optCls = (active) =>
    `flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-semibold ${
      active ? 'border-amber-500 bg-amber-500 text-black' : 'border-neutral-700 hover:border-amber-500'
    }`;

  return (
    <aside className="flex h-full min-h-0 flex-col border-neutral-800 bg-neutral-900 lg:border-l">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {cart.items.length === 0 && <p className="py-12 text-center text-sm text-neutral-500">Scan or tap a product to begin.</p>}
        {cart.items.map((i) => (
          <div key={i.id} className="rounded-lg border border-neutral-800 bg-neutral-950 p-2">
            <div className="flex justify-between gap-2 text-sm">
              <span className="truncate">{i.name}</span>
              <span className="font-semibold text-amber-400">{formatPKR(i.price * i.quantity)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-neutral-500">{formatPKR(i.price)} each</span>
              <div className="flex items-center gap-2">
                <button onClick={() => cart.setQty(i.id, i.quantity - 1)} aria-label="Decrease"><Minus className="h-4 w-4" /></button>
                <span className="w-6 text-center text-sm">{i.quantity}</span>
                <button onClick={() => cart.setQty(i.id, i.quantity + 1)} disabled={i.quantity >= i.stock_count} className="disabled:opacity-30" aria-label="Increase"><Plus className="h-4 w-4" /></button>
                <button onClick={() => cart.remove(i.id)} className="text-neutral-500 hover:text-red-400" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 border-t border-neutral-800 p-3">
        <div className="flex justify-between text-xl font-bold">
          <span>Total</span><span className="text-amber-400">{formatPKR(cart.total)}</span>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setMethod('cash')} className={optCls(method === 'cash')}><Banknote className="h-4 w-4" /> Cash</button>
          <button onClick={() => setMethod('card')} className={optCls(method === 'card')}><CreditCard className="h-4 w-4" /> Card</button>
        </div>

        {method === 'cash' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="number" min="0" inputMode="decimal" placeholder="Cash received"
                value={tendered} onChange={(e) => setTendered(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              />
              <button onClick={() => setTendered(String(cart.total))} className="rounded-lg border border-neutral-700 px-3 text-sm hover:border-amber-500">Exact</button>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Change due</span>
              <span className="font-semibold text-green-400">{formatPKR(change)}</span>
            </div>
          </div>
        )}

        {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-300">{error}</p>}

        <button
          onClick={onComplete} disabled={!canComplete}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3 font-semibold text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Complete Sale
        </button>
        {cart.items.length > 0 && (
          <button onClick={cart.clear} className="w-full text-center text-xs text-neutral-500 hover:text-red-400">Clear cart</button>
        )}
      </div>
    </aside>
  );
}
