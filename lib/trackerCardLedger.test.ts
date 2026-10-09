import { describe, expect, it } from "vitest";
import {
  buildCardMonthRows,
  cardEmiRows,
  runCardLedger,
  type CardLedgerTxn,
} from "./trackerCardLedger";
import { sumTrackerTotals } from "./tracker-categories";
import { encodeCardEmiToken, sumCashSpend } from "./trackerCreditCards";

const CARD = "credit_card::c1::HDFC";
let seq = 0;
const txn = (p: Partial<CardLedgerTxn> & { date: string; amount: number }) =>
  ({
    id: `t${++seq}`,
    bucket: "wants",
    category: "shopping",
    subcategory: "shopping",
    description: null,
    payment_method: "upi",
    ...p,
  }) as CardLedgerTxn;
const cardSpend = (date: string, amount: number, bucket = "wants") =>
  txn({ date, amount, bucket, payment_method: CARD });
const billPay = (date: string, amount: number) =>
  txn({
    date,
    amount,
    bucket: "loans",
    category: "credit_card",
    subcategory: "credit_card",
    description: "Pay bill · HDFC",
  });
const emiPurchase = (date: string, months: number, monthly: number, fee = 0) =>
  txn({
    date,
    amount: months * monthly,
    payment_method: CARD,
    description: `Phone ${encodeCardEmiToken({ months, monthly, fee })}`,
  });

describe("card EMI schedule", () => {
  it("one EMI a month from the purchase month, fee once in month one", () => {
    const rows = cardEmiRows(emiPurchase("2026-09-20", 3, 2500, 199));
    expect(rows.map((r) => [r.date, r.amount])).toEqual([
      ["2026-09-20", 2500],
      ["2026-10-20", 2500],
      ["2026-11-20", 2500],
      ["2026-09-20", 199],
    ]);
    expect(rows.every((r) => r.bucket === "loans")).toBe(true);
    expect(rows.every((r) => r.subcategory === "card_emi")).toBe(true);
    expect(rows.every((r) => r.payment_method === CARD)).toBe(true);
    expect(rows[0].description).toBe("EMI 1/3 · Phone");
  });

  it("clamps the EMI day to short months", () => {
    const rows = cardEmiRows(emiPurchase("2026-01-31", 2, 1000));
    expect(rows.map((r) => r.date)).toEqual(["2026-01-31", "2026-02-28"]);
  });

  it("counts only that month's EMI, at EMI price, and stops after the last", () => {
    const purchase = emiPurchase("2026-09-20", 3, 2500, 199);
    const month = (monthIndex: number, monthRows: CardLedgerTxn[]) =>
      buildCardMonthRows({
        year: 2026,
        monthIndex,
        monthRows,
        emiSources: [purchase],
        historyStart: "2026-07-01",
      });

    const sep = month(8, [purchase]);
    // Purchase row stays in the list but counts nothing.
    expect(sep.rows).toContain(purchase);
    expect(sumTrackerTotals(sep.rows, "wants")).toBe(0);
    expect(sumTrackerTotals(sep.rows, "loans")).toBe(2699);
    // Card EMIs are paid through the card bill, not from the bank.
    expect(sumCashSpend(sep.rows)).toBe(0);

    const nov = month(10, []);
    expect(sumTrackerTotals(nov.rows, "loans")).toBe(2500);
    const dec = month(11, []);
    expect(sumTrackerTotals(dec.rows, "loans")).toBe(0);
    expect(dec.rows).toEqual([]);
  });

  it("keeps a long EMI going after the purchase month leaves the history", () => {
    const purchase = emiPurchase("2026-01-10", 12, 1000);
    const oct = buildCardMonthRows({
      year: 2026,
      monthIndex: 9,
      monthRows: [],
      emiSources: [purchase],
      historyStart: "2026-07-01",
    });
    expect(oct.rows.map((r) => r.description)).toEqual(["EMI 10/12 · Phone"]);
    // EMIs inside the loaded history (Jul–Oct) are on the card bills.
    expect(oct.emiRows.map((r) => r.date)).toEqual([
      "2026-07-10",
      "2026-08-10",
      "2026-09-10",
      "2026-10-10",
    ]);
  });
});

