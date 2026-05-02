"use client";

import { getSupabase } from "@/lib/supabase";
import { useGamificationStore } from "@/store/gamificationStore";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

function randomReferralCode(seed: string) {
  const base = seed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) || "FINK";
  return `${base}${Math.floor(1000 + Math.random() * 9000)}`;
}

function mapSubscriptionTier(raw: unknown): "free" | "pro" | "promax" {
  if (raw === "free" || raw === "pro" || raw === "promax") return raw;
  return "free";
}

type UsersRow = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  subscription_tier?: string | null;
  subscription_expiry?: string | null;
  is_admin?: boolean | null;
  referral_code?: string | null;
  referred_by?: string | null;
  fk_balance?: number | null;
  pan_verified?: boolean | null;
  pan_last4?: string | null;
};

export interface User {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  photoURL: string | null;
  panVerified: boolean;
  panLast4: string | null;
  aadhaarVerified: boolean;
  subscriptionTier: "free" | "pro" | "promax";
  subscriptionExpiry: string | null;
  createdAt: string;
  referralCode: string;
  referredBy: string | null;
  isAdmin?: boolean;
  fkBalance?: number;
}

let authListenerStarted = false;

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  hasInitialized: boolean;
  subscriptionTier: "free" | "pro" | "promax";
  userId: string | null;

  setUser: (user: User) => void;
  updateUser: (patch: Partial<User>) => void;
  setLoading: (val: boolean) => void;
  setSubscription: (tier: "free" | "pro" | "promax") => void;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoggedIn: false,
      isLoading: true,
      hasInitialized: false,
      subscriptionTier: "free",
      userId: null,

      setUser: (user) =>
        set({
          user,
          userId: user.id,
          isLoggedIn: true,
          subscriptionTier: user.subscriptionTier,
        }),

      updateUser: (patch) =>
        set((s) => {
          if (!s.user) return {};
          const nextUser = { ...s.user, ...patch };
          return {
            user: nextUser,
            subscriptionTier: nextUser.subscriptionTier,
          };
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setSubscription: (tier) =>
        set((s) => ({
          subscriptionTier: tier,
          user: s.user ? { ...s.user, subscriptionTier: tier } : s.user,
        })),

      logout: async () => {
        console.log("Logout: starting");
        try {
          await fetch("/api/auth/sign-out", {
            method: "POST",
            credentials: "include",
            headers: { Accept: "application/json" },
          });
        } catch (e) {
          console.warn("server sign-out failed:", e);
        }
        try {
          const supabase = getSupabase();
          await supabase.auth.signOut({ scope: "global" });
        } catch (err) {
          console.error("Supabase signout error:", err);
        } finally {
          useGamificationStore.setState({
            fkBalance: 0,
            badges: [],
            streakDays: 0,
            earnedActions: [],
            toastMessage: null,
          });
          set({
            user: null,
            isLoggedIn: false,
            userId: null,
            subscriptionTier: "free",
            isLoading: false,
            hasInitialized: true,
          });
          try {
            await useAuthStore.persist.clearStorage();
          } catch {
            /* ignore */
          }
          try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (
                key &&
                (key.startsWith("finkoin") || key.includes("supabase") || key.toLowerCase().includes("auth-token"))
              ) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach((key) => localStorage.removeItem(key));
          } catch {
            /* ignore */
          }
          authListenerStarted = false;
          console.log("Logout: complete");
        }
      },

      refreshUser: async () => {
        try {
          const supabase = getSupabase();
          const {
            data: { session },
          } = await supabase.auth.getSession();

          let authUser = session?.user ?? null;
          if (!authUser) {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            authUser = user;
          }

          if (!authUser) {
            set({
              user: null,
              isLoggedIn: false,
              isLoading: false,
              hasInitialized: true,
              subscriptionTier: "free",
              userId: null,
            });
            return;
          }

          const userId = authUser.id;

          const { data: userData } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();

          const row = userData as UsersRow | null;

          let { data: gamData } = await supabase
            .from("gamification")
            .select("fk_balance, total_earned, streak_days, badges")
            .eq("user_id", userId)
            .maybeSingle();

          if (!gamData) {
            await supabase.from("gamification").insert({
              user_id: userId,
              fk_balance: 50,
              total_earned: 50,
              badges: [],
              streak_days: 0,
            });
            gamData = { fk_balance: 50, total_earned: 50, streak_days: 0, badges: [] };
          }

          const tier = mapSubscriptionTier(row?.subscription_tier ?? "free");
          const fkBal = Number(gamData?.fk_balance ?? row?.fk_balance ?? 50);

          const referral =
            typeof row?.referral_code === "string" && row.referral_code.length > 0
              ? row.referral_code
              : randomReferralCode(userId);

          if (row && (!row.referral_code || String(row.referral_code).length === 0)) {
            try {
              await supabase.from("users").update({ referral_code: referral }).eq("id", userId);
            } catch {
              /* ignore RLS / network */
            }
          }

          const meta = authUser.user_metadata ?? {};

          const rowAvatar =
            typeof row?.avatar_url === "string" && row.avatar_url.length > 0 ? row.avatar_url : null;
          const metaAvatar = typeof meta.avatar_url === "string" && meta.avatar_url.length > 0 ? meta.avatar_url : null;

          const nextUser: User = {
            id: userId,
            name:
              row?.name ??
              (typeof meta.name === "string" ? meta.name : null) ??
              authUser.email?.split("@")[0] ??
              null,
            email: row?.email ?? authUser.email ?? null,
            phone: row?.phone ?? authUser.phone ?? null,
            photoURL: rowAvatar ?? metaAvatar,
            panVerified: Boolean(row?.pan_verified),
            panLast4: typeof row?.pan_last4 === "string" && row.pan_last4.length > 0 ? row.pan_last4 : null,
            aadhaarVerified: false,
            subscriptionTier: tier,
            subscriptionExpiry: row?.subscription_expiry ?? null,
            createdAt: new Date().toISOString(),
            referralCode: referral,
            referredBy: row?.referred_by ?? null,
            isAdmin: Boolean(row?.is_admin),
            fkBalance: fkBal,
          };

          useGamificationStore.setState({
            fkBalance: fkBal,
            streakDays: Number(gamData?.streak_days ?? 0),
            badges: Array.isArray(gamData?.badges) ? (gamData.badges as string[]) : [],
          });

          set({
            user: nextUser,
            userId,
            isLoggedIn: true,
            subscriptionTier: tier,
            isLoading: false,
            hasInitialized: true,
          });
        } catch (err) {
          console.error("refreshUser error:", err);
          // Do not clear persisted user here — visibility/tab sync may retry; avoid logout on transient errors.
          set({ isLoading: false, hasInitialized: true });
        }
      },

      initAuth: async () => {
        console.log("initAuth: starting");
        const supabase = getSupabase();
        set({ isLoading: true });

        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          console.log("initAuth: session=", !!session?.user);

          let recoveredUser = session?.user ?? null;
          if (!recoveredUser) {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            recoveredUser = user;
            console.log("initAuth: user=", !!user);
          }

          if (recoveredUser) {
            await get().refreshUser();
            set({ hasInitialized: true, isLoading: false });
          } else {
            set({
              user: null,
              isLoggedIn: false,
              isLoading: false,
              hasInitialized: true,
              subscriptionTier: "free",
              userId: null,
            });
          }

          console.log("initAuth: complete", {
            hasInitialized: true,
            isLoggedIn: get().isLoggedIn,
          });

          if (!authListenerStarted) {
            authListenerStarted = true;
            supabase.auth.onAuthStateChange(async (event, sess) => {
              console.log("Auth event:", event);

              if (event === "SIGNED_OUT") {
                set({
                  user: null,
                  isLoggedIn: false,
                  userId: null,
                  subscriptionTier: "free",
                  isLoading: false,
                  hasInitialized: true,
                });
                return;
              }

              if (event === "SIGNED_IN" && sess?.user) {
                await get().refreshUser();

                try {
                  const createdAt = new Date(sess.user.created_at);
                  const ageMinutes = (Date.now() - createdAt.getTime()) / 60000;

                  console.log("SIGNED_IN: account age", ageMinutes, "minutes");

                  if (ageMinutes < 30) {
                    const { applyPendingReferralRewards } = await import("@/lib/referralRewards");
                    const supabase = getSupabase();
                    await applyPendingReferralRewards(supabase, sess.user.id);
                    console.log("Referral: processed on SIGNED_IN");
                  }
                } catch (e) {
                  console.warn("Referral SIGNED_IN error:", e);
                }
              } else if ((event === "TOKEN_REFRESHED" || event === "USER_UPDATED") && sess?.user) {
                await get().refreshUser();
              }
            });
          }
        } catch (err) {
          console.error("initAuth error:", err);
          set({
            user: null,
            isLoggedIn: false,
            isLoading: false,
            hasInitialized: true,
            subscriptionTier: "free",
            userId: null,
          });
        }
      },

      signUpWithEmail: async (email, password, name) => {
        set({ isLoading: true });
        try {
          const supabase = getSupabase();
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { name },
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });

          if (error) {
            set({ isLoading: false });
            return { error: error.message };
          }

          if (data.session) {
            await get().refreshUser();
            try {
              const { applyPendingReferralRewards } = await import("@/lib/referralRewards");
              await applyPendingReferralRewards(getSupabase(), data.session.user.id);
              console.log("Referral: processed after email signup");
            } catch (e) {
              console.warn("Referral signup error:", e);
            }
          }

          set({ isLoading: false });
          return { error: null };
        } catch (err: unknown) {
          set({ isLoading: false });
          const message = err instanceof Error ? err.message : "Signup failed";
          return { error: message };
        }
      },

      signInWithEmail: async (email, password) => {
        set({ isLoading: true });
        try {
          const supabase = getSupabase();
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });

          if (error) {
            set({ isLoading: false });
            return { error: error.message };
          }

          if (data.user) {
            await get().refreshUser();
          }

          set({ isLoading: false });
          return { error: null };
        } catch (err: unknown) {
          set({ isLoading: false });
          const message = err instanceof Error ? err.message : "Login failed";
          return { error: message };
        }
      },
    }),
    {
      name: "finkoin-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
      }),
    },
  ),
);
