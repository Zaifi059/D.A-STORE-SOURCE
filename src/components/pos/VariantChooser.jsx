import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { defaultVariant, findVariant, unitPriceFor, variantOptions } from '../../lib/pricing';
import { formatPKR } from '../../lib/format';
import VariantPicker from '../VariantPicker';

/** Modal for choosing a size and color before a variant product goes into the POS cart. */
export default function VariantChooser({ product, onPick, onClose }) {
  const { sizes, colors } = useMemo(() => variantOptions(product), [product]);
  const first = defaultVariant(product);
  const [selection, setSelection] = useState({ size: first?.size ?? null, color: first?.color ?? null });

  const variant = findVariant(product, selection.size, selection.color);
  const stock = variant?.stock_count ?? 0;
  const isSizeAvailable = (size) => (findVariant(product, size, selection.color)?.stock_count ?? 0) > 0;
  const isColorAvailable = (color) => (findVariant(product, selection.size, color)?.stock_count ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
      <div role="dialog" aria-modal="true" aria-label={`Choose options for ${product.name}`} className="w-full max-w-md space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{product.name}</p>
            <p className="text-sm text-lime-400">{formatPKR(variant ? unitPriceFor(product, variant) : unitPriceFor(product))}</p>
          </div>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <VariantPicker label="Size" options={sizes} selected={selection.size} isAvailable={isSizeAvailable} onSelect={(size) => setSelection((s) => ({ ...s, size }))} />
        <VariantPicker label="Color" options={colors} selected={selection.color} isAvailable={isColorAvailable} onSelect={(color) => setSelection((s) => ({ ...s, color }))} />

        <p className="text-sm text-neutral-400">
          {!variant ? 'This combination is not offered.' : stock > 0 ? `${stock} in stock` : 'Out of stock for this combination.'}
        </p>

        <button
          onClick={() => onPick(variant)}
          disabled={!variant || stock <= 0}
          className="w-full rounded-full bg-lime-500 py-2.5 font-semibold text-black hover:bg-lime-400 disabled:opacity-40"
        >
          Add to cart
        </button>
      </div>
    </div>
  );
}
