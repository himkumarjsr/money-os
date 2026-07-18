import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy class strings", () => {
    expect(cn("a", "b")).toBe("a b");
    expect(cn("px-2", "py-1", "text-sm")).toBe("px-2 py-1 text-sm");
  });

  it("ignores falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
    expect(cn(false, null, undefined)).toBe("");
    expect(cn()).toBe("");
  });

  it("supports conditional object syntax", () => {
    expect(cn({ active: true, disabled: false })).toBe("active");
    expect(cn("base", { on: true, off: false })).toBe("base on");
  });

  it("flattens arrays", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
    expect(cn(["a", false, "b"])).toBe("a b");
  });

  it("handles empty string and nested mixes", () => {
    expect(cn("", "x")).toBe("x");
    expect(cn(["a", ["b", { c: true }]], null)).toBe("a b c");
  });
});
