import { describe, expect, it } from "vitest";
import { applyCardBillCoverage, type CardLedgerTxn } from "./trackerCardLedger";
import { sumTrackerTotals } from "./tracker-categories";
import { buildNatureReport, natureTrend } from "./trackerNatureReport";

const CARD = "credit_card::c1::HDFC";
let seq = 0;
const txn = (
  date: string,
  amount: number,
  bucket: string,
  subcategory: string,
  extra: Partial<CardLedgerTxn> = {},
) =>
  ({
    id: `t${++seq}`,
    date,
    amount,
    bucket,
    category: subcategory,
    subcategory,
    description: null,
    payment_method: "upi",
    ...extra,
  }) as CardLedgerTxn;
const salary = (date: string, amount = 100000) =>
  txn(date, amount, "income", "salary", { description: "Salary" });
const cardSpend = (date: string, amount: number, bucket: string, sub: string) =>
  txn(date, amount, bucket, sub, { payment_method: CARD });
const billPay = (date: string, amount: number) =>
  txn(date, amount, "loans", "credit_card", {
    description: "Pay bill · HDFC",
  });

const NOW = new Date(2026, 9, 31); // 31 Oct 2026: October is over.
const END = { endYear: 2026, endMonthIndex: 9, now: NOW };

const fixture = (): CardLedgerTxn[] => [
  // August
  salary("2026-08-01"),
  txn("2026-08-03", 20000, "needs", "rent"),
  txn("2026-08-10", 3000, "wants", "dining"),
  txn("2026-08-12", 1000, "habits", "cigarettes"),
  txn("2026-08-20", 5000, "investment", "sip"),
  // September
  salary("2026-09-01"),
  txn("2026-09-03", 20000, "needs", "rent"),
  txn("2026-09-10", 4000, "wants", "dining"),
  cardSpend("2026-09-15", 6000, "wants", "shopping"),
  txn("2026-09-12", 1000, "habits", "cigarettes"),
  txn("2026-09-20", 5000, "investment", "sip"),
  txn("2026-09-25", 2000, "security", "health_insurance"),
  // October: bill 10000 = Sep card spend (6000) + Oct card groceries (3000) + 1000 extra
  salary("2026-10-01"),
  txn("2026-10-03", 20000, "needs", "rent"),
  txn("2026-10-10", 6000, "wants", "dining"),
  billPay("2026-10-18", 10000),
  cardSpend("2026-10-05", 3000, "needs", "groceries"),
  txn("2026-10-12", 2000, "habits", "cigarettes"),
  txn("2026-10-20", 3000, "investment", "sip"),
  txn("2026-10-22", 1500, "loans", "home_loan_emi"),
  // card refund in October lowers Wants
  txn("2026-10-23", 500, "wants", "card_refund", { payment_method: CARD }),
];

