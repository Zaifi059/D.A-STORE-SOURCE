import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePosCart } from './usePosCart';

const product = {
  id: 'product-1',
  name: 'Jacket',
  price: 100,
  stock_count: 5,
  product_variants: [
    { id: 'variant-1', size: 'M', color: 'Black', price_override: 120, stock_count: 2, is_active: true },
  ],
};

describe('usePosCart', () => {
  it('keeps variant options as separate lines and never exceeds available stock', () => {
    const { result } = renderHook(() => usePosCart());

    act(() => {
      result.current.add(product, product.product_variants[0]);
      result.current.add(product, product.product_variants[0]);
      result.current.setQty('product-1:variant-1', 4);
    });

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0]).toMatchObject({
      id: 'product-1:variant-1',
      quantity: 2,
      price: 120,
      size: 'M',
      color: 'Black',
    });
  });

  it('refreshes price and stock when product data changes', () => {
    const { result } = renderHook(() => usePosCart());
    const basicProduct = { ...product, product_variants: [] };
    act(() => result.current.add(basicProduct));

    act(() => result.current.syncStock([{ ...basicProduct, price: 135, stock_count: 3 }]));

    expect(result.current.lines[0]).toMatchObject({ price: 135, stock_count: 3 });
  });

  it('restores held sale lines without dropping product metadata', () => {
    const { result } = renderHook(() => usePosCart());
    const heldLine = {
      id: 'product-1:variant-1',
      product_id: 'product-1',
      variant_id: 'variant-1',
      name: 'Jacket',
      sku: 'JKT-M-BLK',
      image_url: '/jacket.jpg',
      size: 'M',
      color: 'Black',
      price: 120,
      stock_count: 2,
      quantity: 1,
    };

    act(() => result.current.replace([heldLine]));

    expect(result.current.lines).toEqual([heldLine]);
  });
});
