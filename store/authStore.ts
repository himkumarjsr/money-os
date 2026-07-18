"use client";

import { getSupabase } from "@/lib/supabase";
import { useGamificationStore } from "@/store/gamificationStore";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

function randomReferralCode(seed: string) {
  const base =
    seed
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 6) || "FINK";
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
  referral_reward_given?: boolean | null;
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

const AUTH_PERSIST_KEY = "finkoin-auth";

/**
 * Read persisted login from localStorage.
 * Must NOT be applied during store module init — that diverges SSR vs client and
 * causes React hydration mismatches. Apply via `applyPersistedAuthBootstrap()`
 * in a client useLayoutEffect (before paint) instead.
 */
export function readPersistedAuthBootstrap(): {
  user: User | null;
  isLoggedIn: boolean;
  userId: string | null;
  subscriptionTier: "free" | "pro" | "promax";
} {
  if (typeof window === "undefined") {
    return {
      user: null,
      isLoggedIn: false,
      userId: null,
      subscriptionTier: "free",
    };
  }
  try {
    const raw = window.localStorage.getItem(AUTH_PERSIST_KEY);
    if (!raw) {
      return {
        user: null,
        isLoggedIn: false,
        userId: null,
        subscriptionTier: "free",
      };
    }
    const parsed = JSON.parse(raw) as {
      state?: { user?: User | null; isLoggedIn?: boolean };
    };
    const state =
      parsed?.state ?? (parsed as { user?: User | null; isLoggedIn?: boolean });
    const user =
      state?.user && typeof state.user === "object" && state.user.id
        ? state.user
        : null;
    const isLoggedIn = Boolean(state?.isLoggedIn && user);
    return {
      user: isLoggedIn ? user : null,
      isLoggedIn,
      userId: isLoggedIn && user ? user.id : null,
      subscriptionTier:
        isLoggedIn && user
          ? mapSubscriptionTier(user.subscriptionTier)
          : "free",
    };
  } catch {
    return {
      user: null,
      isLoggedIn: false,
      userId: null,
      subscriptionTier: "free",
    };
  }
}

/** Apply localStorage auth before first paint (call from useLayoutEffect only). */
export function applyPersistedAuthBootstrap(): boolean {
  const boot = readPersistedAuthBootstrap();
  if (!boot.isLoggedIn || !boot.user) return false;
  useAuthStore.setState({
    user: boot.user,
    isLoggedIn: true,
    userId: boot.userId,
    subscriptionTier: boot.subscriptionTier,
    isLoading: false,
    hasInitialized: true,
  });
  return true;
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
  signUpWithEmail: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ error: string | null }>;
  signInWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  refreshUser: (opts?: { clearOnMissingSession?: boolean }) => Promise<void>;
}

