/**
 * Year-by-year view of one goal up to its target year: what the planned
 * monthly amount puts in, what it should grow to, and what the goal needs by
 * then to stay on track. Today's rupees, same real returns as goalFunding.
 */
import { LONG_RUN_INFLATION } from "@/lib/financialEngine";
import { HORIZON_ASSUMPTIONS } from "@/lib/goalFunding";
import { goalHorizon } from "@/lib/portfolioAllocation";
import type { GoalItem } from "@/lib/priorityEngine";
import { sipMaturityAmount } from "@/lib/sipGoal";

export type GoalTimelineRow = {
  year: number;
  /** Total put in by the end of this year. */
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
    "yearsToGoal" | "monthlyRequired" | "monthlyAllocated" | "allocation"
  >,
  now: Date = new Date(),
): GoalTimeline | null {
  const years = Math.round(goal.yearsToGoal);
  const monthly = Math.round(goal.monthlyAllocated ?? goal.monthlyRequired);
  if (years < 1 || monthly <= 0) return null;
  const horizon = goal.allocation?.horizon ?? goalHorizon(goal.yearsToGoal);
  const nominal = HORIZON_ASSUMPTIONS[horizon].nominalReturn;
  const realReturnPct = ((1 + nominal) / (1 + LONG_RUN_INFLATION) - 1) * 100;
  const startYear = now.getFullYear();
  const rows: GoalTimelineRow[] = [];
  for (let y = 1; y <= years; y++) {
    rows.push({
      year: startYear + y,
      invested: monthly * 12 * y,
      expected: Math.round(sipMaturityAmount(monthly, realReturnPct, y)),
      needed: Math.round(
        sipMaturityAmount(goal.monthlyRequired, realReturnPct, y),
      ),
    });
  }
  return {
    realReturnPct: Math.round(realReturnPct * 10) / 10,
    monthly,
    rows,
  };
}
