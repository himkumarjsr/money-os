import { create } from "zustand";
import { syncKv } from "@/lib/syncKv";
import { fetchPremiumStatus, type PremiumStatus } from "@/lib/premiumTheme";
import type { ThemeName } from "@/constants/theme";

export type ThemePreference = "system" | ThemeName;

const PREF_KEY = "finkoin_theme";
const PREMIUM_KEY = "finkoin_premium_theme";

type ThemeState = {
  preference: ThemePreference;
  premium: PremiumStatus | null;
  /** Route to reopen after the screen tree remounts for a theme change. */
  returnTo: string | null;
  /** Read saved choices; call after `hydrateSyncKv()`. */
  load: (userId: string | null) => void;
  setPreference: (pref: ThemePreference, returnTo?: string) => void;
  refreshPremium: (userId: string | null) => Promise<void>;
  clearReturnTo: () => void;
};

function readPremium(userId: string | null): PremiumStatus | null {
  if (!userId) return null;
  try {
    const raw = syncKv.getItem(PREMIUM_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { userId: string; status: PremiumStatus };
    return saved.userId === userId ? saved.status : null;
  } catch {
    return null;
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: "system",
  premium: null,
  returnTo: null,

  load: (userId) => {
    const raw = syncKv.getItem(PREF_KEY);
    const preference: ThemePreference =
      raw === "light" || raw === "dark" || raw === "premium" ? raw : "system";
    set({ preference, premium: readPremium(userId) });
  },

  setPreference: (preference, returnTo) => {
    syncKv.setItem(PREF_KEY, preference);
    set({ preference, returnTo: returnTo ?? null });
  },

  refreshPremium: async (userId) => {
    if (!userId) {
      set({ premium: null });
      return;
    }
    const status = await fetchPremiumStatus(userId);
    if (!status) return;
    syncKv.setItem(PREMIUM_KEY, JSON.stringify({ userId, status }));
    set({ premium: status });
  },

  clearReturnTo: () => set({ returnTo: null }),
}));

/** Theme actually shown: premium falls back to dark until it is unlocked. */
export function resolveTheme(
  preference: ThemePreference,
  systemScheme: string | null | undefined,
  premiumUnlocked: boolean,
): ThemeName {
  if (preference === "premium") return premiumUnlocked ? "premium" : "dark";
  if (preference === "system")
    return systemScheme === "dark" ? "dark" : "light";
  return preference;
}
