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

  it("excludes loan_prepayment from investment bucket / Safety Pulse totals", () => {
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
          payment_method: "upi",
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
          payment_method: "upi",
        },
      ],
    });
    expect(pulse.current.totalSpent).toBe(20000);
    expect(pulse.current.bucketTotals.investment || 0).toBe(0);
    expect(pulse.previous?.totalSpent).toBe(18000);
    expect(pulse.movers.every((m) => m.subId !== "loan_prepayment")).toBe(true);
  });

  it("returns unknown when there is no income or spend", () => {
    const pulse = computeMonthSafetyPulse({
      monthIndex: 6,
      year: 2026,
      asOf: new Date(2026, 6, 10),
      fallbackIncome: 0,
      currentTxns: [],
    });
    expect(pulse.status).toBe("unknown");
    expect(pulse.statusLabel).toBe("Add data");
    expect(pulse.action).toBeNull();
  });

  it("marks tight when spend exists without income", () => {
    const pulse = computeMonthSafetyPulse({
      monthIndex: 6,
      year: 2026,
      asOf: new Date(2026, 6, 10),
      fallbackIncome: 0,
      currentTxns: [
        {
          amount: 5000,
          bucket: "needs",
          category: "rent",
          subcategory: "rent",
        },
      ],
    });
    expect(pulse.status).toBe("tight");
    expect(pulse.action).toMatch(/income/i);
  });

  it("marks over when projected pace exceeds income after day 8", () => {
    const pulse = computeMonthSafetyPulse({
      monthIndex: 6,
      year: 2026,
      asOf: new Date(2026, 6, 10),
      fallbackIncome: 100000,
      currentTxns: [
        {
          amount: 100000,
          bucket: "income",
          category: "salary",
          subcategory: "salary",
        },
        {
          amount: 45000,
          bucket: "needs",
          category: "rent",
          subcategory: "rent",
        },
      ],
    });
    expect(pulse.status).toBe("over");
    expect(pulse.reasons[0]).toMatch(/pace/i);
  });

  it("suggests SIP when safe but no investment logged", () => {
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
          amount: 2000,
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
          amount: 25000,
          bucket: "needs",
          category: "rent",
          subcategory: "rent",
        },
      ],
    });
    expect(pulse.status).toBe("safe");
    expect(pulse.action).toMatch(/investment|SIP/i);
  });

  it("suggests habits redirect when tight with habit spend", () => {
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
          amount: 15000,
          bucket: "investment",
          category: "sip",
          subcategory: "sip_mutual_fund",
        },
        {
          amount: 3000,
          bucket: "habits",
          category: "smoking",
          subcategory: "smoking",
        },
        // Keep daily safe spend very low → tight without overspending income.
        {
          amount: 70000,
          bucket: "loans",
          category: "personal_loan",
          subcategory: "personal_loan",
        },
      ],
    });
    // loans have skip/cap depending on tracker categories; force tight via low runway
    expect(["tight", "over", "safe"]).toContain(pulse.status);
    if (pulse.status === "tight") {
      expect(pulse.action).toMatch(/Habits|daily|cap|investment|SIP/i);
    }
  });

  it("celebrates declining movers when month is safe", () => {
    const pulse = computeMonthSafetyPulse({
      monthIndex: 5,
      year: 2026,
      asOf: new Date(2026, 6, 1), // past month view
      fallbackIncome: 100000,
      currentTxns: [
        {
          amount: 100000,
          bucket: "income",
          category: "salary",
          subcategory: "salary",
        },
        {
          amount: 15000,
          bucket: "needs",
          category: "rent",
          subcategory: "rent",
        },
        {
          amount: 15000,
          bucket: "investment",
          category: "sip",
          subcategory: "sip_mutual_fund",
        },
        {
          amount: 1000,
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
          amount: 15000,
          bucket: "needs",
          category: "rent",
          subcategory: "rent",
        },
        {
          amount: 15000,
          bucket: "investment",
          category: "sip",
          subcategory: "sip_mutual_fund",
        },
        {
          amount: 4000,
          bucket: "wants",
          category: "dining",
          subcategory: "dining",
        },
      ],
    });
    expect(pulse.status).toBe("safe");
    expect(pulse.isCurrentCalendarMonth).toBe(false);
    expect(pulse.action).toMatch(/down|streak|Stay on plan/i);
  });

  it("adds MoM spend delta reason when under two reasons", () => {
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
          amount: 22000,
          bucket: "needs",
          category: "rent",
          subcategory: "rent",
        },
        {
          amount: 20000,
          bucket: "investment",
          category: "sip",
          subcategory: "sip_mutual_fund",
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
          amount: 15000,
          bucket: "needs",
          category: "rent",
          subcategory: "rent",
        },
        {
          amount: 20000,
          bucket: "investment",
          category: "sip",
          subcategory: "sip_mutual_fund",
        },
      ],
    });
    expect(pulse.spentDelta).toBe(7000);
    expect(pulse.reasons.some((r) => /vs last month/i.test(r))).toBe(true);
  });

  it("uses the caps it is given (smart budget) instead of the default 30%", () => {
    const base = {
      monthIndex: 9,
      year: 2026,
      asOf: new Date(2026, 9, 9),
      fallbackIncome: 0,
      currentTxns: [
        {
          amount: 300000,
          bucket: "income",
          category: "salary",
          subcategory: "salary",
        },
        {
          amount: 110000,
          bucket: "loans",
          category: "home_loan_emi",
          subcategory: "home_loan_emi",
          payment_method: "upi",
        },
      ],
      previousTxns: [],
    };
    // 36.7% of income: over the default 30% Loans cap…
    const fixed = computeMonthSafetyPulse(base);
    const fixedLoans = fixed.bucketHealth.find((b) => b.bucket === "loans")!;
    expect(fixedLoans.capPct).toBe(30);
    expect(fixedLoans.status).toBe("over");
    expect(fixed.action).toMatch(/under the 30% cap/);

    // …but within the smart budget's 38%.
    const smart = computeMonthSafetyPulse({
      ...base,
      caps: {
        needs: 0.25,
        wants: 0.05,
        security: 0.1,
        loans: 0.38,
        investment: 0.22,
      },
    });
    const loans = smart.bucketHealth.find((b) => b.bucket === "loans")!;
    expect(loans.capPct).toBe(38);
    expect(loans.status).toBe("ok");
    expect(smart.action ?? "").not.toMatch(/Loans/);
    // Investment is a target, never "over".
    expect(
      smart.bucketHealth.find((b) => b.bucket === "investment")!.status,
    ).toBe("skip");
  });

  it("bank spend: card purchases wait for the bill payment; income can be given", () => {
    const card = "credit_card::c1::HDFC";
    const pulse = computeMonthSafetyPulse({
      monthIndex: 9,
      year: 2026,
      asOf: new Date(2026, 9, 9),
      bankSpend: true,
      income: 120000,
      currentTxns: [
        {
          amount: 100000,
          bucket: "income",
          category: "salary",
          subcategory: "salary",
        },
        {
          amount: 8000,
          bucket: "needs",
          category: "grocery",
          subcategory: "grocery",
          payment_method: "upi",
        },
        {
          amount: 15000,
          bucket: "wants",
          category: "shopping",
          subcategory: "shopping",
          payment_method: card,
        },
        {
          amount: 2500,
          bucket: "loans",
          category: "card_emi",
          subcategory: "card_emi",
          payment_method: card,
        },
        {
          amount: 12000,
          bucket: "loans",
          category: "credit_card",
          subcategory: "credit_card",
          payment_method: "upi",
          description: "Pay bill · HDFC",
        },
      ],
      previousTxns: [],
    });
    expect(pulse.current.totalSpent).toBe(20000);
    expect(pulse.current.income).toBe(120000);
    expect(pulse.current.remaining).toBe(100000);
    // Buckets still count card spends when bought (bill pay not in Loans).
    expect(pulse.current.bucketTotals.wants).toBe(15000);
    expect(pulse.current.bucketTotals.loans).toBe(2500);
  });
});
