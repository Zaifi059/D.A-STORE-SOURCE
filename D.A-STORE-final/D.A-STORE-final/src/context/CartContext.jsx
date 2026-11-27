import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'da-store-cart';
const CartContext = createContext(null);

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(parsed) ? parsed : [];
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

  const addItem = useCallback((product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      const quantityNext = Math.min((existing?.quantity ?? 0) + quantity, product.stock_count);
      if (quantityNext <= 0) return prev;
      const line = {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        image_url: product.image_url,
        stock_count: product.stock_count,
        quantity: quantityNext,
      };
      return existing ? prev.map((i) => (i.id === product.id ? line : i)) : [...prev, line];
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
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
