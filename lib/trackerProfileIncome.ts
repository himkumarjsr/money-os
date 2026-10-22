import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileIncome = { salary: number; otherIncome: number };

/** In-memory copy for this tab/session. Cleared on full reload or explicit invalidation. */
const memoryByUser = new Map<string, ProfileIncome>();

function sessionKey(userId: string) {
  return `finkoin_tracker_profile_income_v2:${userId}`;
}

function readNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function readIncome(prof: unknown): ProfileIncome {
  const p = (prof ?? {}) as { monthlySalary?: unknown; otherIncome?: unknown };
  return {
    salary: readNumber(p.monthlySalary),
    otherIncome: readNumber(p.otherIncome),
  };
}

/**
 * Monthly salary from persisted analyse data in Supabase (not device-local Zustand).
 *
 * - **Cache miss** → query `user_analysis`, then `user_analyse_snapshots`, then store result.
 * - **Cache hit** → return immediately (no Supabase round-trip).
 * - **No TTL** → stays valid until `invalidateProfileMonthlySalaryCache(userId)` runs
 *   (e.g. after a successful analyse submit writes a new snapshot to the backend).
 */
export async function getProfileMonthlySalaryCached(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  return (await getProfileIncomeCached(supabase, userId)).salary;
}

/** Salary + monthly other income from the Analyse profile (same cache). */
export async function getProfileIncomeCached(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileIncome> {
  if (memoryByUser.has(userId)) {
    return memoryByUser.get(userId)!;
  }

  try {
    const raw = sessionStorage.getItem(sessionKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as { v?: ProfileIncome };
      if (parsed.v && typeof parsed.v.salary === "number") {
        const v = {
          salary: parsed.v.salary,
          otherIncome: readNumber(parsed.v.otherIncome),
        };
        memoryByUser.set(userId, v);
        return v;
      }
    }
  } catch {
    /* ignore */
  }

  let income: ProfileIncome = { salary: 0, otherIncome: 0 };

  try {
    const { data, error } = await supabase
      .from("user_analysis")
      .select("profile")
      .eq("user_id", userId)
      .maybeSingle();
    if (!error && data?.profile && typeof data.profile === "object") {
      income = readIncome(data.profile);
    }
  } catch {
    /* ignore */
  }

  if (!income.salary) {
    try {
      const { data, error } = await supabase
        .from("user_analyse_snapshots")
        .select("payload")
        .eq("user_id", userId)
        .maybeSingle();
      if (!error && data?.payload && typeof data.payload === "object") {
        const pl = data.payload as Record<string, unknown>;
        income = readIncome(pl.profile ?? pl.lastSubmission);
      }
    } catch {
      /* ignore */
    }
  }

  memoryByUser.set(userId, income);
  try {
    sessionStorage.setItem(sessionKey(userId), JSON.stringify({ v: income }));
  } catch {
    /* ignore */
  }

  return income;
}

/** Call after backend profile/snapshot changes so the next read refetches from Supabase. */
export function invalidateProfileMonthlySalaryCache(userId: string) {
  memoryByUser.delete(userId);
  try {
    sessionStorage.removeItem(sessionKey(userId));
  } catch {
    /* ignore */
  }
}
