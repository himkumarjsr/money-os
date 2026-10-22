/**
 * A renter with two 11% personal loans, a tiny overdraft, lots of cash and an
 * early-retirement corpus far beyond what's left each month - the case a
 * user walked through screen by screen. Each test is one thing an adviser
 * would have said differently.
 */
import { describe, expect, it } from "vitest";
import type { FinancialProfile } from "./analyse-form-schema";
import { buildAdvisorReview } from "./advisorReview";
import { analyseFinances, savingsRateText } from "./financialEngine";
import { detectGoals, promptedGoalOffers } from "./goalDetection";
import { goalSavingsLines } from "./goalSavingsText";
import { costlyEmiMonthly, isSmallDebt } from "./moneyScore";
import {
  buildPriorityPlan,
  debtExtraLabel,
  debtPayoffNumbers,
  debtPrepayNote,
} from "./priorityEngine";

const loan = (
  id: string,
  loanType: string,
  lenderName: string,
  monthlyEMI: number,
  interestRate: number,
  outstandingAmount: number,
  remainingMonths: number,
) => ({
  id,
  loanType,
  lenderName,
  monthlyEMI,
  interestRate,
  outstandingAmount,
  remainingMonths,
});

const obligation = (
  type: string,
  lenderName: string,
  monthlyAmount: number,
  rateOfInterest: number,
  outstandingAmount: number,
  remainingMonths: number,
) => ({
  type,
  lenderName,
  monthlyAmount,
  rateOfInterest,
  outstandingAmount,
  remainingMonths,
});

const household = (over: Partial<FinancialProfile> = {}): FinancialProfile =>
  ({
    lifeStage: "married",
    selfAge: 34,
    spouseAge: 32,
    cityTier: "metro",
    monthlySalary: 280_000,
    annualSalaryIncreasePct: 5,
    rentAmount: 36_000,
    foodTotal: 10_000,
    utilityTotal: 3_000,
    transportTotal: 5_000,
    domesticHelpTotal: 8_500,
    lifestyleTotal: 2_000,
    monthlyRD: 15_000,
    monthlyEPFContribution: 18_000,
    savingsAccountBalance: 2_500_000,
    totalEquityValue: 2_000_000,
    goldValue: 2_000_000,
    epfBalance: 1_250_000,
    carMarketValue: 700_000,
    ownsHome: false,
    ownsCar: true,
    hasHealthInsurance: true,
    healthInsuranceSumInsured: 8_000_000,
    hasTermInsurance: true,
    termInsuranceSumAssured: 10_000_000,
    riskTolerance: "aggressive",
    primaryGoal: "retire_early",
    retirementAge: 44,
    retirementTargetCorpus: 30_000_000,
    // Saved the way the form saves loans: the first personal loan in its own
    // fields, the rest as extra obligations, plus the unified list.
    personalLoanEMI: 42_000,
    personalLoanRate: 11,
    personalLoanOutstanding: 1_600_000,
    personalLoanRemainingMonths: 47,
    personalLoanLenderName: "Bank A",
    additionalObligations: [
      obligation("Personal Loan", "Bank B", 66_000, 11, 2_500_000, 47),
      obligation("Overdraft (OD)", "Bank C", 11, 12.85, 1_000, 89),
    ],
    unifiedLoans: [
      loan("a", "personal_loan", "Bank A", 42_000, 11, 1_600_000, 47),
      loan("b", "personal_loan", "Bank B", 66_000, 11, 2_500_000, 47),
      loan("c", "overdraft", "Bank C", 11, 12.85, 1_000, 89),
    ],
    ...over,
  }) as FinancialProfile;

