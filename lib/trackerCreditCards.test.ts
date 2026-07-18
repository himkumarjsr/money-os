import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  dismissCreditCardBillReminder,
  displayPaymentMethod,
  encodeCreditCardPaymentMethod,
  formatCreditCardLabel,
  isCreditCardBillDismissed,
  isCreditCardPaymentMethod,
  loadSavedCreditCards,
  parseCreditCardPaymentMethod,
  saveCreditCards,
  summarizeCreditCardBills,
  upsertSavedCreditCard,
} from "./trackerCreditCards";

describe("credit card payment method encoding", () => {
  it("formats and encodes card labels", () => {
    expect(
      formatCreditCardLabel({ nickname: "HDFC Millennia", last4: "1234" }),
    ).toBe("HDFC Millennia ****1234");
    expect(formatCreditCardLabel({ nickname: "  ", last4: "12ab34" })).toBe(
      "Credit card ****1234",
    );
    expect(formatCreditCardLabel({ nickname: "Amex", last4: "" })).toBe("Amex");
    expect(
      encodeCreditCardPaymentMethod({
        id: "card-1",
        nickname: "HDFC|Prime",
        last4: "9999",
      }),
    ).toBe("credit_card::card-1::HDFC/Prime ****9999");
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
    expect(displayPaymentMethod("cheque")).toBe("cheque");
    expect(displayPaymentMethod(null)).toBe("—");
  });
});

describe("saved credit cards localStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("upserts and reloads cards for a user", () => {
    const card = upsertSavedCreditCard("user-1", {
      nickname: "Axis Ace",
      last4: "7788",
    });
    expect(card.nickname).toBe("Axis Ace");
    expect(card.last4).toBe("7788");

    const loaded = loadSavedCreditCards("user-1");
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(card.id);
  });

  it("dedupes by nickname + last4", () => {
    const first = upsertSavedCreditCard("user-1", {
      nickname: "HDFC",
      last4: "1111",
    });
    const second = upsertSavedCreditCard("user-1", {
      nickname: "hdfc",
      last4: "1111",
    });
    expect(second.id).toBe(first.id);
    expect(loadSavedCreditCards("user-1")).toHaveLength(1);
  });

  it("updates an existing card by id", () => {
    const first = upsertSavedCreditCard("user-1", {
      nickname: "Old",
      last4: "1111",
    });
    const updated = upsertSavedCreditCard("user-1", {
      id: first.id,
      nickname: "New Nick",
      last4: "2222",
    });
    expect(updated.id).toBe(first.id);
    expect(updated.nickname).toBe("New Nick");
    expect(updated.last4).toBe("2222");
    expect(updated.createdAt).toBe(first.createdAt);
  });

  it("keeps cards isolated per user", () => {
    upsertSavedCreditCard("user-a", { nickname: "A", last4: "0001" });
    upsertSavedCreditCard("user-b", { nickname: "B", last4: "0002" });
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
          last4: "1111",
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
