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
import {
  expectedNominalReturn,
  goalHorizon,
  type ReturnOptions,
} from "@/lib/portfolioAllocation";
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

type Assumable = Partial<FinancialProfile> | null | undefined;

/** Points the user added to every goal's cost inflation (decimal). */
export function inflationShift(profile?: Assumable): number {
  const pct = Number(profile?.planInflationShiftPct);
  return Number.isFinite(pct) ? Math.max(-0.02, Math.min(0.03, pct / 100)) : 0;
}

export function goalInflation(type: string, profile?: Assumable): number {
  return (GOAL_INFLATION[type] ?? LONG_RUN_INFLATION) + inflationShift(profile);
}

/**
 * What a goal costing `todayCost` now will cost in `years`, in today's
 * rupees: above `todayCost` when the goal inflates faster than prices.
 */
export function goalCostInTodaysRupees(
  todayCost: number,
  type: string,
  years: number,
  profile?: Assumable,
): number {
  const extra = (1 + goalInflation(type, profile)) / (1 + LONG_RUN_INFLATION);
  return todayCost * Math.pow(extra, Math.max(0, years));
}

/** Highest yearly SIP / EPF step-up the plan counts on. */
export const MAX_STEP_UP = 0.1;
/** Step-up assumed when the user will raise SIPs but gave no salary hike. */
export const DEFAULT_STEP_UP = 0.1;

/** The salary hike the user expects (decimal, capped at 10%); 0 when not given. */
function expectedHike(profile: Partial<FinancialProfile>): number {
  const hike = Number(profile.annualSalaryIncreasePct);
  if (!Number.isFinite(hike) || hike <= 0) return 0;
  return Math.min(MAX_STEP_UP, hike / 100);
}

/**
 * Yearly SIP increase the plan assumes (decimal). "No, I'll keep it flat":
 * 0. "Yes": the salary hike, else 10%. Not answered: the hike when given,
 * else a flat SIP.
 */
export function sipStepUp(profile: Partial<FinancialProfile>): number {
  if (profile.sipStepUpPlanned === false) return 0;
  const hike = expectedHike(profile);
  if (profile.sipStepUpPlanned === true) return hike || DEFAULT_STEP_UP;
  return hike;
}

/** Yearly growth of salary-linked contributions (EPF): the hike, else inflation. */
export function salaryGrowth(profile: Partial<FinancialProfile>): number {
  return expectedHike(profile) || LONG_RUN_INFLATION;
}

/** Long-run equity return the plan uses before tax, unless the user picks another. */
export const STANDARD_EQUITY_RETURN = 0.12;

/** Equity return the plan uses (decimal): the user's pick (8–14%), else 12%. */
export function planEquityReturn(profile?: Assumable): number {
  const pct = Number(profile?.planEquityReturnPct);
  if (!Number.isFinite(pct) || pct <= 0) return STANDARD_EQUITY_RETURN;
  return Math.max(0.08, Math.min(0.14, pct / 100));
}

/**
 * Marginal income-tax slab under the new regime (FY 2025-26) for a yearly
 * income: nothing up to ₹12L (the 87A rebate), then 15% / 20% / 25% / 30%.
 */
export function estimatedTaxSlab(yearlyIncome: number): number {
  if (!(yearlyIncome > 12_00_000)) return 0;
  if (yearlyIncome <= 16_00_000) return 0.15;
  if (yearlyIncome <= 20_00_000) return 0.2;
  if (yearlyIncome <= 24_00_000) return 0.25;
  return 0.3;
}

/** The user's tax slab (decimal): what they told us, else estimated from income. */
export function taxSlab(profile?: Assumable): number {
  const pct = Number(profile?.taxSlabPct);
  if (profile?.taxSlabPct != null && Number.isFinite(pct)) {
    return Math.max(0, Math.min(0.3, pct / 100));
  }
  const yearly =
    ((Number(profile?.monthlySalary) || 0) +
      (Number(profile?.otherIncome) || 0)) *
    12;
  return estimatedTaxSlab(yearly);
}

/**
 * Slab from which the plan counts the 12.5% equity gains tax. Below it, the
 * ₹1.25L of long-term gains each year that is tax-free (booked every March)
 * covers a typical saver's gains.
 */
export const EQUITY_TAX_FROM_SLAB = 0.2;

/** Options for the instrument returns: the user's tax and equity outlook. */
export function returnOptions(profile?: Assumable): ReturnOptions {
  const slab = taxSlab(profile);
  return {
    taxSlab: slab,
    equityTaxed: slab >= EQUITY_TAX_FROM_SLAB,
    equityShift: planEquityReturn(profile) - STANDARD_EQUITY_RETURN,
  };
}

/** Years before a goal its money moves to safer (1–3 year) funds. */
export const GLIDE_YEARS = 3;

/**
 * Yearly returns a goal's money earns: `long` while the goal is more than
 * {@link GLIDE_YEARS} away, `safe` in the last years once it moves to the
 * 1–3 year mix (FDs, short debt). Equal for goals 3 years away or less.
 */
export type GoalRate = { long: number; safe: number };

/** A flat rate, or the long and glide-path rates of a goal. */
export type RateInput = number | GoalRate;

