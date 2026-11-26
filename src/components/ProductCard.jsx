import { Link } from 'react-router-dom';
import { Shirt } from 'lucide-react';
import { formatPKR } from '../lib/format';
import StockBadge from './StockBadge';

export default function ProductCard({ product }) {
  const soldOut = product.stock_count <= 0;
  return (
    <Link
      to={`/product/${product.id}`}
      className="group overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 transition hover:border-amber-500/60"
    >
      <div className="relative aspect-[3/4] bg-neutral-800">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className={`h-full w-full object-cover transition group-hover:scale-105 ${soldOut ? 'opacity-50' : ''}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center"><Shirt className="h-12 w-12 text-neutral-600" /></div>
        )}
        <StockBadge stock={product.stock_count} className="absolute left-2 top-2" />
      </div>
      <div className="p-3">
        <p className="truncate text-sm text-neutral-300">{product.name}</p>
        <p className="mt-1 font-semibold text-amber-400">{formatPKR(product.price)}</p>
      </div>
    </Link>
  );
}
