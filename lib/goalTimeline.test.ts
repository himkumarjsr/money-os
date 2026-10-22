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
    // Rupees paid in vs their value in today's rupees: a 5-year mix just beats inflation.
    expect(last.expected).toBeGreaterThan(last.invested / Math.pow(1.06, 5));
    expect(last.needed).toBeGreaterThan(last.expected);
  });

  it("raises the SIP each year by the plan's step-up", () => {
    const t = goalTimeline(
      {
        yearsToGoal: 2,
        monthlyRequired: 10_000,
        monthlyAllocated: 10_000,
        stepUp: 0.1,
      },
      now,
    );
    expect(t?.rows[1].invested).toBe(10_000 * 12 + 11_000 * 12);
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
