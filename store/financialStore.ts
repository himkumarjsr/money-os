import {
  analyseDefaultValues,
  type AnalyseFormValues,
  type FinancialProfile,
} from "@/lib/analyse-form-schema";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type FinancialState = {
  analysis: Partial<AnalyseFormValues> | null;
  lastSubmission: FinancialProfile | null;
  hasHydrated: boolean;
  setAnalysis: (patch: Partial<AnalyseFormValues>) => void;
  setFullAnalysis: (data: FinancialProfile) => void;
  clearSubmission: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set) => ({
      analysis: analyseDefaultValues,
      lastSubmission: null,
      hasHydrated: false,
      setAnalysis: (patch) =>
        set((state) => ({
          analysis: { ...analyseDefaultValues, ...(state.analysis ?? {}), ...patch },
        })),
      setFullAnalysis: (data) =>
        set({
          lastSubmission: data,
        }),
      clearSubmission: () => set({ lastSubmission: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "money-os-analysis",
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const typed = persistedState as Partial<FinancialState> | undefined;
        return {
          ...currentState,
          ...typed,
          analysis: {
            ...analyseDefaultValues,
            ...(typed?.analysis ?? {}),
          },
        };
      },
      partialize: (state) => ({
        analysis: state.analysis,
        lastSubmission: state.lastSubmission,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
