import { describe, expect, it } from "vitest";
import {
  buildCardMonthRows,
  cardEmiRows,
  cardOverdueRows,
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
    expect(sumCashSpend(sep.rows)).toBe(2699);
    expect(sep.keptAside).toBe(2699);

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
    // Only EMIs inside the loaded history are owed (older ones were billed before).
    expect(oct.keptAside).toBe(4000);
  });
});

describe("bill payments vs card spends counted earlier", () => {
  it("a bill paid next month does not come off LEFT again", () => {
    const sept = [cardSpend("2026-09-05", 6000), cardSpend("2026-09-25", 4000)];
    const pay = billPay("2026-10-05", 10000);
    const oct = buildCardMonthRows({
      year: 2026,
      monthIndex: 9,
      monthRows: [pay],
      priorRows: sept,
    });
    expect(oct.rows).toEqual([pay]);
    expect(sumCashSpend(oct.rows)).toBe(0);
    expect(sumTrackerTotals(oct.rows, "loans")).toBe(0);
    expect(oct.keptAside).toBe(0);

    const sep = buildCardMonthRows({
      year: 2026,
      monthIndex: 8,
      monthRows: sept,
    });
    expect(sumCashSpend(sep.rows)).toBe(10000);
    expect(sep.keptAside).toBe(10000);
  });

  it("only the part above counted spends (interest, fees) counts, under Loans", () => {
    const pay = billPay("2026-10-05", 10750);
    const oct = buildCardMonthRows({
      year: 2026,
      monthIndex: 9,
      monthRows: [pay],
      priorRows: [cardSpend("2026-09-05", 10000)],
    });
    const extra = oct.rows.find((r) => r.subcategory === "card_extra")!;
    expect(extra.amount).toBe(750);
    expect(extra.id).toBe(`virtual:card-extra:${pay.id}`);
    expect(sumCashSpend(oct.rows)).toBe(750);
    expect(sumTrackerTotals(oct.rows, "loans")).toBe(750);
  });

  it("a balance from before tracking counts in full", () => {
    const pay = billPay("2026-10-05", 5000);
    const oct = buildCardMonthRows({
      year: 2026,
      monthIndex: 9,
      monthRows: [pay],
    });
    expect(sumCashSpend(oct.rows)).toBe(5000);
    expect(sumTrackerTotals(oct.rows, "loans")).toBe(5000);
  });

  it("part-payments leave the rest kept aside; same-day spends are settled first", () => {
    const res = runCardLedger([
      billPay("2026-10-03", 3000),
      cardSpend("2026-10-03", 2000),
      cardSpend("2026-10-01", 5000),
    ]);
    expect(Array.from(res.excessById.values())).toEqual([0]);
    expect(res.owed).toBe(4000);
  });

  it("refunds lower what is kept aside and the bucket", () => {
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
    expect(sumCashSpend(oct.rows)).toBe(2500);
    expect(oct.keptAside).toBe(2500);
    // Not income.
    expect(sumTrackerTotals(oct.rows, "income")).toBe(0);
  });

  it("EMIs are on the card bill and settled by the bill payment", () => {
    const purchase = emiPurchase("2026-09-10", 6, 2000);
    const oct = buildCardMonthRows({
      year: 2026,
      monthIndex: 9,
      monthRows: [billPay("2026-10-05", 2000)],
      priorRows: [purchase],
    });
    // Sep EMI paid in Oct (no extra); Oct EMI is this month's spend.
    expect(oct.rows.some((r) => r.subcategory === "card_extra")).toBe(false);
    expect(sumCashSpend(oct.rows)).toBe(2000);
    expect(oct.keptAside).toBe(2000);
  });
});

describe("unpaid card bill under Loans", () => {
  it("adds to the Loans total without touching SPENT / LEFT", () => {
    const rows = cardOverdueRows(
      [
        {
          cardId: "c1",
          label: "HDFC",
          statementEnd: "2026-09-15",
          dueDate: "2026-10-05",
          statementAmount: 30000,
          paidByDue: 12000,
          remaining: 18000,
        },
      ],
      "2026-10-09",
    );
    expect(rows[0].id).toBe("virtual:card-overdue:c1");
    expect(sumTrackerTotals(rows, "loans")).toBe(18000);
    expect(sumCashSpend(rows)).toBe(0);
  });
});
