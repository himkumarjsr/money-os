import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      upsert: () => Promise.resolve({ error: null }),
      update: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        }),
      }),
      delete: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }),
    }),
  }),
}));

import {
  TRACKER_CONSENT_VERSION,
  buildCreditCardBillStatuses,
  buildCreditCardOverdue,
  buildCreditCardPaySuggestions,
  buildCreditCardUsage,
  cardBillAmount,
  cashSpendAmount,
  countsTowardCashSpend,
  creditCardBillPaymentDescription,
  creditCardObligationTitle,
  deleteSavedCreditCard,
  dismissCreditCardBillReminder,
  displayExpenseDescription,
  displayPaymentMethod,
  encodeCardEmiToken,
  encodeCreditCardPaymentMethod,
  formatCreditCardLabel,
  getLastStatementWindow,
  getMostRecentDueDate,
  getNextDueDate,
  getStatementDueDate,
  getStatementWindowForDate,
  hasTrackerConsentLocal,
  hideCreditCardDueLine,
  isCreditCardBillDismissed,
  isCardEmiPurchase,
  isCreditCardBillPayment,
  isCreditCardCharge,
  isCreditCardRefund,
  isCreditCardDueLineHidden,
  isCreditCardPaymentMethod,
  loadHiddenCreditCardDueIds,
  loadSavedCreditCards,
  parseCardEmiPlan,
  parseCreditCardPaymentMethod,
  saveCreditCards,
  setTrackerConsentLocal,
  suggestDueDayFromBilling,
  sumCashSpend,
  sumOnCardsSpend,
  summarizeCreditCardBills,
  upsertSavedCreditCard,
} from "./trackerCreditCards";

describe("credit card payment method encoding", () => {
  it("formats labels with name only (and legacy last4)", () => {
    expect(
      formatCreditCardLabel({ nickname: "HDFC Millennia", last4: "1234" }),
    ).toBe("HDFC Millennia ****1234");
    expect(formatCreditCardLabel({ nickname: "Amex" })).toBe("Amex");
    expect(formatCreditCardLabel({ nickname: "  ", last4: "" })).toBe(
      "Credit card",
    );
    expect(
      encodeCreditCardPaymentMethod({
        id: "card-1",
        nickname: "HDFC|Prime",
      }),
    ).toBe("credit_card::card-1::HDFC/Prime");
  });

  it("detects credit card payment methods", () => {
    expect(isCreditCardPaymentMethod("card")).toBe(true);
    expect(isCreditCardPaymentMethod("CREDIT_CARD")).toBe(true);
    expect(isCreditCardPaymentMethod("credit_card::id::HDFC ****1234")).toBe(
      true,
    );
    expect(isCreditCardPaymentMethod("upi")).toBe(false);
    expect(isCreditCardPaymentMethod(null)).toBe(false);
  });

  it("parses encoded methods and displays labels", () => {
    expect(
      parseCreditCardPaymentMethod("credit_card::abc::SBI ****4321"),
    ).toEqual({ cardId: "abc", label: "SBI ****4321" });
    expect(parseCreditCardPaymentMethod("credit_card::::")).toEqual({
      cardId: null,
      label: null,
    });
    expect(parseCreditCardPaymentMethod("card")).toEqual({
      cardId: null,
      label: "Credit card",
    });
    expect(parseCreditCardPaymentMethod("upi")).toEqual({
      cardId: null,
      label: null,
    });
    expect(displayPaymentMethod("credit_card::abc::SBI ****4321")).toBe(
      "SBI ****4321",
    );
    expect(displayPaymentMethod("credit_card")).toBe("Credit card");
    expect(displayPaymentMethod("upi")).toBe("UPI");
    expect(displayPaymentMethod("netbanking")).toBe("Net banking");
    expect(displayPaymentMethod("cash")).toBe("Cash");
    expect(displayPaymentMethod("wallet")).toBe("Wallet");
    expect(displayPaymentMethod("cheque")).toBe("Cheque");
    expect(displayPaymentMethod(null)).toBe("—");
  });
});

