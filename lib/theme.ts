/**
 * Web/PWA appearance: same theme names and Premium unlock rule as the mobile
 * app (`mobile/store/themeStore.ts`, `mobile/lib/premiumTheme.ts`).
 *
 * The active theme is written to `<html data-theme>`; `app/theme.css` maps
 * the light UI's colours to each palette. An inline script in the root layout
 * applies the saved choice before first paint (see `themeBootScript`).
 */
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { fetchUserAnalyseSnapshot } from "@/lib/userAnalyseSnapshot";

export type ThemeName = "light" | "dark" | "premium";
export type ThemePreference = "system" | ThemeName;

export const THEME_PREF_KEY = "finkoin_theme";
export const THEME_PREMIUM_KEY = "finkoin_premium_theme";

export const PREMIUM_STREAK_DAYS = 90;
export const PREMIUM_TOP_RANK = 10;

/** Browser chrome / status bar colour per theme. */
export const THEME_COLOR: Record<ThemeName, string> = {
  light: "#534AB7",
  dark: "#0E0E12",
  premium: "#0A0A0C",
};

export type PremiumStatus = {
  unlocked: boolean;
  streakDays: number;
  rank: number | null;
  hasReport: boolean;
};

export function isPremiumEligible(s: Omit<PremiumStatus, "unlocked">): boolean {
  if (s.rank != null && s.rank >= 1 && s.rank <= PREMIUM_TOP_RANK) return true;
  return s.hasReport && s.streakDays >= PREMIUM_STREAK_DAYS;
}

export function parseThemePreference(raw: unknown): ThemePreference {
  return raw === "system" ||
    raw === "light" ||
    raw === "dark" ||
    raw === "premium"
    ? raw
    : "light";
}

/** Theme actually shown: premium falls back to dark until it is unlocked. */
export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
  premiumUnlocked: boolean,
): ThemeName {
  if (preference === "premium") return premiumUnlocked ? "premium" : "dark";
  if (preference === "system") return systemDark ? "dark" : "light";
  return preference;
}

export function applyTheme(theme: ThemeName): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "light") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme === "light" ? "light" : "dark";
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute("content", THEME_COLOR[theme]));
}

export async function fetchPremiumStatus(
  userId: string,
): Promise<PremiumStatus | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const [{ data: row }, snapshot] = await Promise.all([
      getSupabase()
        .from("leaderboard_view")
        .select("rank, streak_days")
        .eq("user_id", userId)
        .maybeSingle(),
      fetchUserAnalyseSnapshot(userId).catch(() => null),
    ]);
    const base = {
      streakDays: Number(row?.streak_days ?? 0) || 0,
      rank: row?.rank != null ? Number(row.rank) : null,
      hasReport: Boolean(snapshot?.result),
    };
    return { ...base, unlocked: isPremiumEligible(base) };
  } catch {
    return null;
  }
}

/**
 * Runs inline in <head> before paint so a saved dark/premium choice never
 * flashes light. Must stay dependency-free and in sync with `resolveTheme`.
 */
export const themeBootScript = `(function(){try{var d=document.documentElement,p=localStorage.getItem(${JSON.stringify(
  THEME_PREF_KEY,
)}),u=false;try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  THEME_PREMIUM_KEY,
)})||"null");u=!!(s&&s.status&&s.status.unlocked)}catch(e){}var t=p==="dark"?"dark":p==="premium"?(u?"premium":"dark"):p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";if(t!=="light"){d.setAttribute("data-theme",t);d.style.colorScheme="dark"}}catch(e){}})();`;
