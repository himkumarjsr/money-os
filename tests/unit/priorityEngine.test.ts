import { describe, expect, it } from "vitest";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { analyseFinances } from "@/lib/financialEngine";
import { buildPriorityPlan } from "@/lib/priorityEngine";

function profile(overrides: Partial<FinancialProfile> = {}): FinancialProfile {
  return {
    lifeStage: "bachelor",
    selfAge: 32,
    cityTier: "metro",
    monthlySalary: 200_000,
    rentAmount: 20_000,
    homeLoanEMI: 0,
    secondPropertyEMI: 0,
    carLoanEMI: 0,
    bikeEMI: 0,
    personalLoanEMI: 20_000,
    personalLoanOutstanding: 400_000,
    personalLoanRate: 16,
    additionalObligations: [],
    vegetables: 3_000,
    grocery: 8_000,
    medicine: 1_000,
    fuel: 4_000,
    cabMetro: 2_000,
    electricity: 2_500,
    internet: 1_200,
    gas: 900,
    entertainment: 5_000,
    shopping: 3_000,
    parentsSupport: 0,
    hasHealthInsurance: false,
    hasTermInsurance: false,
    termInsuranceSumAssured: 0,
    savingsAccountBalance: 50_000,
    liquidMFValue: 0,
    emergencyFundCurrent: 0,
    ownsHome: false,
    ownsCar: false,
    monthlySIP: 5_000,
    monthlyEPFContribution: 5_000,
    primaryGoal: "grow_wealth",
    investsInNsc: false,
    ...overrides,
  };
}

describe("Priority Engine", () => {
  it("returns priorities ranked from 1", () => {
    const p = profile();
    const analysis = analyseFinances(p);
    const plan = buildPriorityPlan(p, analysis);

    expect(plan.priorities).toBeDefined();
    expect(plan.priorities.length).toBeGreaterThan(0);
    expect(plan.priorities[0].rank).toBe(1);
  });

  it("includes monthly surplus on the plan", () => {
    const p = profile();
    const analysis = analyseFinances(p);
    const plan = buildPriorityPlan(p, analysis);

    expect(typeof plan.monthlySurplus).toBe("number");
    expect(plan.surplusBreakdown).toBeDefined();
  });

  it("keeps allocation amounts within a sensible band of surplus", () => {
    const p = profile();
    const analysis = analyseFinances(p);
    const plan = buildPriorityPlan(p, analysis);

    const totalAllocated = plan.allocationPlan.reduce(
      (s, row) => s + (row.amount || 0),
      0,
    );
    // Allocations are derived from surplus; allow small rounding slack.
    if (plan.monthlySurplus > 0) {
      expect(totalAllocated).toBeLessThanOrEqual(
        plan.monthlySurplus * 1.05 + 1,
      );
    } else {
      expect(totalAllocated).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles a tight cash-flow profile", () => {
    const p = profile({
      monthlySalary: 40_000,
      rentAmount: 25_000,
      personalLoanEMI: 15_000,
      monthlySIP: 0,
      monthlyEPFContribution: 0,
    });
    const analysis = analyseFinances(p);
    const plan = buildPriorityPlan(p, analysis);
    expect(plan).toBeDefined();
    expect(Array.isArray(plan.priorities)).toBe(true);
  });
});
