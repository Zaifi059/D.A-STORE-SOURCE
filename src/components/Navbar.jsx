import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogOut, Menu, Receipt, Search, ShieldCheck, ShoppingBag, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Logo from './Logo';

function SearchBar({ onDone, className = '' }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  const submit = (e) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/?q=${encodeURIComponent(term)}` : '/');
    onDone?.();
  };

  return (
    <form onSubmit={submit} role="search" className={className}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          placeholder="Search suits, shirts, shoes…"
          className="w-full rounded-full border border-neutral-800 bg-neutral-900 py-2 pl-9 pr-4 text-sm text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
        />
      </div>
    </form>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const { user, profile, isStaff, isAdmin, signOut } = useAuth();
  const { count, openCart } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
        <Link to="/pos" onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-neutral-800">
          <Receipt className="h-4 w-4 text-amber-400" /> POS
        </Link>
      )}
      {isAdmin && (
        <Link to="/admin" onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-neutral-800">
          <ShieldCheck className="h-4 w-4 text-amber-400" /> Admin
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-amber-500/20 bg-black/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <button className="md:hidden" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>

        <Logo />

        <SearchBar className="mx-6 hidden max-w-md flex-1 md:block" />

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            {user ? (
              <>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="hidden items-center gap-2 rounded-full border border-neutral-800 px-3 py-1.5 text-sm hover:border-amber-500 md:flex"
                >
                  <User className="h-4 w-4 text-amber-400" />
                  <span className="max-w-[8rem] truncate">{profile?.full_name || user.email}</span>
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 py-1 shadow-xl">
                      {roleLinks(() => setMenuOpen(false))}
                      <button onClick={handleSignOut} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-neutral-800">
                        <LogOut className="h-4 w-4 text-amber-400" /> Sign out
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <Link to="/login" className="hidden rounded-full bg-amber-500 px-4 py-1.5 text-sm font-semibold text-black hover:bg-amber-400 md:block">
                Login
              </Link>
            )}
          </div>

          <button onClick={openCart} className="relative p-2" aria-label={`Cart, ${count} items`}>
            <ShoppingBag className="h-6 w-6" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold text-black">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDrawerOpen(false)} />
          <nav className="absolute left-0 top-0 flex h-full w-72 flex-col gap-4 bg-neutral-950 p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <Logo className="text-xl" />
              <button onClick={() => setDrawerOpen(false)} aria-label="Close menu"><X className="h-6 w-6" /></button>
            </div>
            <SearchBar onDone={() => setDrawerOpen(false)} />
            <div className="-mx-4 flex flex-col border-y border-neutral-800 py-2">
              {roleLinks(() => setDrawerOpen(false))}
              {user ? (
                <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2 text-left text-sm hover:bg-neutral-800">
                  <LogOut className="h-4 w-4 text-amber-400" /> Sign out ({profile?.full_name || user.email})
                </button>
              ) : (
                <Link to="/login" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-neutral-800">
                  <User className="h-4 w-4 text-amber-400" /> Login / Sign up
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
