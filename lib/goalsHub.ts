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
  /** SIPs planned but not started yet. */
  plannedMonthly: number;
  /** Earliest start month among planned SIPs (YYYY-MM-01). */
  nextStart: string | null;
  /** linkedMonthly / monthlyRequired, 0–100. */
  coveragePct: number;
  /** Monthly shortfall of linked SIPs against monthlyRequired. */
  gapMonthly: number;
  status: GoalHubStatus;
};

export type GoalsHub = {
  items: GoalHubItem[];
  /** Linked SIPs whose goal is gone (removed or no longer detected). */
  orphanSips: PlannedInvestment[];
  totals: {
    goals: number;
    onTrack: number;
    monthlyRequired: number;
    linkedMonthly: number;
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
        plannedMonthly,
        nextStart,
        coveragePct: 100,
        gapMonthly: 0,
        status: "via_emi",
      };
    }

    const monthlyRequired = Math.max(
      0,
      Math.round(planGoal?.monthlyRequired ?? 0),
    );
    const coveragePct =
      monthlyRequired > 0
        ? Math.min(100, Math.round((linkedMonthly / monthlyRequired) * 100))
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
      plannedMonthly,
      nextStart,
      coveragePct,
      gapMonthly: Math.max(0, monthlyRequired - linkedMonthly),
      status: goalStatus(monthlyRequired, linkedMonthly, plannedMonthly),
    };
  });

  const funded = items.filter((i) => i.status !== "via_emi");
  return {
    items,
    orphanSips: goalSips.filter((s) => !ids.has(s.source_id)),
    totals: {
      goals: items.length,
      onTrack: funded.filter((i) => i.status === "on_track").length,
      monthlyRequired: funded.reduce((t, i) => t + i.monthlyRequired, 0),
      linkedMonthly: funded.reduce((t, i) => t + i.linkedMonthly, 0),
    },
  };
}

/** One line for the goal card, plain words, rupees rounded. */
export function goalStatusLine(
  item: Pick<
    GoalHubItem,
    "status" | "gapMonthly" | "monthlyRequired" | "nextStart"
  >,
  formatMonth: (ym: string) => string,
): string {
  const r = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
  switch (item.status) {
    case "via_emi":
      return "Paid down by your loan EMIs";
    case "on_track":
      return item.monthlyRequired > 0
        ? "On track with your linked SIPs"
        : "Already covered by what you've saved";
    case "behind":
      return `Behind by ${r(item.gapMonthly)}/month`;
    case "planned":
      return item.nextStart
        ? `SIP planned from ${formatMonth(item.nextStart)}`
        : "SIP planned";
    default:
      return `Needs ${r(item.monthlyRequired)}/month. No SIP linked yet`;
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
