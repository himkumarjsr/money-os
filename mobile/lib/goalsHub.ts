/**
 * Goals page model: every goal from detectGoals, the monthly SIP it needs
 * (goalFunding via the priority plan), and the SIPs the user linked to it in
 * user_planned_investments (source_id = goal id). Pure; no I/O.
 * Amounts are today's rupees.
 */
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { detectGoals, type DetectedGoal } from "@/lib/goalDetection";
import type { PlannedInvestment } from "@/lib/plannedInvestments";
import type { GoalItem } from "@/lib/priorityEngine";

export type GoalHubStatus =
  | "on_track"
  | "behind"
  | "planned"
  | "not_started"
  | "via_emi";

export type GoalHubItem = {
  goal: DetectedGoal;
  /** Monthly SIP that fully funds the goal on time. */
  monthlyRequired: number;
  /** What Finkoin's plan sets aside for it from your surplus. */
  suggestedMonthly: number;
  /** Already saved towards it (retirement counts EPF/PPF/NPS and equity). */
  currentSaved: number;
  /** The plan's goal entry, used to plan its suggested SIPs. */
  planGoal: GoalItem | null;
  sips: PlannedInvestment[];
  /** SIPs marked started or done. */
  linkedMonthly: number;
  /** Running SIPs / RD from the health check the plan already counts here. */
  runningMonthly: number;
  /** SIPs planned but not started yet. */
  plannedMonthly: number;
  /** Earliest start month among planned SIPs (YYYY-MM-01). */
  nextStart: string | null;
  /** (linkedMonthly + runningMonthly) / monthlyRequired, 0–100. */
  coveragePct: number;
  /** Monthly shortfall of started SIPs against monthlyRequired. */
  gapMonthly: number;
  status: GoalHubStatus;
};

export type GoalsHub = {
  items: GoalHubItem[];
  /** Linked SIPs whose goal is gone (removed or no longer detected). */
  orphanSips: PlannedInvestment[];
  /** Goals you save for (loans paid by EMI aren't counted). */
  totals: {
    goals: number;
    onTrack: number;
    monthlyRequired: number;
    linkedMonthly: number;
    /** Running SIPs / RD already counted toward the goals. */
    runningMonthly: number;
    /** What the plan sets aside for the goals from what's left each month. */
    suggestedMonthly: number;
  };
};

/** Within 2% of the need counts as on track (rounded SIP amounts). */
const ON_TRACK_TOLERANCE = 0.98;

export function goalStatus(
  monthlyRequired: number,
  linkedMonthly: number,
  plannedMonthly: number,
): GoalHubStatus {
  if (monthlyRequired <= 0) return "on_track";
  if (linkedMonthly >= monthlyRequired * ON_TRACK_TOLERANCE) return "on_track";
  if (linkedMonthly > 0) return "behind";
  if (plannedMonthly > 0) return "planned";
  return "not_started";
}

