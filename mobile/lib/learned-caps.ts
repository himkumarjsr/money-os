import {
  countsTowardTrackerTotals,
  trackerTotalAmount,
} from "@/lib/tracker-categories";
import {
  CARD_EXTRA_SUBCATEGORY,
  CARD_OVERDUE_SUBCATEGORY,
  isVirtualTxnId,
} from "@/lib/trackerCreditCards";
import {
  CAP_FLOORS,
  type SmartBudget,
  type SmartBudgetAdjustment,
  type UniversalBucketKey,
} from "@/lib/universal-buckets";

/** Spending in one past calendar month, in rupees. */
export type MonthSpend = {
  needs: number;
  wants: number;
  /**
   * Fixed loan EMIs (Loans bucket incl. card EMIs; card bill payments,
   * card interest / older balance and unpaid bills left out).
   */
  loans: number;
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
/** Hard ceiling for the Loans budget when it is raised to fit fixed EMIs. */
export const LEARN_LOANS_CEILING = 40;

/**
 * Lowers Needs / Wants budgets when spending stayed under them in each of the
 * last `LEARN_MONTHS` full months. The freed share first goes to Loans when
 * fixed EMIs were above the Loans budget in each of those months (up to
 * `LEARN_LOANS_CEILING`% of income); the rest goes to Investment. Needs and
 * Wants never go up, Investment never goes down, Security is never touched.
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
  const freed: Array<{ adj: LearnedAdjustment; points: number }> = [];

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

    const points = pct[key] - toPercent;
    const adj: LearnedAdjustment = {
      key,
      fromPercent: pct[key],
      toPercent,
      averageSpend,
      movedToInvestment: (monthlyIncome * points) / 100,
    };
    adjustments.push(adj);
    freed.push({ adj, points });
    pct[key] = toPercent;
  }

  // Freed points cover fixed EMIs that sat above the Loans budget every month.
  const freedTotal = freed.reduce((s, f) => s + f.points, 0);
  const loansCap = (monthlyIncome * pct.loans) / 100;
  if (freedTotal > 0 && months.every((m) => (m.loans ?? 0) > loansCap)) {
    // Smallest month = the EMIs present in all three.
    const fixedEmi = Math.min(...months.map((m) => m.loans ?? 0));
    const needed = Math.min(
      LEARN_LOANS_CEILING,
      Math.ceil((fixedEmi / monthlyIncome) * 100),
    );
    // Investment keeps at least its floor; Security is never touched.
    const investRoom = pct.investment + freedTotal - CAP_FLOORS.investment;
    const raise = Math.max(
      0,
      Math.min(freedTotal, investRoom, needed - pct.loans),
    );
    if (raise > 0) {
      adjustments.push({
        key: "loans",
        fromPercent: pct.loans,
        toPercent: pct.loans + raise,
        averageSpend:
          months.reduce((s, m) => s + (m.loans ?? 0), 0) / months.length,
        movedToInvestment: 0,
      });
      pct.loans += raise;
      // Take the points from Needs first, then Wants.
      let left = raise;
      for (const f of freed) {
        const take = Math.min(left, f.points);
        if (take <= 0) continue;
        f.points -= take;
        f.adj.movedToLoans = (monthlyIncome * take) / 100;
        f.adj.movedToInvestment = (monthlyIncome * f.points) / 100;
        left -= take;
      }
    }
  }
  pct.investment += freed.reduce((s, f) => s + f.points, 0);

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
    (t) => t.bucket !== "income" && trackerTotalAmount(t) !== 0,
  );
  const total = (bucket: string, skip: string[] = []) =>
    spendRows
      .filter(
        (t) =>
          t.bucket === bucket &&
          !skip.includes(String(t.subcategory || t.category || "")),
      )
      .reduce((sum, t) => sum + trackerTotalAmount(t), 0);
  // Generated rows (card EMIs etc.) are not entries the user logged.
  const entries = spendRows.filter(
    (t) => !isVirtualTxnId((t as { id?: string }).id),
  ).length;
  return {
    needs: total("needs"),
    wants: total("wants"),
    loans: total("loans", [CARD_EXTRA_SUBCATEGORY, CARD_OVERDUE_SUBCATEGORY]),
    hasData: entries >= LEARN_MIN_ENTRIES,
  };
}
