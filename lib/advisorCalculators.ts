/**
 * Pure maths for the advisor-style calculators (investing, retirement, loans,
 * tax, protection, goals). Illustrative only — not investment or tax advice.
 * Rates are annual percentages unless a name says otherwise.
 */

import {
  addSurchargeAndCess,
  calculateHRAExemption,
  calculateTax,
} from "./taxRegimeComparisonFY2026";

// ─── Building blocks ─────────────────────────────────────────────────────────

/** Future value of a one-time amount compounded yearly. */
export function lumpsumFV(amount: number, ratePct: number, years: number) {
  return Math.max(0, amount) * Math.pow(1 + ratePct / 100, Math.max(0, years));
}

/** Future value of a monthly SIP (end-of-month, monthly compounding) — matches SIP calculator. */
export function sipFV(monthly: number, ratePct: number, months: number) {
  const n = Math.max(0, Math.round(months));
  const r = ratePct / 100 / 12;
  if (r === 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r);
}

/** Monthly SIP needed to reach `target` in `months`. */
export function sipForTarget(target: number, ratePct: number, months: number) {
  const n = Math.max(1, Math.round(months));
  const r = ratePct / 100 / 12;
  if (target <= 0) return 0;
  if (r === 0) return target / n;
  return (target * r) / (Math.pow(1 + r, n) - 1);
}

/** Lumpsum needed today to reach `target` in `years`. */
export function lumpsumForTarget(
  target: number,
  ratePct: number,
  years: number,
) {
  if (target <= 0) return 0;
  return target / Math.pow(1 + ratePct / 100, Math.max(0, years));
}

export function inflate(amount: number, inflationPct: number, years: number) {
  return amount * Math.pow(1 + inflationPct / 100, Math.max(0, years));
}

/** Standard reducing-balance EMI. */
export function emiFor(principal: number, ratePct: number, months: number) {
  const n = Math.max(1, Math.round(months));
  const r = ratePct / 100 / 12;
  if (principal <= 0) return 0;
  if (r === 0) return principal / n;
  const f = Math.pow(1 + r, n);
  return (principal * r * f) / (f - 1);
}

/** Loan amount a given EMI can service (present value of the EMI stream). */
export function loanForEmi(emi: number, ratePct: number, months: number) {
  const n = Math.max(1, Math.round(months));
  const r = ratePct / 100 / 12;
  if (emi <= 0) return 0;
  if (r === 0) return emi * n;
  return (emi * (1 - Math.pow(1 + r, -n))) / r;
}

/** Months needed to repay `principal` at `emi` (Infinity when EMI never covers interest). */
export function monthsToRepay(principal: number, ratePct: number, emi: number) {
  const r = ratePct / 100 / 12;
  if (principal <= 0) return 0;
  if (emi <= 0) return Number.POSITIVE_INFINITY;
  if (r === 0) return Math.ceil(principal / emi);
  if (emi <= principal * r) return Number.POSITIVE_INFINITY;
  return Math.ceil(-Math.log(1 - (principal * r) / emi) / Math.log(1 + r));
}

/** Finds x in [lo, hi] where f(x) = 0 by bisection; f must change sign. */
function bisect(f: (x: number) => number, lo: number, hi: number, iters = 200) {
  let a = lo;
  let b = hi;
  let fa = f(a);
  const fb = f(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb) || fa * fb > 0) return null;
  for (let i = 0; i < iters; i += 1) {
    const mid = (a + b) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < 1e-9 || b - a < 1e-12) return mid;
    if (fa * fm < 0) {
      b = mid;
    } else {
      a = mid;
      fa = fm;
    }
  }
  return (a + b) / 2;
}

// ─── Investing ───────────────────────────────────────────────────────────────

export type YearPoint = { year: number; [k: string]: number };

export function stepUpSip(
  monthly: number,
  stepUpPct: number,
  ratePct: number,
  years: number,
) {
  const r = ratePct / 100 / 12;
  let value = 0;
  let flatValue = 0;
  let invested = 0;
  const flatInvested = monthly * 12 * years;
  const rows: Array<{
    year: number;
    stepUp: number;
    flat: number;
    invested: number;
    monthly: number;
  }> = [];
  for (let y = 1; y <= years; y += 1) {
    const m = monthly * Math.pow(1 + stepUpPct / 100, y - 1);
    for (let k = 0; k < 12; k += 1) {
      value = value * (1 + r) + m;
      flatValue = flatValue * (1 + r) + monthly;
      invested += m;
    }
    rows.push({
      year: y,
      stepUp: value,
      flat: flatValue,
      invested,
      monthly: m,
    });
  }
  return { value, invested, flatValue, flatInvested, rows };
}

export function goalPlan(params: {
  costToday: number;
  years: number;
  inflationPct: number;
  returnPct: number;
  existingSavings: number;
}) {
  const { costToday, years, inflationPct, returnPct, existingSavings } = params;
  const futureCost = inflate(costToday, inflationPct, years);
  const existingFV = lumpsumFV(existingSavings, returnPct, years);
  const gap = Math.max(0, futureCost - existingFV);
  const months = Math.max(1, Math.round(years * 12));
  const sip = sipForTarget(gap, returnPct, months);
  const lumpsum = lumpsumForTarget(gap, returnPct, years);
  const delays = [1, 2, 3, 5]
    .filter((d) => d < years)
    .map((d) => ({
      delayYears: d,
      sip: sipForTarget(
        Math.max(0, futureCost - existingFV),
        returnPct,
        Math.max(1, Math.round((years - d) * 12)),
      ),
    }));
  return { futureCost, existingFV, gap, sip, lumpsum, delays };
}

/** What waiting `delayYears` to start the same SIP costs by the end date. */
export function sipDelayCost(
  monthly: number,
  ratePct: number,
  years: number,
  delayYears: number,
) {
  const now = sipFV(monthly, ratePct, years * 12);
  const later = sipFV(monthly, ratePct, Math.max(0, years - delayYears) * 12);
  const sipToCatchUp = sipForTarget(
    now,
    ratePct,
    Math.max(1, (years - delayYears) * 12),
  );
  return { now, later, loss: now - later, sipToCatchUp };
}