export function buildGoalsHub(
  profile: Partial<FinancialProfile>,
  planGoals: GoalItem[] | undefined,
  sips: PlannedInvestment[],
  now: Date = new Date(),
): GoalsHub {
  const goals = detectGoals(profile, now);
  const planById = new Map(
    (planGoals ?? [])
      .filter((g) => g.goalId)
      .map((g) => [g.goalId as string, g]),
  );
  const ids = new Set(goals.map((g) => g.id));
  const goalSips = sips.filter((s) => s.source_kind === "goal");

  const items: GoalHubItem[] = goals.map((goal) => {
    const planGoal = planById.get(goal.id) ?? null;
    const mine = goalSips.filter((s) => s.source_id === goal.id);
    const linkedMonthly = mine
      .filter((s) => s.status !== "pending")
      .reduce((t, s) => t + s.monthly_amount, 0);
    const pending = mine.filter((s) => s.status === "pending");
    const plannedMonthly = pending.reduce((t, s) => t + s.monthly_amount, 0);
    const nextStart = pending.reduce<string | null>(
      (m, s) => (!m || s.start_month < m ? s.start_month : m),
      null,
    );

    if (goal.type === "debt_free") {
      return {
        goal,
        monthlyRequired: 0,
        suggestedMonthly: 0,
        currentSaved: 0,
        planGoal: null,
        sips: mine,
        linkedMonthly,
        runningMonthly: 0,
        plannedMonthly,
        nextStart,
        coveragePct: 100,
        gapMonthly: 0,
        status: "via_emi",
      };
    }

    // Started SIPs - the ones linked here plus the running SIPs / RD the plan
    // already counts toward the goal - against the full SIP it needs.
    const runningMonthly = Math.max(
      0,
      Math.round(planGoal?.existingMonthly ?? 0),
    );
    const monthlyRequired = Math.max(
      0,
      Math.round((planGoal?.monthlyRequired ?? 0) + runningMonthly),
    );
    const started = linkedMonthly + runningMonthly;
    const coveragePct =
      monthlyRequired > 0
        ? Math.min(100, Math.round((started / monthlyRequired) * 100))
        : 100;
    return {
      goal,
      monthlyRequired,
      suggestedMonthly: Math.max(
        0,
        Math.round(planGoal?.monthlyAllocated ?? 0),
      ),
      currentSaved: Math.max(0, Math.round(planGoal?.currentSaved ?? 0)),
      planGoal,
      sips: mine,
      linkedMonthly,
      runningMonthly,
      plannedMonthly,
      nextStart,
      coveragePct,
      gapMonthly: Math.max(0, monthlyRequired - started),
      status: goalStatus(monthlyRequired, started, plannedMonthly),
    };
  });

  const funded = items.filter((i) => i.status !== "via_emi");
  return {
    items,
    orphanSips: goalSips.filter((s) => !ids.has(s.source_id)),
    totals: {
      goals: funded.length,
      onTrack: funded.filter((i) => i.status === "on_track").length,
      monthlyRequired: funded.reduce((t, i) => t + i.monthlyRequired, 0),
      linkedMonthly: funded.reduce((t, i) => t + i.linkedMonthly, 0),
      runningMonthly: funded.reduce((t, i) => t + i.runningMonthly, 0),
      suggestedMonthly: funded.reduce((t, i) => t + i.suggestedMonthly, 0),
    },
  };
}

/** One line for the goal card, plain words, rupees rounded. */
export function goalStatusLine(
  item: Pick<
    GoalHubItem,
    "status" | "gapMonthly" | "monthlyRequired" | "nextStart"
  > &
    Partial<Pick<GoalHubItem, "suggestedMonthly">>,
  formatMonth: (ym: string) => string,
): string {
  const r = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
  switch (item.status) {
    case "via_emi":
      return "Paid down by your loan EMIs";
    case "on_track":
      return item.monthlyRequired > 0
        ? "On track with the SIPs you've started"
        : "Your savings already cover it - nothing more needed each month";
    case "behind":
      return `Behind by ${r(item.gapMonthly)}/month`;
    case "planned":
      return item.nextStart
        ? `SIP planned from ${formatMonth(item.nextStart)}`
        : "SIP planned";
    default:
      return (item.suggestedMonthly ?? 0) > 0 &&
        (item.suggestedMonthly ?? 0) < item.monthlyRequired
        ? `Needs ${r(item.monthlyRequired)}/month. Your plan can give it ${r(item.suggestedMonthly ?? 0)}/month - no SIP started yet`
        : `Needs ${r(item.monthlyRequired)}/month. No SIP started yet`;
  }
}

export const GOAL_EMOJI: Record<string, string> = {
  kid_education: "🎓",
  kid_marriage: "💍",
  home_purchase: "🏠",
  vehicle_purchase: "🚗",
  debt_free: "💳",
  parents_eldercare: "👵",
  retirement: "🏖️",
  marriage: "💍",
  baby: "👶",
  custom: "🎯",
};
