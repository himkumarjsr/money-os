/**
 * Pure helpers for /api/obligations/reminders cron.
 * Keeps due-day math (incl. month wrap) unit-testable.
 */

export type ObligationReminderInput = {
  title: string;
  amount?: number | null;
  frequency: string;
  due_day?: number | null;
  due_month?: number | null;
  remind_days_before?: number | null;
  category?: string | null;
};

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Days until the next occurrence of `dueDay` on/after `asOf` (monthly). */
export function daysUntilMonthlyDueDay(
  dueDay: number,
  asOf: Date = new Date(),
): number {
  const day = Math.min(31, Math.max(1, Math.round(dueDay) || 1));
  const today = startOfLocalDay(asOf);
  let y = today.getFullYear();
  let m = today.getMonth();
  let due = new Date(y, m, Math.min(day, daysInMonth(y, m)));
  if (due < today) {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    due = new Date(y, m, Math.min(day, daysInMonth(y, m)));
  }
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/**
 * The due date a reminder evaluated on `asOf` points at (local midnight), or
 * null for frequencies that never get reminders.
 */
export function obligationReminderDueDate(
  ob: Pick<ObligationReminderInput, "frequency" | "due_day" | "due_month">,
  asOf: Date = new Date(),
): Date | null {
  const today = startOfLocalDay(asOf);
  if (ob.frequency === "monthly") {
    return addDays(today, daysUntilMonthlyDueDay(ob.due_day || 1, asOf));
  }
  if (ob.frequency === "yearly") {
    if (ob.due_month != null) {
      const dueMonth = ob.due_month;
      let y = asOf.getFullYear();
      if (asOf.getMonth() + 1 > dueMonth) y += 1;
      const dueDay = Math.min(
        daysInMonth(y, dueMonth - 1),
        Math.max(1, ob.due_day || 1),
      );
      return new Date(y, dueMonth - 1, dueDay);
    }
    return addDays(today, daysUntilMonthlyDueDay(ob.due_day || 1, asOf));
  }
  return null;
}

export function shouldSendObligationReminder(
  ob: ObligationReminderInput,
  asOf: Date = new Date(),
): boolean {
  const remindBefore = ob.remind_days_before ?? 7;
  if (!Number.isFinite(remindBefore) || remindBefore < 0) return false;

  if (ob.frequency === "yearly" && ob.due_month != null) {
    // Only the due month or the month before it (for wrap).
    const todayMonth = asOf.getMonth() + 1;
    const prevMonth = ob.due_month === 1 ? 12 : ob.due_month - 1;
    if (todayMonth !== ob.due_month && todayMonth !== prevMonth) return false;
  }

  const due = obligationReminderDueDate(ob, asOf);
  if (!due) return false;
  const daysUntil = Math.round(
    (due.getTime() - startOfLocalDay(asOf).getTime()) / 86_400_000,
  );
  return daysUntil === remindBefore;
}

/** Checklist statuses that mean nothing is left to pay for that cycle. */
export const SETTLED_CHECKLIST_STATUSES = [
  "paid",
  "skipped",
  "auto_debit",
] as const;

/** `obligation_checklist.checklist_month` key (1st of the month) for a due date. */
export function checklistMonthFor(due: Date): string {
  const m = String(due.getMonth() + 1).padStart(2, "0");
  return `${due.getFullYear()}-${m}-01`;
}

/** Recover the obligation title from a reminder notification title. */
export function obligationTitleFromReminder(title: string): string | null {
  const match = /^(.+) due in \d+ days?$/.exec(title.trim());
  return match ? match[1] : null;
}

/**
 * A reminder stays worth showing only while its obligation is active, the due
 * date hasn't passed, and that cycle isn't already paid / skipped / auto-debited.
 */
export function isObligationReminderRelevant({
  active,
  dueDate,
  settled,
  now = new Date(),
}: {
  active: boolean;
  dueDate: Date | null;
  settled: boolean;
  now?: Date;
}): boolean {
  if (!active || settled) return false;
  if (dueDate && startOfLocalDay(dueDate) < startOfLocalDay(now)) return false;
  return true;
}

export function obligationReminderEmoji(category?: string | null): string {
  const c = (category || "").toLowerCase();
  if (c.startsWith("insurance")) return "🛡️";
  if (c.startsWith("loan")) return "🏦";
  if (c.startsWith("investment")) return "📈";
  if (c === "credit_card" || c.startsWith("credit")) return "💳";
  return "📌";
}

export function buildObligationReminderCopy(
  ob: ObligationReminderInput,
  remindBefore: number,
): { title: string; content: string } {
  const amount = Number(ob.amount || 0);
  const dueLabel = ob.due_day
    ? `day ${ob.due_day}`
    : ob.due_month
      ? `month ${ob.due_month}`
      : "—";
  const title = `${ob.title} due in ${remindBefore} day${remindBefore === 1 ? "" : "s"}`;
  const content =
    amount > 0
      ? `Keep ₹${Math.round(amount).toLocaleString("en-IN")} ready for your ${ob.title}. Due on ${dueLabel}.`
      : `Your ${ob.title} is due on ${dueLabel}. Check Tracker for the suggested bill amount.`;
  return { title, content };
}
