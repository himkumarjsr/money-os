import {
  TRACKER_CATEGORIES,
  countsTowardTrackerTotals,
  findSubcategory,
  type BucketType,
} from "@/lib/tracker-categories";

export type TrackerTxnLike = {
  amount: number;
  bucket: string;
  category: string;
  subcategory: string | null;
  payment_method?: string | null;
};

export type SafetyStatus = "safe" | "tight" | "over" | "unknown";

export type MonthSnapshot = {
  income: number;
  totalSpent: number;
  remaining: number;
  savingsRate: number | null;
  bucketTotals: Record<string, number>;
};

export type BucketHealth = {
  bucket: BucketType;
  label: string;
  spent: number;
  capPct: number;
  capAmount: number;
  pctOfIncome: number;
  overBy: number;
  status: "ok" | "over" | "skip";
};

export type SpendMover = {
  bucket: string;
  subId: string;
  label: string;
  current: number;
  previous: number;
  delta: number;
};

export type SafetyPulseResult = {
  status: SafetyStatus;
  statusLabel: string;
  headline: string;
  reasons: string[];
  action: string | null;
  current: MonthSnapshot;
  previous: MonthSnapshot | null;
  spentDelta: number | null;
  spentDeltaPct: number | null;
  movers: SpendMover[];
  bucketHealth: BucketHealth[];
  dailySafeSpend: number | null;
  daysLeftInMonth: number | null;
  projectedMonthSpend: number | null;
  isCurrentCalendarMonth: boolean;
  hasSpendData: boolean;
};

const SPEND_BUCKETS = [
  "needs",
  "wants",
  "habits",
  "security",
  "loans",
  "investment",
] as const satisfies readonly BucketType[];

function formatInr(n: number): string {
  return `₹${Math.round(Math.abs(n)).toLocaleString("en-IN")}`;
}

function aggregateMonth(
  txns: TrackerTxnLike[],
  fallbackIncome: number,
): MonthSnapshot {
  const bucketTotals: Record<string, number> = {};
  let incomeFromTxns = 0;
  let totalSpent = 0;

  for (const t of txns) {
    if (!countsTowardTrackerTotals(t)) continue;
    const amt = Number(t.amount) || 0;
    bucketTotals[t.bucket] = (bucketTotals[t.bucket] || 0) + amt;
    if (t.bucket === "income") incomeFromTxns += amt;
    else totalSpent += amt;
  }

  const income = incomeFromTxns > 0 ? incomeFromTxns : fallbackIncome;
  const remaining = income - totalSpent;

  return {
    income,
    totalSpent,
    remaining,
    savingsRate: income > 0 ? remaining / income : null,
    bucketTotals,
  };
}

function subcategoryRollup(txns: TrackerTxnLike[]) {
  const map = new Map<
    string,
    { amount: number; bucket: string; subId: string }
  >();

  for (const t of txns) {
    if (t.bucket === "income") continue;
    if (!countsTowardTrackerTotals(t)) continue;
    const subId = t.subcategory || t.category || "other";
    const key = `${t.bucket}:${subId}`;
    const amt = Number(t.amount) || 0;
    const prev = map.get(key);
    if (prev) prev.amount += amt;
    else map.set(key, { amount: amt, bucket: t.bucket, subId });
  }

  return map;
}

function subLabel(bucket: string, subId: string): string {
  if (bucket in TRACKER_CATEGORIES) {
    const found = findSubcategory(bucket as BucketType, subId);
    if (found) return found.label;
  }
  return subId.replace(/_/g, " ");
}

function buildBucketHealth(snapshot: MonthSnapshot): BucketHealth[] {
  const income = snapshot.income;
  return SPEND_BUCKETS.map((bucket) => {
    const meta = TRACKER_CATEGORIES[bucket];
    const spent = snapshot.bucketTotals[bucket] || 0;
    const capPct = meta.cap;
    if (capPct <= 0) {
      return {
        bucket,
        label: meta.label,
        spent,
        capPct,
        capAmount: 0,
        pctOfIncome: income > 0 ? (spent / income) * 100 : 0,
        overBy: 0,
        status: "skip" as const,
      };
    }
    const capAmount = income > 0 ? income * (capPct / 100) : 0;
    const pctOfIncome = income > 0 ? (spent / income) * 100 : 0;
    const overBy = Math.max(0, spent - capAmount);
    return {
      bucket,
      label: meta.label,
      spent,
      capPct,
      capAmount,
      pctOfIncome,
      overBy,
      status: overBy > 0 ? ("over" as const) : ("ok" as const),
    };
  });
}

