import { useState } from 'react';
import StaffHeader from '../components/StaffHeader';
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <StaffHeader title="Payments & Credit" />
      <main className="mx-auto grid max-w-[1400px] gap-6 p-4 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-3">
          <h2 className="text-sm font-semibold">Customer</h2>
          <CustomerPanel selected={customer} onSelect={setCustomer} summary={summary} />
        </aside>

        <section className="min-w-0 space-y-6">
          {!customer ? (
            <p className="py-20 text-center text-neutral-500">Select a customer to see their balance, invoices and ledger.</p>
          ) : (
            <>
              <SummaryCards summary={summary} />
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Open invoices</h3>
                <OpenInvoices customerId={customer.id} refreshKey={refreshKey} />
              </section>
              <RecordPaymentForm customer={customer} owes={summary?.outstanding ?? 0} onSaved={changed} />
              <PaymentHistory customer={customer} isAdmin={isAdmin} refreshKey={refreshKey} onChanged={changed} />
              <LedgerTable customer={customer} refreshKey={refreshKey} summary={summary} />
            </>
          )}
        </section>
      </main>
    </div>
  );
}
