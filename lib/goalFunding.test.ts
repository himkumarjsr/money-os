import { describe, expect, it } from "vitest";
import {
  analyseDefaultValues,
  normalizeAnalyseFormValues,
  type AnalyseFormValues,
  type FinancialProfile,
} from "./analyse-form-schema";
import {
  GOAL_FLOOR_SHARE,
  allocateGoalSurplus,
  buildGoalFundingPlan,
  goalHorizon,
} from "./goalFunding";
import { detectGoals } from "./goalDetection";

const NOW = new Date(2026, 9, 7);

function profile(over: Partial<AnalyseFormValues>): FinancialProfile {
  return normalizeAnalyseFormValues({
    ...analyseDefaultValues,
    monthlySalary: 150_000,
    selfAge: 30,
    ownsHome: true,
    ownsCar: true,
    ...over,
  } as AnalyseFormValues);
}

describe("allocateGoalSurplus", () => {
  it("matches the spec example: near deadline gets most, long horizons never zero", () => {
    const out = allocateGoalSurplus(
      [
        { id: "wedding", yearsToGoal: 1.5, monthlyRequired: 1_000_000 },
        { id: "education", yearsToGoal: 14, monthlyRequired: 1_000_000 },
        { id: "retirement", yearsToGoal: 30, monthlyRequired: 1_000_000 },
      ],
      100_000,
    );
    expect(out.wedding / 1000).toBeCloseTo(60, -1);
    expect(out.education / 1000).toBeCloseTo(23, -1);
    expect(out.retirement / 1000).toBeCloseTo(17, -1);
    expect(out.wedding + out.education + out.retirement).toBeCloseTo(100_000, 0);
  });

  it("gives every goal at least the floor share", () => {
    const goals = Array.from({ length: 6 }, (_, i) => ({
      id: `g${i}`,
      yearsToGoal: i === 0 ? 1 : 40,
      monthlyRequired: 1_000_000,
    }));
    const out = allocateGoalSurplus(goals, 50_000);
    for (const g of goals) {
      expect(out[g.id]).toBeGreaterThanOrEqual(GOAL_FLOOR_SHARE * 50_000 - 0.01);
    }
  });

  it("never gives a goal more than it needs, and redistributes the excess", () => {
    const out = allocateGoalSurplus(
      [
        { id: "small", yearsToGoal: 1, monthlyRequired: 5_000 },
        { id: "big", yearsToGoal: 20, monthlyRequired: 500_000 },
      ],
      60_000,
    );
    expect(out.small).toBeCloseTo(5_000, 0);
    expect(out.big).toBeCloseTo(55_000, 0);
  });

  it("funds everything in full when the pool covers it", () => {
    const out = allocateGoalSurplus(
      [
        { id: "a", yearsToGoal: 2, monthlyRequired: 10_000 },
        { id: "b", yearsToGoal: 10, monthlyRequired: 5_000 },
      ],
      40_000,
    );
    expect(out).toEqual({ a: 10_000, b: 5_000 });
  });

  it("weights the primary goal up without making it winner-takes-all", () => {
    const base = [
      { id: "home", yearsToGoal: 5, monthlyRequired: 1_000_000 },
      { id: "retirement", yearsToGoal: 5, monthlyRequired: 1_000_000 },
    ];
    const even = allocateGoalSurplus(base, 10_000);
    expect(even.home).toBeCloseTo(even.retirement, 6);
    const boosted = allocateGoalSurplus(
      [{ ...base[0], boost: 1.5 }, base[1]],
      10_000,
    );
    expect(boosted.home).toBeGreaterThan(boosted.retirement);
    expect(boosted.retirement).toBeGreaterThan(0);
  });

  it("returns zeros with no pool", () => {
    expect(
      allocateGoalSurplus([{ id: "a", yearsToGoal: 3, monthlyRequired: 1 }], 0),
    ).toEqual({ a: 0 });
  });
});

describe("buildGoalFundingPlan", () => {
  it("splits the pool across every detected goal, largest share first", () => {
    const plan = buildGoalFundingPlan(
      profile({
        lifeStage: "kids",
        numberOfKids: 1,
        kidsAges: [2],
        ownsHome: false,
        rentAmount: 25_000,
        primaryGoal: "buy_home",
      }),
      30_000,
      NOW,
    );
    const ids = plan.items.map((i) => i.goalId);
    expect(ids).toEqual(
      expect.arrayContaining([
        "kid_education:0",
        "kid_marriage:0",
        "home_purchase",
        "retirement",
      ]),
    );
    expect(plan.totalAllocated).toBeLessThanOrEqual(30_000);
    expect(plan.shortfall).toBeGreaterThan(0);
    for (const item of plan.items) expect(item.monthlyAllocated).toBeGreaterThan(0);
    const shares = plan.items.map((i) => i.monthlyAllocated);
    expect([...shares].sort((a, b) => b - a)).toEqual(shares);
    expect(plan.items.find((i) => i.goalId === "home_purchase")?.isPrimary).toBe(true);
  });

  it("leaves debt-free out of the pool — EMIs already fund it", () => {
    const withLoan = profile({
      lifeStage: "bachelor",
      unifiedLoans: [
        {
          id: "l1",
          loanType: "personal_loan",
          lenderName: "HDFC",
          monthlyEMI: 10_000,
          outstandingAmount: 300_000,
          interestRate: 14,
          remainingMonths: 30,
        },
      ] as AnalyseFormValues["unifiedLoans"],
    });
    expect(detectGoals(withLoan, NOW).map((g) => g.id)).toContain("debt_free");
    const plan = buildGoalFundingPlan(withLoan, 20_000, NOW);
    expect(plan.items.map((i) => i.goalId)).not.toContain("debt_free");
  });

  it("uses safer instruments for near goals and equity for long ones", () => {
    expect(goalHorizon(1)).toBe("0-1y");
    expect(goalHorizon(2)).toBe("1-3y");
    expect(goalHorizon(5)).toBe("3-7y");
    expect(goalHorizon(12)).toBe("7y+");
    const plan = buildGoalFundingPlan(
      profile({ lifeStage: "bachelor", ownsCar: false, planningMarriage: true }),
      50_000,
      NOW,
    );
    const wedding = plan.items.find((i) => i.goalId === "marriage");
    const retirement = plan.items.find((i) => i.goalId === "retirement");
    expect(wedding?.instrument).toMatch(/FD|debt/i);
    expect(retirement?.instrument).toMatch(/index/i);
  });
});