/** Systematic transfer: lumpsum parked in debt, moved monthly into equity. */
export function stpPlan(params: {
  amount: number;
  transferMonths: number;
  debtPct: number;
  equityPct: number;
  horizonYears: number;
}) {
  const { amount, transferMonths, debtPct, equityPct, horizonYears } = params;
  const total = Math.max(1, Math.round(horizonYears * 12));
  const n = Math.min(Math.max(1, Math.round(transferMonths)), total);
  const rd = debtPct / 100 / 12;
  const re = equityPct / 100 / 12;
  const transfer = amount / n;
  let debt = amount;
  let equity = 0;
  for (let m = 1; m <= total; m += 1) {
    debt *= 1 + rd;
    equity *= 1 + re;
    if (m <= n) {
      // Spread what is left (incl. debt interest) over the remaining transfers.
      const t = debt / (n - m + 1);
      debt -= t;
      equity += t;
    }
  }
  const lumpEquity = amount * Math.pow(1 + re, total);
  const allDebt = amount * Math.pow(1 + rd, total);
  return {
    transfer,
    finalValue: debt + equity,
    debt,
    equity,
    lumpEquity,
    allDebt,
  };
}

export function cagr(initial: number, final: number, years: number) {
  if (initial <= 0 || final <= 0 || years <= 0) return 0;
  return (Math.pow(final / initial, 1 / years) - 1) * 100;
}

export type CashFlow = { date: string; amount: number };

/** XIRR (% p.a.) — amounts invested are negative, money received is positive. */
export function xirr(flows: CashFlow[]): number | null {
  const valid = flows
    .map((f) => ({ t: new Date(f.date).getTime(), amount: f.amount }))
    .filter(
      (f) =>
        Number.isFinite(f.t) && Number.isFinite(f.amount) && f.amount !== 0,
    );
  if (valid.length < 2) return null;
  if (!valid.some((f) => f.amount < 0) || !valid.some((f) => f.amount > 0))
    return null;
  const t0 = Math.min(...valid.map((f) => f.t));
  const yearMs = 365 * 24 * 3600 * 1000;
  const npv = (rate: number) =>
    valid.reduce(
      (s, f) => s + f.amount / Math.pow(1 + rate, (f.t - t0) / yearMs),
      0,
    );
  const root = bisect(npv, -0.9999, 100);
  return root === null ? null : root * 100;
}

export function realReturn(nominalPct: number, inflationPct: number) {
  return ((1 + nominalPct / 100) / (1 + inflationPct / 100) - 1) * 100;
}

export function yearsToMultiply(ratePct: number, multiple: number) {
  if (ratePct <= 0) return Number.POSITIVE_INFINITY;
  return Math.log(multiple) / Math.log(1 + ratePct / 100);
}

export type Compounding = "monthly" | "quarterly" | "half-yearly" | "yearly";
const PERIODS: Record<Compounding, number> = {
  monthly: 12,
  quarterly: 4,
  "half-yearly": 2,
  yearly: 1,
};

/** Bank FD with TDS (Section 194A) and tax at the depositor's slab. */
export function fixedDeposit(params: {
  principal: number;
  ratePct: number;
  months: number;
  compounding: Compounding;
  senior: boolean;
  slabPct: number;
}) {
  const { principal, ratePct, months, compounding, senior, slabPct } = params;
  const k = PERIODS[compounding];
  const years = months / 12;
  const maturity = principal * Math.pow(1 + ratePct / 100 / k, k * years);
  const interest = maturity - principal;
  const tdsThreshold = senior ? 1_00_000 : 50_000;
  // TDS is checked per financial year; approximate by averaging over the tenure.
  const yearlyInterest = years > 0 ? interest / Math.max(1, years) : interest;
  const tds = yearlyInterest > tdsThreshold ? interest * 0.1 : 0;
  const tax = interest * (slabPct / 100) * 1.04;
  const postTaxMaturity = maturity - tax;
  const postTaxYield = cagr(principal, postTaxMaturity, years);
  const effectiveYield = cagr(principal, maturity, years);
  return {
    maturity,
    interest,
    tds,
    tax,
    postTaxMaturity,
    postTaxYield,
    effectiveYield,
    tdsThreshold,
  };
}

/** Bank RD — each monthly instalment compounds quarterly for the months it stays. */
export function recurringDeposit(
  monthly: number,
  ratePct: number,
  months: number,
) {
  const n = Math.max(1, Math.round(months));
  const q = ratePct / 100 / 4;
  let maturity = 0;
  for (let k = 1; k <= n; k += 1) {
    const monthsLeft = n - k + 1;
    maturity += monthly * Math.pow(1 + q, monthsLeft / 3);
  }
  const deposited = monthly * n;
  return { maturity, deposited, interest: maturity - deposited };
}

export function goldCompare(params: {
  amount: number;
  growthPct: number;
  years: number;
  makingPct: number;
  etfExpensePct: number;
  slabPct: number;
}) {
  const { amount, growthPct, years, makingPct, etfExpensePct, slabPct } =
    params;
  const growth = Math.pow(1 + growthPct / 100, years);
  // Physical: GST 3% on gold + making charges are not recovered on resale.
  const physicalGold = amount / (1.03 * (1 + makingPct / 100));
  const physicalValue = physicalGold * growth;
  const physicalLongTerm = years >= 2;
  const physicalTax =
    Math.max(0, physicalValue - amount) *
    (physicalLongTerm ? 0.125 : slabPct / 100) *
    1.04;
  // ETF / gold fund: tracks price less expense ratio; long term after 12 months.
  const etfValue =
    amount * Math.pow((1 + growthPct / 100) * (1 - etfExpensePct / 100), years);
  const etfTax =
    Math.max(0, etfValue - amount) *
    (years >= 1 ? 0.125 : slabPct / 100) *
    1.04;
  // SGB held to maturity: 2.5% interest (taxed at slab), redemption gain tax-free.
  const sgbInterest = amount * 0.025 * years * (1 - (slabPct / 100) * 1.04);
  const sgbValue = amount * growth + sgbInterest;
  return {
    physical: {
      value: physicalValue,
      tax: physicalTax,
      net: physicalValue - physicalTax,
    },
    etf: { value: etfValue, tax: etfTax, net: etfValue - etfTax },
    sgb: { value: sgbValue, tax: 0, net: sgbValue },
  };
}

