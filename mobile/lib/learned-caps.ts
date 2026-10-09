import { countsTowardTrackerTotals } from "@/lib/tracker-categories";
import type { UniversalBucketKey } from "@/lib/universal-buckets";

/** Spending in one past calendar month, in rupees. */
export type MonthSpend = {
  needs: number;
  wants: number;
  /** False for a month with nothing tracked — it can't show a habit. */
  hasData: boolean;
};

export type LearnedAdjustment = {
  key: "needs" | "wants";
  fromPercent: number;
  toPercent: number;
  averageSpend: number;
  /** Rupees a month moved from this bucket into Investment. */
  movedToInvestment: number;
};

/** Full months of history needed before a budget is lowered. */
export const LEARN_MONTHS = 3;
/** Headroom kept above the average so a normal month doesn't go red. */
export const LEARN_BUFFER = 0.1;
/** Never lower these buckets below this share of income (whole percents). */
export const LEARN_FLOORS = { needs: 10, wants: 5 } as const;

/**
 * Lowers Needs / Wants budgets when spending stayed under them in each of the
 * last `LEARN_MONTHS` full months, and moves the freed share into Investment.
 * Budgets never go up here: overspending simply means no adjustment applies.
 */
export function learnCapsFromSpending(
  caps: Record<UniversalBucketKey, number>,
  monthlyIncome: number,
  history: MonthSpend[],
): {
  caps: Record<UniversalBucketKey, number>;
  adjustments: LearnedAdjustment[];
} {
  const months = history.slice(0, LEARN_MONTHS);
  if (
    monthlyIncome <= 0 ||
    months.length < LEARN_MONTHS ||
    months.some((m) => !m.hasData)
  ) {
    return { caps, adjustments: [] };
  }

  const pct = Object.fromEntries(
    Object.entries(caps).map(([k, v]) => [k, Math.round(v * 100)]),
  ) as Record<UniversalBucketKey, number>;
  const adjustments: LearnedAdjustment[] = [];

  for (const key of ["needs", "wants"] as const) {
    const capAmount = (monthlyIncome * pct[key]) / 100;
    if (!months.every((m) => m[key] < capAmount)) continue;

    const averageSpend =
      months.reduce((sum, m) => sum + m[key], 0) / months.length;
    const toPercent = Math.max(
      LEARN_FLOORS[key],
      Math.ceil(((averageSpend * (1 + LEARN_BUFFER)) / monthlyIncome) * 100),
    );
    if (toPercent >= pct[key]) continue;

    const freed = pct[key] - toPercent;
    adjustments.push({
      key,
      fromPercent: pct[key],
      toPercent,
      averageSpend,
      movedToInvestment: (monthlyIncome * freed) / 100,
    });
    pct[key] = toPercent;
    pct.investment += freed;
  }

  if (adjustments.length === 0) return { caps, adjustments };
  return {
    caps: Object.fromEntries(
      Object.entries(pct).map(([k, v]) => [k, v / 100]),
    ) as Record<UniversalBucketKey, number>,
    adjustments,
  };
}

/** Needs / Wants totals for one month of tracker rows. */
export function monthSpendFromRows(
  rows: Array<
    Parameters<typeof countsTowardTrackerTotals>[0] & {
      bucket?: string | null;
      amount: number | string;
    }
  >,
): MonthSpend {
  const total = (bucket: string) =>
    rows
      .filter((t) => t.bucket === bucket && countsTowardTrackerTotals(t))
      .reduce((sum, t) => sum + Number(t.amount), 0);
  return {
    needs: total("needs"),
    wants: total("wants"),
    hasData: rows.some((t) => t.bucket !== "income"),
  };
}