describe("cash vs card spend", () => {
  it("counts card purchases when made; leaves out bill pays (they settle them)", () => {
    expect(
      countsTowardCashSpend({
        bucket: "wants",
        payment_method: "credit_card::c1::HDFC",
      }),
    ).toBe(true);
    for (const rail of ["upi", "netbanking", "wallet", "cash"]) {
      expect(
        countsTowardCashSpend({
          bucket: "loans",
          subcategory: "credit_card",
          payment_method: rail,
        }),
      ).toBe(false);
    }
    expect(
      countsTowardCashSpend({
        bucket: "loans",
        subcategory: "home_loan_emi",
        payment_method: "upi",
      }),
    ).toBe(true);
    // Shown under Investments, but only hits purple LEFT (not investment total).
    expect(
      countsTowardCashSpend({
        bucket: "investment",
        subcategory: "loan_prepayment",
        payment_method: "upi",
      }),
    ).toBe(true);
    expect(
      countsTowardCashSpend({
        bucket: "needs",
        payment_method: "upi",
      }),
    ).toBe(true);
    expect(countsTowardCashSpend({ bucket: "income" })).toBe(false);
  });

  it("sums cash and on-cards totals", () => {
    const txns = [
      {
        amount: 1000,
        bucket: "needs",
        payment_method: "upi",
      },
      {
        amount: 500,
        bucket: "wants",
        payment_method: "credit_card::c1::HDFC",
      },
      {
        amount: 800,
        bucket: "loans",
        subcategory: "credit_card",
        payment_method: "upi",
      },
      {
        amount: 200,
        bucket: "needs",
        payment_method: "credit_card::c1::HDFC",
      },
    ];
    // Card spends come off LEFT when made; the 800 bill pay only settles them.
    expect(sumCashSpend(txns)).toBe(1700);
    expect(sumOnCardsSpend(txns)).toBe(700);
  });

  it("subtracts card refunds / cashback from spend and the card bill", () => {
    const card = "credit_card::c1::HDFC";
    const refund = {
      amount: 300,
      bucket: "wants",
      subcategory: "card_refund",
      payment_method: card,
    };
    expect(isCreditCardRefund(refund)).toBe(true);
    expect(isCreditCardCharge(refund)).toBe(false);
    expect(cardBillAmount(refund)).toBe(-300);
    expect(cashSpendAmount(refund)).toBe(-300);
    // Income is never a refund, and a refund needs a card.
    expect(isCreditCardRefund({ ...refund, bucket: "income" })).toBe(false);
    expect(isCreditCardRefund({ ...refund, payment_method: "upi" })).toBe(
      false,
    );
    const txns = [
      { amount: 1000, bucket: "wants", payment_method: card },
      refund,
    ];
    expect(sumCashSpend(txns)).toBe(700);
    expect(sumOnCardsSpend(txns)).toBe(700);
  });

  it("does not count a purchase converted to EMI at full price", () => {
    const token = encodeCardEmiToken({ months: 6, monthly: 2500, fee: 199 });
    expect(token).toBe("[#emi:6x2500+199]");
    expect(parseCardEmiPlan(`Phone ${token}`)).toEqual({
      months: 6,
      monthly: 2500,
      fee: 199,
    });
    expect(parseCardEmiPlan("[#emi:3x1000]")).toEqual({
      months: 3,
      monthly: 1000,
      fee: 0,
    });
    expect(parseCardEmiPlan("Phone")).toBeNull();
    expect(displayExpenseDescription(`Phone ${token}`)).toBe("Phone");

    const purchase = {
      amount: 15000,
      bucket: "wants",
      subcategory: "gadgets",
      payment_method: "credit_card::c1::HDFC",
      description: `Phone ${token}`,
    };
    expect(isCardEmiPurchase(purchase)).toBe(true);
    expect(isCreditCardCharge(purchase)).toBe(false);
    expect(cashSpendAmount(purchase)).toBe(0);
    // Without a card it's just a note.
    expect(isCardEmiPurchase({ ...purchase, payment_method: "upi" })).toBe(
      false,
    );
  });
});

