import { useCallback, useMemo, useState } from 'react';

export function usePosCart() {
  const [items, setItems] = useState([]);

  const add = useCallback((p) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === p.id);
      const line = {
        id: p.id,
        name: p.name,
        price: Number(p.price),
        stock_count: p.stock_count,
        quantity: Math.min((existing?.quantity ?? 0) + 1, p.stock_count),
      };
      return existing ? prev.map((i) => (i.id === p.id ? line : i)) : [...prev, line];
    });
  }, []);

  const setQty = useCallback((id, qty) => {
    setItems((prev) =>
      prev.flatMap((i) =>
        i.id !== id ? [i] : qty <= 0 ? [] : [{ ...i, quantity: Math.min(qty, i.stock_count) }]
      )
    );
  }, []);

  const remove = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);
  const total = useMemo(() => items.reduce((n, i) => n + i.price * i.quantity, 0), [items]);

  return { items, add, setQty, remove, clear, total };
}
