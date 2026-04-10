import {
  analyseDefaultValues,
  type AnalyseFormValues,
  type FinancialProfile,
} from "@/lib/analyse-form-schema";
import { analyseFinances, type AnalysisResult } from "@/lib/financialEngine";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type FinancialState = {
  analysis: Partial<AnalyseFormValues> | null;
  lastSubmission: FinancialProfile | null;
  result: AnalysisResult | null;
  profile: Partial<AnalyseFormValues> | null;
  hasHydrated: boolean;
  setAnalysis: (patch: Partial<AnalyseFormValues>) => void;
  setFullAnalysis: (data: FinancialProfile) => void;
  updateProfile: (patch: Partial<AnalyseFormValues>) => void;
  runAnalysis: () => void;
  clearSubmission: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set) => ({
      analysis: analyseDefaultValues,
      lastSubmission: null,
      result: null,
      profile: analyseDefaultValues,
      hasHydrated: false,
      setAnalysis: (patch) =>
        set((state) => ({
          analysis: { ...analyseDefaultValues, ...(state.analysis ?? {}), ...patch },
          profile: { ...analyseDefaultValues, ...(state.profile ?? {}), ...patch },
        })),
      setFullAnalysis: (data) =>
        set({
          lastSubmission: data,
          result: analyseFinances(data),
        }),
      updateProfile: (patch) =>
        set((state) => ({
          profile: { ...analyseDefaultValues, ...(state.profile ?? {}), ...patch },
          analysis: { ...analyseDefaultValues, ...(state.analysis ?? {}), ...patch },
        })),
      runAnalysis: () =>
        set((state) => {
          if (!state.lastSubmission) return {};
          return { result: analyseFinances(state.lastSubmission) };
        }),
      clearSubmission: () => set({ lastSubmission: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "finkoin-analysis",
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
          profile: {
            ...analyseDefaultValues,
            ...(typed?.profile ?? typed?.analysis ?? {}),
          },
        };
      },
      partialize: (state) => ({
        analysis: state.analysis,
        lastSubmission: state.lastSubmission,
        result: state.result,
        profile: state.profile,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