describe("statement for a spend date (billing day 15)", () => {
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  it("puts spends up to the 15th on this statement, later ones on the next", () => {
    const on15 = getStatementWindowForDate(15, new Date(2026, 8, 15))!;
    expect(iso(on15.start)).toBe("2026-08-16");
    expect(iso(on15.end)).toBe("2026-09-15");
    const on16 = getStatementWindowForDate(15, new Date(2026, 8, 16))!;
    expect(iso(on16.start)).toBe("2026-09-16");
    expect(iso(on16.end)).toBe("2026-10-15");
  });

  it("clamps billing day 31 to short months", () => {
    const feb = getStatementWindowForDate(31, new Date(2026, 1, 20))!;
    expect(iso(feb.end)).toBe("2026-02-28");
    expect(iso(feb.start)).toBe("2026-02-01");
  });

  it("due date is the first due day after the statement closes", () => {
    expect(iso(getStatementDueDate(new Date(2026, 8, 15), 5))).toBe(
      "2026-10-05",
    );
    expect(iso(getStatementDueDate(new Date(2026, 8, 5), 25))).toBe(
      "2026-09-25",
    );
  });
});

describe("credit limit usage", () => {
  const card = {
    id: "c1",
    nickname: "HDFC",
    billingDay: 15,
    dueDay: 5,
    creditLimit: 100000,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const method = "credit_card::c1::HDFC";

  it("measures the open statement against the limit and warns over 30%", () => {
    const usage = buildCreditCardUsage({
      cards: [card],
      asOf: new Date(2026, 9, 9),
      transactions: [
        // Previous statement (Aug 16 – Sep 15): not in the open one.
        {
          amount: 50000,
          bucket: "wants",
          payment_method: method,
          date: "2026-09-10",
        },
        {
          amount: 25000,
          bucket: "wants",
          payment_method: method,
          date: "2026-09-16",
        },
        {
          amount: 8000,
          bucket: "needs",
          payment_method: method,
          date: "2026-10-02",
        },
        {
          amount: 1000,
          bucket: "wants",
          subcategory: "card_refund",
          payment_method: method,
          date: "2026-10-03",
        },
      ],
    });
    expect(usage).toHaveLength(1);
    expect(usage[0].used).toBe(32000);
    expect(usage[0].statementStart).toBe("2026-09-16");
    expect(usage[0].ratio).toBeCloseTo(0.32);
    expect(usage[0].overWarn).toBe(true);
  });

  it("skips cards without a limit", () => {
    expect(
      buildCreditCardUsage({
        cards: [{ ...card, creditLimit: undefined }],
        transactions: [],
      }),
    ).toEqual([]);
  });
});

describe("unpaid statement after the due date", () => {
  const card = {
    id: "c1",
    nickname: "HDFC",
    billingDay: 15,
    dueDay: 5,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const method = "credit_card::c1::HDFC";
  const spends = [
    {
      amount: 20000,
      bucket: "needs",
      payment_method: method,
      date: "2026-08-20",
    },
    {
      amount: 10000,
      bucket: "wants",
      payment_method: method,
      date: "2026-09-15",
    },
    // Next statement — not part of the Sep 15 bill.
    {
      amount: 4000,
      bucket: "wants",
      payment_method: method,
      date: "2026-09-16",
    },
  ];
  const pay = (amount: number, date: string) => ({
    amount,
    bucket: "loans",
    subcategory: "credit_card",
    payment_method: "upi",
    description: "Pay bill · HDFC",
    date,
  });

  it("flags the remaining balance when the bill was part-paid by the due date", () => {
    const overdue = buildCreditCardOverdue({
      cards: [card],
      asOf: new Date(2026, 9, 9),
      transactions: [...spends, pay(12000, "2026-10-04")],
    });
    expect(overdue).toHaveLength(1);
    expect(overdue[0]).toMatchObject({
      statementEnd: "2026-09-15",
      dueDate: "2026-10-05",
      statementAmount: 30000,
      paidByDue: 12000,
      remaining: 18000,
    });
  });

  it("shrinks as late payments come in and clears when paid", () => {
    const later = buildCreditCardOverdue({
      cards: [card],
      asOf: new Date(2026, 9, 12),
      transactions: [
        ...spends,
        pay(12000, "2026-10-04"),
        pay(8000, "2026-10-10"),
      ],
    });
    expect(later[0].remaining).toBe(10000);
    expect(
      buildCreditCardOverdue({
        cards: [card],
        asOf: new Date(2026, 9, 12),
        transactions: [
          ...spends,
          pay(12000, "2026-10-04"),
          pay(18000, "2026-10-10"),
        ],
      }),
    ).toEqual([]);
  });

  it("is quiet when paid in full, or before the due date", () => {
    expect(
      buildCreditCardOverdue({
        cards: [card],
        asOf: new Date(2026, 9, 9),
        transactions: [...spends, pay(30000, "2026-10-01")],
      }),
    ).toEqual([]);
    // Oct 3: the Sep 15 bill is not due yet; the Aug 15 bill had nothing.
    expect(
      buildCreditCardOverdue({
        cards: [card],
        asOf: new Date(2026, 9, 3),
        transactions: spends,
      }),
    ).toEqual([]);
  });
});

describe("statement window + due dates", () => {
  it("suggests due day ~20 days after billing", () => {
    expect(suggestDueDayFromBilling(15)).toBe(4); // Jan 15 + 20 = Feb 4
    expect(suggestDueDayFromBilling(1)).toBe(21);
  });

  it("computes last statement window ending on/before asOf", () => {
    const win = getLastStatementWindow(15, new Date(2026, 6, 26)); // Jul 26
    expect(win).not.toBeNull();
    expect(win!.end.getFullYear()).toBe(2026);
    expect(win!.end.getMonth()).toBe(6);
    expect(win!.end.getDate()).toBe(15);
    expect(win!.start.getMonth()).toBe(5); // June
    expect(win!.start.getDate()).toBe(16);
  });

  it("returns next due date on or after asOf", () => {
    const due = getNextDueDate(5, new Date(2026, 6, 26));
    expect(due).not.toBeNull();
    expect(due!.getMonth()).toBe(7); // Aug
    expect(due!.getDate()).toBe(5);
  });
});

describe("saved credit cards localStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("upserts by nickname only (no card number required)", () => {
    const card = upsertSavedCreditCard("user-1", {
      nickname: "Axis Ace",
    });
    expect(card.nickname).toBe("Axis Ace");
    expect(card.last4).toBeUndefined();

    const loaded = loadSavedCreditCards("user-1");
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(card.id);
  });

  it("stores billing and due days", () => {
    const card = upsertSavedCreditCard("user-1", {
      nickname: "HDFC",
      billingDay: 15,
      dueDay: 5,
    });
    expect(card.billingDay).toBe(15);
    expect(card.dueDay).toBe(5);
    expect(loadSavedCreditCards("user-1")[0].dueDay).toBe(5);
  });

  it("defaults due day from billing day when omitted", () => {
    const card = upsertSavedCreditCard("user-1", {
      nickname: "SBI",
      billingDay: 10,
    });
    expect(card.dueDay).toBe(suggestDueDayFromBilling(10));
  });

  it("dedupes by nickname", () => {
    const first = upsertSavedCreditCard("user-1", {
      nickname: "HDFC",
    });
    const second = upsertSavedCreditCard("user-1", {
      nickname: "hdfc",
    });
    expect(second.id).toBe(first.id);
    expect(loadSavedCreditCards("user-1")).toHaveLength(1);
  });

  it("updates an existing card by id", () => {
    const first = upsertSavedCreditCard("user-1", {
      nickname: "Old",
    });
    const updated = upsertSavedCreditCard("user-1", {
      id: first.id,
      nickname: "New Nick",
      billingDay: 20,
    });
    expect(updated.id).toBe(first.id);
    expect(updated.nickname).toBe("New Nick");
    expect(updated.billingDay).toBe(20);
    expect(updated.createdAt).toBe(first.createdAt);
  });

  it("deletes a card from the list", () => {
    const a = upsertSavedCreditCard("user-1", { nickname: "A" });
    const b = upsertSavedCreditCard("user-1", { nickname: "B" });
    expect(loadSavedCreditCards("user-1")).toHaveLength(2);
    expect(deleteSavedCreditCard("user-1", a.id)).toBe(true);
    const left = loadSavedCreditCards("user-1");
    expect(left).toHaveLength(1);
    expect(left[0].id).toBe(b.id);
    expect(deleteSavedCreditCard("user-1", "missing")).toBe(false);
  });

  it("keeps cards isolated per user", () => {
    upsertSavedCreditCard("user-a", { nickname: "A" });
    upsertSavedCreditCard("user-b", { nickname: "B" });
    expect(loadSavedCreditCards("user-a")).toHaveLength(1);
    expect(loadSavedCreditCards("user-b")[0].nickname).toBe("B");
  });

  it("returns empty for missing user or invalid storage payloads", () => {
    expect(loadSavedCreditCards("")).toEqual([]);
    localStorage.setItem("finkoin_credit_cards_bad", "{not-json");
    expect(loadSavedCreditCards("bad")).toEqual([]);
    localStorage.setItem("finkoin_credit_cards_obj", JSON.stringify({ a: 1 }));
    expect(loadSavedCreditCards("obj")).toEqual([]);
    localStorage.setItem(
      "finkoin_credit_cards_mix",
      JSON.stringify([
        { id: "ok", nickname: "OK", last4: "1234", createdAt: "x" },
        { id: 1, nickname: "bad" },
        null,
      ]),
    );
    expect(loadSavedCreditCards("mix")).toHaveLength(1);
  });

  it("swallows localStorage write failures", () => {
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });
    expect(() =>
      saveCreditCards("user-1", [
        {
          id: "c1",
          nickname: "X",
          createdAt: new Date().toISOString(),
        },
      ]),
    ).not.toThrow();
    expect(() => dismissCreditCardBillReminder(2026, "July")).not.toThrow();
    spy.mockRestore();
  });
});

