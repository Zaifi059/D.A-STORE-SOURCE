import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/** Credit summary for one customer, from the database (ledger-based, never a stored total). */
export function useCustomerSummary(customerId) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!customerId) {
      setSummary(null);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.rpc('get_customer_summary', { p_customer_id: customerId });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setError('');
    setSummary(data);
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  return { summary, loading, error, refresh: load };
}
