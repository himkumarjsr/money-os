"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface GamificationState {
  fkBalance: number;
  badges: string[];
  streakDays: number;
  earnedActions: string[];
  toastMessage: string | null;
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
      badges: [],
      streakDays: 0,
      earnedActions: [],
      toastMessage: null,
      earnTokens: (amount) =>
        set((s) => ({
          fkBalance: s.fkBalance + amount,
          toastMessage: `+${amount} FK earned! 🎉`,
        })),
      awardBadge: (badgeId) =>
        set((s) => ({
          badges: s.badges.includes(badgeId) ? s.badges : [...s.badges, badgeId],
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
    },
  ),
);

