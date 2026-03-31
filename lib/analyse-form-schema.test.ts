import {
  normalizeAnalyseFormValues,
  parseMoneyInput,
  step2Schema,
  toMonthlyEquivalent,
} from "@/lib/analyse-form-schema";
import { describe, expect, it } from "vitest";

describe("parseMoneyInput", () => {
  it("normalizes rupee symbols, commas, and spaces", () => {
    expect(parseMoneyInput("₹ 50,000")).toBe(50_000);
    expect(parseMoneyInput(" 75 000 ")).toBe(75_000);
  });

  it("returns undefined for blank or invalid values", () => {
    expect(parseMoneyInput("")).toBeUndefined();
    expect(parseMoneyInput("abc")).toBeUndefined();
    expect(parseMoneyInput(NaN)).toBeUndefined();
  });
});

describe("step2Schema", () => {
  it("accepts formatted monthly salary input", () => {
    const parsed = step2Schema.safeParse({
      monthlySalary: "₹ 50,000",
      spouseIncome: "",
      otherIncome: undefined,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.monthlySalary).toBe(50_000);
    }
  });

  it("rejects zero salary values", () => {
    const parsed = step2Schema.safeParse({
      monthlySalary: "0",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.monthlySalary).toContain(
        "Enter your monthly take-home salary",
      );
    }
  });
});

describe("premium normalization", () => {
  it("converts yearly premiums to monthly equivalent", () => {
    expect(toMonthlyEquivalent(12_000, "yearly")).toBe(1_000);
  });

  it("stores normalized monthly premiums in the final profile", () => {
    const normalized = normalizeAnalyseFormValues({
      lifeStage: "bachelor",
      selfAge: 28,
      cityTier: "metro",
      monthlySalary: 80_000,
      rentAmount: 20_000,
      homeLoanEMI: 0,
      secondPropertyEMI: 0,
      additionalObligations: [],
      vegetables: 2_000,
      grocery: 6_000,
      medicine: 500,
      fuel: 3_000,
      cabMetro: 2_000,
      electricity: 2_500,
      internet: 1_500,
      gas: 1_000,
      entertainment: 4_000,
      shopping: 3_000,
      hasHealthInsurance: true,
      healthInsuranceSumInsured: 5_00_000,
      healthInsurancePremiumInput: 24_000,
      healthInsurancePremiumFrequency: "yearly",
      hasTermInsurance: false,
      carInsurancePremiumFrequency: "monthly",
      bikeInsurancePremiumFrequency: "monthly",
      hasOtherInsurance: false,
      otherInsurancePremiumFrequency: "monthly",
      savingsAccountBalance: 2_00_000,
      emergencyFundCurrent: 1_00_000,
      ownsHome: false,
      ownsCar: false,
      monthlySIP: 10_000,
      monthlyEPFContribution: 4_000,
      primaryGoal: "grow_wealth",
      retirementAge: 60,
    });

    expect(normalized.healthInsurancePremiumMonthly).toBe(2_000);
  });

  it("keeps girl-child investment fields and kid genders in the final profile", () => {
    const normalized = normalizeAnalyseFormValues({
      lifeStage: "kids",
      selfAge: 35,
      spouseAge: 33,
      numberOfKids: 2,
      kidsAges: [8, 12],
      kidsGenders: ["girl", "boy"],
      cityTier: "metro",
      monthlySalary: 1_50_000,
      additionalObligations: [],
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
      hasHealthInsurance: false,
      hasTermInsurance: false,
      savingsAccountBalance: 0,
      emergencyFundCurrent: 0,
      ownsHome: false,
      ownsCar: false,
      monthlySIP: 0,
      monthlyEPFContribution: 0,
      ssy: 5_000,
      nscMonthly: 2_000,
      primaryGoal: "kids_education",
    });

    expect(normalized.kidsGenders).toEqual(["girl", "boy"]);
    expect(normalized.ssy).toBe(5_000);
    expect(normalized.nscMonthly).toBe(2_000);
  });
});
