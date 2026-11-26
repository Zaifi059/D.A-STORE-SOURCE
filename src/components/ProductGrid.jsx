import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import ProductCard from './ProductCard';

export default function ProductGrid() {
  const { products, loading, error } = useProducts();
  const [params] = useSearchParams();
  const [category, setCategory] = useState('All');
  const q = (params.get('q') ?? '').trim().toLowerCase();

  const categories = useMemo(
    () => ['All', ...new Set(products.map((p) => p.category).filter(Boolean))],
    [products]
  );

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (category === 'All' || p.category === category) &&
          (!q || [p.name, p.category, p.description].some((v) => v?.toLowerCase().includes(q)))
      ),
    [products, category, q]
  );

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-amber-400" /></div>;
  }
  if (error) return <p className="py-24 text-center text-red-400">Couldn't load products: {error}</p>;

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              category === c
                ? 'border-amber-500 bg-amber-500 font-semibold text-black'
                : 'border-neutral-800 text-neutral-300 hover:border-amber-500'
            }`}
          >
            {c}
          </button>
        ))}
        {q && <span className="ml-2 text-sm text-neutral-400">Results for “{q}”</span>}
      </div>

      {filtered.length === 0 ? (
        <p className="py-24 text-center text-neutral-500">No products found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
}
