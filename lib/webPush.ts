import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type WebPushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/** @deprecated Use WebPushPayload */
export type TipPushPayload = WebPushPayload;

let vapidConfigured = false;

function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.WEB_PUSH_VAPID_SUBJECT?.trim() || "mailto:support@finkoin.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim() &&
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim(),
  );
}

export async function sendWebPush(
  subscription: PushSubscriptionPayload,
  payload: WebPushPayload,
): Promise<{ ok: boolean; statusCode?: number; gone?: boolean }> {
  if (!ensureVapid()) {
    return { ok: false };
  }

  try {
    const result = await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? "/",
        tag: payload.tag ?? "finkoin-tip",
      }),
      {
        TTL: 60 * 60 * 12,
        urgency: "normal",
      },
    );
    return { ok: true, statusCode: result.statusCode };
  } catch (err: unknown) {
    const statusCode =
      err && typeof err === "object" && "statusCode" in err
        ? Number((err as { statusCode?: number }).statusCode)
        : undefined;
    // 404 / 410 = subscription expired or unsubscribed
    const gone = statusCode === 404 || statusCode === 410;
    if (!gone) {
      console.warn("web-push send failed", statusCode, err);
    }
    return { ok: false, statusCode, gone };
  }
}

/** Send a Web Push to every stored subscription for a user; prune gone endpoints. */
export async function sendWebPushToUser(
  supabaseAdmin: SupabaseClient,
  userId: string,
  payload: WebPushPayload,
): Promise<{ pushed: number; cleaned: number }> {
  if (!isWebPushConfigured()) return { pushed: 0, cleaned: 0 };

  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subs?.length) return { pushed: 0, cleaned: 0 };

  let pushed = 0;
  let cleaned = 0;

  await Promise.all(
    (
      subs as Array<{
        id: string;
        endpoint: string;
        p256dh: string;
        auth: string;
      }>
    ).map(async (sub) => {
      const result = await sendWebPush(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
      );
      if (result.ok) {
        pushed += 1;
        return;
      }
      if (result.gone) {
        await supabaseAdmin
          .from("push_subscriptions")
          .delete()
          .eq("id", sub.id);
        cleaned += 1;
      }
    }),
  );

  return { pushed, cleaned };
}
