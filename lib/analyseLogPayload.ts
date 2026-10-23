import type {
  AnalyseFormValues,
  FinancialProfile,
} from "@/lib/analyse-form-schema";
import { safetyFundSources, type AnalysisResult } from "@/lib/financialEngine";
import { detectGoals } from "@/lib/goalDetection";
import { earmarkExistingSavings } from "@/lib/goalFunding";
import {
  buildGoalStrategies,
  buildYearlyRoadmap,
  retirementCheck,
} from "@/lib/goalStrategies";
import { buildPriorityPlan } from "@/lib/priorityEngine";

/**
 * One row of `analyse_logs` (migration 057): the form answers, the profile,
 * every in-between number the report is built from, and the report itself,
 * so a wrong figure can be traced back to the step that produced it.
 * Bump the version when the shape changes.
 */
export const ANALYSE_LOG_VERSION = 1;

export type AnalyseLogSource = "form_submit" | "profile_edit";

export type AnalyseLogPayload = {
  v: number;
  source: AnalyseLogSource;
  loggedAt: string;
  form: Partial<AnalyseFormValues> | null;
  profile: FinancialProfile;
  steps: Record<string, unknown>;
  result: AnalysisResult;
  /** Numbers that disagree with each other in this report. */
  checks: string[];
};

/** Runs one step; a step that throws is logged as its error, not dropped. */
function step<T>(fn: () => T): T | { error: string } {
  try {
    return fn();
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

const rupeeAmounts = (text: string) =>
  [...text.matchAll(/₹([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, "")));

export function buildAnalyseLogPayload(input: {
  source: AnalyseLogSource;
  profile: FinancialProfile;
  result: AnalysisResult;
  form?: Partial<AnalyseFormValues> | null;
  now?: Date;
}): AnalyseLogPayload {
  const { profile, result } = input;
  const now = input.now ?? new Date();
  const checks: string[] = [];

  const safetyFund = step(() => safetyFundSources(profile));
  const goals = step(() => detectGoals(profile, now));
  const earmarks = step(() =>
    Object.fromEntries(
      earmarkExistingSavings(
        profile,
        now,
        "reserve" in safetyFund ? safetyFund.reserve : {},
      ),
    ),
  );
  const plan = step(() => buildPriorityPlan(profile, result));
  const goalStrategies = step(() => buildGoalStrategies(profile, now));
  const goalItems = "priorities" in plan ? (plan.goalFunding?.items ?? []) : [];
  const roadmap = step(() => buildYearlyRoadmap(profile, goalItems, now));
  const retirement = step(() =>
    Array.isArray(roadmap)
      ? retirementCheck(profile, goalItems, now, roadmap)
      : null,
  );

  if ("priorities" in plan) {
    const b = plan.surplusBreakdown;
    // EPF is deducted at source, so it isn't paid from in-hand pay.
    const sum =
      b.totalIncome -
      b.needsActual -
      b.loansActual -
      b.wantsActual -
      Math.max(0, b.investmentActual - (profile.monthlyEPFContribution || 0)) -
      b.existingInsurancePremiums;
    if (Math.abs(Math.max(0, sum) - b.netSurplus) > 1) {
      checks.push(
        `Surplus breakdown adds up to ${Math.round(sum)} but shows ${Math.round(b.netSurplus)}.`,
      );
    }
    for (const p of plan.priorities) {
      if (/₹0\/month/.test(JSON.stringify(p))) {
        checks.push(`Step "${p.title}" asks for ₹0/month.`);
      }
    }
  }

  if (Array.isArray(goals) && !("error" in earmarks)) {
    const retirement = goals.find((g) => g.type === "retirement");
    const mark = retirement ? earmarks[retirement.id] : undefined;
    const actions = [
      ...(result.moneyScore?.topActions ?? []),
      ...(result.moneyScore?.pillars.map((pl) => pl.action) ?? []),
    ];
    const line = retirement
      ? actions.find((a) => a?.text.startsWith(`${retirement.label}: start a `))
      : undefined;
    if (mark && line && rupeeAmounts(line.text)[0] !== mark.monthlyRequired) {
      checks.push(
        `Score action asks ${rupeeAmounts(line.text)[0]}/month for retirement; the goal card asks ${mark.monthlyRequired}.`,
      );
    }
  }

  return {
    v: ANALYSE_LOG_VERSION,
    source: input.source,
    loggedAt: now.toISOString(),
    form: input.form ?? null,
    profile,
    steps: {
      safetyFund,
      goals,
      earmarks,
      surplus:
        "priorities" in plan
          ? {
              monthlyIncome: plan.monthlyIncome,
              monthlySurplus: plan.monthlySurplus,
              ...plan.surplusBreakdown,
            }
          : plan,
      priorities:
        "priorities" in plan
          ? plan.priorities.map((p) => ({
              rank: p.rank,
              id: p.id,
              title: p.title,
              monthlyRequired: p.monthlyRequired,
              monthlyContribution: p.monthlyContribution,
              surplusBefore: p.surplusBefore,
              surplusAfterThis: p.surplusAfterThis,
              startMonth: p.startMonth,
              actionThisWeek: p.actionThisWeek,
            }))
          : plan,
      allocationPlan: "priorities" in plan ? plan.allocationPlan : null,
      goalStrategies,
      roadmap,
      retirement,
      moneyScore: result.moneyScore ?? null,
    },
    result,
    checks,
  };
}