describe("bill payments vs card spends", () => {
  it("card spends count in their bucket when bought; the bank only when the bill is paid", () => {
    const sept = [cardSpend("2026-09-05", 6000), cardSpend("2026-09-25", 4000)];
    const pay = billPay("2026-10-05", 10000);
    const oct = buildCardMonthRows({
      year: 2026,
      monthIndex: 9,
      monthRows: [pay],
      priorRows: sept,
    });
    expect(oct.rows).toEqual([pay]);
    // Money left the bank in October…
    expect(sumCashSpend(oct.rows)).toBe(10000);
    // …but it settles spends already counted in Wants, so not in Loans.
    expect(sumTrackerTotals(oct.rows, "loans")).toBe(0);

    const sep = buildCardMonthRows({
      year: 2026,
      monthIndex: 8,
      monthRows: sept,
    });
    expect(sumTrackerTotals(sep.rows, "wants")).toBe(10000);
    expect(sumCashSpend(sep.rows)).toBe(0);
  });

  it("a bill paid above tracked spends adds nothing to Loans (no card_extra row)", () => {
    const pay = billPay("2026-10-05", 10750);
    const oct = buildCardMonthRows({
      year: 2026,
      monthIndex: 9,
      monthRows: [pay],
      priorRows: [cardSpend("2026-09-05", 10000)],
    });
    expect(oct.rows.some((r) => r.subcategory === "card_extra")).toBe(false);
    expect(sumCashSpend(oct.rows)).toBe(10750);
    expect(sumTrackerTotals(oct.rows, "loans")).toBe(0);
  });

  it("a balance from before tracking: full payment out of the bank, not in Loans", () => {
    const pay = billPay("2026-10-05", 5000);
    const oct = buildCardMonthRows({
      year: 2026,
      monthIndex: 9,
      monthRows: [pay],
    });
    expect(sumCashSpend(oct.rows)).toBe(5000);
    expect(sumTrackerTotals(oct.rows, "loans")).toBe(0);
  });

  it("ledger: part-payments leave the rest owed; same-day spends are settled first", () => {
    const res = runCardLedger([
      billPay("2026-10-03", 3000),
      cardSpend("2026-10-03", 2000),
      cardSpend("2026-10-01", 5000),
    ]);
    expect(Array.from(res.excessById.values())).toEqual([0]);
    expect(res.owed).toBe(4000);
  });

  it("refunds lower the bucket and never touch the bank spend", () => {
    const refund = txn({
      date: "2026-10-08",
      amount: 1500,
      subcategory: "card_refund",
      category: "card_refund",
      payment_method: CARD,
    });
    const oct = buildCardMonthRows({
      year: 2026,
      monthIndex: 9,
      monthRows: [cardSpend("2026-10-02", 4000), refund],
    });
    expect(sumTrackerTotals(oct.rows, "wants")).toBe(2500);
    expect(sumCashSpend(oct.rows)).toBe(0);
    // Not income.
    expect(sumTrackerTotals(oct.rows, "income")).toBe(0);
  });

  it("card EMIs count in Loans monthly; only the bill payment hits the bank", () => {
    const purchase = emiPurchase("2026-09-10", 6, 2000);
    const oct = buildCardMonthRows({
      year: 2026,
      monthIndex: 9,
      monthRows: [billPay("2026-10-05", 2000)],
      priorRows: [purchase],
    });
    expect(oct.rows.some((r) => r.subcategory === "card_extra")).toBe(false);
    expect(sumTrackerTotals(oct.rows, "loans")).toBe(2000);
    expect(sumCashSpend(oct.rows)).toBe(2000);
  });
});

describe("unpaid card bills stay out of Loans", () => {
  it("legacy card_extra / card_overdue rows never add to bucket totals or SPENT", () => {
    const rows = [
      txn({
        id: "virtual:card-overdue:c1",
        date: "2026-10-09",
        amount: 18000,
        bucket: "loans",
        category: "card_overdue",
        subcategory: "card_overdue",
        payment_method: null,
      }),
      txn({
        id: "virtual:card-extra:p1",
        date: "2026-10-05",
        amount: 7707,
        bucket: "loans",
        category: "card_extra",
        subcategory: "card_extra",
        payment_method: "upi",
      }),
      txn({
        date: "2026-10-05",
        amount: 118439,
        bucket: "loans",
        category: "home_loan_emi",
        subcategory: "home_loan_emi",
      }),
    ];
    expect(sumTrackerTotals(rows, "loans")).toBe(118439);
    expect(sumCashSpend(rows)).toBe(118439);
  });
});
