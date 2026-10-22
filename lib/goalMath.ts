/**
 * The planning assumptions and core SIP math every goal number comes from,
 * set the way an Indian financial planner would set them:
 * - each goal inflates at its own rate (college fees rise faster than prices);
 * - the return is the one the recommended fund mix can earn, by horizon and
 *   risk profile (portfolioAllocation);
 * - a SIP is a fixed rupee amount each month, raised once a year only when
 *   the user expects a salary hike - so "₹X/month" is what they set up;
 * - retirement must last to age 90, not a fixed 25× rule.
 * Amounts are today's rupees: nominal cash flows deflated by general
 * inflation month by month. Pure; shared by web and the app (mobile keeps a
 * byte-identical copy).
 */
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { LONG_RUN_INFLATION } from "@/lib/holdings";
import { expectedNominalReturn, goalHorizon } from "@/lib/portfolioAllocation";
import type { RiskTolerance } from "@/lib/riskProfile";

/** How fast each goal's cost rises a year (general inflation is 6%). */
export const GOAL_INFLATION: Record<string, number> = {
  kid_education: 0.1,
  kid_marriage: 0.07,
  marriage: 0.07,
  baby: 0.1,
  parents_eldercare: 0.12,
  home_purchase: 0.06,
  vehicle_purchase: 0.05,
  custom: LONG_RUN_INFLATION,
  retirement: LONG_RUN_INFLATION,
};

export function goalInflation(type: string): number {
  return GOAL_INFLATION[type] ?? LONG_RUN_INFLATION;
}

/**
 * What a goal costing `todayCost` now will cost in `years`, in today's
 * rupees: above `todayCost` when the goal inflates faster than prices.
 */
export function goalCostInTodaysRupees(
  todayCost: number,
  type: string,
  years: number,
): number {
  const extra = (1 + goalInflation(type)) / (1 + LONG_RUN_INFLATION);
  return todayCost * Math.pow(extra, Math.max(0, years));
}

/** Highest yearly SIP / EPF step-up the plan counts on. */
export const MAX_STEP_UP = 0.1;

/**
 * Yearly SIP increase the plan assumes (decimal): the salary hike the user
 * expects, capped at 10%; 0 (a flat SIP) when they haven't told us.
 */
export function sipStepUp(profile: Partial<FinancialProfile>): number {
  const hike = Number(profile.annualSalaryIncreasePct);
  if (!Number.isFinite(hike) || hike <= 0) return 0;
  return Math.min(MAX_STEP_UP, hike / 100);
}

/** Yearly growth of salary-linked contributions (EPF): the hike, else inflation. */
export function salaryGrowth(profile: Partial<FinancialProfile>): number {
  return sipStepUp(profile) || LONG_RUN_INFLATION;
}

/** Nominal yearly return a goal's fund mix is expected to earn. */
export function goalNominalReturn(
  years: number,
  risk?: RiskTolerance | null,
): number {
  return expectedNominalReturn(goalHorizon(years), risk ?? "moderate");
}

/** The same return above general inflation, in % (e.g. 4.3). */
export function goalRealReturnPctFor(
  years: number,
  risk?: RiskTolerance | null,
): number {
  return (
    ((1 + goalNominalReturn(years, risk)) / (1 + LONG_RUN_INFLATION) - 1) * 100
  );
}

/** A lump sum invested today, in today's rupees after `years`. */
export function lumpRealGrowth(nominalReturn: number, years: number): number {
  return Math.pow(
    (1 + nominalReturn) / (1 + LONG_RUN_INFLATION),
    Math.max(0, years),
  );
}

/**
 * Value at month `months`, in today's rupees, of a SIP of ₹1 a month paid at
 * the end of months `startMonth`..`months` (1-based), raised by `stepUp`
 * every 12 months from today. Contributions are fixed rupee amounts; the
 * return compounds monthly at the effective rate of `nominalReturn`.
 */
export function sipRealValue(
  months: number,
  nominalReturn: number,
  stepUp = 0,
  startMonth = 1,
): number {
  const n = Math.max(0, Math.round(months));
  const rm = Math.pow(1 + nominalReturn, 1 / 12) - 1;
  let fv = 0;
  for (let m = Math.max(1, Math.round(startMonth)); m <= n; m++) {
    fv +=
      Math.pow(1 + stepUp, Math.floor((m - 1) / 12)) * Math.pow(1 + rm, n - m);
  }
  return fv / Math.pow(1 + LONG_RUN_INFLATION, n / 12);
}

/** Starting monthly SIP that builds `realAmount` (today's rupees) in `years`. */
export function monthlySipFor(
  realAmount: number,
  years: number,
  nominalReturn: number,
  stepUp = 0,
  startMonth = 1,
): number {
  if (!(realAmount > 0)) return 0;
  const unit = sipRealValue(
    Math.round(years * 12),
    nominalReturn,
    stepUp,
    startMonth,
  );
  return unit > 0 ? realAmount / unit : 0;
}

/** Planning age the retirement corpus has to last to. */
export const LIFE_EXPECTANCY = 90;
/** Post-retirement portfolio (mostly debt, some equity): return and inflation. */
export const POST_RETIREMENT_RETURN = 0.075;

/**
 * Corpus needed at retirement as a multiple of the first year's expenses:
 * yearly withdrawals rising with inflation, taken at the start of each year,
 * from `retireAge` to {@link LIFE_EXPECTANCY}. About 25× at 60, 34× at 45.
 */
export function retirementCorpusMultiple(retireAge: number): number {
  const years = Math.max(1, LIFE_EXPECTANCY - Math.round(retireAge));
  const ratio = (1 + LONG_RUN_INFLATION) / (1 + POST_RETIREMENT_RETURN);
  let factor = 0;
  for (let t = 0; t < years; t++) factor += Math.pow(ratio, t);
  return factor;
}

/** Monthly spend a corpus (today's rupees) supports from `retireAge` to 90. */
export function corpusMonthlyIncome(corpus: number, retireAge: number): number {
  return corpus / retirementCorpusMultiple(retireAge) / 12;
}
