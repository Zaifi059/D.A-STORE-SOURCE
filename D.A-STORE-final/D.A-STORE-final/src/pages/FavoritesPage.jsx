import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from '../components/ProductCard';

export default function FavoritesPage() {
  const { products, loading, error } = useProducts();
  const { ids } = useWishlist();

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-lime-500" /></div>;
  if (error) return <p className="py-24 text-center text-red-400">Couldn't load favorites: {error}</p>;

  // Only show saved items that are still active in the catalog.
  const saved = products.filter((p) => ids.includes(p.id));

  return (
    <section>
      <h2 className="mb-8 font-display text-4xl font-bold tracking-tight sm:text-6xl">Favorites</h2>
      {saved.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-soft/50">Nothing saved yet. Tap the heart on any piece to keep it here.</p>
          <Link to="/shop" className="mt-6 inline-block rounded-full border border-white/15 px-5 py-2.5 text-sm hover:border-lime-500/60 hover:text-lime-400">
            Browse the shop
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {saved.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
}
