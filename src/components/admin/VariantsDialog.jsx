import { useState } from 'react';
import { Loader2, Plus, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPKR } from '../../lib/format';
import { inputCls, labelCls, primaryBtnCls } from '../../lib/ui';

const toNumberOrNull = (v) => (v === '' || v == null ? null : Number(v));

function VariantRow({ variant, onSaved, onError }) {
  const [draft, setDraft] = useState({
    size: variant.size, color: variant.color, sku: variant.sku ?? '',
    price_override: variant.price_override ?? '', is_active: variant.is_active,
  });
  const [delta, setDelta] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from('product_variants').update({
      size: draft.size.trim(), color: draft.color.trim(), sku: draft.sku.trim() || null,
      price_override: toNumberOrNull(draft.price_override), is_active: draft.is_active, updated_at: new Date().toISOString(),
    }).eq('id', variant.id);
    setBusy(false);
    if (error) onError(error.code === '23505' ? `${draft.size}/${draft.color} already exists for this product, or the SKU is taken.` : error.message);
    else onSaved();
  };

  const adjust = async () => {
    const n = parseInt(delta, 10);
    if (!n) return;
    setBusy(true);
    const { error } = await supabase.rpc('adjust_variant_stock', { p_variant_id: variant.id, p_change: n, p_reason: 'manual_adjustment' });
    setBusy(false);
    if (error) onError(error.message);
    else { setDelta(''); onSaved(); }
  };

  return (
    <tr className={draft.is_active ? '' : 'opacity-50'}>
      <td className="p-2"><input aria-label="Size" className={inputCls} value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value })} /></td>
      <td className="p-2"><input aria-label="Color" className={inputCls} value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} /></td>
      <td className="p-2"><input aria-label="SKU" className={inputCls} value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} /></td>
      <td className="p-2"><input aria-label="Price override" type="number" min="0" className={inputCls} value={draft.price_override} onChange={(e) => setDraft({ ...draft, price_override: e.target.value })} placeholder="Default" /></td>
      <td className="p-2 text-center">
        <p className={`font-semibold ${variant.stock_count === 0 ? 'text-red-400' : ''}`}>{variant.stock_count}</p>
        <div className="mt-1 flex items-center gap-1">
          <input aria-label={`Adjust stock for ${variant.size} ${variant.color}`} type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="±" className="w-16 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs" />
          <button onClick={adjust} disabled={busy || !parseInt(delta, 10)} className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-lime-500 hover:text-black disabled:opacity-40">Adjust</button>
        </div>
      </td>
      <td className="p-2 text-center"><input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} className="accent-lime-500" aria-label="Active" /></td>
      <td className="p-2"><button onClick={save} disabled={busy} className="rounded-full border border-white/15 p-2 hover:border-lime-500 disabled:opacity-40" aria-label="Save variant">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}</button></td>
    </tr>
  );
}

