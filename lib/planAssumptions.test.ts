import { describe, expect, it } from "vitest";
import type { FinancialProfile } from "./analyse-form-schema";
import {
  assumptionChoices,
  planAssumptionRows,
  withAssumption,
} from "./planAssumptions";

const base = {
  lifeStage: "bachelor",
  selfAge: 30,
  monthlySalary: 2_50_000,
  annualSalaryIncreasePct: 8,
} as FinancialProfile;

const value = (p: Partial<FinancialProfile>, label: string) =>
  planAssumptionRows(p).find((r) => r.label.startsWith(label))?.value;

describe("planAssumptionRows", () => {
  it("says what the plan used, in plain words", () => {
    expect(value(base, "Shares")).toMatch(/^12% a year before tax/);
    expect(value(base, "Tax")).toMatch(
      /30% slab \(worked out from your income\)/,
    );
    expect(value(base, "Your SIPs")).toBe("Raised 8% every April");
    expect(value(base, "Prices")).toMatch(/^Rise 6% a year; college fees 10%/);
    expect(value(base, "Retirement")).toMatch(/age 90/);
    expect(value(base, "Emergency fund")).toMatch(/^6 months/);
  });

  it("follows the user's answers and changes", () => {
    const p = {
      ...base,
      taxSlabPct: 0,
      sipStepUpPlanned: false,
      planEquityReturnPct: 10,
      planInflationShiftPct: 1,
      employmentType: "self_employed" as const,
    };
    expect(value(p, "Shares")).toMatch(
      /^10% a year before tax \(your choice\)/,
    );
    expect(value(p, "Tax")).toBe("No income tax");
    expect(value(p, "Your SIPs")).toBe("Stay the same every year");
    expect(value(p, "Prices")).toMatch(/^Rise 7% a year; college fees 11%/);
    expect(value(p, "Emergency fund")).toMatch(/^9 months/);
  });
});

describe("withAssumption", () => {
  it("stores a change, and clears the field when the standard is picked again", () => {
    const cautious = withAssumption(base, { equityReturnPct: 11 });
    expect(cautious.planEquityReturnPct).toBe(11);
    expect(assumptionChoices(cautious).equityReturnPct).toBe(11);
    expect(
      withAssumption(cautious, { equityReturnPct: 12 }).planEquityReturnPct,
    ).toBeUndefined();
    expect(
      withAssumption(base, { inflationShiftPct: 0 }).planInflationShiftPct,
    ).toBeUndefined();
    expect(withAssumption(base, { raisesSips: false }).sipStepUpPlanned).toBe(
      false,
    );
    expect(assumptionChoices(base).raisesSips).toBe(true);
  });
});
