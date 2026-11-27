import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Eye, Shirt } from 'lucide-react';
import { formatPKR } from '../lib/format';
import StockBadge from './StockBadge';
import WishlistButton from './WishlistButton';
import QuickViewModal from './QuickViewModal';

function ProductCard({ product }) {
  const [quickOpen, setQuickOpen] = useState(false);
  const soldOut = product.stock_count <= 0;
  const to = `/product/${product.id}`;

  return (
    <>
      <article
        style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 420px' }}
        className="group relative overflow-hidden rounded-2xl border border-white/5 bg-teal-deep/40 transition duration-500 hover:-translate-y-1 hover:border-lime-500/50 hover:shadow-lime"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-teal/30">
          {/* Stretched link: covers the image but sits under the controls below. */}
          <Link to={to} aria-label={product.name} className="absolute inset-0 z-0" />
          {product.image_url ? (
            <img
              src={product.image_url}
              alt=""
              loading="lazy"
              className={`pointer-events-none h-full w-full object-cover transition duration-700 group-hover:scale-105 ${soldOut ? 'opacity-50' : ''}`}
            />
          ) : (
            <div className="flex h-full items-center justify-center"><Shirt className="h-12 w-12 text-soft/20" /></div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-midnight/80 to-transparent" />
          <StockBadge stock={product.stock_count} className="pointer-events-none absolute left-3 top-3" />

          <WishlistButton productId={product.id} className="absolute right-3 top-3 z-10" />

          <button
            type="button"
            onClick={() => setQuickOpen(true)}
            className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 translate-y-2 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 bg-midnight/70 px-4 py-2 text-xs font-medium text-soft opacity-100 backdrop-blur-md transition duration-300 hover:border-lime-500/60 hover:text-lime-400 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
          >
            <Eye className="h-3.5 w-3.5" /> Quick view
          </button>
        </div>

        <Link to={to} className="block p-3.5">
          <p className="truncate text-sm text-soft/85">{product.name}</p>
          <p className="mt-1 font-semibold text-lime-400">{formatPKR(product.price)}</p>
        </Link>
      </article>

      <AnimatePresence>
        {quickOpen && <QuickViewModal product={product} onClose={() => setQuickOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

// Memoized: grid re-renders (filters, realtime stock) skip cards whose data did not change.
export default memo(ProductCard);