describe("summarizeCreditCardBills", () => {
  it("sums spend per card and ignores income / bill payments", () => {
    const bills = summarizeCreditCardBills([
      {
        amount: 500,
        bucket: "wants",
        payment_method: "credit_card::c1::HDFC ****1234",
      },
      {
        amount: 300,
        bucket: "needs",
        payment_method: "credit_card::c1::HDFC ****1234",
      },
      {
        amount: 200,
        bucket: "wants",
        payment_method: "credit_card::c2::SBI ****9999",
      },
      {
        amount: 1000,
        bucket: "income",
        payment_method: "credit_card::c1::HDFC ****1234",
      },
      {
        amount: 800,
        bucket: "loans",
        subcategory: "credit_card",
        payment_method: "upi",
      },
      { amount: 50, bucket: "wants", payment_method: "upi" },
      { amount: -20, bucket: "wants", payment_method: "card" },
      {
        amount: "bad" as unknown as number,
        bucket: "wants",
        payment_method: "card",
      },
    ]);

    expect(bills).toEqual([
      { cardId: "c1", label: "HDFC ****1234", amount: 800 },
      { cardId: "c2", label: "SBI ****9999", amount: 200 },
    ]);
  });

  it("groups generic card spend under Credit card", () => {
    const bills = summarizeCreditCardBills([
      { amount: 100, bucket: "wants", payment_method: "card" },
      { amount: 50, bucket: "needs", payment_method: "credit_card" },
    ]);
    expect(bills).toEqual([
      { cardId: "Credit card", label: "Credit card", amount: 150 },
    ]);
  });

  it("filters by statement window when provided", () => {
    const bills = summarizeCreditCardBills(
      [
        {
          amount: 100,
          bucket: "wants",
          payment_method: "credit_card::c1::HDFC",
          date: "2026-06-20",
        },
        {
          amount: 200,
          bucket: "wants",
          payment_method: "credit_card::c1::HDFC",
          date: "2026-07-10",
        },
        {
          amount: 50,
          bucket: "wants",
          payment_method: "credit_card::c1::HDFC",
          date: "2026-07-20",
        },
      ],
      {
        window: {
          start: new Date(2026, 5, 16),
          end: new Date(2026, 6, 15),
        },
      },
    );
    expect(bills).toEqual([
      {
        cardId: "c1",
        label: "HDFC",
        amount: 300,
        statementStart: "2026-06-16",
        statementEnd: "2026-07-15",
      },
    ]);
  });
});

