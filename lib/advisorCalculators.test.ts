import { describe, expect, it } from "vitest";
import {
  advanceTax,
  assetAllocation,
  balanceTransfer,
  capitalGains,
  cagr,
  creditCardPayoff,
  debtPayoff,
  educationLoan,
  emiFor,
  fixedDeposit,
  flatToReducing,
  goalPlan,
  goldLoan,
  gratuity,
  gst,
  hraExemption,
  incomeTax,
  leaveEncashment,
  loanEligibility,
  loanForEmi,
  ltcgHarvest,
  npsPlan,
  policyIrr,
  prepayVsInvest,
  presumptiveTax,
  realReturn,
  recurringDeposit,
  retirementPlan,
  salaryBreakup,
  sipDelayCost,
  sipFV,
  sipForTarget,
  stepUpSip,
  stpPlan,
  termCover,
  xirr,
  yearsToMultiply,
} from "./advisorCalculators";

describe("building blocks", () => {
  it("SIP future value matches the SIP calculator formula", () => {
    expect(sipFV(10_000, 12, 120)).toBeCloseTo(2_300_387, 0);
  });
  it("SIP for a target is the inverse of SIP future value", () => {
    const fv = sipFV(7_500, 11, 180);
    expect(sipForTarget(fv, 11, 180)).toBeCloseTo(7_500, 6);
  });
  it("EMI and loan-for-EMI round-trip", () => {
    const emi = emiFor(10_00_000, 10, 120);
    expect(emi).toBeCloseTo(13_215.07, 1);
    expect(loanForEmi(emi, 10, 120)).toBeCloseTo(10_00_000, 4);
  });
});

describe("investing", () => {
  it("step-up SIP beats a flat SIP and equals it with 0% step-up", () => {
    const s = stepUpSip(10_000, 10, 12, 15);
    expect(s.value).toBeGreaterThan(s.flatValue);
    expect(stepUpSip(10_000, 0, 12, 15).value).toBeCloseTo(
      sipFV(10_000, 12, 180),
      4,
    );
  });
  it("goal plan inflates the cost and later starts need a bigger SIP", () => {
    const g = goalPlan({
      costToday: 10_00_000,
      years: 10,
      inflationPct: 6,
      returnPct: 12,
      existingSavings: 0,
    });
    expect(g.futureCost).toBeCloseTo(17_90_848, 0);
    expect(g.delays[0].sip).toBeGreaterThan(g.sip);
  });
  it("delaying a SIP loses money", () => {
    const d = sipDelayCost(10_000, 12, 20, 5);
    expect(d.loss).toBeGreaterThan(0);
    expect(d.sipToCatchUp).toBeGreaterThan(10_000);
  });
  it("STP keeps the whole amount invested", () => {
    const s = stpPlan({
      amount: 12_00_000,
      transferMonths: 12,
      debtPct: 7,
      equityPct: 12,
      horizonYears: 5,
    });
    expect(s.debt).toBeCloseTo(0, 0);
    expect(s.finalValue).toBeGreaterThan(s.allDebt);
    expect(s.finalValue).toBeLessThan(s.lumpEquity);
  });
  it("CAGR, real return and doubling time", () => {
    expect(cagr(100, 200, 5)).toBeCloseTo(14.87, 2);
    expect(realReturn(10, 6)).toBeCloseTo(3.77, 2);
    expect(yearsToMultiply(12, 2)).toBeCloseTo(6.12, 2);
  });
  it("XIRR of a one-year 10% gain is 10%", () => {
    expect(
      xirr([
        { date: "2021-01-01", amount: -10_000 },
        { date: "2022-01-01", amount: 11_000 },
      ]),
    ).toBeCloseTo(10, 3);
    expect(xirr([{ date: "2021-01-01", amount: -10_000 }])).toBeNull();
  });
  it("FD with quarterly compounding", () => {
    const fd = fixedDeposit({
      principal: 1_00_000,
      ratePct: 7,
      months: 12,
      compounding: "quarterly",
      senior: false,
      slabPct: 30,
    });
    expect(fd.maturity).toBeCloseTo(1_07_186, 0);
    expect(fd.tds).toBe(0);
    expect(fd.postTaxMaturity).toBeLessThan(fd.maturity);
  });
  it("RD earns interest on every instalment", () => {
    const rd = recurringDeposit(5_000, 7, 12);
    expect(rd.deposited).toBe(60_000);
    expect(rd.maturity).toBeGreaterThan(62_000);
    expect(rd.maturity).toBeLessThan(63_000);
  });
  it("asset allocation shrinks equity for short horizons", () => {
    expect(assetAllocation(30, "moderate", 15).equity).toBe(75);
    expect(assetAllocation(30, "moderate", 2).equity).toBe(15);
  });
});

