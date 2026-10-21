import { describe, expect, it } from "vitest";
import {
  BILL_CATEGORIES,
  billCategoryEmoji,
  billsByDay,
  buildBillsMonth,
  clampBillsMonth,
  monthOf,
  defaultRemindDaysFor,
  endMonthAfter,
  monthsLeftUntil,
  describeSchedule,
  isAmountOptionalCategory,
  monthGrid,
  nextObligationDueDate,
  obligationDueDateInMonth,
  obligationNeedsDate,
  type BillObligation,
} from "@/lib/billsCalendar";

const ob = (o: Partial<BillObligation>): BillObligation => ({
  id: o.id ?? "ob1",
  title: o.title ?? "Bill",
  category: o.category ?? "other",
  amount: o.amount ?? 1000,
  frequency: o.frequency ?? "monthly",
  due_day: "due_day" in o ? o.due_day : 5,
  due_month: o.due_month ?? null,
  due_date: o.due_date ?? null,
  is_active: o.is_active ?? true,
  start_month: o.start_month ?? null,
});

describe("obligationDueDateInMonth", () => {
  it("monthly clamps the day to the month length", () => {
    expect(obligationDueDateInMonth(ob({ due_day: 31 }), 2026, 1)).toEqual(
      new Date(2026, 1, 28),
    );
    expect(obligationDueDateInMonth(ob({ due_day: null }), 2026, 3)).toEqual(
      new Date(2026, 3, 1),
    );
  });

  it("quarterly without a first month matches the checklist SQL (Mar/Jun/Sep/Dec)", () => {
    const q = ob({ frequency: "quarterly", due_day: 10 });
    const months = Array.from({ length: 12 }, (_, m) =>
      obligationDueDateInMonth(q, 2026, m) ? m + 1 : null,
    ).filter(Boolean);
    expect(months).toEqual([3, 6, 9, 12]);
  });

  it("quarterly and half-yearly repeat from the first due month", () => {
    const q = ob({ frequency: "quarterly", due_month: 2 });
    const qMonths = Array.from({ length: 12 }, (_, m) =>
      obligationDueDateInMonth(q, 2026, m) ? m + 1 : null,
    ).filter(Boolean);
    expect(qMonths).toEqual([2, 5, 8, 11]);

    const h = ob({ frequency: "half_yearly", due_month: 4 });
    const hMonths = Array.from({ length: 12 }, (_, m) =>
      obligationDueDateInMonth(h, 2026, m) ? m + 1 : null,
    ).filter(Boolean);
    expect(hMonths).toEqual([4, 10]);
  });

  it("yearly lands only in its month; one-time only on its date", () => {
    const y = ob({ frequency: "yearly", due_month: 10, due_day: 1 });
    expect(obligationDueDateInMonth(y, 2026, 9)).toEqual(new Date(2026, 9, 1));
    expect(obligationDueDateInMonth(y, 2026, 8)).toBeNull();

    const once = ob({ frequency: "one_time", due_date: "2027-01-15" });
    expect(obligationDueDateInMonth(once, 2027, 0)).toEqual(
      new Date(2027, 0, 15),
    );
    expect(obligationDueDateInMonth(once, 2026, 0)).toBeNull();
  });

  it("flags yearly without a month and one-time without a date", () => {
    expect(obligationNeedsDate(ob({ frequency: "yearly" }))).toBe(true);
    expect(obligationNeedsDate(ob({ frequency: "one_time" }))).toBe(true);
    expect(obligationNeedsDate(ob({ frequency: "yearly", due_month: 3 }))).toBe(
      false,
    );
    expect(obligationNeedsDate(ob({ frequency: "monthly" }))).toBe(false);
  });
});

describe("nextObligationDueDate", () => {
  it("finds the next occurrence on or after today", () => {
    const today = new Date(2026, 9, 15);
    expect(nextObligationDueDate(ob({ due_day: 15 }), today)).toEqual(today);
    expect(nextObligationDueDate(ob({ due_day: 5 }), today)).toEqual(
      new Date(2026, 10, 5),
    );
    expect(
      nextObligationDueDate(
        ob({ frequency: "half_yearly", due_month: 1, due_day: 1 }),
        today,
      ),
    ).toEqual(new Date(2027, 0, 1));
    expect(
      nextObligationDueDate(
        ob({ frequency: "one_time", due_date: "2026-10-01" }),
        today,
      ),
    ).toBeNull();
  });
});

