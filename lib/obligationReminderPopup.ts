import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SETTLED_CHECKLIST_STATUSES,
  checklistMonthFor,
  isObligationReminderRelevant,
  obligationReminderDueDate,
  obligationTitleFromReminder,
} from "@/lib/obligationReminders";

export const OBLIGATION_REMINDER_CATEGORY = "obligation_reminder";

type PopupCandidate = { title: string; category: string; created_at: string };

/**
 * False when an obligation reminder is outdated (bill paid / skipped /
 * auto-debited for that cycle, closed, or due date already passed).
 * Other notification types, and lookups that fail, count as relevant.
 */
export async function isPopupNotificationRelevant(
  supabase: SupabaseClient,
  userId: string,
  n: PopupCandidate,
  now: Date = new Date(),
): Promise<boolean> {
  if (n.category !== OBLIGATION_REMINDER_CATEGORY) return true;
  const obligationTitle = obligationTitleFromReminder(n.title);
  if (!obligationTitle) return true;

  try {
    const { data: obligations, error } = await supabase
      .from("financial_obligations")
      .select("id, frequency, due_day, due_month, is_active")
      .eq("user_id", userId)
      .eq("title", obligationTitle);
    if (error || !obligations) return true;

    const active = obligations.filter((o) => o.is_active !== false);
    if (active.length === 0) {
      return isObligationReminderRelevant({
        active: false,
        dueDate: null,
        settled: false,
        now,
      });
    }

    const sentAt = new Date(n.created_at);
    const asOf = Number.isNaN(sentAt.getTime()) ? now : sentAt;
    for (const ob of active) {
      const dueDate = obligationReminderDueDate(ob, asOf);
      let settled = false;
      if (dueDate) {
        const { data: rows, error: checklistError } = await supabase
          .from("obligation_checklist")
          .select("id")
          .eq("user_id", userId)
          .eq("obligation_id", ob.id)
          .eq("checklist_month", checklistMonthFor(dueDate))
          .in("status", [...SETTLED_CHECKLIST_STATUSES])
          .limit(1);
        if (checklistError) return true;
        settled = (rows?.length ?? 0) > 0;
      }
      if (isObligationReminderRelevant({ active: true, dueDate, settled, now })) {
        return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}
