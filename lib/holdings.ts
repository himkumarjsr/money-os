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

/**
 * Balance after `years` of monthly contributions (end of month), each year's
 * contribution `stepUp` higher than the last. Returns nominal rupees.
 */
function compoundWithContributions(
  balance: number,
  monthly: number,
  annualRate: number,
  years: number,
  stepUp: number,
): number {
  const months = Math.max(0, Math.round(years * 12));
  const r = Math.pow(1 + annualRate, 1 / 12) - 1;
  let value = balance;
  for (let m = 1; m <= months; m++) {
    value =
      value * (1 + r) +
      monthly * Math.pow(1 + stepUp, Math.floor((m - 1) / 12));
  }
  return value;
}

/** EPF contributions are a share of salary: they rise with the expected hike (capped at 10%), else with prices. */
function salaryLinkedGrowth(data: Partial<FinancialProfile>): number {
  const hike = Number(data.annualSalaryIncreasePct);
  return Number.isFinite(hike) && hike > 0
    ? Math.min(0.1, hike / 100)
    : LONG_RUN_INFLATION;
}

/**
 * EPF / PPF / NPS balances `years` from now, including ongoing monthly
 * contributions: EPF rises with salary, PPF / NPS deposits with prices.
 * `real: true` returns today's rupees (deflated by LONG_RUN_INFLATION) so it
 * can be compared against today-rupee targets.
 */
export function projectRetirementAccounts(
  data: Partial<FinancialProfile>,
  years: number,
  opts: { real?: boolean } = {},
): RetirementAccountProjection {
  const deflate = opts.real
    ? Math.pow(1 + LONG_RUN_INFLATION, Math.max(0, Math.round(years * 12)) / 12)
    : 1;
  const project = (
    balance: number,
    monthly: number,
    rate: number,
    stepUp: number,
  ) =>
    compoundWithContributions(n(balance), n(monthly), rate, years, stepUp) /
    deflate;
  const epf = project(
    n(data.epfBalance),
    n(data.monthlyEPFContribution),
    RETIREMENT_ACCOUNT_RATES.epf,
    salaryLinkedGrowth(data),
  );
  const ppf = project(
    n(data.ppfBalance),
    n(data.monthlyPPFContribution),
    RETIREMENT_ACCOUNT_RATES.ppf,
    LONG_RUN_INFLATION,
  );
  const nps = project(
    n(data.npsBalance),
    n(data.monthlyNPSContribution),
    RETIREMENT_ACCOUNT_RATES.nps,
    LONG_RUN_INFLATION,
  );
  return { epf, ppf, nps, total: epf + ppf + nps };
}
