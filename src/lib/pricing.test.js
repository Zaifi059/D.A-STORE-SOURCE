import { describe, expect, it } from 'vitest';
import { defaultVariant, findVariant, hasVariants, isOnSale, stockFor, unitPriceFor, variantOptions } from './pricing';

const shirt = {
  id: 'p1', price: 5000, sale_price: 4000, stock_count: 3,
  product_variants: [
    { id: 'v1', size: 'M', color: 'Black', stock_count: 0, price_override: null, is_active: true },
    { id: 'v2', size: 'L', color: 'Black', stock_count: 2, price_override: 4500, is_active: true },
    { id: 'v3', size: 'L', color: 'White', stock_count: 1, price_override: null, is_active: false },
  ],
};
const plain = { id: 'p2', price: 1500, sale_price: null, stock_count: 7, product_variants: [] };

describe('pricing', () => {
  it('uses sale price for plain products and list price when there is no sale', () => {
    expect(unitPriceFor(plain)).toBe(1500);
    expect(unitPriceFor({ ...plain, sale_price: 1200 })).toBe(1200);
    expect(isOnSale({ ...plain, sale_price: 1200 })).toBe(true);
  });

  it('prefers a variant price override over the sale price', () => {
    expect(unitPriceFor(shirt, shirt.product_variants[1])).toBe(4500);
    expect(unitPriceFor(shirt, shirt.product_variants[0])).toBe(4000);
  });

  it('uses the variant stock for products with variants and product stock otherwise', () => {
    expect(stockFor(shirt, shirt.product_variants[1])).toBe(2);
    expect(stockFor(shirt, null)).toBe(0);
    expect(stockFor(plain, null)).toBe(7);
  });

  it('ignores inactive variants when listing options', () => {
    expect(variantOptions(shirt)).toEqual({ sizes: ['M', 'L'], colors: ['Black'] });
    expect(hasVariants(shirt)).toBe(true);
    expect(hasVariants(plain)).toBe(false);
  });

  it('finds a variant by size and color, and skips inactive ones', () => {
    expect(findVariant(shirt, 'L', 'Black').id).toBe('v2');
    expect(findVariant(shirt, 'L', 'White')).toBeNull();
  });

  it('starts on the first in-stock combination', () => {
    expect(defaultVariant(shirt).id).toBe('v2');
  });
});
