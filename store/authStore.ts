"use client";

import { supabase } from "@/lib/supabase";
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
  subscription_tier?: string | null;
  is_admin?: boolean | null;
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

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  subscriptionTier: "free" | "pro" | "promax";
  userId: string | null; // legacy compatibility
  setUser: (user: User) => void;
  updateUser: (patch: Partial<User>) => void;
  setLoading: (value: boolean) => void;
  setSubscription: (tier: "free" | "pro" | "promax") => void;
  logout: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoggedIn: false,
      isLoading: false,
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
          if (!s.user) return { user: null };
          const nextUser = { ...s.user, ...patch };
          return {
            user: nextUser,
            subscriptionTier: nextUser.subscriptionTier,
          };
        }),
      setLoading: (value) => set({ isLoading: value }),
      setSubscription: (tier) =>
        set((s) => ({
          subscriptionTier: tier,
          user: s.user ? { ...s.user, subscriptionTier: tier } : s.user,
        })),
      logout: () =>
        set({
          user: null,
          isLoggedIn: false,
          isLoading: false,
          subscriptionTier: "free",
          userId: null,
        }),
      signInWithEmail: async (email, password) => {
        if (!supabase) {
          return { error: "Supabase not configured" };
        }

        set({ isLoading: true });

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          set({ isLoading: false });
          return { error: error.message };
        }

        if (!data.user) {
          set({ isLoading: false });
          return { error: "Invalid email or password" };
        }

        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        const row = userData as UsersRow | null;
        const tier = mapSubscriptionTier(row?.subscription_tier);
        const displayName = row?.name ?? email.split("@")[0] ?? "User";

        const user: User = {
          id: data.user.id,
          name: displayName,
          phone: data.user.phone ?? null,
          email: data.user.email ?? email,
          photoURL: data.user.user_metadata?.avatar_url ?? null,
          panVerified: false,
          panLast4: null,
          aadhaarVerified: false,
          subscriptionTier: tier,
          subscriptionExpiry: null,
          createdAt: new Date().toISOString(),
          referralCode: randomReferralCode(data.user.id),
          referredBy: null,
          isAdmin: Boolean(row?.is_admin),
          fkBalance: 500,
        };

        set({
          user,
          userId: user.id,
          isLoggedIn: true,
          subscriptionTier: tier,
          isLoading: false,
        });

        return { error: null };
      },
      initAuth: async () => {
        set({ isLoading: true });
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          set({
            user: null,
            userId: null,
            isLoggedIn: false,
            subscriptionTier: "free",
            isLoading: false,
          });
          return;
        }

        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();

        const { data: gamDataRaw } = await supabase
          .from("gamification")
          .select("fk_balance, total_earned, streak_days, badges")
          .eq("user_id", authUser.id)
          .maybeSingle();

        let gamData = gamDataRaw as
          | { fk_balance?: number | null; total_earned?: number | null; streak_days?: number | null; badges?: unknown[] | null }
          | null;
        if (!gamData) {
          await supabase.from("gamification").insert({
            user_id: authUser.id,
            fk_balance: 50,
            total_earned: 50,
            badges: [],
            streak_days: 0,
          });
          gamData = { fk_balance: 50, total_earned: 50, badges: [], streak_days: 0 };
        }

        const row = userData as UsersRow | null;
        const tier = mapSubscriptionTier(row?.subscription_tier ?? "free");
        const displayName = row?.name ?? authUser.user_metadata?.name ?? authUser.email?.split("@")[0] ?? "User";

        const nextUser: User = {
          id: authUser.id,
          name: displayName,
          phone: authUser.phone ?? null,
          email: authUser.email ?? null,
          photoURL: authUser.user_metadata?.avatar_url ?? null,
          panVerified: false,
          panLast4: null,
          aadhaarVerified: false,
          subscriptionTier: tier,
          subscriptionExpiry: null,
          createdAt: new Date().toISOString(),
          referralCode: randomReferralCode(authUser.id),
          referredBy: null,
          isAdmin: Boolean(row?.is_admin),
          fkBalance: Number(gamData?.fk_balance ?? (userData as { fk_balance?: number } | null)?.fk_balance ?? 50),
        };

        set({
          user: nextUser,
          userId: nextUser.id,
          isLoggedIn: true,
          subscriptionTier: tier,
          isLoading: false,
        });
      },
    }),
    {
      name: "finkoin-auth",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

