import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type GamificationStats = {
  fkBalance: number;
  totalEarned: number;
  streakDays: number;
  badges: string[];
};

/** Reads the user's row from `gamification`; null until loaded or if missing. */
export function useGamification(userId: string | undefined, refreshKey = 0) {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));

  useEffect(() => {
    if (!userId) {
      setStats(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("gamification")
          .select("fk_balance, total_earned, streak_days, badges")
          .eq("user_id", userId)
          .maybeSingle();
        if (cancelled || error || !data) return;
        setStats({
          fkBalance: Number(data.fk_balance ?? 0),
          totalEarned: Number(data.total_earned ?? 0),
          streakDays: Number(data.streak_days ?? 0),
          badges: Array.isArray(data.badges) ? (data.badges as string[]) : [],
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  return { stats, loading };
}
