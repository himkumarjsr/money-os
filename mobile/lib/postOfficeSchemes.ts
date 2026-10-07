/**
 * India Post / National Small Savings rates.
 * Source: MoF DEA notifications + DoP SB Orders (unchanged through Jul–Sep 2026).
 * Confirm on India Post / nsiindia.gov.in before investing — rates can change quarterly.
 */
export const PO_RATES_PERIOD = "Jul–Sep 2026";
export const PO_RATES_SOURCE =
  "MoF DEA small-savings circular / DoP SB Order (rates unchanged for Q2 FY 2026-27)";

export const PO_RATES = {
  savings: 4.0,
  td1: 6.9,
  td2: 7.0,
  td3: 7.1,
  td5: 7.5,
  rd: 6.7,
  scss: 8.2,
  mis: 7.4,
  nsc: 7.7,
  ppf: 7.1,
  kvp: 7.5,
  kvpMonths: 115,
  ssy: 8.2,
} as const;

export type PoTdYears = 1 | 2 | 3 | 5;

export function poTdRate(years: PoTdYears): number {
  if (years === 1) return PO_RATES.td1;
  if (years === 2) return PO_RATES.td2;
  if (years === 3) return PO_RATES.td3;
  return PO_RATES.td5;
}

/** Post Office Time Deposit — interest compounded quarterly. */
export function poTdMaturity(
  principal: number,
  years: PoTdYears,
  annualPct = poTdRate(years),
) {
  return principal * Math.pow(1 + annualPct / 100 / 4, 4 * years);
}

/**
 * National Savings Recurring Deposit maturity (official-style formula).
 * i = rate/400 (quarterly), n = quarters, R = monthly deposit.
 */
export function poRdMaturity(
  monthly: number,
  years = 5,
  annualPct: number = PO_RATES.rd,
) {
  const i = annualPct / 400;
  const n = years * 4;
  if (i <= 0) return monthly * years * 12;
  const factor = (Math.pow(1 + i, n) - 1) / (1 - Math.pow(1 + i, -1 / 3));
  return monthly * factor;
}

/** NSC VIII — compounded annually, 5 years. */
export function poNscMaturity(
  principal: number,
  annualPct: number = PO_RATES.nsc,
) {
  return principal * Math.pow(1 + annualPct / 100, 5);
}

/** KVP — currently doubles in 115 months at notified rate. */
export function poKvpMaturity(
  principal: number,
  months: number = PO_RATES.kvpMonths,
) {
  // Notified maturity doubles the deposit at current tenure.
  void months;
  return principal * 2;
}

export function poMisMonthly(
  principal: number,
  annualPct: number = PO_RATES.mis,
) {
  return (principal * annualPct) / 100 / 12;
}

export function poScssQuarterly(
  principal: number,
  annualPct: number = PO_RATES.scss,
) {
  return (principal * annualPct) / 100 / 4;
}

export function poSavingsYearly(
  principal: number,
  annualPct: number = PO_RATES.savings,
) {
  return (principal * annualPct) / 100;
}

/** SSY-style yearly deposit, annual compounding (deposits at year-start). */
export function poSsyMaturity(
  yearly: number,
  years: number,
  annualPct: number = PO_RATES.ssy,
) {
  const r = annualPct / 100;
  if (years <= 0) return 0;
  if (r <= 0) return yearly * years;
  return yearly * ((Math.pow(1 + r, years) - 1) / r) * (1 + r);
}
