import {
  analyseDefaultValues,
  financialProfileToFormValues,
  type AnalyseFormValues,
  type FinancialProfile,
} from "@/lib/analyse-form-schema";
import { analyseFinances, type AnalysisResult } from "@/lib/financialEngine";
import type { FinkoinAIPlan } from "@/lib/finkoinAiPlan";
import { useAuthStore } from "@/store/authStore";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

const FINANCIAL_PERSIST_NAME = "finkoin-financial";

/** One localStorage key per auth user so drafts/results never leak across accounts. */
function createUserScopedFinancialStorage(): StateStorage {
  return {
    getItem: (name) => {
      const uid = useAuthStore.getState().user?.id ?? "__guest__";
      const key = `${name}:${uid}`;
      try {
        let value = localStorage.getItem(key);
        if (value == null && uid === "__guest__") {
          const legacy = localStorage.getItem(name);
          if (legacy != null) {
            localStorage.setItem(key, legacy);
            localStorage.removeItem(name);
            value = legacy;
          }
        }
        return value;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      const uid = useAuthStore.getState().user?.id ?? "__guest__";
      try {
        localStorage.setItem(`${name}:${uid}`, value);
      } catch {
        /* ignore quota / private mode */
      }
    },
    removeItem: (name) => {
      const uid = useAuthStore.getState().user?.id ?? "__guest__";
      try {
        localStorage.removeItem(`${name}:${uid}`);
      } catch {
        /* ignore */
      }
    },
  };
}

const MAX_ANALYSE_STEP = 6;

type FinancialState = {
  analysis: Partial<AnalyseFormValues> | null;
  lastSubmission: FinancialProfile | null;
  result: AnalysisResult | null;
  profile: Partial<AnalyseFormValues> | null;
  currentStep: number;
  aiPlan: FinkoinAIPlan | null;
  hasHydrated: boolean;
  setAnalysis: (patch: Partial<AnalyseFormValues>) => void;
  setFullAnalysis: (data: FinancialProfile) => void;
  updateProfile: (patch: Partial<AnalyseFormValues>) => void;
  setResult: (result: AnalysisResult | null) => void;
  setAiPlan: (plan: FinkoinAIPlan | null) => void;
  setCurrentStep: (value: number | ((prev: number) => number)) => void;
  hydrateFromSnapshot: (
    profile: FinancialProfile,
    result: AnalysisResult,
    options?: {
      aiPlan?: FinkoinAIPlan | null;
      analysisPatch?: Partial<AnalyseFormValues>;
    },
  ) => void;
  runAnalysis: () => void;
  clearSubmission: () => void;
  resetAll: () => void;
  /** Alias for `resetAll()` — clears persisted analyse draft + result snapshot keys used by the form. */
  resetStore: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set, get) => ({
      analysis: analyseDefaultValues,
      lastSubmission: null,
      result: null,
      profile: analyseDefaultValues,
      currentStep: 0,
      aiPlan: null,
      hasHydrated: false,
      setAnalysis: (patch) =>
        set((state) => ({
          analysis: {
            ...analyseDefaultValues,
            ...(state.analysis ?? {}),
            ...patch,
          },
          profile: {
            ...analyseDefaultValues,
            ...(state.profile ?? {}),
            ...patch,
          },
        })),
      setFullAnalysis: (data) => {
        try {
          const result = analyseFinances(data);
          const form = {
            ...analyseDefaultValues,
            ...financialProfileToFormValues(data),
          };
          set({
            lastSubmission: data,
            result,
            profile: form,
            analysis: form,
          });
          if (process.env.NODE_ENV === "development") {
            console.log("[financialStore] setFullAnalysis OK", {
              hasResult: !!result,
              issueCount: result?.issues?.length,
            });
          }
        } catch (e) {
          console.error("[financialStore] setFullAnalysis failed:", e);
          const form = {
            ...analyseDefaultValues,
            ...financialProfileToFormValues(data),
          };
          set({
            lastSubmission: data,
            result: null,
            profile: form,
            analysis: form,
          });
        }
      },
      updateProfile: (patch) =>
        set((state) => ({
          profile: {
            ...analyseDefaultValues,
            ...(state.profile ?? {}),
            ...patch,
          },
          analysis: {
            ...analyseDefaultValues,
            ...(state.analysis ?? {}),
            ...patch,
          },
        })),
      setResult: (result) => set({ result }),
      setAiPlan: (plan) => set({ aiPlan: plan }),
      setCurrentStep: (value) =>
        set((state) => {
          const next =
            typeof value === "function" ? value(state.currentStep) : value;
          return { currentStep: Math.max(0, Math.min(MAX_ANALYSE_STEP, next)) };
        }),
      hydrateFromSnapshot: (profile, result, options) => {
        const formFromProfile = financialProfileToFormValues(profile);
        const mergedForm = {
          ...analyseDefaultValues,
          ...formFromProfile,
          ...(options?.analysisPatch ?? {}),
        };
        set({
          lastSubmission: profile,
          result,
          aiPlan: options?.aiPlan ?? null,
          profile: mergedForm,
          analysis: mergedForm,
        });
      },
      runAnalysis: () => {
        const state = get();
        if (!state.lastSubmission) {
          console.warn("[financialStore] runAnalysis: no lastSubmission");
          return;
        }
        try {
          if (process.env.NODE_ENV === "development") {
            console.log("[financialStore] runAnalysis…", {
              lifeStage: state.lastSubmission.lifeStage,
            });
          }
          const result = analyseFinances(state.lastSubmission);
          set({ result });
          if (process.env.NODE_ENV === "development") {
            console.log("[financialStore] runAnalysis result", {
              issues: result.issues?.length,
            });
          }
        } catch (e) {
          console.error("[financialStore] runAnalysis error:", e);
        }
      },
      clearSubmission: () =>
        set({ lastSubmission: null, result: null, aiPlan: null }),
      resetAll: () =>
        set({
          lastSubmission: null,
          result: null,
          aiPlan: null,
          currentStep: 0,
          analysis: analyseDefaultValues,
          profile: analyseDefaultValues,
        }),
      resetStore: () => get().resetAll(),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: FINANCIAL_PERSIST_NAME,
      storage: createJSONStorage(() => createUserScopedFinancialStorage()),
      merge: (persistedState, currentState) => {
        const typed = persistedState as Partial<FinancialState> | undefined;
        return {
          ...currentState,
          ...typed,
          aiPlan: typed?.aiPlan ?? currentState.aiPlan,
          currentStep:
            typeof typed?.currentStep === "number"
              ? Math.max(0, Math.min(MAX_ANALYSE_STEP, typed.currentStep))
              : currentState.currentStep,
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
        profile: state.profile,
        result: state.result,
        currentStep: state.currentStep,
        lastSubmission: state.lastSubmission,
        analysis: state.analysis,
        aiPlan: state.aiPlan,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
