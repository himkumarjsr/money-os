/**
 * FY 2025-26 / AY 2026-27 illustrative comparison (old vs new regime).
 * Equity STCG/LTCG uses flat illustrative rates — not filing advice.
 */

export type RegimeKind = "old" | "new";

export type EmploymentKind =
  | "salaried"
  | "business_owner"
  | "freelancer"
  | "retired"
  | "pensioner";

export type PersonFlags = {
  widowed: boolean;
  disabledSelf: boolean;
  nri: boolean;
};

export type ComparisonInputs = {
  age: number;
  employment: EmploymentKind;
  flags: PersonFlags;

  basicMonthly: number;
  hraMonthly: number;
  allowancesMonthly: number;
  /** When >0, used as salary base for HRA 10% test instead of Basic×12 */
  hraSalaryBaseAnnualOverride: number;

  rsuVestingAnnual: number;
  rsuSaleStcg: number;
  rsuSaleLtcg: number;
  otherStcg: number;
  otherLtcg: number;

  leaveEncashmentTaxable: number;
  gratuityTaxable: number;
  ltaTaxable: number;

  businessProfit: number;
  freelanceIncome: number;
  pension: number;
  familyPension: number;
  rentalIncome: number;
  interestIncome: number;
  dividendIncome: number;
  /** Savings-interest-only slice for 80TTA nudges (0 = use total interestIncome). */
  interestSavingsPortion: number;
  /** Property STCG, debt MF STCG/LTCG & similar — modelled as slab-taxed ordinary income. */
  slabTaxedOtherGains: number;
  /** Listed property LTCG — illustrative 12.5% without indexation in this tool. */
  propertyLtcgGains: number;
  /** Lottery / gambling — illustrative 30% flat in this tool. */
  lotteryGamblingIncome: number;
  agriculturalIncome: number;
  excludeAgriculturalFromTax: boolean;

  hasHRA: boolean;
  hraReceivedAnnual: number;
  rentPaidAnnual: number;
  isMetro: boolean;
  rentPaidNoHra: number;

  deductions80C: number;
  nps80CCD1B: number;
  deductions80DSelf: number;
  deductions80DParents: number;
  parentsSenior: boolean;

  deduction80DD: number;
  deduction80DDB: number;
  deduction80E: number;
  deduction80EEA: number;
  deduction80G: number;
  deduction80TTA: number;
  deduction80TTB: number;
  deduction80U: number;
  deduction80RRB: number;
  homeLoanInterest24b: number;
  professionalTax: number;
};

export type DeductionLine = { label: string; amount: number };

export type RegimeBreakdown = {
  ordinaryGrossIncome: number;
  equityStcgGains: number;
  equityLtcgGains: number;
  equityCgTax: number;
  grossForSurcharge: number;
  grossIncomeLabel: string;
  deductionDescription: string;
  deductionAmount: number;
  deductionLines: DeductionLine[];
  taxableIncome: number;
  slabTaxBeforeRebate: number;
  rebate87A: boolean;
  /** Income tax on slab income after 87A (ordinary income only). */
  slabTaxNetOfRebate: number;
  taxBeforeSurcharge: number;
  surcharge: number;
  cess: number;
  totalTax: number;
};

export function salaryAnnualFromMonthly(i: ComparisonInputs): number {
  return (
    (Math.max(0, i.basicMonthly) + Math.max(0, i.hraMonthly) + Math.max(0, i.allowancesMonthly)) * 12
  );
}

export function hraSalaryBaseAnnual(i: ComparisonInputs): number {
  if (i.hraSalaryBaseAnnualOverride > 0) return i.hraSalaryBaseAnnualOverride;
  return Math.max(0, i.basicMonthly) * 12;
}

export function sumOrdinaryGross(i: ComparisonInputs): number {
  let g = salaryAnnualFromMonthly(i);
  g += Math.max(0, i.rsuVestingAnnual);
  g += Math.max(0, i.leaveEncashmentTaxable);
  g += Math.max(0, i.gratuityTaxable);
  g += Math.max(0, i.ltaTaxable);
  g += Math.max(0, i.businessProfit);
  g += Math.max(0, i.freelanceIncome);
  g += Math.max(0, i.pension);
  g += Math.max(0, i.familyPension);
  g += Math.max(0, i.rentalIncome);
  g += Math.max(0, i.interestIncome);
  g += Math.max(0, i.dividendIncome);
  if (!i.excludeAgriculturalFromTax) {
    g += Math.max(0, i.agriculturalIncome);
  }
  g += Math.max(0, i.slabTaxedOtherGains);
  return g;
}

