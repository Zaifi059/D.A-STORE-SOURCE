import { useEffect, useState } from 'react';
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, Store } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from './AdminSidebar';

function pageTitle(pathname, search) {
  if (pathname === '/dashboard') return 'Retail Command Center';
  if (pathname === '/pos') return 'Point of Sale';
  if (pathname === '/payments') return 'Payments & Credit';
  if (pathname === '/admin') {
    const tab = new URLSearchParams(search).get('tab');
    return tab === 'orders' ? 'Orders' : tab === 'inventory' ? 'Inventory' : 'Product Management';
  }
  return 'Retail Operations';
}

export default function AdminShell() {
  const { profile, user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const posRoute = location.pathname === '/pos';

  useEffect(() => setMobileOpen(false), [location.pathname, location.search]);

  const logout = async () => {
    setSignOutError('');
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      setSignOutError(error.message || 'Could not sign out. Please try again.');
    }
  };

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-[#080D14] text-[#F5F7FA]">
      <AdminSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        isAdmin={isAdmin}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-30 flex h-16 shrink-0 items-center gap-3 border-b border-[#253244] bg-[#0B111B] px-3 sm:px-5">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-[#91A0B5] transition hover:bg-[#151F2B] hover:text-[#F5F7FA] lg:hidden" aria-label="Open navigation">
            <Menu size={18} />
          </button>
          <button onClick={() => setCollapsed((value) => !value)} className="hidden rounded-lg p-2 text-[#91A0B5] transition hover:bg-[#151F2B] hover:text-[#F5F7FA] lg:block" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#F5F7FA]">{pageTitle(location.pathname, location.search)}</p>
            <p className="hidden text-[10px] text-[#91A0B5] sm:block">D.A Store · Retail workspace</p>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <span title="The current catalog has no store-assignment field; this workspace uses the shared inventory." className="hidden items-center gap-1.5 rounded-lg border border-[#253244] px-2.5 py-1.5 text-[10px] text-[#91A0B5] md:flex">
              <Store size={13} className="text-[#FF9A45]" /> Single catalog
            </span>
            <div className="hidden max-w-40 text-right sm:block">
              <p className="truncate text-xs font-medium text-[#F5F7FA]">{profile?.full_name || user?.email || 'Staff account'}</p>
              <p className="text-[10px] text-[#91A0B5]">{isAdmin ? 'Administrator' : 'Cashier'}</p>
            </div>
            <button onClick={logout} className="rounded-lg border border-[#253244] p-2 text-[#91A0B5] transition hover:border-[#FF7818] hover:text-[#FF9A45]" aria-label="Sign out" title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        </header>
        {signOutError && <p role="alert" className="border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300">{signOutError}</p>}
        <main className={`min-h-0 flex-1 ${posRoute ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
