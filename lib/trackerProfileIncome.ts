import type { SupabaseClient } from "@supabase/supabase-js";

/** In-memory copy for this tab/session. Cleared on full reload or explicit invalidation. */
const memoryByUser = new Map<string, number>();

function sessionKey(userId: string) {
  return `finkoin_tracker_profile_income_v1:${userId}`;
}

function readNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
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
  if (memoryByUser.has(userId)) {
    return memoryByUser.get(userId)!;
  }

  try {
    const raw = sessionStorage.getItem(sessionKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as { v?: number };
      if (typeof parsed.v === "number") {
        memoryByUser.set(userId, parsed.v);
        return parsed.v;
      }
    }
  } catch {
    /* ignore */
  }

  let salary = 0;

  try {
    const { data, error } = await supabase.from("user_analysis").select("profile").eq("user_id", userId).maybeSingle();
    if (!error && data?.profile && typeof data.profile === "object") {
      salary = readNumber((data.profile as { monthlySalary?: unknown }).monthlySalary);
    }
  } catch {
    /* ignore */
  }

  if (!salary) {
    try {
      const { data, error } = await supabase.from("user_analyse_snapshots").select("payload").eq("user_id", userId).maybeSingle();
      if (!error && data?.payload && typeof data.payload === "object") {
        const pl = data.payload as Record<string, unknown>;
        const prof = (pl.profile ?? pl.lastSubmission) as { monthlySalary?: unknown } | undefined;
        salary = readNumber(prof?.monthlySalary);
      }
    } catch {
      /* ignore */
    }
  }

  memoryByUser.set(userId, salary);
  try {
    sessionStorage.setItem(sessionKey(userId), JSON.stringify({ v: salary }));
  } catch {
    /* ignore */
  }

  return salary;
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
