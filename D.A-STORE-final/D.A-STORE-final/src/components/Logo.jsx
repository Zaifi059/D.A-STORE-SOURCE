import { Link } from 'react-router-dom';

/** Wordmark: the existing D.A STORE identity, restyled for the midnight/lime palette. */
export default function Logo({ className = 'text-2xl' }) {
  return (
    <Link to="/" className={`font-display font-bold tracking-wide ${className}`} aria-label="D.A STORE home">
      <span className="text-lime-500">D.A</span> <span className="text-soft">STORE</span>
    </Link>
  );
}
