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
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects Android / iOS / mobile", () => {
    expect(isAndroidUserAgent("Mozilla/5.0 (Linux; Android 14)")).toBe(true);
    expect(isIosUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe(
      true,
    );
    expect(isMobileUserAgent("Mozilla/5.0 (iPad; CPU OS 17_0)")).toBe(true);
    expect(isMobileUserAgent("Mozilla/5.0 (Macintosh)")).toBe(false);
  });

  it("falls back to navigator.userAgent when ua arg is empty", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel)",
    });
    expect(isAndroidUserAgent("")).toBe(true);
    expect(isAndroidUserAgent()).toBe(true);

    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    expect(isIosUserAgent("")).toBe(true);
    expect(isIosUserAgent()).toBe(true);
  });
});

describe("isStandalonePwa", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads display-mode: standalone media query", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("standalone"),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    expect(isStandalonePwa()).toBe(true);
  });

  it("reads display-mode: minimal-ui when standalone is off", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("minimal-ui"),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    expect(isStandalonePwa()).toBe(true);
  });

  it("falls back to iOS navigator.standalone", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      media: "",
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    vi.stubGlobal("navigator", { standalone: true, userAgent: "iPhone" });
    expect(isStandalonePwa()).toBe(true);
  });

  it("returns false when no standalone signal is present", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      media: "",
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    vi.stubGlobal("navigator", { standalone: false, userAgent: "Chrome" });
    expect(isStandalonePwa()).toBe(false);
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

  it("returns false for non-http(s) protocols", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Linux; Android 14)",
    });
    expect(tryOpenHttpsInAndroidApp("ftp://files.example/a")).toBe(false);
    expect(tryOpenHttpsInAndroidApp("javascript:alert(1)")).toBe(false);
  });

  it("returns false when URL constructor throws", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Linux; Android 14)",
    });
    expect(tryOpenHttpsInAndroidApp("not a url")).toBe(false);
  });

  it("navigates via intent URL on Android https", () => {
    const location = { href: "https://www.finkoin.com/split/join?token=a" };
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
      "https://www.finkoin.com/split/join?token=abc#x",
    );
    expect(ok).toBe(true);
    expect(String(location.href)).toContain(
      "intent://www.finkoin.com/split/join",
    );
    expect(String(location.href)).toContain("token=abc");
    expect(String(location.href)).toContain("scheme=https");
    expect(String(location.href)).toContain("S.browser_fallback_url=");
  });

  it("accepts http scheme on Android", () => {
    const location = { href: "" };
    Object.defineProperty(window, "location", {
      configurable: true,
      value: location,
      writable: true,
    });
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Linux; Android 14)",
    });

    expect(tryOpenHttpsInAndroidApp("http://example.com/path")).toBe(true);
    expect(String(location.href)).toContain("scheme=http");
  });
});

describe("pwa open attempt session flag", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("marks and reads attempt key", () => {
    sessionStorage.clear();
    expect(hasPwaOpenAttempted("token:x")).toBe(false);
    markPwaOpenAttempted("token:x");
    expect(hasPwaOpenAttempted("token:x")).toBe(true);
    expect(hasPwaOpenAttempted("token:y")).toBe(false);
  });

  it("no-ops when sessionStorage is unavailable", () => {
    vi.stubGlobal("sessionStorage", undefined);
    expect(() => markPwaOpenAttempted("token:z")).not.toThrow();
    expect(hasPwaOpenAttempted("token:z")).toBe(false);
  });
});

describe("shouldOfferOpenInApp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("never offers on 127.0.0.1 even on Android", () => {
    expect(
      shouldOfferOpenInApp({
        hostname: "127.0.0.1",
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

  it("offers on production Android browser only (iOS cannot deep-link PWAs)", () => {
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
    ).toBe(false);
  });

  it("uses live window/navigator when opts are omitted", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Linux; Android 14)",
    });
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { hostname: "www.finkoin.com" },
    });
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      media: "",
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    expect(shouldOfferOpenInApp()).toBe(true);
  });

  it("treats missing window/navigator as non-offer when opts omit env", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("navigator", undefined);

    expect(isStandalonePwa()).toBe(false);
    expect(isAndroidUserAgent("")).toBe(false);
    expect(isIosUserAgent("")).toBe(false);
    expect(tryOpenHttpsInAndroidApp("https://www.finkoin.com/x")).toBe(false);
    // No opts → window/navigator fallbacks resolve to false / "".
    expect(shouldOfferOpenInApp()).toBe(false);
    // Android UA with no hostname still offers (empty host ≠ localhost).
    expect(
      shouldOfferOpenInApp({
        standalone: false,
        userAgent: "Mozilla/5.0 (Linux; Android 14)",
      }),
    ).toBe(true);
  });
});
