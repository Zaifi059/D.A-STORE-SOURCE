import { useState } from 'react';
import {
  Activity, BarChart3, Boxes, ChevronDown, CircleDollarSign, ExternalLink,
  LayoutDashboard, Package, ReceiptText, Settings, ShoppingBag, ShoppingCart,
  Store, Tags, Truck, Users, X,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const groups = [
  {
    id: 'workspace',
    label: 'WORKSPACE',
    icon: LayoutDashboard,
    items: [
      { label: 'Overview', to: '/dashboard', icon: LayoutDashboard, key: 'overview' },
      { label: 'Sales', to: '/dashboard#sales', icon: BarChart3, key: 'sales' },
      { label: 'Point of Sale', to: '/pos', icon: ShoppingCart, key: 'pos' },
      { label: 'Orders', to: '/admin?tab=orders', icon: ReceiptText, key: 'orders' },
      { label: 'Customers', to: '/payments', icon: Users, key: 'customers' },
      { label: 'Products', to: '/admin?tab=products', icon: Package, key: 'products' },
      { label: 'Inventory', to: '/admin?tab=inventory', icon: Boxes, key: 'inventory' },
    ],
  },
  {
    id: 'operations',
    label: 'OPERATIONS',
    icon: Store,
    items: [
      { label: 'Suppliers', icon: Truck },
      { label: 'Pricing', icon: Tags },
      { label: 'Promotions', icon: CircleDollarSign },
      { label: 'Stores', icon: Store },
      { label: 'Staff', icon: Users },
    ],
  },
  {
    id: 'channels',
    label: 'CHANNELS',
    icon: ShoppingBag,
    items: [
      { label: 'Online Store', to: '/', icon: ExternalLink, key: 'online' },
      { label: 'Mobile App', icon: Activity },
      { label: 'Marketplaces', icon: Store },
    ],
  },
  {
    id: 'system',
    label: 'SYSTEM',
    icon: Settings,
    items: [
      { label: 'Reports', icon: BarChart3 },
      { label: 'Integrations', icon: Activity },
      { label: 'Settings', icon: Settings },
    ],
  },
];

function isActive(key, location) {
  const tab = new URLSearchParams(location.search).get('tab');
  if (key === 'overview') return location.pathname === '/dashboard' && !location.hash;
  if (key === 'sales') return location.pathname === '/dashboard' && location.hash === '#sales';
  if (key === 'pos') return location.pathname === '/pos';
  if (key === 'orders') return location.pathname === '/admin' && tab === 'orders';
  if (key === 'inventory') return location.pathname === '/admin' && tab === 'inventory';
  if (key === 'products') return location.pathname === '/admin' && tab !== 'orders' && tab !== 'inventory';
  if (key === 'customers') return location.pathname === '/payments';
  if (key === 'online') return false;
  return false;
}

export default function AdminSidebar({ collapsed, mobileOpen, onCloseMobile, isAdmin }) {
  const location = useLocation();
  const [expanded, setExpanded] = useState({ workspace: true, operations: true, channels: false, system: false });

  const toggleGroup = (id) => setExpanded((current) => ({ ...current, [id]: !current[id] }));

  return (
    <>
      {mobileOpen && <button className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onCloseMobile} aria-label="Close navigation" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-[#253244] bg-[#0B111B] transition-[width,transform] duration-200 lg:static lg:translate-x-0 ${collapsed ? 'lg:w-[76px]' : 'lg:w-[248px]'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`relative flex h-16 shrink-0 items-center border-b border-[#253244] ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          <Link to="/dashboard" onClick={onCloseMobile} className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FF7818] text-white shadow-lg shadow-orange-950/30"><ShoppingBag size={19} /></span>
            {!collapsed && <span className="min-w-0"><span className="block truncate text-sm font-bold tracking-wide text-[#F5F7FA]">D.A STORE</span><span className="block text-[9px] font-medium uppercase tracking-[.16em] text-[#91A0B5]">Retail operations</span></span>}
          </Link>
          {!collapsed && <button onClick={onCloseMobile} className="rounded-md p-1.5 text-[#91A0B5] hover:bg-[#151F2B] lg:hidden" aria-label="Close navigation"><X size={17} /></button>}
        </div>

        <nav className="scrollbar-none min-h-0 flex-1 space-y-3 overflow-y-auto px-2 py-4">
          {groups.map((group) => {
            const GroupIcon = group.icon;
            const open = expanded[group.id];
            return (
              <section key={group.id}>
                <button onClick={() => toggleGroup(group.id)} aria-expanded={open} className={`flex w-full items-center rounded-md px-2.5 py-2 text-left text-[9px] font-bold tracking-[.16em] text-[#91A0B5] transition hover:text-[#F5F7FA] ${collapsed ? 'justify-center' : 'justify-between'}`} title={collapsed ? group.label : undefined}>
                  <span className="flex items-center gap-2"><GroupIcon size={13} />{!collapsed && group.label}</span>
                  {!collapsed && <ChevronDown size={13} className={`transition-transform ${open ? '' : '-rotate-90'}`} />}
                </button>
                {open && (
                  <div className="mt-1 space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = item.key ? isActive(item.key, location) : false;
                      const adminOnly = ['orders', 'products', 'inventory'].includes(item.key) && !isAdmin;
                      const common = `flex min-h-10 items-center gap-3 rounded-lg px-2.5 text-[12px] transition-colors duration-150 ${collapsed ? 'justify-center' : ''} ${active ? 'bg-[#FF7818] font-semibold text-white shadow-md shadow-orange-950/25' : item.to ? 'text-[#91A0B5] hover:bg-[#151F2B] hover:text-[#F5F7FA]' : 'cursor-not-allowed text-[#91A0B5]/55'}`;
                      return item.to && !adminOnly ? (
                        <Link key={item.label} to={item.to} onClick={onCloseMobile} className={common} aria-current={active ? 'page' : undefined} title={collapsed ? item.label : undefined}>
                          <Icon size={16} className="shrink-0" />
                          {!collapsed && <><span className="min-w-0 flex-1 truncate">{item.label}</span>{item.key === 'online' && <ExternalLink size={12} className="opacity-60" />}</>}
                        </Link>
                      ) : (
                        <div key={item.label} className={`${common} ${adminOnly ? 'cursor-not-allowed text-[#91A0B5]/55 hover:bg-transparent' : ''}`} aria-disabled="true" title={adminOnly ? `${item.label} is restricted to administrators` : `${item.label} is not available in the current application`}>
                          <Icon size={16} className="shrink-0" />
                          {!collapsed && <><span className="min-w-0 flex-1 truncate">{item.label}</span><span className="rounded border border-[#253244] px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-[#91A0B5]">{adminOnly ? 'Admin' : 'Soon'}</span></>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="m-3 rounded-xl border border-[#253244] bg-[#111A25] p-3">
            <p className="text-xs font-semibold text-[#F5F7FA]">Need help?</p>
            <p className="mt-1 text-[10px] leading-4 text-[#91A0B5]">Contact your store administrator for support.</p>
          </div>
        )}
      </aside>
    </>
  );
}
