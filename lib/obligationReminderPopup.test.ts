import { readFileSync } from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { isPopupNotificationRelevant } from "./obligationReminderPopup";
import {
  checklistMonthFor,
  isObligationReminderRelevant,
  obligationReminderDueDate,
  obligationTitleFromReminder,
  shouldSendObligationReminder,
} from "./obligationReminders";

type Row = Record<string, unknown>;

/** Minimal query-builder fake: eq / in filters, limit, awaited result. */
function fakeSupabase(tables: Record<string, Row[]>): SupabaseClient {
  const query = (rows: Row[]) => {
    let out = rows;
    const builder = {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        out = out.filter((r) => r[col] === val);
        return builder;
      },
      gte: (col: string, val: string) => {
        out = out.filter((r) => String(r[col]) >= val);
        return builder;
      },
      lte: (col: string, val: string) => {
        out = out.filter((r) => String(r[col]) <= val);
        return builder;
      },
      in: (col: string, vals: unknown[]) => {
        out = out.filter((r) => vals.includes(r[col]));
        return builder;
      },
      limit: (n: number) => {
        out = out.slice(0, n);
        return builder;
      },
      then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
        resolve({ data: out, error: null }),
    };
    return builder;
  };
  return {
    from: (table: string) => query(tables[table] ?? []),
  } as unknown as SupabaseClient;
}

const USER = "u1";
const nivaBupa = {
  id: "ob-niva",
  user_id: USER,
  title: "Niva Bupa",
  frequency: "yearly",
  due_day: null,
  due_month: 10,
  is_active: true,
};
const reminder = {
  title: "Niva Bupa due in 7 days",
  category: "obligation_reminder",
  created_at: new Date(2026, 8, 24, 9).toISOString(),
};

describe("obligation reminder helpers", () => {
  it("resolves the due date a reminder points at", () => {
    expect(obligationReminderDueDate(nivaBupa, new Date(2026, 8, 24))).toEqual(
      new Date(2026, 9, 1),
    );
    expect(
      obligationReminderDueDate(
        { frequency: "monthly", due_day: 5 },
        new Date(2026, 6, 26),
      ),
    ).toEqual(new Date(2026, 7, 5));
    expect(
      obligationReminderDueDate({ frequency: "quarterly" }, new Date()),
    ).toBeNull();
    expect(checklistMonthFor(new Date(2026, 9, 1))).toBe("2026-10-01");
  });

  it("sends the yearly Niva Bupa reminder 7 days before 1 Oct", () => {
    expect(shouldSendObligationReminder(nivaBupa, new Date(2026, 8, 24))).toBe(
      true,
    );
    expect(shouldSendObligationReminder(nivaBupa, new Date(2026, 9, 7))).toBe(
      false,
    );
  });

  it("parses the obligation title out of reminder titles", () => {
    expect(obligationTitleFromReminder("Niva Bupa due in 7 days")).toBe(
      "Niva Bupa",
    );
    expect(obligationTitleFromReminder("CC · HDFC due in 1 day")).toBe(
      "CC · HDFC",
    );
    expect(obligationTitleFromReminder("Good morning tip")).toBeNull();
  });

  it("drops reminders that are settled, closed or past due", () => {
    const now = new Date(2026, 9, 7);
    const upcoming = new Date(2026, 9, 10);
    expect(
      isObligationReminderRelevant({
        active: true,
        dueDate: upcoming,
        settled: false,
        now,
      }),
    ).toBe(true);
    expect(
      isObligationReminderRelevant({
        active: true,
        dueDate: upcoming,
        settled: true,
        now,
      }),
    ).toBe(false);
    expect(
      isObligationReminderRelevant({
        active: false,
        dueDate: upcoming,
        settled: false,
        now,
      }),
    ).toBe(false);
    expect(
      isObligationReminderRelevant({
        active: true,
        dueDate: new Date(2026, 9, 1),
        settled: false,
        now,
      }),
    ).toBe(false);
    expect(
      isObligationReminderRelevant({
        active: true,
        dueDate: now,
        settled: false,
        now,
      }),
    ).toBe(true);
  });
});

