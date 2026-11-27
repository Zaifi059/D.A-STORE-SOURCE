import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Minus, Plus, Shirt, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPKR } from '../lib/format';
import { hasVariants, isOnSale, regularPriceFor, unitPriceFor } from '../lib/pricing';
import StockBadge from './StockBadge';
import AddToCartButton from './AddToCartButton';
import WishlistButton from './WishlistButton';

/** Lightweight product preview over the shop. Uses the same cart logic as the product page. */
export default function QuickViewModal({ product, onClose }) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const soldOut = product.stock_count <= 0;
  const safeQty = Math.min(qty, Math.max(product.stock_count, 1));

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Quick view: ${product.name}`}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative grid max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-midnight shadow-float md:grid-cols-2"
      >
        <div className="aspect-[3/4] bg-teal/30 md:aspect-auto">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full min-h-64 items-center justify-center"><Shirt className="h-16 w-16 text-soft/20" /></div>
          )}
        </div>

        <div className="flex flex-col gap-4 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            {product.category ? <p className="text-xs uppercase tracking-[0.3em] text-lime-400">{product.category}</p> : <span />}
            <div className="flex items-center gap-2">
              <WishlistButton productId={product.id} />
              <button onClick={onClose} aria-label="Close quick view" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 hover:border-lime-500/50">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <h3 className="font-display text-3xl font-bold leading-tight">{product.name}</h3>
          <div className="flex items-center gap-3">
            <p className="font-display text-2xl font-semibold text-lime-400">{formatPKR(unitPriceFor(product))}</p>
            {isOnSale(product) && <p className="text-soft/40 line-through">{formatPKR(regularPriceFor(product))}</p>}
            <StockBadge stock={product.stock_count} />
          </div>
          {product.description && <p className="line-clamp-4 text-sm leading-relaxed text-soft/60">{product.description}</p>}

          {!soldOut && (
            <div className="flex w-fit items-center gap-4 rounded-full border border-white/10 px-4 py-2">
              <button onClick={() => setQty(Math.max(1, safeQty - 1))} aria-label="Decrease"><Minus className="h-4 w-4" /></button>
              <span className="w-6 text-center">{safeQty}</span>
              <button
                onClick={() => setQty(Math.min(product.stock_count, safeQty + 1))}
                disabled={safeQty >= product.stock_count}
                className="disabled:opacity-30"
                aria-label="Increase"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-3">
            {hasVariants(product) ? (
              <p className="text-center text-sm text-soft/60">Choose a size and color on the product page.</p>
            ) : (
              <AddToCartButton disabled={soldOut} onAdd={() => addItem(product, safeQty)} className="w-full" />
            )}
            <Link to={`/product/${product.id}`} onClick={onClose} className="text-center text-sm text-soft/60 underline-offset-4 hover:text-lime-400 hover:underline">
              View full details
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
