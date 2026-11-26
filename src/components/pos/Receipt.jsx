import { formatPKR } from '../../lib/format';

/** 80mm thermal receipt. Printed via #receipt-print rules in index.css. */
export default function Receipt({ sale }) {
  const { order, items, method, tendered, change, cashier } = sale;
  const row = 'flex justify-between gap-2';

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
      <hr className="my-2 border-dashed border-black" />
      {items.map((i, idx) => (
        <div key={idx} className="mb-1">
          <p className="break-words">{i.name}</p>
          <div className={row}>
            <span>{i.quantity} x {formatPKR(i.price)}</span>
            <span>{formatPKR(i.quantity * i.price)}</span>
          </div>
        </div>
      ))}
      <hr className="my-2 border-dashed border-black" />
      <div className={`${row} text-sm font-bold`}><span>TOTAL</span><span>{formatPKR(order.total_amount)}</span></div>
      <div className={row}><span>Payment</span><span className="uppercase">{method}</span></div>
      {method === 'cash' && tendered != null && (
        <>
          <div className={row}><span>Tendered</span><span>{formatPKR(tendered)}</span></div>
          <div className={row}><span>Change</span><span>{formatPKR(change)}</span></div>
        </>
      )}
      <hr className="my-2 border-dashed border-black" />
      <p className="text-center">Thank you for shopping at D.A STORE!</p>
    </div>
  );
}
