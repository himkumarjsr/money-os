import { describe, expect, it } from "vitest";
import {
  buildObligationReminderCopy,
  daysUntilMonthlyDueDay,
  obligationReminderEmoji,
  shouldSendObligationReminder,
} from "./obligationReminders";

describe("daysUntilMonthlyDueDay", () => {
  it("counts same-month due days", () => {
    expect(daysUntilMonthlyDueDay(26, new Date(2026, 6, 23))).toBe(3); // Jul
    expect(daysUntilMonthlyDueDay(23, new Date(2026, 6, 23))).toBe(0);
  });

  it("wraps into next month for early due days", () => {
    // Jul 26 → next due day 5 is Aug 5 = 10 days
    expect(daysUntilMonthlyDueDay(5, new Date(2026, 6, 26))).toBe(10);
    // Aug 2 → due day 5 = 3 days (remind_days_before: 3 should fire)
    expect(daysUntilMonthlyDueDay(5, new Date(2026, 7, 2))).toBe(3);
  });
});

describe("shouldSendObligationReminder", () => {
  it("fires monthly when exactly remind_days_before away (incl. month wrap)", () => {
    expect(
      shouldSendObligationReminder(
        {
          title: "CC · HDFC",
          frequency: "monthly",
          due_day: 5,
          remind_days_before: 3,
          category: "credit_card",
        },
        new Date(2026, 7, 2), // Aug 2
      ),
    ).toBe(true);

    expect(
      shouldSendObligationReminder(
        {
          title: "CC · HDFC",
          frequency: "monthly",
          due_day: 5,
          remind_days_before: 3,
        },
        new Date(2026, 6, 26), // Jul 26 — 10 days out
      ),
    ).toBe(false);
  });

  it("fires yearly in the due month window", () => {
    expect(
      shouldSendObligationReminder(
        {
          title: "Term insurance",
          frequency: "yearly",
          due_day: 15,
          due_month: 3,
          remind_days_before: 14,
          category: "insurance_life",
        },
        new Date(2026, 2, 1), // Mar 1 → 14 days to Mar 15
      ),
    ).toBe(true);
  });
});

describe("reminder copy + emoji", () => {
  it("uses card emoji and tracker hint when amount is 0", () => {
    expect(obligationReminderEmoji("credit_card")).toBe("💳");
    const copy = buildObligationReminderCopy(
      {
        title: "CC · HDFC",
        amount: 0,
        frequency: "monthly",
        due_day: 5,
        category: "credit_card",
      },
      3,
    );
    expect(copy.title).toBe("CC · HDFC due in 3 days");
    expect(copy.content).toContain("Check Tracker");
  });

  it("includes amount when known", () => {
    const copy = buildObligationReminderCopy(
      {
        title: "CC · HDFC",
        amount: 4200,
        frequency: "monthly",
        due_day: 5,
      },
      3,
    );
    expect(copy.content).toContain("₹4,200");
  });
});