function buildMovers(
  currentTxns: TrackerTxnLike[],
  previousTxns: TrackerTxnLike[] | null,
): SpendMover[] {
  if (!previousTxns || previousTxns.length === 0) return [];

  const cur = subcategoryRollup(currentTxns);
  const prev = subcategoryRollup(previousTxns);
  const keys = new Set([...Array.from(cur.keys()), ...Array.from(prev.keys())]);
  const movers: SpendMover[] = [];

  for (const key of Array.from(keys)) {
    const c = cur.get(key);
    const p = prev.get(key);
    const currentAmt = c?.amount ?? 0;
    const previousAmt = p?.amount ?? 0;
    const delta = currentAmt - previousAmt;
    if (Math.abs(delta) < 100) continue;
    const bucket = c?.bucket ?? p!.bucket;
    const subId = c?.subId ?? p!.subId;
    movers.push({
      bucket,
      subId,
      label: subLabel(bucket, subId),
      current: currentAmt,
      previous: previousAmt,
      delta,
    });
  }

  return movers
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);
}

export function previousCalendarMonth(
  monthIndex: number,
  year: number,
): { monthIndex: number; year: number; monthName: string } {
  const d = new Date(year, monthIndex, 1);
  d.setMonth(d.getMonth() - 1);
  return {
    monthIndex: d.getMonth(),
    year: d.getFullYear(),
    monthName: d.toLocaleString("en-IN", { month: "long" }),
  };
}

/**
 * Deterministic month safety analytics for the expense tracker.
 * No AI — rules only (caps, runway, MoM movers).
 */
