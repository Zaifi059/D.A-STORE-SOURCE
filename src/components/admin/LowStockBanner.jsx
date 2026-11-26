import { AlertTriangle } from 'lucide-react';
import { LOW_STOCK_THRESHOLD } from '../StockBadge';

export default function LowStockBanner({ products, onView }) {
  const low = products.filter((p) => p.is_active && p.stock_count <= LOW_STOCK_THRESHOLD);
  if (low.length === 0) return null;

  const out = low.filter((p) => p.stock_count === 0).length;
  const shown = low.slice(0, 6);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-4">
      <AlertTriangle className="h-6 w-6 shrink-0 text-amber-400" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-amber-300">
          {low.length} product{low.length > 1 ? 's' : ''} low on stock{out > 0 && ` (${out} out of stock)`}
        </p>
        <p className="truncate text-neutral-300">
          {shown.map((p) => `${p.name} (${p.stock_count})`).join(' · ')}
          {low.length > shown.length && ` · +${low.length - shown.length} more`}
        </p>
      </div>
      <button onClick={onView} className="rounded-full bg-amber-500 px-4 py-1.5 text-sm font-semibold text-black hover:bg-amber-400">
        View
      </button>
    </div>
  );
}
