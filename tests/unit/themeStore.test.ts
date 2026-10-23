import { beforeEach, describe, expect, it, vi } from "vitest";

const status = { unlocked: true, streakDays: 5, rank: 1, hasReport: false };
vi.mock("@/lib/theme", async (orig) => ({
  ...(await orig<typeof import("@/lib/theme")>()),
  fetchPremiumStatus: vi.fn(async () => status),
}));

import { useThemeStore } from "@/store/themeStore";

describe("themeStore premium unlock", () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.setState({ preference: "light", premium: null });
    status.unlocked = true;
  });

  it("marks the account Premium without switching the theme", async () => {
    await useThemeStore.getState().refreshPremium("u1");
    expect(useThemeStore.getState().premium?.unlocked).toBe(true);
    expect(useThemeStore.getState().preference).toBe("light");
    expect(localStorage.getItem("finkoin_theme")).toBeNull();
  });

  it("keeps an opt-in Gold choice across refreshes", async () => {
    await useThemeStore.getState().refreshPremium("u1");
    useThemeStore.getState().setPreference("premium");
    await useThemeStore.getState().refreshPremium("u1");
    expect(useThemeStore.getState().preference).toBe("premium");
  });

  it("leaves the theme alone while locked", async () => {
    status.unlocked = false;
    await useThemeStore.getState().refreshPremium("u1");
    expect(useThemeStore.getState().preference).toBe("light");
  });

  it("uses the cached status while sign-in is still loading", async () => {
    await useThemeStore.getState().refreshPremium("u1");
    localStorage.setItem("finkoin_theme", "premium");
    useThemeStore.setState({ premium: null, loaded: false });
    useThemeStore.getState().load(null);
    expect(useThemeStore.getState().loaded).toBe(true);
    expect(useThemeStore.getState().premium?.unlocked).toBe(true);
    useThemeStore.getState().load("someone-else");
    expect(useThemeStore.getState().premium).toBeNull();
  });

  it("clears the cached status once signed out", async () => {
    await useThemeStore.getState().refreshPremium("u1");
    await useThemeStore.getState().refreshPremium(null);
    useThemeStore.getState().load(null);
    expect(useThemeStore.getState().premium).toBeNull();
  });
});