/** Direct vs regular plan — same gross return, different expense ratios. */
export function expenseRatioDrag(params: {
  lumpsum: number;
  monthly: number;
  grossPct: number;
  directTerPct: number;
  regularTerPct: number;
  years: number;
}) {
  const { lumpsum, monthly, grossPct, directTerPct, regularTerPct, years } =
    params;
  const value = (ter: number) => {
    const net = grossPct - ter;
    return lumpsumFV(lumpsum, net, years) + sipFV(monthly, net, years * 12);
  };
  const direct = value(directTerPct);
  const regular = value(regularTerPct);
  const invested = lumpsum + monthly * 12 * years;
  return { direct, regular, difference: direct - regular, invested };
}

export type RiskProfile = "conservative" | "moderate" | "aggressive";

export function assetAllocation(
  age: number,
  risk: RiskProfile,
  horizonYears: number,
) {
  const base = risk === "conservative" ? 90 : risk === "moderate" ? 105 : 120;
  let equity = Math.min(85, Math.max(10, base - age));
  if (horizonYears < 3) equity = Math.min(equity, 15);
  else if (horizonYears < 5) equity = Math.min(equity, 40);
  else if (horizonYears < 7) equity = Math.min(equity, 60);
  const gold = risk === "conservative" ? 10 : risk === "moderate" ? 10 : 5;
  const debt = Math.max(0, 100 - equity - gold);
  return { equity, debt, gold };
}

export function rebalance(
  current: { equity: number; debt: number; gold: number },
  target: { equity: number; debt: number; gold: number },
) {
  const total = current.equity + current.debt + current.gold;
  const keys = ["equity", "debt", "gold"] as const;
  return keys.map((k) => {
    const want = (total * target[k]) / 100;
    return {
      key: k,
      currentPct: total > 0 ? (current[k] / total) * 100 : 0,
      targetPct: target[k],
      move: want - current[k],
    };
  });
}

// ─── Retirement ──────────────────────────────────────────────────────────────

/** Present value at retirement of yearly withdrawals (start of year) that grow with inflation. */
export function corpusForExpenses(
  firstYearExpense: number,
  years: number,
  postReturnPct: number,
  inflationPct: number,
) {
  const p = postReturnPct / 100;
  const i = inflationPct / 100;
  if (years <= 0) return 0;
  if (Math.abs(p - i) < 1e-9) return firstYearExpense * years;
  return (
    firstYearExpense *
    ((1 - Math.pow((1 + i) / (1 + p), years)) / (p - i)) *
    (1 + p)
  );
}

export function retirementPlan(params: {
  age: number;
  retireAge: number;
  lifeExpectancy: number;
  monthlyExpense: number;
  inflationPct: number;
  preReturnPct: number;
  postReturnPct: number;
  existingSavings: number;
}) {
  const yearsToGo = Math.max(0, params.retireAge - params.age);
  const yearsInRetirement = Math.max(
    1,
    params.lifeExpectancy - params.retireAge,
  );
  const monthlyAtRetirement = inflate(
    params.monthlyExpense,
    params.inflationPct,
    yearsToGo,
  );
  const corpus = corpusForExpenses(
    monthlyAtRetirement * 12,
    yearsInRetirement,
    params.postReturnPct,
    params.inflationPct,
  );
  const existingFV = lumpsumFV(
    params.existingSavings,
    params.preReturnPct,
    yearsToGo,
  );
  const gap = Math.max(0, corpus - existingFV);
  const sip =
    yearsToGo > 0
      ? sipForTarget(gap, params.preReturnPct, yearsToGo * 12)
      : gap;
  // 10% yearly step-up SIP needed: scale a ₹1 step-up SIP.
  const unit =
    yearsToGo > 0 ? stepUpSip(1, 10, params.preReturnPct, yearsToGo).value : 0;
  const stepUpStart = unit > 0 ? gap / unit : gap;
  return {
    yearsToGo,
    yearsInRetirement,
    monthlyAtRetirement,
    corpus,
    existingFV,
    gap,
    sip,
    stepUpStart,
  };
}

export function npsPlan(params: {
  age: number;
  monthly: number;
  employerMonthly: number;
  stepUpPct: number;
  returnPct: number;
  annuityPct: number;
  annuityRatePct: number;
  slabPct: number;
}) {
  const years = Math.max(1, 60 - params.age);
  const total = params.monthly + params.employerMonthly;
  const grown = stepUpSip(total, params.stepUpPct, params.returnPct, years);
  const corpus = grown.value;
  const annuityPct = Math.min(100, Math.max(40, params.annuityPct));
  const annuityCorpus = (corpus * annuityPct) / 100;
  const lumpSum = corpus - annuityCorpus;
  const monthlyPension = (annuityCorpus * params.annuityRatePct) / 100 / 12;
  const ownYearly = params.monthly * 12;
  const taxSaved80CCD1B =
    Math.min(ownYearly, 50_000) * (params.slabPct / 100) * 1.04;
  return {
    years,
    corpus,
    invested: grown.invested,
    annuityCorpus,
    lumpSum,
    monthlyPension,
    taxSaved80CCD1B,
  };
}

export function annuityIncome(corpus: number, ratePct: number) {
  return (corpus * ratePct) / 100 / 12;
}

