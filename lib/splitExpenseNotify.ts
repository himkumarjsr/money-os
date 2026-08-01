import type { SupabaseClient } from "@supabase/supabase-js";
import { formatINR } from "@/lib/formatINR";
import { sendWebPushToUser } from "@/lib/webPush";

export type SplitExpenseNotifyInput = {
  groupId: string;
  expenseId: string;
  title: string;
  amount: number;
  paidByName: string;
  actorUserId: string;
  /** Member user_ids included in the split (from shares). */
  shareUserIds: Array<string | null | undefined>;
};

export function buildSplitExpensePushCopy(input: {
  groupName: string;
  paidByName: string;
  title: string;
  amount: number;
}): { title: string; body: string } {
  const group = input.groupName.trim() || "your group";
  const who = input.paidByName.trim() || "Someone";
  const what = input.title.trim() || "an expense";
  return {
    title: `New expense in ${group}`,
    body: `${who} added “${what}” · ${formatINR(input.amount)}`,
  };
}

/** Active members in the split, excluding the person who added the expense. */
export function recipientUserIdsForSplitExpense(input: {
  actorUserId: string;
  shareUserIds: Array<string | null | undefined>;
  activeMemberUserIds: Array<string | null | undefined>;
}): string[] {
  const actor = input.actorUserId.trim();
  const shareSet = new Set(
    input.shareUserIds
      .map((id) => (typeof id === "string" ? id.trim() : ""))
      .filter(Boolean),
  );
  const recipients = new Set<string>();
  for (const id of input.activeMemberUserIds) {
    const uid = typeof id === "string" ? id.trim() : "";
    if (!uid || uid === actor) continue;
    // If shares carried user_ids, only notify people in the split.
    if (shareSet.size > 0 && !shareSet.has(uid)) continue;
    recipients.add(uid);
  }
  return Array.from(recipients);
}

export async function notifySplitExpenseAdded(
  admin: SupabaseClient,
  input: SplitExpenseNotifyInput,
): Promise<{ recipients: number; pushed: number }> {
  const { data: group } = await admin
    .from("split_groups")
    .select("name")
    .eq("id", input.groupId)
    .maybeSingle();

  const { data: members } = await admin
    .from("split_group_members")
    .select("user_id")
    .eq("group_id", input.groupId)
    .eq("status", "active");

  const recipientIds = recipientUserIdsForSplitExpense({
    actorUserId: input.actorUserId,
    shareUserIds: input.shareUserIds,
    activeMemberUserIds: (members ?? []).map(
      (m) => (m as { user_id?: string | null }).user_id,
    ),
  });

  if (recipientIds.length === 0) {
    return { recipients: 0, pushed: 0 };
  }

  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("user_id, payment_alerts")
    .in("user_id", recipientIds);

  const alertsOff = new Set(
    (prefs ?? [])
      .filter(
        (p) =>
          (p as { payment_alerts?: boolean | null }).payment_alerts === false,
      )
      .map((p) => String((p as { user_id: string }).user_id)),
  );
  const allowedIds = recipientIds.filter((id) => !alertsOff.has(id));

  if (allowedIds.length === 0) {
    return { recipients: 0, pushed: 0 };
  }

  const groupName = String(
    (group as { name?: string } | null)?.name ?? "your group",
  );
  const copy = buildSplitExpensePushCopy({
    groupName,
    paidByName: input.paidByName,
    title: input.title,
    amount: input.amount,
  });
  const url = `/split/${input.groupId}`;
  const tag = `split-expense-${input.expenseId}`;

  let pushed = 0;

  await Promise.all(
    allowedIds.map(async (userId) => {
      const { error: insertErr } = await admin
        .from("user_notifications")
        .insert({
          user_id: userId,
          title: copy.title,
          content: copy.body,
          emoji: "🧾",
          category: "split_expense",
          is_read: false,
          // Avoid hijacking the daily tip popup; push + inbox are enough.
          shown_as_popup: true,
        });
      if (insertErr) {
        console.warn(
          "split expense notification insert failed",
          userId,
          insertErr,
        );
      }

      const result = await sendWebPushToUser(admin, userId, {
        title: copy.title,
        body: copy.body,
        url,
        tag,
      });
      pushed += result.pushed;
    }),
  );

  return { recipients: allowedIds.length, pushed };
}
