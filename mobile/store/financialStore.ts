/**
 * RN-adapted financial store — mirrors web store/financialStore.ts
 * with AsyncStorage instead of localStorage. No AI plan module dependency.
 */
import {
  analyseDefaultValues,
  financialProfileToFormValues,
  type AnalyseFormValues,
  type FinancialProfile,
} from "@/lib/analyse-form-schema";
import { analyseFinances, type AnalysisResult } from "@/lib/financialEngine";
import { useAuthStore } from "@/store/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

const FINANCIAL_PERSIST_NAME = "finkoin-financial-mobile";
const MAX_ANALYSE_STEP = 6;

function createUserScopedFinancialStorage(): StateStorage {
  return {
    getItem: async (name) => {
      const uid = useAuthStore.getState().user?.id ?? "__guest__";
      const key = `${name}:${uid}`;
      try {
        let value = await AsyncStorage.getItem(key);
        if (value == null && uid === "__guest__") {
          const legacy = await AsyncStorage.getItem(name);
          if (legacy != null) {
            await AsyncStorage.setItem(key, legacy);
            await AsyncStorage.removeItem(name);
            value = legacy;
          }
        }
        return value;
      } catch {
        return null;
      }
    },
    setItem: async (name, value) => {
      const uid = useAuthStore.getState().user?.id ?? "__guest__";
      try {
        await AsyncStorage.setItem(`${name}:${uid}`, value);
      } catch {
        /* ignore */
      }
    },
    removeItem: async (name) => {
      const uid = useAuthStore.getState().user?.id ?? "__guest__";
      try {
        await AsyncStorage.removeItem(`${name}:${uid}`);
      } catch {
        /* ignore */
      }
    },
  };
}

type FinancialState = {
  analysis: Partial<AnalyseFormValues> | null;
  lastSubmission: FinancialProfile | null;
  result: AnalysisResult | null;
  profile: Partial<AnalyseFormValues> | null;
  currentStep: number;
  hasHydrated: boolean;
  setAnalysis: (patch: Partial<AnalyseFormValues>) => void;
  setFullAnalysis: (data: FinancialProfile) => void;
  updateProfile: (patch: Partial<AnalyseFormValues>) => void;
  setResult: (result: AnalysisResult | null) => void;
  setCurrentStep: (value: number | ((prev: number) => number)) => void;
  hydrateFromSnapshot: (
    profile: FinancialProfile,
    result: AnalysisResult,
    options?: { analysisPatch?: Partial<AnalyseFormValues> },
  ) => void;
  runAnalysis: () => void;
  clearSubmission: () => void;
  resetAll: () => void;
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
          profile: mergedForm,
          analysis: mergedForm,
        });
      },
      runAnalysis: () => {
        const state = get();
        if (!state.lastSubmission) return;
        try {
          set({ result: analyseFinances(state.lastSubmission) });
        } catch (e) {
          console.error("[financialStore] runAnalysis error:", e);
        }
      },
      clearSubmission: () => set({ lastSubmission: null, result: null }),
      resetAll: () =>
        set({
          lastSubmission: null,
          result: null,
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
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
