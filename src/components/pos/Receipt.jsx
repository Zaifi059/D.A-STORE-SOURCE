import { formatPKR } from '../../lib/format';

/** 80mm thermal receipt. Printed via #receipt-print rules in index.css. */
export default function Receipt({ sale }) {
  const { order, items, method, cashier } = sale;
  const info = order.customer_info ?? {};
  const row = 'flex justify-between gap-2';
  const discount = Number(order.discount_amount ?? 0);
  const change = Number(order.change_due ?? 0);
  const received = Number(order.amount_received ?? order.total_amount) + change;

  return (
    <div id="receipt-print" className="mx-auto w-[302px] bg-white p-3 font-mono text-[12px] leading-snug text-black">
      <div className="text-center">
        <p className="text-xl font-bold tracking-wider">D.A STORE</p>
        <p>Clothing &amp; Fashion</p>
        <p className="text-[10px]">Dress Better · Live Stylish</p>
      </div>
      <hr className="my-2 border-dashed border-black" />
      <p>Order #: {order.order_number}</p>
      <p>Date: {new Date(order.created_at).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</p>
      <p>Cashier: {cashier}</p>
      <p>Customer: {info.name ?? 'Walk-in'}{info.customer_code ? ` (${info.customer_code})` : ''}</p>
      {info.phone && <p>Phone: {info.phone}</p>}
      <hr className="my-2 border-dashed border-black" />
      {items.map((i, idx) => (
        <div key={idx} className="mb-1">
          <p className="break-words">{i.name}{i.size ? ` · ${i.size}/${i.color}` : ''}</p>
          {i.sku && <p className="text-[10px]">SKU: {i.sku}</p>}
          <div className={row}>
            <span>{i.quantity} x {formatPKR(i.price)}</span>
            <span>{formatPKR(i.quantity * i.price)}</span>
          </div>
        </div>
      ))}
      <hr className="my-2 border-dashed border-black" />
      <div className={row}><span>Subtotal</span><span>{formatPKR(order.subtotal_amount ?? order.total_amount)}</span></div>
      {discount > 0 && <div className={row}><span>Discount</span><span>-{formatPKR(discount)}</span></div>}
      <div className={`${row} text-sm font-bold`}><span>TOTAL</span><span>{formatPKR(order.total_amount)}</span></div>
      <div className={row}><span>Received ({method === 'cash' ? 'Cash' : 'Bank transfer'})</span><span>{formatPKR(received)}</span></div>
      {change > 0 && <div className={row}><span>Change</span><span>{formatPKR(change)}</span></div>}
      {order.customer_id && Number(order.balance_due ?? 0) > 0 && (
        <div className={`${row} font-bold`}><span>Balance on account</span><span>{formatPKR(order.balance_due)}</span></div>
      )}
      <hr className="my-2 border-dashed border-black" />
      <p className="text-center text-[10px]">Returns accepted within 7 days with receipt.</p>
      <p className="text-center">Thank you for shopping with D.A STORE.</p>
    </div>
  );
}