describe("buildNatureReport", () => {
  it("returns null with fewer than 2 months of data", () => {
    const one = fixture().filter((t) => t.date.startsWith("2026-10"));
    expect(buildNatureReport({ rows: one, ...END })).toBeNull();
    expect(buildNatureReport({ rows: [], ...END })).toBeNull();
    // income-only months are not data
    expect(
      buildNatureReport({
        rows: [salary("2026-09-01"), salary("2026-10-01")],
        ...END,
      }),
    ).toBeNull();
  });

  it("monthly amounts equal the monthly Tracker totals", () => {
    const rows = fixture();
    const report = buildNatureReport({ rows, ...END })!;
    expect(report.months.map((m) => m.key)).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
    // Same maths as app/tracker/[month]/page.tsx for each month.
    report.months.forEach((m, i) => {
      const monthRows = rows.filter((t) => t.date.startsWith(m.key));
      const prior = rows.filter((t) => t.date < `${m.key}-01`);
      const counted = applyCardBillCoverage(monthRows, prior);
      for (const key of [
        "needs",
        "wants",
        "habits",
        "security",
        "loans",
        "investment",
      ] as const) {
        const expected = sumTrackerTotals(counted, key);
        const row = report.rows.find((r) => r.key === key)!;
        expect(row.amounts[i]).toBeCloseTo(expected, 2);
      }
    });
    const wants = report.rows.find((r) => r.key === "wants")!;
    // Oct wants: 6000 dining - 500 refund
    expect(wants.amounts).toEqual([3000, 10000, 5500]);
  });

  it("card purchases count in their own nature; bill pays only the uncovered part", () => {
    const report = buildNatureReport({ rows: fixture(), ...END })!;
    const loans = report.rows.find((r) => r.key === "loans")!;
    // Oct: 10000 bill - (9000 card purchases - 500 refund) = 1500, + 1500 EMI
    expect(loans.amounts[2]).toBe(3000);
    const needs = report.rows.find((r) => r.key === "needs")!;
    expect(needs.amounts[2]).toBe(23000); // 20000 rent + 3000 card groceries
    const card = report.rows.find((r) => r.key === "card")!;
    expect(card.amounts).toEqual([0, 0, 10000]);
    expect(card.inTotal).toBe(false);
  });

  it("totals leave out the Credit card row", () => {
    const report = buildNatureReport({ rows: fixture(), ...END })!;
    // Oct: 23000 + 5500 + 2000 + 0 + 3000 + 3000
    expect(report.totals[2]).toBe(36500);
  });

  it("shares of income, and none when income is zero", () => {
    const report = buildNatureReport({ rows: fixture(), ...END })!;
    const needs = report.rows.find((r) => r.key === "needs")!;
    const income = report.months[2].income;
    expect(income).toBeGreaterThanOrEqual(100000);
    expect(needs.shares[2]).toBe(Math.round((23000 / income) * 1000) / 10);
    const noIncome = fixture().filter((t) => t.bucket !== "income");
    const r2 = buildNatureReport({ rows: noIncome, ...END })!;
    expect(r2.months.every((m) => m.income === 0)).toBe(true);
    for (const row of r2.rows)
      expect(row.shares.every((s) => s === null)).toBe(true);
  });

  it("falls back to the profile salary when no income is logged", () => {
    const noIncome = fixture().filter((t) => t.bucket !== "income");
    const r = buildNatureReport({
      rows: noIncome,
      profileSalary: 50000,
      ...END,
    })!;
    expect(r.months[2].income).toBe(50000);
    expect(r.rows[0].shares[2]).toBe(46);
  });

  it("trend, biggest mover and insights", () => {
    const report = buildNatureReport({ rows: fixture(), ...END })!;
    expect(report.latestIndex).toBe(2);
    expect(report.prevIndex).toBe(1);
    const wants = report.rows.find((r) => r.key === "wants")!;
    expect(wants.trend).toBe("down"); // 10000 -> 5500
    const needs = report.rows.find((r) => r.key === "needs")!;
    expect(needs.trend).toBe("up"); // 20000 -> 23000
    const habits = report.rows.find((r) => r.key === "habits")!;
    expect(habits.trend).toBe("up"); // 1000 -> 2000, +100%
    // Largest rupee move: Wants -4500
    expect(report.biggestMover).toMatchObject({
      key: "wants",
      direction: "down",
      delta: -4500,
      pct: -45,
    });
    expect(report.insights[0]).toBe("Wants fell 45% since September");
    expect(report.insights.length).toBeLessThanOrEqual(3);
  });

  it("possible saving is Wants + Habits above their caps", () => {
    const report = buildNatureReport({ rows: fixture(), ...END })!;
    const income = report.months[2].income;
    const wantsOver = Math.max(0, 5500 - income * 0.05);
    const expected = Math.round((wantsOver + 2000) * 100) / 100; // Habits cap is 0%
    expect(report.possibleSaving).toMatchObject({
      monthly: expected,
      yearly: Math.round(expected * 12 * 100) / 100,
      basisMonth: "October",
    });
    expect(report.suggestedAction).toBeTruthy();
    // Tight income: Wants over the 5% guide too.
    const tight = buildNatureReport({
      rows: fixture().map((t) =>
        t.bucket === "income" ? { ...t, amount: 40000 } : t,
      ),
      profileSalary: 0,
      ...END,
    })!;
    const parts = tight.possibleSaving!.parts.map((p) => p.key);
    expect(parts).toEqual(["wants", "habits"]);
  });

  it("measures trends at the last finished month when the current one is in progress", () => {
    const report = buildNatureReport({
      rows: fixture(),
      endYear: 2026,
      endMonthIndex: 9,
      now: new Date(2026, 9, 12),
    })!;
    expect(report.months[2].partial).toBe(true);
    expect(report.latestIndex).toBe(1);
    expect(report.prevIndex).toBe(0);
  });

  it("months with no data show zero and no change", () => {
    const rows = fixture().filter((t) => !t.date.startsWith("2026-09"));
    const report = buildNatureReport({ rows, ...END })!;
    expect(report.months[1].hasData).toBe(false);
    expect(report.prevIndex).toBeNull();
    expect(report.biggestMover).toBeNull();
    const needs = report.rows.find((r) => r.key === "needs")!;
    expect(needs.amounts[1]).toBe(0);
    expect(needs.changePct[2]).toBeNull();
  });

  it("lists top subcategories with readable labels", () => {
    const report = buildNatureReport({ rows: fixture(), ...END })!;
    const needs = report.rows.find((r) => r.key === "needs")!;
    expect(needs.subcategories[0]).toMatchObject({
      id: "rent",
      label: "Rent",
      amounts: [20000, 20000, 20000],
    });
  });
});

describe("natureTrend", () => {
  it("is flat under 5% and under 100 rupees", () => {
    expect(natureTrend(1040, 1000).trend).toBe("flat");
    expect(natureTrend(10300, 10000).trend).toBe("flat");
    expect(natureTrend(11000, 10000).trend).toBe("up");
    expect(natureTrend(500, 1000).trend).toBe("down");
    expect(natureTrend(500, 0)).toMatchObject({ trend: "up", pct: null });
  });
});
