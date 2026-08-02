import { describe, expect, it } from "vitest";
import { CRORE, monthlySipForGoal, sipMaturityAmount } from "./sipGoal";

describe("sipGoal", () => {
  it("sipMaturityAmount compounds monthly SIPs", () => {
    const fv = sipMaturityAmount(10_000, 12, 15);
    expect(fv).toBeGreaterThan(10_000 * 15 * 12);
    expect(fv).toBeGreaterThan(30_00_000);
  });

  it("monthlySipForGoal inverts maturity for ₹1 crore", () => {
    const years = 15;
    const rate = 12;
    const sip = monthlySipForGoal(CRORE, rate, years);
    const fv = sipMaturityAmount(sip, rate, years);
    expect(Math.abs(fv - CRORE) / CRORE).toBeLessThan(0.001);
  });

  it("longer horizon needs smaller monthly SIP", () => {
    const a = monthlySipForGoal(CRORE, 12, 10);
    const b = monthlySipForGoal(CRORE, 12, 20);
    expect(a).toBeGreaterThan(b);
  });

  it("handles zero / invalid monthly and goal inputs", () => {
    expect(sipMaturityAmount(0, 12, 10)).toBe(0);
    expect(sipMaturityAmount(-100, 12, 10)).toBe(0);
    expect(sipMaturityAmount(1000, 0, 10)).toBe(1000 * 120);
    expect(monthlySipForGoal(0, 12, 10)).toBe(0);
    expect(monthlySipForGoal(-1, 12, 10)).toBe(0);
    expect(monthlySipForGoal(1_20_000, 0, 10)).toBe(1_000);
  });
});