export default function VariantsDialog({ product, onClose }) {
  const [variants, setVariants] = useState(product.product_variants ?? []);
  const [pricing, setPricing] = useState({
    sale_price: product.sale_price ?? '', brand: product.brand ?? '', is_new: product.is_new, is_featured: product.is_featured,
  });
  const [draft, setDraft] = useState({ size: '', color: '', sku: '', stock: '', price_override: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const fail = (text) => setMsg({ type: 'error', text });
  const ok = (text) => setMsg({ type: 'ok', text });

  const reload = async () => {
    const { data, error } = await supabase
      .from('product_variants').select('id, size, color, sku, price_override, stock_count, is_active')
      .eq('product_id', product.id).order('size').order('color');
    if (error) return fail(error.message);
    setVariants(data ?? []);
  };

  const savePricing = async () => {
    setBusy(true);
    const sale = toNumberOrNull(pricing.sale_price);
    if (sale != null && sale > Number(product.price)) {
      setBusy(false);
      return fail('Sale price cannot be higher than the list price.');
    }
    const { error } = await supabase.from('products').update({
      sale_price: sale, brand: pricing.brand.trim() || null, is_new: pricing.is_new, is_featured: pricing.is_featured,
      updated_at: new Date().toISOString(),
    }).eq('id', product.id);
    setBusy(false);
    if (error) fail(error.message);
    else ok('Pricing and flags saved.');
  };

  const addVariant = async (e) => {
    e.preventDefault();
    const size = draft.size.trim();
    const color = draft.color.trim();
    const initial = parseInt(draft.stock, 10) || 0;
    if (!size || !color) return fail('Enter both a size and a color.');
    if (initial < 0) return fail('Initial stock cannot be negative.');
    setBusy(true);
    const { data, error } = await supabase.from('product_variants').insert({
      product_id: product.id, size, color, sku: draft.sku.trim() || null,
      price_override: toNumberOrNull(draft.price_override), stock_count: 0,
    }).select('id').single();
    if (error) {
      setBusy(false);
      return fail(error.code === '23505' ? `${size}/${color} already exists for this product, or the SKU is taken.` : error.message);
    }
    if (initial > 0) {
      const { error: stockErr } = await supabase.rpc('adjust_variant_stock', { p_variant_id: data.id, p_change: initial, p_reason: 'initial_stock' });
      if (stockErr) { setBusy(false); return fail(`Variant added, but stock was not set: ${stockErr.message}`); }
    }
    setBusy(false);
    setDraft({ size: '', color: '', sku: '', stock: '', price_override: '' });
    ok(`Added ${size} / ${color}.`);
    reload();
  };

  const total = variants.reduce((n, v) => n + v.stock_count, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4">
      <div role="dialog" aria-modal="true" aria-label={`Variants and pricing for ${product.name}`} className="my-8 w-full max-w-4xl space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{product.name}</h2>
            <p className="text-xs text-neutral-500">List price {formatPKR(product.price)} · Total stock across variants {total}</p>
          </div>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        {msg.text && (
          <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.type === 'ok' ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>{msg.text}</p>
        )}

        <section className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <h3 className="text-sm font-semibold">Pricing and flags</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls} htmlFor="v-sale">Sale price (optional)</label>
              <input id="v-sale" type="number" min="0" className={inputCls} value={pricing.sale_price} onChange={(e) => setPricing({ ...pricing, sale_price: e.target.value })} />
            </div>
            <div>
              <label className={labelCls} htmlFor="v-brand">Brand</label>
              <input id="v-brand" className={inputCls} value={pricing.brand} onChange={(e) => setPricing({ ...pricing, brand: e.target.value })} />
            </div>
            <div className="flex items-end gap-4 pb-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={pricing.is_new} onChange={(e) => setPricing({ ...pricing, is_new: e.target.checked })} className="accent-lime-500" /> New arrival</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={pricing.is_featured} onChange={(e) => setPricing({ ...pricing, is_featured: e.target.checked })} className="accent-lime-500" /> Featured</label>
            </div>
          </div>
          <button onClick={savePricing} disabled={busy} className={`${primaryBtnCls} sm:w-auto sm:px-6`}>Save pricing</button>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Size and color variants</h3>
          <div className="overflow-x-auto rounded-xl border border-neutral-800">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-neutral-950 text-xs uppercase tracking-wide text-neutral-400">
                <tr><th className="p-2">Size</th><th className="p-2">Color</th><th className="p-2">SKU</th><th className="p-2">Price override</th><th className="p-2 text-center">Stock / adjust</th><th className="p-2 text-center">Active</th><th className="p-2" /></tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {variants.map((v) => (
                  <VariantRow key={v.id} variant={v} onSaved={() => { ok('Saved.'); reload(); }} onError={fail} />
                ))}
                {variants.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-neutral-500">No variants yet. Add a size and color below.</td></tr>}
              </tbody>
            </table>
          </div>

          <form onSubmit={addVariant} className="grid gap-2 rounded-xl border border-dashed border-neutral-700 p-3 sm:grid-cols-6">
            <input aria-label="New size" placeholder="Size (e.g. M)" className={inputCls} value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value })} />
            <input aria-label="New color" placeholder="Color (e.g. Black)" className={inputCls} value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
            <input aria-label="New SKU" placeholder="SKU (optional)" className={inputCls} value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} />
            <input aria-label="New price override" type="number" min="0" placeholder="Price override" className={inputCls} value={draft.price_override} onChange={(e) => setDraft({ ...draft, price_override: e.target.value })} />
            <input aria-label="Initial stock" type="number" min="0" placeholder="Initial stock" className={inputCls} value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />
            <button type="submit" disabled={busy} className="flex items-center justify-center gap-1.5 rounded-full bg-lime-500 px-4 py-2 text-sm font-semibold text-black hover:bg-lime-400 disabled:opacity-40">
              <Plus className="h-4 w-4" /> Add variant
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
