import { create } from "zustand";

type AppState = {
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
};

export const useAppStore = create<AppState>((set) => ({
  onboardingStep: 0,
  setOnboardingStep: (step) => set({ onboardingStep: step }),
}));
