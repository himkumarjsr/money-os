/** Result-screen derivations shared by web and mobile so both show the same plan teaser, CTA and labels. */
import {
  CITY_TIER_LABELS,
  LIFE_STAGE_LABELS,
  PRIMARY_GOAL_LABELS,
} from "@/lib/analyse-form-schema";
import {
  emergencyFundMonthsNeeded,
  scoreBand,
  type ScoreBand,
} from "@/lib/financialEngine";
import { openPriorities } from "@/lib/fixPlanMerge";
import type { PriorityItem } from "@/lib/priorityEngine";

export const TEASER_STEP_COUNT = 2;

export type PlanTeaser = {
  openCount: number;
  first: Pick<PriorityItem, "id" | "title" | "actionThisWeek"> | null;
  teaserTitles: string[];
  moreCount: number;
};

/** Step 1 is shown free, the next `teaserCount` open priorities are blurred teasers, the rest are "+N more". */
export function derivePlanTeaser(
  plan: { priorities?: PriorityItem[] } | null | undefined,
  teaserCount: number = TEASER_STEP_COUNT,
): PlanTeaser {
  const open: PriorityItem[] = openPriorities(plan);
  const first = open[0] ?? null;
  const teaserTitles = open.slice(1, 1 + teaserCount).map((p) => p.title);
  const shownCount = (first ? 1 : 0) + teaserTitles.length;
  return {
    openCount: open.length,
    first: first
      ? {
          id: first.id,
          title: first.title,
          actionThisWeek: first.actionThisWeek,
        }
      : null,
    teaserTitles,
    moreCount: Math.max(0, open.length - shownCount),
  };
}

export type CtaCopy = { title: string; subText: string };

export function deriveCtaCopy(input: {
  score: number;
  openCount: number;
  topPriorityTitle: string | null;
  hasCriticalIssues: boolean;
}): CtaCopy {
  const { score, openCount, topPriorityTitle, hasCriticalIssues } = input;
  if (openCount === 0 || !topPriorityTitle) {
    return {
      title: "Get my complete financial plan →",
      subText: "No open gaps right now — see how to keep it that way",
    };
  }
  const subText =
    openCount === 1
      ? `1 priority to work on: ${topPriorityTitle}`
      : `${openCount} priorities, starting with ${topPriorityTitle}`;
  const band: ScoreBand = scoreBand(score);
  const title = hasCriticalIssues
    ? "Get my personalised fix plan →"
    : band === "critical"
      ? "See my complete recovery plan →"
      : band === "warning"
        ? "Get my optimisation plan →"
        : "Get my wealth building plan →";
  return { title, subText };
}

export function emergencyFundCheck(
  profile: Parameters<typeof emergencyFundMonthsNeeded>[0],
  needsMonthly: number,
  monthsCovered: number,
) {
  const months = emergencyFundMonthsNeeded(profile);
  return {
    months,
    target: needsMonthly * months,
    isOk: monthsCovered >= months,
  };
}

export function humaniseEnum(value: string | null | undefined): string {
  if (!value) return "";
  const spaced = value.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function labelFor(
  labels: Record<string, string>,
  value: string | null | undefined,
): string {
  if (!value) return "";
  return labels[value] ?? humaniseEnum(value);
}

export function profileSummaryLabels(profile: {
  lifeStage?: string | null;
  cityTier?: string | null;
  primaryGoal?: string | null;
}): string[] {
  return [
    labelFor(LIFE_STAGE_LABELS, profile.lifeStage),
    labelFor(CITY_TIER_LABELS, profile.cityTier),
    labelFor(PRIMARY_GOAL_LABELS, profile.primaryGoal),
  ].filter(Boolean);
}
