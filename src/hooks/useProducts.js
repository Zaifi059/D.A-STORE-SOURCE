import { useCallback, useEffect, useId, useState } from 'react';
import { supabase } from '../lib/supabase';

// Products with their size/color variants in one query.
export const PRODUCT_SELECT = '*, product_variants(id, size, color, sku, price_override, stock_count, is_active)';

/**
 * Realtime updates send the product row without its nested variants,
 * so keep the variants we already loaded when a row changes.
 */
export const mergeRow = (prev, row) => ({ ...row, product_variants: prev?.product_variants ?? [] });

const isExpiredJwt = (error) =>
  error?.code === 'PGRST301' || /jwt expired/i.test(error?.message ?? '');

export async function runProductQuery(query) {
  let result = await query();
  if (!isExpiredJwt(result.error)) return result;

  const { data, error } = await supabase.auth.refreshSession();
  if (error) return { ...result, error };
  if (!data.session) return result;

  result = await query();
  return result;
}

/** All active products, kept live via Realtime. Each instance gets its own channel so multiple components can share the hook on one page. */
export function useProducts() {
  const instance = useId();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState('CONNECTING');
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setRealtimeStatus('CONNECTING');

    runProductQuery(() => supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('is_active', true)
      .order('created_at', { ascending: false }))
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) setError(err.message);
        else {
          setProducts(data ?? []);
          setError('');
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Could not load products from Supabase.');
        setLoading(false);
      });

    const channel = supabase
      .channel(`products-${instance}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        setProducts((prev) => {
          if (payload.eventType === 'DELETE') return prev.filter((p) => p.id !== payload.old.id);
          const row = payload.new;
          if (!row.is_active) return prev.filter((p) => p.id !== row.id);
          const existing = prev.find((p) => p.id === row.id);
          return existing
            ? prev.map((p) => (p.id === row.id ? mergeRow(p, row) : p))
            : [mergeRow(null, row), ...prev];
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variants' }, (payload) => {
        const variant = payload.eventType === 'DELETE' ? payload.old : payload.new;
        setProducts((prev) => prev.map((product) => {
          if (product.id !== variant.product_id) return product;
          const variants = product.product_variants ?? [];
          if (payload.eventType === 'DELETE' || !variant.is_active) {
            return { ...product, product_variants: variants.filter((item) => item.id !== variant.id) };
          }
          return {
            ...product,
            product_variants: variants.some((item) => item.id === variant.id)
              ? variants.map((item) => (item.id === variant.id ? variant : item))
              : [...variants, variant],
          };
        }));
      })
      .subscribe((status) => {
        if (active) setRealtimeStatus(status);
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [instance, refreshKey]);

  return { products, loading, error, refresh, realtimeStatus };
}

/** One product by id, kept live via Realtime. */
export function useProduct(id) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);

    runProductQuery(() => supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle())
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) setError(err.message);
        else {
          setProduct(data);
          setError('');
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Could not load this product from Supabase.');
        setLoading(false);
      });

    const channel = supabase
      .channel(`product-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products', filter: `id=eq.${id}` },
        (payload) => setProduct((prev) => (payload.new.is_active ? mergeRow(prev, payload.new) : null))
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  return { product, loading, error };
}

/** Every product (including inactive) for the admin dashboard, kept live via Realtime. */
export function useAllProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    runProductQuery(() => supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .order('name'))
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) setError(err.message);
        else {
          setProducts(data ?? []);
          setError('');
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Could not load products from Supabase.');
        setLoading(false);
      });

    const channel = supabase
      .channel('admin-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        setProducts((prev) => {
          if (payload.eventType === 'DELETE') return prev.filter((p) => p.id !== payload.old.id);
          const row = payload.new;
          return prev.some((p) => p.id === row.id)
            ? prev.map((p) => (p.id === row.id ? mergeRow(p, row) : p))
            : [...prev, mergeRow(null, row)].sort((a, b) => a.name.localeCompare(b.name));
        });
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { products, loading, error };
}
