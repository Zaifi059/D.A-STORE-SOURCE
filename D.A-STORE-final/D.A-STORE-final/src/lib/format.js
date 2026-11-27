export const formatPKR = (amount) =>
  `Rs. ${Number(amount ?? 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
