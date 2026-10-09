import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { TRACKER_CATEGORIES } from "@/lib/tracker-categories";
import {
  BUCKET_CAPS,
  getUniversalCaps,
  type UniversalBucketKey,
} from "@/lib/universal-buckets";

/**
 * Budget caps in whole percent for a past month — the same split as the main
 * tracker: the user's own split (smart budget included) once Analyse is done,
 * otherwise the generic split.
 */
export function monthSummaryCaps(
  profile: Partial<FinancialProfile> | null | undefined,
): Record<UniversalBucketKey, number> {
  const caps = profile ? getUniversalCaps(profile) : { ...BUCKET_CAPS };
  return {
    needs: Math.round(caps.needs * 100),
    wants: Math.round(caps.wants * 100),
    security: Math.round(caps.security * 100),
    loans: Math.round(caps.loans * 100),
    investment: Math.round(caps.investment * 100),
  };
}

export type MonthSummaryRow = {
  key: string;
  amount: number;
  /** 0 when the bucket has no budget (e.g. habits). */
  capPct: number;
  /** Investment is a target to reach, the rest are limits. */
  isTarget: boolean;
  budgetAmount: number;
  /** Bar width, 0–100. */
  fillPct: number;
  over: boolean;
};

/**
 * One row per spending bucket. Budgets are a share of the month's income,
 * like the main tracker; with no income known they fall back to a share of
 * what was spent. Investment over its target is never "over".
 */
export function buildMonthSummaryRows(input: {
  bucketTotals: Record<string, number>;
  totalSpent: number;
  income: number;
  caps: Record<UniversalBucketKey, number>;
}): MonthSummaryRow[] {
  const base = input.income > 0 ? input.income : input.totalSpent;
  return Object.entries(TRACKER_CATEGORIES)
    .filter(([key]) => key !== "income")
    .map(([key, cat]) => {
      const amount = input.bucketTotals[key] || 0;
      const capPct =
        key in input.caps
          ? input.caps[key as UniversalBucketKey]
          : (cat.cap as number);
      const isTarget = key === "investment";
      const budgetAmount = capPct > 0 && base > 0 ? (base * capPct) / 100 : 0;
      const over = !isTarget && budgetAmount > 0 && amount > budgetAmount;
      const fillPct =
        budgetAmount > 0
          ? Math.min((amount / budgetAmount) * 100, 100)
          : input.totalSpent > 0
            ? Math.min((amount / input.totalSpent) * 100, 100)
            : 0;
      return { key, amount, capPct, isTarget, budgetAmount, fillPct, over };
    });
}
