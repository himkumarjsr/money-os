/** Result-screen derivations shared by web and mobile so both show the same plan teaser, CTA and labels. */
import {
  CITY_TIER_LABELS,
  LIFE_STAGE_LABELS,
  PRIMARY_GOAL_LABELS,
} from "@/lib/analyse-form-schema";
import { emergencyFundMonthsNeeded } from "@/lib/financialEngine";
import { openPriorities } from "@/lib/fixPlanMerge";
import type { PriorityItem } from "@/lib/priorityEngine";

export const TEASER_STEP_COUNT = 2;

export type PlanTeaser = {
  openCount: number;
  first: Pick<PriorityItem, "id" | "title" | "actionThisWeek"> | null;
  teaserTitles: string[];
  moreCount: number;
  /** The report's list of gaps, by name only (the fixes are in the plan). */
  gapTitles: string[];
};

/** How many gaps the report names before "+N more". */
export const GAP_TITLE_COUNT = 6;

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
    gapTitles: open.slice(0, GAP_TITLE_COUNT).map((p) => p.title),
  };
}

export type CtaCopy = { title: string; subText: string };

/** The report's one call to action: the plan that fixes what it found. */
export function deriveCtaCopy(input: {
  score: number;
  openCount: number;
  topPriorityTitle: string | null;
  hasCriticalIssues: boolean;
}): CtaCopy {
  const { openCount, topPriorityTitle } = input;
  const title = "Get my wealth builder plan →";
  if (openCount === 0 || !topPriorityTitle) {
    return {
      title,
      subText: "No open gaps right now - see how to keep it that way",
    };
  }
  return {
    title,
    subText:
      openCount === 1
        ? `1 gap to fix: ${topPriorityTitle}`
        : `${openCount} gaps to fix, starting with ${topPriorityTitle}`,
  };
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
