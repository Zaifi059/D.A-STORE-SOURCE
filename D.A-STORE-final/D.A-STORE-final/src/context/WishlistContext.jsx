import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'da-store-wishlist';
const WishlistContext = createContext(null);

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Saved products, persisted per browser. Stores product ids only; details come from live product data. */
export function WishlistProvider({ children }) {
  const [ids, setIds] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* storage unavailable */ }
  }, [ids]);

  const toggle = useCallback((id) => {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const value = useMemo(
    () => ({ ids, count: ids.length, has: (id) => ids.includes(id), toggle }),
    [ids, toggle]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
}
