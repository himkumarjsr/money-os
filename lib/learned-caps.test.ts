import { describe, expect, it } from "vitest";
import {
  buildSmartBudget,
  learnCapsFromSpending,
  monthSpendFromRows,
  sameSmartBudget,
} from "./learned-caps";
import { BUCKET_CAPS } from "./universal-buckets";

const month = (needs: number, wants: number, hasData = true, loans = 0) => ({
  needs,
  wants,
  loans,
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
      loans: 0,
      hasData: true,
    });
  });

  it("counts card purchases and refunds; loans = fixed EMIs incl. card EMIs", () => {
    const card = "credit_card::c1::HDFC";
    const rows = [
      row("needs", 1000),
      { ...row("needs", 2000), payment_method: card },
      { ...row("wants", 900), payment_method: card },
      {
        bucket: "wants",
        amount: 400,
        category: "card_refund",
        subcategory: "card_refund",
        payment_method: card,
      },
      {
        bucket: "loans",
        amount: 15000,
        category: "home_loan_emi",
        subcategory: "home_loan_emi",
        payment_method: "upi",
      },
      // Bill payment: settles spends already counted.
      {
        bucket: "loans",
        amount: 9000,
        category: "credit_card",
        subcategory: "credit_card",
        payment_method: "upi",
      },
      // Generated rows from the card ledger.
      {
        id: "virtual:emi:p1:1",
        bucket: "loans",
        amount: 2500,
        category: "card_emi",
        subcategory: "card_emi",
        payment_method: card,
      },
      {
        id: "virtual:card-extra:x",
        bucket: "loans",
        amount: 700,
        category: "card_extra",
        subcategory: "card_extra",
        payment_method: "upi",
      },
      {
        id: "virtual:card-overdue:c1",
        bucket: "loans",
        amount: 7707,
        category: "card_overdue",
        subcategory: "card_overdue",
        payment_method: null,
      },
    ];
    expect(monthSpendFromRows(rows)).toEqual({
      needs: 3000,
      wants: 500,
      loans: 17500,
      hasData: true,
    });
  });

  it("does not count generated rows as logged entries", () => {
    const emi = (k: number) => ({
      id: `virtual:emi:p:${k}`,
      bucket: "loans",
      amount: 1000,
      category: "card_emi",
      subcategory: "card_emi",
      payment_method: "credit_card::c1::HDFC",
    });
    const rows = [row("needs", 100), emi(1), emi(2), emi(3), emi(4)];
    expect(monthSpendFromRows(rows).hasData).toBe(false);
  });
});

describe("Loans raised for fixed EMIs (up to 40%)", () => {
  const income = 100000;

  it("gives freed points to Loans first, the rest to Investment", () => {
    // Needs cap 30k, spend 15k → Needs to 17%, 13 points freed.
    // Loans cap 30k; fixed EMIs 35–36k every month → Loans needs 35%.
    const res = learnCapsFromSpending(BUCKET_CAPS, income, [
      month(15000, 5000, true, 36000),
      month(15000, 5000, true, 35000),
      month(15000, 5000, true, 35500),
    ]);
    const needs = res.adjustments.find((a) => a.key === "needs")!;
    const loans = res.adjustments.find((a) => a.key === "loans")!;
    expect(needs).toMatchObject({ fromPercent: 30, toPercent: 17 });
    expect(loans).toMatchObject({
      fromPercent: 30,
      toPercent: 35,
      movedToInvestment: 0,
    });
    expect(needs.movedToLoans).toBeCloseTo(5000);
    expect(needs.movedToInvestment).toBeCloseTo(8000);
    expect(res.caps.loans).toBeCloseTo(0.35);
    expect(res.caps.investment).toBeCloseTo(0.33);
    expect(res.caps.security).toBeCloseTo(BUCKET_CAPS.security);
    const total = Object.values(res.caps).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1);
  });

  it("stops at the 40% ceiling; anything above stays over budget", () => {
    const res = learnCapsFromSpending(BUCKET_CAPS, income, [
      month(1000, 100, true, 55000),
      month(1000, 100, true, 55000),
      month(1000, 100, true, 55000),
    ]);
    expect(res.caps.loans).toBeCloseTo(0.4);
    // Needs 30→10 and Wants 5→5: 20 freed, 10 to Loans, 10 to Investment.
    expect(res.caps.investment).toBeCloseTo(0.35);
  });

  it("only uses freed points — Investment never goes down", () => {
    // Needs freed just 2 points (30 → 28); Loans wanted 40.
    const res = learnCapsFromSpending(BUCKET_CAPS, income, [
      month(25000, 5000, true, 45000),
      month(25000, 5000, true, 45000),
      month(25000, 5000, true, 45000),
    ]);
    expect(res.caps.needs).toBeCloseTo(0.28);
    expect(res.caps.loans).toBeCloseTo(0.32);
    expect(res.caps.investment).toBeCloseTo(BUCKET_CAPS.investment);
  });

  it("keeps Investment at its 15% floor", () => {
    const caps = {
      needs: 0.4,
      wants: 0.05,
      security: 0.1,
      loans: 0.32,
      investment: 0.13,
    };
    // Needs 40 → 37 frees 3 points; Investment tops up to 15 first.
    const res = learnCapsFromSpending(caps, income, [
      month(33000, 5000, true, 40000),
      month(33000, 5000, true, 40000),
      month(33000, 5000, true, 40000),
    ]);
    expect(res.caps.needs).toBeCloseTo(0.37);
    expect(res.caps.investment).toBeCloseTo(0.15);
    expect(res.caps.loans).toBeCloseTo(0.33);
  });

  it("does not raise Loans unless EMIs were over budget in all 3 months", () => {
    const res = learnCapsFromSpending(BUCKET_CAPS, income, [
      month(15000, 5000, true, 36000),
      month(15000, 5000, true, 20000),
      month(15000, 5000, true, 36000),
    ]);
    expect(res.adjustments.some((a) => a.key === "loans")).toBe(false);
    expect(res.caps.loans).toBeCloseTo(BUCKET_CAPS.loans);
  });

  it("does not raise Loans when nothing is freed", () => {
    const res = learnCapsFromSpending(BUCKET_CAPS, income, [
      month(31000, 5000, true, 36000),
      month(31000, 5000, true, 36000),
      month(31000, 5000, true, 36000),
    ]);
    expect(res.adjustments).toEqual([]);
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