export function corpusForPension(monthlyPension: number, ratePct: number) {
  if (ratePct <= 0) return 0;
  return (monthlyPension * 12) / (ratePct / 100);
}

/** Gratuity — covered by the Payment of Gratuity Act (15/26) or not (15/30, completed years). */
export function gratuity(params: {
  monthlyBasicDa: number;
  years: number;
  months: number;
  covered: boolean;
}) {
  const { monthlyBasicDa, years, months, covered } = params;
  const serviceYears = covered ? years + (months >= 6 ? 1 : 0) : years;
  const amount = covered
    ? (monthlyBasicDa * 15 * serviceYears) / 26
    : (monthlyBasicDa * 15 * serviceYears) / 30;
  // 4 years and 240+ days of service is treated as 5 years by the courts.
  const eligible = years >= 5 || (years === 4 && months >= 8);
  const exempt = Math.min(amount, 20_00_000);
  return { amount, serviceYears, eligible, exempt, taxable: amount - exempt };
}

export function leaveEncashment(params: {
  monthlyBasicDa: number;
  leaveDays: number;
  yearsOfService: number;
  atRetirement: boolean;
  government: boolean;
}) {
  const {
    monthlyBasicDa,
    leaveDays,
    yearsOfService,
    atRetirement,
    government,
  } = params;
  const amount = (monthlyBasicDa / 30) * leaveDays;
  let exempt = 0;
  if (atRetirement && government) exempt = amount;
  else if (atRetirement) {
    const earnedCap =
      (monthlyBasicDa / 30) * Math.min(leaveDays, 30 * yearsOfService);
    exempt = Math.min(amount, 25_00_000, 10 * monthlyBasicDa, earnedCap);
  }
  return { amount, exempt, taxable: Math.max(0, amount - exempt) };
}

// ─── Loans ───────────────────────────────────────────────────────────────────

/** RBI loan-to-value caps for housing loans. */
export function homeLoanLtv(loan: number) {
  if (loan <= 30_00_000) return 0.9;
  if (loan <= 75_00_000) return 0.8;
  return 0.75;
}

export function loanEligibility(params: {
  monthlyIncome: number;
  existingEmis: number;
  foirPct: number;
  ratePct: number;
  years: number;
}) {
  const maxEmi = Math.max(
    0,
    (params.monthlyIncome * params.foirPct) / 100 - params.existingEmis,
  );
  const loan = loanForEmi(maxEmi, params.ratePct, params.years * 12);
  const ltv = homeLoanLtv(loan);
  return { maxEmi, loan, ltv, propertyValue: ltv > 0 ? loan / ltv : 0 };
}

export function prepayVsInvest(params: {
  outstanding: number;
  ratePct: number;
  monthsLeft: number;
  lumpsum: number;
  investReturnPct: number;
}) {
  const { outstanding, ratePct, monthsLeft, lumpsum, investReturnPct } = params;
  const emi = emiFor(outstanding, ratePct, monthsLeft);
  const totalBefore = emi * monthsLeft;
  const newPrincipal = Math.max(0, outstanding - lumpsum);
  const newMonths = monthsToRepay(newPrincipal, ratePct, emi);
  const monthsSaved = Math.max(0, monthsLeft - newMonths);
  const interestSaved =
    totalBefore - (emi * newMonths + Math.min(lumpsum, outstanding));
  // Prepay path: after the loan closes early, invest the freed EMI until the original end.
  const prepayWealth = sipFV(emi, investReturnPct, monthsSaved);
  // Invest path: lumpsum grows for the whole remaining tenure.
  const investWealth = lumpsumFV(lumpsum, investReturnPct, monthsLeft / 12);
  return {
    emi,
    newMonths,
    monthsSaved,
    interestSaved,
    prepayWealth,
    investWealth,
  };
}

export function balanceTransfer(params: {
  outstanding: number;
  currentRatePct: number;
  newRatePct: number;
  monthsLeft: number;
  feePct: number;
  otherCharges: number;
}) {
  const {
    outstanding,
    currentRatePct,
    newRatePct,
    monthsLeft,
    feePct,
    otherCharges,
  } = params;
  const oldEmi = emiFor(outstanding, currentRatePct, monthsLeft);
  const newEmi = emiFor(outstanding, newRatePct, monthsLeft);
  const fees = ((outstanding * feePct) / 100) * 1.18 + otherCharges;
  const grossSaving = (oldEmi - newEmi) * monthsLeft;
  const netSaving = grossSaving - fees;
  const breakEvenMonths =
    oldEmi > newEmi
      ? Math.ceil(fees / (oldEmi - newEmi))
      : Number.POSITIVE_INFINITY;
  return { oldEmi, newEmi, fees, grossSaving, netSaving, breakEvenMonths };
}

export function flatToReducing(
  principal: number,
  flatPct: number,
  months: number,
) {
  const n = Math.max(1, Math.round(months));
  const totalInterest = principal * (flatPct / 100) * (n / 12);
  const emi = (principal + totalInterest) / n;
  const rate = bisect((r) => emiFor(principal, r, n) - emi, 0, 200);
  return { emi, totalInterest, effectivePct: rate ?? 0 };
}

export function creditCardPayoff(params: {
  balance: number;
  monthlyRatePct: number;
  minDuePct: number;
  fixedPayment: number;
}) {
  const simulate = (payFor: (bal: number) => number) => {
    let bal = params.balance;
    let interest = 0;
    let months = 0;
    while (bal > 0.5 && months < 600) {
      const i = bal * (params.monthlyRatePct / 100);
      const gst = i * 0.18;
      bal += i + gst;
      interest += i + gst;
      const pay = Math.min(bal, payFor(bal));
      if (pay <= i + gst) return { months: Number.POSITIVE_INFINITY, interest };
      bal -= pay;
      months += 1;
    }
    return {
      months: months >= 600 ? Number.POSITIVE_INFINITY : months,
      interest,
    };
  };
  const minimum = simulate((b) => Math.max(200, (b * params.minDuePct) / 100));
  const fixed = simulate(() => params.fixedPayment);
  return { minimum, fixed };
}

