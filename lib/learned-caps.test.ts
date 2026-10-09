import { describe, expect, it } from "vitest";
import { learnCapsFromSpending } from "./learned-caps";
import { BUCKET_CAPS } from "./universal-buckets";

const month = (needs: number, wants: number, hasData = true) => ({
  needs,
  wants,
  hasData,
});

describe("learnCapsFromSpending", () => {
  it("lowers Needs to the 3-month average plus 10% and moves the rest to Investment", () => {
    // Income 2,66,667 → Needs cap 30% = 80,000; spending ~60,000.
    const income = 266667;
    const { caps, adjustments } = learnCapsFromSpending(BUCKET_CAPS, income, [
      month(60000, 13000),
      month(58000, 13000),
      month(62000, 13000),
    ]);
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0]).toMatchObject({
      key: "needs",
      fromPercent: 30,
      toPercent: 25,
    });
    expect(caps.needs).toBeCloseTo(0.25);
    expect(caps.investment).toBeCloseTo(0.3);
    const total = Object.values(caps).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1);
  });

  it("does nothing if any of the 3 months went over the budget", () => {
    const res = learnCapsFromSpending(BUCKET_CAPS, 100000, [
      month(20000, 1000),
      month(31000, 1000),
      month(20000, 1000),
    ]);
    expect(res.adjustments.filter((a) => a.key === "needs")).toHaveLength(0);
    expect(res.caps.needs).toBe(BUCKET_CAPS.needs);
  });

  it("needs three months with tracked data", () => {
    expect(
      learnCapsFromSpending(BUCKET_CAPS, 100000, [
        month(10000, 1000),
        month(10000, 1000),
      ]).adjustments,
    ).toEqual([]);
    expect(
      learnCapsFromSpending(BUCKET_CAPS, 100000, [
        month(10000, 1000),
        month(0, 0, false),
        month(10000, 1000),
      ]).adjustments,
    ).toEqual([]);
  });

  it("keeps the floors and never raises a budget", () => {
    const { caps } = learnCapsFromSpending(BUCKET_CAPS, 100000, [
      month(1000, 100),
      month(1000, 100),
      month(1000, 100),
    ]);
    expect(caps.needs).toBeCloseTo(0.1);
    expect(caps.wants).toBeCloseTo(0.05);
    expect(caps.investment).toBeCloseTo(0.45);
  });
});
