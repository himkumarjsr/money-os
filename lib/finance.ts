/**
 * Shared financial helpers — extend per calculator in /lib as needed.
 */

export function compoundInterest(
  principal: number,
  annualRate: number,
  years: number,
  compoundsPerYear = 12,
): number {
  if (years <= 0) return principal;
  const r = annualRate / compoundsPerYear;
  const n = compoundsPerYear * years;
  return principal * Math.pow(1 + r, n);
}

export function formatCurrency(
  value: number,
  locale = "en-US",
  currency = "USD",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}