export type Debt = {
  name: string;
  balance: number;
  ratePct: number;
  minEmi: number;
};

/** Avalanche (highest rate first) or snowball (smallest balance first) payoff. */
export function debtPayoff(
  debts: Debt[],
  extra: number,
  method: "avalanche" | "snowball",
) {
  const list = debts
    .filter((d) => d.balance > 0)
    .map((d) => ({ ...d, bal: d.balance, paidOffMonth: 0 }));
  const budget = list.reduce((s, d) => s + d.minEmi, 0) + Math.max(0, extra);
  let month = 0;
  let interest = 0;
  let lastOwed = Number.POSITIVE_INFINITY;
  while (list.some((d) => d.bal > 0.5) && month < 600) {
    month += 1;
    for (const d of list) {
      if (d.bal <= 0.5) continue;
      const i = (d.bal * d.ratePct) / 100 / 12;
      d.bal += i;
      interest += i;
    }
    let left = budget;
    for (const d of list) {
      if (d.bal <= 0.5) continue;
      const pay = Math.min(d.bal, d.minEmi, left);
      d.bal -= pay;
      left -= pay;
    }
    const order = list
      .filter((d) => d.bal > 0.5)
      .sort((a, b) =>
        method === "avalanche" ? b.ratePct - a.ratePct : a.bal - b.bal,
      );
    for (const d of order) {
      if (left <= 0) break;
      const pay = Math.min(d.bal, left);
      d.bal -= pay;
      left -= pay;
    }
    for (const d of list) {
      if (d.bal <= 0.5 && d.paidOffMonth === 0) d.paidOffMonth = month;
    }
    const owed = list.reduce((sum, d) => sum + Math.max(0, d.bal), 0);
    if (owed >= lastOwed) break; // payments don't cover interest — never ends
    lastOwed = owed;
  }
  const done = !list.some((d) => d.bal > 0.5);
  return {
    months: done ? month : Number.POSITIVE_INFINITY,
    interest,
    order: [...list]
      .sort((a, b) => a.paidOffMonth - b.paidOffMonth)
      .map((d) => ({ name: d.name, month: d.paidOffMonth })),
  };
}

export function educationLoan(params: {
  amount: number;
  ratePct: number;
  moratoriumMonths: number;
  payInterestDuringStudy: boolean;
  repayYears: number;
  slabPct: number;
}) {
  const {
    amount,
    ratePct,
    moratoriumMonths,
    payInterestDuringStudy,
    repayYears,
    slabPct,
  } = params;
  const moratoriumInterest = amount * (ratePct / 100) * (moratoriumMonths / 12);
  const principalAtRepay = payInterestDuringStudy
    ? amount
    : amount + moratoriumInterest;
  const emi = emiFor(principalAtRepay, ratePct, repayYears * 12);
  const repayInterest = emi * repayYears * 12 - principalAtRepay;
  // Interest paid while studying, or added to the loan — a cost either way.
  const totalInterest = repayInterest + moratoriumInterest;
  // 80E (old regime): interest paid in the first 8 years of repayment is deductible.
  const r = ratePct / 100 / 12;
  let bal = principalAtRepay;
  let interest8 = 0;
  for (let m = 0; m < Math.min(8, repayYears) * 12; m += 1) {
    const i = bal * r;
    interest8 += i;
    bal -= emi - i;
  }
  const tax80E = interest8 * (slabPct / 100) * 1.04;
  return { moratoriumInterest, principalAtRepay, emi, totalInterest, tax80E };
}

export const GOLD_PURITY = { "24K": 0.999, "22K": 0.916, "18K": 0.75 } as const;

/** RBI tiered LTV for gold loans (85% up to ₹2.5L, 80% up to ₹5L, 75% above). */
export function goldLoan(params: {
  grams: number;
  purity: keyof typeof GOLD_PURITY;
  rate24kPer10g: number;
  ratePct: number;
  months: number;
}) {
  const value =
    (params.grams * GOLD_PURITY[params.purity] * params.rate24kPer10g) / 10;
  const maxLoan = Math.max(
    Math.min(value * 0.85, 2_50_000),
    Math.min(value * 0.8, 5_00_000),
    value * 0.75,
  );
  const interest = maxLoan * (params.ratePct / 100) * (params.months / 12);
  return {
    value,
    maxLoan,
    ltvPct: value > 0 ? (maxLoan / value) * 100 : 0,
    interest,
    emi: emiFor(maxLoan, params.ratePct, params.months),
  };
}

// ─── Tax ─────────────────────────────────────────────────────────────────────

export type Regime = "new" | "old";

/** Slab tax with 87A rebate (incl. new-regime marginal relief) and 4% cess. */
export function incomeTax(taxable: number, regime: Regime, age = 30) {
  const t = Math.max(0, taxable);
  let slab = calculateTax(t, regime, age);
  if (regime === "new") {
    if (t <= 12_00_000) slab = 0;
    else slab = Math.min(slab, t - 12_00_000);
  } else if (t <= 5_00_000) {
    slab = 0;
  }
  return addSurchargeAndCess(slab, t, regime).total;
}

