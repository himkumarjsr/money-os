import { describe, expect, it } from "vitest";
import {
  analyseDefaultValues,
  normalizeAnalyseFormValues,
  type AnalyseFormValues,
  type FinancialProfile,
} from "@/lib/analyse-form-schema";
import { analyseFinances } from "@/lib/financialEngine";
import { projectNetWorth } from "@/lib/netWorthTrajectory";
import { buildPriorityPlan, type GoalItem } from "@/lib/priorityEngine";

function profile(over: Partial<AnalyseFormValues>): FinancialProfile {
  return normalizeAnalyseFormValues({
    ...analyseDefaultValues,
    monthlySalary: 150_000,
    selfAge: 30,
    ownsHome: true,
    ownsCar: true,
    ...over,
  } as AnalyseFormValues);
}

function goal(over: Partial<GoalItem>): GoalItem {
  return {
    goalType: "retirement",
    goalId: "retirement",
    label: "Retirement",
    targetAmount: 0,
    currentSaved: 0,
    monthlyRequired: 10_000,
    monthlyAllocated: 10_000,
    yearsToGoal: 30,
    instrument: "",
    readyToStart: true,
    blockedBy: null,
    icon: "",
    ...over,
  } as GoalItem;
}

describe("projectNetWorth", () => {
  const rich = profile({
    savingsAccountBalance: 300_000,
    fdValue: 500_000,
    mfValue: 1_200_000,
    goldValue: 200_000,
    homeMarketValue: 8_000_000,
    epfBalance: 900_000,
    monthlyEPFContribution: 7_200,
    ppfBalance: 300_000,
    monthlySIP: 15_000,
    unifiedLoans: [
      {
        loanType: "home_loan",
        monthlyEMI: 45_000,
        outstandingAmount: 4_000_000,
        interestRate: 8.5,
      },
    ],
  });

  it("starts exactly at the report's net worth", () => {
    const analysis = analyseFinances(rich);
    const t = projectNetWorth(rich, null);
    expect(t.points[0].year).toBe(0);
    expect(t.points[0].netWorth).toBe(Math.round(analysis.netWorth));
  });

  it("projects 0/5/10/20 years with ages, and grows for a saver", () => {
    const t = projectNetWorth(rich, null);
    expect(t.points.map((p) => p.year)).toEqual([0, 5, 10, 20]);
    expect(t.points.map((p) => p.age)).toEqual([30, 35, 40, 50]);
    for (let i = 1; i < t.points.length; i++) {
      expect(t.points[i].netWorth).toBeGreaterThan(t.points[i - 1].netWorth);
    }
  });

  it("amortises loans on their EMI until they're gone", () => {
    const t = projectNetWorth(rich, null);
    expect(t.points[1].liabilities).toBeLessThan(t.points[0].liabilities);
    expect(t.points[3].liabilities).toBe(0);
  });

  it("compounds retirement accounts using the engine rates", () => {
    const t = projectNetWorth(rich, null);
    expect(t.points[2].breakdown.retirement).toBeGreaterThan(
      t.points[0].breakdown.retirement * 1.5,
    );
  });

  it("builds goal corpora until the goal year, then spends them (home stays as property)", () => {
    const base = profile({});
    const plan = {
      priorities: [],
      goals: [
        goal({ goalType: "vehicle_purchase", goalId: "vehicle_purchase", label: "Car", yearsToGoal: 3 }),
        goal({ goalType: "home_purchase", goalId: "home_purchase", label: "Home", yearsToGoal: 7 }),
      ],
    };
    const t = projectNetWorth(base, plan, [0, 3, 5, 10]);
    const [, y3, y5, y10] = t.points;
    expect(y3.breakdown.goals).toBeGreaterThan(0);
    expect(y5.breakdown.property).toBe(0);
    expect(y10.breakdown.property).toBeGreaterThan(0);
    expect(t.spentGoals.map((g) => g.label)).toEqual(["Car"]);
    expect(t.spentGoals[0].amount).toBeGreaterThan(10_000 * 36 * 0.9);
  });

  it("following the plan adds to future net worth", () => {
    const plan = buildPriorityPlan(rich, analyseFinances(rich));
    const withPlan = projectNetWorth(rich, plan);
    const without = projectNetWorth(rich, null);
    expect(withPlan.points[0].netWorth).toBe(without.points[0].netWorth);
    expect(withPlan.points[2].netWorth).toBeGreaterThan(without.points[2].netWorth);
  });

  it("keeps a loan whose EMI doesn't cover interest flat (in nominal terms)", () => {
    const p = profile({
      unifiedLoans: [{ loanType: "personal_loan", monthlyEMI: 500, outstandingAmount: 1_000_000, interestRate: 14 }],
    });
    const t = projectNetWorth(p, null, [0, 5]);
    expect(t.points[1].liabilities).toBe(Math.round(t.points[0].liabilities / Math.pow(1.06, 5)));
  });
});

describe("formatLakhCrore", () => {
  it("formats in Indian units, sign-aware", async () => {
    const { formatLakhCrore } = await import("@/lib/netWorthTrajectory");
    expect(formatLakhCrore(12_34_567)).toBe("₹12.3 L");
    expect(formatLakhCrore(1_20_00_000)).toBe("₹1.2 Cr");
    expect(formatLakhCrore(2_00_00_000)).toBe("₹2 Cr");
    expect(formatLakhCrore(-5_00_000)).toBe("-₹5 L");
    expect(formatLakhCrore(45_200)).toBe("₹45K");
    expect(formatLakhCrore(0)).toBe("₹0");
  });
});

describe("report stays brand-neutral", () => {
  it("plan engines name instrument categories, not product brands", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    for (const f of ["priorityEngine.ts", "financialOptimizer.ts", "portfolioAllocation.ts"]) {
      const src = readFileSync(join(__dirname, f), "utf8");
      expect(src, f).not.toMatch(/HDFC|ICICI|Niva Bupa|Max Life|Star Senior|Click ?2 ?Protect|ERGO/);
    }
  });
});
