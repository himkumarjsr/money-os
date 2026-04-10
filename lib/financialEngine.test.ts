import {
  analyseFinances,
  housingAndEmiTotal,
  monthlyInsuranceTotal,
  monthlySavingsContributions,
  monthlyTotalExpenses,
  monthlyTotalIncome,
  type FinancialProfile,
} from "@/lib/financialEngine";
import { describe, expect, it } from "vitest";

function baseProfile(overrides: Partial<FinancialProfile>): FinancialProfile {
  return {
    lifeStage: "bachelor",
    selfAge: 29,
    cityTier: "tier2",
    monthlySalary: 100_000,
    rentAmount: 15_000,
    homeLoanEMI: 0,
    secondPropertyEMI: 0,
    carLoanEMI: 6_000,
    bikeEMI: 4_000,
    personalLoanEMI: 0,
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
    parentsSupport: 3_000,
    hasHealthInsurance: true,
    healthInsurancePremiumMonthly: 1_000,
    hasTermInsurance: false,
    savingsAccountBalance: 1_00_000,
    emergencyFundCurrent: 80_000,
    ownsHome: false,
    ownsCar: false,
    monthlySIP: 20_000,
    monthlyEPFContribution: 10_000,
    primaryGoal: "grow_wealth",
    investsInNsc: false,
    ...overrides,
  };
}

describe("financialEngine", () => {
  it("computes income, expenses, and contributions with new field groups", () => {
    const profile = baseProfile({});

    expect(monthlyTotalIncome(profile)).toBe(100_000);
    expect(monthlySavingsContributions(profile)).toBe(20_000);
    expect(monthlyInsuranceTotal(profile)).toBe(1_000);
    expect(housingAndEmiTotal(profile)).toBe(25_000);
    expect(monthlyTotalExpenses(profile)).toBeGreaterThan(25_000);
  });

  it("uses universal bucket caps and flags emergency fund shortfalls", () => {
    const result = analyseFinances(
      baseProfile({
        lifeStage: "kids",
        selfAge: 37,
        cityTier: "tier3",
        monthlySalary: 180_000,
        kidsSchoolFees: 18_000,
        kidsActivities: 5_000,
        monthlySIP: 15_000,
        monthlyEPFContribution: 8_000,
        emergencyFundCurrent: 2_00_000,
      }),
    );

    expect(result.scores.savingsRate).toBeLessThan(20);
    expect(result.issues.some((issue) => issue.code === "investment_on_track")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "emergency_fund_short")).toBe(true);
    expect(result.securityChecklist.some((item) => item.label === "Emergency fund")).toBe(true);
  });

  it("can produce good signals under the universal framework", () => {
    const result = analyseFinances(
      baseProfile({
        lifeStage: "married",
        selfAge: 33,
        cityTier: "metro",
        monthlySalary: 250_000,
        spouseIncome: 75_000,
        rentAmount: 35_000,
        carLoanEMI: 0,
        bikeEMI: 0,
        parentsSupport: 0,
        monthlySIP: 60_000,
        monthlyEPFContribution: 25_000,
        emergencyFundCurrent: 20_00_000,
        hasTermInsurance: true,
        termInsurancePremiumMonthly: 2_000,
      }),
    );

    expect(result.scores.savingsRate).toBeCloseTo(18.46, 1);
    expect(result.issues.some((issue) => issue.code === "investment_on_track")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "emergency_fund_ok")).toBe(true);
    expect(result.planSteps).toHaveLength(7);
  });

  it("builds plan steps with scenario-specific amounts and guidance", () => {
    const result = analyseFinances(
      baseProfile({
        lifeStage: "kids",
        cityTier: "metro",
        monthlySalary: 180_000,
        numberOfKids: 1,
        kidsAges: [7],
        kidsGenders: ["girl"],
        monthlySIP: 15_000,
        monthlyEPFContribution: 8_000,
        emergencyFundCurrent: 2_00_000,
        primaryGoal: "clear_debt",
        healthInsurancePremiumMonthly: 0,
      }),
    );

    expect(result.planSteps).toHaveLength(7);
    expect(result.planSteps.some((step) => step.includes("₹"))).toBe(true);
    expect(result.planSteps.some((step) => step.includes("Make debt payoff your default surplus use"))).toBe(true);
    expect(result.securityChecklist.some((item) => item.label === "Child education fund")).toBe(true);
  });
});
