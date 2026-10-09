import { describe, expect, it } from "vitest";
import { buildMonthSummaryRows, monthSummaryCaps } from "./trackerMonthSummary";

describe("monthSummaryCaps", () => {
  it("uses the generic split without Analyse", () => {
    expect(monthSummaryCaps(null)).toEqual({
      needs: 30,
      wants: 5,
      security: 10,
      loans: 30,
      investment: 25,
    });
  });

  it("uses the user's own split once Analyse is done", () => {
    const caps = monthSummaryCaps({
      lifeStage: "bachelor",
      selfAge: 25,
      monthlySalary: 100000,
    });
    expect(caps.investment).toBe(28);
    expect(caps.security).toBe(7);
  });

  it("includes an active smart budget", () => {
    const base = monthSummaryCaps({
      lifeStage: "married",
      monthlySalary: 100000,
    });
    const baseCaps = {
      needs: base.needs / 100,
      wants: base.wants / 100,
      security: base.security / 100,
      loans: base.loans / 100,
      investment: base.investment / 100,
    };
    const caps = monthSummaryCaps({
      lifeStage: "married",
      monthlySalary: 100000,
      smartBudget: {
        baseCaps,
        caps: { ...baseCaps, needs: 0.25, investment: 0.3 },
        adjustments: [
          {
            key: "needs",
            fromPercent: 30,
            toPercent: 25,
            averageSpend: 20000,
            movedToInvestment: 5000,
          },
        ],
        enabled: true,
        computedAt: "2026-10-01",
      },
    });
    expect(caps.needs).toBe(25);
    expect(caps.investment).toBe(30);
  });
});

describe("buildMonthSummaryRows", () => {
  const caps = monthSummaryCaps(null);

  it("judges budgets against income", () => {
    const rows = buildMonthSummaryRows({
      bucketTotals: { needs: 35000, wants: 4000 },
      totalSpent: 39000,
      income: 100000,
      caps,
    });
    const needs = rows.find((r) => r.key === "needs")!;
    expect(needs.over).toBe(true);
    expect(needs.budgetAmount).toBe(30000);
    expect(rows.find((r) => r.key === "wants")!.over).toBe(false);
    expect(rows.some((r) => r.key === "income")).toBe(false);
  });

  it("never marks investment over its target", () => {
    const rows = buildMonthSummaryRows({
      bucketTotals: { investment: 60000 },
      totalSpent: 60000,
      income: 100000,
      caps,
    });
    const inv = rows.find((r) => r.key === "investment")!;
    expect(inv.isTarget).toBe(true);
    expect(inv.over).toBe(false);
    expect(inv.fillPct).toBe(100);
  });

  it("falls back to share of spend when no income is known", () => {
    const rows = buildMonthSummaryRows({
      bucketTotals: { needs: 50, wants: 50 },
      totalSpent: 100,
      income: 0,
      caps,
    });
    expect(rows.find((r) => r.key === "needs")!.over).toBe(true);
    expect(rows.find((r) => r.key === "wants")!.over).toBe(true);
  });
});
