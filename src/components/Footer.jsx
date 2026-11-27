import { Link } from 'react-router-dom';
import Logo from './Logo';

const LINKS = [
  { to: '/shop', label: 'Shop' },
  { to: '/collections', label: 'Collections' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-midnight/60 py-10 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 text-center">
        <Logo className="text-xl" />
        <nav aria-label="Footer" className="my-2 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-soft/60">
          {LINKS.map((l) => <Link key={l.to} to={l.to} className="transition hover:text-lime-400">{l.label}</Link>)}
        </nav>
        <p className="text-xs uppercase tracking-[0.3em] text-lime-400/80">Clothing &amp; Fashion</p>
        <p className="text-xs text-soft/40">
          Dress Better · Live Stylish — © {new Date().getFullYear()} D.A STORE. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
