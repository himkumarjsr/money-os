import {
  allocateGoalPortfolio,
  allocationSummary,
  FLEXICAP_MIN_EQUITY_MONTHLY,
  goalHorizon,
  MIN_SLICE_MONTHLY,
  type InstrumentKey,
} from "@/lib/portfolioAllocation";
import { describe, expect, it } from "vitest";

const keys = (a: ReturnType<typeof allocateGoalPortfolio>) => a.slices.map((s) => s.key);
const pctOf = (a: ReturnType<typeof allocateGoalPortfolio>, k: InstrumentKey) =>
  a.slices.find((s) => s.key === k)?.pct ?? 0;

describe("goalHorizon", () => {
  it("buckets by years to goal", () => {
    expect(goalHorizon(0)).toBe("0-1y");
    expect(goalHorizon(1)).toBe("0-1y");
    expect(goalHorizon(2)).toBe("1-3y");
    expect(goalHorizon(3)).toBe("1-3y");
    expect(goalHorizon(5)).toBe("3-7y");
    expect(goalHorizon(7)).toBe("3-7y");
    expect(goalHorizon(8)).toBe("7y+");
  });
});

describe("allocateGoalPortfolio", () => {
  it("maps each horizon to its instrument row, with gold throughout", () => {
    const big = 100_000;
    expect(keys(allocateGoalPortfolio({ yearsToGoal: 1, monthly: big }))).toEqual([
      "savings_sweep",
      "liquid_fund",
      "gold",
    ]);
    expect(keys(allocateGoalPortfolio({ yearsToGoal: 2, monthly: big }))).toEqual([
      "fd_cd",
      "short_debt",
      "arbitrage",
      "gold",
    ]);
    expect(keys(allocateGoalPortfolio({ yearsToGoal: 5, monthly: big }))).toEqual([
      "hybrid",
      "bonds",
      "gold",
    ]);
    expect(keys(allocateGoalPortfolio({ yearsToGoal: 20, monthly: big }))).toEqual([
      "equity_index",
      "ppf_nps",
      "flexicap",
      "gold",
    ]);
  });

  it("keeps gold between 5% and 10% at every horizon", () => {
    for (const years of [1, 2, 5, 20]) {
      const gold = pctOf(allocateGoalPortfolio({ yearsToGoal: years, monthly: 50_000 }), "gold");
      expect(gold).toBeGreaterThanOrEqual(5);
      expect(gold).toBeLessThanOrEqual(10);
    }
  });

  it("never puts arbitrage funds in the 0-1 year bucket", () => {
    for (const r of ["conservative", "moderate", "aggressive"] as const) {
      expect(
        keys(allocateGoalPortfolio({ yearsToGoal: 1, monthly: 100_000, riskTolerance: r })),
      ).not.toContain("arbitrage");
    }
  });

  it("percentages sum to 100 and rupees sum to the monthly amount exactly", () => {
    for (const years of [1, 2, 5, 12, 30]) {
      for (const monthly of [0, 777, 12_345, 99_999]) {
        const a = allocateGoalPortfolio({ yearsToGoal: years, monthly });
        expect(a.slices.reduce((s, x) => s + x.pct, 0)).toBe(100);
        expect(a.slices.reduce((s, x) => s + x.monthly, 0)).toBe(monthly);
      }
    }
  });

  it("tilts toward growth as risk tolerance rises", () => {
    const eq = (r: "conservative" | "moderate" | "aggressive") => {
      const a = allocateGoalPortfolio({ yearsToGoal: 20, monthly: 4_000, riskTolerance: r });
      return pctOf(a, "equity_index") + pctOf(a, "flexicap");
    };
    expect(eq("conservative")).toBeLessThan(eq("moderate"));
    expect(eq("moderate")).toBeLessThan(eq("aggressive"));
  });

  it("assumes moderate when the risk quiz was skipped, and says so", () => {
    const a = allocateGoalPortfolio({ yearsToGoal: 20, monthly: 10_000 });
    expect(a.riskTolerance).toBe("moderate");
    expect(a.riskAssumed).toBe(true);
    expect(
      allocateGoalPortfolio({ yearsToGoal: 20, monthly: 10_000, riskTolerance: "moderate" })
        .riskAssumed,
    ).toBe(false);
  });

  it("uses index funds first and adds flexi-cap only once equity is large enough", () => {
    expect(keys(allocateGoalPortfolio({ yearsToGoal: 20, monthly: 4_000 }))).not.toContain(
      "flexicap",
    );
    const big = allocateGoalPortfolio({
      yearsToGoal: 20,
      monthly: Math.ceil(FLEXICAP_MIN_EQUITY_MONTHLY / 0.6) + 1_000,
    });
    expect(keys(big)).toContain("flexicap");
    expect(pctOf(big, "equity_index")).toBeGreaterThan(pctOf(big, "flexicap"));
  });

  it("folds slices too small to invest into the main instrument", () => {
    const a = allocateGoalPortfolio({ yearsToGoal: 2, monthly: 2_000 });
    expect(a.slices.every((s) => s.key === "fd_cd" || s.monthly >= MIN_SLICE_MONTHLY)).toBe(true);
    expect(a.slices[0].key).toBe("fd_cd");
    expect(a.slices.reduce((s, x) => s + x.monthly, 0)).toBe(2_000);
  });

  it("only mentions real estate for eligible long-horizon goals, never as a slice", () => {
    expect(
      allocateGoalPortfolio({ yearsToGoal: 20, monthly: 50_000, realEstateEligible: true })
        .realEstateNote,
    ).toMatch(/real estate/);
    expect(
      allocateGoalPortfolio({ yearsToGoal: 5, monthly: 50_000, realEstateEligible: true })
        .realEstateNote,
    ).toBeNull();
    expect(allocateGoalPortfolio({ yearsToGoal: 20, monthly: 50_000 }).realEstateNote).toBeNull();
  });

  it("names categories, never brands", () => {
    const text = [1, 2, 5, 20]
      .map((y) => allocationSummary(allocateGoalPortfolio({ yearsToGoal: y, monthly: 200_000 })))
      .join(" ");
    expect(text).not.toMatch(/HDFC|ICICI|SBI|Axis|Parag|Nippon|Mirae|UTI|Kotak/);
  });
});
