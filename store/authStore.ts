"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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
    }),
    {
      name: "finkoin-auth",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

