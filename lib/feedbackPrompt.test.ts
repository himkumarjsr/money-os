import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasAskedForProduct,
  markFeedbackAsked,
  productKeyFromPath,
} from "./feedbackPrompt";

describe("productKeyFromPath", () => {
  it("uses the first path segment", () => {
    expect(productKeyFromPath("/split/abc/add-expense")).toBe("split");
    expect(productKeyFromPath("/tracker")).toBe("tracker");
  });

  it("falls back to app for root", () => {
    expect(productKeyFromPath("/")).toBe("app");
    expect(productKeyFromPath("")).toBe("app");
  });
});

describe("hasAskedForProduct / markFeedbackAsked", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("is false until marked", () => {
    expect(hasAskedForProduct("split")).toBe(false);
    markFeedbackAsked("split", "u1");
    expect(hasAskedForProduct("split", "u1")).toBe(true);
    // Legacy key also counts
    expect(hasAskedForProduct("split")).toBe(true);
  });

  it("uses legacy key when no userId", () => {
    markFeedbackAsked("tracker");
    expect(hasAskedForProduct("tracker")).toBe(true);
    expect(window.localStorage.getItem("finkoin_feedback_tracker")).toBe("1");
  });

  it("returns false when localStorage throws on read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(hasAskedForProduct("split", "u1")).toBe(false);
  });

  it("swallows localStorage errors on write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => markFeedbackAsked("split", "u1")).not.toThrow();
  });

  it("no-ops when window is undefined (SSR)", async () => {
    vi.resetModules();
    const original = globalThis.window;
    // @ts-expect-error intentional SSR simulation
    delete globalThis.window;
    const mod = await import("./feedbackPrompt");
    expect(mod.hasAskedForProduct("split")).toBe(false);
    expect(() => mod.markFeedbackAsked("split")).not.toThrow();
    globalThis.window = original;
  });
});
