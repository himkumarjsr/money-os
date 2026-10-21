import type { SupabaseClient } from "@supabase/supabase-js";
import { appStorage } from "@/lib/storage";

export type ProfileIncome = { salary: number; otherIncome: number };

/** In-memory copy for this session. Cleared on invalidate or process restart. */
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
 * Monthly salary from persisted analyse data in Supabase.
 *
 * Prefers `user_analyse_snapshots` (canonical), then falls back to `user_analysis`.
 * Cache: memory + `appStorage` until `invalidateProfileMonthlySalaryCache`.
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
    const raw = await appStorage.getItem(sessionKey(userId));
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

  // Snapshot first (canonical on web + mobile after B1)
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

  if (!income.salary) {
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
  }

  memoryByUser.set(userId, income);
  try {
    await appStorage.setItem(sessionKey(userId), JSON.stringify({ v: income }));
  } catch {
    /* ignore */
  }

  return income;
}

/** Call after backend profile/snapshot changes so the next read refetches. */
export async function invalidateProfileMonthlySalaryCache(userId: string) {
  memoryByUser.delete(userId);
  try {
    await appStorage.removeItem(sessionKey(userId));
  } catch {
    /* ignore */
  }
}
