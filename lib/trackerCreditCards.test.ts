import { beforeEach, describe, expect, it } from "vitest";
import {
  dismissCreditCardBillReminder,
  displayPaymentMethod,
  encodeCreditCardPaymentMethod,
  formatCreditCardLabel,
  isCreditCardBillDismissed,
  isCreditCardPaymentMethod,
  loadSavedCreditCards,
  parseCreditCardPaymentMethod,
  summarizeCreditCardBills,
  upsertSavedCreditCard,
} from "./trackerCreditCards";

describe("credit card payment method encoding", () => {
  it("formats and encodes card labels", () => {
    expect(
      formatCreditCardLabel({ nickname: "HDFC Millennia", last4: "1234" }),
    ).toBe("HDFC Millennia ****1234");
    expect(
      encodeCreditCardPaymentMethod({
        id: "card-1",
        nickname: "HDFC",
        last4: "9999",
      }),
    ).toBe("credit_card::card-1::HDFC ****9999");
  });

  it("detects credit card payment methods", () => {
    expect(isCreditCardPaymentMethod("card")).toBe(true);
    expect(isCreditCardPaymentMethod("credit_card")).toBe(true);
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
    expect(displayPaymentMethod("credit_card::abc::SBI ****4321")).toBe(
      "SBI ****4321",
    );
    expect(displayPaymentMethod("upi")).toBe("UPI");
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

  it("keeps cards isolated per user", () => {
    upsertSavedCreditCard("user-a", { nickname: "A", last4: "0001" });
    upsertSavedCreditCard("user-b", { nickname: "B", last4: "0002" });
    expect(loadSavedCreditCards("user-a")).toHaveLength(1);
    expect(loadSavedCreditCards("user-b")[0].nickname).toBe("B");
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
    ]);

    expect(bills).toEqual([
      { cardId: "c1", label: "HDFC ****1234", amount: 800 },
      { cardId: "c2", label: "SBI ****9999", amount: 200 },
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
});
