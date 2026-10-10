"use client";

import { create } from "zustand";
import {
  THEME_PREF_KEY,
  THEME_PREMIUM_KEY,
  fetchPremiumStatus,
  parseThemePreference,
  type PremiumStatus,
  type ThemePreference,
} from "@/lib/theme";

type ThemeState = {
  preference: ThemePreference;
  premium: PremiumStatus | null;
  /** Read saved choices from localStorage. */
  load: (userId: string | null) => void;
  setPreference: (pref: ThemePreference) => void;
  refreshPremium: (userId: string | null) => Promise<void>;
};

function readPremium(userId: string | null): PremiumStatus | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(THEME_PREMIUM_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { userId: string; status: PremiumStatus };
    return saved.userId === userId ? saved.status : null;
  } catch {
    return null;
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: "light",
  premium: null,

  load: (userId) => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(THEME_PREF_KEY);
    } catch {
      /* storage blocked */
    }
    set({
      preference: parseThemePreference(raw),
      premium: readPremium(userId),
    });
  },

  setPreference: (preference) => {
    try {
      localStorage.setItem(THEME_PREF_KEY, preference);
    } catch {
      /* storage blocked: still applies for this visit */
    }
    set({ preference });
  },

  refreshPremium: async (userId) => {
    if (!userId) {
      try {
        localStorage.removeItem(THEME_PREMIUM_KEY);
      } catch {
        /* ignore */
      }
      set({ premium: null });
      return;
    }
    const status = await fetchPremiumStatus(userId);
    if (!status) return;
    try {
      localStorage.setItem(
        THEME_PREMIUM_KEY,
        JSON.stringify({ userId, status }),
      );
    } catch {
      /* ignore */
    }
    set({ premium: status });
  },
}));
