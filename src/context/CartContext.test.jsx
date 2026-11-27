import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';

const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
const suit = { id: 'p1', name: 'Charcoal Suit', price: 25000, image_url: null, stock_count: 3 };

describe('CartContext', () => {
  it('adds items and tracks count and subtotal', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(suit, 2));
    expect(result.current.count).toBe(2);
    expect(result.current.subtotal).toBe(50000);
    expect(result.current.isOpen).toBe(true);
  });

  it('never exceeds available stock', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(suit, 2));
    act(() => result.current.addItem(suit, 5));
    expect(result.current.items[0].quantity).toBe(3);
  });

  it('ignores adds for sold-out products', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem({ ...suit, stock_count: 0 }, 1));
    expect(result.current.items).toHaveLength(0);
  });

  it('removes a line when quantity drops to zero', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(suit, 1));
    act(() => result.current.setQuantity('p1', 0));
    expect(result.current.items).toHaveLength(0);
  });

  it('persists the cart to localStorage', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(suit, 1));
    expect(JSON.parse(localStorage.getItem('da-store-cart'))[0].id).toBe('p1');
  });
});

describe('CartContext variants', () => {
  const tee = {
    id: 'shirt', name: 'Oxford Shirt', price: 5000, sale_price: null, image_url: null, stock_count: 3,
    product_variants: [
      { id: 'va', size: 'M', color: 'Black', stock_count: 2, price_override: null, is_active: true },
      { id: 'vb', size: 'M', color: 'White', stock_count: 1, price_override: null, is_active: true },
    ],
  };

  it('keeps each size/color as its own line with its own stock cap', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(tee, 1, tee.product_variants[0]));
    act(() => result.current.addItem(tee, 5, tee.product_variants[0]));
    act(() => result.current.addItem(tee, 1, tee.product_variants[1]));
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.items[0]).toMatchObject({ product_id: 'shirt', variant_id: 'va', size: 'M', color: 'Black' });
    expect(result.current.items[1].quantity).toBe(1);
  });

  it('refuses to add a product with variants without a chosen variant', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(tee, 1));
    expect(result.current.items).toHaveLength(0);
  });

  it('upgrades carts saved before variants existed', () => {
    localStorage.setItem('da-store-cart', JSON.stringify([{ id: 'old', name: 'Old', price: 100, stock_count: 4, quantity: 1 }]));
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items[0]).toMatchObject({ product_id: 'old', variant_id: null, size: null });
  });
});
