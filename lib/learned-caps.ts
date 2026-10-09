import { countsTowardTrackerTotals } from "@/lib/tracker-categories";
import type {
  SmartBudget,
  SmartBudgetAdjustment,
  UniversalBucketKey,
} from "@/lib/universal-buckets";

/** Spending in one past calendar month, in rupees. */
export type MonthSpend = {
  needs: number;
  wants: number;
  /** False for a month with too little tracked to show a habit. */
  hasData: boolean;
};

export type LearnedAdjustment = SmartBudgetAdjustment;

/** Full months of history needed before a budget is lowered. */
export const LEARN_MONTHS = 3;
/** Headroom kept above the average so a normal month doesn't go red. */
export const LEARN_BUFFER = 0.1;
/** Never lower these buckets below this share of income (whole percents). */
export const LEARN_FLOORS = { needs: 10, wants: 5 } as const;
/**
 * A month needs at least this many spending entries to count — a half-logged
 * month looks like low spending and must not shrink a budget.
 */
export const LEARN_MIN_ENTRIES = 5;

/**
 * Lowers Needs / Wants budgets when spending stayed under them in each of the
 * last `LEARN_MONTHS` full months, and moves the freed share into Investment.
 * Budgets never go up here: overspending simply means no adjustment applies.
 *
 * `minMonthly` keeps a bucket at or above a known monthly cost — e.g. the
 * Needs total from the Analyse form, which spreads yearly bills such as
 * school fees across months, so a quiet quarter can't cut Needs below them.
 */
export function learnCapsFromSpending(
  caps: Record<UniversalBucketKey, number>,
  monthlyIncome: number,
  history: MonthSpend[],
  minMonthly: Partial<Record<"needs" | "wants", number>> = {},
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
    const target = Math.max(
      averageSpend * (1 + LEARN_BUFFER),
      minMonthly[key] ?? 0,
    );
    const toPercent = Math.max(
      LEARN_FLOORS[key],
      Math.ceil((target / monthlyIncome) * 100),
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

/**
 * The smart budget to store for this profile, or null when nothing applies.
 * Keeps the user's Undo choice when the learned split itself is unchanged.
 */
export function buildSmartBudget(
  baseCaps: Record<UniversalBucketKey, number>,
  learned: ReturnType<typeof learnCapsFromSpending>,
  previous: SmartBudget | null | undefined,
  /** Used when nothing is stored yet, e.g. the user turned it off on this device. */
  defaultEnabled = true,
): SmartBudget | null {
  if (learned.adjustments.length === 0) return null;
  const enabled = previous ? previous.enabled : defaultEnabled;
  return {
    baseCaps,
    caps: learned.caps,
    adjustments: learned.adjustments,
    enabled,
    computedAt: new Date().toISOString(),
  };
}

/** True when two smart budgets would show the user the same thing. */
export function sameSmartBudget(
  a: SmartBudget | null | undefined,
  b: SmartBudget | null | undefined,
): boolean {
  if (!a || !b) return !a && !b;
  const key = (sb: SmartBudget) =>
    JSON.stringify([
      sb.enabled,
      sb.baseCaps,
      sb.caps,
      sb.adjustments.map((x) => [x.key, x.fromPercent, x.toPercent]),
    ]);
  return key(a) === key(b);
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
  const spendRows = rows.filter(
    (t) => t.bucket !== "income" && countsTowardTrackerTotals(t),
  );
  const total = (bucket: string) =>
    spendRows
      .filter((t) => t.bucket === bucket)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  return {
    needs: total("needs"),
    wants: total("wants"),
    hasData: spendRows.length >= LEARN_MIN_ENTRIES,
  };
}
