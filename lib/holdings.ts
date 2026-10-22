/**
 * What the user already holds: equity value and the retirement-account
 * projections. Kept apart from financialEngine so goal funding and the money
 * score can use them without importing the engine. Shared by web and the app
 * (mobile keeps a byte-identical copy at mobile/lib/holdings.ts).
 */
import type { FinancialProfile } from "@/lib/analyse-form-schema";

function n(v: number | undefined): number {
  return v ?? 0;
}

/** Market-linked equity holdings: the summary total when given, otherwise the sum of the individual fields. */
export function existingEquityValue(data: Partial<FinancialProfile>): number {
  if (n(data.totalEquityValue) > 0) return n(data.totalEquityValue);
  return (
    n(data.mfValue) +
    n(data.indianStocksValue) +
    n(data.usStocksValueINR) +
    n(data.usMFValueINR) +
    n(data.rsuValueINR)
  );
}

/**
 * Typical long-run annual rates for retirement accounts. NPS is market-linked,
 * so its rate is an assumption, not a guaranteed return.
 */
export const RETIREMENT_ACCOUNT_RATES = {
  epf: 0.0815,
  ppf: 0.071,
  nps: 0.1,
} as const;

export const LONG_RUN_INFLATION = 0.06;

export type RetirementAccountProjection = {
  epf: number;
  ppf: number;
  nps: number;
  total: number;
};

function compoundWithContributions(
  balance: number,
  monthly: number,
  annualRate: number,
  years: number,
): number {
  const months = Math.max(0, Math.round(years * 12));
  if (months === 0) return balance;
  const r = Math.pow(1 + annualRate, 1 / 12) - 1;
  if (r === 0) return balance + monthly * months;
  const growth = Math.pow(1 + r, months);
  return balance * growth + monthly * ((growth - 1) / r);
}

/**
 * EPF / PPF / NPS balances `years` from now, including ongoing monthly
 * contributions. `real: true` returns today's rupees (deflated by
 * LONG_RUN_INFLATION) so it can be compared against today-rupee targets.
 */
export function projectRetirementAccounts(
  data: Partial<FinancialProfile>,
  years: number,
  opts: { real?: boolean } = {},
): RetirementAccountProjection {
  const rate = (nominal: number) =>
    opts.real ? (1 + nominal) / (1 + LONG_RUN_INFLATION) - 1 : nominal;
  const epf = compoundWithContributions(
    n(data.epfBalance),
    n(data.monthlyEPFContribution),
    rate(RETIREMENT_ACCOUNT_RATES.epf),
    years,
  );
  const ppf = compoundWithContributions(
    n(data.ppfBalance),
    n(data.monthlyPPFContribution),
    rate(RETIREMENT_ACCOUNT_RATES.ppf),
    years,
  );
  const nps = compoundWithContributions(
    n(data.npsBalance),
    n(data.monthlyNPSContribution),
    rate(RETIREMENT_ACCOUNT_RATES.nps),
    years,
  );
  return { epf, ppf, nps, total: epf + ppf + nps };
}
