import { describe, expect, it } from "vitest";
import { canBypassProPaywall } from "./subscriptionBypass";

describe("canBypassProPaywall", () => {
  it("allows admins regardless of email", () => {
    expect(canBypassProPaywall(null, true)).toBe(true);
    expect(canBypassProPaywall(undefined, true)).toBe(true);
    expect(canBypassProPaywall("anyone@example.com", true)).toBe(true);
  });

  it("rejects empty / whitespace emails for non-admins", () => {
    expect(canBypassProPaywall(null)).toBe(false);
    expect(canBypassProPaywall(undefined)).toBe(false);
    expect(canBypassProPaywall("")).toBe(false);
    expect(canBypassProPaywall("   ")).toBe(false);
    expect(canBypassProPaywall(null, false)).toBe(false);
    expect(canBypassProPaywall(null, null)).toBe(false);
  });

  it("allows known bypass email case-insensitively with trim", () => {
    expect(canBypassProPaywall("finkoin.os@gmail.com")).toBe(true);
    expect(canBypassProPaywall("FINKOIN.OS@GMAIL.COM")).toBe(true);
    expect(canBypassProPaywall("  finkoin.os@gmail.com  ")).toBe(true);
  });

  it("rejects other emails", () => {
    expect(canBypassProPaywall("user@example.com")).toBe(false);
    expect(canBypassProPaywall("finkoin.os@gmail.com.evil")).toBe(false);
    expect(canBypassProPaywall("not-finkoin.os@gmail.com")).toBe(false);
  });

  it("does not treat falsy isAdmin as bypass", () => {
    expect(canBypassProPaywall("user@example.com", false)).toBe(false);
    expect(canBypassProPaywall("user@example.com", undefined)).toBe(false);
  });
});
