import { describe, expect, it } from 'vitest';
import { withRunningBalance } from './ledger';

describe('withRunningBalance', () => {
  it('accumulates debits and credits in order', () => {
    const rows = [
      { debit: 200, credit: 0 },
      { debit: 4999, credit: 0 },
      { debit: 0, credit: 1000 },
    ];
    expect(withRunningBalance(rows).map((r) => r.balance)).toEqual([200, 5199, 4199]);
  });

  it('shows a negative balance when the customer has paid in advance', () => {
    expect(withRunningBalance([{ debit: 0, credit: 300 }])[0].balance).toBe(-300);
  });

  it('handles empty input', () => {
    expect(withRunningBalance([])).toEqual([]);
  });
});
