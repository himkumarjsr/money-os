import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      upsert: () => Promise.resolve({ error: null }),
    }),
  }),
}));

import {
  billPaymentNoteForCard,
  buildCardBills,
  buildCreditCardOverdue,
  cardBillCycleText,
  cardLastBillText,
  encodeCreditCardPaymentMethod,
  loadSavedCreditCards,
  markCardStatementPaid,
  saveCreditCards,
  unmarkCardStatementPaid,
  type SavedCreditCard,
} from "./trackerCreditCards";

const card = (id: string, nickname: string, extra = {}): SavedCreditCard => ({
  id,
  nickname,
  billingDay: 15,
  dueDay: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

const RUPAY = card("c-rupay", "ICICI RUPEY");
const AMAZON = card("c-amazon", "ICICI Amazon pay");
const HDFC = card("c-hdfc", "HDFC Regalia", { billingDay: 20, dueDay: 10 });
const SBI = card("c-sbi", "SBI SimplyClick", { billingDay: 5, dueDay: 25 });
const AXIS = card("c-axis", "Axis Ace", { billingDay: undefined, dueDay: 7 });
const FIVE = [RUPAY, AMAZON, HDFC, SBI, AXIS];

const spend = (
  c: SavedCreditCard,
  amount: number,
  date: string,
  bucket = "wants",
) => ({
  amount,
  bucket,
  subcategory: "shopping",
  payment_method: encodeCreditCardPaymentMethod(c),
  date,
});
const billPay = (amount: number, date: string, description: string | null) => ({
  amount,
  bucket: "loans",
  subcategory: "credit_card",
  category: "credit_card",
  payment_method: "upi",
  description,
  date,
});

const asOf = new Date(2026, 9, 9); // 9 Oct 2026

// Statement 16 Aug – 15 Sep, due 1 Oct, on both ICICI cards.
const iciciSpends = [
  spend(RUPAY, 859, "2026-09-02"),
  spend(AMAZON, 10000, "2026-08-25"),
  spend(AMAZON, 343, "2026-09-12", "needs"),
];

describe("bill payments logged without choosing a card", () => {
  it("two cards: separate unlinked payments clear both bills (closest amount)", () => {
    const txns = [
      ...iciciSpends,
      billPay(10343, "2026-09-29", "Credit card payment"),
      billPay(859, "2026-09-30", null),
    ];
    expect(
      buildCreditCardOverdue({ cards: FIVE, transactions: txns, asOf }),
    ).toEqual([]);
    const bills = buildCardBills({ cards: FIVE, transactions: txns, asOf });
    const rupay = bills.cards.find((c) => c.cardId === RUPAY.id)!;
    const amazon = bills.cards.find((c) => c.cardId === AMAZON.id)!;
    expect(rupay.lastBill).toMatchObject({ amount: 859, status: "paid" });
    expect(amazon.lastBill).toMatchObject({ amount: 10343, status: "paid" });
  });

  it("one combined unlinked payment covers both bills (oldest due first)", () => {
    const txns = [...iciciSpends, billPay(11202, "2026-10-01", "")];
    expect(
      buildCreditCardOverdue({ cards: FIVE, transactions: txns, asOf }),
    ).toEqual([]);
  });

  it("a payment made before the statement closed still counts", () => {
    const txns = [
      ...iciciSpends,
      billPay(11202, "2026-09-14", "Paid ICICI cards"),
    ];
    const bills = buildCardBills({ cards: FIVE, transactions: txns, asOf });
    expect(
      bills.cards
        .filter((c) => c.cardId === RUPAY.id || c.cardId === AMAZON.id)
        .map((c) => c.lastBill?.status),
    ).toEqual(["paid", "paid"]);
  });

  it("'Pay bill · ICICI' matches both cards, so it is shared like an unlinked one", () => {
    const txns = [
      ...iciciSpends,
      billPay(11202, "2026-09-28", "Pay bill · ICICI"),
    ];
    expect(
      buildCreditCardOverdue({ cards: FIVE, transactions: txns, asOf }),
    ).toEqual([]);
  });

  it("not enough unlinked money: asks instead of warning about interest", () => {
    const txns = [...iciciSpends, billPay(859, "2026-09-30", "CC bill")];
    const overdue = buildCreditCardOverdue({
      cards: FIVE,
      transactions: txns,
      asOf,
    });
    expect(overdue).toHaveLength(1);
    expect(overdue[0]).toMatchObject({
      cardId: AMAZON.id,
      remaining: 10343,
      clearlyUnpaid: false,
    });
    const amazon = buildCardBills({
      cards: FIVE,
      transactions: txns,
      asOf,
    }).cards.find((c) => c.cardId === AMAZON.id)!;
    expect(amazon.lastBill).toMatchObject({
      status: "unpaid",
      overdue: true,
      unsure: true,
      clearlyUnpaid: false,
    });
  });

  it("no payment at all: clearly unpaid (interest warning)", () => {
    const amazon = buildCardBills({
      cards: FIVE,
      transactions: iciciSpends,
      asOf,
    }).cards.find((c) => c.cardId === AMAZON.id)!;
    expect(amazon.lastBill).toMatchObject({
      status: "unpaid",
      overdue: true,
      unsure: false,
      clearlyUnpaid: true,
      remaining: 10343,
    });
  });

  it("a payment named for one card never pays another card's bill", () => {
    const txns = [
      ...iciciSpends,
      billPay(10343, "2026-09-29", "Pay bill · ICICI Amazon pay"),
    ];
    const overdue = buildCreditCardOverdue({
      cards: FIVE,
      transactions: txns,
      asOf,
    });
    expect(overdue.map((o) => [o.cardId, o.clearlyUnpaid])).toEqual([
      [RUPAY.id, true],
    ]);
  });

  it("'Mark paid' clears a bill no payment could be matched to", () => {
    const marked = { ...AMAZON, paidStatements: ["2026-09-15"] };
    const cards = [RUPAY, marked];
    const txns = [...iciciSpends, billPay(859, "2026-09-30", null)];
    expect(buildCreditCardOverdue({ cards, transactions: txns, asOf })).toEqual(
      [],
    );
    const bills = buildCardBills({ cards, transactions: txns, asOf });
    const amazon = bills.cards.find((c) => c.cardId === AMAZON.id)!;
    expect(amazon.lastBill).toMatchObject({
      status: "marked_paid",
      remaining: 0,
    });
    expect(cardLastBillText(amazon)).toBe("₹10,343 due 1 Oct — Paid ✓");
  });
});

describe("Card bills section", () => {
  const txns = [
    ...iciciSpends,
    billPay(5000, "2026-09-30", "Pay bill · ICICI Amazon pay"),
    // This cycle (16 Sep – 15 Oct) on Amazon: spend, refund, EMI + fee.
    spend(AMAZON, 2000, "2026-09-20"),
    spend(AMAZON, 1200, "2026-10-04"),
    {
      amount: 200,
      bucket: "wants",
      subcategory: "card_refund",
      payment_method: encodeCreditCardPaymentMethod(AMAZON),
      date: "2026-10-05",
    },
    {
      id: "virtual:emi:p1:2",
      amount: 2500,
      bucket: "loans",
      subcategory: "card_emi",
      payment_method: encodeCreditCardPaymentMethod(AMAZON),
      date: "2026-10-03",
    },
    {
      id: "virtual:emi-fee:p1",
      amount: 199,
      bucket: "loans",
      subcategory: "card_emi",
      payment_method: encodeCreditCardPaymentMethod(AMAZON),
      date: "2026-10-03",
    },
    // Axis has no billing day: this calendar month only.
    spend(AXIS, 900, "2026-09-28"),
    spend(AXIS, 450, "2026-10-02"),
    // Spend on a card that isn't saved.
    {
      amount: 700,
      bucket: "wants",
      subcategory: "shopping",
      payment_method: "credit_card::gone::Old card",
      date: "2026-10-06",
    },
  ];
  const bills = buildCardBills({
    cards: [AMAZON, AXIS],
    transactions: txns,
    asOf,
  });
  const amazon = bills.cards.find((c) => c.cardId === AMAZON.id)!;
  const axis = bills.cards.find((c) => c.cardId === AXIS.id)!;

  it("this cycle: spends so far net of refunds, with EMIs and fees", () => {
    expect(amazon.cycle).toMatchObject({
      start: "2026-09-16",
      closesOn: "2026-10-15",
      dueDate: "2026-11-01",
      spent: 5699,
    });
    expect(cardBillCycleText(amazon)).toBe(
      "₹5,699 spent so far · bill on 15 Oct · due 1 Nov",
    );
  });

  it("last bill: part-paid shows how much of it was paid", () => {
    expect(amazon.lastBill).toMatchObject({
      statementEnd: "2026-09-15",
      dueDate: "2026-10-01",
      amount: 10343,
      paid: 5000,
      remaining: 5343,
      status: "partial",
      overdue: true,
      clearlyUnpaid: true,
    });
    expect(cardLastBillText(amazon)).toBe(
      "₹10,343 due 1 Oct — ₹5,000 of ₹10,343 paid",
    );
  });

  it("no billing day: calendar-month spends and a prompt to set it", () => {
    expect(axis.hasBillingDay).toBe(false);
    expect(axis.lastBill).toBeNull();
    expect(axis.cycle.spent).toBe(450);
    expect(cardBillCycleText(axis)).toBe("₹450 spent this month");
  });

  it("total = every open cycle + unpaid last bills + other card spends", () => {
    expect(amazon.upcoming).toBe(5699 + 5343);
    expect(bills.otherCards).toEqual([
      { key: "gone", label: "Old card", spent: 700 },
    ]);
    expect(bills.totalUpcoming).toBe(5699 + 5343 + 450 + 700);
  });

  it("no last bill line when the last statement had no charges", () => {
    const fresh = buildCardBills({
      cards: [RUPAY],
      transactions: [spend(RUPAY, 300, "2026-10-01")],
      asOf,
    }).cards[0];
    expect(fresh.lastBill).toBeNull();
    expect(cardLastBillText(fresh)).toBeNull();
    expect(fresh.upcoming).toBe(300);
  });

  it("paid in full; an early payment lowers what this cycle still needs", () => {
    const res = buildCardBills({
      cards: [RUPAY],
      transactions: [
        spend(RUPAY, 859, "2026-09-02"),
        spend(RUPAY, 1000, "2026-09-25"),
        billPay(859, "2026-09-25", "Pay bill · ICICI RUPEY"),
        billPay(400, "2026-10-05", "Pay bill · ICICI RUPEY"),
      ],
      asOf,
    }).cards[0];
    expect(res.lastBill?.status).toBe("paid");
    expect(cardLastBillText(res)).toBe("₹859 due 1 Oct — Paid ✓");
    expect(res.cycle.spent).toBe(1000);
    expect(res.cycle.toPay).toBe(600);
    expect(res.upcoming).toBe(600);
  });

  it("credit limit usage is attached per card", () => {
    const res = buildCardBills({
      cards: [{ ...RUPAY, creditLimit: 10000 }],
      transactions: [spend(RUPAY, 3500, "2026-10-01")],
      asOf,
    }).cards[0];
    expect(res.usage).toMatchObject({ used: 3500, limit: 10000 });
    expect(res.usage?.overWarn).toBe(true);
  });
});

describe("mark a card bill paid (local card cache)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores the statement on the card and survives reloads", () => {
    saveCreditCards("u1", [RUPAY, AMAZON]);
    const updated = markCardStatementPaid("u1", AMAZON.id, "2026-09-15");
    expect(updated?.paidStatements).toEqual(["2026-09-15"]);
    markCardStatementPaid("u1", AMAZON.id, "2026-09-15");
    const reloaded = loadSavedCreditCards("u1");
    expect(reloaded.find((c) => c.id === AMAZON.id)?.paidStatements).toEqual([
      "2026-09-15",
    ]);
    expect(reloaded.find((c) => c.id === RUPAY.id)?.paidStatements).toBe(
      undefined,
    );
    unmarkCardStatementPaid("u1", AMAZON.id, "2026-09-15");
    expect(
      loadSavedCreditCards("u1").find((c) => c.id === AMAZON.id)
        ?.paidStatements,
    ).toBe(undefined);
  });

  it("ignores unknown cards and bad dates", () => {
    saveCreditCards("u1", [RUPAY]);
    expect(markCardStatementPaid("u1", "nope", "2026-09-15")).toBeNull();
    expect(markCardStatementPaid("u1", RUPAY.id, "15 Sep")).toBeNull();
  });
});

describe("billPaymentNoteForCard", () => {
  it("names the card so the payment matches its bill", () => {
    expect(billPaymentNoteForCard("", AMAZON)).toBe(
      "Pay bill · ICICI Amazon pay",
    );
    expect(billPaymentNoteForCard("Credit card payment", AMAZON)).toBe(
      "Pay bill · ICICI Amazon pay",
    );
    expect(billPaymentNoteForCard("Sept bill", AMAZON)).toBe(
      "Sept bill · ICICI Amazon pay",
    );
    expect(billPaymentNoteForCard("icici amazon pay sept", AMAZON)).toBe(
      "icici amazon pay sept",
    );
  });
});
