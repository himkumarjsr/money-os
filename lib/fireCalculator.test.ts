import { describe, expect, it } from "vitest";
import { computeFireNumbers, sipFutureValue, wealthAtYears, yearsToReachWealth } from "./fireCalculator";

describe("fireCalculator", () => {
  it("computes 25x lifestyle FIRE and adds debt", () => {
    const r = computeFireNumbers({
      monthlyExpensesExEmi: 60_000,
      monthlyEmi: 40_000,
      totalDebtOutstanding: 40_00_000,
      currentCorpus: 80_00_000,
      monthlySip: 20_000,
      expectedReturnPct: 12,
    });
    expect(r.lifestyleFireCorpus).toBe(1.8e7);
    expect(r.totalFireTarget).toBe(2.2e7);
    expect(r.gap).toBe(1.4e7);
    expect(r.naiveFireCorpus).toBe(3e7);
    expect(r.debtPayoffFireSavings).toBe(1.2e7);
  });

  it("sipFutureValue matches standard formula", () => {
    const fv = sipFutureValue(10_000, 12, 10);
    expect(fv).toBeGreaterThan(2_000_000);
    expect(fv).toBeLessThan(2_500_000);
  });

  it("yearsToReachWealth finds plausible horizon", () => {
    const years = yearsToReachWealth(80_00_000, 20_000, 12, 2.2e7);
    expect(years).not.toBeNull();
    expect(years!).toBeGreaterThan(3);
    expect(years!).toBeLessThan(12);
    expect(wealthAtYears(80_00_000, 20_000, 12, years!)).toBeGreaterThanOrEqual(2.2e7 - 1);
  });
});
