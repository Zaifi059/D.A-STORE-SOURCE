import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const { products, refresh, rpc, from } = vi.hoisted(() => ({
  products: [
    {
      id: 'tee-1',
      name: 'Cotton Tee',
      sku: 'TEE-BLK',
      barcode: '10001',
      category: 'T-Shirts',
      price: 1250,
      stock_count: 8,
      image_url: null,
      is_active: true,
      product_variants: [],
    },
    {
      id: 'jacket-1',
      name: 'Denim Jacket',
      sku: 'JKT-01',
      barcode: '20001',
      category: 'Jackets',
      price: 3500,
      stock_count: 3,
      image_url: null,
      is_active: true,
      product_variants: [
        { id: 'jacket-m-navy', size: 'M', color: 'Navy', sku: 'JKT-M-NVY', stock_count: 2, is_active: true },
        { id: 'jacket-l-navy', size: 'L', color: 'Navy', sku: 'JKT-L-NVY', stock_count: 0, is_active: true },
      ],
    },
  ],
  refresh: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(async () => ({ data: [], error: null })),
    })),
  })),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'cashier@dastore.test' }, profile: { full_name: 'Test Cashier' }, isAdmin: false }),
}));

vi.mock('../hooks/useProducts', () => ({
  useProducts: () => ({ products, loading: false, error: '', refresh, realtimeStatus: 'SUBSCRIBED' }),
}));

vi.mock('../hooks/useCustomerSummary', () => ({
  useCustomerSummary: () => ({ summary: null, loading: false, error: '' }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: { rpc, from },
}));

import PosPage from './PosPage';

function renderPos() {
  return render(<MemoryRouter><PosPage /></MemoryRouter>);
}

describe('POS terminal', () => {
  beforeEach(() => {
    refresh.mockClear();
    rpc.mockReset();
    from.mockClear();
  });

  it('filters catalog using real product categories and SKU search', () => {
    renderPos();

    fireEvent.click(screen.getByRole('button', { name: 'T-Shirts' }));
    expect(screen.getByRole('button', { name: /Cotton Tee/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Denim Jacket/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Search products' }), { target: { value: 'JKT-M-NVY' } });
    expect(screen.getByRole('button', { name: /Denim Jacket/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cotton Tee/ })).not.toBeInTheDocument();
  });

  it('requires an available size and color variant before adding it to the cart', () => {
    renderPos();
    fireEvent.click(screen.getByRole('button', { name: /Denim Jacket/ }));

    const chooser = screen.getByRole('dialog', { name: 'Choose options for Denim Jacket' });
    expect(chooser).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'L' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));

    expect(screen.getByText(/M \/ Navy/)).toBeInTheDocument();
    expect(screen.getByText(/SKU JKT-M-NVY/)).toBeInTheDocument();
  });

  it('holds and resumes a sale draft and validates the amount received', () => {
    renderPos();
    fireEvent.click(screen.getByRole('button', { name: /Cotton Tee/ }));

    const received = screen.getByRole('spinbutton', { name: 'Cash received' });
    fireEvent.change(received, { target: { value: '100' } });
    expect(screen.getByRole('button', { name: 'Complete payment' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Hold sale' }));
    expect(screen.getByText('Your sale is empty.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Held/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));

    expect(screen.getAllByText('Cotton Tee')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Complete payment' })).toBeDisabled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('submits a completed sale through the existing RPC and opens the printable receipt', async () => {
    rpc.mockResolvedValue({
      data: {
        id: 'order-1',
        order_number: 'POS-1001',
        created_at: new Date().toISOString(),
        customer_info: { name: 'Walk-in customer' },
        total_amount: 1250,
        subtotal_amount: 1250,
        discount_amount: 0,
        amount_received: 1250,
        change_due: 0,
      },
      error: null,
    });
    renderPos();

    fireEvent.click(screen.getByRole('button', { name: /Cotton Tee/ }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Cash received' }), { target: { value: '1250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete payment' }));

    expect(await screen.findByText('Sale completed')).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('create_pos_sale', expect.objectContaining({
      p_items: [{ product_id: 'tee-1', variant_id: null, quantity: 1 }],
      p_payment_method: 'cash',
      p_amount_received: 1250,
    }));

    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: 'Print receipt' }));
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });
});
