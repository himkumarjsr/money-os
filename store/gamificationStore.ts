"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { localISODate, localYesterdayISODate } from "@/lib/localDate";
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
  addFK: (
    userId: string,
    amount: number,
    reason: string,
    referenceId?: string,
  ) => Promise<boolean>;
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
            try {
              await supabase
                .from("users")
                .update({ fk_balance: fk })
                .eq("id", userId);
            } catch {
              /* ignore legacy users.fk_balance sync */
            }
          } else {
            const { error: insertError } = await supabase
              .from("gamification")
              .insert({
                user_id: userId,
                fk_balance: 0,
                total_earned: 0,
                streak_days: 0,
                badges: [],
              });
            if (insertError) {
              console.error("fetchGamification insert error:", insertError);
              return;
            }
            set({
              fkBalance: 0,
              totalEarned: 0,
              streakDays: 0,
              lastLoginDate: null,
              badges: [],
              lastFetched: new Date().toISOString(),
            });
            try {
              await supabase
                .from("users")
                .update({ fk_balance: 0 })
                .eq("id", userId);
            } catch {
              /* ignore */
            }
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
      addFK: async (userId, amount, reason, referenceId) => {
        try {
          const supabase = getSupabase();

          set((state) => ({
            fkBalance: state.fkBalance + amount,
            totalEarned: state.totalEarned + amount,
            toastMessage:
              amount > 0 ? `+${amount} FK earned! 🎉` : state.toastMessage,
          }));

          const { data: current, error: currentError } = await supabase
            .from("gamification")
            .select("fk_balance, total_earned")
            .eq("user_id", userId)
            .maybeSingle();
          if (currentError) {
            throw currentError;
          }

          const newBalance = Number(current?.fk_balance ?? 0) + amount;
          const newTotal = Number(current?.total_earned ?? 0) + amount;

          const { error: upsertError } = await supabase
            .from("gamification")
            .upsert(
              {
                user_id: userId,
                fk_balance: newBalance,
                total_earned: newTotal,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" },
            );
          if (upsertError) {
            throw upsertError;
          }

          try {
            await supabase
              .from("users")
              .update({ fk_balance: newBalance })
              .eq("id", userId);
          } catch {
            /* ignore legacy users.fk_balance sync */
          }

          const { error: txnError } = await supabase
            .from("fk_transactions")
            .insert({
              user_id: userId,
              amount,
              reason,
              reference_id: referenceId ?? null,
            });
          if (txnError) {
            throw txnError;
          }

          set({ lastFetched: null });
          return true;
        } catch (err) {
          console.error("addFK error:", err);
          set((state) => ({
            fkBalance: state.fkBalance - amount,
            totalEarned: state.totalEarned - amount,
          }));
          return false;
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
      updateLoginStreak: async (userId) => {
        const today = localISODate();
        const supabase = getSupabase();

        const { data: gRow, error: readErr } = await supabase
          .from("gamification")
          .select("last_login, streak_days")
          .eq("user_id", userId)
          .maybeSingle();
        if (readErr) {
          console.error(
            "updateLoginStreak read error:",
            readErr.message ?? JSON.stringify(readErr),
          );
          return;
        }

        const lastLogin = asISODate(gRow?.last_login);
        if (lastLogin === today) {
          set({
            streakDays: Number(gRow?.streak_days ?? 0),
            lastLoginDate: today,
            lastFetched: null,
          });
          return;
        }

        const yesterday = localYesterdayISODate();
        const isConsecutive = lastLogin === yesterday;
        const newStreak = isConsecutive
          ? Number(gRow?.streak_days ?? 0) + 1
          : 1;

        const { error } = await supabase.from("gamification").upsert(
          {
            user_id: userId,
            streak_days: newStreak,
            last_login: today,
          },
          { onConflict: "user_id" },
        );
        if (error) {
          console.error(
            "updateLoginStreak error:",
            error.message ?? JSON.stringify(error),
          );
          return;
        }

        set({
          streakDays: newStreak,
          lastLoginDate: today,
          lastFetched: null,
        });

        const { data: alreadyAwarded } = await supabase
          .from("fk_transactions")
          .select("id")
          .eq("user_id", userId)
          .eq("reason", "daily_login")
          .eq("reference_id", today)
          .maybeSingle();

        if (alreadyAwarded) return;

        await get().addFK(userId, 5, "daily_login", today);
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
