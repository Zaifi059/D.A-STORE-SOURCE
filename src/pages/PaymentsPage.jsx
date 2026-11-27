import { useState } from 'react';
import CustomerPanel from '../components/pos/CustomerPanel';
import SummaryCards from '../components/payments/SummaryCards';
import OpenInvoices from '../components/payments/OpenInvoices';
import RecordPaymentForm from '../components/payments/RecordPaymentForm';
import LedgerTable from '../components/payments/LedgerTable';
import PaymentHistory from '../components/payments/PaymentHistory';
import { useCustomerSummary } from '../hooks/useCustomerSummary';
import { useAuth } from '../context/AuthContext';

/** Customer credit and payment collection. Every change refreshes the balance, invoices, ledger and history. */
export default function PaymentsPage() {
  const { isAdmin } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { summary, refresh } = useCustomerSummary(customer?.id);

  const changed = () => {
    setRefreshKey((k) => k + 1);
    refresh();
  };

  return (
    <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
      <aside className="h-fit space-y-3 rounded-xl border border-[#253244] bg-[#111A25] p-4">
        <div><h1 className="text-base font-semibold text-[#F5F7FA]">Customer accounts</h1><p className="mt-1 text-xs text-[#91A0B5]">Search or select a customer to review their account.</p></div>
        <CustomerPanel selected={customer} onSelect={setCustomer} summary={summary} />
      </aside>

      <section className="min-w-0 space-y-5">
        {!customer ? (
          <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-[#253244] bg-[#111A25]/50 p-6 text-center">
            <p className="text-sm font-medium text-[#F5F7FA]">Select a customer</p>
            <p className="mt-1 text-xs text-[#91A0B5]">Their credit balance, invoices, payments and ledger will appear here.</p>
          </div>
        ) : (
          <>
            <SummaryCards summary={summary} />
            <section className="space-y-3 rounded-xl border border-[#253244] bg-[#111A25] p-4">
              <div><h2 className="text-sm font-semibold text-[#F5F7FA]">Open invoices</h2><p className="mt-1 text-xs text-[#91A0B5]">Unpaid and part-paid sales, oldest first.</p></div>
              <OpenInvoices customerId={customer.id} refreshKey={refreshKey} />
            </section>
            <RecordPaymentForm customer={customer} owes={summary?.outstanding ?? 0} onSaved={changed} />
            <PaymentHistory customer={customer} isAdmin={isAdmin} refreshKey={refreshKey} onChanged={changed} />
            <LedgerTable customer={customer} refreshKey={refreshKey} summary={summary} />
          </>
        )}
      </section>
    </div>
  );
}
