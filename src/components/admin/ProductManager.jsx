import { useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Search, Shirt } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPKR } from '../../lib/format';
import { LOW_STOCK_THRESHOLD } from '../StockBadge';
import ProductForm from './ProductForm';

function StockAdjuster({ product }) {
  const [delta, setDelta] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const apply = async () => {
    const n = parseInt(delta, 10);
    if (!n) return;
    setBusy(true);
    setMsg('');
    const { error } = await supabase.rpc('adjust_stock', {
      p_product_id: product.id, p_change: n, p_reason: 'manual_adjustment',
    });
    setBusy(false);
    if (error) setMsg(error.message);
    else setDelta('');
  };

  return (
    <div>
      <div className="flex items-center gap-1">
        <input
          type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="±"
          className="w-16 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs focus:border-lime-500 focus:outline-none"
          aria-label={`Adjust stock for ${product.name}`}
        />
        <button onClick={apply} disabled={busy || !parseInt(delta, 10)} className="rounded bg-neutral-800 px-2 py-1 text-xs hover:bg-lime-500 hover:text-black disabled:opacity-40">
          {busy ? '…' : 'Adjust'}
        </button>
      </div>
      {msg && <p className="mt-1 max-w-[12rem] text-[11px] text-red-400">{msg}</p>}
    </div>
  );
}

export default function ProductManager({ products, loading, lowOnly, setLowOnly }) {
  const [editing, setEditing] = useState(null); // null | 'new' | product
  const [q, setQ] = useState('');
  const [actionError, setActionError] = useState('');

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!lowOnly || (p.is_active && p.stock_count <= LOW_STOCK_THRESHOLD)) &&
        (!term || [p.name, p.sku, p.barcode, p.category].some((v) => v?.toLowerCase().includes(term)))
    );
  }, [products, q, lowOnly]);

  const toggleActive = async (p) => {
    setActionError('');
    const { error } = await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id);
    if (error) setActionError(error.message);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU, barcode…"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 py-2 pl-9 pr-3 text-sm focus:border-lime-500 focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} className="accent-lime-500" />
          Low stock only
        </label>
        <button onClick={() => setEditing('new')} className="flex items-center gap-1.5 rounded-full bg-lime-500 px-4 py-2 text-sm font-semibold text-black hover:bg-lime-400">
          <Plus className="h-4 w-4" /> Add product
        </button>
      </div>

      {actionError && <p className="text-sm text-red-400">{actionError}</p>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-lime-400" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-neutral-900 text-xs uppercase tracking-wide text-neutral-400">
              <tr>
                <th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th>
                <th className="p-3">Stock</th><th className="p-3">Adjust</th><th className="p-3">Active</th><th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {rows.map((p) => (
                <tr key={p.id} className={p.is_active ? '' : 'opacity-50'}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-10 shrink-0 overflow-hidden rounded bg-neutral-800">
                        {p.image_url
                          ? <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                          : <div className="flex h-full items-center justify-center"><Shirt className="h-4 w-4 text-neutral-600" /></div>}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate">{p.name}</p>
                        <p className="truncate text-xs text-neutral-500">{p.sku || '—'} · {p.vton_category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-neutral-300">{p.category || '—'}</td>
                  <td className="p-3">{formatPKR(p.price)}</td>
                  <td className={`p-3 font-semibold ${p.stock_count === 0 ? 'text-red-400' : p.stock_count <= LOW_STOCK_THRESHOLD ? 'text-lime-400' : ''}`}>
                    {p.stock_count}
                  </td>
                  <td className="p-3"><StockAdjuster product={p} /></td>
                  <td className="p-3">
                    <input type="checkbox" checked={p.is_active} onChange={() => toggleActive(p)} className="accent-lime-500" aria-label={`Toggle ${p.name} active`} />
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => setEditing(p)} className="rounded-full border border-neutral-700 p-2 hover:border-lime-500" aria-label={`Edit ${p.name}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center text-neutral-500">No products found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductForm product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </section>
  );
}
