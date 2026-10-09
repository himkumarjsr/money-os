import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCashAudit, logCashAudit, reasonLabel } from "./trackerCashAudit";

describe("reasonLabel", () => {
  it("covers every audit reason", () => {
    expect(reasonLabel("income")).toMatch(/Income/);
    expect(reasonLabel("included")).toMatch(/purple SPENT/);
    expect(reasonLabel("included_loan_emi")).toMatch(/loan EMI/);
    expect(reasonLabel("included_loan_repayment")).toMatch(/loan repayment/);
    expect(reasonLabel("included_card")).toMatch(/credit card/);
    expect(reasonLabel("card_refund")).toMatch(/refund/);
    expect(reasonLabel("cc_bill_pay")).toMatch(/Excluded — credit card bill/);
    expect(reasonLabel("cc_emi_purchase")).toMatch(/EMI/);
    expect(reasonLabel("invalid_amount")).toMatch(/invalid/);
  });
});

describe("buildCashAudit", () => {
  it("includes card purchases, loan EMI + loan repayment; excludes CC bill pays", () => {
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
    // Card spend counts when made; the bill payment only settles it.
    expect(audit.purpleSpent).toBe(21000);
    expect(audit.onCards).toBe(2000);
    expect(audit.left).toBe(79000);
    expect(audit.included).toHaveLength(4);
    expect(audit.excluded.map((e) => e.reason)).toEqual(["cc_bill_pay"]);
  });

  it("prefers logged income and classifies edge rows", () => {
    const audit = buildCashAudit({
      profileMonthlyIncome: 50000,
      transactions: [
        {
          bucket: "income",
          amount: 80000,
          description: "Salary",
        },
        {
          amount: 0,
          bucket: "needs",
          description: "zero",
        },
        {
          amount: "NaN" as unknown as number,
          bucket: "needs",
        },
        {
          id: "emi",
          amount: 4000,
          bucket: "needs",
          subcategory: "personal_loan",
          payment_method: "upi",
        },
        {
          amount: 2000,
          bucket: "investment",
          subcategory: "loan_repayment",
          payment_method: "upi",
          description: "  ",
          date: null,
        },
        {
          amount: 1500,
          bucket: "needs",
          category: "bnpl",
          payment_method: "cash",
        },
      ],
    });

    expect(audit.incomeSource).toBe("logged");
    expect(audit.incomeUsed).toBe(80000);
    expect(audit.included.some((l) => l.reason === "included_loan_emi")).toBe(
      true,
    );
    expect(
      audit.included.some((l) => l.reason === "included_loan_repayment"),
    ).toBe(true);
    expect(
      audit.included.find((l) => l.description === "(no description)"),
    ).toBeTruthy();
  });

  it("uses none income source when nothing logged or profiled", () => {
    const audit = buildCashAudit({
      transactions: [{ amount: 100, bucket: "needs", payment_method: "upi" }],
    });
    expect(audit.incomeSource).toBe("none");
    expect(audit.incomeUsed).toBe(0);
    expect(audit.left).toBe(-100);
  });
});

describe("logCashAudit", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints included and excluded tables", () => {
    const group = vi.spyOn(console, "group").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const table = vi.spyOn(console, "table").mockImplementation(() => {});
    const groupEnd = vi.spyOn(console, "groupEnd").mockImplementation(() => {});

    const audit = buildCashAudit({
      profileMonthlyIncome: 1000,
      transactions: [
        {
          amount: 100,
          bucket: "needs",
          payment_method: "upi",
          description: "Tea",
        },
        {
          amount: 200,
          bucket: "wants",
          payment_method: "credit_card::x::Y",
          description: "Card",
        },
        {
          amount: 200,
          bucket: "loans",
          subcategory: "credit_card",
          payment_method: "upi",
          description: "Pay bill · Y",
        },
      ],
    });

    logCashAudit(audit, "Test");
    expect(group).toHaveBeenCalled();
    expect(table).toHaveBeenCalledTimes(2);
    expect(groupEnd).toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
  });

  it("skips excluded table when empty", () => {
    const table = vi.spyOn(console, "table").mockImplementation(() => {});
    vi.spyOn(console, "group").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "groupEnd").mockImplementation(() => {});

    logCashAudit(
      buildCashAudit({
        profileMonthlyIncome: 1000,
        transactions: [{ amount: 50, bucket: "needs", payment_method: "upi" }],
      }),
    );
    expect(table).toHaveBeenCalledTimes(1);
  });
});
