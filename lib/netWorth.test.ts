import { describe, expect, it } from "vitest";
import {
  buildNetWorth,
  getNetWorthStanding,
  netWorthMetricTones,
  netWorthSectionTone,
} from "./netWorth";

describe("buildNetWorth", () => {
  it("returns zeros for empty profile", () => {
    expect(buildNetWorth({})).toEqual({
      assets: 0,
      liabilities: 0,
      netWorth: 0,
    });
  });

  it("sums assets and subtracts liabilities", () => {
    const result = buildNetWorth({
      savingsAccountBalance: 100000,
      fdValue: 50000,
      mfValue: 25000,
      homeLoanOutstanding: 80000,
      carLoanOutstanding: 20000,
    });
    expect(result.assets).toBe(175000);
    expect(result.liabilities).toBe(100000);
    expect(result.netWorth).toBe(75000);
  });

  it("treats undefined asset fields as zero", () => {
    const result = buildNetWorth({
      savingsAccountBalance: 1000,
      goldValue: undefined,
      otherAssets: undefined,
    });
    expect(result.assets).toBe(1000);
  });

  it("includes personal loan only when outstanding > 0", () => {
    expect(buildNetWorth({ personalLoanOutstanding: 0 }).liabilities).toBe(0);
    expect(buildNetWorth({ personalLoanOutstanding: -100 }).liabilities).toBe(
      0,
    );
    expect(buildNetWorth({ personalLoanOutstanding: 15000 }).liabilities).toBe(
      15000,
    );
  });

  it("uses EMI * 36 backlog when outstanding is missing", () => {
    const result = buildNetWorth({
      homeLoanEMI: 10000,
      carLoanEMI: 5000,
      bikeEMI: 2000,
      secondPropertyEMI: 3000,
    });
    // home 10k*36 + car 5k*36 + bike 2k*36 + second 3k*36
    expect(result.liabilities).toBe((10000 + 5000 + 2000 + 3000) * 36);
  });

  it("prefers outstanding over EMI backlog for home/car", () => {
    const result = buildNetWorth({
      homeLoanOutstanding: 500000,
      homeLoanEMI: 20000,
      carLoanOutstanding: 100000,
      carLoanEMI: 8000,
    });
    expect(result.liabilities).toBe(600000);
  });

  it("includes additional obligations as EMI * 36", () => {
    const result = buildNetWorth({
      additionalObligations: [
        { monthlyAmount: 1000 },
        { monthlyAmount: undefined },
      ] as never,
    });
    expect(result.liabilities).toBe(36000);
  });

  it("can produce negative net worth", () => {
    const result = buildNetWorth({
      savingsAccountBalance: 10000,
      homeLoanOutstanding: 50000,
    });
    expect(result.netWorth).toBe(-40000);
  });
});

describe("getNetWorthStanding", () => {
  it("returns null without age or outside bands", () => {
    expect(getNetWorthStanding(undefined, 1_00_000)).toBeNull();
    expect(getNetWorthStanding(0, 1_00_000)).toBeNull();
    expect(getNetWorthStanding(24, 1_00_000)).toBeNull();
    expect(getNetWorthStanding(50, 1_00_000)).toBeNull();
  });

  it("classifies 25–30 band", () => {
    // band: low 2L, high 5L, median 3.5L
    expect(getNetWorthStanding(25, 10_00_000)).toContain("top 10%");
    expect(getNetWorthStanding(27, 5_00_000)).toContain("top 25%");
    expect(getNetWorthStanding(29, 3_50_000)).toContain("top 40%");
    expect(getNetWorthStanding(29, 2_00_000)).toContain("middle 50%");
    expect(getNetWorthStanding(29, 1_99_999)).toContain("bottom 50%");
  });

  it("uses inclusive min and exclusive max", () => {
    expect(getNetWorthStanding(30, 0)).not.toBeNull();
    expect(getNetWorthStanding(35, 0)).not.toBeNull();
    expect(getNetWorthStanding(40, 0)).not.toBeNull();
    expect(getNetWorthStanding(49.9, 0)).not.toBeNull();
  });

  it("classifies older bands with higher benchmarks", () => {
    expect(getNetWorthStanding(42, 1_60_00_000)).toContain("top 10%");
    expect(getNetWorthStanding(32, 1_00_000)).toContain("bottom 50%");
  });
});

describe("netWorthSectionTone / netWorthMetricTones", () => {
  it("returns tone classes for positive and negative values", () => {
    expect(netWorthSectionTone(0)).toContain("border-slate-200");
    expect(netWorthSectionTone(-1)).toContain("border-slate-200");
    expect(netWorthSectionTone(100)).toContain("bg-slate-50");
  });

  it("exposes metric tone tokens", () => {
    expect(netWorthMetricTones.assets).toContain("emerald");
    expect(netWorthMetricTones.liabilities).toContain("amber");
    expect(netWorthMetricTones.netPositive).toContain("emerald");
    expect(netWorthMetricTones.netNegative).toContain("amber");
  });
});
