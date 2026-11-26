import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Receipt, ShieldCheck, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

export default function StaffHeader({ title }) {
  const navigate = useNavigate();
  const { profile, user, isAdmin, signOut } = useAuth();

  const logout = async () => {
    try { await signOut(); } catch (err) { console.error(err); }
    navigate('/login');
  };

  const linkCls = 'flex items-center gap-1.5 rounded-full border border-neutral-800 px-3 py-1.5 text-sm hover:border-amber-500';

  return (
    <header className="sticky top-0 z-30 border-b border-amber-500/20 bg-black">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4">
        <Logo className="text-xl" />
        <span className="hidden rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-amber-400 sm:block">
          {title}
        </span>
        <nav className="ml-auto flex items-center gap-2">
          <Link to="/pos" className={linkCls}><Receipt className="h-4 w-4 text-amber-400" /><span className="hidden sm:inline">POS</span></Link>
          {isAdmin && <Link to="/admin" className={linkCls}><ShieldCheck className="h-4 w-4 text-amber-400" /><span className="hidden sm:inline">Admin</span></Link>}
          <Link to="/" className={linkCls}><Store className="h-4 w-4 text-amber-400" /><span className="hidden sm:inline">Store</span></Link>
          <span className="hidden max-w-[10rem] truncate text-sm text-neutral-400 md:block">{profile?.full_name || user?.email}</span>
          <button onClick={logout} className={linkCls} aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
        </nav>
      </div>
    </header>
  );
}