describe("retirement", () => {
  it("retirement plan needs a corpus larger than yearly spend × years at real 0%", () => {
    const r = retirementPlan({
      age: 30,
      retireAge: 60,
      lifeExpectancy: 85,
      monthlyExpense: 50_000,
      inflationPct: 6,
      preReturnPct: 12,
      postReturnPct: 6,
      existingSavings: 0,
    });
    expect(r.corpus).toBeCloseTo(r.monthlyAtRetirement * 12 * 25, 0);
    expect(r.stepUpStart).toBeLessThan(r.sip);
  });
  it("NPS keeps at least 40% in annuity", () => {
    const n = npsPlan({
      age: 30,
      monthly: 5_000,
      employerMonthly: 0,
      stepUpPct: 0,
      returnPct: 10,
      annuityPct: 20,
      annuityRatePct: 6,
      slabPct: 30,
    });
    expect(n.annuityCorpus / n.corpus).toBeCloseTo(0.4, 6);
    expect(n.taxSaved80CCD1B).toBeCloseTo(15_600, 0);
  });
  it("gratuity rounds up 6+ months for covered employees", () => {
    const g = gratuity({
      monthlyBasicDa: 50_000,
      years: 10,
      months: 7,
      covered: true,
    });
    expect(g.serviceYears).toBe(11);
    expect(g.amount).toBeCloseTo(3_17_307.69, 1);
    expect(
      gratuity({ monthlyBasicDa: 50_000, years: 3, months: 0, covered: true })
        .eligible,
    ).toBe(false);
  });
  it("leave encashment during service is fully taxable", () => {
    const l = leaveEncashment({
      monthlyBasicDa: 60_000,
      leaveDays: 30,
      yearsOfService: 5,
      atRetirement: false,
      government: false,
    });
    expect(l.amount).toBe(60_000);
    expect(l.taxable).toBe(60_000);
  });
});

describe("loans", () => {
  it("eligibility uses FOIR minus existing EMIs", () => {
    const e = loanEligibility({
      monthlyIncome: 1_00_000,
      existingEmis: 10_000,
      foirPct: 50,
      ratePct: 8.5,
      years: 20,
    });
    expect(e.maxEmi).toBe(40_000);
    expect(e.loan).toBeCloseTo(loanForEmi(40_000, 8.5, 240), 4);
  });
  it("prepaying shortens the loan", () => {
    const p = prepayVsInvest({
      outstanding: 30_00_000,
      ratePct: 8.5,
      monthsLeft: 180,
      lumpsum: 5_00_000,
      investReturnPct: 12,
    });
    expect(p.monthsSaved).toBeGreaterThan(0);
    expect(p.interestSaved).toBeGreaterThan(0);
  });
  it("balance transfer break-even", () => {
    const b = balanceTransfer({
      outstanding: 40_00_000,
      currentRatePct: 9.5,
      newRatePct: 8.5,
      monthsLeft: 180,
      feePct: 0.5,
      otherCharges: 10_000,
    });
    expect(b.netSaving).toBeGreaterThan(0);
    expect(b.breakEvenMonths).toBeLessThan(24);
  });
  it("flat rate is nearly double as a reducing rate", () => {
    expect(flatToReducing(1_00_000, 10, 12).effectivePct).toBeCloseTo(17.97, 1);
  });
  it("paying only the minimum on a card takes longer", () => {
    const c = creditCardPayoff({
      balance: 1_00_000,
      monthlyRatePct: 3.6,
      minDuePct: 5,
      fixedPayment: 10_000,
    });
    expect(c.minimum.months).toBeGreaterThan(c.fixed.months);
    expect(c.minimum.interest).toBeGreaterThan(c.fixed.interest);
  });
  it("avalanche pays no more interest than snowball", () => {
    const debts = [
      { name: "Card", balance: 50_000, ratePct: 42, minEmi: 2_500 },
      { name: "Personal", balance: 3_00_000, ratePct: 14, minEmi: 8_000 },
      { name: "Small", balance: 20_000, ratePct: 12, minEmi: 1_000 },
    ];
    const a = debtPayoff(debts, 5_000, "avalanche");
    const s = debtPayoff(debts, 5_000, "snowball");
    expect(Number.isFinite(a.months)).toBe(true);
    expect(a.interest).toBeLessThanOrEqual(s.interest + 1);
    expect(
      debtPayoff(
        [{ name: "x", balance: 1_00_000, ratePct: 36, minEmi: 1_000 }],
        0,
        "avalanche",
      ).months,
    ).toBe(Number.POSITIVE_INFINITY);
  });
  it("education loan capitalises unpaid study interest", () => {
    const e = educationLoan({
      amount: 10_00_000,
      ratePct: 10,
      moratoriumMonths: 24,
      payInterestDuringStudy: false,
      repayYears: 10,
      slabPct: 30,
    });
    expect(e.principalAtRepay).toBe(12_00_000);
    expect(e.tax80E).toBeGreaterThan(0);
  });
  it("gold loan tiered LTV", () => {
    expect(
      goldLoan({
        grams: 10,
        purity: "24K",
        rate24kPer10g: 1_00_000,
        ratePct: 10,
        months: 12,
      }).maxLoan,
    ).toBeCloseTo(84_915, 0);
    expect(
      goldLoan({
        grams: 200,
        purity: "24K",
        rate24kPer10g: 1_00_000,
        ratePct: 10,
        months: 12,
      }).ltvPct,
    ).toBeCloseTo(75, 6);
  });
});

