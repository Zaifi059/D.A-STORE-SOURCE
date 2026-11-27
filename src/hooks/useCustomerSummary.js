import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

/** Credit summary for one customer, from the database (ledger-based, never a stored total). */
export function useCustomerSummary(customerId) {
  const [summary, setSummary] = useState(null);
  const [summaryFor, setSummaryFor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!customerId) {
      setSummary(null);
      setSummaryFor(null);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    setSummary(null);
    setError('');
    try {
      const { data, error: err } = await supabase.rpc('get_customer_summary', { p_customer_id: customerId });
      if (currentRequest !== requestId.current) return;
      if (err) throw err;
      setSummary(data);
      setSummaryFor(customerId);
    } catch (err) {
      if (currentRequest === requestId.current) {
        setError(err.message || 'Could not load this customer’s credit summary.');
        setSummaryFor(null);
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
    return () => { requestId.current += 1; };
  }, [load]);

  return { summary: summaryFor === customerId ? summary : null, loading, error, refresh: load };
}
