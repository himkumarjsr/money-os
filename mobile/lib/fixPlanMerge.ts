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

/** Per-goal narrative from the goal advisor (engine numbers stay in priorityPlan.goals). */
export type GoalAdvice = {
  why: string;
  instrumentRationale: string;
  watchOut: string;
  /** "ai" = model call grounded in goal notes; "engine" = deterministic fallback. */
  source: "ai" | "engine";
};

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
  /** Keyed by GoalItem.goalId. */
  goalPlans?: Record<string, GoalAdvice>;
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
    goalFunding: engine.goalFunding,
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

export const LOAN_DRIFT_LABELS: Record<
  "not_active_in_tracker" | "not_in_report" | "emi_changed",
  string
> = {
  not_active_in_tracker: "closed or not in Tracker",
  not_in_report: "in Tracker, not in this report",
  emi_changed: "EMI changed in Tracker",
};

export const DEBT_ESTIMATE_NOTE =
  "est. = not entered by you. We estimated the outstanding balance from the EMI and/or used a typical interest rate, so payoff dates and interest saved for these loans are approximate. Add the real numbers in your Loans step.";

export function debtIsEstimated(d: {
  outstandingEstimated?: boolean;
  rateEstimated?: boolean;
}): boolean {
  return !!(d.outstandingEstimated || d.rateEstimated);
}

export function debtRateLabel(d: { rate?: unknown; rateEstimated?: boolean }): string {
  const rate = Number(d.rate || 0);
  if (!d.rateEstimated) return `${rate}%`;
  return rate > 0 ? `${rate}% (est.)` : "Not entered";
}

/** Suffix for any number derived from an estimated balance or rate. */
export function estSuffix(d: {
  outstandingEstimated?: boolean;
  rateEstimated?: boolean;
}): string {
  return debtIsEstimated(d) ? " (est.)" : "";
}

/** " (from month N)" for steps that only start after safety is funded. */
export function stepStartLabel(p: { startMonth?: unknown }): string {
  const start = Number(p.startMonth || 1);
  return start > 1 ? ` (from month ${start})` : "";
}

/**
 * What's left each month once safety is funded and every recurring step runs.
 * Emergency/medical top-ups are temporary, so summing every step would double-count.
 */
export function remainingBuffer(plan: any, steps: any[]): number {
  const after = Number(plan?.surplusBreakdown?.afterAllPriorities);
  if (Number.isFinite(after)) return Math.max(0, Math.round(after));
  const used = steps.reduce(
    (s: number, p: any) => s + Number(p.monthlyContribution || 0),
    0,
  );
  return Math.max(0, Math.round(Number(plan?.monthlySurplus || 0) - used));
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
  const goals: any[] = plan?.goals ?? [];
  const goal = goals[0];
  const goalMonthly = (g: any) =>
    Number(g.monthlyAllocated ?? g.monthlyRequired ?? 0);
  const goalBit =
    goals.length > 1
      ? ` ${goals.length} goals funded in parallel with ₹${goals.reduce((s2, g) => s2 + goalMonthly(g), 0).toLocaleString("en-IN")}/mo.`
      : goal
        ? ` Goal (${goal.label ?? goal.goalType}): target ₹${Number(goal.targetAmount || 0).toLocaleString("en-IN")}, ~₹${goalMonthly(goal).toLocaleString("en-IN")}/mo.`
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
              : " Keep allocating surplus to your goals."
          }${goalBit}`
        : base.overallSummary,
    goalAdvice:
      goal && (!base.goalAdvice || summaryMentionsClosedMedical)
        ? goals
            .map(
              (g) =>
                `${g.label ?? g.goalType}: ₹${goalMonthly(g).toLocaleString("en-IN")}/mo toward ₹${Number(g.targetAmount || 0).toLocaleString("en-IN")} via ${g.instrument} (~${g.yearsToGoal}y).`,
            )
            .join(" ")
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
