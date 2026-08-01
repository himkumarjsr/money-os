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

  it("rejects invalid remind_days_before and unknown frequency", () => {
    expect(
      shouldSendObligationReminder({
        title: "X",
        frequency: "monthly",
        due_day: 1,
        remind_days_before: -1,
      }),
    ).toBe(false);
    expect(
      shouldSendObligationReminder({
        title: "X",
        frequency: "weekly",
        due_day: 1,
      }),
    ).toBe(false);
  });

  it("wraps Dec → Jan for monthly due day", () => {
    expect(daysUntilMonthlyDueDay(5, new Date(2026, 11, 28))).toBe(8); // Dec 28 → Jan 5
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

  it("yearly skips months outside due/prev window", () => {
    expect(
      shouldSendObligationReminder(
        {
          title: "Term",
          frequency: "yearly",
          due_day: 15,
          due_month: 3,
          remind_days_before: 14,
        },
        new Date(2026, 5, 1), // June
      ),
    ).toBe(false);
  });

  it("yearly allows prior month (Jan for Feb due)", () => {
    expect(
      shouldSendObligationReminder(
        {
          title: "LIC",
          frequency: "yearly",
          due_day: 10,
          due_month: 2,
          remind_days_before: 20,
        },
        new Date(2026, 0, 21), // Jan 21 → 20 days to Feb 10
      ),
    ).toBe(true);
  });

  it("yearly without due_month uses monthly day distance", () => {
    expect(
      shouldSendObligationReminder(
        {
          title: "SIP",
          frequency: "yearly",
          due_day: 5,
          remind_days_before: 3,
        },
        new Date(2026, 7, 2),
      ),
    ).toBe(true);
  });

  it("yearly rolls to next year when today is after due month", () => {
    expect(
      shouldSendObligationReminder(
        {
          title: "Tax",
          frequency: "yearly",
          due_day: 15,
          due_month: 1,
          remind_days_before: 14,
        },
        new Date(2026, 11, 18), // Dec 18 → Jan 15 next year = 28 days?
        // Dec 18 to Jan 15 = 28 days — not 14
      ),
    ).toBe(false);
    expect(
      shouldSendObligationReminder(
        {
          title: "Tax",
          frequency: "yearly",
          due_day: 1,
          due_month: 1,
          remind_days_before: 14,
        },
        new Date(2026, 11, 18), // Dec 18 → Jan 1 = 14 days
      ),
    ).toBe(true);
  });
});

describe("reminder copy + emoji", () => {
  it("uses card emoji and tracker hint when amount is 0", () => {
    expect(obligationReminderEmoji("credit_card")).toBe("💳");
    expect(obligationReminderEmoji("credit_line")).toBe("💳");
    expect(obligationReminderEmoji("insurance_health")).toBe("🛡️");
    expect(obligationReminderEmoji("loan_emi")).toBe("🏦");
    expect(obligationReminderEmoji("investment_sip")).toBe("📈");
    expect(obligationReminderEmoji("rent")).toBe("📌");
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

  it("uses singular day and month/dash due labels", () => {
    expect(
      buildObligationReminderCopy(
        { title: "Rent", frequency: "monthly", due_day: 1, amount: 100 },
        1,
      ).title,
    ).toBe("Rent due in 1 day");
    expect(
      buildObligationReminderCopy(
        { title: "Tax", frequency: "yearly", due_month: 3, amount: 0 },
        7,
      ).content,
    ).toContain("month 3");
    expect(
      buildObligationReminderCopy(
        { title: "X", frequency: "monthly", amount: 0 },
        2,
      ).content,
    ).toContain("due on —");
  });
});
