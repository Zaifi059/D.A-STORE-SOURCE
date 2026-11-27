import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { hasVariants, stockFor, unitPriceFor } from '../lib/pricing';

const KEY = 'da-store-cart';
const CartContext = createContext(null);

/** Each size/color combination is its own cart line. Plain products keep the product id. */
const lineIdFor = (product, variant) => (variant ? `${product.id}:${variant.id}` : product.id);

/** Older saved carts stored product lines without variant fields. Upgrade them in place. */
function normalize(line) {
  return {
    ...line,
    product_id: line.product_id ?? line.id,
    variant_id: line.variant_id ?? null,
    size: line.size ?? null,
    color: line.color ?? null,
  };
}

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable */ }
  }, [items]);

  /**
   * Add a product to the cart. Products with size/color variants require the chosen variant,
   * otherwise the cart line would not match what the server accepts.
   */
  const addItem = useCallback((product, quantity = 1, variant = null) => {
    if (hasVariants(product) && !variant) return;
    const id = lineIdFor(product, variant);
    const stock = stockFor(product, variant);

    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      const nextQuantity = Math.min((existing?.quantity ?? 0) + quantity, stock);
      if (nextQuantity <= 0) return prev;
      const line = {
        id,
        product_id: product.id,
        variant_id: variant?.id ?? null,
        name: product.name,
        size: variant?.size ?? null,
        color: variant?.color ?? null,
        price: unitPriceFor(product, variant),
        image_url: product.image_url,
        stock_count: stock,
        quantity: nextQuantity,
      };
      return existing ? prev.map((i) => (i.id === id ? line : i)) : [...prev, line];
    });
    setIsOpen(true);
  }, []);

  const setQuantity = useCallback((id, quantity) => {
    setItems((prev) =>
      prev.flatMap((i) =>
        i.id !== id ? [i] : quantity <= 0 ? [] : [{ ...i, quantity: Math.min(quantity, i.stock_count) }]
      )
    );
  }, []);

  const removeItem = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((n, i) => n + i.price * i.quantity, 0),
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      setQuantity,
      removeItem,
      clear,
    }),
    [items, isOpen, addItem, setQuantity, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
