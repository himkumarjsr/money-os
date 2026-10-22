import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { FinancialProfile } from "./analyse-form-schema";
import { ADVISOR_PERSONAS } from "./advisorPersonasFixture";
import { calculateTermNeeded } from "./financialEngine";
import { detectGoals } from "./goalDetection";
import { earmarkExistingSavings } from "./goalFunding";
import {
  corpusMonthlyIncome,
  goalCostInTodaysRupees,
  monthlySipFor,
  retirementCorpusMultiple,
} from "./goalMath";
import { loanEmi, projectGoalReach } from "./goalStrategies";
import { projectRetirementAccounts } from "./holdings";
import { expectedNominalReturn } from "./portfolioAllocation";
import { buildPriorityPlan } from "./priorityEngine";

/** Within 2% of the planner's figure (or ₹100 for tiny SIPs). */
const agrees = (engine: unknown, advisor: number | string) =>
  typeof advisor === "string"
    ? engine === advisor
    : typeof engine === "number" &&
      Math.abs(engine - advisor) <= Math.max(0.02 * Math.abs(advisor), 100);

const asProfile = (p: Partial<FinancialProfile>) => p as FinancialProfile;

function engineFigures(profile: FinancialProfile) {
  const now = new Date();
  const plan = buildPriorityPlan(profile, { overallScore: 50 });
  const goals = detectGoals(profile, now);
  const marks = earmarkExistingSavings(profile, now);
  const retirement = goals.find((g) => g.type === "retirement")!;
  const out: Record<string, number | string | undefined> = {
    emergency_target: plan.priorities.find((p) => p.id === "emergency_fund")
      ?.targetAmount,
    term_needed: calculateTermNeeded(profile),
    retirement_corpus: retirement.targetAmount,
    pf_at_retirement: projectRetirementAccounts(
      profile,
      retirement.yearsToGoal,
      { real: true },
    ).total,
    debt_order: plan.debts.map((d) => d.type).join(" > "),
  };
  for (const g of goals) {
    if (g.type === "debt_free") continue;
    out[`sip_from_scratch:${g.id}`] = marks.get(g.id)?.monthlyFromScratch;
  }
  return { out, plan };
}