export function sumEquityStcg(i: ComparisonInputs): number {
  return Math.max(0, i.rsuSaleStcg) + Math.max(0, i.otherStcg);
}

export function sumEquityLtcg(i: ComparisonInputs): number {
  return Math.max(0, i.rsuSaleLtcg) + Math.max(0, i.otherLtcg);
}

/** Illustrative Budget-style equity: STCG 20%; LTCG 12.5% after ₹1.25L exemption (combined LTCG gains). */
export function computeIllustrativeEquityCgTax(stcg: number, ltcg: number): number {
  const st = Math.max(0, stcg);
  const lt = Math.max(0, ltcg);
  const ltTaxable = Math.max(0, lt - 125_000);
  return st * 0.2 + ltTaxable * 0.125;
}

export function computeIllustrativePropertyLtcgTax(gains: number): number {
  return Math.max(0, gains) * 0.125;
}

export function computeIllustrativeLotteryTax(income: number): number {
  return Math.max(0, income) * 0.3;
}

/** Equity + property LTCG + lottery (each illustrative). */
export function computeScheduleRateTax(i: ComparisonInputs): number {
  const eq = computeIllustrativeEquityCgTax(sumEquityStcg(i), sumEquityLtcg(i));
  const plt = computeIllustrativePropertyLtcgTax(i.propertyLtcgGains);
  const lot = computeIllustrativeLotteryTax(i.lotteryGamblingIncome);
  return eq + plt + lot;
}

export function calculateSlabTax(income: number, slabs: { limit: number; rate: number }[]): number {
  let tax = 0;
  let prev = 0;
  for (const slab of slabs) {
    if (income <= prev) break;
    const taxable = Math.min(income, slab.limit) - prev;
    tax += taxable * slab.rate;
    prev = slab.limit;
  }
  return tax;
}

export function calculateTax(taxableIncome: number, regime: RegimeKind, age: number): number {
  if (regime === "new") {
    const slabs = [
      { limit: 400_000, rate: 0 },
      { limit: 800_000, rate: 0.05 },
      { limit: 1_200_000, rate: 0.1 },
      { limit: 1_600_000, rate: 0.15 },
      { limit: 2_000_000, rate: 0.2 },
      { limit: 2_400_000, rate: 0.25 },
      { limit: Number.POSITIVE_INFINITY, rate: 0.3 },
    ];
    return calculateSlabTax(taxableIncome, slabs);
  }

  if (regime === "old") {
    const basicExemption = age >= 80 ? 500_000 : age >= 60 ? 300_000 : 250_000;
    const slabs = [
      { limit: basicExemption, rate: 0 },
      { limit: 500_000, rate: 0.05 },
      { limit: 1_000_000, rate: 0.2 },
      { limit: Number.POSITIVE_INFINITY, rate: 0.3 },
    ];
    return calculateSlabTax(taxableIncome, slabs);
  }

  return 0;
}

export function addSurchargeAndCess(
  tax: number,
  grossIncome: number,
  regime: RegimeKind,
): { surcharge: number; cess: number; total: number } {
  let surcharge = 0;
  if (grossIncome > 50_000_000) {
    surcharge = regime === "new" ? tax * 0.25 : tax * 0.37;
  } else if (grossIncome > 20_000_000) {
    surcharge = tax * 0.25;
  } else if (grossIncome > 10_000_000) {
    surcharge = tax * 0.15;
  } else if (grossIncome > 5_000_000) {
    surcharge = tax * 0.1;
  }
  const preCess = tax + surcharge;
  const cess = preCess * 0.04;
  return { surcharge, cess, total: preCess + cess };
}

export function calculateHRAExemption(params: {
  hasHRA: boolean;
  salaryForHra: number;
  hraReceivedAnnual: number;
  rentPaidAnnual: number;
  isMetro: boolean;
}): number {
  const { hasHRA, salaryForHra, hraReceivedAnnual, rentPaidAnnual, isMetro } = params;
  if (!hasHRA || rentPaidAnnual <= 0 || salaryForHra <= 0) return 0;
  const rentExcess = Math.max(0, rentPaidAnnual - salaryForHra * 0.1);
  const basicPercent40 = salaryForHra * 0.4;
  const basicPercent50 = salaryForHra * 0.5;
  return Math.min(hraReceivedAnnual, isMetro ? basicPercent50 : basicPercent40, rentExcess);
}

