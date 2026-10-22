import { describe, expect, it } from "vitest";
import type { FinancialProfile } from "./analyse-form-schema";
import { emergencyFundMonthsNeeded } from "./financialEngine";
import {
  averageReturn,
  corpusMonthlyIncome,
  estimatedTaxSlab,
  goalCostInTodaysRupees,
  goalRate,
  lumpRealGrowth,
  retirementCorpusMultiple,
  sipRealValue,
  sipRealValueAt,
  sipStepUp,
  taxSlab,
} from "./goalMath";
import { expectedNominalReturn } from "./portfolioAllocation";

const p = (over: Partial<FinancialProfile>) => over;

describe("tax slab", () => {
  it("follows the new regime: nothing to ₹12L, then 15/20/25/30%", () => {
    expect(estimatedTaxSlab(12_00_000)).toBe(0);
    expect(estimatedTaxSlab(15_00_000)).toBe(0.15);
    expect(estimatedTaxSlab(18_00_000)).toBe(0.2);
    expect(estimatedTaxSlab(22_00_000)).toBe(0.25);
    expect(estimatedTaxSlab(40_00_000)).toBe(0.3);
  });

  it("uses the slab the user picked over the estimate", () => {
    expect(taxSlab(p({ monthlySalary: 5_00_000, taxSlabPct: 0 }))).toBe(0);
    expect(taxSlab(p({ monthlySalary: 50_000, taxSlabPct: 30 }))).toBe(0.3);
    expect(taxSlab(p({ monthlySalary: 2_50_000 }))).toBe(0.3);
  });

  it("taxes FD and debt at the slab, and equity gains at 12.5% only from the 20% slab", () => {
    const fd = expectedNominalReturn("1-3y", "moderate", { taxSlab: 0.3 });
    expect(fd).toBeCloseTo(
      expectedNominalReturn("1-3y") - 0.3 * 0.95 * 0.75 * 0.07,
      6,
    );
    expect(goalRate(p({ taxSlabPct: 15 }), 10).long).toBeCloseTo(
      expectedNominalReturn("7y+"),
      6,
    );
    // 30% slab: equity, gold and hybrid lose 12.5% of their return; PPF/NPS none.
    expect(goalRate(p({ taxSlabPct: 30 }), 10).long).toBeCloseTo(
      0.9 * (0.7 * 0.12 * 0.875 + 0.3 * 0.08) + 0.1 * 0.08 * 0.875,
      6,
    );
  });
});

describe("glide path", () => {
  it("moves a long goal to the 1-3 year mix for its last 3 years", () => {
    const rate = goalRate(p({ taxSlabPct: 0 }), 10, "kid_education");
    expect(rate.safe).toBeCloseTo(expectedNominalReturn("1-3y"), 6);
    // Same as 7 years at the long rate, then 3 at the safe rate.
    const r = (x: number) => Math.pow(1 + x, 1 / 12) - 1;
    let fv = 0;
    for (let m = 1; m <= 120; m++) {
      fv = fv * (1 + (120 - m < 36 ? r(rate.safe) : r(rate.long))) + 1;
    }
    expect(sipRealValue(120, rate)).toBeCloseTo(fv / Math.pow(1.06, 10), 6);
    expect(sipRealValue(120, rate)).toBeLessThan(sipRealValue(120, rate.long));
    expect(averageReturn(rate, 10)).toBeLessThan(rate.long);
    expect(lumpRealGrowth(rate, 10)).toBeCloseTo(
      (Math.pow(1 + rate.long, 7) * Math.pow(1 + rate.safe, 3)) /
        Math.pow(1.06, 10),
      6,
    );
  });

  it("leaves goals 3 years away or less, and retirement, on one rate", () => {
    const short = goalRate(p({}), 3, "vehicle_purchase");
    expect(short.safe).toBe(short.long);
    const retirement = goalRate(p({}), 25, "retirement");
    expect(retirement.safe).toBe(retirement.long);
  });

  it("follows the goal date part-way through, not each year's own end", () => {
    const rate = goalRate(p({}), 10, "custom");
    expect(sipRealValueAt(120, 120, rate)).toBeCloseTo(
      sipRealValue(120, rate),
      9,
    );
    // Year 5 of a 10-year goal is still fully in the long-rate phase.
    expect(sipRealValueAt(60, 120, rate)).toBeCloseTo(
      sipRealValue(60, rate.long),
      9,
    );
  });
});

describe("yearly SIP raise", () => {
  it("keeps SIPs flat when the user says no, even with a salary hike", () => {
    expect(
      sipStepUp(p({ annualSalaryIncreasePct: 8, sipStepUpPlanned: false })),
    ).toBe(0);
  });
  it("raises by the hike, else 10%, when the user says yes", () => {
    expect(
      sipStepUp(p({ annualSalaryIncreasePct: 7, sipStepUpPlanned: true })),
    ).toBeCloseTo(0.07, 9);
    expect(sipStepUp(p({ sipStepUpPlanned: true }))).toBe(0.1);
  });
  it("uses the hike when not asked, and a flat SIP without one", () => {
    expect(sipStepUp(p({ annualSalaryIncreasePct: 15 }))).toBe(0.1);
    expect(sipStepUp(p({}))).toBe(0);
  });
});

describe("employment type", () => {
  it("adds 3 months of emergency fund for self-employed and business income, up to 12", () => {
    const bachelor = { lifeStage: "bachelor", selfAge: 28 };
    expect(emergencyFundMonthsNeeded(bachelor)).toBe(6);
    expect(
      emergencyFundMonthsNeeded({
        ...bachelor,
        employmentType: "self_employed",
      }),
    ).toBe(9);
    expect(
      emergencyFundMonthsNeeded({
        lifeStage: "kids",
        kidsAges: [4],
        employmentType: "business",
      }),
    ).toBe(12);
  });
});

describe("assumptions the user changes", () => {
  it("a cautious 10% equity return lowers the long-term mix", () => {
    const standard = goalRate(p({ taxSlabPct: 0 }), 15).long;
    const cautious = goalRate(
      p({ taxSlabPct: 0, planEquityReturnPct: 10 }),
      15,
    ).long;
    expect(standard - cautious).toBeCloseTo(0.9 * 0.7 * 0.02, 6);
  });

  it("costs rising 1 point faster raise every goal and the retirement corpus", () => {
    const faster = p({ planInflationShiftPct: 1 });
    expect(goalCostInTodaysRupees(10_00_000, "custom", 10, faster)).toBeCloseTo(
      10_00_000 * Math.pow(1.07 / 1.06, 10),
      2,
    );
    expect(retirementCorpusMultiple(60, faster)).toBeGreaterThan(
      retirementCorpusMultiple(60),
    );
    // Income from the corpus is still quoted at today's prices.
    const corpus = goalCostInTodaysRupees(
      retirementCorpusMultiple(60, faster) * 12_000,
      "retirement",
      20,
      faster,
    );
    expect(corpusMonthlyIncome(corpus, 60, faster, 20)).toBeCloseTo(1_000, 6);
  });
});
