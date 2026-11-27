import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Loader2, Shirt } from 'lucide-react';
import AddToCartButton from './AddToCartButton';
import { useProducts } from '../hooks/useProducts';
import { useCart } from '../context/CartContext';
import { formatPKR } from '../lib/format';
import { hasVariants, isOnSale, regularPriceFor, unitPriceFor } from '../lib/pricing';
import StockBadge from './StockBadge';

/**
 * Homepage showcase. Spotlights the newest in-stock product from live data,
 * with a mouse-responsive tilt and floating shadow. No placeholder content:
 * if there are no products, the hero renders nothing.
 */
export default function Hero() {
  const { products, loading } = useProducts();
  const { addItem } = useCart();
  const ref = useRef(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 120, damping: 18 });

  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  if (loading) {
    return <div className="flex justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-lime-500" /></div>;
  }

  const inStock = products.filter((p) => p.stock_count > 0);
  const spotlight = inStock[0] ?? products[0];
  if (!spotlight) return null;
  const rail = products.filter((p) => p.id !== spotlight.id).slice(0, 4);
  const soldOut = spotlight.stock_count <= 0;

  return (
    <section className="grid items-center gap-10 pb-20 md:grid-cols-12">
      {/* Oversized title */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 md:col-span-5"
      >
        {spotlight.category && (
          <p className="mb-4 text-xs uppercase tracking-[0.4em] text-lime-400">{spotlight.category}</p>
        )}
        <h1 className="font-display text-[clamp(3.25rem,9vw,7.5rem)] font-bold leading-[0.9] tracking-tight text-soft">
          {spotlight.name}
        </h1>
        <div className="mt-6 flex items-center gap-4">
          <p className="font-display text-3xl font-semibold text-lime-400">{formatPKR(unitPriceFor(spotlight))}</p>
          {isOnSale(spotlight) && <p className="text-soft/40 line-through">{formatPKR(regularPriceFor(spotlight))}</p>}
          <StockBadge stock={spotlight.stock_count} />
        </div>
        {spotlight.description && (
          <p className="mt-5 max-w-md leading-relaxed text-soft/60 line-clamp-3">{spotlight.description}</p>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {hasVariants(spotlight) ? (
            <Link to={`/product/${spotlight.id}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-lime-500 px-7 py-3.5 font-semibold text-midnight shadow-lime transition hover:bg-lime-400">
              Choose size &amp; color
            </Link>
          ) : (
            <AddToCartButton disabled={soldOut} onAdd={() => addItem(spotlight, 1)} />
          )}
          <Link
            to={`/product/${spotlight.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-5 py-3 text-sm font-medium transition hover:border-lime-500/60 hover:text-lime-400"
          >
            View details <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.div>

      {/* Floating product */}
      <div className="relative md:col-span-4" style={{ perspective: 1400 }}>
        <div className="absolute inset-0 -z-10 rounded-full bg-lime-500/10 blur-3xl" />
        <motion.div
          ref={ref}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          initial={{ opacity: 0, y: 60, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
          className="mx-auto w-full max-w-sm"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={spotlight.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="animate-drift overflow-hidden rounded-3xl border border-white/10 bg-teal/25 shadow-float"
            >
              <div className="aspect-[3/4]">
                {spotlight.image_url ? (
                  <img src={spotlight.image_url} alt={spotlight.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center"><Shirt className="h-20 w-20 text-soft/20" /></div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="mx-auto mt-4 h-6 w-3/4 rounded-[50%] bg-black/70 blur-xl" />
        </motion.div>
      </div>

      {/* Also in the drop */}
      {rail.length > 0 && (
        <motion.aside
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="md:col-span-3"
        >
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-soft/40">Also in the drop</p>
          <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0">
            {rail.map((p) => (
              <Link
                key={p.id}
                to={`/product/${p.id}`}
                className="group w-28 shrink-0 md:w-auto"
              >
                <div className="aspect-[3/4] overflow-hidden rounded-xl border border-white/5 bg-teal/30 transition duration-500 group-hover:border-lime-500/50">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center"><Shirt className="h-6 w-6 text-soft/20" /></div>
                  )}
                </div>
                <p className="mt-2 truncate text-xs text-soft/70">{p.name}</p>
              </Link>
            ))}
          </div>
        </motion.aside>
      )}
    </section>
  );
}
