/** Pure calculator math — mirrors web tools (mobile, offline). */

export function sipMaturityAmount(
  monthly: number,
  annualPct: number,
  years: number,
): number {
  const n = Math.max(1, Math.round(years * 12));
  const r = annualPct / 100 / 12;
  if (!Number.isFinite(monthly) || monthly <= 0) return 0;
  if (r <= 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r);
}

export function swpDurationMonths(
  corpus: number,
  monthlyWithdraw: number,
  annualPct: number,
): number | null {
  if (corpus <= 0 || monthlyWithdraw <= 0) return null;
  const r = annualPct / 100 / 12;
  let bal = corpus;
  let m = 0;
  const cap = 600; // 50 years
  while (bal > 0 && m < cap) {
    bal = bal * (1 + r) - monthlyWithdraw;
    m += 1;
  }
  return bal > 0 ? null : m;
}

export function monthlyEmi(
  principal: number,
  annualPct: number,
  months: number,
): number {
  if (months <= 0 || principal <= 0) return 0;
  const r = annualPct / 100 / 12;
  if (r <= 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

/** Simplified FY 2025-26 new regime slabs (illustrative, resident <60). */
function taxNewRegime(taxableIncome: number): number {
  const y = Math.max(0, taxableIncome);
  // Rebate under 87A for new regime up to 12L (simplified — zero tax if ≤12L)
  if (y <= 12_00_000) return 0;
  let tax = 0;
  const slabs: [number, number][] = [
    [4_00_000, 0],
    [8_00_000, 0.05],
    [12_00_000, 0.1],
    [16_00_000, 0.15],
    [20_00_000, 0.2],
    [24_00_000, 0.25],
    [Infinity, 0.3],
  ];
  let prev = 0;
  for (const [upto, rate] of slabs) {
    const band = Math.min(y, upto) - prev;
    if (band > 0) tax += band * rate;
    prev = upto;
    if (y <= upto) break;
  }
  return tax * 1.04; // cess 4%
}

/** Simplified old regime slabs (resident <60) after deductions. */
function taxOldRegime(taxableIncome: number): number {
  const y = Math.max(0, taxableIncome);
  // Basic exemption 2.5L; rebate if tax liability low (~5L taxable)
  let tax = 0;
  if (y > 2_50_000) tax += Math.min(y - 2_50_000, 2_50_000) * 0.05;
  if (y > 5_00_000) tax += Math.min(y - 5_00_000, 5_00_000) * 0.2;
  if (y > 10_00_000) tax += (y - 10_00_000) * 0.3;
  if (y <= 5_00_000) tax = 0; // 87A simplified
  return tax * 1.04;
}

export type TaxCompareInput = {
  annualGrossSalary: number;
  standardDeductionNew?: number;
  standardDeductionOld?: number;
  deductions80C: number;
  deductions80D: number;
  hraExemption: number;
  homeLoanInterest: number;
};

export type TaxCompareResult = {
  newTaxable: number;
  oldTaxable: number;
  newTax: number;
  oldTax: number;
  better: "new" | "old" | "same";
  savings: number;
};

export function compareTaxRegimesSimple(i: TaxCompareInput): TaxCompareResult {
  const stdNew = i.standardDeductionNew ?? 75_000;
  const stdOld = i.standardDeductionOld ?? 50_000;
  const newTaxable = Math.max(0, i.annualGrossSalary - stdNew);
  const oldDeductions =
    Math.min(i.deductions80C, 1_50_000) +
    i.deductions80D +
    i.hraExemption +
    Math.min(i.homeLoanInterest, 2_00_000) +
    stdOld;
  const oldTaxable = Math.max(0, i.annualGrossSalary - oldDeductions);
  const newTax = taxNewRegime(newTaxable);
  const oldTax = taxOldRegime(oldTaxable);
  const diff = oldTax - newTax;
  let better: TaxCompareResult["better"] = "same";
  if (diff > 100) better = "new";
  else if (diff < -100) better = "old";
  return {
    newTaxable,
    oldTaxable,
    newTax,
    oldTax,
    better,
    savings: Math.abs(diff),
  };
}

export function fireNumber(annualExpenses: number, swrPct = 4): number {
  if (annualExpenses <= 0) return 0;
  return annualExpenses / (swrPct / 100);
}

export function yearsToFire(params: {
  currentCorpus: number;
  monthlyInvest: number;
  annualExpenses: number;
  returnPct: number;
  swrPct?: number;
}): number | null {
  const target = fireNumber(params.annualExpenses, params.swrPct ?? 4);
  if (target <= 0) return null;
  let bal = params.currentCorpus;
  const r = params.returnPct / 100 / 12;
  let m = 0;
  while (bal < target && m < 600) {
    bal = bal * (1 + r) + params.monthlyInvest;
    m += 1;
  }
  return bal >= target ? m / 12 : null;
}

export function emergencyFundTarget(
  monthlyNeeds: number,
  months: number,
): number {
  return Math.max(0, monthlyNeeds) * Math.max(1, months);
}

/** Simple annual compound (end-of-year deposit approx for PPF / SSY / POSA). */
export function annualCompoundMature(
  annualDeposit: number,
  annualPct: number,
  years: number,
): number {
  if (annualDeposit <= 0 || years <= 0) return 0;
  const r = annualPct / 100;
  let bal = 0;
  for (let y = 0; y < years; y++) {
    bal = (bal + annualDeposit) * (1 + r);
  }
  return bal;
}

/** Monthly RD / PO TD style future value. */
export function monthlyCompoundMature(
  monthly: number,
  annualPct: number,
  months: number,
): number {
  if (monthly <= 0 || months <= 0) return 0;
  const r = annualPct / 100 / 12;
  if (r <= 0) return monthly * months;
  return monthly * ((Math.pow(1 + r, months) - 1) / r);
}

/** Lump sum compound (NSC / KVP / TD). */
export function lumpSumCompound(
  principal: number,
  annualPct: number,
  years: number,
): number {
  if (principal <= 0 || years <= 0) return 0;
  return principal * Math.pow(1 + annualPct / 100, years);
}

/** Simple rent vs buy: ownership cost over years vs rent investing surplus. */
export function rentVsBuySummary(input: {
  monthlyRent: number;
  homePrice: number;
  downPayment: number;
  loanRate: number;
  tenureYears: number;
  appreciationPct: number;
  years: number;
}): {
  totalRentPaid: number;
  totalEmiPaid: number;
  equityAtEnd: number;
  homeValue: number;
} {
  const tenureMonths = Math.max(1, Math.round(input.tenureYears * 12));
  const loan = Math.max(0, input.homePrice - input.downPayment);
  const emi = monthlyEmi(loan, input.loanRate, tenureMonths);
  const months = Math.max(1, Math.round(input.years * 12));
  const totalRentPaid = input.monthlyRent * months;
  const totalEmiPaid = emi * Math.min(months, tenureMonths);
  const homeValue =
    input.homePrice * Math.pow(1 + input.appreciationPct / 100, input.years);
  const principalPaid = Math.min(loan, totalEmiPaid * 0.55); // rough
  const equityAtEnd = input.downPayment + principalPaid;
  return { totalRentPaid, totalEmiPaid, equityAtEnd, homeValue };
}
