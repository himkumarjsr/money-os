/** FIRE number math — lifestyle 25× rule, debt add-back, SIP + corpus projection. */

export const FIRE_WITHDRAWAL_RATE = 0.04;
export const FIRE_MULTIPLIER = 1 / FIRE_WITHDRAWAL_RATE; // 25

export type FireCalculatorInput = {
  /** Monthly lifestyle spend after all EMIs end */
  monthlyExpensesExEmi: number;
  /** Total monthly EMIs (for naive comparison only) */
  monthlyEmi: number;
  totalDebtOutstanding: number;
  currentCorpus: number;
  monthlySip: number;
  expectedReturnPct: number;
  withdrawalRatePct?: number;
};

export type FireCalculatorResult = {
  annualLifestyleExpenses: number;
  lifestyleFireCorpus: number;
  naiveAnnualExpenses: number;
  naiveFireCorpus: number;
  debtPayoffFireSavings: number;
  totalFireTarget: number;
  gap: number;
  progressPct: number;
  isTargetMet: boolean;
  yearsToTarget: number | null;
  monthsToTarget: number | null;
  safeMonthlyWithdrawal: number;
};

export function sipFutureValue(monthly: number, annualRatePct: number, years: number): number {
  const months = Math.max(1, Math.round(years * 12));
  const r = annualRatePct / 100 / 12;
  if (monthly <= 0) return 0;
  if (r <= 0) return monthly * months;
  return monthly * ((Math.pow(1 + r, months) - 1) / r);
}

export function wealthAtYears(
  initial: number,
  monthly: number,
  annualRatePct: number,
  years: number,
): number {
  const months = Math.max(0, Math.round(years * 12));
  const r = annualRatePct / 100 / 12;
  const growthInitial = months > 0 && r > 0 ? initial * Math.pow(1 + r, months) : initial;
  if (monthly <= 0 || months <= 0) return growthInitial;
  if (r <= 0) return growthInitial + monthly * months;
  const sipPart = monthly * ((Math.pow(1 + r, months) - 1) / r);
  return growthInitial + sipPart;
}

export function yearsToReachWealth(
  initial: number,
  monthly: number,
  annualRatePct: number,
  target: number,
  maxYears = 80,
): number | null {
  if (target <= 0) return 0;
  if (wealthAtYears(initial, monthly, annualRatePct, 0) >= target) return 0;

  let hi = 1;
  while (hi <= maxYears && wealthAtYears(initial, monthly, annualRatePct, hi) < target) {
    hi *= 2;
  }
  if (hi > maxYears && wealthAtYears(initial, monthly, annualRatePct, maxYears) < target) {
    return null;
  }

  let lo = 0;
  let upper = Math.min(hi, maxYears);
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + upper) / 2;
    if (wealthAtYears(initial, monthly, annualRatePct, mid) >= target) upper = mid;
    else lo = mid;
  }
  return upper;
}

export function computeFireNumbers(input: FireCalculatorInput): FireCalculatorResult {
  const withdrawalRate = (input.withdrawalRatePct ?? FIRE_WITHDRAWAL_RATE * 100) / 100;
  const multiplier = withdrawalRate > 0 ? 1 / withdrawalRate : FIRE_MULTIPLIER;

  const annualLifestyle = Math.max(0, input.monthlyExpensesExEmi) * 12;
  const lifestyleFireCorpus = annualLifestyle * multiplier;

  const naiveMonthly = Math.max(0, input.monthlyExpensesExEmi) + Math.max(0, input.monthlyEmi);
  const naiveAnnual = naiveMonthly * 12;
  const naiveFireCorpus = naiveAnnual * multiplier;

  const debtPayoffFireSavings = Math.max(0, naiveFireCorpus - lifestyleFireCorpus);
  const totalFireTarget = lifestyleFireCorpus + Math.max(0, input.totalDebtOutstanding);
  const gap = Math.max(0, totalFireTarget - Math.max(0, input.currentCorpus));
  const progressPct =
    totalFireTarget > 0
      ? Math.min(100, (Math.max(0, input.currentCorpus) / totalFireTarget) * 100)
      : 100;
  const isTargetMet = gap <= 0;

  const yearsToTarget = isTargetMet
    ? 0
    : yearsToReachWealth(
        Math.max(0, input.currentCorpus),
        Math.max(0, input.monthlySip),
        input.expectedReturnPct,
        totalFireTarget,
      );

  const monthsToTarget =
    yearsToTarget === null ? null : yearsToTarget === 0 ? 0 : Math.ceil(yearsToTarget * 12);

  const safeMonthlyWithdrawal = (lifestyleFireCorpus * withdrawalRate) / 12;

  return {
    annualLifestyleExpenses: annualLifestyle,
    lifestyleFireCorpus,
    naiveAnnualExpenses: naiveAnnual,
    naiveFireCorpus,
    debtPayoffFireSavings,
    totalFireTarget,
    gap,
    progressPct,
    isTargetMet,
    yearsToTarget,
    monthsToTarget,
    safeMonthlyWithdrawal,
  };
}
