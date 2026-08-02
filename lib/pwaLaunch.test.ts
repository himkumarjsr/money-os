import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasPwaOpenAttempted,
  isAndroidUserAgent,
  isIosUserAgent,
  isMobileUserAgent,
  isStandalonePwa,
  markPwaOpenAttempted,
  shouldOfferOpenInApp,
  tryOpenHttpsInAndroidApp,
} from "./pwaLaunch";

describe("pwaLaunch UA helpers", () => {
  it("detects Android / iOS / mobile", () => {
    expect(isAndroidUserAgent("Mozilla/5.0 (Linux; Android 14)")).toBe(true);
    expect(isIosUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe(
      true,
    );
    expect(isMobileUserAgent("Mozilla/5.0 (iPad; CPU OS 17_0)")).toBe(true);
    expect(isMobileUserAgent("Mozilla/5.0 (Macintosh)")).toBe(false);
  });
});

describe("isStandalonePwa", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads display-mode media query", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("standalone"),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    expect(isStandalonePwa()).toBe(true);
  });
});

describe("tryOpenHttpsInAndroidApp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false off Android", () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (iPhone)" });
    expect(
      tryOpenHttpsInAndroidApp("https://www.finkoin.com/split/join?token=a"),
    ).toBe(false);
  });

  it("navigates via intent URL on Android", () => {
    const location = { href: "https://www.finkoin.com/split/join?token=a" };
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Linux; Android 14)",
    });
    vi.stubGlobal("window", {
      ...window,
      location,
      matchMedia: window.matchMedia,
    });
    // Re-bind location on the stubbed window for assignment
    Object.defineProperty(window, "location", {
      configurable: true,
      value: location,
      writable: true,
    });
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Linux; Android 14)",
    });

    const ok = tryOpenHttpsInAndroidApp(
      "https://www.finkoin.com/split/join?token=abc",
    );
    expect(ok).toBe(true);
    expect(String(location.href)).toContain(
      "intent://www.finkoin.com/split/join",
    );
    expect(String(location.href)).toContain("token=abc");
    expect(String(location.href)).toContain("S.browser_fallback_url=");
  });
});

describe("pwa open attempt session flag", () => {
  it("marks and reads attempt key", () => {
    sessionStorage.clear();
    expect(hasPwaOpenAttempted("token:x")).toBe(false);
    markPwaOpenAttempted("token:x");
    expect(hasPwaOpenAttempted("token:x")).toBe(true);
    expect(hasPwaOpenAttempted("token:y")).toBe(false);
  });
});

describe("shouldOfferOpenInApp", () => {
  it("never offers on desktop", () => {
    expect(
      shouldOfferOpenInApp({
        hostname: "www.finkoin.com",
        userAgent: "Mozilla/5.0 (Macintosh)",
        standalone: false,
      }),
    ).toBe(false);
  });

  it("never offers on localhost even on Android", () => {
    expect(
      shouldOfferOpenInApp({
        hostname: "localhost",
        userAgent: "Mozilla/5.0 (Linux; Android 14)",
        standalone: false,
      }),
    ).toBe(false);
  });

  it("never offers inside the installed PWA", () => {
    expect(
      shouldOfferOpenInApp({
        hostname: "www.finkoin.com",
        userAgent: "Mozilla/5.0 (Linux; Android 14)",
        standalone: true,
      }),
    ).toBe(false);
  });

  it("offers on production mobile browser", () => {
    expect(
      shouldOfferOpenInApp({
        hostname: "www.finkoin.com",
        userAgent: "Mozilla/5.0 (Linux; Android 14)",
        standalone: false,
      }),
    ).toBe(true);
    expect(
      shouldOfferOpenInApp({
        hostname: "www.finkoin.com",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
        standalone: false,
      }),
    ).toBe(true);
  });
});