export function salaryBreakup(params: {
  ctc: number;
  basicPct: number;
  variablePct: number;
  employerPfOnFullBasic: boolean;
  includeGratuity: boolean;
  professionalTax: number;
  regime: Regime;
  rentMonthly: number;
  metro: boolean;
  extra80C: number;
}) {
  const p = params;
  const basic = (p.ctc * p.basicPct) / 100;
  const pfBase = p.employerPfOnFullBasic ? basic : Math.min(basic, 15_000 * 12);
  const employerPf = pfBase * 0.12;
  const gratuityPart = p.includeGratuity ? basic * 0.0481 : 0;
  const gross = Math.max(0, p.ctc - employerPf - gratuityPart);
  const variable = (p.ctc * p.variablePct) / 100;
  const employeePf = pfBase * 0.12;
  const hraReceived = basic * (p.metro ? 0.5 : 0.4);
  let taxable: number;
  if (p.regime === "new") {
    taxable = gross - 75_000;
  } else {
    const hra = calculateHRAExemption({
      hasHRA: true,
      salaryForHra: basic,
      hraReceivedAnnual: Math.min(hraReceived, gross),
      rentPaidAnnual: p.rentMonthly * 12,
      isMetro: p.metro,
    });
    const c80 = Math.min(1_50_000, employeePf + p.extra80C);
    taxable = gross - 50_000 - hra - c80 - Math.min(p.professionalTax, 2_500);
  }
  const tax = incomeTax(taxable, p.regime);
  const annualInHand = gross - employeePf - p.professionalTax - tax;
  const monthlyInHand = (annualInHand - variable) / 12;
  return {
    basic,
    employerPf,
    gratuityPart,
    gross,
    variable,
    employeePf,
    tax,
    annualInHand,
    monthlyInHand,
    taxable: Math.max(0, taxable),
  };
}

export function hraExemption(params: {
  basicMonthly: number;
  hraMonthly: number;
  rentMonthly: number;
  metro: boolean;
}) {
  const basic = params.basicMonthly * 12;
  const hra = params.hraMonthly * 12;
  const rent = params.rentMonthly * 12;
  const tests = {
    actualHra: hra,
    rentMinus10: Math.max(0, rent - basic * 0.1),
    pctOfBasic: basic * (params.metro ? 0.5 : 0.4),
  };
  const exempt = calculateHRAExemption({
    hasHRA: true,
    salaryForHra: basic,
    hraReceivedAnnual: hra,
    rentPaidAnnual: rent,
    isMetro: params.metro,
  });
  // Rent at which the "rent − 10% of basic" test stops being the binding one.
  const rentForMax = (Math.min(hra, tests.pctOfBasic) + basic * 0.1) / 12;
  return { tests, exempt, taxable: Math.max(0, hra - exempt), rentForMax };
}

/** Cost Inflation Index by financial year start (FY 2001-02 = 2001). */
export const CII: Record<number, number> = {
  2001: 100,
  2002: 105,
  2003: 109,
  2004: 113,
  2005: 117,
  2006: 122,
  2007: 129,
  2008: 137,
  2009: 148,
  2010: 167,
  2011: 184,
  2012: 200,
  2013: 220,
  2014: 240,
  2015: 254,
  2016: 264,
  2017: 272,
  2018: 280,
  2019: 289,
  2020: 301,
  2021: 317,
  2022: 331,
  2023: 348,
  2024: 363,
  2025: 376,
};

function fyStart(d: Date) {
  return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
}

function ciiFor(d: Date) {
  const fy = Math.min(2025, Math.max(2001, fyStart(d)));
  return CII[fy];
}

export type CapitalAsset =
  | "equity"
  | "debt-mf"
  | "property"
  | "gold"
  | "unlisted";

export function capitalGains(params: {
  asset: CapitalAsset;
  buyDate: string;
  sellDate: string;
  buyValue: number;
  sellValue: number;
  expenses: number;
  slabPct: number;
}) {
  const buy = new Date(params.buyDate);
  const sell = new Date(params.sellDate);
  const heldMonths =
    (sell.getFullYear() - buy.getFullYear()) * 12 +
    (sell.getMonth() - buy.getMonth()) -
    (sell.getDate() < buy.getDate() ? 1 : 0);
  const ltThreshold = params.asset === "equity" ? 12 : 24;
  const longTerm = params.asset !== "debt-mf" && heldMonths >= ltThreshold;
  const gain = params.sellValue - params.buyValue - params.expenses;
  const cess = 1.04;
  let tax = 0;
  let rateLabel = "";
  let exemption = 0;
  let indexedOption: { indexedCost: number; gain: number; tax: number } | null =
    null;
  if (gain <= 0) {
    rateLabel = "Loss — can be carried forward for 8 years";
  } else if (params.asset === "debt-mf") {
    tax = gain * (params.slabPct / 100) * cess;
    rateLabel = `Slab rate (${params.slabPct}%) — debt funds bought after Apr 2023`;
  } else if (!longTerm) {
    if (params.asset === "equity") {
      tax = gain * 0.2 * cess;
      rateLabel = "Short-term: 20% (Section 111A)";
    } else {
      tax = gain * (params.slabPct / 100) * cess;
      rateLabel = `Short-term: your slab (${params.slabPct}%)`;
    }
  } else if (params.asset === "equity") {
    exemption = Math.min(gain, 1_25_000);
    tax = (gain - exemption) * 0.125 * cess;
    rateLabel = "Long-term: 12.5% above ₹1.25 lakh (Section 112A)";
  } else {
    tax = gain * 0.125 * cess;
    rateLabel = "Long-term: 12.5% without indexation";
    if (params.asset === "property" && buy < new Date("2024-07-23")) {
      const indexedCost = (params.buyValue * ciiFor(sell)) / ciiFor(buy);
      const ig = Math.max(0, params.sellValue - indexedCost - params.expenses);
      const it = ig * 0.2 * cess;
      indexedOption = { indexedCost, gain: ig, tax: it };
      if (it < tax) {
        tax = it;
        rateLabel = "Long-term: 20% with indexation (lower for you)";
      }
    }
  }
  return {
    heldMonths,
    longTerm,
    gain,
    tax,
    rateLabel,
    exemption,
    indexedOption,
    net: params.sellValue - params.expenses - tax,
  };
}

export function ltcgHarvest(unrealisedGain: number, realisedThisYear: number) {
  const room = Math.max(0, 1_25_000 - realisedThisYear);
  const harvest = Math.min(Math.max(0, unrealisedGain), room);
  return { room, harvest, taxSaved: harvest * 0.125 * 1.04 };
}

