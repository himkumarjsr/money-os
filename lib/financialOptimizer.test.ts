import { describe, expect, it } from "vitest";
import {
  buildOptimizerAnalysisFromProfile,
  optimizeFinances,
} from "./financialOptimizer";

function profile(overrides: Record<string, unknown> = {}) {
  return {
    lifeStage: "kids",
    selfAge: 36,
    cityTier: "metro",
    monthlySalary: 200_000,
    spouseIncome: 50_000,
    otherIncome: 10_000,
    rentAmount: 30_000,
    vegetables: 4_000,
    grocery: 8_000,
    medicine: 2_000,
    fuel: 4_000,
    cabMetro: 2_000,
    electricity: 3_000,
    internet: 1_000,
    gas: 800,
    entertainment: 5_000,
    shopping: 3_000,
    parentsSupport: 10_000,
    numberOfKids: 1,
    kidsAges: [5],
    kidsGenders: ["girl"],
    savingsAccountBalance: 50_000,
    liquidMFValue: 0,
    fdValue: 500_000,
    medicalEmergencyFund: 0,
    bereavementFund: 50_000,
    healthInsurancePremiumMonthly: 2_000,
    termInsurancePremiumMonthly: 1_000,
    hasTermInsurance: false,
    hasHealthInsurance: false,
    ownsCar: true,
    carMarketValue: 700_000,
    carLoanEMI: 0,
    monthlySIP: 10_000,
    additionalObligations: [],
    ...overrides,
  } as any;
}

describe("financialOptimizer", () => {
  it("derives bucket actuals and creates a complete family safety plan", () => {
    const input = profile();
    const analysis = buildOptimizerAnalysisFromProfile(input);
    expect(analysis.needsActual).toBeGreaterThan(0);

    const plan = optimizeFinances(input, analysis);
    expect(plan.totalMonthlyIncome).toBe(260_000);
    expect(plan.mandatoryFunds.map((fund) => fund.fundName)).toEqual(
      expect.arrayContaining([
        "Bereavement fund",
        "Medical emergency fund",
        "Insurance payment fund",
        "Emergency fund",
        "Kids education fund",
        "Sukanya Samriddhi Yojana",
      ]),
    );
    expect(plan.fdStrategy.useForCreditCard).toBeGreaterThan(0);
    expect(plan.fdStrategy.moveToKVP).toBeGreaterThan(0);
    expect(plan.fdStrategy.moveToLiquidMF).toBeGreaterThan(0);
    expect(plan.kvpStrategy.applicable).toBe(true);
    expect(
      plan.insuranceSuggestions.map((suggestion) => suggestion.policyHint),
    ).toEqual(
      expect.arrayContaining(["term", "health", "car", "parents_health"]),
    );
    expect(
      plan.timeline.some((step) => step.instrument === "Kisan Vikas Patra"),
    ).toBe(true);
    expect(plan.timeline.some((step) => step.instrument === "Liquid MF")).toBe(
      true,
    );
    expect(plan.assetReallocation).toHaveLength(1);
    expect(plan.monthlyActionPlan.length).toBeGreaterThan(0);
    expect(plan.investmentPlan.some((item) => item.riskLevel === "high")).toBe(
      true,
    );
  });

  it("handles a fully-funded, child-free profile with no surplus", () => {
    const plan = optimizeFinances(
      profile({
        lifeStage: "bachelor",
        selfAge: 45,
        cityTier: "tier2",
        monthlySalary: 50_000,
        spouseIncome: 999_999,
        otherIncome: 0,
        rentAmount: 20_000,
        vegetables: 10_000,
        grocery: 10_000,
        medicine: 10_000,
        fuel: 0,
        cabMetro: 0,
        electricity: 0,
        internet: 0,
        gas: 0,
        entertainment: 0,
        shopping: 0,
        parentsSupport: 0,
        numberOfKids: 0,
        kidsAges: [],
        kidsGenders: [],
        savingsAccountBalance: 1_000_000,
        liquidMFValue: 500_000,
        fdValue: 0,
        medicalEmergencyFund: 200_000,
        bereavementFund: 0,
        healthInsurancePremiumMonthly: 0,
        termInsurancePremiumMonthly: 0,
        hasTermInsurance: true,
        termInsuranceSumAssured: 100_000_000,
        hasHealthInsurance: true,
        healthInsuranceSumInsured: 1_000_000,
        ownsCar: false,
        monthlySIP: 0,
      }),
      {
        needsActual: 50_000,
        wantsActual: 0,
        loansActual: 0,
        investmentActual: 0,
        securityActual: 0,
      },
    );

    expect(plan.totalMonthlySurplus).toBe(0);
    expect(plan.mandatoryFunds).toHaveLength(2);
    expect(plan.insuranceSuggestions).toEqual([]);
    expect(plan.fdStrategy.keepInFD).toBe(0);
    expect(plan.kvpStrategy.applicable).toBe(false);
    expect(plan.monthlyAllocation).toEqual([]);
    expect(plan.monthlyActionPlan).toEqual([
      "No free surplus on paper — trim wants / loan EMIs or raise income before scaling investments.",
    ]);
    expect(plan.timeline.some((step) => step.instrument === "SSY")).toBe(false);
  });
});
