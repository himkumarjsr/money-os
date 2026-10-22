import { describe, expect, it } from "vitest";
import { buildAdvisorReview } from "./advisorReview";
import type { PriorityPlan } from "./priorityEngine";

const plan = (over: Partial<PriorityPlan> = {}) =>
  ({
    priorities: [
      {
        id: "emergency_fund",
        title: "Emergency fund",
        status: "complete",
        targetAmount: 300_000,
        monthlyContribution: 0,
        actionThisWeek: "Done",
        instrument: "Liquid fund",
      },
      {
        id: "medical_fund",
        title: "Medical emergency fund",
        status: "complete",
        targetAmount: 100_000,
        monthlyContribution: 0,
        actionThisWeek: "Done",
        instrument: "Liquid fund",
      },
    ],
    debts: [],
    goalFunding: undefined,
    ...over,
  }) as unknown as PriorityPlan;

describe("buildAdvisorReview", () => {
  it("flags cash beyond both safety funds as idle", () => {
    const r = buildAdvisorReview({ savingsAccountBalance: 600_000 }, plan());
    const idle = r.fixes.find((f) => f.id === "idle_cash");
    expect(idle?.detail).toContain("₹2,00,000");
  });

  it("clears costly debt with spare savings before calling cash idle", () => {
    const r = buildAdvisorReview(
      { savingsAccountBalance: 600_000 },
      plan({
        debts: [
          {
            type: "Credit card",
            outstanding: 150_000,
            emi: 0,
            rate: 36,
            priorityRank: 1,
            extraEMIRecommended: 0,
            monthsToClearWithExtra: 0,
            icon: "",
          },
        ],
      }),
    );
    expect(r.fixes[0]?.id).toBe("costly_debt");
    expect(r.fixes[0]?.detail).toContain("₹1,50,000");
    expect(r.fixes.find((f) => f.id === "idle_cash")?.detail).toContain(
      "₹50,000",
    );
    expect(r.thisWeek.some((t) => t.includes("credit card"))).toBe(true);
  });

  it("flags an FD earning no more than inflation", () => {
    const r = buildAdvisorReview({ fdValue: 500_000, fdRate: 5.5 }, plan());
    expect(r.fixes.some((f) => f.id === "fd_below_inflation")).toBe(true);
  });

  it("lists monthly steps and yearly habits", () => {
    const r = buildAdvisorReview(
      { annualSalaryIncreasePct: 8, monthlySIP: 5_000, mfValue: 100_000 },
      plan({
        priorities: [
          {
            id: "goal_retirement",
            title: "Retirement",
            status: "missing",
            targetAmount: 1,
            monthlyContribution: 12_000,
            startMonth: 1,
            actionThisWeek: "Start",
            instrument: "Index fund",
          },
        ] as unknown as PriorityPlan["priorities"],
      }),
    );
    expect(r.monthly[0]).toBe("₹12,000/month → Retirement (Index fund)");
    expect(r.monthly[1]).toContain("₹5,000/month running SIPs");
    expect(r.yearly[0]).toContain("8%");
    expect(r.yearly.some((y) => y.includes("₹1.25L"))).toBe(true);
    expect(r.thisWeek).toEqual(["Start"]);
  });
});
