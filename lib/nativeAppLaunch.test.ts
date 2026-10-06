import { afterEach, describe, expect, it, vi } from "vitest";
import {
  androidAppIntentUrl,
  nativeAppStoreUrl,
  nativeAppUrl,
  shouldTryNativeApp,
} from "./nativeAppLaunch";

const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const DESKTOP =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/126 Safari/537.36";

describe("nativeAppLaunch", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("builds the app scheme URL from a site path", () => {
    expect(nativeAppUrl("/split/join?token=abc")).toBe(
      "finkoin://split/join?token=abc",
    );
  });

  it("builds an Android intent pinned to the app package with a fallback", () => {
    const url = androidAppIntentUrl(
      "/split/join?code=AB12CD34",
      "https://www.finkoin.com/split/join?code=AB12CD34&app=0",
    );
    expect(url).toContain("intent://split/join?code=AB12CD34#Intent;");
    expect(url).toContain("scheme=finkoin");
    expect(url).toContain("package=com.finkoin.app");
    expect(url).toContain(
      `S.browser_fallback_url=${encodeURIComponent(
        "https://www.finkoin.com/split/join?code=AB12CD34&app=0",
      )}`,
    );
  });

  it("picks the store URL for the platform", () => {
    vi.stubEnv("NEXT_PUBLIC_PLAY_STORE_URL", "https://play.example/app");
    vi.stubEnv("NEXT_PUBLIC_APP_STORE_URL", "");
    expect(nativeAppStoreUrl(ANDROID)).toBe("https://play.example/app");
    expect(nativeAppStoreUrl(IPHONE)).toBeNull();
    expect(nativeAppStoreUrl(DESKTOP)).toBeNull();
  });

  it("tries the app on Android always, iOS only with a store URL, never on desktop or PWA", () => {
    const base = { hostname: "www.finkoin.com", standalone: false };
    vi.stubEnv("NEXT_PUBLIC_APP_STORE_URL", "");
    expect(shouldTryNativeApp({ ...base, userAgent: ANDROID })).toBe(true);
    expect(shouldTryNativeApp({ ...base, userAgent: IPHONE })).toBe(false);
    expect(shouldTryNativeApp({ ...base, userAgent: DESKTOP })).toBe(false);
    expect(
      shouldTryNativeApp({ ...base, userAgent: ANDROID, standalone: true }),
    ).toBe(false);
    expect(
      shouldTryNativeApp({ ...base, userAgent: ANDROID, hostname: "localhost" }),
    ).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_APP_STORE_URL", "https://apps.apple.com/app/id1");
    expect(shouldTryNativeApp({ ...base, userAgent: IPHONE })).toBe(true);
  });
});
