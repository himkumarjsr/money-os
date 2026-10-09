import { describe, expect, it } from "vitest";
import {
  buildSmartBudget,
  learnCapsFromSpending,
  monthSpendFromRows,
  sameSmartBudget,
} from "./learned-caps";
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

describe("Analyse floor", () => {
  it("keeps Needs at or above the monthly needs from the Analyse form", () => {
    // Cap 30,000; tracked ~12,000, but the form spreads yearly fees to 20,000.
    const res = learnCapsFromSpending(
      BUCKET_CAPS,
      100000,
      [month(12000, 1000), month(12000, 1000), month(12000, 1000)],
      { needs: 20000 },
    );
    expect(res.adjustments[0]).toMatchObject({ key: "needs", toPercent: 20 });
  });
});

describe("monthSpendFromRows", () => {
  const row = (bucket: string, amount: number) => ({
    bucket,
    amount,
    category: "grocery",
    subcategory: "grocery",
    payment_method: "upi",
  });

  it("treats a month with fewer than 5 spending entries as no data", () => {
    const rows = [row("needs", 500), row("needs", 500), row("income", 90000)];
    expect(monthSpendFromRows(rows).hasData).toBe(false);
  });

  it("sums Needs and Wants and counts only spending rows", () => {
    const rows = [
      row("needs", 1000),
      row("needs", 2000),
      row("wants", 300),
      row("wants", 200),
      row("security", 400),
      row("income", 90000),
    ];
    expect(monthSpendFromRows(rows)).toEqual({
      needs: 3000,
      wants: 500,
      hasData: true,
    });
  });
});

describe("buildSmartBudget / sameSmartBudget", () => {
  const learned = learnCapsFromSpending(BUCKET_CAPS, 100000, [
    month(15000, 1000),
    month(15000, 1000),
    month(15000, 1000),
  ]);

  it("returns null when nothing was learned", () => {
    expect(
      buildSmartBudget(
        BUCKET_CAPS,
        { caps: BUCKET_CAPS, adjustments: [] },
        null,
      ),
    ).toBeNull();
  });

  it("keeps the user's on/off choice and ignores the timestamp when comparing", () => {
    const off = buildSmartBudget(BUCKET_CAPS, learned, null, false)!;
    expect(off.enabled).toBe(false);
    const again = buildSmartBudget(BUCKET_CAPS, learned, off)!;
    expect(again.enabled).toBe(false);
    expect(sameSmartBudget(off, { ...again, computedAt: "later" })).toBe(true);
    expect(sameSmartBudget(off, { ...off, enabled: true })).toBe(false);
    expect(sameSmartBudget(null, undefined)).toBe(true);
  });
});
