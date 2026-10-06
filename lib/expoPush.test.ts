import { afterEach, describe, expect, it, vi } from "vitest";
import { sendExpoPushToUser } from "./expoPush";

function mockAdmin(rows: Array<{ id: string; token: string }> | null) {
  const inDel = vi.fn(async () => ({ error: null }));
  const eq = vi.fn(async () => ({ data: rows, error: null }));
  const from = vi.fn(() => ({
    select: () => ({ eq }),
    delete: () => ({ in: inDel }),
  }));
  return { from, inDel };
}

describe("sendExpoPushToUser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns zeros when the user has no tokens", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      sendExpoPushToUser(mockAdmin([]) as never, "u1", {
        title: "T",
        body: "B",
      }),
    ).resolves.toEqual({ pushed: 0, cleaned: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends to every token and prunes DeviceNotRegistered", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [
          { status: "ok" },
          { status: "error", details: { error: "DeviceNotRegistered" } },
        ],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const admin = mockAdmin([
      { id: "t1", token: "ExponentPushToken[a]" },
      { id: "t2", token: "ExponentPushToken[b]" },
    ]);

    await expect(
      sendExpoPushToUser(admin as never, "u1", {
        title: "Tip",
        body: "Save",
        url: "/notifications?id=n1",
      }),
    ).resolves.toEqual({ pushed: 1, cleaned: 1 });

    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1]
        .body,
    );
    expect(body[0]).toMatchObject({
      to: "ExponentPushToken[a]",
      title: "Tip",
      body: "Save",
      data: { url: "/notifications?id=n1" },
    });
    expect(admin.inDel).toHaveBeenCalledWith("id", ["t2"]);
  });

  it("never throws when the client errors", async () => {
    const admin = {
      from: () => {
        throw new Error("boom");
      },
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      sendExpoPushToUser(admin as never, "u1", { title: "T", body: "B" }),
    ).resolves.toEqual({ pushed: 0, cleaned: 0 });
    warn.mockRestore();
  });
});
