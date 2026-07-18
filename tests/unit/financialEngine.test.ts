import { describe, expect, it } from "vitest";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import {
  analyseFinances,
  calculateTermNeeded,
  computeRealEmergencyFund,
  monthlyTotalIncome,
} from "@/lib/financialEngine";
import { buildNetWorth } from "@/lib/netWorth";

function baseProfile(
  overrides: Partial<FinancialProfile> = {},
): FinancialProfile {
  return {
    lifeStage: "bachelor",
    selfAge: 32,
    cityTier: "metro",
    monthlySalary: 200_000,
    spouseIncome: 0,
    otherIncome: 0,
    rentAmount: 20_000,
    homeLoanEMI: 0,
    secondPropertyEMI: 0,
    carLoanEMI: 0,
    bikeEMI: 0,
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
    parentsSupport: 0,
    hasHealthInsurance: false,
    healthInsurancePremiumMonthly: 0,
    hasTermInsurance: false,
    termInsuranceSumAssured: 0,
    savingsAccountBalance: 50_000,
    liquidMFValue: 0,
    fdValue: 0,
    otherLiquidSavings: 0,
    emergencyFundCurrent: 0,
    ownsHome: false,
    ownsCar: false,
    monthlySIP: 0,
    monthlyEPFContribution: 0,
    primaryGoal: "grow_wealth",
    investsInNsc: false,
    ...overrides,
  };
}

describe("Financial Engine — Unit Tests (real APIs)", () => {
  describe("buildNetWorth", () => {
    it("calculates positive net worth", () => {
      const result = buildNetWorth({
        savingsAccountBalance: 500_000,
        mfValue: 300_000,
        homeMarketValue: 5_000_000,
        homeLoanOutstanding: 3_000_000,
        personalLoanOutstanding: 0,
      });
      expect(result.netWorth).toBe(2_800_000);
    });

    it("calculates negative net worth", () => {
      const result = buildNetWorth({
        savingsAccountBalance: 50_000,
        mfValue: 0,
        homeMarketValue: 0,
        homeLoanOutstanding: 0,
        personalLoanOutstanding: 500_000,
      });
      expect(result.netWorth).toBe(-450_000);
    });

    it("handles zero assets", () => {
      const result = buildNetWorth({
        savingsAccountBalance: 0,
        mfValue: 0,
        homeMarketValue: 0,
        homeLoanOutstanding: 0,
        personalLoanOutstanding: 0,
      });
      expect(result.netWorth).toBe(0);
    });
  });

  describe("computeRealEmergencyFund", () => {
    it("counts savings at 100% and liquid MF at 95%", () => {
      const result = computeRealEmergencyFund(
        baseProfile({
          savingsAccountBalance: 200_000,
          liquidMFValue: 100_000,
          foodTotal: 50_000,
          transportTotal: 10_000,
          utilityTotal: 10_000,
          rentAmount: 10_000,
        }),
      );
      expect(result.savingsCounted).toBe(200_000);
      expect(result.liquidCounted).toBe(95_000);
      expect(result.realTotal).toBe(295_000);
      expect(result.monthsCovered).toBeGreaterThan(0);
    });

    it("handles zero expenses without dividing by zero", () => {
      const result = computeRealEmergencyFund(
        baseProfile({
          savingsAccountBalance: 0,
          liquidMFValue: 0,
          rentAmount: 0,
          vegetables: 0,
          grocery: 0,
          medicine: 0,
          fuel: 0,
          cabMetro: 0,
          electricity: 0,
          internet: 0,
          gas: 0,
          entertainment: 0,
          shopping: 0,
        }),
      );
      expect(result.realTotal).toBe(0);
      expect(result.monthsCovered).toBe(0);
    });
  });

  describe("calculateTermNeeded", () => {
    it("scales with income and dependents", () => {
      const needed = calculateTermNeeded(
        baseProfile({
          monthlySalary: 100_000,
          lifeStage: "kids",
          numberOfKids: 1,
          kidsAges: [5],
          kidsGenders: ["boy"],
        }),
      );
      expect(needed).toBeGreaterThan(0);
    });

    it("handles zero income", () => {
      const needed = calculateTermNeeded(baseProfile({ monthlySalary: 0 }));
      expect(needed).toBeGreaterThanOrEqual(0);
    });
  });

  describe("monthlyTotalIncome", () => {
    it("ignores spouse income for bachelor", () => {
      expect(
        monthlyTotalIncome(
          baseProfile({ monthlySalary: 200_000, spouseIncome: 50_000 }),
        ),
      ).toBe(200_000);
    });

    it("includes spouse income when married", () => {
      expect(
        monthlyTotalIncome(
          baseProfile({
            lifeStage: "married",
            monthlySalary: 200_000,
            spouseIncome: 50_000,
          }),
        ),
      ).toBe(250_000);
    });
  });

  describe("analyseFinances — integration", () => {
    it("returns score between 0 and 100", () => {
      const result = analyseFinances(baseProfile());
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it("flags missing term insurance as an issue", () => {
      const result = analyseFinances(
        baseProfile({
          hasTermInsurance: false,
          termInsuranceSumAssured: 0,
          monthlySalary: 200_000,
        }),
      );
      const termIssue = result.issues.find(
        (i) =>
          i.code.toLowerCase().includes("term") ||
          i.message.toLowerCase().includes("term"),
      );
      const termChecklist = result.securityChecklist.find((i) =>
        i.label.toLowerCase().includes("term"),
      );
      expect(termIssue || termChecklist).toBeTruthy();
      expect(result.termInsuranceNeeded).toBeGreaterThan(0);
    });

    it("scores higher for a well-prepared profile", () => {
      const weak = analyseFinances(
        baseProfile({
          hasTermInsurance: false,
          hasHealthInsurance: false,
          savingsAccountBalance: 20_000,
          monthlySIP: 0,
        }),
      );
      const strong = analyseFinances(
        baseProfile({
          hasTermInsurance: true,
          termInsuranceSumAssured: 20_000_000,
          hasHealthInsurance: true,
          healthInsuranceSumInsured: 1_000_000,
          healthInsurancePremiumMonthly: 2_000,
          savingsAccountBalance: 1_000_000,
          liquidMFValue: 500_000,
          monthlySIP: 30_000,
          monthlyEPFContribution: 10_000,
        }),
      );
      expect(strong.overallScore).toBeGreaterThan(weak.overallScore);
    });

    it("handles extreme income values", () => {
      const result = analyseFinances(baseProfile({ monthlySalary: 9_999_999 }));
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it("handles zero income gracefully", () => {
      const result = analyseFinances(baseProfile({ monthlySalary: 0 }));
      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });

    it("computes net worth on the result", () => {
      const result = analyseFinances(
        baseProfile({
          savingsAccountBalance: 500_000,
          mfValue: 300_000,
          homeMarketValue: 5_000_000,
          homeLoanOutstanding: 3_000_000,
          ownsHome: true,
        }),
      );
      expect(result.netWorth).toBeDefined();
      expect(typeof result.netWorth).toBe("number");
    });
  });
});