export function calculate80GGIllustrative(grossIncome: number, rentPaidNoHra: number): number {
  if (rentPaidNoHra <= 0 || grossIncome <= 0) return 0;
  const a = Math.max(0, rentPaidNoHra - 0.1 * grossIncome);
  const b = 0.25 * grossIncome;
  const c = 60_000;
  return Math.min(a, b, c);
}

const NEW_STD = 75_000;
const OLD_STD = 50_000;

function capDeductionsOld(i: ComparisonInputs, ordinaryGross: number): {
  lines: DeductionLine[];
  total: number;
} {
  const lines: DeductionLine[] = [];
  lines.push({ label: "Standard deduction", amount: OLD_STD });

  const hra = calculateHRAExemption({
    hasHRA: i.hasHRA,
    salaryForHra: hraSalaryBaseAnnual(i),
    hraReceivedAnnual: i.hasHRA ? i.hraReceivedAnnual : 0,
    rentPaidAnnual: i.hasHRA ? i.rentPaidAnnual : 0,
    isMetro: i.isMetro,
  });
  if (hra > 0) lines.push({ label: "HRA exemption (illustrative)", amount: hra });

  const gg =
    !i.hasHRA && i.rentPaidNoHra > 0
      ? calculate80GGIllustrative(ordinaryGross, i.rentPaidNoHra)
      : 0;
  if (gg > 0) lines.push({ label: "80GG (rent, no HRA — illustrative)", amount: gg });

  const c80 = Math.min(Math.max(0, i.deductions80C), 150_000);
  if (c80 > 0) lines.push({ label: "80C (combined)", amount: c80 });

  const cnps = Math.min(Math.max(0, i.nps80CCD1B), 50_000);
  if (cnps > 0) lines.push({ label: "80CCD(1B) NPS", amount: cnps });

  const selfCap = i.age >= 60 ? 50_000 : 25_000;
  const parentCap = i.parentsSenior ? 50_000 : 25_000;
  const c80dSelf = Math.min(Math.max(0, i.deductions80DSelf), selfCap);
  const c80dParents = Math.min(Math.max(0, i.deductions80DParents), parentCap);
  if (c80dSelf + c80dParents > 0) {
    lines.push({
      label: "80D (self/family + parents)",
      amount: c80dSelf + c80dParents,
    });
  }

  const cdd = Math.min(Math.max(0, i.deduction80DD), 125_000);
  if (cdd > 0) lines.push({ label: "80DD (dependent disability)", amount: cdd });

  const cddbCap = i.age >= 60 ? 100_000 : 40_000;
  const cddb = Math.min(Math.max(0, i.deduction80DDB), cddbCap);
  if (cddb > 0) lines.push({ label: "80DDB (critical illness)", amount: cddb });

  const ce = Math.max(0, i.deduction80E);
  if (ce > 0) lines.push({ label: "80E education loan interest", amount: ce });

  const cea = Math.min(Math.max(0, i.deduction80EEA), 150_000);
  if (cea > 0) lines.push({ label: "80EEA affordable housing interest", amount: cea });

  const cg = Math.max(0, i.deduction80G);
  if (cg > 0) lines.push({ label: "80G donations (entered eligible)", amount: cg });

  const ttaCap = i.age >= 60 ? 0 : 10_000;
  const ctta = Math.min(Math.max(0, i.deduction80TTA), ttaCap);
  if (ctta > 0) lines.push({ label: "80TTA savings interest", amount: ctta });

  const cttb = Math.min(Math.max(0, i.deduction80TTB), 50_000);
  if (cttb > 0) lines.push({ label: "80TTB (senior interest)", amount: cttb });

  const cu = Math.min(Math.max(0, i.deduction80U), 125_000);
  if (cu > 0) lines.push({ label: "80U self-disability", amount: cu });

  const crrb = Math.min(Math.max(0, i.deduction80RRB), 300_000);
  if (crrb > 0) lines.push({ label: "80RRB royalty (illustrative cap)", amount: crrb });

  const c24 = Math.min(Math.max(0, i.homeLoanInterest24b), 200_000);
  if (c24 > 0) lines.push({ label: "24(b) home loan interest", amount: c24 });

  const cpt = Math.min(Math.max(0, i.professionalTax), 5_000);
  if (cpt > 0) lines.push({ label: "Professional tax paid", amount: cpt });

  const total = lines.reduce((s, x) => s + x.amount, 0);
  return { lines, total };
}

