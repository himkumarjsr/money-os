/** EPF (Provident Fund) projection — existing balance + yearly contributions, grown to age 60. */

/** EPFO notified rate for FY 2024-25 (% p.a.). */
export const EPF_DEFAULT_RATE_PCT = 8.25;
/** Age at which the final EPF value is shown. */
export const EPF_FINAL_AGE = 60;

export type EpfCalculatorInput = {
  /** Current PF balance (employee + employer share) */
  currentBalance: number;
  /** Total contribution added per year (employee + employer) */
  yearlyContribution: number;
  currentAge: number;
  /** Contributions stop at this age; the balance keeps compounding until 60 */
  contributeTillAge: number;
  annualRatePct: number;
};

export type EpfYearRow = {
  /** Age at the end of this year */
  age: number;
  /** Opening balance + contributions made so far */
  invested: number;
  /** Interest accumulated so far */
  interest: number;
  total: number;
};

export type EpfCalculatorResult = {
  finalValue: number;
  totalContributions: number;
  totalInvested: number;
  totalInterest: number;
  contributionYears: number;
  growthOnlyYears: number;
  /** Balance on the day contributions stop */
  balanceAtContributionEnd: number;
  schedule: EpfYearRow[];
};

/**
 * EPFO credits interest once a year on the monthly running balance.
 * A contribution made in month m earns interest for the (12 - m) months after it,
 * so twelve equal monthly deposits earn r/12 × (11 + 10 + … + 0) = r × 66/12 / 12
 * of the yearly amount in their first year.
 */
const FIRST_YEAR_INTEREST_MONTHS = 66;

export function epfYearEnd(
  opening: number,
  yearlyContribution: number,
  annualRatePct: number,
): number {
  const r = Math.max(0, annualRatePct) / 100;
  const contribution = Math.max(0, yearlyContribution);
  const interest =
    opening * r + (contribution / 12) * (r / 12) * FIRST_YEAR_INTEREST_MONTHS;
  return opening + contribution + interest;
}

export function computeEpfProjection(
  input: EpfCalculatorInput,
): EpfCalculatorResult {
  const opening = Math.max(0, input.currentBalance);
  const yearly = Math.max(0, input.yearlyContribution);
  const age = Math.min(
    EPF_FINAL_AGE,
    Math.max(0, Math.floor(input.currentAge)),
  );
  const till = Math.min(
    EPF_FINAL_AGE,
    Math.max(age, Math.floor(input.contributeTillAge)),
  );

  const schedule: EpfYearRow[] = [];
  let balance = opening;
  let contributed = 0;
  let balanceAtContributionEnd = opening;
  for (let a = age; a < EPF_FINAL_AGE; a += 1) {
    const contribution = a < till ? yearly : 0;
    balance = epfYearEnd(balance, contribution, input.annualRatePct);
    contributed += contribution;
    if (a + 1 === till) balanceAtContributionEnd = balance;
    const invested = opening + contributed;
    schedule.push({
      age: a + 1,
      invested,
      interest: Math.max(0, balance - invested),
      total: balance,
    });
  }

  const totalInvested = opening + contributed;
  return {
    finalValue: balance,
    totalContributions: contributed,
    totalInvested,
    totalInterest: Math.max(0, balance - totalInvested),
    contributionYears: till - age,
    growthOnlyYears: EPF_FINAL_AGE - till,
    balanceAtContributionEnd,
    schedule,
  };
}
