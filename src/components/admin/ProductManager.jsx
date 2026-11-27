import { useMemo, useState } from 'react';
import { Layers, Loader2, Pencil, Plus, Search, Shirt } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPKR } from '../../lib/format';
import { LOW_STOCK_THRESHOLD } from '../StockBadge';
import ProductForm from './ProductForm';
import VariantsDialog from './VariantsDialog';
import { activeVariants, hasVariants } from '../../lib/pricing';

function stockUnits(product) {
  const variants = activeVariants(product);
  return variants.length
    ? variants.reduce((sum, variant) => sum + Number(variant.stock_count || 0), 0)
    : Number(product.stock_count || 0);
}

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
          className="w-16 rounded border border-[#253244] bg-[#080D14] px-2 py-1 text-xs focus:border-[#FF7818] focus:outline-none"
          aria-label={`Adjust stock for ${product.name}`}
        />
        <button onClick={apply} disabled={busy || !parseInt(delta, 10)} className="rounded bg-[#151F2B] px-2 py-1 text-xs transition hover:bg-[#FF7818] hover:text-white disabled:opacity-40">
          {busy ? '…' : 'Adjust'}
        </button>
      </div>
      {msg && <p className="mt-1 max-w-[12rem] text-[11px] text-red-400">{msg}</p>}
    </div>
  );
}

export default function ProductManager({ products, loading, lowOnly, setLowOnly }) {
  const [editing, setEditing] = useState(null); // null | 'new' | product
  const [variantsFor, setVariantsFor] = useState(null);
  const [q, setQ] = useState('');
  const [actionError, setActionError] = useState('');

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!lowOnly || (p.is_active && stockUnits(p) <= LOW_STOCK_THRESHOLD)) &&
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#91A0B5]" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU, barcode…"
            className="w-full rounded-lg border border-[#253244] bg-[#111A25] py-2 pl-9 pr-3 text-sm focus:border-[#FF7818] focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} className="accent-[#FF7818]" />
          Low stock only
        </label>
        <button onClick={() => setEditing('new')} className="flex items-center gap-1.5 rounded-lg bg-[#FF7818] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#FF9A45]">
          <Plus className="h-4 w-4" /> Add product
        </button>
      </div>

      {actionError && <p className="text-sm text-red-400">{actionError}</p>}

      {loading ? (
        <div role="status" className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#FF9A45]" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#253244] bg-[#111A25]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#151F2B] text-xs uppercase tracking-wide text-[#91A0B5]">
              <tr>
                <th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th>
                <th className="p-3">Stock</th><th className="p-3">Adjust</th><th className="p-3">Active</th><th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#253244]">
            {rows.map((p) => {
              const stock = stockUnits(p);
              return (
                <tr key={p.id} className={`transition hover:bg-[#151F2B]/60 ${p.is_active ? '' : 'opacity-50'}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-10 shrink-0 overflow-hidden rounded bg-[#151F2B]">
                        {p.image_url
                          ? <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                          : <div className="flex h-full items-center justify-center"><Shirt className="h-4 w-4 text-[#91A0B5]" /></div>}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate">{p.name}</p>
                        <p className="truncate text-xs text-[#91A0B5]">{p.sku || '—'} · {p.vton_category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-[#91A0B5]">{p.category || '—'}</td>
                  <td className="p-3">{formatPKR(p.price)}</td>
                  <td className={`p-3 font-semibold ${stock === 0 ? 'text-red-400' : stock <= LOW_STOCK_THRESHOLD ? 'text-amber-300' : ''}`}>
                    {stock}
                  </td>
                  <td className="p-3">
                    {hasVariants(p)
                      ? <p className="max-w-[12rem] text-xs text-[#91A0B5]">Managed per size/color ({activeVariants(p).length} active)</p>
                      : <StockAdjuster product={p} />}
                  </td>
                  <td className="p-3">
                    <input type="checkbox" checked={p.is_active} onChange={() => toggleActive(p)} className="accent-[#FF7818]" aria-label={`Toggle ${p.name} active`} />
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => setVariantsFor(p)} className="mr-2 rounded-full border border-[#253244] p-2 transition hover:border-[#FF7818] hover:text-[#FF9A45]" aria-label={`Variants and pricing for ${p.name}`}>
                      <Layers className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditing(p)} className="rounded-full border border-[#253244] p-2 transition hover:border-[#FF7818] hover:text-[#FF9A45]" aria-label={`Edit ${p.name}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center text-[#91A0B5]">No products found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductForm product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}

      {variantsFor && (
        <VariantsDialog product={variantsFor} onClose={() => setVariantsFor(null)} />
      )}
    </section>
  );
}
