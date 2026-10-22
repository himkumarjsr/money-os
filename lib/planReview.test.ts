import { describe, expect, it } from "vitest";
import type { FinancialProfile } from "./analyse-form-schema";
import {
  applyPlanReview,
  buildPlanReview,
  monthsSincePlanReview,
  planReviewDue,
} from "./planReview";
import type { NatureKey, NatureReport } from "./trackerNatureReport";

const NOW = new Date(2026, 9, 22);

const profile = (over: Partial<FinancialProfile> = {}) =>
  ({
    lifeStage: "bachelor",
    selfAge: 30,
    cityTier: "metro",
    monthlySalary: 1_00_000,
    rentAmount: 20_000,
    foodTotal: 10_000,
    utilityTotal: 4_000,
    transportTotal: 6_000,
    lifestyleTotal: 10_000,
    monthlySIP: 20_000,
    planReviewedAt: new Date(2025, 9, 1).toISOString(),
    ...over,
  }) as FinancialProfile;

/** A Money Map with `count` finished months of the same figures. */
function report(
  figures: Partial<Record<NatureKey, number>> & { income: number },
  count = 4,
): NatureReport {
  const months = Array.from({ length: count + 1 }, (_, i) => ({
    year: 2026,
    monthIndex: 5 + i,
    key: `2026-0${6 + i}`,
    name: "",
    short: "",
    hasData: true,
    // The last month is this one, not over yet.
    partial: i === count,
    income: figures.income,
  }));
  const keys: NatureKey[] = [
    "needs",
    "wants",
    "habits",
    "security",
    "loans",
    "investment",
  ];
  return {
    months,
    rows: keys.map((key) => ({
      key,
      label: key,
      amounts: months.map((m) => (m.partial ? 1 : (figures[key] ?? 0))),
      shares: [],
      changePct: [],
      trend: "flat",
      delta: 0,
      deltaPct: null,
      goodWhenUp: false,
      inTotal: true,
      subcategories: [],
    })),
    totals: [],
    latestIndex: count,
    prevIndex: count - 1,
    biggestMover: null,
    insights: [],
    possibleSaving: null,
    suggestedAction: null,
  };
}

describe("when the yearly check is due", () => {
  it("is due 12 months after the plan, not before", () => {
    expect(monthsSincePlanReview(profile(), NOW)).toBe(12);
    expect(planReviewDue(profile(), NOW)).toBe(true);
    expect(
      planReviewDue(
        profile({ planReviewedAt: new Date(2026, 0, 5).toISOString() }),
        NOW,
      ),
    ).toBe(false);
  });
  it("is never due for a plan with no date", () => {
    expect(planReviewDue(profile({ planReviewedAt: undefined }), NOW)).toBe(
      false,
    );
  });
});

describe("buildPlanReview", () => {
  it("needs 3 finished Tracker months", () => {
    expect(
      buildPlanReview(profile(), report({ income: 1_00_000 }, 2), NOW),
    ).toBeNull();
    expect(buildPlanReview(profile(), null, NOW)).toBeNull();
  });

  it("leaves a plan that still fits alone", () => {
    const r = buildPlanReview(
      profile(),
      report({
        income: 1_02_000,
        needs: 41_000,
        wants: 9_000,
        habits: 1_500,
        investment: 20_000,
      }),
      NOW,
    )!;
    expect(r.basedOnMonths).toBe(4);
    expect(r.patch).toEqual({});
    expect(r.lines.every((l) => !l.changes)).toBe(true);
  });

  it("moves the plan to what the Tracker shows: a raise, dearer bills, more wants", () => {
    const r = buildPlanReview(
      profile(),
      report({
        income: 1_15_000,
        needs: 50_000,
        wants: 12_000,
        habits: 3_000,
        investment: 15_000,
      }),
      NOW,
    )!;
    // The raise goes to the salary.
    expect(r.patch.monthlySalary).toBe(1_15_000);
    // Needs: ₹40k planned (rent 20k fixed), ₹10k more spread over food, bills, travel.
    expect(
      (r.patch.foodTotal ?? 0) +
        (r.patch.utilityTotal ?? 0) +
        (r.patch.transportTotal ?? 0),
    ).toBe(30_000);
    expect(r.patch.foodTotal).toBe(15_000);
    expect(r.patch.lifestyleTotal).toBe(15_000);
    expect(r.lines.find((l) => l.key === "investing")?.text).toMatch(
      /₹5,000 less/,
    );
  });

  it("dates the check, with or without the new numbers", () => {
    const p = profile();
    const r = buildPlanReview(p, report({ income: 1_30_000 }), NOW)!;
    const updated = applyPlanReview(p, r, NOW);
    expect(updated.monthlySalary).toBe(1_30_000);
    expect(updated.planReviewedAt).toBe(NOW.toISOString());
    expect(planReviewDue(updated, NOW)).toBe(false);
    const kept = applyPlanReview(p, null, NOW);
    expect(kept.monthlySalary).toBe(1_00_000);
    expect(kept.planReviewedAt).toBe(NOW.toISOString());
  });
});
