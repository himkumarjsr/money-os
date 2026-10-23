import { create } from "zustand";
import { syncKv } from "@/lib/syncKv";
import { fetchPremiumStatus, type PremiumStatus } from "@/lib/premiumTheme";
import { syncPremiumAppIcon } from "@/lib/appIcon";
import type { ThemeName } from "@/constants/theme";

export type ThemePreference = "system" | ThemeName;

const PREF_KEY = "finkoin_theme";
const PREMIUM_KEY = "finkoin_premium_theme";

type ThemeState = {
  preference: ThemePreference;
  /**
   * Premium (Finkoin) membership. Unlocking adds small gold accents (coin,
   * avatar ring, badge); the full gold theme stays an opt-in preference.
   */
  premium: PremiumStatus | null;
  /** Route to reopen after the screen tree remounts for a theme change. */
  returnTo: string | null;
  /** Read saved choices; call after `hydrateSyncKv()`. */
  load: (userId: string | null) => void;
  setPreference: (pref: ThemePreference, returnTo?: string) => void;
  refreshPremium: (userId: string | null) => Promise<void>;
  clearReturnTo: () => void;
};

/**
 * Cached Premium status. Before sign-in is known (`userId` null) the last
 * saved status is used so a Gold theme doesn't open as Dark while auth loads;
 * `refreshPremium(null)` clears it once the user is known to be signed out.
 */
function readPremium(userId: string | null): PremiumStatus | null {
  try {
    const raw = syncKv.getItem(PREMIUM_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { userId: string; status: PremiumStatus };
    return !userId || saved.userId === userId ? saved.status : null;
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
      syncKv.removeItem(PREMIUM_KEY);
      set({ premium: null });
      return;
    }
    const status = await fetchPremiumStatus(userId);
    if (!status) return;
    syncKv.setItem(PREMIUM_KEY, JSON.stringify({ userId, status }));
    set({ premium: status });
    void syncPremiumAppIcon(status.unlocked);
    // Unlocking never switches the theme; the gold theme is chosen in
    // Settings → Appearance.
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
