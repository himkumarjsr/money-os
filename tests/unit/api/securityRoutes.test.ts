// @vitest-environment node
import { createHmac } from "crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  orderNotes: {} as Record<string, unknown>,
  insertError: null as null | { code: string; message: string },
  inserts: [] as unknown[],
  updates: [] as unknown[],
}));

vi.mock("razorpay", () => ({
  default: class {
    orders = {
      fetch: async () => ({
        amount: 9900,
        currency: "INR",
        notes: state.orderNotes,
      }),
    };
  },
}));

vi.mock("@/lib/supabaseServer", () => ({
  supabaseAdmin: {
    auth: {
      getUser: async (token: string) =>
        token === "good"
          ? { data: { user: { id: "user-a" } }, error: null }
          : { data: { user: null }, error: new Error("bad") },
    },
    from: (table: string) => ({
      insert: async (row: unknown) => {
        state.inserts.push({ table, row });
        return { error: state.insertError };
      },
      update: (row: unknown) => ({
        eq: async () => {
          state.updates.push({ table, row });
          return { error: null };
        },
      }),
    }),
  },
}));

import { POST as verifyPayment } from "@/app/api/razorpay/verify-payment/route";
import { GET as deliverTip } from "@/app/api/notifications/deliver-tip/route";
import { GET as reminders } from "@/app/api/obligations/reminders/route";

const SECRET = "test_secret";

function verifyRequest(token = "good") {
  const order = "order_1";
  const payment = "pay_1";
  const sig = createHmac("sha256", SECRET)
    .update(`${order}|${payment}`)
    .digest("hex");
  return new Request("http://x/api/razorpay/verify-payment", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      razorpay_order_id: order,
      razorpay_payment_id: payment,
      razorpay_signature: sig,
    }),
  });
}

describe("verify-payment", () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = "rzp_test";
    process.env.RAZORPAY_KEY_SECRET = SECRET;
    state.orderNotes = { user_id: "user-a", plan: "pro" };
    state.insertError = null;
    state.inserts = [];
    state.updates = [];
  });

  it("upgrades the account that created the order and records the payment", async () => {
    const res = await verifyPayment(verifyRequest());
    expect(res.status).toBe(200);
    expect(state.inserts).toEqual([
      {
        table: "payments",
        row: expect.objectContaining({
          user_id: "user-a",
          razorpay_payment_id: "pay_1",
          amount_paise: 9900,
        }),
      },
    ]);
    expect(state.updates).toHaveLength(1);
  });

  it("refuses a payment made by another account", async () => {
    state.orderNotes = { user_id: "user-b" };
    const res = await verifyPayment(verifyRequest());
    expect(res.status).toBe(403);
    expect(state.updates).toHaveLength(0);
  });

  it("treats a replay of the same payment as already recorded", async () => {
    state.insertError = { code: "23505", message: "duplicate" };
    const res = await verifyPayment(verifyRequest());
    expect(res.status).toBe(200);
  });

  it("does not upgrade when the payment can't be recorded", async () => {
    state.insertError = { code: "XX000", message: "boom" };
    const res = await verifyPayment(verifyRequest());
    expect(res.status).toBe(500);
    expect(state.updates).toHaveLength(0);
  });

  it("rejects a bad signature and unauthenticated callers", async () => {
    const bad = new Request("http://x", {
      method: "POST",
      headers: { authorization: "Bearer good" },
      body: JSON.stringify({
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_1",
        razorpay_signature: "0".repeat(64),
      }),
    });
    expect((await verifyPayment(bad)).status).toBe(400);
    expect((await verifyPayment(verifyRequest("nope"))).status).toBe(401);
  });
});

describe("cron routes", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "cron";
  });

  for (const [name, handler] of [
    ["deliver-tip", deliverTip],
    ["obligation reminders", reminders],
  ] as const) {
    it(`${name} ignores a spoofed x-vercel-cron header`, async () => {
      const req = new NextRequest("http://x", {
        headers: { "x-vercel-cron": "1" },
      });
      const res = await handler(req);
      expect(res.status).toBe(401);
    });
  }
});
