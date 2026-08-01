import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setVapidDetails = vi.fn();
const sendNotification = vi.fn();

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: (...args: unknown[]) => setVapidDetails(...args),
    sendNotification: (...args: unknown[]) => sendNotification(...args),
  },
}));

const subscription = {
  endpoint: "https://push.example/sub",
  keys: { p256dh: "p256", auth: "auth" },
};

describe("webPush", () => {
  beforeEach(() => {
    vi.resetModules();
    setVapidDetails.mockReset();
    sendNotification.mockReset();
    vi.unstubAllEnvs();
    delete process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
    delete process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
    delete process.env.WEB_PUSH_VAPID_SUBJECT;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("isWebPushConfigured is false when either key is missing", async () => {
    const { isWebPushConfigured } = await import("./webPush");
    expect(isWebPushConfigured()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY", "pub");
    expect(isWebPushConfigured()).toBe(false);

    vi.unstubAllEnvs();
    delete process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
    vi.stubEnv("WEB_PUSH_VAPID_PRIVATE_KEY", "priv");
    expect(isWebPushConfigured()).toBe(false);
  });

  it("isWebPushConfigured is true when both keys are set (trimmed)", async () => {
    vi.stubEnv("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY", "  pub-key  ");
    vi.stubEnv("WEB_PUSH_VAPID_PRIVATE_KEY", "  priv-key  ");
    const { isWebPushConfigured } = await import("./webPush");
    expect(isWebPushConfigured()).toBe(true);
  });

  it("sendWebPush returns ok:false when VAPID is not configured", async () => {
    const { sendWebPush } = await import("./webPush");
    await expect(
      sendWebPush(subscription, { title: "Tip", body: "Hello" }),
    ).resolves.toEqual({ ok: false });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("sendWebPush configures VAPID once and sends payload", async () => {
    vi.stubEnv("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY", "pub");
    vi.stubEnv("WEB_PUSH_VAPID_PRIVATE_KEY", "priv");
    vi.stubEnv("WEB_PUSH_VAPID_SUBJECT", "mailto:test@example.com");
    sendNotification.mockResolvedValue({ statusCode: 201 });

    const { sendWebPush } = await import("./webPush");
    const first = await sendWebPush(subscription, {
      title: "Tip",
      body: "Save more",
      url: "/tips",
      tag: "tip-1",
    });
    const second = await sendWebPush(subscription, {
      title: "Tip 2",
      body: "Budget",
    });

    expect(first).toEqual({ ok: true, statusCode: 201 });
    expect(second).toEqual({ ok: true, statusCode: 201 });
    expect(setVapidDetails).toHaveBeenCalledTimes(1);
    expect(setVapidDetails).toHaveBeenCalledWith(
      "mailto:test@example.com",
      "pub",
      "priv",
    );
    expect(sendNotification).toHaveBeenCalledWith(
      subscription,
      JSON.stringify({
        title: "Tip",
        body: "Save more",
        url: "/tips",
        tag: "tip-1",
      }),
      { TTL: 60 * 60 * 12, urgency: "normal" },
    );
    expect(sendNotification).toHaveBeenNthCalledWith(
      2,
      subscription,
      JSON.stringify({
        title: "Tip 2",
        body: "Budget",
        url: "/",
        tag: "finkoin-tip",
      }),
      { TTL: 60 * 60 * 12, urgency: "normal" },
    );
  });

  it("sendWebPush uses default mailto subject when unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY", "pub");
    vi.stubEnv("WEB_PUSH_VAPID_PRIVATE_KEY", "priv");
    sendNotification.mockResolvedValue({ statusCode: 201 });

    const { sendWebPush } = await import("./webPush");
    await sendWebPush(subscription, { title: "T", body: "B" });

    expect(setVapidDetails).toHaveBeenCalledWith(
      "mailto:support@finkoin.com",
      "pub",
      "priv",
    );
  });

  it("sendWebPush marks 404/410 as gone", async () => {
    vi.stubEnv("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY", "pub");
    vi.stubEnv("WEB_PUSH_VAPID_PRIVATE_KEY", "priv");
    sendNotification.mockRejectedValue({ statusCode: 410 });

    const { sendWebPush } = await import("./webPush");
    await expect(
      sendWebPush(subscription, { title: "T", body: "B" }),
    ).resolves.toEqual({ ok: false, statusCode: 410, gone: true });
  });

  it("sendWebPush marks other errors as not gone and warns", async () => {
    vi.stubEnv("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY", "pub");
    vi.stubEnv("WEB_PUSH_VAPID_PRIVATE_KEY", "priv");
    sendNotification.mockRejectedValue({ statusCode: 500 });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { sendWebPush } = await import("./webPush");
    await expect(
      sendWebPush(subscription, { title: "T", body: "B" }),
    ).resolves.toEqual({ ok: false, statusCode: 500, gone: false });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("sendWebPush handles non-object throw without statusCode", async () => {
    vi.stubEnv("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY", "pub");
    vi.stubEnv("WEB_PUSH_VAPID_PRIVATE_KEY", "priv");
    sendNotification.mockRejectedValue("boom");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { sendWebPush } = await import("./webPush");
    await expect(
      sendWebPush(subscription, { title: "T", body: "B" }),
    ).resolves.toEqual({
      ok: false,
      statusCode: undefined,
      gone: false,
    });
    warn.mockRestore();
  });

  describe("sendWebPushToUser", () => {
    function mockAdmin(result: {
      data: Array<{
        id: string;
        endpoint: string;
        p256dh: string;
        auth: string;
      }> | null;
      error?: unknown;
    }) {
      const del = vi.fn(async () => ({ error: null }));
      const eq = vi.fn(async () => result);
      const select = vi.fn(() => ({ eq }));
      const from = vi.fn((table: string) => {
        if (table === "push_subscriptions") {
          return {
            select,
            delete: () => ({ eq: del }),
          };
        }
        throw new Error(`unexpected ${table}`);
      });
      return { from, del, eq };
    }

    it("no-ops when VAPID is not configured", async () => {
      const admin = mockAdmin({ data: [] });
      const { sendWebPushToUser } = await import("./webPush");
      await expect(
        sendWebPushToUser(admin as never, "u1", { title: "T", body: "B" }),
      ).resolves.toEqual({ pushed: 0, cleaned: 0 });
      expect(admin.from).not.toHaveBeenCalled();
    });

    it("returns zeros when select errors or has no rows", async () => {
      vi.stubEnv("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY", "pub");
      vi.stubEnv("WEB_PUSH_VAPID_PRIVATE_KEY", "priv");
      const { sendWebPushToUser } = await import("./webPush");

      await expect(
        sendWebPushToUser(
          mockAdmin({ data: null, error: { message: "x" } }) as never,
          "u1",
          { title: "T", body: "B" },
        ),
      ).resolves.toEqual({ pushed: 0, cleaned: 0 });

      await expect(
        sendWebPushToUser(mockAdmin({ data: [] }) as never, "u1", {
          title: "T",
          body: "B",
        }),
      ).resolves.toEqual({ pushed: 0, cleaned: 0 });
    });

    it("pushes to each sub and deletes gone endpoints", async () => {
      vi.stubEnv("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY", "pub");
      vi.stubEnv("WEB_PUSH_VAPID_PRIVATE_KEY", "priv");
      sendNotification
        .mockResolvedValueOnce({ statusCode: 201 })
        .mockRejectedValueOnce({ statusCode: 410 })
        .mockRejectedValueOnce({ statusCode: 500 });

      const admin = mockAdmin({
        data: [
          {
            id: "s1",
            endpoint: "https://push.example/1",
            p256dh: "p1",
            auth: "a1",
          },
          {
            id: "s2",
            endpoint: "https://push.example/2",
            p256dh: "p2",
            auth: "a2",
          },
          {
            id: "s3",
            endpoint: "https://push.example/3",
            p256dh: "p3",
            auth: "a3",
          },
        ],
      });
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { sendWebPushToUser } = await import("./webPush");

      await expect(
        sendWebPushToUser(admin as never, "u1", {
          title: "Split",
          body: "New expense",
          url: "/split/g1",
          tag: "split-expense-e1",
        }),
      ).resolves.toEqual({ pushed: 1, cleaned: 1 });

      expect(admin.del).toHaveBeenCalledWith("id", "s2");
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });
});
