/**
 * Year-by-year view of one goal up to its target year: what the planned
 * monthly amount puts in, what it should grow to, and what the goal needs by
 * then to stay on track. Today's rupees, same returns and yearly SIP
 * step-up as goalFunding.
 */
import { LONG_RUN_INFLATION } from "@/lib/holdings";
import { averageReturn, goalRate, sipRealValueAt } from "@/lib/goalMath";
import type { GoalItem } from "@/lib/priorityEngine";

export type GoalTimelineRow = {
  year: number;
  /** Total put in by the end of this year (rupees paid, raised each year by the step-up). */
  invested: number;
  /** Expected value of those contributions. */
  expected: number;
  /** Value the full monthly need would have reached (on-track line). */
  needed: number;
};

export type GoalTimeline = {
  realReturnPct: number;
  monthly: number;
  rows: GoalTimelineRow[];
};

export function goalTimeline(
  goal: Pick<
    GoalItem,
    | "yearsToGoal"
    | "monthlyRequired"
    | "monthlyAllocated"
    | "allocation"
    | "stepUp"
    | "rate"
  > & { goalType?: string },
  now: Date = new Date(),
): GoalTimeline | null {
  const years = Math.round(goal.yearsToGoal);
  const monthly = Math.round(goal.monthlyAllocated ?? goal.monthlyRequired);
  if (years < 1 || monthly <= 0) return null;
  const nominal =
    goal.rate ??
    goalRate(
      { riskTolerance: goal.allocation?.riskTolerance },
      goal.yearsToGoal,
      goal.goalType,
    );
  const stepUp = goal.stepUp ?? 0;
  const months = Math.round(goal.yearsToGoal * 12);
  const realReturnPct =
    ((1 + averageReturn(nominal, goal.yearsToGoal)) / (1 + LONG_RUN_INFLATION) -
      1) *
    100;
  const startYear = now.getFullYear();
  const rows: GoalTimelineRow[] = [];
  let invested = 0;
  for (let y = 1; y <= years; y++) {
    invested += monthly * 12 * Math.pow(1 + stepUp, y - 1);
    rows.push({
      year: startYear + y,
      invested: Math.round(invested),
      expected: Math.round(
        monthly * sipRealValueAt(12 * y, months, nominal, stepUp),
      ),
      needed: Math.round(
        goal.monthlyRequired * sipRealValueAt(12 * y, months, nominal, stepUp),
      ),
    });
  }
  return {
    realReturnPct: Math.round(realReturnPct * 10) / 10,
    monthly,
    rows,
  };
}
