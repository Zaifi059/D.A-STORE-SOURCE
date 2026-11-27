import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowUpRight, Boxes, CircleDollarSign,
  ClipboardList, CreditCard, Receipt, RefreshCw, Shirt, ShoppingCart,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../hooks/useProducts';
import { activeVariants, unitPriceFor } from '../lib/pricing';
import { LOW_STOCK_THRESHOLD } from '../components/StockBadge';
import { formatPKR } from '../lib/format';

const isFinalizedSale = (order) => ['completed', 'delivered'].includes(order.status);
const dateKey = (date) => {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};

function inventoryUnits(product) {
  const variants = activeVariants(product);
  return variants.length
    ? variants.reduce((total, variant) => total + Number(variant.stock_count || 0), 0)
    : Number(product.stock_count || 0);
}

function inventoryRetailValue(product) {
  const variants = activeVariants(product);
  return variants.length
    ? variants.reduce((total, variant) => total + Number(variant.stock_count || 0) * unitPriceFor(product, variant), 0)
    : Number(product.stock_count || 0) * unitPriceFor(product);
}

function MetricCard({ title, value, detail, icon: Icon, warning = false }) {
  return (
    <article className="rounded-xl border border-[#253244] bg-[#111A25] p-4 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#91A0B5]">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#F5F7FA]">{value}</p>
        </div>
        <span className={`rounded-lg p-2.5 ${warning ? 'bg-amber-500/10 text-amber-300' : 'bg-[#FF7818]/10 text-[#FF9A45]'}`}>
          <Icon size={19} />
        </span>
      </div>
      <p className="mt-3 text-[11px] text-[#91A0B5]">{detail}</p>
    </article>
  );
}

