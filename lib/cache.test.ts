import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearCache,
  enginePlanFingerprint,
  getCachedPlan,
  hashProfile,
  isCachedAiStale,
  loadFromSupabase,
  saveToSupabase,
  setCachedPlan,
} from "./cache";

describe("hashProfile", () => {
  it("returns stable hash for same profile payload", () => {
    const a = hashProfile({ monthlySalary: 100000, cityTier: "metro" });
    const b = hashProfile({ monthlySalary: 100000, cityTier: "metro" });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-z]+$/);
  });

  it("changes when any profile field changes", () => {
    const a = hashProfile({ monthlySalary: 100000 });
    const b = hashProfile({ monthlySalary: 100001 });
    expect(a).not.toBe(b);
  });

  it("changes when medical fund or goal changes", () => {
    const base = {
      monthlySalary: 100000,
      medicalEmergencyFund: 200000,
      primaryGoal: "grow_wealth",
    };
    expect(hashProfile(base)).not.toBe(
      hashProfile({ ...base, medicalEmergencyFund: 300000 }),
    );
    expect(hashProfile(base)).not.toBe(
      hashProfile({ ...base, primaryGoal: "clear_debt" }),
    );
  });

  it("changes when analysis score changes", () => {
    const profile = { monthlySalary: 100000 };
    expect(hashProfile(profile, { overallScore: 70 })).not.toBe(
      hashProfile(profile, { overallScore: 80 }),
    );
  });

  it("handles empty / sparse profiles", () => {
    expect(hashProfile({})).toMatch(/^[0-9a-z]+$/);
    expect(hashProfile({ monthlySalary: undefined })).toBe(
      hashProfile({ monthlySalary: undefined }),
    );
  });
});

describe("enginePlanFingerprint / isCachedAiStale", () => {
  it("marks cache stale when fingerprint missing or differs", () => {
    const fp = enginePlanFingerprint({
      monthlySurplus: 10000,
      priorities: [
        {
          id: "medical_fund",
          gap: 0,
          monthlyContribution: 0,
          status: "complete",
        },
      ],
      goals: [{ goalType: "grow_wealth", targetAmount: 1 }],
    });
    expect(isCachedAiStale(null, fp)).toBe(true);
    expect(
      isCachedAiStale(
        {
          profileHash: "h",
          aiPlan: {},
          projection: null,
          generatedAt: new Date().toISOString(),
        },
        fp,
      ),
    ).toBe(true);
    expect(
      isCachedAiStale(
        {
          profileHash: "h",
          aiPlan: {},
          projection: null,
          generatedAt: new Date().toISOString(),
          engineFingerprint: fp,
        },
        fp,
      ),
    ).toBe(false);
    expect(
      isCachedAiStale(
        {
          profileHash: "h",
          aiPlan: {},
          projection: null,
          generatedAt: new Date().toISOString(),
          engineFingerprint: fp,
        },
        "other",
      ),
    ).toBe(true);
  });
});

describe("session cache helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it("returns null when cache empty or hash mismatches", () => {
    expect(getCachedPlan("abc")).toBeNull();
    setCachedPlan("abc", { ok: true }, { years: 1 });
    expect(getCachedPlan("other")).toBeNull();
  });

  it("stores and retrieves matching cache", () => {
    setCachedPlan("h1", { plan: 1 }, { projection: 2 });
    const cached = getCachedPlan("h1");
    expect(cached?.profileHash).toBe("h1");
    expect(cached?.aiPlan).toEqual({ plan: 1 });
    expect(cached?.projection).toEqual({ projection: 2 });
    expect(cached?.generatedAt).toBeTruthy();
  });

  it("expires entries older than 30 days", () => {
    vi.useFakeTimers();
    setCachedPlan("old", { a: 1 }, null);
    vi.setSystemTime(new Date(Date.now() + 31 * 24 * 60 * 60 * 1000));
    expect(getCachedPlan("old")).toBeNull();
    vi.useRealTimers();
  });

  it("keeps entries within 30 days", () => {
    vi.useFakeTimers();
    setCachedPlan("fresh", { a: 1 }, null);
    vi.setSystemTime(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000));
    expect(getCachedPlan("fresh")?.aiPlan).toEqual({ a: 1 });
    vi.useRealTimers();
  });

  it("clears cache", () => {
    setCachedPlan("h", {}, {});
    clearCache();
    expect(getCachedPlan("h")).toBeNull();
  });

  it("returns null on corrupt JSON", () => {
    sessionStorage.setItem("finkoin_ai_cache", "{not-json");
    expect(getCachedPlan("x")).toBeNull();
  });

  it("keeps plans out of localStorage and purges old plaintext copies", () => {
    localStorage.setItem("finkoin_ai_cache", "legacy");
    setCachedPlan("h1", { plan: 1 }, null);
    expect(localStorage.getItem("finkoin_ai_cache")).toBeNull();
    expect(sessionStorage.getItem("finkoin_ai_cache")).toContain("h1");
  });
});

describe("supabase cache helpers", () => {
  it("no-ops save/load without client or user", async () => {
    await expect(
      saveToSupabase("", null, "h", {}, {}, {}),
    ).resolves.toBeUndefined();
    await expect(loadFromSupabase("", null)).resolves.toBeNull();
    await expect(loadFromSupabase("u1", null)).resolves.toBeNull();
  });

  it("upserts analysis row on save", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const supabase = { from: vi.fn(() => ({ upsert })) };
    await saveToSupabase(
      "user-1",
      supabase,
      "hash",
      { a: 1 },
      { b: 2 },
      { c: 3 },
    );
    expect(supabase.from).toHaveBeenCalledWith("user_analysis");
    expect(upsert).toHaveBeenCalledTimes(1);
    const [payload, opts] = upsert.mock.calls[0];
    expect(payload.user_id).toBe("user-1");
    expect(payload.profile_hash).toBe("hash");
    expect(payload.profile).toEqual({ a: 1 });
    expect(payload.analysis_result).toEqual({ b: 2 });
    expect(payload.ai_fix_plan).toEqual({ c: 3 });
    expect(payload.ai_generated_at).toEqual(expect.any(String));
    expect(payload.updated_at).toEqual(expect.any(String));
    expect(opts).toEqual({ onConflict: "user_id" });
  });

  it("loads mapped fields from supabase", async () => {
    const row = {
      profile_hash: "h",
      profile: { x: 1 },
      analysis_result: { y: 2 },
      ai_fix_plan: { z: 3 },
    };
    const single = vi.fn().mockResolvedValue({ data: row });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const supabase = { from: vi.fn(() => ({ select })) };
    const loaded = await loadFromSupabase("u1", supabase);
    expect(loaded).toEqual({
      profileHash: "h",
      profile: { x: 1 },
      analysisResult: { y: 2 },
      aiPlan: { z: 3 },
    });
  });

  it("returns null when no data or query throws", async () => {
    const singleEmpty = vi.fn().mockResolvedValue({ data: null });
    const supabaseEmpty = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: singleEmpty })) })),
      })),
    };
    await expect(loadFromSupabase("u1", supabaseEmpty)).resolves.toBeNull();

    const supabaseThrow = {
      from: vi.fn(() => {
        throw new Error("boom");
      }),
    };
    await expect(loadFromSupabase("u1", supabaseThrow)).resolves.toBeNull();
  });
});
