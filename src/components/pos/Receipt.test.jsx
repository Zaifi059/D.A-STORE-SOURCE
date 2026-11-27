import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Receipt from './Receipt';

describe('Receipt', () => {
  it('prints cash tendered and change without showing a walk-in account balance', () => {
    render(
      <Receipt sale={{
        order: {
          order_number: 'POS-1',
          created_at: '2026-11-27T12:00:00.000Z',
          customer_info: { name: 'Walk-in customer' },
          total_amount: 100,
          amount_received: 100,
          change_due: 20,
          balance_due: 100,
        },
        items: [{ name: 'Shirt', quantity: 1, price: 100 }],
        method: 'cash',
        cashier: 'Cashier',
      }} />
    );

    expect(screen.getByText('Received (Cash)').parentElement).toHaveTextContent('Rs. 120');
    expect(screen.getByText('Change').parentElement).toHaveTextContent('Rs. 20');
    expect(screen.queryByText('Balance on account')).not.toBeInTheDocument();
  });
});
