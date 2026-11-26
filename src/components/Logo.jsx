import { Link } from 'react-router-dom';

export default function Logo({ className = 'text-2xl' }) {
  return (
    <Link to="/" className={`font-serif font-bold tracking-wide ${className}`} aria-label="D.A STORE home">
      <span className="text-amber-400">D.A</span> <span className="text-white">STORE</span>
    </Link>
  );
}
