import { describe, expect, it } from 'vitest';
import { computeTotals, normalizePhone } from './posMath';

const lines = [{ price: 4999, quantity: 2 }, { price: 1500, quantity: 1 }];

describe('normalizePhone', () => {
  it('strips everything except digits', () => {
    expect(normalizePhone('0300-123 4567')).toBe('03001234567');
    expect(normalizePhone(null)).toBe('');
  });
});

describe('computeTotals', () => {
  it('computes subtotal and payable with a discount', () => {
    const t = computeTotals({ lines, discount: 500, method: 'bank_transfer' });
    expect(t).toMatchObject({ subtotal: 11498, discount: 500, payable: 10998, received: 10998, change: 0, canComplete: true });
  });

  it('calculates change for overpaid cash', () => {
    const t = computeTotals({ lines, discount: 0, method: 'cash', tendered: 12000 });
    expect(t.change).toBe(502);
    expect(t.canComplete).toBe(true);
  });

  it('blocks a cash shortfall for walk-in customers', () => {
    const t = computeTotals({ lines, discount: 0, method: 'cash', tendered: 10000, creditAllowed: false });
    expect(t.shortBy).toBe(1498);
    expect(t.canComplete).toBe(false);
  });

  it('allows a shortfall as a credit sale when the customer has a credit account', () => {
    const t = computeTotals({ lines, discount: 0, method: 'cash', tendered: 10000, creditAllowed: true });
    expect(t.onCredit).toBe(1498);
    expect(t.canComplete).toBe(true);
  });

  it('defaults bank transfer to the full amount when nothing is typed', () => {
    const t = computeTotals({ lines, method: 'bank_transfer', tendered: '' });
    expect(t.received).toBe(11498);
    expect(t.shortBy).toBe(0);
  });

  it('defaults cash to zero received when nothing is typed', () => {
    const t = computeTotals({ lines, method: 'cash', tendered: '' });
    expect(t.received).toBe(0);
    expect(t.shortBy).toBe(11498);
  });

  it('blocks a discount above the subtotal', () => {
    const t = computeTotals({ lines, discount: 99999, method: 'bank_transfer' });
    expect(t.discountError).toMatch(/more than the subtotal/);
    expect(t.canComplete).toBe(false);
  });

  it('blocks non-numeric and negative amounts received', () => {
    expect(computeTotals({ lines, method: 'cash', tendered: 'invalid' }).paymentError)
      .toMatch(/valid, non-negative/);
    expect(computeTotals({ lines, method: 'cash', tendered: -1 }).canComplete).toBe(false);
  });

  it('blocks bank transfers above the payable total', () => {
    const t = computeTotals({ lines, method: 'bank_transfer', tendered: 12000 });
    expect(t.paymentError).toMatch(/cannot exceed/);
    expect(t.canComplete).toBe(false);
  });

  it('blocks a non-numeric discount instead of treating it as zero', () => {
    const t = computeTotals({ lines, discount: 'invalid', method: 'cash', tendered: 11498 });
    expect(t.discountError).toMatch(/valid discount/);
    expect(t.canComplete).toBe(false);
  });

  it('blocks an empty cart', () => {
    expect(computeTotals({ lines: [], method: 'cash', tendered: 0 }).canComplete).toBe(false);
  });

  it('keeps money to two decimals', () => {
    const t = computeTotals({ lines: [{ price: 0.1, quantity: 3 }], method: 'bank_transfer' });
    expect(t.subtotal).toBe(0.3);
  });
});
