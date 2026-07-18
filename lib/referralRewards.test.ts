import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FINKOIN_REFERRAL_SUCCESS_KEY,
  REFERRAL_PENDING_STORAGE_KEY,
  STORAGE_KEY,
  clearPendingReferralStorage,
  consumePendingReferralCode,
  loginHrefPreserveRef,
  peekPendingReferralCode,
} from "./referralRewards";

describe("referral storage key constants", () => {
  it("exports stable storage keys", () => {
    expect(REFERRAL_PENDING_STORAGE_KEY).toBe("finkoin_pending_ref");
    expect(STORAGE_KEY).toBe(REFERRAL_PENDING_STORAGE_KEY);
    expect(FINKOIN_REFERRAL_SUCCESS_KEY).toBe("finkoin_referral_success");
  });
});

describe("loginHrefPreserveRef", () => {
  const originalLocation = window.location;

  afterEach(() => {
    vi.unstubAllGlobals();
    // restore if deleted
    if (!window.location || window.location !== originalLocation) {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  function stubSearch(search: string) {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        search,
        origin: "http://localhost:3000",
        href: `http://localhost:3000/${search}`,
      },
    });
  }

  it("returns href unchanged when no ref in URL", () => {
    stubSearch("");
    expect(loginHrefPreserveRef("/login")).toBe("/login");
    stubSearch("?foo=1");
    expect(loginHrefPreserveRef("/login?next=/app")).toBe("/login?next=/app");
  });

  it("appends ref when missing on target", () => {
    stubSearch("?ref=ABC123");
    expect(loginHrefPreserveRef("/login")).toBe("/login?ref=ABC123");
    expect(loginHrefPreserveRef("/login?next=/home")).toBe(
      "/login?next=%2Fhome&ref=ABC123",
    );
  });

  it("does not overwrite existing ref on href", () => {
    stubSearch("?ref=FROM_PAGE");
    expect(loginHrefPreserveRef("/login?ref=KEEP")).toBe("/login?ref=KEEP");
  });

  it("trims whitespace ref and ignores empty", () => {
    stubSearch("?ref=%20%20");
    expect(loginHrefPreserveRef("/login")).toBe("/login");
    stubSearch("?ref=  CODE  ");
    // URLSearchParams get returns decoded trimmed? actually trim is on get result
    expect(loginHrefPreserveRef("/login")).toBe("/login?ref=CODE");
  });
});

describe("pending referral code helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("peek returns null when empty", () => {
    expect(peekPendingReferralCode()).toBeNull();
  });

  it("peek reads plain string codes", () => {
    localStorage.setItem(REFERRAL_PENDING_STORAGE_KEY, "  plainCODE  ");
    expect(peekPendingReferralCode()).toBe("plainCODE");
    expect(localStorage.getItem(REFERRAL_PENDING_STORAGE_KEY)).toBeTruthy();
  });

  it("peek reads JSON code and removes expired", () => {
    localStorage.setItem(
      REFERRAL_PENDING_STORAGE_KEY,
      JSON.stringify({
        code: " LIVE ",
        expires: new Date(Date.now() + 60_000).toISOString(),
      }),
    );
    expect(peekPendingReferralCode()).toBe("LIVE");

    localStorage.setItem(
      REFERRAL_PENDING_STORAGE_KEY,
      JSON.stringify({
        code: "OLD",
        expires: new Date(Date.now() - 1000).toISOString(),
      }),
    );
    expect(peekPendingReferralCode()).toBeNull();
    expect(localStorage.getItem(REFERRAL_PENDING_STORAGE_KEY)).toBeNull();
  });

  it("peek returns null for JSON without usable code", () => {
    localStorage.setItem(
      REFERRAL_PENDING_STORAGE_KEY,
      JSON.stringify({ expires: new Date(Date.now() + 60_000).toISOString() }),
    );
    expect(peekPendingReferralCode()).toBeNull();
  });

  it("consume returns code and clears storage", () => {
    localStorage.setItem(REFERRAL_PENDING_STORAGE_KEY, "X1");
    expect(consumePendingReferralCode()).toBe("X1");
    expect(localStorage.getItem(REFERRAL_PENDING_STORAGE_KEY)).toBeNull();
    expect(consumePendingReferralCode()).toBeNull();
  });

  it("clearPendingReferralStorage removes key", () => {
    localStorage.setItem(REFERRAL_PENDING_STORAGE_KEY, "Z");
    clearPendingReferralStorage();
    expect(localStorage.getItem(REFERRAL_PENDING_STORAGE_KEY)).toBeNull();
  });
});