describe("isPopupNotificationRelevant", () => {
  it("hides the Niva Bupa reminder once October is paid", async () => {
    const supabase = fakeSupabase({
      financial_obligations: [nivaBupa],
      obligation_checklist: [
        {
          user_id: USER,
          obligation_id: "ob-niva",
          checklist_month: "2026-10-01",
          status: "paid",
        },
      ],
    });
    // Before the due date, a paid cycle alone is enough to hide it.
    expect(
      await isPopupNotificationRelevant(
        supabase,
        USER,
        reminder,
        new Date(2026, 8, 28),
      ),
    ).toBe(false);
  });

  it("hides it when a tracker expense names the bill at a new amount", async () => {
    const supabase = fakeSupabase({
      financial_obligations: [nivaBupa],
      expense_transactions: [
        {
          user_id: USER,
          date: "2026-09-27",
          amount: 21607,
          bucket: "needs",
          description: "Niva Bupa renewal",
        },
      ],
    });
    expect(
      await isPopupNotificationRelevant(
        supabase,
        USER,
        reminder,
        new Date(2026, 8, 28),
      ),
    ).toBe(false);
  });

  it("ignores expenses with a different name or outside the cycle", async () => {
    const supabase = fakeSupabase({
      financial_obligations: [nivaBupa],
      expense_transactions: [
        {
          user_id: USER,
          date: "2026-09-27",
          bucket: "needs",
          description: "Groceries",
        },
        {
          user_id: USER,
          date: "2025-10-03",
          bucket: "needs",
          description: "Niva Bupa",
        },
      ],
    });
    expect(
      await isPopupNotificationRelevant(
        supabase,
        USER,
        reminder,
        new Date(2026, 8, 28),
      ),
    ).toBe(true);
  });

  it("hides a monthly EMI reminder once that month is marked paid", async () => {
    const emi = {
      id: "ob-icici",
      user_id: USER,
      title: "ICICI LOAN EMI",
      frequency: "monthly",
      due_day: 5,
      due_month: null,
      is_active: true,
    };
    const emiReminder = {
      title: "ICICI LOAN EMI due in 7 days",
      category: "obligation_reminder",
      created_at: new Date(2026, 8, 28, 9).toISOString(),
    };
    const supabase = fakeSupabase({
      financial_obligations: [emi],
      obligation_checklist: [
        {
          user_id: USER,
          obligation_id: "ob-icici",
          checklist_month: "2026-10-01",
          status: "paid",
        },
      ],
    });
    for (const now of [new Date(2026, 9, 3), new Date(2026, 9, 7)]) {
      expect(
        await isPopupNotificationRelevant(supabase, USER, emiReminder, now),
      ).toBe(false);
    }
  });

  it("hides a reminder whose due date has passed even if unpaid", async () => {
    const supabase = fakeSupabase({ financial_obligations: [nivaBupa] });
    expect(
      await isPopupNotificationRelevant(
        supabase,
        USER,
        reminder,
        new Date(2026, 9, 7),
      ),
    ).toBe(false);
  });

  it("keeps an unpaid reminder before its due date", async () => {
    const supabase = fakeSupabase({
      financial_obligations: [nivaBupa],
      obligation_checklist: [
        {
          user_id: USER,
          obligation_id: "ob-niva",
          checklist_month: "2026-10-01",
          status: "pending",
        },
      ],
    });
    expect(
      await isPopupNotificationRelevant(
        supabase,
        USER,
        reminder,
        new Date(2026, 8, 26),
      ),
    ).toBe(true);
  });

  it("hides reminders for closed obligations", async () => {
    const supabase = fakeSupabase({
      financial_obligations: [{ ...nivaBupa, is_active: false }],
    });
    expect(
      await isPopupNotificationRelevant(
        supabase,
        USER,
        reminder,
        new Date(2026, 8, 26),
      ),
    ).toBe(false);
  });

  it("leaves other notification types alone", async () => {
    const supabase = fakeSupabase({});
    expect(
      await isPopupNotificationRelevant(supabase, USER, {
        title: "Morning tip",
        category: "tip",
        created_at: new Date().toISOString(),
      }),
    ).toBe(true);
  });
});

describe("mobile keeps byte-identical reminder logic", () => {
  it.each([
    "obligationReminders.ts",
    "obligationReminderPopup.ts",
    "trackerObligationSync.ts",
    "loanObligationSync.ts",
  ])("%s", (file) => {
    const root = path.resolve(__dirname, "..");
    expect(readFileSync(path.join(root, "mobile/lib", file), "utf8")).toBe(
      readFileSync(path.join(root, "lib", file), "utf8"),
    );
  });
});