describe("advisor persona suite", () => {
  beforeAll(() => {
    vi.useFakeTimers({ now: new Date(2026, 5, 1), toFake: ["Date"] });
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it.each(ADVISOR_PERSONAS.map((p) => [p.name, p] as const))(
    "%s: every figure within 2% of the planner's",
    (_name, persona) => {
      const { out } = engineFigures(asProfile(persona.profile));
      const misses = Object.entries(persona.advisor)
        .filter(([key, advisor]) => !agrees(out[key], advisor))
        .map(
          ([key, advisor]) => `${key}: engine ${out[key]}, advisor ${advisor}`,
        );
      expect(misses).toEqual([]);
    },
  );

  it("agrees with the planner on at least 97% of all figures", () => {
    let total = 0;
    let ok = 0;
    for (const persona of ADVISOR_PERSONAS) {
      const { out } = engineFigures(asProfile(persona.profile));
      for (const [key, advisor] of Object.entries(persona.advisor)) {
        total += 1;
        if (agrees(out[key], advisor)) ok += 1;
      }
    }
    expect(total).toBeGreaterThan(90);
    expect(ok / total).toBeGreaterThanOrEqual(0.97);
  });

  it("never calls the emergency fund complete while money is still missing", () => {
    for (const persona of ADVISOR_PERSONAS) {
      const { plan } = engineFigures(asProfile(persona.profile));
      const ef = plan.priorities.find((p) => p.id === "emergency_fund")!;
      expect(ef.status === "complete", persona.id).toBe(ef.gap === 0);
    }
  });

  it("reaches every goal on time when the plan's full SIP is funded", () => {
    for (const persona of ADVISOR_PERSONAS) {
      const profile = asProfile(persona.profile);
      const { plan } = engineFigures(profile);
      for (const item of plan.goalFunding!.items) {
        if (item.monthlyRequired <= 0) continue;
        const reach = projectGoalReach(profile, {
          ...item,
          monthlyAllocated: item.monthlyRequired,
        });
        expect(reach.onTime, `${persona.id} ${item.goalId}`).toBe(true);
      }
    }
  });

  it("clears the costliest loan first, whatever its type", () => {
    const persona = ADVISOR_PERSONAS.find((p) => p.id === "debt_stressed")!;
    const { plan } = engineFigures(asProfile(persona.profile));
    expect(plan.debts.map((d) => [d.type, d.rate])).toEqual([
      ["Personal loan", 15],
      ["Bike loan", 11],
    ]);
  });

  it("counts a new Sukanya account toward the daughter's education, and skips it when SSY already runs", () => {
    const toddler = ADVISOR_PERSONAS.find(
      (p) => p.id === "young_parents_toddler_girl",
    )!;
    const { plan } = engineFigures(asProfile(toddler.profile));
    const ssy = plan.priorities.find((p) => p.id.startsWith("ssy_girl"))!;
    expect(ssy.monthlyContribution).toBeGreaterThan(0);
    const education = plan.goalFunding!.items.find(
      (i) => i.goalId === "kid_education:0",
    )!;
    expect(education.existingMonthly).toBeGreaterThanOrEqual(
      ssy.monthlyContribution,
    );

    const twins = ADVISOR_PERSONAS.find(
      (p) => p.id === "dual_income_twin_girls",
    )!;
    const twinsPlan = engineFigures(asProfile(twins.profile)).plan;
    expect(twinsPlan.priorities.some((p) => p.id.startsWith("ssy_girl"))).toBe(
      false,
    );
  });
});

describe("textbook figures", () => {
  it("prices a ₹50L home loan at 8.5% for 20 years at the bank EMI", () => {
    expect(Math.round(loanEmi(50_00_000, 8.5, 20))).toBe(43_391);
  });

  it("sizes the retirement corpus to last to 90", () => {
    // 30 years of withdrawals rising 6%, corpus earning 7.5%.
    expect(retirementCorpusMultiple(60)).toBeCloseTo(24.65, 2);
    // Retiring at 45 needs a third more than the old 25× rule.
    expect(retirementCorpusMultiple(45)).toBeCloseTo(33.6, 1);
    expect(corpusMonthlyIncome(retirementCorpusMultiple(60) * 12_000, 60)).toBe(
      1_000,
    );
  });

  it("uses what the recommended mix can earn, by risk profile", () => {
    expect(expectedNominalReturn("7y+", "moderate")).toBeCloseTo(0.1052, 4);
    expect(expectedNominalReturn("7y+", "conservative")).toBeCloseTo(0.098, 4);
    expect(expectedNominalReturn("7y+", "aggressive")).toBeCloseTo(0.1106, 4);
    expect(expectedNominalReturn("3-7y", "moderate")).toBeCloseTo(0.0836, 4);
  });

  it("inflates college fees at 10% a year, not 6%", () => {
    expect(goalCostInTodaysRupees(25_00_000, "kid_education", 16)).toBeCloseTo(
      25_00_000 * Math.pow(1.1 / 1.06, 16),
      0,
    );
  });

  it("sizes a flat SIP like the annuity formula on the cost at the goal date", () => {
    // ₹10L in today's rupees, 10 years, 12% a year: nominal ₹10L × 1.06^10.
    const r = Math.pow(1.12, 1 / 12) - 1;
    const nominalTarget = 10_00_000 * Math.pow(1.06, 10);
    const expected = (nominalTarget * r) / (Math.pow(1 + r, 120) - 1);
    expect(monthlySipFor(10_00_000, 10, 0.12)).toBeCloseTo(expected, 6);
  });
});
