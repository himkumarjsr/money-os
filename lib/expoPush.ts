import type { SupabaseClient } from "@supabase/supabase-js";
import type { WebPushPayload } from "@/lib/webPush";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH = 100;

type ExpoTicket = {
  status: "ok" | "error";
  details?: { error?: string };
};

/**
 * Send a native push (Expo) to every app device a user registered; prune tokens
 * Expo reports as `DeviceNotRegistered`. Never throws — push is best-effort.
 */
export async function sendExpoPushToUser(
  supabaseAdmin: SupabaseClient,
  userId: string,
  payload: WebPushPayload,
): Promise<{ pushed: number; cleaned: number }> {
  try {
    const { data: rows, error } = await supabaseAdmin
      .from("expo_push_tokens")
      .select("id, token")
      .eq("user_id", userId);
    if (error || !rows?.length) return { pushed: 0, cleaned: 0 };

    const tokens = rows as Array<{ id: string; token: string }>;
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    let pushed = 0;
    const gone: string[] = [];

    for (let i = 0; i < tokens.length; i += BATCH) {
      const batch = tokens.slice(i, i + BATCH);
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(
          batch.map((t) => ({
            to: t.token,
            title: payload.title,
            body: payload.body,
            sound: "default",
            channelId: "default",
            data: {
              url: payload.url ?? "/notifications",
              tag: payload.tag ?? "finkoin-tip",
            },
          })),
        ),
      });
      if (!res.ok) {
        console.warn("expo push send failed", res.status);
        continue;
      }
      const json = (await res.json().catch(() => null)) as {
        data?: ExpoTicket[];
      } | null;
      (json?.data ?? []).forEach((ticket, idx) => {
        if (ticket.status === "ok") pushed += 1;
        else if (ticket.details?.error === "DeviceNotRegistered") {
          gone.push(batch[idx].id);
        }
      });
    }

    if (gone.length) {
      await supabaseAdmin.from("expo_push_tokens").delete().in("id", gone);
    }
    return { pushed, cleaned: gone.length };
  } catch (err) {
    console.warn("expo push error", err);
    return { pushed: 0, cleaned: 0 };
  }
}
