import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, Shirt, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPKR } from '../lib/format';

export default function CartDrawer() {
  const navigate = useNavigate();
  const { items, subtotal, isOpen, closeCart, setQuantity, removeItem } = useCart();

  const goCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
      <div
        onClick={closeCart}
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-midnight shadow-float transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
            <ShoppingBag className="h-5 w-5 text-lime-500" /> Your Cart
          </h2>
          <button onClick={closeCart} aria-label="Close cart" className="rounded-full p-1 transition hover:bg-white/5"><X className="h-6 w-6" /></button>
        </div>

        <div className="scrollbar-none flex-1 space-y-3 overflow-y-auto p-5">
          {items.length === 0 && <p className="py-16 text-center text-soft/40">Your cart is empty.</p>}
          <AnimatePresence initial={false}>
            {items.map((i) => (
              <motion.div
                key={i.id}
                layout
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 60, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                transition={{ duration: 0.35 }}
                className="flex gap-3 overflow-hidden rounded-2xl border border-white/5 bg-teal-deep/50 p-3"
              >
                <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-teal/30">
                  {i.image_url ? (
                    <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center"><Shirt className="h-6 w-6 text-soft/20" /></div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate text-sm">{i.name}</p>
                  {i.size && <p className="truncate text-xs text-soft/50">{i.size} / {i.color}</p>}
                  <p className="text-sm font-semibold text-lime-400">{formatPKR(i.price)}</p>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-full border border-white/10 px-2 py-1">
                      <button onClick={() => setQuantity(i.id, i.quantity - 1)} aria-label="Decrease"><Minus className="h-4 w-4" /></button>
                      <span className="w-6 text-center text-sm">{i.quantity}</span>
                      <button
                        onClick={() => setQuantity(i.id, i.quantity + 1)}
                        disabled={i.quantity >= i.stock_count}
                        className="disabled:opacity-30"
                        aria-label="Increase"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <button onClick={() => removeItem(i.id)} aria-label="Remove" className="text-soft/40 transition hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {items.length > 0 && (
          <div className="space-y-4 border-t border-white/10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between text-lg">
              <span>Subtotal</span>
              <span className="font-display font-semibold text-lime-400">{formatPKR(subtotal)}</span>
            </div>
            <button
              onClick={goCheckout}
              className="w-full rounded-full bg-lime-500 py-3.5 font-semibold text-midnight shadow-lime transition hover:bg-lime-400"
            >
              Checkout
            </button>
            <button onClick={closeCart} className="w-full text-center text-sm text-soft/50 hover:text-lime-400">
              Continue shopping
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