describe("buildCreditCardPaySuggestions", () => {
  it("uses per-card statement window and due day", () => {
    const lines = buildCreditCardPaySuggestions({
      asOf: new Date(2026, 6, 26),
      cards: [
        {
          id: "c1",
          nickname: "HDFC",
          billingDay: 15,
          dueDay: 5,
          createdAt: "x",
        },
      ],
      transactions: [
        {
          amount: 400,
          bucket: "wants",
          payment_method: "credit_card::c1::HDFC",
          date: "2026-07-01",
        },
        {
          amount: 100,
          bucket: "wants",
          payment_method: "credit_card::c1::HDFC",
          date: "2026-07-20",
        },
      ],
    });
    expect(lines).toHaveLength(1);
    expect(lines[0].amount).toBe(400);
    expect(lines[0].dueDay).toBe(5);
    expect(lines[0].dueDate).toBe("2026-08-05");
  });
});

describe("credit card bill payment + carry-forward status", () => {
  it("detects bill payments and builds pay description with card id", () => {
    expect(
      isCreditCardBillPayment({
        bucket: "loans",
        subcategory: "credit_card",
      }),
    ).toBe(true);
    expect(
      isCreditCardBillPayment({
        bucket: "wants",
        subcategory: "credit_card",
      }),
    ).toBe(false);
    expect(creditCardBillPaymentDescription("HDFC", "c1")).toBe(
      "Pay bill · HDFC",
    );
    expect(creditCardBillPaymentDescription("Credit card", "Credit card")).toBe(
      "Pay bill · Credit card",
    );
  });

  it("marks orphan Credit card dues paid when Pay bill note matches", () => {
    const statuses = buildCreditCardBillStatuses({
      asOf: new Date(2026, 7, 10),
      cards: [],
      transactions: [
        {
          amount: 2500,
          bucket: "wants",
          payment_method: "credit_card",
          date: "2026-07-15",
        },
        {
          amount: 2500,
          bucket: "loans",
          subcategory: "credit_card",
          description: "Pay bill · Credit card",
          payment_method: "upi",
          date: "2026-08-04",
        },
      ],
    });
    const due = statuses.find((s) => s.status === "due");
    const paid = statuses.find((s) => s.status === "paid");
    // Statement-window orphan may still list; at least one paid row for the settle.
    expect(
      paid || statuses.some((s) => s.paid >= 2500 && s.remaining === 0),
    ).toBeTruthy();
    if (paid) {
      expect(paid.remaining).toBe(0);
      expect(paid.status).toBe("paid");
    }
    expect(due == null || due.remaining < 2500).toBe(true);
  });

  it("includes this-month card purchases in dues (not only last month)", () => {
    const card = {
      id: "c1",
      nickname: "HDFC",
      billingDay: 15,
      dueDay: 5,
      createdAt: "x",
    };
    const statuses = buildCreditCardBillStatuses({
      asOf: new Date(2026, 7, 10), // August
      cards: [card],
      previousMonthChargesOnly: false,
      transactions: [
        {
          amount: 700,
          bucket: "needs",
          subcategory: "groceries",
          payment_method: "credit_card::c1::HDFC",
          date: "2026-08-08",
        },
      ],
    });
    expect(statuses[0].charged).toBe(700);
    expect(statuses[0].remaining).toBe(700);
    expect(statuses[0].status).toBe("due");
  });

  it("marks paid when bill payment covers charges; else carries remaining", () => {
    const card = {
      id: "c1",
      nickname: "HDFC",
      billingDay: 15,
      dueDay: 5,
      createdAt: "x",
    };

    const due = buildCreditCardBillStatuses({
      asOf: new Date(2026, 7, 10), // Aug 10 — past Aug 5 due
      cards: [card],
      transactions: [
        {
          amount: 1000,
          bucket: "wants",
          payment_method: "credit_card::c1::HDFC",
          date: "2026-07-01",
        },
      ],
    });
    expect(due[0].status).toBe("due");
    expect(due[0].remaining).toBe(1000);
    expect(due[0].overdue).toBe(true);

    const paid = buildCreditCardBillStatuses({
      asOf: new Date(2026, 7, 10),
      cards: [card],
      transactions: [
        {
          amount: 1000,
          bucket: "wants",
          payment_method: "credit_card::c1::HDFC",
          date: "2026-07-01",
        },
        {
          amount: 1000,
          bucket: "loans",
          subcategory: "credit_card",
          description: "Pay bill · HDFC",
          payment_method: "upi",
          date: "2026-08-04",
        },
      ],
    });
    expect(paid[0].status).toBe("paid");
    expect(paid[0].remaining).toBe(0);
    expect(paid[0].paid).toBe(1000);

    const partial = buildCreditCardBillStatuses({
      asOf: new Date(2026, 7, 10),
      cards: [card],
      transactions: [
        {
          amount: 1000,
          bucket: "wants",
          payment_method: "credit_card::c1::HDFC",
          date: "2026-07-01",
        },
        {
          amount: 400,
          bucket: "loans",
          subcategory: "credit_card",
          description: "Pay bill · HDFC",
          payment_method: "upi",
          date: "2026-08-04",
        },
      ],
    });
    expect(partial[0].status).toBe("due");
    expect(partial[0].remaining).toBe(600);
  });

  it("getMostRecentDueDate is on/before asOf", () => {
    const d = getMostRecentDueDate(5, new Date(2026, 7, 10));
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(7);
    expect(d?.getDate()).toBe(5);
  });
});

