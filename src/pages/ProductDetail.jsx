import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Minus, Plus, Shirt, ShoppingBag, Sparkles } from 'lucide-react';
import { useProduct } from '../hooks/useProducts';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPKR } from '../lib/format';
import StockBadge from '../components/StockBadge';
import VirtualTryOnModal from '../components/VirtualTryOnModal';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { product, loading, error } = useProduct(id);
  const [qty, setQty] = useState(1);
  const [tryOnOpen, setTryOnOpen] = useState(false);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-amber-400" /></div>;
  if (error || !product) {
    return (
      <div className="py-24 text-center">
        <p className="text-neutral-400">{error || 'Product not found.'}</p>
        <Link to="/" className="mt-4 inline-block text-amber-400 hover:underline">Back to shop</Link>
      </div>
    );
  }

  const soldOut = product.stock_count <= 0;
  const safeQty = Math.min(qty, Math.max(product.stock_count, 1));

  const openTryOn = () => {
    if (!user) return navigate('/login', { state: { from: location } });
    setTryOnOpen(true);
  };

  return (
    <div>
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-amber-400">
        <ArrowLeft className="h-4 w-4" /> Back to shop
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-[3/4] overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center"><Shirt className="h-20 w-20 text-neutral-700" /></div>
          )}
        </div>

        <div className="space-y-5">
          {product.category && <p className="text-xs uppercase tracking-[0.3em] text-amber-400/80">{product.category}</p>}
          <h1 className="font-serif text-3xl font-bold">{product.name}</h1>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-semibold text-amber-400">{formatPKR(product.price)}</p>
            <StockBadge stock={product.stock_count} />
          </div>
          {product.description && <p className="leading-relaxed text-neutral-300">{product.description}</p>}
          {product.sku && <p className="text-xs text-neutral-500">SKU: {product.sku}</p>}

          {!soldOut && (
            <div className="flex w-fit items-center gap-4 rounded-full border border-neutral-700 px-4 py-2">
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

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => addItem(product, safeQty)}
              disabled={soldOut}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-amber-500 py-3 font-semibold text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShoppingBag className="h-5 w-5" /> {soldOut ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button
              onClick={openTryOn}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-amber-500 py-3 font-semibold text-amber-400 hover:bg-amber-500/10"
            >
              <Sparkles className="h-5 w-5" /> Virtual Try-On
            </button>
          </div>
        </div>
      </div>

      {tryOnOpen && (
        <VirtualTryOnModal
          product={product}
          onClose={() => setTryOnOpen(false)}
          onAddToCart={() => addItem(product, 1)}
        />
      )}
    </div>
  );
}
