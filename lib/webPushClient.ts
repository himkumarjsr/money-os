"use client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getWebPushPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  return key || null;
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  // Prefer the existing next-pwa worker when present.
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;

  // Dev / no-PWA fallback: dedicated push worker.
  try {
    const reg = await navigator.serviceWorker.register("/sw-push.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (e) {
    console.warn("push SW register failed", e);
    return null;
  }
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  const reg = await getServiceWorkerRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

/**
 * Request permission, subscribe, and POST subscription to the API.
 * Never throws — callers get `{ ok, reason }` on failure.
 */
export async function enableWebPush(): Promise<{
  ok: boolean;
  reason?: string;
}> {
  try {
    if (!isWebPushSupported()) {
      return { ok: false, reason: "unsupported" };
    }
    const publicKey = getWebPushPublicKey();
    if (!publicKey) {
      return { ok: false, reason: "missing_vapid" };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, reason: "denied" };
    }

    const reg = await getServiceWorkerRegistration();
    if (!reg) {
      return { ok: false, reason: "no_sw" };
    }

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, reason: "bad_subscription" };
    }

    const res = await fetch("/api/notifications/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
        userAgent: navigator.userAgent,
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      return { ok: false, reason: body?.error || "save_failed" };
    }

    try {
      localStorage.setItem("finkoin_push_enabled", "1");
    } catch {
      /* ignore */
    }

    return { ok: true };
  } catch (e) {
    console.warn("enableWebPush failed", e);
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "subscribe_failed",
    };
  }
}

export async function disableWebPush(): Promise<{ ok: boolean }> {
  const reg = await getServiceWorkerRegistration();
  const subscription = reg ? await reg.pushManager.getSubscription() : null;
  const endpoint = subscription?.endpoint;

  if (subscription) {
    try {
      await subscription.unsubscribe();
    } catch (e) {
      console.warn("push unsubscribe failed", e);
    }
  }

  await fetch("/api/notifications/push-subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: endpoint ?? null }),
  }).catch(() => null);

  try {
    localStorage.removeItem("finkoin_push_enabled");
  } catch {
    /* ignore */
  }

  return { ok: true };
}
