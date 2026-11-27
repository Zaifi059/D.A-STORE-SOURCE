export const LOW_STOCK_THRESHOLD = 5;

export default function StockBadge({ stock, className = '' }) {
  if (stock <= 0) {
    return <span className={`rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white ${className}`}>Out of Stock</span>;
  }
  if (stock <= LOW_STOCK_THRESHOLD) {
    return <span className={`rounded bg-lime-500 px-2 py-0.5 text-xs font-semibold text-black ${className}`}>Only {stock} left</span>;
  }
  return null;
}
