import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ShoppingBag } from 'lucide-react';

/** Animated add-to-cart. Calls onAdd, then flashes a confirmation state. */
export default function AddToCartButton({ onAdd, disabled, label = 'Add to Cart', soldOutLabel = 'Out of Stock', className = '' }) {
  const [done, setDone] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handle = () => {
    onAdd();
    setDone(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 1400);
  };

  return (
    <motion.button
      type="button"
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      onClick={handle}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-lime-500 px-7 py-3.5 font-semibold text-midnight shadow-lime transition disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={disabled ? 'out' : done ? 'done' : 'idle'}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-2"
        >
          {disabled ? soldOutLabel : done ? (<><Check className="h-5 w-5" /> Added</>) : (<><ShoppingBag className="h-5 w-5" /> {label}</>)}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
