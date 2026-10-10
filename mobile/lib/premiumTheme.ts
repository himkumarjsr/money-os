/**
 * Premium (black and gold) theme eligibility:
 *  - a generated report and a 90-day streak (three months of daily use), or
 *  - a top-10 spot on the FK leaderboard.
 */
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { fetchUserAnalyseSnapshot } from "@/lib/userAnalyseSnapshot";

export const PREMIUM_STREAK_DAYS = 90;
export const PREMIUM_TOP_RANK = 10;

export type PremiumStatus = {
  unlocked: boolean;
  streakDays: number;
  rank: number | null;
  hasReport: boolean;
};

export function isPremiumEligible(s: Omit<PremiumStatus, "unlocked">): boolean {
  if (s.rank != null && s.rank >= 1 && s.rank <= PREMIUM_TOP_RANK) return true;
  return s.hasReport && s.streakDays >= PREMIUM_STREAK_DAYS;
}

export async function fetchPremiumStatus(
  userId: string,
): Promise<PremiumStatus | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const [{ data: row }, snapshot] = await Promise.all([
      supabase
        .from("leaderboard_view")
        .select("rank, streak_days")
        .eq("user_id", userId)
        .maybeSingle(),
      fetchUserAnalyseSnapshot(userId).catch(() => null),
    ]);
    const base = {
      streakDays: Number(row?.streak_days ?? 0) || 0,
      rank: row?.rank != null ? Number(row.rank) : null,
      hasReport: Boolean(snapshot?.result),
    };
    return { ...base, unlocked: isPremiumEligible(base) };
  } catch {
    return null;
  }
}
