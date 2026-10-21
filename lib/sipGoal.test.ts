import { describe, expect, it } from "vitest";
import {
  CRORE,
  monthlySipForGoal,
  monthlyStepUpSipForGoal,
  sipMaturityAmount,
} from "./sipGoal";

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

describe("monthlyStepUpSipForGoal", () => {
  it("matches the flat SIP with no step-up", () => {
    expect(monthlyStepUpSipForGoal(10_00_000, 12, 10, 0)).toBeCloseTo(
      monthlySipForGoal(10_00_000, 12, 10),
      6,
    );
  });

  it("needs a lower starting SIP when it grows every year", () => {
    const flat = monthlySipForGoal(10_00_000, 12, 10);
    const stepped = monthlyStepUpSipForGoal(10_00_000, 12, 10, 10);
    expect(stepped).toBeLessThan(flat);
    // The stepped plan still reaches the goal.
    let fv = 0;
    const r = 0.12 / 12;
    for (let m = 0; m < 120; m++) {
      fv +=
        stepped * Math.pow(1.1, Math.floor(m / 12)) * Math.pow(1 + r, 119 - m);
    }
    expect(fv).toBeCloseTo(10_00_000, 0);
  });
});
