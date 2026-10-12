import { create } from "zustand";

/** Shared UI state for the app shell: dock compaction and the global FK toast. */
type ChromeState = {
  /** Web: bottom dock shrinks once scrollY >= 20. */
  dockCompact: boolean;
  setDockCompact: (compact: boolean) => void;
  /** Global toast (web gamification `toastMessage` + `ui/Toast`). */
  toastMessage: string | null;
  showToast: (message: string) => void;
  clearToast: () => void;
};

export const useChromeStore = create<ChromeState>((set) => ({
  dockCompact: false,
  setDockCompact: (dockCompact) =>
    set((s) => (s.dockCompact === dockCompact ? s : { dockCompact })),
  toastMessage: null,
  showToast: (toastMessage) => set({ toastMessage }),
  clearToast: () => set({ toastMessage: null }),
}));

/** Call from a scroll handler: `reportScrollY(e.nativeEvent.contentOffset.y)`. */
export function reportScrollY(y: number): void {
  useChromeStore.getState().setDockCompact(y >= 20);
}