function SalesChart({ points, loading, error }) {
  const max = Math.max(0, ...points.map((point) => point.total));
  const step = max > 0 ? Math.ceil(max / 3) : 1;
  const axisMax = step * 3;
  const yValues = [axisMax, step * 2, step, 0];
  const yPositions = [36, 72, 108, 148];
  const x = (index) => 22 + index * (456 / Math.max(1, points.length - 1));
  const y = (value) => 148 - (value / axisMax) * 112;
  const coords = points.map((point, index) => `${x(index)},${y(point.total)}`).join(' ');
  const area = `22,148 ${coords} 478,148`;
  const label = (value) => value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}m`
    : value >= 1_000 ? `${Math.round(value / 1_000)}k` : String(Math.round(value));

  return (
    <section id="sales" className="rounded-xl border border-[#253244] bg-[#111A25] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#F5F7FA]">Sales over time</h2>
          <p className="mt-1 text-[11px] text-[#91A0B5]">Last 7 days · completed orders</p>
        </div>
        <span className="rounded-md border border-[#253244] px-2 py-1 text-[11px] text-[#91A0B5]">Daily</span>
      </div>
      {loading ? (
        <div role="status" aria-label="Loading sales chart" className="flex h-44 items-center justify-center">
          <span className="h-5 w-32 animate-pulse rounded bg-[#253244]" />
        </div>
      ) : error ? (
        <p role="status" className="flex h-44 items-center justify-center text-xs text-amber-300">Sales chart unavailable: {error}</p>
      ) : (
        <svg viewBox="0 0 500 178" className="h-44 w-full" role="img" aria-label="Sales chart">
          {yPositions.map((position, index) => (
            <g key={position}>
              <line x1="22" x2="480" y1={position} y2={position} stroke="#253244" strokeDasharray="3 5" />
              <text x="0" y={position + 3} fill="#91A0B5" fontSize="9">{label(yValues[index])}</text>
            </g>
          ))}
          <polygon points={area} fill="#FF7818" opacity=".12" />
          <polyline points={coords} fill="none" stroke="#FF7818" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => (
            <g key={point.day}>
              <circle cx={x(index)} cy={y(point.total)} r="3.2" fill="#FF9A45" stroke="#111A25" strokeWidth="2" />
              <text x={x(index)} y="168" textAnchor="middle" fill="#91A0B5" fontSize="9">{point.day}</text>
            </g>
          ))}
          {max === 0 && <text x="250" y="94" textAnchor="middle" fill="#91A0B5" fontSize="11">No completed sales in this period</text>}
        </svg>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const { products, loading: productsLoading, error: productsError, refresh: refreshProducts } = useProducts();
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError('');
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    try {
      const pageSize = 500;
      const result = [];
      let offset = 0;
      let page;
      do {
        const { data, error } = await supabase.from('orders')
          .select('id,order_number,total_amount,created_at,channel,status')
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        page = data ?? [];
        result.push(...page);
        offset += pageSize;
      } while (page.length === pageSize);
      setOrders(result);
    } catch (error) {
      setOrdersError(error.message || 'Could not load sales from Supabase.');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const channel = supabase.channel('dashboard-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadOrders)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadOrders]);

  const today = dateKey(new Date());
  const todayOrders = orders.filter((order) => dateKey(order.created_at) === today);
  const todaySales = todayOrders.filter(isFinalizedSale);
  const finalizedOrders = orders.filter(isFinalizedSale);
  const totalSales = todaySales.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const averageOrder = todaySales.length ? totalSales / todaySales.length : 0;
  const lowStock = products.filter((product) => inventoryUnits(product) <= LOW_STOCK_THRESHOLD);
  const totalInventory = products.reduce((sum, product) => sum + inventoryUnits(product), 0);
  const inventoryValue = products.reduce((sum, product) => sum + inventoryRetailValue(product), 0);

  const chartPoints = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = dateKey(date);
    return {
      day: date.toLocaleDateString('en', { weekday: 'short' }),
      total: finalizedOrders
        .filter((order) => dateKey(order.created_at) === key)
        .reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    };
  }), [finalizedOrders]);

  const channels = useMemo(() => {
    const pos = finalizedOrders.filter((order) => order.channel === 'pos').reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const online = finalizedOrders.filter((order) => order.channel === 'online').reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const total = pos + online;
    return [
      { name: 'In-store POS', value: pos, color: '#FF7818' },
      { name: 'Online store', value: online, color: '#64748B' },
    ].map((channel) => ({ ...channel, pct: total ? channel.value / total * 100 : 0 }));
  }, [finalizedOrders]);

  const refresh = () => {
    loadOrders();
    refreshProducts();
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#FF9A45]">Retail command center</p>
          <h1 className="mt-1 text-xl font-semibold text-[#F5F7FA]">Overview</h1>
          <p className="mt-1 text-xs text-[#91A0B5]">Live business summary from your store data</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="flex items-center gap-2 rounded-lg border border-[#253244] px-3 py-2 text-xs text-[#91A0B5] transition hover:border-[#FF7818] hover:text-[#F5F7FA]">
            <RefreshCw size={13} /> Refresh
          </button>
          <Link to="/pos" className="rounded-lg bg-[#FF7818] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#FF9A45]">
            Open POS <ArrowUpRight size={13} className="ml-1 inline" />
          </Link>
        </div>
      </div>

      {ordersError && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">Sales data could not be loaded: {ordersError}</p>}
      {productsError && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">Product and inventory data could not be loaded: {productsError}</p>}

      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard title="Today's Sales" value={ordersError ? 'Unavailable' : ordersLoading ? '…' : formatPKR(totalSales)} detail={`${todaySales.length} completed sales today`} icon={CircleDollarSign} />
        <MetricCard title="Orders" value={ordersError ? 'Unavailable' : ordersLoading ? '…' : todayOrders.length.toLocaleString()} detail="All order statuses today" icon={ClipboardList} />
        <MetricCard title="Average Order Value" value={ordersError ? 'Unavailable' : ordersLoading ? '…' : formatPKR(averageOrder)} detail="Completed orders only" icon={CreditCard} />
        <MetricCard title="Inventory Retail Value" value={productsError ? 'Unavailable' : productsLoading ? '…' : formatPKR(inventoryValue)} detail={`${totalInventory.toLocaleString()} sellable units`} icon={Boxes} />
      </div>

      <div className="grid gap-3 2xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,1fr)]">
        <SalesChart points={chartPoints} loading={ordersLoading} error={ordersError} />
        <section className="rounded-xl border border-[#253244] bg-[#111A25] p-4">
          <h2 className="text-sm font-semibold text-[#F5F7FA]">Sales by channel</h2>
          <p className="mt-1 text-[11px] text-[#91A0B5]">Last 7 days · completed sales</p>
          <div className="mt-5 flex items-center gap-5">
            <div className="relative h-32 w-32 shrink-0 rounded-full" style={{ background: `conic-gradient(${channels[0].color} 0 ${channels[0].pct}%, #64748B ${channels[0].pct}% 100%)` }}>
              <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-[#111A25]">
                <span className="text-center text-sm font-bold">{ordersError ? '—' : formatPKR(finalizedOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0))}</span>
                <span className="text-[10px] text-[#91A0B5]">Total sales</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              {channels.map((channel) => (
                <div key={channel.name}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 text-[#F5F7FA]"><i className="h-2 w-2 rounded-full" style={{ background: channel.color }} />{channel.name}</span>
                    <b>{ordersError ? '—' : `${channel.pct.toFixed(1)}%`}</b>
                  </div>
                  <p className="mt-1 text-[11px] text-[#91A0B5]">{ordersError ? 'Unavailable' : formatPKR(channel.value)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="grid items-start gap-3 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-[#253244] bg-[#111A25]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#253244] p-4">
            <div><h2 className="text-sm font-semibold">Top inventory</h2><p className="mt-1 text-[11px] text-[#91A0B5]">Lowest stock across active products</p></div>
            {isAdmin && <Link to="/admin?tab=inventory" className="text-xs font-semibold text-[#FF9A45] hover:text-[#FF7818]">View inventory <ArrowUpRight size={13} className="ml-1 inline" /></Link>}
          </div>
          <div className="flex gap-4 border-b border-[#253244] px-4 text-[11px]">
            <span className="border-b-2 border-[#FF7818] py-2 text-[#FF9A45]">Products ({products.length})</span>
            <span className="py-2 text-[#91A0B5]">Low stock ({lowStock.length})</span>
            <span className="py-2 text-[#91A0B5]">Out of stock ({products.filter((product) => inventoryUnits(product) <= 0).length})</span>
          </div>
          {productsLoading ? (
            <div role="status" aria-label="Loading inventory" className="space-y-3 p-4">{[0, 1, 2].map((row) => <div key={row} className="h-10 animate-pulse rounded bg-[#253244]" />)}</div>
          ) : productsError ? null : products.length === 0 ? (
            <p className="p-8 text-center text-xs text-[#91A0B5]">No active products found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="bg-[#151F2B] text-[10px] uppercase tracking-wider text-[#91A0B5]">
                  <tr>{['Product', 'SKU', 'Category', 'Stock', 'Stock status', 'Retail value'].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-[#253244]">
                  {products.slice().sort((a, b) => inventoryUnits(a) - inventoryUnits(b)).slice(0, 6).map((product) => {
                    const units = inventoryUnits(product);
                    return (
                      <tr key={product.id} className="transition hover:bg-[#151F2B]/70">
                        <td className="px-4 py-2.5"><div className="flex items-center gap-2.5"><div className="h-9 w-9 overflow-hidden rounded-md bg-[#151F2B]">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <Shirt size={17} className="m-2.5 text-[#91A0B5]" />}</div><span className="max-w-36 truncate font-medium">{product.name}</span></div></td>
                        <td className="px-4 py-2.5 text-[#91A0B5]">{product.sku || '—'}</td>
                        <td className="px-4 py-2.5 text-[#91A0B5]">{product.category || '—'}</td>
                        <td className="px-4 py-2.5 tabular-nums">{units}</td>
                        <td className="px-4 py-2.5"><span className={`rounded-md px-2 py-1 text-[10px] ${units <= 0 ? 'bg-red-500/10 text-red-400' : units <= LOW_STOCK_THRESHOLD ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{units <= 0 ? 'Out of stock' : units <= LOW_STOCK_THRESHOLD ? 'Low stock' : 'In stock'}</span></td>
                        <td className="px-4 py-2.5 text-[#F5F7FA]">{formatPKR(inventoryRetailValue(product))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-3">
          <section className="rounded-xl border border-[#253244] bg-[#111A25] p-4">
            <div className="flex items-center justify-between">
              <div><h2 className="text-sm font-semibold">Recent transactions</h2><p className="mt-1 text-[11px] text-[#91A0B5]">Last 7 days</p></div>
              {isAdmin && <Link to="/admin?tab=orders" className="text-xs text-[#FF9A45]">All orders</Link>}
            </div>
            <div className="mt-3 divide-y divide-[#253244]">
              {ordersLoading ? <div role="status" className="space-y-2 py-2"><div className="h-8 animate-pulse rounded bg-[#253244]" /><div className="h-8 animate-pulse rounded bg-[#253244]" /></div>
                : ordersError ? <p role="status" className="py-4 text-center text-xs text-amber-300">Transactions unavailable.</p>
                  : orders.slice().reverse().slice(0, 4).map((order) => (
                    <div key={order.id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                      <div className="flex min-w-0 items-center gap-2"><span className="rounded-lg bg-[#151F2B] p-2 text-[#FF9A45]"><Receipt size={15} /></span><div className="min-w-0"><p className="font-medium">Order #{order.order_number ?? String(order.id).slice(0, 8).toUpperCase()}</p><p className="truncate text-[10px] capitalize text-[#91A0B5]">{new Date(order.created_at).toLocaleString()} · {order.channel || 'sale'} · {order.status}</p></div></div>
                      <b className="shrink-0">{formatPKR(order.total_amount)}</b>
                    </div>
                  ))}
              {!ordersLoading && !ordersError && orders.length === 0 && <p className="py-6 text-center text-xs text-[#91A0B5]">No recent transactions.</p>}
            </div>
          </section>
          <section className="rounded-xl border border-[#253244] bg-[#111A25] p-4">
            <div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Alerts &amp; notifications</h2><p className="mt-1 text-[11px] text-[#91A0B5]">Stock status</p></div><AlertTriangle size={17} className="text-amber-300" /></div>
            {productsError ? <p role="status" className="py-4 text-xs text-amber-300">Inventory alerts unavailable.</p>
              : lowStock.length === 0 ? <p className="py-4 text-xs text-[#91A0B5]">No low-stock alerts.</p>
                : <div className="mt-3 space-y-3">{lowStock.slice(0, 4).map((product) => {
                  const units = inventoryUnits(product);
                  return <div key={product.id} className="flex gap-2 text-xs"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" /><div><p className="font-medium">{units <= 0 ? 'Out of stock' : 'Low stock'}</p><p className="mt-0.5 text-[10px] text-[#91A0B5]">{product.name} · {units} units</p></div></div>;
                })}</div>}
          </section>
          <Link to="/pos" className="flex items-center justify-between rounded-xl border border-[#FF7818]/30 bg-[#FF7818]/10 p-4 transition hover:border-[#FF7818]">
            <div className="flex items-center gap-3"><ShoppingCart size={18} className="text-[#FF9A45]" /><div><p className="text-sm font-semibold">Start a sale</p><p className="text-[11px] text-[#91A0B5]">Open the retail POS terminal</p></div></div>
            <ArrowUpRight size={16} className="text-[#FF9A45]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
