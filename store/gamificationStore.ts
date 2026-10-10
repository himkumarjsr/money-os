"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { apiFetch } from "@/lib/apiFetch";
import { getSupabase } from "@/lib/supabase";
import { uniqueChannelName } from "@/lib/realtimeChannel";

/** Normalize DB/API date values to YYYY-MM-DD for streak comparisons. */
function asISODate(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

interface GamificationState {
  fkBalance: number;
  totalEarned: number;
  lastLoginDate: string | null;
  badges: string[];
  streakDays: number;
  rank: number | null;
  percentile: number | null;
  lastFetched: string | null;
  earnedActions: string[];
  toastMessage: string | null;
  fetchGamification: (userId: string) => Promise<void>;
  subscribeToRealtime: (userId: string) => () => void;
  updateLoginStreak: (userId: string) => Promise<void>;
  earnTokens: (amount: number, label: string) => void;
  awardBadge: (badgeId: string) => void;
  hasEarnedAction: (key: string) => boolean;
  markEarnedAction: (key: string) => void;
  clearToast: () => void;
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      fkBalance: 0,
      totalEarned: 0,
      lastLoginDate: null,
      badges: [],
      streakDays: 0,
      rank: null,
      percentile: null,
      lastFetched: null,
      earnedActions: [],
      toastMessage: null,
      fetchGamification: async (userId) => {
        const { lastFetched } = get();
        if (lastFetched) {
          const age = Date.now() - new Date(lastFetched).getTime();
          if (age < 5 * 60 * 1000) {
            console.log("Gamification: using cache");
            return;
          }
        }

        try {
          const supabase = getSupabase();
          const { data, error } = await supabase
            .from("gamification")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();
          if (error) {
            console.error("fetchGamification error:", error);
            return;
          }

          if (data) {
            const fk = Number(data.fk_balance ?? 0);
            set({
              fkBalance: fk,
              totalEarned: Number(data.total_earned ?? 0),
              streakDays: Number(data.streak_days ?? 0),
              lastLoginDate: asISODate(data.last_login),
              badges: Array.isArray(data.badges)
                ? (data.badges as string[])
                : [],
              lastFetched: new Date().toISOString(),
            });
          } else {
            // No row yet: updateLoginStreak's server call creates it.
            set({
              fkBalance: 0,
              totalEarned: 0,
              streakDays: 0,
              lastLoginDate: null,
              badges: [],
              lastFetched: new Date().toISOString(),
            });
          }

          const { data: rankData, error: rankError } = await supabase
            .from("leaderboard_view")
            .select("rank, percentile")
            .eq("user_id", userId)
            .maybeSingle();
          if (rankError) {
            console.error("fetchGamification rank error:", rankError);
          } else if (rankData) {
            set({
              rank: Number(rankData.rank ?? 0) || null,
              percentile: Number(rankData.percentile ?? 0) || null,
            });
          }
        } catch (err) {
          console.error("fetchGamification error:", err);
        }
      },
      subscribeToRealtime: (userId) => {
        const supabase = getSupabase();
        const subscription = supabase
          .channel(uniqueChannelName(`gamification:${userId}`))
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "gamification",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              const data = payload.new as {
                fk_balance?: number | null;
                total_earned?: number | null;
                streak_days?: number | null;
                last_login?: string | null;
                badges?: unknown;
              };
              set({
                fkBalance: Number(data.fk_balance ?? 0),
                totalEarned: Number(data.total_earned ?? 0),
                streakDays: Number(data.streak_days ?? 0),
                lastLoginDate: asISODate(data.last_login),
                badges: Array.isArray(data.badges)
                  ? (data.badges as string[])
                  : [],
                lastFetched: new Date().toISOString(),
              });
            },
          )
          .subscribe();

        return () => {
          void supabase.removeChannel(subscription);
        };
      },
      // Streak and the daily 5 FK are recorded by the server (FK balances
      // are server-only); the response carries the updated row.
      updateLoginStreak: async () => {
        try {
          const res = await apiFetch("/api/gamification/daily-login", {
            method: "POST",
          });
          if (!res.ok) {
            console.error("updateLoginStreak error:", res.status);
            return;
          }
          const data = (await res.json()) as {
            fkBalance: number;
            totalEarned: number;
            streakDays: number;
            lastLogin: string | null;
            badges: string[];
            awarded: number;
          };
          set((state) => ({
            fkBalance: data.fkBalance,
            totalEarned: data.totalEarned,
            streakDays: data.streakDays,
            lastLoginDate: asISODate(data.lastLogin),
            badges: data.badges,
            lastFetched: new Date().toISOString(),
            toastMessage:
              data.awarded > 0
                ? `+${data.awarded} FK earned! 🎉`
                : state.toastMessage,
          }));
        } catch (err) {
          console.error("updateLoginStreak error:", err);
        }
      },
      earnTokens: (amount) =>
        set((s) => ({
          fkBalance: s.fkBalance + amount,
          totalEarned: s.totalEarned + amount,
          toastMessage: `+${amount} FK earned! 🎉`,
        })),
      awardBadge: (badgeId) =>
        set((s) => ({
          badges: s.badges.includes(badgeId)
            ? s.badges
            : [...s.badges, badgeId],
        })),
      hasEarnedAction: (key) => get().earnedActions.includes(key),
      markEarnedAction: (key) =>
        set((s) => ({
          earnedActions: s.earnedActions.includes(key)
            ? s.earnedActions
            : [...s.earnedActions, key],
        })),
      clearToast: () => set({ toastMessage: null }),
    }),
    {
      name: "finkoin-gamification",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        fkBalance: state.fkBalance,
        totalEarned: state.totalEarned,
        streakDays: state.streakDays,
        lastLoginDate: state.lastLoginDate,
        badges: state.badges,
        rank: state.rank,
        percentile: state.percentile,
        earnedActions: state.earnedActions,
      }),
    },
  ),
);