describe("credit card bill dismiss", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("tracks dismissal per month", () => {
    expect(isCreditCardBillDismissed(2026, "July")).toBe(false);
    dismissCreditCardBillReminder(2026, "July");
    expect(isCreditCardBillDismissed(2026, "July")).toBe(true);
    expect(isCreditCardBillDismissed(2026, "August")).toBe(false);
  });

  it("returns false when localStorage get throws", () => {
    const spy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    expect(isCreditCardBillDismissed(2026, "July")).toBe(false);
    spy.mockRestore();
  });
});

describe("tracker consent local helper", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("only accepts current consent version", () => {
    expect(hasTrackerConsentLocal()).toBe(false);
    localStorage.setItem("finkoin_tracker_consent", "v1");
    expect(hasTrackerConsentLocal()).toBe(false);
    setTrackerConsentLocal();
    expect(hasTrackerConsentLocal()).toBe(true);
    expect(localStorage.getItem("finkoin_tracker_consent")).toBe(
      TRACKER_CONSENT_VERSION,
    );
  });
});

describe("creditCardObligationTitle", () => {
  it("prefixes nickname for obligation sync / cron reminders", () => {
    expect(creditCardObligationTitle("HDFC Millennia")).toBe(
      "CC · HDFC Millennia",
    );
    expect(creditCardObligationTitle("  ")).toBe("CC · Credit card");
  });
});

describe("hide credit card due lines", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("hides a due line id for the user", () => {
    expect(isCreditCardDueLineHidden("u1", "c1")).toBe(false);
    hideCreditCardDueLine("u1", "c1");
    expect(isCreditCardDueLineHidden("u1", "c1")).toBe(true);
    expect(loadHiddenCreditCardDueIds("u1")).toEqual(["c1"]);
  });
});

describe("buildCreditCardPaySuggestions orphans", () => {
  it("includes previous-month spend for unknown cards", () => {
    const lines = buildCreditCardPaySuggestions({
      asOf: new Date(2026, 6, 10), // July
      cards: [],
      transactions: [
        {
          amount: 250,
          bucket: "wants",
          payment_method: "credit_card::orphan::Mystery",
          date: "2026-06-12",
        },
      ],
    });
    expect(lines.some((l) => l.cardId === "orphan" && l.amount === 250)).toBe(
      true,
    );
  });
});
