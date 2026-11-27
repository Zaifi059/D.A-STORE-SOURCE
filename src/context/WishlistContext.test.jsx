import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { WishlistProvider, useWishlist } from './WishlistContext';

const wrapper = ({ children }) => <WishlistProvider>{children}</WishlistProvider>;

describe('WishlistContext', () => {
  it('toggles a product on and off', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });
    act(() => result.current.toggle('p1'));
    expect(result.current.has('p1')).toBe(true);
    expect(result.current.count).toBe(1);
    act(() => result.current.toggle('p1'));
    expect(result.current.has('p1')).toBe(false);
  });

  it('persists saved ids to localStorage', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });
    act(() => result.current.toggle('p2'));
    expect(JSON.parse(localStorage.getItem('da-store-wishlist'))).toEqual(['p2']);
  });

  it('recovers from corrupt storage', () => {
    localStorage.setItem('da-store-wishlist', '{not json');
    const { result } = renderHook(() => useWishlist(), { wrapper });
    expect(result.current.count).toBe(0);
  });
});
