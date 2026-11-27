import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Minus, Plus, Shirt, Sparkles } from 'lucide-react';
import { useProduct } from '../hooks/useProducts';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPKR } from '../lib/format';
import {
  defaultVariant,
  findVariant,
  hasVariants,
  isOnSale,
  regularPriceFor,
  stockFor,
  unitPriceFor,
  variantOptions,
} from '../lib/pricing';
import StockBadge from '../components/StockBadge';
import AddToCartButton from '../components/AddToCartButton';
import WishlistButton from '../components/WishlistButton';
import VariantPicker from '../components/VariantPicker';
import VirtualTryOnModal from '../components/VirtualTryOnModal';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { product, loading, error } = useProduct(id);
  const [selection, setSelection] = useState({ size: null, color: null });
  const [qty, setQty] = useState(1);
  const [tryOnOpen, setTryOnOpen] = useState(false);

  const variantsExist = hasVariants(product);
  const { sizes, colors } = useMemo(() => variantOptions(product ?? {}), [product]);

  // Start on the first in-stock combination once the product loads.
  useEffect(() => {
    if (!product || !variantsExist) return;
    const first = defaultVariant(product);
    setSelection({ size: first?.size ?? null, color: first?.color ?? null });
  }, [product, variantsExist]);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-lime-500" /></div>;
  if (error || !product) {
    return (
      <div className="py-24 text-center">
        <p className="text-soft/50">{error || 'Product not found.'}</p>
        <Link to="/shop" className="mt-4 inline-block text-lime-400 hover:underline">Back to shop</Link>
      </div>
    );
  }

  const variant = variantsExist ? findVariant(product, selection.size, selection.color) : null;
  const stock = stockFor(product, variant);
  const soldOut = stock <= 0;
  const price = unitPriceFor(product, variant);
  const regular = regularPriceFor(product, variant);
  const onSale = isOnSale(product, variant);
  const safeQty = Math.min(qty, Math.max(stock, 1));

  // A size is available if some active variant with that size and the selected color has stock.
  const isSizeAvailable = (size) => (findVariant(product, size, selection.color)?.stock_count ?? 0) > 0;
  const isColorAvailable = (color) => (findVariant(product, selection.size, color)?.stock_count ?? 0) > 0;

  const choose = (patch) => {
    setSelection((prev) => ({ ...prev, ...patch }));
    setQty(1);
  };

  const openTryOn = () => {
    if (!user) return navigate('/login', { state: { from: location } });
    setTryOnOpen(true);
  };

  const addToCart = () => addItem(product, safeQty, variant);

  return (
    <div>
      <Link to="/shop" className="mb-8 inline-flex items-center gap-1.5 text-sm text-soft/50 transition hover:text-lime-400">
        <ArrowLeft className="h-4 w-4" /> Back to shop
      </Link>

      <div className="grid gap-10 md:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative md:col-span-6"
        >
          <div className="aspect-[3/4] overflow-hidden rounded-3xl border border-white/10 bg-teal/25 shadow-float">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center"><Shirt className="h-20 w-20 text-soft/20" /></div>
            )}
          </div>
          <WishlistButton productId={product.id} className="absolute right-4 top-4 !h-11 !w-11" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6 md:col-span-6 md:pt-6"
        >
          {product.category && <p className="text-xs uppercase tracking-[0.4em] text-lime-400">{product.category}</p>}
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">{product.name}</h1>

          <div className="flex flex-wrap items-center gap-4">
            <p className="font-display text-3xl font-semibold text-lime-400">{formatPKR(price)}</p>
            {onSale && <p className="text-lg text-soft/40 line-through">{formatPKR(regular)}</p>}
            {variantsExist ? (variant ? <StockBadge stock={stock} /> : null) : <StockBadge stock={stock} />}
          </div>

          {product.description && <p className="leading-relaxed text-soft/65">{product.description}</p>}
          {product.sku && <p className="text-xs text-soft/35">SKU: {variant?.sku ?? product.sku}</p>}

          {variantsExist && (
            <div className="space-y-5">
              <VariantPicker label="Size" options={sizes} selected={selection.size} isAvailable={isSizeAvailable} onSelect={(size) => choose({ size })} />
              <VariantPicker label="Color" options={colors} selected={selection.color} isAvailable={isColorAvailable} onSelect={(color) => choose({ color })} />
              {!variant && <p className="text-sm text-soft/50">This size and color combination is not offered.</p>}
              {variant && soldOut && <p className="text-sm text-red-400">This size and color is currently out of stock.</p>}
            </div>
          )}

          {!soldOut && (variant !== null || !variantsExist) ? (
            <div className="flex w-fit items-center gap-4 rounded-full border border-white/10 px-4 py-2">
              <button onClick={() => setQty(Math.max(1, safeQty - 1))} aria-label="Decrease"><Minus className="h-4 w-4" /></button>
              <span className="w-6 text-center">{safeQty}</span>
              <button
                onClick={() => setQty(Math.min(stock, safeQty + 1))}
                disabled={safeQty >= stock}
                className="disabled:opacity-30"
                aria-label="Increase"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <AddToCartButton
              disabled={soldOut || (variantsExist && !variant)}
              onAdd={addToCart}
              soldOutLabel="Out of Stock"
              className="flex-1 py-4"
            />
            <button
              onClick={openTryOn}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-lime-500/60 py-4 font-semibold text-lime-400 transition hover:bg-lime-500/10"
            >
              <Sparkles className="h-5 w-5" /> Virtual Try-On
            </button>
          </div>
        </motion.div>
      </div>

      {tryOnOpen && (
        <VirtualTryOnModal
          product={product}
          onClose={() => setTryOnOpen(false)}
          onAddToCart={() => addItem(product, 1, variant)}
        />
      )}
    </div>
  );
}
