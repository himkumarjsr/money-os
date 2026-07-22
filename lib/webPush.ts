import webpush from "web-push";

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type TipPushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

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
  payload: TipPushPayload,
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
