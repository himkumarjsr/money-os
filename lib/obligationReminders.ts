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

export function shouldSendObligationReminder(
  ob: ObligationReminderInput,
  asOf: Date = new Date(),
): boolean {
  const remindBefore = ob.remind_days_before ?? 7;
  if (!Number.isFinite(remindBefore) || remindBefore < 0) return false;

  if (ob.frequency === "monthly") {
    return daysUntilMonthlyDueDay(ob.due_day || 1, asOf) === remindBefore;
  }

  if (ob.frequency === "yearly") {
    const todayMonth = asOf.getMonth() + 1;
    // If due_month is set and we're not in that month or the prior month
    // (for wrap), skip. Otherwise use monthly-style day distance within window.
    if (ob.due_month != null) {
      const dueMonth = ob.due_month;
      const prevMonth = dueMonth === 1 ? 12 : dueMonth - 1;
      if (todayMonth !== dueMonth && todayMonth !== prevMonth) return false;
      // Build target date in the due month of this/next year
      let y = asOf.getFullYear();
      if (todayMonth > dueMonth) y += 1;
      const dueDay = Math.min(
        daysInMonth(y, dueMonth - 1),
        Math.max(1, ob.due_day || 1),
      );
      const due = startOfLocalDay(new Date(y, dueMonth - 1, dueDay));
      const today = startOfLocalDay(asOf);
      const daysUntil = Math.round(
        (due.getTime() - today.getTime()) / 86_400_000,
      );
      return daysUntil === remindBefore;
    }
    return daysUntilMonthlyDueDay(ob.due_day || 1, asOf) === remindBefore;
  }

  return false;
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