export function deductionPlanner(params: {
  items80C: number;
  nps80CCD1B: number;
  health80DSelf: number;
  selfSenior: boolean;
  health80DParents: number;
  parentsSenior: boolean;
  homeLoanInterest: number;
  slabPct: number;
}) {
  const p = params;
  const rows = [
    { key: "80C", used: Math.min(p.items80C, 1_50_000), cap: 1_50_000 },
    { key: "80CCD(1B) NPS", used: Math.min(p.nps80CCD1B, 50_000), cap: 50_000 },
    {
      key: "80D self & family",
      used: Math.min(p.health80DSelf, p.selfSenior ? 50_000 : 25_000),
      cap: p.selfSenior ? 50_000 : 25_000,
    },
    {
      key: "80D parents",
      used: Math.min(p.health80DParents, p.parentsSenior ? 50_000 : 25_000),
      cap: p.parentsSenior ? 50_000 : 25_000,
    },
    {
      key: "24(b) home loan interest",
      used: Math.min(p.homeLoanInterest, 2_00_000),
      cap: 2_00_000,
    },
  ];
  const total = rows.reduce((s, r) => s + r.used, 0);
  const room = rows.reduce((s, r) => s + (r.cap - r.used), 0);
  const factor = (p.slabPct / 100) * 1.04;
  return {
    rows,
    total,
    room,
    taxSaved: total * factor,
    moreSaving: room * factor,
  };
}

export function advanceTax(
  totalTax: number,
  tdsPaid: number,
  presumptive: boolean,
) {
  const net = Math.max(0, totalTax - tdsPaid);
  const applies = net >= 10_000;
  const schedule = presumptive
    ? [{ due: "15 Mar", cumulativePct: 100 }]
    : [
        { due: "15 Jun", cumulativePct: 15 },
        { due: "15 Sep", cumulativePct: 45 },
        { due: "15 Dec", cumulativePct: 75 },
        { due: "15 Mar", cumulativePct: 100 },
      ];
  const rows = schedule.map((s, idx) => {
    const prev = idx === 0 ? 0 : schedule[idx - 1].cumulativePct;
    return {
      ...s,
      amount: (net * (s.cumulativePct - prev)) / 100,
      cumulative: (net * s.cumulativePct) / 100,
    };
  });
  // 234C if nothing is paid on time (3 months on each of the first three, 1 on the last).
  const penalty234C = presumptive
    ? net * 0.01
    : net * (0.15 * 0.03 + 0.45 * 0.03 + 0.75 * 0.03 + 1 * 0.01);
  return { net, applies, rows, penalty234C };
}

export function presumptiveTax(params: {
  mode: "44ADA" | "44AD";
  receipts: number;
  digitalPct: number;
  actualExpenses: number;
}) {
  const { mode, receipts, digitalPct, actualExpenses } = params;
  const income =
    mode === "44ADA"
      ? receipts * 0.5
      : receipts * ((digitalPct / 100) * 0.06 + (1 - digitalPct / 100) * 0.08);
  const limit =
    mode === "44ADA"
      ? digitalPct >= 95
        ? 75_00_000
        : 50_00_000
      : digitalPct >= 95
        ? 3_00_00_000
        : 2_00_00_000;
  const booksIncome = Math.max(0, receipts - actualExpenses);
  return {
    income,
    limit,
    eligible: receipts <= limit,
    tax: incomeTax(income, "new"),
    booksIncome,
    booksTax: incomeTax(booksIncome, "new"),
  };
}

export function rentalIncome(params: {
  monthlyRent: number;
  vacantMonths: number;
  municipalTax: number;
  loanInterest: number;
  propertyValue: number;
  maintenance: number;
  slabPct: number;
}) {
  const p = params;
  const gross = p.monthlyRent * Math.max(0, 12 - p.vacantMonths);
  const nav = Math.max(0, gross - p.municipalTax);
  const std30 = nav * 0.3;
  const incomeAfter = nav - std30 - p.loanInterest;
  // A house-property loss can offset other income only up to ₹2 lakh a year.
  const setOffLoss = incomeAfter < 0 ? Math.min(-incomeAfter, 2_00_000) : 0;
  const tax = Math.max(0, incomeAfter) * (p.slabPct / 100) * 1.04;
  const taxSavedByLoss = setOffLoss * (p.slabPct / 100) * 1.04;
  const netYield =
    p.propertyValue > 0
      ? ((gross - p.municipalTax - p.maintenance - tax) / p.propertyValue) * 100
      : 0;
  return {
    gross,
    nav,
    std30,
    taxable: incomeAfter,
    setOffLoss,
    tax,
    taxSavedByLoss,
    netYield,
  };
}

export function gst(amount: number, ratePct: number, mode: "add" | "remove") {
  if (mode === "add") {
    const tax = (amount * ratePct) / 100;
    return { base: amount, tax, total: amount + tax };
  }
  const base = amount / (1 + ratePct / 100);
  return { base, tax: amount - base, total: amount };
}

// ─── Protection ──────────────────────────────────────────────────────────────

export function termCover(params: {
  annualIncome: number;
  selfSharePct: number;
  yearsToRetire: number;
  growthPct: number;
  discountPct: number;
  loans: number;
  goals: number;
  savings: number;
  existingCover: number;
  monthlyFamilyExpense: number;
  yearsFamilyNeeds: number;
  inflationPct: number;
}) {
  const p = params;
  const support = p.annualIncome * (1 - p.selfSharePct / 100);
  const hlv =
    corpusForExpenses(support, p.yearsToRetire, p.discountPct, p.growthPct) /
    (1 + p.discountPct / 100);
  const familyCorpus = corpusForExpenses(
    p.monthlyFamilyExpense * 12,
    p.yearsFamilyNeeds,
    p.discountPct,
    p.inflationPct,
  );
  const needs = Math.max(0, familyCorpus + p.loans + p.goals - p.savings);
  const recommended = Math.max(hlv + p.loans - p.savings, needs);
  return {
    hlv,
    needs,
    recommended: Math.max(0, recommended),
    gap: Math.max(0, recommended - p.existingCover),
    ruleOfThumb: p.annualIncome * 15,
  };
}

