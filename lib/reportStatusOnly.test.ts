import { describe, expect, it } from "vitest";
import { deriveCtaCopy, derivePlanTeaser } from "@/lib/analyseResultModel";
import type { GoalFundingItem } from "@/lib/goalFunding";
import { goalSavingsLines } from "@/lib/goalSavingsText";
import { goalReachLine } from "@/lib/goalStrategies";
import type { PriorityItem } from "@/lib/priorityEngine";

/**
 * The report says where the user stands; how to fix it lives in the wealth
 * builder plan. These pin that the report's lines carry no fix.
 */
const item = {
  goalId: "home_purchase",
  targetYear: 2031,
  monthlyRequired: 40_000,
  monthlyAllocated: 0,
  existingMonthly: 10_000,
} as unknown as GoalFundingItem;

describe("report lines carry no fix", () => {
  it("goal savings: a gap, not what to invest", () => {
    const status = goalSavingsLines(item, { statusOnly: true });
    expect(status.at(-1)).toBe(
      "Short by ₹40,000/month at what goes to it today.",
    );
    expect(status.join(" ")).not.toMatch(/you'd need|new SIP/);
    expect(goalSavingsLines(item).at(-1)).toMatch(/To reach it by 2031/);
  });

  it("goal reach: no 'To make YEAR, invest' sentence", () => {
    const reach = {
      monthly: 10_000,
      onTime: false,
      reachYear: 2036,
      rows: [],
      target: 50_00_000,
      valueByTarget: 30_00_000,
      onTimeMonthly: 42_000,
    };
    const goal = { targetYear: 2031 };
    expect(goalReachLine(reach, goal)).toMatch(/To make 2031, invest ₹42,000/);
    const status = goalReachLine(reach, goal, { statusOnly: true });
    expect(status).toMatch(/you reach it in 2036 \(5 years late\)/);
    expect(status).not.toMatch(/To make|invest/);
    expect(
      goalReachLine({ ...reach, monthly: 0 }, goal, { statusOnly: true }),
    ).toBe("Nothing is going to this goal yet.");
  });

  it("the plan button is always 'Get my wealth builder plan'", () => {
    for (const score of [20, 55, 90]) {
      const cta = deriveCtaCopy({
        score,
        openCount: 3,
        topPriorityTitle: "Emergency fund",
        hasCriticalIssues: score < 30,
      });
      expect(cta.title).toBe("Get my wealth builder plan →");
      expect(cta.subText).toBe("3 gaps to fix, starting with Emergency fund");
    }
  });

  it("names the gaps without their actions", () => {
    const priorities = Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`,
      title: `Gap ${i + 1}`,
      gap: 1000,
      monthlyContribution: 500,
      actionThisWeek: "Open an account",
    })) as unknown as PriorityItem[];
    const t = derivePlanTeaser({ priorities });
    expect(t.openCount).toBe(8);
    expect(t.gapTitles).toEqual([
      "Gap 1",
      "Gap 2",
      "Gap 3",
      "Gap 4",
      "Gap 5",
      "Gap 6",
    ]);
  });
});
