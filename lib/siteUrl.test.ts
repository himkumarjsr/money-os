import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicSiteUrl } from "./siteUrl";

describe("getPublicSiteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to localhost when env is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getPublicSiteUrl()).toBe("http://localhost:3000");
  });

  it("prefers NEXT_PUBLIC_SITE_URL over APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://site.example/");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example");
    expect(getPublicSiteUrl()).toBe("https://site.example");
  });

  it("falls back to NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example/");
    expect(getPublicSiteUrl()).toBe("https://app.example");
  });

  it("trims whitespace and strips trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "  https://finkoin.com/  ");
    expect(getPublicSiteUrl()).toBe("https://finkoin.com");
  });

  it("keeps origin without trailing slash unchanged", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://finkoin.com");
    expect(getPublicSiteUrl()).toBe("https://finkoin.com");
  });
});