export type CityTier = "metro" | "tier1" | "tier2";

export function healthCover(params: {
  city: CityTier;
  adults: number;
  children: number;
  eldestAge: number;
  includeParents: boolean;
  employerCover: number;
  years: number;
  medicalInflationPct: number;
}) {
  const p = params;
  const cityBase =
    p.city === "metro" ? 10_00_000 : p.city === "tier1" ? 7_50_000 : 5_00_000;
  let family =
    cityBase + Math.max(0, p.adults - 2) * 2_50_000 + p.children * 1_00_000;
  if (p.eldestAge >= 45) family += 5_00_000;
  family = Math.ceil(family / 2_50_000) * 2_50_000;
  const parents = p.includeParents
    ? p.city === "metro"
      ? 15_00_000
      : 10_00_000
    : 0;
  // Employer cover ends with the job — count half of it.
  const personalBase = Math.max(5_00_000, family - p.employerCover * 0.5);
  const superTopUp = Math.max(0, family * 2 - personalBase);
  const surgeryToday = 5_00_000;
  return {
    family,
    parents,
    personalBase: Math.ceil(personalBase / 2_50_000) * 2_50_000,
    superTopUp: Math.ceil(superTopUp / 5_00_000) * 5_00_000,
    futureSurgery: inflate(surgeryToday, p.medicalInflationPct, p.years),
    surgeryToday,
  };
}

/** IRR of a traditional / endowment policy: yearly premiums then one maturity payout. */
export function policyIrr(
  premium: number,
  payYears: number,
  policyYears: number,
  maturity: number,
) {
  const flows: number[] = [];
  for (let y = 0; y <= policyYears; y += 1) flows.push(0);
  for (let y = 0; y < Math.min(payYears, policyYears); y += 1)
    flows[y] -= premium;
  flows[policyYears] += maturity;
  const npv = (r: number) =>
    flows.reduce((s, f, t) => s + f / Math.pow(1 + r, t), 0);
  const root = bisect(npv, -0.99, 1);
  const ppfValue = flows.reduce(
    (s, f, t) => (f < 0 ? s + -f * Math.pow(1.071, policyYears - t) : s),
    0,
  );
  const equityValue = flows.reduce(
    (s, f, t) => (f < 0 ? s + -f * Math.pow(1.12, policyYears - t) : s),
    0,
  );
  return {
    irr: root === null ? null : root * 100,
    totalPaid: premium * Math.min(payYears, policyYears),
    ppfValue,
    equityValue,
  };
}

export function buyTermInvestRest(params: {
  traditionalPremium: number;
  termPremium: number;
  payYears: number;
  policyYears: number;
  traditionalMaturity: number;
  returnPct: number;
}) {
  const p = params;
  const diff = Math.max(0, p.traditionalPremium - p.termPremium);
  let corpus = 0;
  for (let y = 0; y < p.policyYears; y += 1) {
    if (y < p.payYears) corpus += diff;
    corpus *= 1 + p.returnPct / 100;
  }
  return {
    yearlyInvested: diff,
    corpus,
    advantage: corpus - p.traditionalMaturity,
  };
}

// ─── Goals & life ────────────────────────────────────────────────────────────

export function downPaymentPlan(params: {
  priceToday: number;
  downPct: number;
  costsPct: number;
  years: number;
  appreciationPct: number;
  savings: number;
  returnPct: number;
  loanRatePct: number;
  loanYears: number;
}) {
  const p = params;
  const futurePrice = inflate(p.priceToday, p.appreciationPct, p.years);
  const needed = (futurePrice * (p.downPct + p.costsPct)) / 100;
  const savingsFV = lumpsumFV(p.savings, p.returnPct, p.years);
  const gap = Math.max(0, needed - savingsFV);
  const sip = sipForTarget(gap, p.returnPct, Math.max(1, p.years * 12));
  const loan = futurePrice * (1 - p.downPct / 100);
  return {
    futurePrice,
    needed,
    savingsFV,
    gap,
    sip,
    loan,
    emi: emiFor(loan, p.loanRatePct, p.loanYears * 12),
  };
}

export function salaryHike(
  currentCtc: number,
  newCtc: number,
  inflationPct: number,
) {
  const hikePct = currentCtc > 0 ? (newCtc / currentCtc - 1) * 100 : 0;
  const realPct = realReturn(hikePct, inflationPct);
  const tax = (ctc: number) => incomeTax(ctc * 0.95 - 75_000, "new");
  const inHand = (ctc: number) => (ctc * 0.95 - tax(ctc)) / 12;
  return {
    hikePct,
    realPct,
    currentMonthly: inHand(currentCtc),
    newMonthly: inHand(newCtc),
    monthlyGain: inHand(newCtc) - inHand(currentCtc),
  };
}

export function netWorth(
  assets: Record<string, number>,
  liabilities: Record<string, number>,
  liquidKeys: string[],
) {
  const totalAssets = Object.values(assets).reduce(
    (s, v) => s + Math.max(0, v),
    0,
  );
  const totalLiabilities = Object.values(liabilities).reduce(
    (s, v) => s + Math.max(0, v),
    0,
  );
  const liquid = liquidKeys.reduce(
    (s, k) => s + Math.max(0, assets[k] ?? 0),
    0,
  );
  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    debtRatio: totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0,
    liquid,
  };
}

export function budgetSplit(takeHome: number, needsPct = 50, wantsPct = 30) {
  const savingsPct = Math.max(0, 100 - needsPct - wantsPct);
  return {
    needs: (takeHome * needsPct) / 100,
    wants: (takeHome * wantsPct) / 100,
    savings: (takeHome * savingsPct) / 100,
    savingsPct,
  };
}