describe("buildBillsMonth", () => {
  const today = new Date(2026, 9, 15); // 15 Oct 2026

  it("marks paid, skipped, overdue and due from the checklist", () => {
    const month = buildBillsMonth({
      year: 2026,
      monthIndex: 9,
      today,
      obligations: [
        ob({ id: "a", title: "Rent", due_day: 1, amount: 20000 }),
        ob({ id: "b", title: "Netflix", due_day: 3, amount: 649 }),
        ob({ id: "c", title: "Electricity", due_day: 10, amount: 1800 }),
        ob({ id: "d", title: "SIP", due_day: 20, amount: 5000 }),
      ],
      checklist: [
        {
          id: "r1",
          obligation_id: "a",
          checklist_month: "2026-10-01",
          status: "paid",
          paid_amount: 20000,
        },
        {
          id: "r2",
          obligation_id: "b",
          checklist_month: "2026-10-01",
          status: "skipped",
        },
        {
          id: "r9",
          obligation_id: "d",
          checklist_month: "2026-09-01",
          status: "paid",
        },
      ],
    });
    const byTitle = Object.fromEntries(
      month.items.map((i) => [i.title, i.status]),
    );
    expect(byTitle).toEqual({
      Rent: "paid",
      Netflix: "skipped",
      Electricity: "overdue",
      SIP: "due",
    });
    expect(month.items.map((i) => i.day)).toEqual([1, 3, 10, 20]);
    expect(month.items[0].checklistId).toBe("r1");
    expect(month.totals).toEqual({
      total: 26800,
      paid: 20000,
      pending: 6800,
      overdue: 1800,
      overdueCount: 1,
      dueCount: 1,
    });
  });

  it("doesn't call old months overdue when nothing was ever recorded", () => {
    const month = buildBillsMonth({
      year: 2026,
      monthIndex: 5,
      today,
      obligations: [ob({ id: "a", due_day: 5 })],
      checklist: [],
    });
    expect(month.items[0].status).toBe("info");
    expect(month.totals.total).toBe(0);

    const withRow = buildBillsMonth({
      year: 2026,
      monthIndex: 5,
      today,
      obligations: [ob({ id: "a", due_day: 5 })],
      checklist: [
        {
          id: "r",
          obligation_id: "a",
          checklist_month: "2026-06-01",
          status: "pending",
        },
      ],
    });
    expect(withRow.items[0].status).toBe("overdue");
  });

  it("skips closed obligations and card-bill obligations, lists undated ones", () => {
    const month = buildBillsMonth({
      year: 2026,
      monthIndex: 9,
      today,
      obligations: [
        ob({ id: "x", is_active: false }),
        ob({ id: "cc", category: "credit_card" }),
        ob({ id: "y", title: "LIC", frequency: "yearly", due_month: null }),
      ],
    });
    expect(month.items).toEqual([]);
    expect(month.undated.map((o) => o.title)).toEqual(["LIC"]);
  });

  it("adds card due days and policy renewals, without duplicating insurance obligations", () => {
    const month = buildBillsMonth({
      year: 2026,
      monthIndex: 9,
      today,
      obligations: [
        ob({
          id: "h",
          title: "Niva Bupa health",
          category: "insurance_health",
          frequency: "yearly",
          due_month: 10,
          due_day: 1,
          amount: 24000,
        }),
      ],
      cards: [
        { id: "c1", nickname: "HDFC", last4: "1234", dueDay: 18 },
        { id: "c2", nickname: "No due day" },
      ],
      policies: [
        {
          id: "p1",
          insurerName: "Niva Bupa",
          premiumAmount: 24000,
          renewalDate: "2025-10-01",
          status: "active",
        },
        {
          id: "p2",
          insurerName: "HDFC Life",
          planName: "Click 2 Protect",
          premiumAmount: 15000,
          renewalDate: "2027-10-28",
          status: "active",
        },
        {
          id: "p3",
          insurerName: "Old",
          premiumAmount: 1,
          renewalDate: "2026-10-05",
          status: "expired",
        },
      ],
    });
    expect(month.items.map((i) => [i.kind, i.title, i.day, i.status])).toEqual([
      ["obligation", "Niva Bupa health", 1, "overdue"],
      ["card", "HDFC ••1234 bill", 18, "due"],
      ["policy", "HDFC Life Click 2 Protect renewal", 28, "due"],
    ]);
    const card = month.items.find((i) => i.kind === "card");
    expect(card?.amount).toBeNull();
    expect(month.totals.total).toBe(24000 + 15000);
  });
});

