import { useCallback, useMemo, useState } from 'react';
import { stockFor, unitPriceFor } from '../lib/pricing';

/** POS cart. Lines are per size/color for products with variants. */
export function usePosCart() {
  const [lines, setLines] = useState([]);

  const add = useCallback((product, variant = null, qty = 1) => {
    const id = variant ? `${product.id}:${variant.id}` : product.id;
    const stock = stockFor(product, variant);
    setLines((prev) => {
      const existing = prev.find((l) => l.id === id);
      const quantity = Math.min((existing?.quantity ?? 0) + qty, stock);
      if (quantity <= 0) return prev;
      const line = {
        id,
        product_id: product.id,
        variant_id: variant?.id ?? null,
        name: product.name,
        sku: variant?.sku || product.sku || '',
        image_url: product.image_url ?? null,
        size: variant?.size ?? null,
        color: variant?.color ?? null,
        price: unitPriceFor(product, variant),
        stock_count: stock,
        quantity,
      };
      return existing ? prev.map((l) => (l.id === id ? line : l)) : [...prev, line];
    });
  }, []);

  const setQty = useCallback((id, qty) => {
    setLines((prev) =>
      prev.flatMap((l) => (l.id !== id ? [l] : qty <= 0 ? [] : [{ ...l, quantity: Math.min(qty, l.stock_count) }]))
    );
  }, []);

  const syncStock = useCallback((products) => {
    setLines((prev) => prev.map((line) => {
      const product = products.find((item) => item.id === line.product_id);
      if (!product) return line;
      const variant = line.variant_id
        ? product.product_variants?.find((item) => item.id === line.variant_id && item.is_active) ?? null
        : null;
      return {
        ...line,
        name: product.name,
        sku: variant?.sku || product.sku || '',
        image_url: product.image_url ?? null,
        price: unitPriceFor(product, variant),
        stock_count: stockFor(product, variant),
      };
    }));
  }, []);

  const remove = useCallback((id) => setLines((prev) => prev.filter((l) => l.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);
  const replace = useCallback((nextLines) => setLines(nextLines), []);
  const subtotal = useMemo(() => lines.reduce((n, l) => n + l.price * l.quantity, 0), [lines]);

  return { lines, add, setQty, syncStock, remove, clear, replace, subtotal };
}
