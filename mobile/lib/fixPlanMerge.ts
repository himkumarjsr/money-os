/**
 * Fix Plan merge helpers shared by web (app/analyse/fixplan) and mobile.
 * Engine numbers always win; the AI overlay may only supply copy for open items.
 */
import { scoreBand } from "@/lib/financialEngine";
import type { PriorityPlan } from "@/lib/priorityEngine";

export const LOADING_MESSAGES = [
  "Reading your profile...",
  "Calculating insurance gaps...",
  "Building debt strategy...",
  "Generating 12-month roadmap...",
  "Almost ready...",
];

export type FixPlanExplanations = {
  greeting?: string;
  overallSummary?: string;
  debtStrategy?: string;
  goalAdvice?: string;
  thisWeekAction?: string;
  in12Months?: string;
  encouragement?: string;
  disclaimer?: string;
  priorityExplanations?: Record<string, string>;
};

/** Shape the Fix Plan screen renders and caches (`{ priorityPlan, explanations }` after merge). */
export type FixPlanData = {
  priorityPlan: PriorityPlan;
  explanations: FixPlanExplanations;
  isFallback?: boolean;
};

export const monthsFromGap = (gap: number, monthly: number) =>
  monthly > 0 ? Math.max(1, Math.ceil(gap / monthly)) : 0;

export const monthsForPriority = (id: string, gap: number, monthly: number) => {
  if (id === "term_insurance" || id === "health_insurance") return 1;
  return monthsFromGap(gap, monthly);
};

export const COMPLETE_ACTION =
  "Maintain this completed bucket and continue monitoring monthly.";
export const COMPLETE_WHY =
  "This bucket is already on track. Keep it funded and shift new surplus to the next gap.";

/** A priority with nothing left to fund — its gap-based copy no longer applies. */
export function isPriorityComplete(p: {
  gap?: unknown;
  monthlyContribution?: unknown;
  status?: unknown;
}): boolean {
  const monthly = Math.max(0, Number(p.monthlyContribution || 0));
  const gap = Math.max(0, Number(p.gap || 0));
  return gap <= 0 || monthly <= 0 || p.status === "complete";
}

/** Engine numbers always win — AI/cache must not resurrect closed medical/emergency gaps. */
export function mergeEnginePriorityPlan(
  engine: any,
  overlay: any,
  monthsFor: (
    id: string,
    gap: number,
    monthly: number,
  ) => number = monthsForPriority,
) {
  return {
    ...engine,
    ...overlay,
    priorities: (engine.priorities || []).map((p: any) => {
      const match =
        (overlay?.priorities || []).find((o: any) => o?.id === p.id) || {};
      const monthly = Math.max(0, Number(p.monthlyContribution || 0));
      const gap = Math.max(0, Number(p.gap || 0));
      const isComplete = isPriorityComplete(p);
      return {
        ...p,
        rank: p.rank,
        gap,
        monthlyContribution: monthly,
        monthlyRequired: Number(p.monthlyRequired || monthly),
        monthsToComplete: monthsFor(String(p.id || ""), gap, monthly),
        surplusBefore: Number(p.surplusBefore || 0),
        surplusAfterThis: Number(p.surplusAfterThis || 0),
        title: isComplete ? p.title : match.title || p.title,
        instrument: isComplete
          ? p.instrument
          : match.instrument || p.instrument,
        actionThisWeek: isComplete
          ? COMPLETE_ACTION
          : match.actionThisWeek || p.actionThisWeek,
        whyThisMatters: isComplete
          ? COMPLETE_WHY
          : match.whyThisMatters || p.whyThisMatters,
      };
    }),
    // Deterministic allocation — never take AI/cache monthlyPlan
    debts: engine.debts,
    goals: engine.goals,
    monthlyIncome: engine.monthlyIncome,
    monthlySurplus: engine.monthlySurplus,
    surplusBreakdown: engine.surplusBreakdown,
    monthlyPlan: engine.monthlyPlan,
    scoreToday: engine.scoreToday,
    scoreAfter12Months: engine.scoreAfter12Months,
    topAction: engine.topAction,
  };
}

export function incompletePriorities(plan: any) {
  return (plan?.priorities || []).filter(
    (p: any) =>
      p.status !== "complete" &&
      (Number(p.gap || 0) > 0 || Number(p.monthlyContribution || 0) > 0),
  );
}

/** Every priority that still needs money or a monthly contribution — rendered as a card on both platforms. */
export function openPriorities(plan: any) {
  return (plan?.priorities || []).filter(
    (p: any) =>
      Number(p.gap || 0) > 0 || Number(p.monthlyContribution || 0) > 0,
  );
}

/** Drop stale AI copy that still mentions closed gaps (e.g. medical when funded). */
export function reconcileExplanations(
  explanations: any,
  plan: any,
  analysis: any,
) {
  const open = incompletePriorities(plan);
  const surplus = Math.round(plan?.monthlySurplus || 0);
  const score = analysis?.overallScore ?? plan?.scoreToday ?? 0;
  const issueLine = open
    .slice(0, 2)
    .map(
      (p: any) =>
        `${p.title}${Number(p.gap || 0) > 0 ? ` gap of ₹${Number(p.gap || 0).toLocaleString("en-IN")}` : ""}`,
    )
    .join(" and ");
  const goal = plan?.goals?.[0];
  const goalBit = goal
    ? ` Primary goal (${goal.goalType}): target ₹${Number(goal.targetAmount || 0).toLocaleString("en-IN")}, ~₹${Number(goal.monthlyRequired || 0).toLocaleString("en-IN")}/mo.`
    : "";

  const base =
    explanations && typeof explanations === "object" ? explanations : {};
  const summaryMentionsClosedMedical =
    typeof base.overallSummary === "string" &&
    /medical/i.test(base.overallSummary) &&
    !(open || []).some((p: any) => p.id === "medical_fund");

  return {
    ...base,
    greeting:
      open.length > 0
        ? `Based on your financial profile, we identified ${open.length} area${open.length === 1 ? "" : "s"} that need attention.`
        : "Based on your financial profile, core safety buckets look funded.",
    overallSummary:
      summaryMentionsClosedMedical || !base.overallSummary
        ? `You have a monthly surplus of ₹${surplus.toLocaleString("en-IN")} and a health score of ${score}/100.${
            issueLine
              ? ` Focus next on ${issueLine}.`
              : " Keep allocating surplus to your primary goal."
          }${goalBit}`
        : base.overallSummary,
    goalAdvice:
      goal && (!base.goalAdvice || summaryMentionsClosedMedical)
        ? `${goal.goalType}: aim for ₹${Number(goal.targetAmount || 0).toLocaleString("en-IN")} via ${goal.instrument} (~₹${Number(goal.monthlyRequired || 0).toLocaleString("en-IN")}/mo over ~${goal.yearsToGoal}y).`
        : base.goalAdvice,
  };
}

/** "+N pts" only means something when there is a gain; 0 reads as broken. */
export function scoreProjectionGain(plan: any): number {
  const today = Number(plan?.scoreToday || 0);
  const after = Number(plan?.scoreAfter12Months || 0);
  return Math.max(0, Math.round(after - today));
}

/** Copy shown instead of "+0 pts"; only calls the score strong when it is in the good band. */
export function noGainProjectionMessage(scoreToday: number): string {
  return scoreBand(scoreToday) === "good"
    ? "Your score is already strong — keep it up."
    : "This plan holds your score steady. Freeing up monthly surplus is what will move it up.";
}
