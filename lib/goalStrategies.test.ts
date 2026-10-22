import { describe, expect, it } from "vitest";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { buildUserAnalyseScenarioProfile } from "@/lib/analyseUserScenarioFixture";
import { detectGoals } from "@/lib/goalDetection";
import {
  buildGoalStrategies,
  loanEmi,
  loanOutstanding,
} from "@/lib/goalStrategies";

const NOW = new Date(2026, 9, 22);
const base = (over: Partial<FinancialProfile> = {}): FinancialProfile =>
  ({
    ...buildUserAnalyseScenarioProfile(),
    ownsHome: false,
    rentAmount: 30_000,
    homePurchasePrice: 2_00_00_000,
    homePurchaseTarget: undefined,
    homePurchaseYear: 2031,
    retirementTargetCorpus: 3_00_00_000,
    ...over,
  }) as FinancialProfile;
const forGoal = (p: FinancialProfile, id: string) =>
  buildGoalStrategies(p, NOW).find((s) => s.goalId === id)!;

describe("loan maths", () => {
  it("matches a standard EMI and pays off to zero", () => {
    expect(Math.round(loanEmi(10_00_000, 8.5, 20))).toBe(8678);
    expect(loanOutstanding(10_00_000, 8.5, 20, 20)).toBe(0);
    expect(loanOutstanding(10_00_000, 8.5, 20, 0)).toBeCloseTo(10_00_000);
  });
});

describe("buildGoalStrategies", () => {
  it("sizes the home goal from the price and checks the EMI against income", () => {
    const home = forGoal(base(), "home_purchase");
    const check = home.strategies.find((s) => s.id === "home_emi_check")!;
    expect(check.detail).toContain("₹80,00,000 upfront");
    expect(check.detail).toContain("₹1,60,00,000");
    expect(check.detail).toMatch(/rent stops/);
  });

  it("offers EPF for the downpayment as a trade-off that costs retirement", () => {
    const epf = forGoal(base(), "home_purchase").strategies.find(
      (s) => s.id === "epf_home",
    );
    expect(epf?.kind).toBe("tradeoff");
    expect(epf?.monthlySaved).toBeGreaterThan(0);
    expect(epf?.detail).toMatch(/retirement about/);
  });

  it("flags a home loan that outlives an early retirement", () => {
    const flag = forGoal(base(), "home_purchase").strategies.find(
      (s) => s.id === "loan_past_retirement",
    );
    expect(flag?.kind).toBe("check");
    expect(flag?.detail).toMatch(/owed when you retire/);
  });

  it("combines smart moves into a lower SIP than the plain plan", () => {
    const ret = forGoal(base(), "retirement");
    expect(ret.smartMonthly).toBeLessThan(ret.baseMonthly);
    expect(ret.summary).toMatch(/is enough/);
    for (const s of ret.strategies)
      expect(s.detail).not.toMatch(/NaN|undefined/);
  });

  it("rolls a finished loan's EMI into a later goal", () => {
    const p = base({
      unifiedLoans: [
        { loanType: "car_loan", monthlyEMI: 20_000, remainingMonths: 24 },
      ],
    });
    const all = buildGoalStrategies(p, NOW);
    const withRollover = all.filter((g) =>
      g.strategies.some((s) => s.id === "emi_rollover"),
    );
    expect(withRollover).toHaveLength(1);
    expect(withRollover[0].goalId).toBe("home_purchase");
  });

  it("asks once whether an older home amount was the price", () => {
    const g = detectGoals(
      base({ homePurchasePrice: undefined, homePurchaseTarget: 2_00_00_000 }),
      NOW,
    ).find((x) => x.id === "home_purchase");
    expect(g?.home?.unclearAmount).toBe(true);
  });
});
