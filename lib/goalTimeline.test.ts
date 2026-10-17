import { describe, expect, it } from "vitest";
import { goalTimeline } from "@/lib/goalTimeline";

describe("goalTimeline", () => {
  const now = new Date(2026, 9, 17);

  it("lists every year up to the goal year", () => {
    const t = goalTimeline(
      { yearsToGoal: 5, monthlyRequired: 44_599, monthlyAllocated: 31_949 },
      now,
    );
    expect(t?.rows.map((r) => r.year)).toEqual([2027, 2028, 2029, 2030, 2031]);
    expect(t?.rows[0].invested).toBe(31_949 * 12);
    const last = t!.rows[4];
    expect(last.expected).toBeGreaterThan(last.invested);
    expect(last.needed).toBeGreaterThan(last.expected);
  });

  it("has nothing to show without a monthly amount", () => {
    expect(
      goalTimeline(
        { yearsToGoal: 5, monthlyRequired: 0, monthlyAllocated: 0 },
        now,
      ),
    ).toBeNull();
  });
});
