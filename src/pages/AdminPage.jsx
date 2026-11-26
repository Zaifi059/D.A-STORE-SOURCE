import { useState } from 'react';
import { useAllProducts } from '../hooks/useProducts';
import StaffHeader from '../components/StaffHeader';
import LowStockBanner from '../components/admin/LowStockBanner';
import ProductManager from '../components/admin/ProductManager';
import OrdersTable from '../components/admin/OrdersTable';

export default function AdminPage() {
  const { products, loading, error } = useAllProducts();
  const [tab, setTab] = useState('products');
  const [lowOnly, setLowOnly] = useState(false);

  const tabCls = (active) =>
    `border-b-2 px-4 py-2 text-sm font-semibold ${active ? 'border-amber-500 text-amber-400' : 'border-transparent text-neutral-400 hover:text-white'}`;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <StaffHeader title="Admin Dashboard" />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <LowStockBanner products={products} onView={() => { setTab('products'); setLowOnly(true); }} />

        <div className="flex border-b border-neutral-800">
          <button onClick={() => setTab('products')} className={tabCls(tab === 'products')}>Products</button>
          <button onClick={() => setTab('orders')} className={tabCls(tab === 'orders')}>Orders</button>
        </div>

        {error && <p className="text-red-400">{error}</p>}
        {tab === 'products'
          ? <ProductManager products={products} loading={loading} lowOnly={lowOnly} setLowOnly={setLowOnly} />
          : <OrdersTable />}
      </main>
    </div>
  );
}
