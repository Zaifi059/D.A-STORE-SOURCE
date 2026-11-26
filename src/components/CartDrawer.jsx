import { useNavigate } from 'react-router-dom';
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
        className={`absolute inset-0 bg-black/70 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-amber-500/20 bg-neutral-950 shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 p-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><ShoppingBag className="h-5 w-5 text-amber-400" /> Your Cart</h2>
          <button onClick={closeCart} aria-label="Close cart"><X className="h-6 w-6" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {items.length === 0 && <p className="py-16 text-center text-neutral-500">Your cart is empty.</p>}
          {items.map((i) => (
            <div key={i.id} className="flex gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
              <div className="h-24 w-20 shrink-0 overflow-hidden rounded bg-neutral-800">
                {i.image_url ? (
                  <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center"><Shirt className="h-6 w-6 text-neutral-600" /></div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-sm">{i.name}</p>
                <p className="text-sm font-semibold text-amber-400">{formatPKR(i.price)}</p>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-full border border-neutral-700 px-2 py-1">
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
                  <button onClick={() => removeItem(i.id)} aria-label="Remove" className="text-neutral-500 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="space-y-3 border-t border-neutral-800 p-4">
            <div className="flex justify-between text-lg">
              <span>Subtotal</span>
              <span className="font-semibold text-amber-400">{formatPKR(subtotal)}</span>
            </div>
            <button onClick={goCheckout} className="w-full rounded-full bg-amber-500 py-3 font-semibold text-black hover:bg-amber-400">
              Checkout
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
