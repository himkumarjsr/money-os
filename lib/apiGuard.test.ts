import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const createSupabaseServerClient = vi.fn(async () => ({
  auth: { getUser },
}));

vi.mock("@/lib/supabaseServer", () => ({
  createSupabaseServerClient: () => createSupabaseServerClient(),
}));

import {
  clientKeyFromHeaders,
  getAuthedUser,
  rateLimit,
  tooManyRequests,
  unauthorized,
} from "./apiGuard";

describe("apiGuard helpers", () => {
  beforeEach(() => {
    getUser.mockReset();
    createSupabaseServerClient.mockClear();
  });

  it("unauthorized returns 401 JSON with custom message", async () => {
    const res = unauthorized("Please sign in");
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Please sign in" });
  });

  it("tooManyRequests returns 429 with Retry-After", async () => {
    const res = tooManyRequests(30);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("Too many requests"),
    });
  });

  it("tooManyRequests defaults retry-after to 60", async () => {
    const res = tooManyRequests();
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("rateLimit allows up to limit then blocks", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    const blocked = rateLimit(key, 2, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("rateLimit resets after the window expires", () => {
    const key = `window-${Date.now()}-${Math.random()}`;
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(rateLimit(key, 1, 1000).ok).toBe(true);
    expect(rateLimit(key, 1, 1000).ok).toBe(false);
    vi.spyOn(Date, "now").mockReturnValue(now + 1001);
    expect(rateLimit(key, 1, 1000).ok).toBe(true);
    vi.restoreAllMocks();
  });

  it("clientKeyFromHeaders prefers first x-forwarded-for hop", () => {
    const h = new Headers({
      "x-forwarded-for": "1.2.3.4, 5.6.7.8",
      "x-real-ip": "9.9.9.9",
    });
    expect(clientKeyFromHeaders(h)).toBe("1.2.3.4");
  });

  it("clientKeyFromHeaders falls back to x-real-ip then unknown", () => {
    expect(clientKeyFromHeaders(new Headers({ "x-real-ip": "10.0.0.1" }))).toBe(
      "10.0.0.1",
    );
    expect(clientKeyFromHeaders(new Headers())).toBe("unknown");
  });

  it("getAuthedUser returns the supabase user", async () => {
    const user = { id: "u1", email: "a@b.com" };
    getUser.mockResolvedValue({ data: { user } });
    await expect(getAuthedUser()).resolves.toEqual(user);
  });

  it("getAuthedUser returns null when user is missing", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(getAuthedUser()).resolves.toBeNull();
  });

  it("getAuthedUser returns null when supabase throws", async () => {
    createSupabaseServerClient.mockRejectedValueOnce(new Error("boom"));
    await expect(getAuthedUser()).resolves.toBeNull();
  });
});

describe("rateLimit cost weighting", () => {
  it("spends cost units and refuses a request that would overshoot", () => {
    const key = `weighted-${Math.random()}`;
    expect(rateLimit(key, 10, 60_000, 4).ok).toBe(true);
    expect(rateLimit(key, 10, 60_000, 4).ok).toBe(true);
    const refused = rateLimit(key, 10, 60_000, 4);
    expect(refused.ok).toBe(false);
    expect(refused.retryAfter).toBeGreaterThan(0);
    expect(rateLimit(key, 10, 60_000, 2).ok).toBe(true);
    expect(rateLimit(key, 10, 60_000, 1).ok).toBe(false);
  });

  it("refuses a single request costing more than the whole budget", () => {
    expect(rateLimit(`huge-${Math.random()}`, 5, 60_000, 6).ok).toBe(false);
  });
});
