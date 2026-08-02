import { beforeEach, describe, expect, it } from "vitest";
import {
  clearSplitInviteRedirect,
  FINKOIN_SPLIT_REDIRECT_KEY,
  FINKOIN_SPLIT_TOKEN_KEY,
  peekPostLoginPath,
  resolvePostLoginPath,
  sanitizeAppPath,
  saveSplitInviteRedirect,
  saveSplitInviteToken,
} from "./splitAuthRedirect";

describe("sanitizeAppPath", () => {
  it("accepts in-app paths", () => {
    expect(sanitizeAppPath("/split/join?token=abc")).toBe(
      "/split/join?token=abc",
    );
    expect(sanitizeAppPath("/analyse")).toBe("/analyse");
  });

  it("decodes percent-encoded paths", () => {
    expect(sanitizeAppPath("%2Fsplit%2Fjoin%3Ftoken%3Dabc")).toBe(
      "/split/join?token=abc",
    );
    expect(sanitizeAppPath("foo%2Fbar")).toBeNull();
  });

  it("returns null when decodeURIComponent throws", () => {
    expect(sanitizeAppPath("%2F%E0%A4%A")).toBeNull();
  });

  it("rejects open redirects and invalid values", () => {
    expect(sanitizeAppPath("//evil.com")).toBeNull();
    expect(sanitizeAppPath("https://evil.com")).toBeNull();
    expect(sanitizeAppPath("")).toBeNull();
    expect(sanitizeAppPath(null)).toBeNull();
    expect(sanitizeAppPath(undefined)).toBeNull();
  });
});

describe("split invite post-login path", () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom keeps cookies across tests unless Max-Age is cleared.
    for (const part of document.cookie.split("; ")) {
      const name = part.split("=")[0];
      if (name) {
        document.cookie = `${name}=; Path=/; Max-Age=0`;
      }
    }
  });

  it("prefers next query over stored invite", () => {
    saveSplitInviteToken("stored-token");
    expect(peekPostLoginPath("?next=%2Fsplit%2Fjoin%3Ftoken%3Dfrom-url")).toBe(
      "/split/join?token=from-url",
    );
    // Peek must not wipe backup
    expect(localStorage.getItem(FINKOIN_SPLIT_TOKEN_KEY)).toBe("stored-token");
  });

  it("falls back to stored redirect path without clearing", () => {
    saveSplitInviteRedirect("/split/join?token=invite123");
    expect(peekPostLoginPath("")).toBe("/split/join?token=invite123");
    expect(localStorage.getItem(FINKOIN_SPLIT_REDIRECT_KEY)).toBe(
      "/split/join?token=invite123",
    );
  });

  it("falls back to stored token → join URL without clearing", () => {
    saveSplitInviteToken("tok-xyz");
    expect(peekPostLoginPath("")).toBe(
      `/split/join?token=${encodeURIComponent("tok-xyz")}`,
    );
    expect(localStorage.getItem(FINKOIN_SPLIT_TOKEN_KEY)).toBe("tok-xyz");
  });

  it("uses fallback when nothing is pending", () => {
    expect(peekPostLoginPath("", "/analyse")).toBe("/analyse");
  });

  it("ignores non-app redirect saves", () => {
    saveSplitInviteRedirect("https://evil.com");
    expect(localStorage.getItem(FINKOIN_SPLIT_REDIRECT_KEY)).toBeNull();
  });

  it("clearSplitInviteRedirect removes both keys", () => {
    saveSplitInviteToken("t1");
    saveSplitInviteRedirect("/split/join?token=t1");
    clearSplitInviteRedirect();
    expect(localStorage.getItem(FINKOIN_SPLIT_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(FINKOIN_SPLIT_REDIRECT_KEY)).toBeNull();
  });

  it("reads invite from cookie when localStorage is empty", () => {
    document.cookie = `${FINKOIN_SPLIT_REDIRECT_KEY}=${encodeURIComponent("/split/join?token=from-cookie")}; Path=/`;
    expect(peekPostLoginPath("")).toBe("/split/join?token=from-cookie");
  });

  it("prefers localStorage redirect over cookie", () => {
    document.cookie = `${FINKOIN_SPLIT_REDIRECT_KEY}=${encodeURIComponent("/split/join?token=cookie")}; Path=/`;
    saveSplitInviteRedirect("/split/join?token=local");
    expect(peekPostLoginPath("")).toBe("/split/join?token=local");
  });

  it("clear removes cookie-backed invite too", () => {
    saveSplitInviteRedirect("/split/join?token=wipe");
    clearSplitInviteRedirect();
    expect(peekPostLoginPath("", "/analyse")).toBe("/analyse");
    expect(document.cookie.includes(FINKOIN_SPLIT_REDIRECT_KEY)).toBe(false);
  });

  it("keeps token query chars intact through cookie round-trip", () => {
    const path =
      "/split/join?token=9b48f71dcff8c5912bc6c6a8e7245e0bc2b0f65549a24e65be71791e4d97a5cb";
    localStorage.clear();
    for (const part of document.cookie.split("; ")) {
      const name = part.split("=")[0];
      if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
    }
    saveSplitInviteRedirect(path);
    localStorage.removeItem(FINKOIN_SPLIT_REDIRECT_KEY);
    expect(peekPostLoginPath("")).toBe(path);
  });

  it("resolvePostLoginPath peek-by-default does not clear storage", () => {
    saveSplitInviteToken("keep-me");
    expect(resolvePostLoginPath("")).toBe(
      `/split/join?token=${encodeURIComponent("keep-me")}`,
    );
    expect(localStorage.getItem(FINKOIN_SPLIT_TOKEN_KEY)).toBe("keep-me");
  });

  it("resolvePostLoginPath consume clears only when path came from storage", () => {
    saveSplitInviteToken("consume-me");
    resolvePostLoginPath("", "/analyse", { consume: true });
    expect(localStorage.getItem(FINKOIN_SPLIT_TOKEN_KEY)).toBeNull();
  });

  it("resolvePostLoginPath consume keeps storage when next is in URL", () => {
    saveSplitInviteToken("still-here");
    const path = resolvePostLoginPath(
      "?next=%2Fsplit%2Fjoin%3Ftoken%3Durl",
      "/analyse",
      { consume: true },
    );
    expect(path).toBe("/split/join?token=url");
    expect(localStorage.getItem(FINKOIN_SPLIT_TOKEN_KEY)).toBe("still-here");
  });
});