export function computeMonthSafetyPulse(input: {
  currentTxns: TrackerTxnLike[];
  previousTxns?: TrackerTxnLike[] | null;
  fallbackIncome?: number;
  monthIndex: number;
  year: number;
  asOf?: Date;
}): SafetyPulseResult {
  const fallbackIncome = Math.max(0, Number(input.fallbackIncome) || 0);
  const asOf = input.asOf ?? new Date();
  const current = aggregateMonth(input.currentTxns, fallbackIncome);
  const previous =
    input.previousTxns != null
      ? aggregateMonth(input.previousTxns, fallbackIncome)
      : null;

  const isCurrentCalendarMonth =
    asOf.getFullYear() === input.year && asOf.getMonth() === input.monthIndex;

  const daysInMonth = new Date(input.year, input.monthIndex + 1, 0).getDate();
  const dayOfMonth = isCurrentCalendarMonth
    ? Math.min(asOf.getDate(), daysInMonth)
    : daysInMonth;
  const daysLeftInMonth = isCurrentCalendarMonth
    ? Math.max(0, daysInMonth - asOf.getDate())
    : null;

  const projectedMonthSpend =
    isCurrentCalendarMonth && dayOfMonth > 0 && current.totalSpent > 0
      ? (current.totalSpent / dayOfMonth) * daysInMonth
      : isCurrentCalendarMonth
        ? current.totalSpent
        : null;

  const dailySafeSpend =
    isCurrentCalendarMonth &&
    daysLeftInMonth != null &&
    daysLeftInMonth > 0 &&
    current.income > 0
      ? Math.max(0, current.remaining) / daysLeftInMonth
      : null;

  const bucketHealth = buildBucketHealth(current);
  const overCaps = bucketHealth.filter((b) => b.status === "over");
  const movers = buildMovers(input.currentTxns, input.previousTxns ?? null);

  const spentDelta =
    previous != null ? current.totalSpent - previous.totalSpent : null;
  const spentDeltaPct =
    previous != null && previous.totalSpent > 0
      ? ((current.totalSpent - previous.totalSpent) / previous.totalSpent) * 100
      : null;

  const hasSpendData = current.totalSpent > 0 || input.currentTxns.length > 0;

  let status: SafetyStatus = "unknown";
  const reasons: string[] = [];
  let action: string | null = null;

  if (!hasSpendData && current.income <= 0) {
    status = "unknown";
  } else if (current.income <= 0 && current.totalSpent > 0) {
    status = "tight";
    reasons.push(
      "No income logged for this month — add salary so Safety Pulse can judge your caps.",
    );
    action =
      "Log this month’s income (or complete Analyse so we can use your salary).";
  } else if (current.totalSpent > current.income && current.income > 0) {
    status = "over";
    reasons.push(
      `Spent ${formatInr(current.totalSpent)} against ${formatInr(current.income)} income — already over by ${formatInr(current.totalSpent - current.income)}.`,
    );
  } else if (
    projectedMonthSpend != null &&
    current.income > 0 &&
    // Only escalate on pace after the first week (early-month rent/EMI skews projection).
    dayOfMonth >= 8 &&
    projectedMonthSpend > current.income * 1.05
  ) {
    status = "over";
    reasons.push(
      `At this pace you’ll finish near ${formatInr(projectedMonthSpend)} vs ${formatInr(current.income)} income.`,
    );
  } else if (overCaps.length > 0) {
    status = "tight";
    const top = [...overCaps].sort((a, b) => b.overBy - a.overBy)[0];
    reasons.push(
      `${top.label} is ${top.pctOfIncome.toFixed(1)}% of income (cap ${top.capPct}%) — over by ${formatInr(top.overBy)}.`,
    );
  } else if (
    dailySafeSpend != null &&
    daysLeftInMonth != null &&
    daysLeftInMonth > 0 &&
    current.income > 0 &&
    dailySafeSpend < (current.income / daysInMonth) * 0.35
  ) {
    status = "tight";
    reasons.push(
      `${daysLeftInMonth} day${daysLeftInMonth === 1 ? "" : "s"} left with only ${formatInr(dailySafeSpend)}/day safe to spend.`,
    );
  } else if (hasSpendData || current.income > 0) {
    status = "safe";
    if (current.income > 0) {
      reasons.push(
        `You’re within plan — ${formatInr(Math.max(0, current.remaining))} left after logged spend.`,
      );
    }
  }

  // Extra reasons (MoM + investment skip) — keep max 2 total reasons
  if (reasons.length < 2 && spentDelta != null && Math.abs(spentDelta) >= 500) {
    const dir = spentDelta > 0 ? "up" : "down";
    const pct =
      spentDeltaPct != null
        ? ` (${spentDeltaPct > 0 ? "+" : ""}${spentDeltaPct.toFixed(0)}%)`
        : "";
    reasons.push(
      `Total spend is ${dir} ${formatInr(spentDelta)}${pct} vs last month.`,
    );
  }

  if (
    reasons.length < 2 &&
    movers[0] &&
    movers[0].delta > 0 &&
    movers[0].bucket !== "investment" &&
    movers[0].bucket !== "loans"
  ) {
    reasons.push(
      `${movers[0].label} rose by ${formatInr(movers[0].delta)} vs last month.`,
    );
  }

  // One clear action
  if (!action) {
    if (overCaps.length > 0) {
      const top = [...overCaps].sort((a, b) => b.overBy - a.overBy)[0];
      const leak = movers.find((m) => m.bucket === top.bucket && m.delta > 0);
      if (leak) {
        action = `Trim ${leak.label} by about ${formatInr(Math.min(leak.delta, top.overBy))} to get ${top.label} under ${top.capPct}%.`;
      } else {
        action = `Cut ${top.label} by ${formatInr(top.overBy)} to get back under the ${top.capPct}% cap.`;
      }
    } else if (
      (!current.bucketTotals.investment ||
        current.bucketTotals.investment === 0) &&
      current.income > 0
    ) {
      const target = Math.round(current.income * 0.2);
      action = `No investment logged — aim ~${formatInr(target)} (20% cap) via SIP this month.`;
    } else if ((current.bucketTotals.habits || 0) > 0 && status !== "safe") {
      action = `Habits took ${formatInr(current.bucketTotals.habits || 0)} — redirect the next habit spend to emergency fund or SIP.`;
    } else if (
      dailySafeSpend != null &&
      daysLeftInMonth != null &&
      daysLeftInMonth > 0 &&
      status !== "over"
    ) {
      action = `Keep discretionary spend near ${formatInr(dailySafeSpend)}/day for the rest of the month.`;
    } else if (status === "safe" && movers[0] && movers[0].delta < -500) {
      action = `Nice — ${movers[0].label} is down ${formatInr(movers[0].delta)}. Keep that streak.`;
    } else if (status === "safe") {
      action =
        "Stay on plan: log big spends the day they happen so this pulse stays accurate.";
    } else if (status === "over" && current.remaining < 0) {
      action = `Pause non-mandatory and habit expenses until you’ve closed the ${formatInr(-current.remaining)} gap.`;
    }
  }

  const statusLabel =
    status === "safe"
      ? "Safe"
      : status === "tight"
        ? "Tight"
        : status === "over"
          ? "Over"
          : "Add data";

  let headline = "Log income and a few expenses to unlock your month pulse.";
  if (status === "safe") {
    headline = isCurrentCalendarMonth
      ? "This month is still recoverable — you’re on track."
      : "This month stayed within plan.";
  } else if (status === "tight") {
    headline = isCurrentCalendarMonth
      ? "This month is recoverable — one fix will help."
      : "This month ran tight against your caps.";
  } else if (status === "over") {
    headline = isCurrentCalendarMonth
      ? "Over plan — cut now to limit the damage."
      : "This month finished over plan.";
  }

  return {
    status,
    statusLabel,
    headline,
    reasons: reasons.slice(0, 2),
    action,
    current,
    previous,
    spentDelta,
    spentDeltaPct,
    movers,
    bucketHealth,
    dailySafeSpend,
    daysLeftInMonth,
    projectedMonthSpend,
    isCurrentCalendarMonth,
    hasSpendData,
  };
}