describe("plan review feedback", () => {
  it("doesn't plan around a ₹1,000 overdraft", () => {
    const plan = buildPriorityPlan(household(), { overallScore: 50 });
    const od = plan.debts.find((d) => d.outstanding === 1_000)!;
    expect(od.small).toBe(true);
    expect(od.extraEMIRecommended).toBe(0);
    expect(plan.debts.at(-1)).toBe(od);
    // Interest-only is how an overdraft works, not a mistake to flag.
    expect(debtPayoffNumbers(od).emiTooLow).toBe(false);
    expect(debtExtraLabel(od, 0)).toBe("Not needed");
    expect(isSmallDebt(1_000, 280_000)).toBe(true);
    expect(isSmallDebt(5_00_000, 280_000)).toBe(false);
    // Not a "money in the wrong place" card, and not a costly EMI in the score.
    const review = buildAdvisorReview(household(), plan);
    expect(review.fixes.some((f) => f.id === "costly_debt")).toBe(false);
    expect(costlyEmiMonthly(household(), 280_000)).toBe(0);
  });

  it("leaves prepaying an 11% loan to the user, with the trade-off", () => {
    const plan = buildPriorityPlan(household(), { overallScore: 50 });
    const pl = plan.debts.find((d) => d.rate === 11)!;
    expect(pl.prepayOptional).toBe(true);
    expect(pl.extraEMIRecommended).toBe(0);
    expect(debtExtraLabel(pl, 0)).toBe("Your choice");
    expect(debtPrepayNote(pl)).toMatch(
      /your choice\. It saves 11% a year for sure\. .* about \d+(\.\d)?% a year after tax/,
    );
  });

  it("still asks for extra EMI on a costly loan", () => {
    const p = household({ personalLoanRate: 16 });
    const plan = buildPriorityPlan(p, { overallScore: 50 });
    const costly = plan.debts.find((d) => d.rate === 16)!;
    expect(costly.prepayOptional).toBeFalsy();
    expect(costly.extraEMIRecommended).toBeGreaterThan(0);
  });

  it("counts spare savings as the medical fund, the same on every page", () => {
    const a = analyseFinances(household());
    expect(a.medicalEmergencyFund?.current).toBe(
      a.medicalEmergencyFund?.target,
    );
    expect(a.medicalEmergencyFund?.fromSavings).toBeGreaterThan(0);
  });

  it("says 14.8%, not 15%, when the rate is just under the 15% minimum", () => {
    expect(savingsRateText(14.8)).toBe("14.8%");
    expect(savingsRateText(15.2)).toBe("15%");
    expect(savingsRateText(9.6)).toBe("10%");
  });

  it("never tells you to start a SIP bigger than what's left over", () => {
    const a = analyseFinances(household());
    const goals = a.moneyScore!.pillars.find((p) => p.id === "goals")!;
    expect(goals.action?.text).toMatch(
      /more than the ₹[\d,]+ you have left over/,
    );
    const plan = buildPriorityPlan(household(), a);
    const retirement = plan.goalFunding!.items.find(
      (g) => g.goalId === "retirement",
    )!;
    expect(retirement.monthlyRequired).toBeGreaterThan(
      retirement.monthlyAllocated,
    );
    expect(goalSavingsLines(retirement).at(-1)).toMatch(
      /your plan can give it ₹[\d,]+\/month/,
    );
  });

  it("asks before planning a home for a renter", () => {
    const p = household();
    expect(detectGoals(p).some((g) => g.id === "home_purchase")).toBe(false);
    expect(promptedGoalOffers(p)).toContain("home_purchase");
    const withHome = household({
      homePurchasePrice: 20_000_000,
      homePurchaseYear: 2031,
    });
    expect(detectGoals(withHome).some((g) => g.id === "home_purchase")).toBe(
      true,
    );
    expect(promptedGoalOffers(withHome)).not.toContain("home_purchase");
  });

  it("says where to keep each pot of money", () => {
    const p = household({
      homePurchasePrice: 20_000_000,
      homePurchaseYear: 2031,
    });
    const plan = buildPriorityPlan(p, analyseFinances(p));
    const pots = buildAdvisorReview(p, plan).pots;
    expect(pots.map((x) => x.id)).toEqual(
      expect.arrayContaining(["emergency", "medical", "goal:retirement"]),
    );
    expect(pots.find((x) => x.id === "emergency")?.where).toMatch(
      /liquid fund or a sweep-in FD/,
    );
  });
});