const asRate = (r: RateInput): GoalRate =>
  typeof r === "number" ? { long: r, safe: r } : r;

/**
 * After-tax returns a goal `years` away earns, with the glide path.
 * Retirement keeps its mix: the corpus stays invested for decades after.
 */
export function goalRate(
  profile: Assumable,
  years: number,
  type?: string,
): GoalRate {
  const risk: RiskTolerance = profile?.riskTolerance ?? "moderate";
  const opts = returnOptions(profile);
  const long = expectedNominalReturn(goalHorizon(years), risk, opts);
  const glides = years > GLIDE_YEARS && type !== "retirement";
  const safe = glides ? expectedNominalReturn("1-3y", risk, opts) : long;
  return { long, safe };
}

/** Average yearly return over the whole goal, for display (e.g. 0.098). */
export function averageReturn(rate: RateInput, years: number): number {
  const r = asRate(rate);
  const y = Math.max(0, years);
  if (y <= 0) return r.long;
  const glide = Math.min(y, GLIDE_YEARS);
  const growth =
    Math.pow(1 + r.long, y - glide) *
    Math.pow(1 + (y > GLIDE_YEARS ? r.safe : r.long), glide);
  return Math.pow(growth, 1 / y) - 1;
}

/** Monthly rate in month `m` of `n` (1-based), on the glide path. */
function monthRate(r: GoalRate, m: number, n: number): number {
  const glided = n > GLIDE_YEARS * 12 && n - m < GLIDE_YEARS * 12;
  return Math.pow(1 + (glided ? r.safe : r.long), 1 / 12) - 1;
}

/** The same return above general inflation, in % (e.g. 4.3). */
export function goalRealReturnPctFor(
  years: number,
  risk?: RiskTolerance | null,
): number {
  const nominal = expectedNominalReturn(goalHorizon(years), risk ?? "moderate");
  return ((1 + nominal) / (1 + LONG_RUN_INFLATION) - 1) * 100;
}

/** A lump sum invested today, in today's rupees after `years`. */
export function lumpRealGrowth(rate: RateInput, years: number): number {
  const r = asRate(rate);
  const y = Math.max(0, years);
  const months = Math.round(y * 12);
  let growth = 1;
  for (let m = 1; m <= months; m++) growth *= 1 + monthRate(r, m, months);
  return growth / Math.pow(1 + LONG_RUN_INFLATION, y);
}

/**
 * Value at month `months`, in today's rupees, of a SIP of ₹1 a month paid at
 * the end of months `startMonth`..`months` (1-based), raised by `stepUp`
 * every 12 months from today. Contributions are fixed rupee amounts; the
 * return compounds monthly at the effective rate, moving to the safe rate in
 * the last {@link GLIDE_YEARS} years.
 */
export function sipRealValue(
  months: number,
  rate: RateInput,
  stepUp = 0,
  startMonth = 1,
): number {
  return sipRealValueAt(months, months, rate, stepUp, startMonth);
}

/**
 * {@link sipRealValue} part-way: the value at month `atMonth` of a SIP for a
 * goal `totalMonths` away (the glide path follows the goal date).
 */
export function sipRealValueAt(
  atMonth: number,
  totalMonths: number,
  rate: RateInput,
  stepUp = 0,
  startMonth = 1,
): number {
  const n = Math.max(0, Math.round(totalMonths));
  const at = Math.max(0, Math.min(n, Math.round(atMonth)));
  const r = asRate(rate);
  const from = Math.max(1, Math.round(startMonth));
  let fv = 0;
  for (let m = 1; m <= at; m++) {
    fv *= 1 + monthRate(r, m, n);
    if (m >= from) fv += Math.pow(1 + stepUp, Math.floor((m - 1) / 12));
  }
  return fv / Math.pow(1 + LONG_RUN_INFLATION, at / 12);
}

/** Starting monthly SIP that builds `realAmount` (today's rupees) in `years`. */
export function monthlySipFor(
  realAmount: number,
  years: number,
  rate: RateInput,
  stepUp = 0,
  startMonth = 1,
): number {
  if (!(realAmount > 0)) return 0;
  const unit = sipRealValue(Math.round(years * 12), rate, stepUp, startMonth);
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
export function retirementCorpusMultiple(
  retireAge: number,
  profile?: Assumable,
): number {
  const years = Math.max(1, LIFE_EXPECTANCY - Math.round(retireAge));
  const ratio =
    (1 + goalInflation("retirement", profile)) / (1 + POST_RETIREMENT_RETURN);
  let factor = 0;
  for (let t = 0; t < years; t++) factor += Math.pow(ratio, t);
  return factor;
}

/**
 * Monthly spend, at today's prices, a corpus (today's rupees) supports from
 * `retireAge` to 90. `years` to retirement matter only when the user expects
 * costs to rise faster than general inflation.
 */
export function corpusMonthlyIncome(
  corpus: number,
  retireAge: number,
  profile?: Assumable,
  years = 0,
): number {
  const faster = Math.pow(
    (1 + goalInflation("retirement", profile)) / (1 + LONG_RUN_INFLATION),
    Math.max(0, years),
  );
  return corpus / faster / retirementCorpusMultiple(retireAge, profile) / 12;
}
