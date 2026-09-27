import type { SupabaseClient } from "@supabase/supabase-js";
import { appStorage } from "@/lib/storage";

/** In-memory copy for this session. Cleared on invalidate or process restart. */
const memoryByUser = new Map<string, number>();

function sessionKey(userId: string) {
  return `finkoin_tracker_profile_income_v1:${userId}`;
}

function readNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
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
  if (memoryByUser.has(userId)) {
    return memoryByUser.get(userId)!;
  }

  try {
    const raw = await appStorage.getItem(sessionKey(userId));
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

  // Snapshot first (canonical on web + mobile after B1)
  try {
    const { data, error } = await supabase
      .from("user_analyse_snapshots")
      .select("payload")
      .eq("user_id", userId)
      .maybeSingle();
    if (!error && data?.payload && typeof data.payload === "object") {
      const pl = data.payload as Record<string, unknown>;
      const prof = (pl.profile ?? pl.lastSubmission) as
        | { monthlySalary?: unknown }
        | undefined;
      salary = readNumber(prof?.monthlySalary);
    }
  } catch {
    /* ignore */
  }

  if (!salary) {
    try {
      const { data, error } = await supabase
        .from("user_analysis")
        .select("profile")
        .eq("user_id", userId)
        .maybeSingle();
      if (!error && data?.profile && typeof data.profile === "object") {
        salary = readNumber(
          (data.profile as { monthlySalary?: unknown }).monthlySalary,
        );
      }
    } catch {
      /* ignore */
    }
  }

  memoryByUser.set(userId, salary);
  try {
    await appStorage.setItem(sessionKey(userId), JSON.stringify({ v: salary }));
  } catch {
    /* ignore */
  }

  return salary;
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
