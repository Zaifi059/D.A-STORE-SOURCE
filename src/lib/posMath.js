/**
 * POS totals. Pure functions so the rules can be tested without the UI.
 * The database re-checks every value in create_pos_sale; these numbers are for the cashier's screen.
 */

const round2 = (n) => Math.round(Number(n) * 100) / 100;

/** Digits only, so "0300-123 4567" and "03001234567" match the same customer. */
export const normalizePhone = (value) => String(value ?? '').replace(/\D/g, '');

/**
 * @param {object} input
 * @param {{price:number, quantity:number}[]} input.lines
 * @param {number|string} [input.discount]
 * @param {'cash'|'bank_transfer'} input.method
 * @param {number|string} [input.tendered] amount received; blank means full payment for bank transfer, zero for cash
 * @param {boolean} [input.creditAllowed] true when a customer with a credit limit is selected
 */
export function computeTotals({ lines, discount = 0, method, tendered = '', creditAllowed = false }) {
  const subtotal = round2(lines.reduce((n, l) => n + Number(l.price) * l.quantity, 0));
  const discountValue = discount === '' || discount == null ? 0 : Number(discount);
  const disc = round2(Number.isFinite(discountValue) ? discountValue : 0);
  const discountError = !Number.isFinite(discountValue)
    ? 'Enter a valid discount amount.'
    : disc < 0
      ? 'Discount cannot be negative.'
      : disc > subtotal
        ? 'Discount cannot be more than the subtotal.'
        : '';

  const payable = round2(Math.max(0, subtotal - Math.max(0, disc)));

  const blank = tendered === '' || tendered == null;
  const tenderedValue = blank ? null : Number(tendered);
  const invalidTendered = !blank && (!Number.isFinite(tenderedValue) || tenderedValue < 0);
  const received = blank
    ? method === 'bank_transfer' ? payable : 0
    : round2(Number.isFinite(tenderedValue) ? tenderedValue : 0);

  const change = method === 'cash' ? Math.max(0, round2(received - payable)) : 0;
  const shortBy = Math.max(0, round2(payable - received));
  const paymentError = invalidTendered
    ? 'Amount received must be a valid, non-negative amount.'
    : method === 'bank_transfer' && received > payable
      ? 'Bank transfer cannot exceed the payable total.'
      : '';

  // Any shortfall is a credit sale. It must be allowed for this customer.
  const shortfallOk = shortBy === 0 || creditAllowed;
  const validLines = lines.length > 0 && lines.every((line) =>
    Number.isFinite(Number(line.price)) && Number(line.price) >= 0 &&
    Number.isInteger(Number(line.quantity)) && Number(line.quantity) > 0
  );

  return {
    subtotal,
    discount: disc,
    payable,
    received,
    change,
    shortBy,
    onCredit: shortBy,
    discountError,
    paymentError,
    canComplete: validLines && !discountError && !paymentError && shortfallOk,
  };
}
