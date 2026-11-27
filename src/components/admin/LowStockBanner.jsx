import { AlertTriangle } from 'lucide-react';
import { LOW_STOCK_THRESHOLD } from '../StockBadge';
import { activeVariants } from '../../lib/pricing';

const stockUnits = (product) => {
  const variants = activeVariants(product);
  return variants.length
    ? variants.reduce((sum, variant) => sum + Number(variant.stock_count || 0), 0)
    : Number(product.stock_count || 0);
};

export default function LowStockBanner({ products, onView }) {
  const low = products.filter((product) => product.is_active && stockUnits(product) <= LOW_STOCK_THRESHOLD);
  if (low.length === 0) return null;

  const out = low.filter((product) => stockUnits(product) === 0).length;
  const shown = low.slice(0, 6);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <AlertTriangle className="h-6 w-6 shrink-0 text-amber-300" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-amber-200">
          {low.length} product{low.length > 1 ? 's' : ''} low on stock{out > 0 && ` (${out} out of stock)`}
        </p>
        <p className="truncate text-[#F5F7FA]">
          {shown.map((product) => `${product.name} (${stockUnits(product)})`).join(' · ')}
          {low.length > shown.length && ` · +${low.length - shown.length} more`}
        </p>
      </div>
      <button onClick={onView} className="rounded-lg bg-[#FF7818] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#FF9A45]">
        View
      </button>
    </div>
  );
}
