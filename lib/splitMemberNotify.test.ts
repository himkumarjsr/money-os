import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/webPush", () => ({
  sendWebPushToUser: vi.fn(async () => ({ pushed: 1, cleaned: 0 })),
}));
vi.mock("@/lib/expoPush", () => ({
  sendExpoPushToUser: vi.fn(async () => ({ pushed: 2, cleaned: 0 })),
}));

import { sendExpoPushToUser } from "@/lib/expoPush";
import {
  buildSplitMemberAddedCopy,
  notifySplitMemberAdded,
} from "./splitMemberNotify";

function mockAdmin(userRow: { id: string } | null) {
  const insert = vi.fn(async () => ({ error: null }));
  const ilike = vi.fn(() => ({
    limit: () => ({ maybeSingle: async () => ({ data: userRow }) }),
  }));
  const from = vi.fn((table: string) =>
    table === "users"
      ? { select: () => ({ ilike }) }
      : { insert },
  );
  return { from, insert, ilike };
}

const input = {
  groupName: "Goa trip",
  inviterName: "Asha",
  invitedEmail: "Ravi@Example.com",
  joinPath: "/split/join?token=tok1",
  token: "tok1",
};

describe("notifySplitMemberAdded", () => {
  afterEach(() => vi.clearAllMocks());

  it("builds copy naming the inviter and group", () => {
    expect(buildSplitMemberAddedCopy(input).title).toBe(
      "Asha added you to Goa trip",
    );
  });

  it("does nothing when the invitee has no account", async () => {
    const admin = mockAdmin(null);
    await expect(
      notifySplitMemberAdded(admin as never, input),
    ).resolves.toEqual({ notified: false, pushed: 0 });
    expect(admin.insert).not.toHaveBeenCalled();
    expect(sendExpoPushToUser).not.toHaveBeenCalled();
  });

  it("writes an inbox row and pushes the join link to existing users", async () => {
    const admin = mockAdmin({ id: "u2" });
    await expect(
      notifySplitMemberAdded(admin as never, input),
    ).resolves.toEqual({ notified: true, pushed: 3 });
    expect(admin.ilike).toHaveBeenCalledWith("email", "ravi@example.com");
    expect(admin.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u2", category: "split_invite" }),
    );
    expect(sendExpoPushToUser).toHaveBeenCalledWith(
      admin,
      "u2",
      expect.objectContaining({ url: "/split/join?token=tok1" }),
    );
  });

  it("never throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const admin = {
      from: () => {
        throw new Error("boom");
      },
    };
    await expect(
      notifySplitMemberAdded(admin as never, input),
    ).resolves.toEqual({ notified: false, pushed: 0 });
    warn.mockRestore();
  });
});
