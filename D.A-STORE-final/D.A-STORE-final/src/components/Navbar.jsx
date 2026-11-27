import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, LogOut, Menu, Receipt, Search, ShieldCheck, ShoppingBag, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import Logo from './Logo';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/collections', label: 'Collections' },
  { to: '/new-arrivals', label: 'New Arrivals' },
];

function SearchBar({ onDone, className = '' }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  const submit = (e) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/shop?q=${encodeURIComponent(term)}` : '/shop');
    onDone?.();
  };

  return (
    <form onSubmit={submit} role="search" className={className}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-soft/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          placeholder="Search suits, shirts, shoes…"
          className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-soft placeholder-soft/40 transition focus:border-lime-500/60 focus:bg-white/10 focus:outline-none"
        />
      </div>
    </form>
  );
}

function NavItem({ to, label, end, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `rounded-full px-4 py-2 text-sm transition duration-300 hover:bg-lime-500/10 hover:text-lime-400 ${
          isActive ? 'bg-white/10 text-lime-400' : 'text-soft/75'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const { user, profile, isStaff, isAdmin, signOut } = useAuth();
  const { count, openCart } = useCart();
  const { count: saved } = useWishlist();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error(err);
    }
    setMenuOpen(false);
    setDrawerOpen(false);
    navigate('/');
  };

  const roleLinks = (onClick) => (
    <>
      {isStaff && (
        <Link to="/pos" onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/5">
          <Receipt className="h-4 w-4 text-lime-500" /> POS
        </Link>
      )}
      {isAdmin && (
        <Link to="/admin" onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/5">
          <ShieldCheck className="h-4 w-4 text-lime-500" /> Admin
        </Link>
      )}
    </>
  );

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-3 sm:px-6 sm:pt-4">
      <div
        className={`pointer-events-auto flex h-14 w-full max-w-6xl items-center gap-3 rounded-full border px-3 pl-4 transition-all duration-500 ${
          scrolled
            ? 'border-white/10 bg-midnight/80 shadow-float backdrop-blur-xl'
            : 'border-white/5 bg-midnight/50 backdrop-blur-md'
        }`}
      >
        <button
          className="rounded-full p-2 transition hover:bg-white/5 md:hidden"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Logo className="text-lg" />

        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV_LINKS.map((l) => (
            <NavItem key={l.to} {...l} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <SearchBar className="hidden w-56 lg:block" />

          <div className="relative">
            {user ? (
              <>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="hidden items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm transition hover:border-lime-500/60 md:flex"
                >
                  <User className="h-4 w-4 text-lime-500" />
                  <span className="max-w-[7rem] truncate">{profile?.full_name || user.email}</span>
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 z-50 mt-3 w-48 overflow-hidden rounded-2xl border border-white/10 bg-midnight/95 py-1 shadow-float backdrop-blur-xl">
                      {roleLinks(() => setMenuOpen(false))}
                      <button onClick={handleSignOut} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-white/5">
                        <LogOut className="h-4 w-4 text-lime-500" /> Sign out
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <Link
                to="/login"
                className="hidden rounded-full bg-lime-500 px-4 py-1.5 text-sm font-semibold text-midnight shadow-lime transition hover:bg-lime-400 md:block"
              >
                Login
              </Link>
            )}
          </div>

          <Link to="/favorites" className="relative hidden rounded-full p-2 transition hover:bg-white/5 hover:text-lime-400 sm:block" aria-label={`Favorites, ${saved} saved`}>
            <Heart className="h-5 w-5" />
            {saved > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-lime-500 px-1 text-[10px] font-bold text-midnight">
                {saved}
              </span>
            )}
          </Link>

          <button onClick={openCart} className="relative rounded-full p-2 transition hover:bg-white/5" aria-label={`Cart, ${count} items`}>
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-lime-500 px-1 text-xs font-bold text-midnight">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {drawerOpen && (
        <div className="pointer-events-auto fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <nav className="absolute left-0 top-0 flex h-full w-72 flex-col gap-5 border-r border-white/10 bg-midnight p-5 shadow-float">
            <div className="flex items-center justify-between">
              <Logo className="text-xl" />
              <button onClick={() => setDrawerOpen(false)} aria-label="Close menu"><X className="h-6 w-6" /></button>
            </div>
            <SearchBar onDone={() => setDrawerOpen(false)} />
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <NavItem key={l.to} {...l} onClick={() => setDrawerOpen(false)} />
              ))}
            </div>
            <div className="-mx-5 mt-auto flex flex-col border-t border-white/10 py-3">
              {roleLinks(() => setDrawerOpen(false))}
              <Link to="/favorites" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2 px-5 py-2 text-sm hover:bg-white/5">
                <Heart className="h-4 w-4 text-lime-500" /> Favorites ({saved})
              </Link>
              {user ? (
                <button onClick={handleSignOut} className="flex items-center gap-2 px-5 py-2 text-left text-sm hover:bg-white/5">
                  <LogOut className="h-4 w-4 text-lime-500" /> Sign out ({profile?.full_name || user.email})
                </button>
              ) : (
                <Link to="/login" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2 px-5 py-2 text-sm hover:bg-white/5">
                  <User className="h-4 w-4 text-lime-500" /> Login / Sign up
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
