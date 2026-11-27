const round2 = (n) => Math.round(Number(n) * 100) / 100;

/**
 * Adds a running balance to ledger rows that are already ordered oldest first.
 * Positive balance = customer owes money. Negative = advance credit held for the customer.
 */
export function withRunningBalance(rows) {
  let balance = 0;
  return rows.map((row) => {
    balance = round2(balance + Number(row.debit) - Number(row.credit));
    return { ...row, balance };
  });
}
