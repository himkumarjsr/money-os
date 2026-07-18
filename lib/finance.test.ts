import { describe, expect, it } from "vitest";
import { compoundInterest, formatCurrency } from "./finance";

describe("compoundInterest", () => {
  it("returns principal when years <= 0", () => {
    expect(compoundInterest(1000, 0.1, 0)).toBe(1000);
    expect(compoundInterest(1000, 0.1, -2)).toBe(1000);
  });

  it("compounds monthly by default", () => {
    const result = compoundInterest(10000, 0.12, 1);
    expect(result).toBeCloseTo(10000 * Math.pow(1 + 0.12 / 12, 12), 6);
  });

  it("respects compoundsPerYear", () => {
    const annual = compoundInterest(1000, 0.1, 2, 1);
    expect(annual).toBeCloseTo(1000 * Math.pow(1.1, 2), 6);

    const daily = compoundInterest(1000, 0.1, 1, 365);
    expect(daily).toBeCloseTo(1000 * Math.pow(1 + 0.1 / 365, 365), 6);
  });

  it("handles zero principal and zero rate", () => {
    expect(compoundInterest(0, 0.1, 5)).toBe(0);
    expect(compoundInterest(5000, 0, 3)).toBe(5000);
  });

  it("handles fractional years", () => {
    const result = compoundInterest(1000, 0.12, 0.5, 12);
    expect(result).toBeCloseTo(1000 * Math.pow(1 + 0.12 / 12, 6), 6);
  });
});

describe("formatCurrency", () => {
  it("formats USD by default with 2 fraction digits", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("formats INR when requested", () => {
    expect(formatCurrency(1000, "en-IN", "INR", 0)).toMatch(/₹|INR/);
    expect(formatCurrency(1000, "en-IN", "INR", 0)).toContain("1,000");
  });

  it("honors maximumFractionDigits = 0", () => {
    expect(formatCurrency(99.9, "en-US", "USD", 0)).toBe("$100");
  });

  it("formats zero and negative", () => {
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(-25)).toBe("-$25.00");
  });
});
