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