function clearLoggedOutState(set: (partial: Partial<AuthState>) => void) {
  set({
    user: null,
    isLoggedIn: false,
    userId: null,
    subscriptionTier: "free",
    isLoading: false,
    hasInitialized: true,
  });
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Always identical on server + first client render (avoids hydration mismatch).
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
            totalEarned: 0,
            badges: [],
            streakDays: 0,
            lastLoginDate: null,
            rank: null,
            percentile: null,
            lastFetched: null,
            earnedActions: [],
            toastMessage: null,
          });
          clearLoggedOutState(set);
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
                (key.startsWith("finkoin") ||
                  key.includes("supabase") ||
                  key.toLowerCase().includes("auth-token"))
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

      refreshUser: async (opts) => {
        const clearOnMissingSession = opts?.clearOnMissingSession !== false;
        const hadUser = Boolean(get().user);

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
            // Avoid wiping a warm PWA session on a transient cookie miss.
            if (clearOnMissingSession && !hadUser) {
              clearLoggedOutState(set);
            } else if (clearOnMissingSession && hadUser) {
              // Second chance: cookies sometimes lag on iOS standalone open.
              await new Promise((r) => setTimeout(r, 250));
              const {
                data: { session: retrySession },
              } = await supabase.auth.getSession();
              const retryUser =
                retrySession?.user ?? (await supabase.auth.getUser()).data.user;
              if (!retryUser) {
                clearLoggedOutState(set);
                return;
              }
              authUser = retryUser;
            } else {
              set({ isLoading: false, hasInitialized: true });
              return;
            }
          }

          if (!authUser) return;

          const userId = authUser.id;

          const { data: userData } = await supabase
            .from("users")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

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
            gamData = {
              fk_balance: 50,
              total_earned: 50,
              streak_days: 0,
              badges: [],
            };
          }

          const tier = mapSubscriptionTier(row?.subscription_tier ?? "free");
          const fkBal = Number(gamData?.fk_balance ?? 50);

          const referral =
            typeof row?.referral_code === "string" &&
            row.referral_code.length > 0
              ? row.referral_code
              : randomReferralCode(userId);

          if (
            row &&
            (!row.referral_code || String(row.referral_code).length === 0)
          ) {
            try {
              await supabase
                .from("users")
                .update({ referral_code: referral })
                .eq("id", userId);
            } catch {
              /* ignore RLS / network */
            }
          }

          const meta = authUser.user_metadata ?? {};

          const rowAvatar =
            typeof row?.avatar_url === "string" && row.avatar_url.length > 0
              ? row.avatar_url
              : null;
          const metaAvatar =
            typeof meta.avatar_url === "string" && meta.avatar_url.length > 0
              ? meta.avatar_url
              : null;

          useGamificationStore.setState({
            fkBalance: fkBal,
            totalEarned: Number(gamData?.total_earned ?? fkBal),
            streakDays: Number(gamData?.streak_days ?? 0),
            badges: Array.isArray(gamData?.badges)
              ? (gamData.badges as string[])
              : [],
            lastFetched: null,
          });

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
            panLast4:
              typeof row?.pan_last4 === "string" && row.pan_last4.length > 0
                ? row.pan_last4
                : null,
            aadhaarVerified: false,
            subscriptionTier: tier,
            subscriptionExpiry: row?.subscription_expiry ?? null,
            createdAt: new Date().toISOString(),
            referralCode: referral,
            referredBy: row?.referred_by ?? null,
            isAdmin: Boolean(row?.is_admin),
            fkBalance: useGamificationStore.getState().fkBalance,
          };

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
          // Network blip: keep persisted login; only mark initialized.
          set({ isLoading: false, hasInitialized: true });
        }
      },

      initAuth: async () => {
        console.log("initAuth: starting");
        const supabase = getSupabase();
        const hadPersistedLogin = get().isLoggedIn && Boolean(get().user);
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

          // iOS PWA cold start: cookies can lag a tick behind local persist.
          if (!recoveredUser && hadPersistedLogin) {
            await new Promise((r) => setTimeout(r, 300));
            const {
              data: { session: retrySession },
            } = await supabase.auth.getSession();
            recoveredUser =
              retrySession?.user ?? (await supabase.auth.getUser()).data.user;
            console.log("initAuth: retry user=", !!recoveredUser);
          }

          if (recoveredUser) {
            await get().refreshUser({ clearOnMissingSession: true });
            set({ hasInitialized: true, isLoading: false });
          } else if (hadPersistedLogin) {
            // Confirmed no live session — clear stale persist.
            clearLoggedOutState(set);
          } else {
            set({
              isLoading: false,
              hasInitialized: true,
            });
          }

          console.log("initAuth: complete", {
            hasInitialized: true,
            isLoggedIn: get().isLoggedIn,
          });

          if (!authListenerStarted) {
            authListenerStarted = true;
            // Sync callback only — never await auth APIs inside onAuthStateChange
            // (can deadlock after idle tab resume / token refresh).
            supabase.auth.onAuthStateChange((event, sess) => {
              console.log("Auth event:", event);

              if (event === "SIGNED_OUT") {
                clearLoggedOutState(set);
                return;
              }

              if (event === "SIGNED_IN" && sess?.user) {
                const userId = sess.user.id;
                const createdAt = sess.user.created_at;
                setTimeout(() => {
                  void (async () => {
                    await get().refreshUser({ clearOnMissingSession: true });
                    try {
                      const ageMinutes =
                        (Date.now() - new Date(createdAt).getTime()) / 60000;
                      console.log(
                        "SIGNED_IN: account age minutes =",
                        ageMinutes,
                      );
                      if (ageMinutes < 30) {
                        const { applyPendingReferralRewards } =
                          await import("@/lib/referralRewards");
                        const client = getSupabase();
                        await applyPendingReferralRewards(client, userId);
                        console.log("Referral: processed on SIGNED_IN");
                      }
                    } catch (e) {
                      console.warn("Referral error:", e);
                    }
                  })();
                }, 0);
              } else if (
                (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") &&
                sess?.user
              ) {
                setTimeout(() => {
                  void get().refreshUser({ clearOnMissingSession: false });
                }, 0);
              }
            });
          }
        } catch (err) {
          console.error("initAuth error:", err);
          // Keep optimistic persisted login on init failure (offline / flaky network).
          set({
            isLoading: false,
            hasInitialized: true,
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
            await get().refreshUser({ clearOnMissingSession: true });
            try {
              const { applyPendingReferralRewards } =
                await import("@/lib/referralRewards");
              const client = getSupabase();
              await applyPendingReferralRewards(client, data.session.user.id);
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
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            set({ isLoading: false });
            return { error: error.message };
          }

          if (data.user) {
            await get().refreshUser({ clearOnMissingSession: true });
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
      name: AUTH_PERSIST_KEY,
      storage: createJSONStorage(() => localStorage),
      // Persist write path only; bootstrap is applied in AppInitializer useLayoutEffect.
      skipHydration: true,
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
      }),
    },
  ),
);
