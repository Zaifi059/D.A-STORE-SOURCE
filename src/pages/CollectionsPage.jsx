import { Link } from 'react-router-dom';
import { ArrowUpRight, Loader2, Shirt } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';

/** Collections are the distinct product categories, each linking to a filtered shop view. */
export default function CollectionsPage() {
  const { products, loading, error } = useProducts();

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-lime-500" /></div>;
  if (error) return <p className="py-24 text-center text-red-400">Couldn't load collections: {error}</p>;

  const collections = Object.values(
    products.reduce((acc, p) => {
      if (!p.category) return acc;
      const entry = acc[p.category] ?? { name: p.category, count: 0, image_url: null };
      entry.count += 1;
      entry.image_url ??= p.image_url;
      acc[p.category] = entry;
      return acc;
    }, {})
  );

  return (
    <section>
      <h2 className="mb-10 font-display text-4xl font-bold tracking-tight sm:text-6xl">Collections</h2>
      {collections.length === 0 ? (
        <p className="py-24 text-center text-soft/50">No collections yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <Link
              key={c.name}
              to={`/shop?category=${encodeURIComponent(c.name)}`}
              className="group relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/5 bg-teal/30 transition duration-500 hover:border-lime-500/50 hover:shadow-lime"
            >
              {c.image_url ? (
                <img src={c.image_url} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center"><Shirt className="h-16 w-16 text-soft/15" /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6">
                <div>
                  <p className="font-display text-3xl font-bold">{c.name}</p>
                  <p className="mt-1 text-sm text-soft/60">{c.count} {c.count === 1 ? 'piece' : 'pieces'}</p>
                </div>
                <ArrowUpRight className="h-6 w-6 text-lime-400 transition group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
