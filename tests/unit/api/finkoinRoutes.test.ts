// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "new-user" } as { id: string } | null,
  referrerId: "referrer" as string | null,
  existingReferral: null as null | { id: string },
  rpcCalls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  inserts: [] as Array<{ table: string; row: unknown }>,
}));

vi.mock("@/lib/apiGuard", async (orig) => ({
  ...(await orig<typeof import("@/lib/apiGuard")>()),
  getAuthedUser: async () => state.user,
}));

function query(table: string) {
  const q = {
    select: () => q,
    eq: () => q,
    limit: () => q,
    maybeSingle: async () => {
      if (table === "users") {
        return {
          data: state.referrerId ? { id: state.referrerId } : null,
          error: null,
        };
      }
      return { data: state.existingReferral, error: null };
    },
    insert: async (row: unknown) => {
      state.inserts.push({ table, row });
      return { error: null };
    },
    update: () => ({ eq: async () => ({ error: null }) }),
  };
  return q;
}

vi.mock("@/lib/supabaseServer", () => ({
  getSupabaseAdmin: () => ({
    from: query,
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.rpcCalls.push({ fn, args });
      if (fn === "record_daily_login") {
        return {
          data: [
            {
              fk_balance: 55,
              total_earned: 55,
              streak_days: 4,
              last_login: "2026-10-10",
              badges: [],
              awarded: 5,
            },
          ],
          error: null,
        };
      }
      return { data: true, error: null };
    },
  }),
}));

import { POST as dailyLogin } from "@/app/api/gamification/daily-login/route";
import { POST as applyReferral } from "@/app/api/referrals/apply/route";

function referralRequest(code: unknown) {
  return new Request("http://x/api/referrals/apply", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

beforeEach(() => {
  state.user = { id: "new-user" };
  state.referrerId = "referrer";
  state.existingReferral = null;
  state.rpcCalls = [];
  state.inserts = [];
});

describe("daily-login", () => {
  it("requires a signed-in user", async () => {
    state.user = null;
    const res = await dailyLogin();
    expect(res.status).toBe(401);
    expect(state.rpcCalls).toEqual([]);
  });

  it("records the visit for the caller only, on today's India date", async () => {
    const res = await dailyLogin();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      fkBalance: 55,
      streakDays: 4,
      awarded: 5,
    });
    expect(state.rpcCalls).toHaveLength(1);
    expect(state.rpcCalls[0].fn).toBe("record_daily_login");
    expect(state.rpcCalls[0].args.p_user_id).toBe("new-user");
    expect(state.rpcCalls[0].args.p_today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("referrals/apply", () => {
  it("requires a signed-in user", async () => {
    state.user = null;
    const res = await applyReferral(referralRequest("ABC"));
    expect(res.status).toBe(401);
  });

  it("pays the referrer 200 and the new user 100", async () => {
    const res = await applyReferral(referralRequest(" abc12345 "));
    expect(await res.json()).toEqual({ applied: true, fkAwarded: 100 });
    expect(state.inserts).toEqual([
      expect.objectContaining({
        table: "referrals",
        row: expect.objectContaining({
          referrer_id: "referrer",
          referred_id: "new-user",
        }),
      }),
    ]);
    expect(state.rpcCalls.map((c) => c.args)).toEqual([
      expect.objectContaining({ p_user_id: "referrer", p_amount: 200 }),
      expect.objectContaining({ p_user_id: "new-user", p_amount: 100 }),
    ]);
  });

  it("refuses a self-referral", async () => {
    state.referrerId = "new-user";
    const res = await applyReferral(referralRequest("SELF"));
    expect(await res.json()).toMatchObject({ applied: false });
    expect(state.rpcCalls).toEqual([]);
  });

  it("pays nothing when the user was already referred", async () => {
    state.existingReferral = { id: "r1" };
    const res = await applyReferral(referralRequest("ABC"));
    expect(await res.json()).toMatchObject({ applied: false });
    expect(state.rpcCalls).toEqual([]);
    expect(state.inserts).toEqual([]);
  });

  it("ignores an unknown code", async () => {
    state.referrerId = null;
    const res = await applyReferral(referralRequest("NOPE"));
    expect(await res.json()).toMatchObject({ applied: false });
  });

  it("rejects a missing code", async () => {
    const res = await applyReferral(referralRequest(""));
    expect(res.status).toBe(400);
  });
});
