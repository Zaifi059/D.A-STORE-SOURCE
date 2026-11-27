import { useEffect, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { deleteProductImage, uploadProductImage } from '../../lib/storage';

const inputCls =
  'w-full rounded-lg border border-[#253244] bg-[#080D14] px-3 py-2 text-sm text-[#F5F7FA] outline-none placeholder:text-[#91A0B5] focus:border-[#FF7818]';

const blank = {
  name: '', description: '', price: '', category: '', vton_category: 'auto',
  barcode: '', sku: '', stock_count: '0', is_active: true,
};

// public URL -> storage path inside the `products` bucket
const pathFromUrl = (url) => url?.split('/object/public/products/')[1] ?? null;

export default function ProductForm({ product, onClose }) {
  const isEdit = !!product;
  const [f, setF] = useState(
    isEdit
      ? {
          name: product.name, description: product.description ?? '', price: String(product.price),
          category: product.category ?? '', vton_category: product.vton_category,
          barcode: product.barcode ?? '', sku: product.sku ?? '',
          stock_count: String(product.stock_count), is_active: product.is_active,
        }
      : blank
  );
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(product?.image_url ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const id = product?.id ?? crypto.randomUUID();
      let image_url = product?.image_url ?? null;

      if (file) {
        const up = await uploadProductImage(file, id);
        image_url = up.publicUrl;
      }

      const row = {
        name: f.name.trim(),
        description: f.description.trim() || null,
        price: Number(f.price),
        category: f.category.trim() || null,
        vton_category: f.vton_category,
        barcode: f.barcode.trim() || null,
        sku: f.sku.trim() || null,
        is_active: f.is_active,
        image_url,
      };

      if (isEdit) {
        const { error: err } = await supabase.from('products').update(row).eq('id', id);
        if (err) throw err;
        const oldPath = file ? pathFromUrl(product.image_url) : null;
        if (oldPath) deleteProductImage(oldPath).catch(() => {}); // best-effort cleanup
      } else {
        const initial = Math.max(0, parseInt(f.stock_count, 10) || 0);
        const { error: err } = await supabase.from('products').insert({ id, ...row, stock_count: initial });
        if (err) throw err;
        if (initial > 0) {
          await supabase.from('inventory_logs').insert({ product_id: id, change_amount: initial, reason: 'initial_stock' });
        }
      }
      onClose();
    } catch (err) {
      setError(err.code === '23505' ? 'That barcode or SKU already exists.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/80" onClick={busy ? undefined : onClose} />
      <form onSubmit={submit} className="relative max-h-[92vh] w-full max-w-xl space-y-3 overflow-y-auto rounded-2xl border border-[#253244] bg-[#111A25] p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit product' : 'Add product'}</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <label className="flex cursor-pointer items-center gap-4 rounded-lg border border-dashed border-[#253244] p-3 transition hover:border-[#FF7818]">
          {preview
            ? <img src={preview} alt="" className="h-20 w-16 rounded object-cover" />
            : <div className="flex h-20 w-16 items-center justify-center rounded bg-[#151F2B]"><ImagePlus className="h-6 w-6 text-[#FF9A45]" /></div>}
          <span className="text-sm text-[#91A0B5]">Click to {preview ? 'replace' : 'upload'} image (JPG, PNG, WebP · max 5 MB)</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>

        <input required placeholder="Product name" value={f.name} onChange={set('name')} className={inputCls} />
        <textarea rows={2} placeholder="Description" value={f.description} onChange={set('description')} className={inputCls} />

        <div className="grid grid-cols-2 gap-3">
          <input required type="number" min="0" step="0.01" placeholder="Price (Rs.)" value={f.price} onChange={set('price')} className={inputCls} />
          <input placeholder="Category" value={f.category} onChange={set('category')} className={inputCls} />
          <select value={f.vton_category} onChange={set('vton_category')} className={inputCls} aria-label="Try-on category">
            <option value="auto">Try-on: Auto</option>
            <option value="tops">Try-on: Tops</option>
            <option value="bottoms">Try-on: Bottoms</option>
            <option value="one-pieces">Try-on: One-pieces</option>
          </select>
          {isEdit
            ? <input disabled value={`Stock: ${product.stock_count} (use Adjust in table)`} className={`${inputCls} opacity-60`} />
            : <input type="number" min="0" placeholder="Initial stock" value={f.stock_count} onChange={set('stock_count')} className={inputCls} />}
          <input placeholder="Barcode" value={f.barcode} onChange={set('barcode')} className={inputCls} />
          <input placeholder="SKU" value={f.sku} onChange={set('sku')} className={inputCls} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.is_active} onChange={(e) => setF((s) => ({ ...s, is_active: e.target.checked }))} className="accent-[#FF7818]" />
          Active (visible in store and POS)
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF7818] py-2.5 font-semibold text-white transition hover:bg-[#FF9A45] disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {isEdit ? 'Save changes' : 'Create product'}
        </button>
      </form>
    </div>
  );
}
