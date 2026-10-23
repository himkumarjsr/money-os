import { describe, expect, it } from "vitest";
import type { FinancialProfile } from "./analyse-form-schema";
import { ADVISOR_PERSONAS as CORE_PERSONAS } from "./advisorPersonasFixture";
import { MORE_ADVISOR_PERSONAS } from "./advisorPersonasMore";
import { buildAnalyseLogPayload } from "./analyseLogPayload";
import { analyseFinances, safetyFundSources } from "./financialEngine";
import { detectGoals } from "./goalDetection";
import { earmarkExistingSavings } from "./goalFunding";
import { buildGoalStrategies } from "./goalStrategies";
import { buildPriorityPlan } from "./priorityEngine";

/**
 * The report shows the same retirement SIP in "Raise your score", the goal
 * card and the "Work two more years" trade-off, and never asks for ₹0/month.
 * The first profile is the overspending example from the Oct 2026 report
 * review (₹2.5L in-hand, ₹80k SIPs, ₹30k EPF, ₹5Cr retirement by 36).
 */
const NOW = new Date("2026-10-23T00:00:00Z");

const REVIEW_EXAMPLE = {
  lifeStage: "bachelor",
  selfAge: 28,
  cityTier: "metro",
  monthlySalary: 250000,
  monthlyEPFContribution: 30000,
  rentAmount: 10500,
  foodTotal: 10000,
  transportTotal: 20000,
  parentsSupport: 70000,
  lifestyleTotal: 10000,
  travelMonthly: 8333,
  hasTermInsurance: true,
  termInsuranceSumAssured: 10000000,
  termInsurancePremiumMonthly: 3500,
  carInsurancePremiumMonthly: 10000,
  bikeInsurancePremiumMonthly: 167,
  parentsHealthInsurancePremiumMonthly: 2917,
  hasHealthInsurance: false,
  personalLoanEMI: 32500,
  personalLoanOutstanding: 300000,
  personalLoanRate: 12,
  personalLoanRemainingMonths: 10,
  monthlySIP: 80000,
  licEndowmentPremiumMonthly: 1667,
  epfBalance: 1500000,
  savingsAccountBalance: 0,
  planningMarriage: true,
  retirementAge: 36,
  retirementTargetCorpus: 50000000,
  riskTolerance: "moderate",
  primaryGoal: "grow_wealth",
} as unknown as FinancialProfile;

const PROFILES: Array<[string, FinancialProfile]> = [
  ["Oct 2026 review example", REVIEW_EXAMPLE],
  ...[...CORE_PERSONAS, ...MORE_ADVISOR_PERSONAS].map(
    (p) =>
      [p.name, p.profile as FinancialProfile] as [string, FinancialProfile],
  ),
];

const rupeeAmounts = (text: string) =>
  [...text.matchAll(/₹([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, "")));

describe.each(PROFILES)("%s", (_name, profile) => {
  const goals = detectGoals(profile, NOW);
  const retirement = goals.find((g) => g.type === "retirement");
  const marks = earmarkExistingSavings(
    profile,
    NOW,
    safetyFundSources(profile).reserve,
  );
  const mark = retirement ? marks.get(retirement.id) : undefined;

  it("'Raise your score' asks for the goal card's retirement SIP", () => {
    if (!retirement || !mark) return;
    const score = analyseFinances(profile).moneyScore;
    const actions = [
      ...(score?.topActions ?? []),
      ...(score?.pillars.map((pl) => pl.action) ?? []),
    ].filter((a): a is NonNullable<typeof a> => !!a);
    const line = actions?.find((a) =>
      a.text.startsWith(`${retirement.label}: start a `),
    );
    if (!line) return;
    expect(rupeeAmounts(line.text)[0]).toBe(mark.monthlyRequired);
  });

  it("'Work two more years' starts from the same total SIP", () => {
    if (!retirement || !mark) return;
    const later = buildGoalStrategies(profile, NOW)
      .find((s) => s.goalId === retirement.id)
      ?.strategies.find((s) => s.id === "retire_later");
    if (!later) return;
    const from = rupeeAmounts(later.detail)[0];
    expect(
      Math.abs(from - (mark.monthlyRequired + mark.existingMonthly)),
    ).toBeLessThanOrEqual(1);
  });

  it("never tells anyone to start ₹0/month", () => {
    const plan = buildPriorityPlan(profile, { overallScore: 50 });
    for (const p of plan.priorities) {
      expect(JSON.stringify(p)).not.toMatch(/₹0\/month/);
    }
  });

  it("logs every step with no disagreeing numbers", () => {
    const log = buildAnalyseLogPayload({
      source: "form_submit",
      profile,
      result: analyseFinances(profile),
      now: NOW,
    });
    for (const key of [
      "safetyFund",
      "goals",
      "earmarks",
      "surplus",
      "priorities",
      "goalStrategies",
    ]) {
      expect(log.steps[key], key).toBeDefined();
      expect(log.steps[key], key).not.toHaveProperty("error");
    }
    expect(log.checks).toEqual([]);
    expect(() => JSON.stringify(log)).not.toThrow();
  });
});
