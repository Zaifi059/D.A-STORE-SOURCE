import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import ProductCard from './ProductCard';

/**
 * Product listing. Honors ?category= and ?q= from the URL so collection and
 * search links land on a pre-filtered view. sortBy="newest" keeps the feed
 * ordered by creation date (the default feed order already is).
 */
export default function ProductGrid({ title, sortBy }) {
  const { products, loading, error } = useProducts();
  const [params] = useSearchParams();
  const [category, setCategory] = useState(params.get('category') ?? 'All');
  const q = (params.get('q') ?? '').trim().toLowerCase();

  const categories = useMemo(
    () => ['All', ...new Set(products.map((p) => p.category).filter(Boolean))],
    [products]
  );

  const filtered = useMemo(() => {
    const list = products.filter(
      (p) =>
        (category === 'All' || p.category === category) &&
        (!q || [p.name, p.category, p.description].some((v) => v?.toLowerCase().includes(q)))
    );
    return sortBy === 'newest'
      ? [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      : list;
  }, [products, category, q, sortBy]);

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-lime-500" /></div>;
  }
  if (error) return <p className="py-24 text-center text-red-400">Couldn't load products: {error}</p>;

  return (
    <section>
      {title && (
        <h2 className="mb-8 font-display text-4xl font-bold tracking-tight text-soft sm:text-6xl">
          {title}
          {q && <span className="ml-3 align-middle text-base font-normal text-soft/50">“{q}”</span>}
        </h2>
      )}

      <div className="scrollbar-none -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition duration-300 ${
              category === c
                ? 'border-lime-500 bg-lime-500 font-semibold text-midnight shadow-lime'
                : 'border-white/10 text-soft/70 hover:border-lime-500/60 hover:text-lime-400'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-24 text-center text-soft/50">No products found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
}
