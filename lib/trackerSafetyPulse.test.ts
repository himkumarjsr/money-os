import { describe, expect, it } from "vitest";
import {
  computeMonthSafetyPulse,
  previousCalendarMonth,
} from "./trackerSafetyPulse";

describe("trackerSafetyPulse", () => {
  it("previousCalendarMonth wraps year", () => {
    expect(previousCalendarMonth(0, 2026)).toEqual({
      monthIndex: 11,
      year: 2025,
      monthName: "December",
    });
  });

  it("marks over when spend exceeds income", () => {
    const pulse = computeMonthSafetyPulse({
      monthIndex: 6,
      year: 2026,
      asOf: new Date(2026, 6, 17),
      fallbackIncome: 0,
      currentTxns: [
        {
          amount: 100000,
          bucket: "income",
          category: "salary",
          subcategory: "salary",
        },
        {
          amount: 80000,
          bucket: "needs",
          category: "rent",
          subcategory: "rent",
        },
        {
          amount: 30000,
          bucket: "wants",
          category: "dining",
          subcategory: "dining",
        },
      ],
      previousTxns: [],
    });
    expect(pulse.status).toBe("over");
    expect(pulse.action).toBeTruthy();
    expect(pulse.current.totalSpent).toBe(110000);
  });

  it("marks tight when wants exceed 5% cap", () => {
    const pulse = computeMonthSafetyPulse({
      monthIndex: 6,
      year: 2026,
      asOf: new Date(2026, 6, 17),
      fallbackIncome: 100000,
      currentTxns: [
        {
          amount: 100000,
          bucket: "income",
          category: "salary",
          subcategory: "salary",
        },
        {
          amount: 20000,
          bucket: "needs",
          category: "rent",
          subcategory: "rent",
        },
        {
          amount: 9000,
          bucket: "wants",
          category: "dining",
          subcategory: "dining",
        },
      ],
      previousTxns: [
        {
          amount: 100000,
          bucket: "income",
          category: "salary",
          subcategory: "salary",
        },
        {
          amount: 20000,
          bucket: "needs",
          category: "rent",
          subcategory: "rent",
        },
        {
          amount: 2000,
          bucket: "wants",
          category: "dining",
          subcategory: "dining",
        },
      ],
    });
    expect(pulse.status).toBe("tight");
    expect(pulse.bucketHealth.find((b) => b.bucket === "wants")?.status).toBe(
      "over",
    );
    expect(pulse.movers[0]?.subId).toBe("dining");
    expect(pulse.action).toMatch(/Wants|Dining/i);
  });

  it("marks safe when within caps", () => {
    const pulse = computeMonthSafetyPulse({
      monthIndex: 6,
      year: 2026,
      asOf: new Date(2026, 6, 20),
      fallbackIncome: 100000,
      currentTxns: [
        {
          amount: 100000,
          bucket: "income",
          category: "salary",
          subcategory: "salary",
        },
        {
          amount: 20000,
          bucket: "needs",
          category: "rent",
          subcategory: "rent",
        },
        {
          amount: 3000,
          bucket: "wants",
          category: "coffee",
          subcategory: "coffee",
        },
        {
          amount: 15000,
          bucket: "investment",
          category: "sip",
          subcategory: "sip_mutual_fund",
        },
      ],
      previousTxns: null,
    });
    expect(pulse.status).toBe("safe");
    expect(pulse.dailySafeSpend).not.toBeNull();
    expect(pulse.dailySafeSpend!).toBeGreaterThan(0);
  });

  it("excludes loan_prepayment from all tracker maths", () => {
    const pulse = computeMonthSafetyPulse({
      monthIndex: 6,
      year: 2026,
      asOf: new Date(2026, 6, 20),
      fallbackIncome: 100000,
      currentTxns: [
        {
          amount: 100000,
          bucket: "income",
          category: "salary",
          subcategory: "salary",
        },
        {
          amount: 20000,
          bucket: "needs",
          category: "rent",
          subcategory: "rent",
        },
        {
          amount: 50000,
          bucket: "investment",
          category: "loan_prepayment",
          subcategory: "loan_prepayment",
        },
      ],
      previousTxns: [
        {
          amount: 100000,
          bucket: "income",
          category: "salary",
          subcategory: "salary",
        },
        {
          amount: 18000,
          bucket: "needs",
          category: "rent",
          subcategory: "rent",
        },
        {
          amount: 40000,
          bucket: "investment",
          category: "loan_prepayment",
          subcategory: "loan_prepayment",
        },
      ],
    });
    expect(pulse.current.totalSpent).toBe(20000);
    expect(pulse.current.bucketTotals.investment || 0).toBe(0);
    expect(pulse.previous?.totalSpent).toBe(18000);
    expect(pulse.movers.every((m) => m.subId !== "loan_prepayment")).toBe(true);
  });
});