describe("tax", () => {
  it("new regime rebate and marginal relief", () => {
    expect(incomeTax(12_00_000, "new")).toBe(0);
    expect(incomeTax(12_10_000, "new")).toBeCloseTo(10_400, 6);
    expect(incomeTax(16_00_000, "new")).toBeCloseTo(1_24_800, 6);
    expect(incomeTax(10_00_000, "old")).toBeCloseTo(1_17_000, 6);
  });
  it("salary breakup: in-hand is below gross", () => {
    const s = salaryBreakup({
      ctc: 15_00_000,
      basicPct: 40,
      variablePct: 10,
      employerPfOnFullBasic: false,
      includeGratuity: true,
      professionalTax: 2_400,
      regime: "new",
      rentMonthly: 0,
      metro: true,
      extra80C: 0,
    });
    expect(s.employerPf).toBe(21_600);
    expect(s.monthlyInHand).toBeGreaterThan(80_000);
    expect(s.monthlyInHand * 12).toBeLessThan(s.gross);
  });
  it("HRA exemption is the least of three tests", () => {
    const h = hraExemption({
      basicMonthly: 50_000,
      hraMonthly: 20_000,
      rentMonthly: 25_000,
      metro: true,
    });
    expect(h.exempt).toBe(2_40_000);
  });
  it("equity LTCG uses the ₹1.25 lakh exemption", () => {
    const c = capitalGains({
      asset: "equity",
      buyDate: "2023-01-10",
      sellDate: "2025-06-10",
      buyValue: 5_00_000,
      sellValue: 7_00_000,
      expenses: 0,
      slabPct: 30,
    });
    expect(c.longTerm).toBe(true);
    expect(c.tax).toBeCloseTo(9_750, 6);
  });
  it("old property picks the cheaper of indexation and 12.5%", () => {
    const c = capitalGains({
      asset: "property",
      buyDate: "2010-05-01",
      sellDate: "2025-06-01",
      buyValue: 30_00_000,
      sellValue: 1_00_00_000,
      expenses: 0,
      slabPct: 30,
    });
    expect(c.indexedOption).not.toBeNull();
    expect(c.tax).toBeLessThanOrEqual(70_00_000 * 0.125 * 1.04);
  });
  it("short-term equity is 20%; debt funds always at slab", () => {
    expect(
      capitalGains({
        asset: "equity",
        buyDate: "2025-01-01",
        sellDate: "2025-06-01",
        buyValue: 1_00_000,
        sellValue: 1_10_000,
        expenses: 0,
        slabPct: 30,
      }).tax,
    ).toBeCloseTo(2_080, 6);
    expect(
      capitalGains({
        asset: "debt-mf",
        buyDate: "2020-01-01",
        sellDate: "2025-06-01",
        buyValue: 1_00_000,
        sellValue: 1_10_000,
        expenses: 0,
        slabPct: 20,
      }).tax,
    ).toBeCloseTo(2_080, 6);
  });
  it("harvesting and advance tax", () => {
    expect(ltcgHarvest(2_00_000, 25_000).harvest).toBe(1_00_000);
    const a = advanceTax(1_00_000, 20_000, false);
    expect(a.rows.map((r) => r.amount)).toEqual([
      12_000, 24_000, 24_000, 20_000,
    ]);
    expect(advanceTax(15_000, 10_000, false).applies).toBe(false);
  });
  it("presumptive income for professionals is half of receipts", () => {
    expect(
      presumptiveTax({
        mode: "44ADA",
        receipts: 40_00_000,
        digitalPct: 100,
        actualExpenses: 5_00_000,
      }).income,
    ).toBe(20_00_000);
  });
  it("GST add and remove are inverses", () => {
    expect(gst(1_000, 18, "add").total).toBe(1_180);
    expect(gst(1_180, 18, "remove").base).toBeCloseTo(1_000, 6);
  });
});

describe("protection", () => {
  it("term cover recommends at least the needs-based amount", () => {
    const t = termCover({
      annualIncome: 15_00_000,
      selfSharePct: 30,
      yearsToRetire: 30,
      growthPct: 6,
      discountPct: 8,
      loans: 30_00_000,
      goals: 20_00_000,
      savings: 10_00_000,
      existingCover: 50_00_000,
      monthlyFamilyExpense: 60_000,
      yearsFamilyNeeds: 25,
      inflationPct: 6,
    });
    expect(t.recommended).toBeGreaterThanOrEqual(t.needs);
    expect(t.gap).toBe(t.recommended - 50_00_000);
  });
  it("policy IRR of an endowment plan is low", () => {
    const p = policyIrr(1_00_000, 10, 20, 25_00_000);
    expect(p.irr).not.toBeNull();
    expect(p.irr!).toBeGreaterThan(4);
    expect(p.irr!).toBeLessThan(7);
  });
});
