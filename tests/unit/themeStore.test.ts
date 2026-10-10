import { beforeEach, describe, expect, it, vi } from "vitest";

const status = { unlocked: true, streakDays: 5, rank: 1, hasReport: false };
vi.mock("@/lib/theme", async (orig) => ({
  ...(await orig<typeof import("@/lib/theme")>()),
  fetchPremiumStatus: vi.fn(async () => status),
}));

import { useThemeStore } from "@/store/themeStore";

describe("themeStore premium auto-switch", () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.setState({ preference: "light", premium: null });
    status.unlocked = true;
  });

  it("switches to Premium the first time it unlocks", async () => {
    await useThemeStore.getState().refreshPremium("u1");
    expect(useThemeStore.getState().preference).toBe("premium");
    expect(localStorage.getItem("finkoin_theme")).toBe("premium");
  });

  it("keeps a later manual choice", async () => {
    await useThemeStore.getState().refreshPremium("u1");
    useThemeStore.getState().setPreference("light");
    await useThemeStore.getState().refreshPremium("u1");
    expect(useThemeStore.getState().preference).toBe("light");
  });

  it("leaves the theme alone while locked", async () => {
    status.unlocked = false;
    await useThemeStore.getState().refreshPremium("u1");
    expect(useThemeStore.getState().preference).toBe("light");
  });
});
