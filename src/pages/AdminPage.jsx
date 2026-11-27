import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAllProducts } from '../hooks/useProducts';
import LowStockBanner from '../components/admin/LowStockBanner';
import ProductManager from '../components/admin/ProductManager';
import OrdersTable from '../components/admin/OrdersTable';

export default function AdminPage() {
  const { products, loading, error } = useAllProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [tab, setTab] = useState(requestedTab === 'orders' ? 'orders' : 'products');
  const [lowOnly, setLowOnly] = useState(requestedTab === 'inventory');

  useEffect(() => {
    setTab(requestedTab === 'orders' ? 'orders' : 'products');
    setLowOnly(requestedTab === 'inventory');
  }, [requestedTab]);

  const tabCls = (active) =>
    `border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${active ? 'border-[#FF7818] text-[#FF9A45]' : 'border-transparent text-[#91A0B5] hover:text-[#F5F7FA]'}`;
  const chooseTab = (nextTab) => {
    setTab(nextTab === 'orders' ? 'orders' : 'products');
    setLowOnly(nextTab === 'inventory');
    setSearchParams({ tab: nextTab }, { replace: true });
  };
  const changeLowOnly = (value) => {
    setLowOnly(value);
    setSearchParams({ tab: value ? 'inventory' : 'products' }, { replace: true });
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#FF9A45]">Management</p>
        <h1 className="mt-1 text-xl font-semibold text-[#F5F7FA]">{tab === 'orders' ? 'Orders' : lowOnly ? 'Inventory' : 'Products'}</h1>
        <p className="mt-1 text-xs text-[#91A0B5]">Manage products, stock and order fulfillment.</p>
      </div>
      <LowStockBanner products={products} onView={() => chooseTab('inventory')} />
      <div className="flex border-b border-[#253244]">
        <button onClick={() => chooseTab('products')} className={tabCls(tab === 'products')}>Products</button>
        <button onClick={() => chooseTab('orders')} className={tabCls(tab === 'orders')}>Orders</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {tab === 'products'
        ? <ProductManager products={products} loading={loading} lowOnly={lowOnly} setLowOnly={changeLowOnly} />
        : <OrdersTable />}
    </div>
  );
}
