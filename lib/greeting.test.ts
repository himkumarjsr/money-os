import { describe, expect, it } from "vitest";
import { timeGreeting } from "./greeting";

const at = (h: number) => new Date(2026, 9, 10, h, 30);

describe("timeGreeting", () => {
  it("follows the time the tip is seen", () => {
    expect(timeGreeting(at(7))).toBe("Good morning");
    expect(timeGreeting(at(13))).toBe("Good afternoon");
    expect(timeGreeting(at(20))).toBe("Good evening");
    expect(timeGreeting(at(2))).toBe("Good evening");
  });
});
