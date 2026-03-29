import {
  analyseFinances,
  housingAndEmiTotal,
  monthlyTotalExpenses,
  monthlyTotalIncome,
  type FinancialProfile,
} from "@/lib/financialEngine";
import { describe, expect, it } from "vitest";

function baseProfile(overrides: Partial<FinancialProfile>): FinancialProfile {
  return {
    lifeStage: "single_bachelor",
    monthlySalary: 100_000,
    spouseIncome: undefined,
    otherIncome: undefined,
    city: "Tier 2 city",
    rentOrHomeLoanEmi: 15_000,
    otherLoanEmis: 10_000,
    foodGroceries: 12_000,
    transport: 5_000,
    utilities: 4_000,
    entertainmentDiningShopping: 8_000,
    insurancePremiumsMonthly: 2_000,
    kidsExpenses: undefined,
    parentsFamilySupport: 3_000,
    monthlySavingsOrSip: 30_000,
    emergencyFundSaved: 80_000,
    totalDebtOutstanding: 400_000,
    primaryGoal: "grow_wealth",
    ...overrides,
  };
}

describe("analyseFinances", () => {
  it("bachelor (tier-2): savings rate vs 30% target, 3-month emergency baseline, no metro uplift", () => {
    const p = baseProfile({
      lifeStage: "single_bachelor",
      city: "Tier 2 city",
      monthlySalary: 100_000,
      monthlySavingsOrSip: 20_000,
      rentOrHomeLoanEmi: 20_000,
      otherLoanEmis: 15_000,
      foodGroceries: 15_000,
      transport: 5_000,
      utilities: 3_000,
      entertainmentDiningShopping: 7_000,
      insurancePremiumsMonthly: 0,
      parentsFamilySupport: 0,
      emergencyFundSaved: 50_000,
    });

    const income = monthlyTotalIncome(p);
    const expenses = monthlyTotalExpenses(p);
    expect(income).toBe(100_000);
    expect(expenses).toBe(20_000 + 15_000 + 15_000 + 5_000 + 3_000 + 7_000 + 0 + 0);

    const r = analyseFinances(p);

    expect(r.scores.savingsRate).toBeCloseTo(20, 1);
    expect(r.scores.debtRatio).toBeCloseTo(35, 1);
    expect(r.scores.untrackedCash).toBeCloseTo(income - expenses - 20_000, 1);

    const emergencyTarget = expenses * 3;
    expect(emergencyTarget - 50_000).toBeCloseTo(r.scores.emergencyFundGap, 1);

    expect(r.issues.some((i) => i.code === "savings_below_target")).toBe(true);
    expect(r.issues.some((i) => i.code === "insurance_missing")).toBe(true);
    expect(r.planSteps).toHaveLength(7);
    expect(typeof r.teaser).toBe("string");
    expect(r.teaser.length).toBeGreaterThan(0);
  });

  it("married (metro): emergency fund target uses 30% uplift vs tier-2 benchmark on expenses", () => {
    const p = baseProfile({
      lifeStage: "married_no_kids",
      city: "Mumbai",
      monthlySalary: 200_000,
      spouseIncome: 50_000,
      otherIncome: 0,
      monthlySavingsOrSip: 60_000,
      insurancePremiumsMonthly: 3_000,
      emergencyFundSaved: 0,
      parentsFamilySupport: 0,
      kidsExpenses: undefined,
    });

    expect(monthlyTotalIncome(p)).toBe(250_000);
    const expenses = monthlyTotalExpenses(p);

    const r = analyseFinances(p);
    const expectedTarget = expenses * 6 * 1.3;
    expect(r.scores.emergencyFundGap).toBeCloseTo(expectedTarget, 0);

    const savingsRate = (60_000 / 250_000) * 100;
    expect(r.scores.savingsRate).toBeCloseTo(savingsRate, 1);

    const debtRatio =
      (housingAndEmiTotal(p) / 250_000) * 100;
    expect(r.scores.debtRatio).toBeCloseTo(debtRatio, 1);

    expect(r.issues.some((i) => i.code === "emergency_fund_short")).toBe(true);
  });

  it("married with kids (tier-3): 9 emergency months and 20% savings target (kids stage)", () => {
    const p = baseProfile({
      lifeStage: "married_with_kids",
      city: "Tier 3 city",
      monthlySalary: 180_000,
      monthlySavingsOrSip: 25_000,
      kidsExpenses: 20_000,
      insurancePremiumsMonthly: 4_000,
      emergencyFundSaved: 500_000,
    });

    const income = monthlyTotalIncome(p);
    const expenses = monthlyTotalExpenses(p);
    const r = analyseFinances(p);

    expect(r.scores.savingsRate).toBeCloseTo((25_000 / income) * 100, 1);
    const target = expenses * 9;
    expect(r.scores.emergencyFundGap).toBeCloseTo(target - 500_000, 0);

    expect(r.issues.some((i) => i.code === "savings_below_target")).toBe(true);

    const untracked = income - expenses - 25_000;
    expect(r.scores.untrackedCash).toBeCloseTo(untracked, 1);
    if (untracked > 0.1 * income) {
      expect(r.issues.some((i) => i.code === "untracked_cash_high")).toBe(true);
    }
  });

  it("pre-retirement senior: 40% savings target and 30% debt guardrail", () => {
    const p = baseProfile({
      lifeStage: "pre_retirement_50_plus",
      city: "Pune",
      monthlySalary: 150_000,
      monthlySavingsOrSip: 35_000,
      rentOrHomeLoanEmi: 25_000,
      otherLoanEmis: 25_000,
      insurancePremiumsMonthly: 5_000,
      emergencyFundSaved: 2_000_000,
    });

    const income = monthlyTotalIncome(p);
    const r = analyseFinances(p);

    expect(r.scores.savingsRate).toBeCloseTo((35_000 / income) * 100, 1);
    expect(r.scores.debtRatio).toBeCloseTo((50_000 / income) * 100, 1);

    expect(r.issues.some((i) => i.code === "savings_below_target")).toBe(true);
    expect(r.issues.some((i) => i.code === "debt_ratio_high")).toBe(true);

    const expenses = monthlyTotalExpenses(p);
    const metroMonths = expenses * 12 * 1.3;
    expect(r.scores.emergencyFundGap).toBeCloseTo(metroMonths - 2_000_000, 0);
    expect(r.issues.some((i) => i.code === "emergency_fund_ok")).toBe(true);

    expect(
      r.issues.slice(0, r.issues.length - 1).every(
        (issue, idx) => issue.severityScore >= r.issues[idx + 1].severityScore,
      ),
    ).toBe(true);
  });

  it("flags include critical, warning, and good lanes when present", () => {
    const p = baseProfile({
      lifeStage: "single_bachelor",
      insurancePremiumsMonthly: 0,
      monthlySavingsOrSip: 10_000,
    });
    const r = analyseFinances(p);
    const types = r.flags.map((f) => f.type);
    expect(types).toContain("critical");
    expect(types).toContain("warning");
    expect(types).toContain("good");
  });
});