export function computeOldRegime(i: ComparisonInputs): RegimeBreakdown {
  const ordinaryGross = sumOrdinaryGross(i);
  const stcg = sumEquityStcg(i);
  const ltcg = sumEquityLtcg(i);
  const cgTax = computeScheduleRateTax(i);
  const grossForSurcharge =
    ordinaryGross + stcg + ltcg + Math.max(0, i.propertyLtcgGains) + Math.max(0, i.lotteryGamblingIncome);

  const { lines, total: totalDeductions } = capDeductionsOld(i, ordinaryGross);
  const taxableIncome = Math.max(0, ordinaryGross - totalDeductions);
  const slabTaxBeforeRebateRaw = calculateTax(taxableIncome, "old", i.age);
  const slabTaxNetOfRebate = taxableIncome <= 500_000 ? 0 : slabTaxBeforeRebateRaw;
  const rebate87A = taxableIncome <= 500_000 && slabTaxBeforeRebateRaw > 0;

  const taxBeforeSurcharge = slabTaxNetOfRebate + cgTax;
  const { surcharge, cess, total } = addSurchargeAndCess(taxBeforeSurcharge, grossForSurcharge, "old");

  return {
    ordinaryGrossIncome: ordinaryGross,
    equityStcgGains: stcg,
    equityLtcgGains: ltcg,
    equityCgTax: cgTax,
    grossForSurcharge,
    grossIncomeLabel: "Ordinary gross + equity gains (for surcharge)",
    deductionDescription: "Total deductions (old regime)",
    deductionAmount: totalDeductions,
    deductionLines: lines,
    taxableIncome,
    slabTaxBeforeRebate: slabTaxBeforeRebateRaw,
    rebate87A,
    slabTaxNetOfRebate,
    taxBeforeSurcharge,
    surcharge,
    cess,
    totalTax: total,
  };
}

export function computeNewRegime(i: ComparisonInputs): RegimeBreakdown {
  const ordinaryGross = sumOrdinaryGross(i);
  const stcg = sumEquityStcg(i);
  const ltcg = sumEquityLtcg(i);
  const cgTax = computeScheduleRateTax(i);
  const grossForSurcharge =
    ordinaryGross + stcg + ltcg + Math.max(0, i.propertyLtcgGains) + Math.max(0, i.lotteryGamblingIncome);

  const lines: DeductionLine[] = [{ label: "Standard deduction (new regime)", amount: NEW_STD }];
  const taxableIncome = Math.max(0, ordinaryGross - NEW_STD);
  const slabTaxBeforeRebateRaw = calculateTax(taxableIncome, "new", i.age);
  const slabTaxNetOfRebate = taxableIncome <= 1_200_000 ? 0 : slabTaxBeforeRebateRaw;
  const rebate87A = taxableIncome <= 1_200_000 && slabTaxBeforeRebateRaw > 0;

  const taxBeforeSurcharge = slabTaxNetOfRebate + cgTax;
  const { surcharge, cess, total } = addSurchargeAndCess(taxBeforeSurcharge, grossForSurcharge, "new");

  return {
    ordinaryGrossIncome: ordinaryGross,
    equityStcgGains: stcg,
    equityLtcgGains: ltcg,
    equityCgTax: cgTax,
    grossForSurcharge,
    grossIncomeLabel: "Ordinary gross + equity gains (for surcharge)",
    deductionDescription: "Standard deduction (new regime)",
    deductionAmount: NEW_STD,
    deductionLines: lines,
    taxableIncome,
    slabTaxBeforeRebate: slabTaxBeforeRebateRaw,
    rebate87A,
    slabTaxNetOfRebate,
    taxBeforeSurcharge,
    surcharge,
    cess,
    totalTax: total,
  };
}

export function compareRegimes(i: ComparisonInputs): { old: RegimeBreakdown; new: RegimeBreakdown } {
  return { old: computeOldRegime(i), new: computeNewRegime(i) };
}

export function getDeduction80GGComputed(i: ComparisonInputs): number {
  const ordinary = sumOrdinaryGross(i);
  if (i.hasHRA || i.rentPaidNoHra <= 0) return 0;
  return calculate80GGIllustrative(ordinary, i.rentPaidNoHra);
}
