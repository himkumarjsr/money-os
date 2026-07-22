import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function installPushApis() {
  // jsdom lacks PushManager / full Notification — stub what isWebPushSupported checks.
  Object.defineProperty(window, "PushManager", {
    configurable: true,
    writable: true,
    value: function PushManager() {},
  });
  globalThis.Notification =
    globalThis.Notification ||
    (function Notification() {} as unknown as typeof Notification);
  Object.defineProperty(window, "Notification", {
    configurable: true,
    writable: true,
    value: globalThis.Notification,
  });
  if (!("serviceWorker" in navigator)) {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(undefined),
        register: vi.fn(),
        ready: Promise.resolve({}),
      },
    });
  }
}

describe("webPushClient", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    delete process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
    localStorage.clear();
    installPushApis();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("isWebPushSupported is true when push APIs exist", async () => {
    const { isWebPushSupported } = await import("./webPushClient");
    expect(isWebPushSupported()).toBe(true);
  });

  it("isWebPushSupported is false without PushManager", async () => {
    // @ts-expect-error remove for test
    delete window.PushManager;
    const { isWebPushSupported } = await import("./webPushClient");
    expect(isWebPushSupported()).toBe(false);
  });

  it("getWebPushPublicKey returns trimmed key or null", async () => {
    const { getWebPushPublicKey } = await import("./webPushClient");
    expect(getWebPushPublicKey()).toBeNull();

    vi.stubEnv("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY", "  abc123  ");
    expect(getWebPushPublicKey()).toBe("abc123");
  });

  it("enableWebPush returns missing_vapid when public key unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY", "");
    const { enableWebPush } = await import("./webPushClient");
    await expect(enableWebPush()).resolves.toEqual({
      ok: false,
      reason: "missing_vapid",
    });
  });

  it("enableWebPush returns denied when permission not granted", async () => {
    vi.stubEnv("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY", "BKpublickey");
    // @ts-expect-error test stub
    globalThis.Notification = {
      requestPermission: vi.fn().mockResolvedValue("denied"),
      permission: "default",
    };
    Object.defineProperty(window, "Notification", {
      configurable: true,
      writable: true,
      value: globalThis.Notification,
    });

    const { enableWebPush } = await import("./webPushClient");
    await expect(enableWebPush()).resolves.toEqual({
      ok: false,
      reason: "denied",
    });
  });

  it("enableWebPush returns no_sw when registration missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY", "BKpublickey");
    // @ts-expect-error test stub
    globalThis.Notification = {
      requestPermission: vi.fn().mockResolvedValue("granted"),
      permission: "granted",
    };
    Object.defineProperty(window, "Notification", {
      configurable: true,
      writable: true,
      value: globalThis.Notification,
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(undefined),
        register: vi.fn().mockRejectedValue(new Error("no sw")),
        ready: Promise.resolve({}),
      },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { enableWebPush } = await import("./webPushClient");
    await expect(enableWebPush()).resolves.toEqual({
      ok: false,
      reason: "no_sw",
    });
    warn.mockRestore();
  });

  it("enableWebPush subscribes, posts, and sets localStorage", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY",
      "BNabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUV",
    );

    const subscription = {
      endpoint: "https://fcm.example/x",
      toJSON: () => ({
        endpoint: "https://fcm.example/x",
        keys: { p256dh: "p256", auth: "authkey" },
      }),
      unsubscribe: vi.fn(),
    };

    const pushManager = {
      getSubscription: vi.fn().mockResolvedValue(null),
      subscribe: vi.fn().mockResolvedValue(subscription),
    };

    const reg = { pushManager };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(reg),
        register: vi.fn(),
        ready: Promise.resolve(reg),
      },
    });

    // @ts-expect-error test stub
    globalThis.Notification = {
      requestPermission: vi.fn().mockResolvedValue("granted"),
      permission: "granted",
    };
    Object.defineProperty(window, "Notification", {
      configurable: true,
      writable: true,
      value: globalThis.Notification,
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    }) as typeof fetch;

    const { enableWebPush } = await import("./webPushClient");
    await expect(enableWebPush()).resolves.toEqual({ ok: true });
    expect(pushManager.subscribe).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      "/api/notifications/push-subscribe",
      expect.objectContaining({ method: "POST" }),
    );
    expect(localStorage.getItem("finkoin_push_enabled")).toBe("1");
  });

  it("enableWebPush returns bad_subscription when keys missing", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY",
      "BNabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUV",
    );
    const subscription = {
      endpoint: "https://fcm.example/x",
      toJSON: () => ({ endpoint: "https://fcm.example/x", keys: {} }),
    };
    const reg = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(subscription),
        subscribe: vi.fn(),
      },
    };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(reg),
        register: vi.fn(),
        ready: Promise.resolve(reg),
      },
    });
    // @ts-expect-error test stub
    globalThis.Notification = {
      requestPermission: vi.fn().mockResolvedValue("granted"),
      permission: "granted",
    };
    Object.defineProperty(window, "Notification", {
      configurable: true,
      writable: true,
      value: globalThis.Notification,
    });

    const { enableWebPush } = await import("./webPushClient");
    await expect(enableWebPush()).resolves.toEqual({
      ok: false,
      reason: "bad_subscription",
    });
  });

  it("enableWebPush returns save_failed on non-ok response", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY",
      "BNabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUV",
    );

    const subscription = {
      endpoint: "https://fcm.example/x",
      toJSON: () => ({
        endpoint: "https://fcm.example/x",
        keys: { p256dh: "p256", auth: "authkey" },
      }),
    };

    const reg = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(subscription),
        subscribe: vi.fn(),
      },
    };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(reg),
        register: vi.fn(),
        ready: Promise.resolve(reg),
      },
    });
    // @ts-expect-error test stub
    globalThis.Notification = {
      requestPermission: vi.fn().mockResolvedValue("granted"),
      permission: "granted",
    };
    Object.defineProperty(window, "Notification", {
      configurable: true,
      writable: true,
      value: globalThis.Notification,
    });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "prefs failed" }),
    }) as typeof fetch;

    const { enableWebPush } = await import("./webPushClient");
    await expect(enableWebPush()).resolves.toEqual({
      ok: false,
      reason: "prefs failed",
    });
  });

  it("enableWebPush catches subscribe exceptions", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY",
      "BNabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUV",
    );
    const reg = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: vi.fn().mockRejectedValue(new Error("subscribe boom")),
      },
    };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(reg),
        register: vi.fn(),
        ready: Promise.resolve(reg),
      },
    });
    // @ts-expect-error test stub
    globalThis.Notification = {
      requestPermission: vi.fn().mockResolvedValue("granted"),
      permission: "granted",
    };
    Object.defineProperty(window, "Notification", {
      configurable: true,
      writable: true,
      value: globalThis.Notification,
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { enableWebPush } = await import("./webPushClient");
    await expect(enableWebPush()).resolves.toEqual({
      ok: false,
      reason: "subscribe boom",
    });
    warn.mockRestore();
  });

  it("disableWebPush unsubscribes, deletes server row, clears flag", async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    const subscription = {
      endpoint: "https://fcm.example/x",
      unsubscribe,
      toJSON: () => ({}),
    };
    const reg = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(subscription),
      },
    };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(reg),
        register: vi.fn(),
        ready: Promise.resolve(reg),
      },
    });
    localStorage.setItem("finkoin_push_enabled", "1");
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;

    const { disableWebPush } = await import("./webPushClient");
    await expect(disableWebPush()).resolves.toEqual({ ok: true });
    expect(unsubscribe).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      "/api/notifications/push-subscribe",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ endpoint: "https://fcm.example/x" }),
      }),
    );
    expect(localStorage.getItem("finkoin_push_enabled")).toBeNull();
  });

  it("getCurrentPushSubscription returns null without registration", async () => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(undefined),
        register: vi.fn().mockRejectedValue(new Error("fail")),
        ready: Promise.resolve({}),
      },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getCurrentPushSubscription } = await import("./webPushClient");
    await expect(getCurrentPushSubscription()).resolves.toBeNull();
    warn.mockRestore();
  });
});
