import { describe, expect, it } from "vitest";
import { computeEpfProjection, epfYearEnd } from "./epfCalculator";

describe("epfCalculator", () => {
  it("credits a year of interest on the opening balance and running monthly deposits", () => {
    // 1,00,000 × 8.25% + 12,000/12 × 0.0825/12 × 66
    expect(epfYearEnd(1_00_000, 12_000, 8.25)).toBeCloseTo(
      1_00_000 + 12_000 + 8_250 + 453.75,
      6,
    );
  });

  it("contributes until the chosen age, then compounds untouched to 60", () => {
    const r = computeEpfProjection({
      currentBalance: 5_00_000,
      yearlyContribution: 1_20_000,
      currentAge: 30,
      contributeTillAge: 58,
      annualRatePct: 8.25,
    });
    expect(r.contributionYears).toBe(28);
    expect(r.growthOnlyYears).toBe(2);
    expect(r.totalContributions).toBe(1_20_000 * 28);
    expect(r.schedule).toHaveLength(30);
    expect(r.schedule[r.schedule.length - 1].age).toBe(60);
    expect(r.finalValue).toBeCloseTo(
      r.balanceAtContributionEnd * 1.0825 * 1.0825,
      4,
    );
    expect(r.totalInterest).toBeCloseTo(r.finalValue - r.totalInvested, 6);
  });

  it("only grows the existing balance when contributions have already stopped", () => {
    const r = computeEpfProjection({
      currentBalance: 10_00_000,
      yearlyContribution: 50_000,
      currentAge: 50,
      contributeTillAge: 45,
      annualRatePct: 8,
    });
    expect(r.contributionYears).toBe(0);
    expect(r.totalContributions).toBe(0);
    expect(r.finalValue).toBeCloseTo(10_00_000 * Math.pow(1.08, 10), 4);
  });

  it("returns the current balance at 60 with an empty schedule", () => {
    const r = computeEpfProjection({
      currentBalance: 25_00_000,
      yearlyContribution: 1_00_000,
      currentAge: 60,
      contributeTillAge: 60,
      annualRatePct: 8.25,
    });
    expect(r.finalValue).toBe(25_00_000);
    expect(r.schedule).toEqual([]);
  });

  it("treats a zero rate as plain savings", () => {
    const r = computeEpfProjection({
      currentBalance: 1_00_000,
      yearlyContribution: 10_000,
      currentAge: 55,
      contributeTillAge: 60,
      annualRatePct: 0,
    });
    expect(r.finalValue).toBe(1_50_000);
    expect(r.totalInterest).toBe(0);
  });
});