describe("grid + labels", () => {
  it("pads the grid to whole Monday-first weeks", () => {
    // 1 Oct 2026 is a Thursday.
    const cells = monthGrid(2026, 9);
    expect(cells.slice(0, 4)).toEqual([null, null, null, 1]);
    expect(cells.length % 7).toBe(0);
    expect(cells.filter((c) => c != null)).toHaveLength(31);
  });

  it("groups items by day", () => {
    const month = buildBillsMonth({
      year: 2026,
      monthIndex: 9,
      today: new Date(2026, 9, 1),
      obligations: [
        ob({ id: "a", title: "A", due_day: 5 }),
        ob({ id: "b", title: "B", due_day: 5 }),
      ],
    });
    expect(
      billsByDay(month.items)
        .get(5)
        ?.map((i) => i.title),
    ).toEqual(["A", "B"]);
  });

  it("describes schedules in plain words", () => {
    expect(describeSchedule(ob({ due_day: 1 }))).toBe("Every month on the 1st");
    expect(
      describeSchedule(
        ob({ frequency: "quarterly", due_month: 1, due_day: 22 }),
      ),
    ).toBe("Every 3 months from Jan, on the 22nd");
    expect(
      describeSchedule(ob({ frequency: "yearly", due_month: 3, due_day: 15 })),
    ).toBe("Every year on 15 Mar");
    expect(
      describeSchedule(ob({ frequency: "one_time", due_date: "2027-02-11" })),
    ).toBe("Once, on 11 Feb");
  });

  it("knows its categories", () => {
    const values = BILL_CATEGORIES.map((c) => c.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values).toEqual(
      expect.arrayContaining([
        "loan_emi",
        "insurance_life",
        "investment_sip",
        "rent",
        "subscription",
        "other",
      ]),
    );
    expect(billCategoryEmoji("bill_electricity")).toBe("⚡");
    expect(billCategoryEmoji("credit_card")).toBe("💳");
    expect(billCategoryEmoji("unknown_thing")).toBe("📌");
    expect(isAmountOptionalCategory("document_expiry")).toBe(true);
    expect(isAmountOptionalCategory("rent")).toBe(false);
    expect(defaultRemindDaysFor("document_expiry")).toBe(30);
    expect(defaultRemindDaysFor("rent")).toBe(7);
  });
});

describe("end_month", () => {
  const rd = {
    frequency: "monthly",
    due_day: 5,
    due_month: null,
    due_date: null,
    end_month: "2027-01-01",
  };

  it("stops an obligation after its last month", () => {
    expect(obligationDueDateInMonth(rd, 2027, 0)).not.toBeNull();
    expect(obligationDueDateInMonth(rd, 2027, 1)).toBeNull();
    expect(nextObligationDueDate(rd, new Date(2027, 0, 20))).toBeNull();
  });

  it("converts between months left and the end month", () => {
    const oct = new Date(2026, 9, 16);
    expect(endMonthAfter(4, oct)).toBe("2027-01-01");
    expect(endMonthAfter(1, oct)).toBe("2026-10-01");
    expect(endMonthAfter(0, oct)).toBeNull();
    expect(monthsLeftUntil("2027-01-01", oct)).toBe(4);
    expect(monthsLeftUntil("2026-01-01", oct)).toBe(0);
    expect(monthsLeftUntil(null, oct)).toBeNull();
  });
});

describe("start month and join limit", () => {
  it("doesn't show a bill in months before it was added", () => {
    const emi = ob({
      frequency: "monthly",
      due_day: 5,
      start_month: "2026-10-01",
    });
    expect(obligationDueDateInMonth(emi, 2026, 8)).toBeNull();
    expect(obligationDueDateInMonth(emi, 2026, 9)).not.toBeNull();
    const month = buildBillsMonth({
      year: 2026,
      monthIndex: 8,
      today: new Date(2026, 9, 21),
      obligations: [emi],
    });
    expect(month.items).toHaveLength(0);
  });

  it("keeps a one-time bill on its own date", () => {
    const once = ob({
      frequency: "one_time",
      due_date: "2026-08-10",
      start_month: "2026-10-01",
    });
    expect(obligationDueDateInMonth(once, 2026, 7)).not.toBeNull();
  });

  it("clamps the calendar to the join month", () => {
    const today = new Date(2026, 9, 21);
    expect(clampBillsMonth(2025, 0, "2026-03-01", today)).toEqual({
      year: 2026,
      monthIndex: 2,
    });
    expect(clampBillsMonth(2026, 5, "2026-03-01", today)).toEqual({
      year: 2026,
      monthIndex: 5,
    });
    expect(clampBillsMonth(2024, 0, null, today)).toEqual({
      year: 2024,
      monthIndex: 0,
    });
  });

  it("reads the month from a timestamp", () => {
    expect(monthOf("2026-03-15T10:00:00Z")).toBe("2026-03-01");
    expect(monthOf(null)).toBeNull();
  });
});
