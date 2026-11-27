/**
 * Pricing and stock rules for products and their size/color variants.
 * These mirror the database logic in process_order so the cart shows the same totals the server charges.
 */

export const activeVariants = (product) => (product?.product_variants ?? []).filter((v) => v.is_active);

export const hasVariants = (product) => activeVariants(product).length > 0;

/** Price the customer pays per unit. Order: variant override, then sale price, then list price. */
export function unitPriceFor(product, variant = null) {
  return Number(variant?.price_override ?? product.sale_price ?? product.price);
}

/** Price before any sale or override. */
export function regularPriceFor(product, variant = null) {
  return Number(variant?.price_override ?? product.price);
}

export const isOnSale = (product, variant = null) =>
  unitPriceFor(product, variant) < regularPriceFor(product, variant);

/** Stock that can be sold: the chosen variant's stock for products with variants, otherwise the product's stock. */
export function stockFor(product, variant = null) {
  if (hasVariants(product)) return variant?.stock_count ?? 0;
  return product.stock_count ?? 0;
}

/** Distinct sizes and colors offered by a product's active variants, in the order they were created. */
export function variantOptions(product) {
  const list = activeVariants(product);
  return {
    sizes: [...new Set(list.map((v) => v.size))],
    colors: [...new Set(list.map((v) => v.color))],
  };
}

export const findVariant = (product, size, color) =>
  activeVariants(product).find((v) => v.size === size && v.color === color) ?? null;

/** Best starting selection: the first size/color combination that is in stock, else the first one. */
export function defaultVariant(product) {
  const list = activeVariants(product);
  return list.find((v) => v.stock_count > 0) ?? list[0] ?? null;
}
