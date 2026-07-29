import { describe, expect, it } from "vitest";
import { buildCashAudit } from "./trackerCashAudit";

describe("buildCashAudit", () => {
  it("includes loan EMI + CC bill pay + loan repayment; excludes only CC purchases", () => {
    const audit = buildCashAudit({
      profileMonthlyIncome: 100000,
      transactions: [
        {
          id: "1",
          date: "2026-07-01",
          amount: 1000,
          bucket: "needs",
          payment_method: "upi",
          description: "Groceries",
        },
        {
          id: "2",
          date: "2026-07-02",
          amount: 2000,
          bucket: "wants",
          payment_method: "credit_card::c1::HDFC",
          description: "Amazon",
        },
        {
          id: "3",
          date: "2026-07-03",
          amount: 5000,
          bucket: "loans",
          subcategory: "credit_card",
          payment_method: "upi",
          description: "Pay bill · HDFC [#c1]",
        },
        {
          id: "4",
          date: "2026-07-04",
          amount: 15000,
          bucket: "loans",
          subcategory: "home_loan_emi",
          payment_method: "upi",
          description: "HDFC Home EMI",
        },
        {
          id: "5",
          date: "2026-07-05",
          amount: 3000,
          bucket: "investment",
          subcategory: "loan_prepayment",
          payment_method: "upi",
          description: "Extra loan repayment",
        },
      ],
    });

    expect(audit.incomeUsed).toBe(100000);
    expect(audit.incomeSource).toBe("profile");
    // groceries + bill pay + home EMI + loan repayment
    expect(audit.purpleSpent).toBe(24000);
    expect(audit.onCards).toBe(2000);
    expect(audit.left).toBe(76000);
    expect(audit.included).toHaveLength(4);
    expect(audit.excluded.map((e) => e.reason)).toEqual(["cc_purchase"]);
  });
});
