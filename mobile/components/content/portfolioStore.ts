/**
 * Last MF portfolio analysis plus the one-time "portfolio-pro" badge, as on
 * web (`usePortfolioStore` + gamification `awardBadge`/`markEarnedAction`).
 * Local only, like web.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type PortfolioFund = {
  name: string;
  invested: number;
  value: number;
  xirr: number;
  verdict: "CONTINUE" | "WATCH" | "SWITCH" | "STOP";
  reason: string;
};

export type PortfolioAnalysis = {
  totalInvested: number;
  currentValue: number;
  xirr: number;
  funds: PortfolioFund[];
};

type State = {
  lastAnalysis: PortfolioAnalysis | null;
  badges: string[];
  earnedActions: string[];
  setLastAnalysis: (data: PortfolioAnalysis | null) => void;
  awardBadge: (id: string) => void;
  hasEarnedAction: (key: string) => boolean;
  markEarnedAction: (key: string) => void;
};

export const usePortfolioStore = create<State>()(
  persist(
    (set, get) => ({
      lastAnalysis: null,
      badges: [],
      earnedActions: [],
      setLastAnalysis: (data) => set({ lastAnalysis: data }),
      awardBadge: (id) =>
        set((s) => ({
          badges: s.badges.includes(id) ? s.badges : [...s.badges, id],
        })),
      hasEarnedAction: (key) => get().earnedActions.includes(key),
      markEarnedAction: (key) =>
        set((s) => ({
          earnedActions: s.earnedActions.includes(key)
            ? s.earnedActions
            : [...s.earnedActions, key],
        })),
    }),
    {
      name: "finkoin-portfolio-mobile",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
