import { describe, expect, it } from "vitest";
import {
  isPremiumEligible,
  parseThemePreference,
  resolveTheme,
  themeBootScript,
} from "./theme";

describe("theme", () => {
  it("falls back to light for unknown saved values", () => {
    expect(parseThemePreference(null)).toBe("light");
    expect(parseThemePreference("blue")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
  });

  it("resolves system and locked premium", () => {
    expect(resolveTheme("system", true, false)).toBe("dark");
    expect(resolveTheme("system", false, false)).toBe("light");
    expect(resolveTheme("premium", false, false)).toBe("dark");
    expect(resolveTheme("premium", false, true)).toBe("premium");
    expect(resolveTheme("light", true, true)).toBe("light");
  });

  it("unlocks premium by rank or report + 90-day streak", () => {
    expect(
      isPremiumEligible({ rank: 10, streakDays: 0, hasReport: false }),
    ).toBe(true);
    expect(
      isPremiumEligible({ rank: 11, streakDays: 89, hasReport: true }),
    ).toBe(false);
    expect(
      isPremiumEligible({ rank: null, streakDays: 90, hasReport: true }),
    ).toBe(true);
    expect(
      isPremiumEligible({ rank: null, streakDays: 120, hasReport: false }),
    ).toBe(false);
  });

  it("boot script applies the saved theme before paint", () => {
    const attrs: Record<string, string> = {};
    const store: Record<string, string> = {
      finkoin_theme: "premium",
      finkoin_premium_theme: JSON.stringify({
        userId: "u",
        status: { unlocked: true },
      }),
    };
    const fakeWindow = { matchMedia: () => ({ matches: false }) };
    const fakeDocument = {
      documentElement: {
        setAttribute: (k: string, v: string) => (attrs[k] = v),
        style: {} as Record<string, string>,
      },
    };
    new Function("document", "localStorage", "window", themeBootScript)(
      fakeDocument,
      { getItem: (k: string) => store[k] ?? null },
      fakeWindow,
    );
    expect(attrs["data-theme"]).toBe("premium");
  });
});
