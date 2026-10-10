import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSplitExpensePushCopy,
  notifySplitExpenseAdded,
  recipientUserIdsForSplitExpense,
  splitExpensePushUrl,
} from "./splitExpenseNotify";
import { splitGroupNameFromTitle } from "./splitGroupLink";

const sendWebPushToUser = vi.hoisted(() =>
  vi.fn(async () => ({ pushed: 1, cleaned: 0 })),
);

vi.mock("@/lib/webPush", () => ({
  sendWebPushToUser,
}));

type QueryResult = { data: unknown; error: unknown };

function createAdminMock(handlers: {
  group?: QueryResult;
  members?: QueryResult;
  prefs?: QueryResult;
  insertError?: unknown;
  insertId?: string;
}) {
  const insert = vi.fn(() => ({
    select: () => ({
      single: async () => ({
        data: handlers.insertError
          ? null
          : { id: handlers.insertId ?? "notif-1" },
        error: handlers.insertError ?? null,
      }),
    }),
  }));

  const from = vi.fn((table: string) => {
    if (table === "split_groups") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () =>
              handlers.group ?? { data: null, error: null },
          }),
        }),
      };
    }
    if (table === "split_group_members") {
      return {
        select: () => ({
          eq: () => ({
            eq: async () => handlers.members ?? { data: [], error: null },
          }),
        }),
      };
    }
    if (table === "notification_preferences") {
      return {
        select: () => ({
          in: async () => handlers.prefs ?? { data: [], error: null },
        }),
      };
    }
    if (table === "user_notifications") {
      return { insert };
    }
    throw new Error(`unexpected table ${table}`);
  });

  return { from, insert } as unknown as {
    from: typeof from;
    insert: typeof insert;
  };
}

describe("buildSplitExpensePushCopy", () => {
  it("formats who / what / how much", () => {
    expect(
      buildSplitExpensePushCopy({
        groupName: "Grocery & Vege",
        paidByName: "Himanshu",
        title: "Tomatoes",
        amount: 240,
      }),
    ).toEqual({
      title: "New expense in Grocery & Vege",
      body: "Himanshu added “Tomatoes” · ₹240",
    });
  });

  it("uses fallbacks for blank fields", () => {
    expect(
      buildSplitExpensePushCopy({
        groupName: "  ",
        paidByName: "",
        title: "   ",
        amount: 99.4,
      }),
    ).toEqual({
      title: "New expense in your group",
      body: "Someone added “an expense” · ₹99",
    });
  });
});

describe("recipientUserIdsForSplitExpense", () => {
  it("excludes actor and members not in the split", () => {
    expect(
      recipientUserIdsForSplitExpense({
        actorUserId: "a1",
        shareUserIds: ["a1", "b2", null],
        activeMemberUserIds: ["a1", "b2", "c3", null],
      }),
    ).toEqual(["b2"]);
  });

  it("notifies all active members when share user_ids are missing", () => {
    expect(
      recipientUserIdsForSplitExpense({
        actorUserId: "a1",
        shareUserIds: [null, undefined],
        activeMemberUserIds: ["a1", "b2", "c3"],
      }).sort(),
    ).toEqual(["b2", "c3"]);
  });

  it("trims ids and skips empty actor/member strings", () => {
    expect(
      recipientUserIdsForSplitExpense({
        actorUserId: "  a1  ",
        shareUserIds: ["  b2  ", ""],
        activeMemberUserIds: ["", "  b2  ", "c3"],
      }),
    ).toEqual(["b2"]);
  });

  it("dedupes recipients", () => {
    expect(
      recipientUserIdsForSplitExpense({
        actorUserId: "a1",
        shareUserIds: [],
        activeMemberUserIds: ["b2", "b2", "c3"],
      }).sort(),
    ).toEqual(["b2", "c3"]);
  });
});

