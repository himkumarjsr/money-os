import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWebPushToUser } from "@/lib/webPush";
import { sendExpoPushToUser } from "@/lib/expoPush";

export type SplitMemberAddedInput = {
  groupName: string;
  inviterName: string;
  invitedEmail: string;
  /** Join path, e.g. `/split/join?token=…` (relative so web + app can route it). */
  joinPath: string;
  token: string;
};

export function buildSplitMemberAddedCopy(input: {
  groupName: string;
  inviterName: string;
}): { title: string; body: string } {
  const group = input.groupName.trim() || "a group";
  const who = input.inviterName.trim() || "Someone";
  return {
    title: `${who} added you to ${group}`,
    body: `Tap to join “${group}” on Finkoin Split and track shared expenses together.`,
  };
}

function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Inbox row + Web Push + Expo push for an invitee who already has a Finkoin
 * account. Invitees without an account only get the email. Never throws.
 */
export async function notifySplitMemberAdded(
  admin: SupabaseClient,
  input: SplitMemberAddedInput,
): Promise<{ notified: boolean; pushed: number }> {
  try {
    const email = input.invitedEmail.toLowerCase().trim();
    if (!email) return { notified: false, pushed: 0 };

    const { data: invitee } = await admin
      .from("users")
      .select("id")
      .ilike("email", escapeIlike(email))
      .limit(1)
      .maybeSingle();
    const userId = (invitee as { id?: string } | null)?.id;
    if (!userId) return { notified: false, pushed: 0 };

    const copy = buildSplitMemberAddedCopy(input);
    const { error: insertErr } = await admin.from("user_notifications").insert({
      user_id: userId,
      title: copy.title,
      content: copy.body,
      emoji: "👥",
      category: "split_invite",
      is_read: false,
      shown_as_popup: true,
    });
    if (insertErr) {
      console.warn("split member notification insert failed", insertErr);
    }

    const payload = {
      title: copy.title,
      body: copy.body,
      url: input.joinPath,
      tag: `split-invite-${input.token}`,
    };
    const [web, expo] = await Promise.all([
      sendWebPushToUser(admin, userId, payload),
      sendExpoPushToUser(admin, userId, payload),
    ]);
    return { notified: true, pushed: web.pushed + expo.pushed };
  } catch (e) {
    console.warn("notifySplitMemberAdded", e);
    return { notified: false, pushed: 0 };
  }
}
