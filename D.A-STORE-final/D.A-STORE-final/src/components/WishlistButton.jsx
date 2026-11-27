import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWishlist } from '../context/WishlistContext';

export default function WishlistButton({ productId, className = '' }) {
  const { has, toggle } = useWishlist();
  const saved = has(productId);

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from favorites' : 'Add to favorites'}
      className={`flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition duration-300 ${
        saved
          ? 'border-lime-500/60 bg-lime-500/15 text-lime-400'
          : 'border-white/15 bg-midnight/50 text-soft/80 hover:border-lime-500/50 hover:text-lime-400'
      } ${className}`}
    >
      <motion.span key={saved ? 'on' : 'off'} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
        <Heart className={`h-4 w-4 ${saved ? 'fill-lime-500' : ''}`} />
      </motion.span>
    </motion.button>
  );
}