describe("notifySplitExpenseAdded", () => {
  beforeEach(() => {
    sendWebPushToUser.mockReset();
    sendWebPushToUser.mockResolvedValue({ pushed: 1, cleaned: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns early when there are no other members", async () => {
    const admin = createAdminMock({
      group: { data: { name: "Trip" }, error: null },
      members: { data: [{ user_id: "actor" }], error: null },
    });

    await expect(
      notifySplitExpenseAdded(admin as never, {
        groupId: "g1",
        expenseId: "e1",
        title: "Taxi",
        amount: 500,
        paidByName: "A",
        actorUserId: "actor",
        shareUserIds: ["actor"],
      }),
    ).resolves.toEqual({ recipients: 0, pushed: 0 });

    expect(sendWebPushToUser).not.toHaveBeenCalled();
  });

  it("skips members who turned off payment_alerts", async () => {
    const admin = createAdminMock({
      group: { data: { name: "Trip" }, error: null },
      members: {
        data: [{ user_id: "actor" }, { user_id: "b2" }, { user_id: "c3" }],
        error: null,
      },
      prefs: {
        data: [
          { user_id: "b2", payment_alerts: false },
          { user_id: "c3", payment_alerts: true },
        ],
        error: null,
      },
    });

    const result = await notifySplitExpenseAdded(admin as never, {
      groupId: "g1",
      expenseId: "e1",
      title: "Dinner",
      amount: 1200,
      paidByName: "Actor",
      actorUserId: "actor",
      shareUserIds: ["actor", "b2", "c3"],
    });

    expect(result).toEqual({ recipients: 1, pushed: 1 });
    expect(sendWebPushToUser).toHaveBeenCalledTimes(1);
    expect(sendWebPushToUser).toHaveBeenCalledWith(
      admin,
      "c3",
      expect.objectContaining({
        title: "New expense in Trip",
        body: "Actor added “Dinner” · ₹1,200",
        url: "/split/g1?notif=notif-1",
        tag: "split-expense-e1",
      }),
    );
  });

  it("returns early when every recipient opted out", async () => {
    const admin = createAdminMock({
      members: {
        data: [{ user_id: "actor" }, { user_id: "b2" }],
        error: null,
      },
      prefs: {
        data: [{ user_id: "b2", payment_alerts: false }],
        error: null,
      },
    });

    await expect(
      notifySplitExpenseAdded(admin as never, {
        groupId: "g1",
        expenseId: "e1",
        title: "Snacks",
        amount: 50,
        paidByName: "A",
        actorUserId: "actor",
        shareUserIds: ["b2"],
      }),
    ).resolves.toEqual({ recipients: 0, pushed: 0 });
  });

  it("inserts inbox rows and pushes; warns on insert failure", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const admin = createAdminMock({
      group: { data: null, error: null },
      members: {
        data: [{ user_id: "actor" }, { user_id: "b2" }, { user_id: null }],
        error: null,
      },
      prefs: { data: null, error: null },
      insertError: { message: "db down" },
    });

    sendWebPushToUser
      .mockResolvedValueOnce({ pushed: 2, cleaned: 0 })
      .mockResolvedValueOnce({ pushed: 0, cleaned: 1 });

    // members without share filter when share ids empty → b2 only (null skipped)
    const result = await notifySplitExpenseAdded(admin as never, {
      groupId: "g9",
      expenseId: "e9",
      title: "Cafe",
      amount: 350,
      paidByName: "Riya",
      actorUserId: "actor",
      shareUserIds: [null],
    });

    expect(result.recipients).toBe(1);
    expect(result.pushed).toBe(2);
    expect(warn).toHaveBeenCalled();
    expect(admin.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "b2",
        category: "split_expense",
        shown_as_popup: true,
        title: "New expense in your group",
      }),
    );
    warn.mockRestore();
  });

  it("handles null members list as empty", async () => {
    const admin = createAdminMock({
      members: { data: null, error: null },
    });
    await expect(
      notifySplitExpenseAdded(admin as never, {
        groupId: "g1",
        expenseId: "e1",
        title: "X",
        amount: 1,
        paidByName: "A",
        actorUserId: "actor",
        shareUserIds: ["b2"],
      }),
    ).resolves.toEqual({ recipients: 0, pushed: 0 });
  });
});

describe("split expense deep links", () => {
  it("opens the group and carries the inbox id", () => {
    expect(splitExpensePushUrl("g1", "n1")).toBe("/split/g1?notif=n1");
    expect(splitExpensePushUrl("g1")).toBe("/split/g1");
  });

  it("reads the group name back from the inbox title", () => {
    expect(splitGroupNameFromTitle("New expense in Goa Trip")).toBe("Goa Trip");
    expect(splitGroupNameFromTitle("New expense in your group")).toBeNull();
    expect(splitGroupNameFromTitle("Daily tip")).toBeNull();
  });
});
