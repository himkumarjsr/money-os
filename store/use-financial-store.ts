import type { AnalyseFormValues } from "@/lib/analyse-form-schema";
import { create } from "zustand";

type FinancialState = {
  analysis: Partial<AnalyseFormValues> | null;
  /** Set when user completes onboarding — result page reads this */
  lastSubmission: AnalyseFormValues | null;
  setAnalysis: (patch: Partial<AnalyseFormValues>) => void;
  setFullAnalysis: (data: AnalyseFormValues) => void;
  clearSubmission: () => void;
};

export const useFinancialStore = create<FinancialState>((set) => ({
  analysis: null,
  lastSubmission: null,
  setAnalysis: (patch) =>
    set((s) => ({
      analysis: { ...(s.analysis ?? {}), ...patch },
    })),
  setFullAnalysis: (data) =>
    set({
      analysis: data,
      lastSubmission: data,
    }),
  clearSubmission: () => set({ lastSubmission: null }),
}));
