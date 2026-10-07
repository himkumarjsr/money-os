import {
  analyseFinances,
  assessTermCover,
  computeRealEmergencyFund,
  housingAndEmiTotal,
  isMetroCity,
  monthlyInsuranceTotal,
  monthlySavingsContributions,
  monthlyTotalExpenses,
  monthlyTotalIncome,
  projectRetirementAccounts,
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
  it("does not count spouse income when life stage is bachelor (stale field from a prior profile)", () => {
    expect(monthlyTotalIncome(baseProfile({ spouseIncome: 50_000 }))).toBe(
      100_000,
    );
  });

  it("computes income, expenses, and contributions with new field groups", () => {
    const profile = baseProfile({});

    expect(monthlyTotalIncome(profile)).toBe(100_000);
    // Savings contributions include SIP + EPF (and other investment contributions when present).
    expect(monthlySavingsContributions(profile)).toBe(30_000);
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
    expect(
      result.issues.some((issue) => issue.code === "investment_on_track"),
    ).toBe(true);
    expect(
      result.issues.some((issue) => issue.code === "emergency_fund_short"),
    ).toBe(true);
    expect(
      result.securityChecklist.some((item) => item.label === "Emergency fund"),
    ).toBe(true);
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

    // Savings rate counts SIP + EPF contributions.
    expect(result.scores.savingsRate).toBeCloseTo(26.15, 1);
    expect(
      result.issues.some((issue) => issue.code === "investment_on_track"),
    ).toBe(true);
    expect(
      result.issues.some((issue) => issue.code === "emergency_fund_ok"),
    ).toBe(true);
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
    expect(
      result.planSteps.some((step) =>
        step.includes("Make debt payoff your default surplus use"),
      ),
    ).toBe(true);
    expect(
      result.securityChecklist.some(
        (item) => item.label === "Child education fund",
      ),
    ).toBe(true);
  });

  it("computes emergency fund and metro helper", () => {
    expect(isMetroCity("metro")).toBe(true);
    expect(isMetroCity("tier2")).toBe(false);
    const er = computeRealEmergencyFund(
      baseProfile({
        savingsAccountBalance: 50_000,
        fdValue: 25_000,
        liquidMFValue: 10_000,
        otherLiquidSavings: 5_000,
        emergencyFundCurrent: 0,
      }),
    );
    // 50k + 10k*0.95 + 25k*0.7 + 5k*0.5
    expect(er.realTotal).toBe(79_500);
  });

  it("includes custom investments and non-duplicate unified loans in net worth", () => {
    const result = analyseFinances(
      baseProfile({
        monthlySalary: 200_000,
        customInvestments: [
          {
            label: "Custom",
            currentValue: 75_000,
            monthlyContribution: 0,
            type: "other" as const,
          },
        ],
        unifiedLoans: [
          {
            loanType: "personal_loan" as const,
            outstandingAmount: 99_999,
            monthlyEMI: 5_000,
          },
          {
            loanType: "education_loan" as const,
            outstandingAmount: 120_000,
            monthlyEMI: 8_000,
          },
          {
            loanType: "gold_loan" as const,
            monthlyEMI: 5_000,
            remainingMonths: 12,
            outstandingAmount: 0,
          },
        ],
        personalLoanEMI: 0,
        carLoanEMI: 0,
        bikeEMI: 0,
      }) as FinancialProfile,
    );
    expect(result.netWorth).toBeTypeOf("number");
    // education 120k + gold EMI*months 60k counted; personal_loan skipped as duplicate type
    expect(result.totalLiabilities).toBeGreaterThanOrEqual(180_000);
  });
});

describe("assessTermCover", () => {
  it("treats ₹1Cr+ existing cover as adequate when income grew", () => {
    const result = assessTermCover({
      hasTermInsurance: true,
      termCover: 10_000_000,
      termNeeded: 25_000_000,
    });
    expect(result.status).toBe("baseline_ok");
    expect(result.safetyNetOk).toBe(true);
    expect(result.gap).toBe(15_000_000);
    expect(result.infoText).toMatch(/top-up/i);
  });

  it("flags missing and partial cover correctly", () => {
    expect(
      assessTermCover({
        hasTermInsurance: false,
        termCover: 0,
        termNeeded: 20_000_000,
      }).status,
    ).toBe("missing");
    expect(
      assessTermCover({
        hasTermInsurance: true,
        termCover: 3_000_000,
        termNeeded: 20_000_000,
      }).safetyNetOk,
    ).toBe(false);
    expect(
      assessTermCover({
        hasTermInsurance: true,
        termCover: 25_000_000,
        termNeeded: 20_000_000,
      }).status,
    ).toBe("complete");
  });

  it("does not penalize overall score for ₹1Cr+ term when reference need is higher", () => {
    const result = analyseFinances(
      baseProfile({
        hasTermInsurance: true,
        termInsuranceSumAssured: 10_000_000,
        termInsurancePremiumMonthly: 1_500,
        monthlySalary: 300_000,
        spouseIncome: 100_000,
      }),
    );
    expect(result.termInsuranceNeeded).toBeGreaterThan(10_000_000);
    expect(result.issues.some((i) => i.code === "term_underinsured")).toBe(
      false,
    );
    expect(result.issues.some((i) => i.code === "term_cover_baseline_ok")).toBe(
      true,
    );
  });
});

describe("projectRetirementAccounts", () => {
  it("compounds EPF at ~8.15% instead of keeping a flat balance", () => {
    const p = projectRetirementAccounts({ epfBalance: 1_000_000 }, 10);
    expect(p.epf).toBeCloseTo(1_000_000 * Math.pow(1.0815, 10), -2);
    expect(p.total).toBe(p.epf);
  });

  it("adds ongoing monthly contributions for PPF and NPS", () => {
    const p = projectRetirementAccounts(
      { monthlyPPFContribution: 10_000, monthlyNPSContribution: 5_000 },
      15,
    );
    expect(p.ppf).toBeGreaterThan(10_000 * 12 * 15);
    expect(p.nps).toBeGreaterThan(5_000 * 12 * 15);
  });

  it("real projection is lower than nominal (today's rupees)", () => {
    const data = { epfBalance: 500_000, monthlyEPFContribution: 5_000 };
    expect(projectRetirementAccounts(data, 20, { real: true }).total).toBeLessThan(
      projectRetirementAccounts(data, 20).total,
    );
  });
});
