import { describe, expect, it } from "vitest";
import type { GoalFundingItem } from "./goalFunding";
import { goalReach, sipUnitValue } from "./goalReach";

const item = (over: Partial<GoalFundingItem> = {}): GoalFundingItem =>
  ({
    goalId: "retirement",
    type: "retirement",
    label: "Retirement",
    yearsToGoal: 8,
    targetYear: 2034,
    horizon: "7y+",
    targetAmount: 3_00_00_000,
    currentSaved: 0,
    monthlyRequired: 2_00_000,
    monthlyAllocated: 2_617,
    sharePct: 28,
    fundedPct: 1,
    instrument: "Nifty 50 index fund",
    allocation: { slices: [] },
    isPrimary: false,
    ...over,
  }) as GoalFundingItem;

const NOW = new Date(2026, 9, 21);

describe("goalReach", () => {
  it("keeps the year and reports the shortfall instead of a long timeline", () => {
    const r = goalReach(item(), {
      profile: { monthlySalary: 1_00_000 },
      startMonth: 1,
      now: NOW,
    });
    expect(r.targetYear).toBe(2034);
    expect(r.onTrack).toBe(false);
    expect(r.shortfall).toBeGreaterThan(0);
    expect(r.projected + r.shortfall).toBe(3_00_00_000);
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it("puts nothing toward a goal whose SIP starts after its year", () => {
    // A goal with no existing savings: the SIP has to build all of it.
    const r12 = (1.12 / 1.06 - 1) / 12;
    const monthlyRequired = 3_00_00_000 / sipUnitValue(1, 96, r12, 0);
    const r = goalReach(item({ type: "custom", monthlyRequired }), {
      profile: {},
      startMonth: 108,
      now: NOW,
    });
    expect(r.projected).toBeLessThan(1_000);
    expect(r.suggestions[0]).toMatch(/after 2034/);
  });

  it("is on track when the full monthly need is funded from month 1", () => {
    const r = goalReach(item({ monthlyAllocated: 2_00_000 }), {
      profile: {},
      startMonth: 1,
      now: NOW,
    });
    expect(r.onTrack).toBe(true);
    expect(r.suggestions).toEqual([]);
  });

  it("values a flat SIP like the standard annuity formula", () => {
    const r = 0.01;
    expect(sipUnitValue(1, 12, r, 0)).toBeCloseTo(
      (Math.pow(1 + r, 12) - 1) / r,
      8,
    );
  });
});
