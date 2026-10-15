import { describe, expect, it } from "vitest";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { analyseFinances } from "@/lib/financialEngine";
import { buildNetWorthBreakup } from "@/lib/netWorthBreakup";

function profile(overrides: Partial<FinancialProfile> = {}): FinancialProfile {
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
    savingsAccountBalance: 1_781_013,
    liquidMFValue: 0,
    fdValue: 200_000,
    otherLiquidSavings: 0,
    emergencyFundCurrent: 0,
    ownsHome: true,
    ownsCar: false,
    monthlySIP: 0,
    monthlyEPFContribution: 0,
    primaryGoal: "grow_wealth",
    investsInNsc: false,
    mfValue: 900_000,
    indianStocksValue: 300_000,
    ppfBalance: 150_000,
    epfBalance: 400_000,
    homeMarketValue: 4_500_000,
    goldValue: 50_000,
    creditCardBillMonthly: 30_000,
    customInvestments: [
      { label: "P2P lending", currentValue: 60_000 } as never,
    ],
    unifiedLoans: [
      {
        id: "l1",
        loanType: "home_loan",
        lenderName: "HDFC",
        monthlyEMI: 38_000,
        outstandingAmount: 3_900_000,
      } as never,
      {
        id: "l2",
        loanType: "personal_loan",
        monthlyEMI: 6_000,
        remainingMonths: 12,
      } as never,
    ],
    ...overrides,
  };
}

describe("buildNetWorthBreakup", () => {
  it("itemises to the same totals as the engine", () => {
    const p = profile();
    const a = analyseFinances(p);
    const b = buildNetWorthBreakup(p);
    expect(b.totalAssets).toBeCloseTo(a.totalAssets, 0);
    expect(b.totalLiabilities).toBeCloseTo(a.totalLiabilities, 0);
    expect(b.netWorth).toBeCloseTo(a.netWorth, 0);
    expect(b.assets.some((g) => g.id === "other")).toBe(false);
    const loanLabels = b.liabilities.flatMap((g) => g.rows.map((r) => r.label));
    expect(loanLabels).toContain("Home Loan · HDFC");
    expect(loanLabels).toContain("Credit card (3× monthly bill)");
  });

  it("matches the engine for the legacy loan fields", () => {
    const p = profile({
      unifiedLoans: [],
      homeLoanOutstanding: 2_000_000,
      personalLoanEMI: 5_000,
      bikeEMI: 2_000,
      totalEquityValue: 1_500_000,
    });
    const a = analyseFinances(p);
    const b = buildNetWorthBreakup(p);
    expect(b.totalAssets).toBeCloseTo(a.totalAssets, 0);
    expect(b.totalLiabilities).toBeCloseTo(a.totalLiabilities, 0);
  });

  it("adds a reconciling row when the shown total differs", () => {
    const p = profile();
    const b = buildNetWorthBreakup(p, { totalAssets: 1 });
    const other = b.assets.find((g) => g.id === "other");
    expect(other).toBeDefined();
    expect(b.totalAssets).toBeCloseTo(1, 0);
  });
});
