/**
 * Money Map: where the money goes by NATURE (Needs, Wants, Habits, …) across
 * several months, so nobody has to open each month in the Tracker.
 *
 * Every number comes from the same helpers as the monthly Tracker:
 *  - `buildCardMonthRows` adds card EMI instalments and sets how much of each
 *    card bill payment counts (`applyCardBillCoverage`).
 *  - `sumTrackerTotals` / `trackerTotalAmount` give the signed bucket total
 *    (refunds negative, card purchases in their own bucket in the month made).
 *  - Month income follows the Tracker page: planned income from the previous
 *    month, else logged income, else the profile salary.
 *
 * Pure: no React, no network. Web and mobile share this file verbatim.
 */

import {
  TRACKER_CATEGORIES,
  findSubcategory,
  normalizeTrackerBucket,
  sumTrackerTotals,
  trackerTotalAmount,
  type BucketType,
} from "@/lib/tracker-categories";
import { formatIndian } from "@/lib/formatters";
import {
  buildCardMonthRows,
  type CardLedgerTxn,
} from "@/lib/trackerCardLedger";
import { isCreditCardBillPayment } from "@/lib/trackerCreditCards";
import {
  planMonthIncomeFromPrior,
  sumLoggedIncome,
} from "@/lib/trackerMonthIncome";

export type NatureKey =
  | "needs"
  | "wants"
  | "habits"
  | "security"
  | "loans"
  | "investment"
  | "card";

/** Rows in display order. `card` is informational (see `NatureRow.inTotal`). */
export const NATURE_ORDER: readonly NatureKey[] = [
  "needs",
  "wants",
  "habits",
  "security",
  "loans",
  "investment",
  "card",
];

/** Short names used in the table and the plain-English lines. */
export const NATURE_LABELS: Record<NatureKey, string> = {
  needs: "Needs",
  wants: "Wants",
  habits: "Habits",
  security: "Insurance",
  loans: "Loans",
  investment: "Investment",
  card: "Credit card",
};

/** Investment going up is good news; for every other row up is the worry. */
const GOOD_WHEN_UP: Record<NatureKey, boolean> = {
  needs: false,
  wants: false,
  habits: false,
  security: false,
  loans: false,
  investment: true,
  card: false,
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Rules, in one place so UI copy and tests quote the same numbers. */
export const NATURE_RULES = {
  /** Months shown. */
  monthCount: 6,
  /** A change smaller than this share of last month is "flat". */
  flatPct: 5,
  /** …and smaller than this many rupees is also "flat". */
  flatMinRupees: 100,
  /** Biggest mover must move at least this many rupees… */
  moverMinRupees: 500,
  /** …and at least this share of last month (or start from zero). */
  moverMinPct: 10,
  /** Insights shown at most. */
  maxInsights: 3,
  /** Subcategories listed per nature when a row is expanded. */
  topSubcategories: 5,
} as const;

export type NatureTxn = CardLedgerTxn;

export type NatureMonth = {
  year: number;
  monthIndex: number;
  /** "2026-09" */
  key: string;
  /** "September" */
  name: string;
  /** "Sep" */
  short: string;
  /** Has at least one non-income transaction. */
  hasData: boolean;
  /** The current calendar month, not over yet. */
  partial: boolean;
  income: number;
};

export type NatureTrend = "up" | "down" | "flat";

export type NatureSubRow = {
  id: string;
  label: string;
  amounts: number[];
};

export type NatureRow = {
  key: NatureKey;
  label: string;
  /** One amount per month (0 for months with no data; see `NatureMonth.hasData`). */
  amounts: number[];
  /** Share of that month's income in %, 1 decimal; null with no income. */
  shares: Array<number | null>;
  /** Change vs the month before, in %, per month; null when not computable. */
  changePct: Array<number | null>;
  /** Latest compared month vs the one before it. */
  trend: NatureTrend;
  /** Rupee change for `trend`. */
  delta: number;
  /** Percent change for `trend`; null when the earlier month was 0 or missing. */
  deltaPct: number | null;
  goodWhenUp: boolean;
  /** False for the Credit card row: it overlaps Loans and other natures. */
  inTotal: boolean;
  subcategories: NatureSubRow[];
};

export type NatureMover = {
  key: NatureKey;
  label: string;
  delta: number;
  pct: number | null;
  direction: "up" | "down";
};

export type NaturePossibleSaving = {
  /** Rupees a month in `basisMonth` above the guide (Wants + Habits). */
  monthly: number;
  yearly: number;
  basisMonth: string;
  parts: Array<{
    key: "wants" | "habits";
    amount: number;
    capPct: number;
    capAmount: number | null;
  }>;
};

export type NatureReport = {
  months: NatureMonth[];
  rows: NatureRow[];
  /** Sum of the rows with `inTotal`, per month. */
  totals: number[];
  /** Index (into `months`) of the month trends are measured at. */
  latestIndex: number;
  /** Index of the month it is compared to; null when none. */
  prevIndex: number | null;
  biggestMover: NatureMover | null;
  insights: string[];
  possibleSaving: NaturePossibleSaving | null;
  suggestedAction: string | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${pad2(monthIndex + 1)}`;
}

function rowMonthKey(t: { date?: string | null }): string {
  return String(t.date || "").slice(0, 7);
}

/** First day (ISO) of the earliest month shown, for fetching. */
export function natureWindowStart(
  endYear: number,
  endMonthIndex: number,
  monthCount: number = NATURE_RULES.monthCount,
  extraBack = 1,
): string {
  const d = new Date(endYear, endMonthIndex - (monthCount - 1) - extraBack, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
}

/** Last day (ISO) of the end month, for fetching. */
export function natureWindowEnd(endYear: number, endMonthIndex: number) {
  const d = new Date(endYear, endMonthIndex + 1, 0);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatRupees(n: number): string {
  return `₹${formatIndian(Math.round(Math.abs(n)))}`;
}

/** Trend of `cur` against `prev` using the flat thresholds. */
export function natureTrend(
  cur: number,
  prev: number,
): { trend: NatureTrend; delta: number; pct: number | null } {
  const delta = round2(cur - prev);
  const pct = prev > 0 ? round1((delta / prev) * 100) : null;
  const small = Math.max(
    NATURE_RULES.flatMinRupees,
    (Math.abs(prev) * NATURE_RULES.flatPct) / 100,
  );
  if (Math.abs(delta) < small) return { trend: "flat", delta, pct };
  return { trend: delta > 0 ? "up" : "down", delta, pct };
}

export type BuildNatureReportInput = {
  /** Every loaded row (any months), incl. income rows. */
  rows: NatureTxn[];
  /** Card purchases on EMI from further back (their instalments run on). */
  emiSources?: NatureTxn[];
  /** Month the report ends at (default: this month). */
  endYear?: number;
  endMonthIndex?: number;
  /** Fallback monthly salary from the profile (like the Tracker page). */
  profileSalary?: number;
  /** Guide caps in whole % per bucket; default `TRACKER_CATEGORIES[].cap`. */
  caps?: Partial<Record<"wants" | "habits", number>>;
  /** For "month not over yet"; default now. */
  now?: Date;
  monthCount?: number;
};

/**
 * Build the cross-month report, or `null` when fewer than 2 months have data
 * (the UI then hides the card).
 */
export function buildNatureReport(
  input: BuildNatureReportInput,
): NatureReport | null {
  const now = input.now ?? new Date();
  const endYear = input.endYear ?? now.getFullYear();
  const endMonthIndex = input.endMonthIndex ?? now.getMonth();
  const monthCount = input.monthCount ?? NATURE_RULES.monthCount;

  const allRows = input.rows.map(normalizeTrackerBucket);
  const emiSources = (input.emiSources ?? []).map(normalizeTrackerBucket);
  const byMonth = new Map<string, NatureTxn[]>();
  for (const r of allRows) {
    const k = rowMonthKey(r);
    if (!k) continue;
    const list = byMonth.get(k) ?? [];
    list.push(r);
    byMonth.set(k, list);
  }

  // Calendar window, oldest first.
  const window: Array<{ year: number; monthIndex: number }> = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(endYear, endMonthIndex - i, 1);
    window.push({ year: d.getFullYear(), monthIndex: d.getMonth() });
  }

  const hasData = (y: number, m: number) =>
    (byMonth.get(monthKey(y, m)) ?? []).some((r) => r.bucket !== "income");

  const firstWithData = window.findIndex((w) => hasData(w.year, w.monthIndex));
  if (firstWithData < 0) return null;
  const shown = window.slice(firstWithData);
  if (shown.filter((w) => hasData(w.year, w.monthIndex)).length < 2) {
    return null;
  }

  const historyStart = natureWindowStart(endYear, endMonthIndex, monthCount, 1);
  const lastDayOfEnd = new Date(endYear, endMonthIndex + 1, 0).getDate();
  const endIsCurrent =
    now.getFullYear() === endYear &&
    now.getMonth() === endMonthIndex &&
    now.getDate() < lastDayOfEnd;

  // Per month: counted rows, bucket totals, card-bill payments, income.
  const counted: NatureTxn[][] = [];
  const months: NatureMonth[] = [];
  const bucketTotals: Array<Record<string, number>> = [];
  const cardPaid: number[] = [];
  const bucketsWithRows: BucketType[] = [
    "needs",
    "wants",
    "habits",
    "security",
    "loans",
    "investment",
  ];

  shown.forEach((w, i) => {
    const key = monthKey(w.year, w.monthIndex);
    const monthRows = byMonth.get(key) ?? [];
    const prior = allRows.filter((r) => rowMonthKey(r) < key);
    const built = buildCardMonthRows({
      year: w.year,
      monthIndex: w.monthIndex,
      monthRows,
      priorRows: prior,
      emiSources,
      historyStart,
    });
    counted.push(built.rows);
    const data = hasData(w.year, w.monthIndex);

    const totals: Record<string, number> = {};
    for (const b of bucketsWithRows)
      totals[b] = sumTrackerTotals(built.rows, b);
    bucketTotals.push(totals);

    cardPaid.push(
      round2(
        monthRows.reduce(
          (s, t) =>
            isCreditCardBillPayment(t) && Number(t.amount) > 0
              ? s + Number(t.amount)
              : s,
          0,
        ),
      ),
    );

    // Income exactly as the Tracker page: plan, else logged, else profile.
    let income = 0;
    if (data) {
      const prevKey = monthKey(
        new Date(w.year, w.monthIndex - 1, 1).getFullYear(),
        new Date(w.year, w.monthIndex - 1, 1).getMonth(),
      );
      const prevRows = counted[i - 1] ?? byMonth.get(prevKey) ?? [];
      const plan = planMonthIncomeFromPrior({
        previousTxns: prevRows,
        currentTxns: monthRows,
        profileSalary: input.profileSalary ?? 0,
      });
      income =
        plan.displayTotal > 0
          ? plan.displayTotal
          : sumLoggedIncome(monthRows) || (input.profileSalary ?? 0);
    }

    months.push({
      year: w.year,
      monthIndex: w.monthIndex,
      key,
      name: MONTH_NAMES[w.monthIndex],
      short: MONTH_NAMES[w.monthIndex].slice(0, 3),
      hasData: data,
      partial:
        endIsCurrent && w.year === endYear && w.monthIndex === endMonthIndex,
      income: round2(income),
    });
  });

  const n = months.length;
  const amountOf = (k: NatureKey, i: number): number =>
    k === "card" ? cardPaid[i] : (bucketTotals[i][k] ?? 0);

  // Trends are read at the last finished month with data (a month in progress
  // would always look like a fall).
  const dataIdx = months
    .map((m, i) => (m.hasData ? i : -1))
    .filter((i) => i >= 0);
  const finished = dataIdx.filter((i) => !months[i].partial);
  const latestIndex = (finished.length ? finished : dataIdx).slice(-1)[0];
  const prevIndex =
    latestIndex > 0 && months[latestIndex - 1].hasData ? latestIndex - 1 : null;

  const rows: NatureRow[] = NATURE_ORDER.map((key) => {
    const amounts = months.map((m, i) =>
      m.hasData ? round2(amountOf(key, i)) : 0,
    );
    const shares = months.map((m, i) =>
      m.hasData && m.income > 0 ? round1((amounts[i] / m.income) * 100) : null,
    );
    const changePct = months.map((m, i) => {
      if (i === 0 || !m.hasData || !months[i - 1].hasData) return null;
      const prev = amounts[i - 1];
      return prev > 0 ? round1(((amounts[i] - prev) / prev) * 100) : null;
    });
    const t =
      prevIndex == null
        ? { trend: "flat" as NatureTrend, delta: 0, pct: null }
        : natureTrend(amounts[latestIndex], amounts[prevIndex]);

    // Top subcategories across the window.
    let subcategories: NatureSubRow[] = [];
    if (key !== "card") {
      const subs = new Map<string, number[]>();
      counted.forEach((rowsOfMonth, i) => {
        for (const r of rowsOfMonth) {
          if (r.bucket !== key) continue;
          const amt = trackerTotalAmount(r);
          if (amt === 0) continue;
          const id = r.subcategory || r.category || "others";
          const arr = subs.get(id) ?? new Array<number>(n).fill(0);
          arr[i] = round2(arr[i] + amt);
          subs.set(id, arr);
        }
      });
      subcategories = Array.from(subs.entries())
        .map(([id, arr]) => ({
          id,
          label: findSubcategory(key as BucketType, id)?.label ?? id,
          amounts: arr,
        }))
        .sort(
          (a, b) =>
            b.amounts.reduce((s, x) => s + x, 0) -
            a.amounts.reduce((s, x) => s + x, 0),
        )
        .slice(0, NATURE_RULES.topSubcategories);
    }

    return {
      key,
      label: NATURE_LABELS[key],
      amounts,
      shares,
      changePct,
      trend: t.trend,
      delta: t.delta,
      deltaPct: t.pct,
      goodWhenUp: GOOD_WHEN_UP[key],
      inTotal: key !== "card",
      subcategories,
    };
  });

  const totals = months.map((_, i) =>
    round2(rows.filter((r) => r.inTotal).reduce((s, r) => s + r.amounts[i], 0)),
  );

  const rowOf = (k: NatureKey) => rows.find((r) => r.key === k)!;

  // Biggest mover: largest rupee change among the counted natures.
  let biggestMover: NatureMover | null = null;
  if (prevIndex != null) {
    for (const r of rows) {
      if (!r.inTotal) continue;
      const abs = Math.abs(r.delta);
      if (abs < NATURE_RULES.moverMinRupees) continue;
      if (r.deltaPct != null && Math.abs(r.deltaPct) < NATURE_RULES.moverMinPct)
        continue;
      if (!biggestMover || abs > Math.abs(biggestMover.delta)) {
        biggestMover = {
          key: r.key,
          label: r.label,
          delta: r.delta,
          pct: r.deltaPct,
          direction: r.delta > 0 ? "up" : "down",
        };
      }
    }
  }

  const latest = months[latestIndex];
  const prevMonth = prevIndex != null ? months[prevIndex] : null;

  // Possible saving: Wants + Habits above their guide caps in the latest month.
  const capFor = (k: "wants" | "habits") =>
    input.caps?.[k] ?? (TRACKER_CATEGORIES[k].cap as number);
  const parts: NaturePossibleSaving["parts"] = [];
  for (const k of ["wants", "habits"] as const) {
    const amount = rowOf(k).amounts[latestIndex];
    const capPct = capFor(k);
    const capAmount = latest.income > 0 ? (latest.income * capPct) / 100 : null;
    // No income known: only a zero-cap row (Habits) has a known limit.
    const over =
      capAmount != null
        ? Math.max(0, amount - capAmount)
        : capPct === 0
          ? Math.max(0, amount)
          : 0;
    if (over > 0) {
      parts.push({
        key: k,
        amount: round2(over),
        capPct,
        capAmount: capAmount == null ? null : round2(capAmount),
      });
    }
  }
  const monthlySaving = round2(parts.reduce((s, p) => s + p.amount, 0));
  const possibleSaving: NaturePossibleSaving | null =
    monthlySaving > 0
      ? {
          monthly: monthlySaving,
          yearly: round2(monthlySaving * 12),
          basisMonth: latest.name,
          parts,
        }
      : null;

  // Insights, in priority order, at most three.
  const insights: string[] = [];
  if (biggestMover && prevMonth) {
    const verb = biggestMover.direction === "up" ? "rose" : "fell";
    insights.push(
      biggestMover.pct != null
        ? `${biggestMover.label} ${verb} ${Math.round(Math.abs(biggestMover.pct))}% since ${prevMonth.name}`
        : `${biggestMover.label} came back in ${latest.name}: ${formatRupees(biggestMover.delta)} more than ${prevMonth.name}`,
    );
  }
  if (possibleSaving) {
    const top = [...possibleSaving.parts].sort(
      (a, b) => b.amount - a.amount,
    )[0];
    const label = NATURE_LABELS[top.key];
    const share = rowOf(top.key).shares[latestIndex];
    insights.push(
      top.capPct === 0
        ? `${label} cost ${formatRupees(rowOf(top.key).amounts[latestIndex])} in ${latest.name}`
        : share != null
          ? `${label} were ${Math.round(share)}% of your income in ${latest.name}, above the ${top.capPct}% guide`
          : `${label} were above the ${top.capPct}% guide in ${latest.name}`,
    );
  }
  // Total spending up three finished months in a row.
  if (prevIndex != null && latestIndex >= 2) {
    const a = totals[latestIndex - 2];
    const b = totals[latestIndex - 1];
    const c = totals[latestIndex];
    if (
      months[latestIndex - 2].hasData &&
      months[latestIndex - 1].hasData &&
      a > 0 &&
      b > a &&
      c > b
    ) {
      insights.push(
        `Your total spending has risen for 3 months in a row, to ${formatRupees(c)} in ${latest.name}`,
      );
    }
  }
  const inv = rowOf("investment");
  if (
    prevIndex != null &&
    inv.trend === "down" &&
    biggestMover?.key !== "investment" &&
    Math.abs(inv.delta) >= NATURE_RULES.moverMinRupees
  ) {
    insights.push(
      `Investment fell ${formatRupees(inv.delta)} since ${prevMonth!.name}`,
    );
  }
  const habits = rowOf("habits");
  const habitsTotal = habits.amounts.reduce((s, x) => s + x, 0);
  if (
    habitsTotal > 0 &&
    !possibleSaving?.parts.some((p) => p.key === "habits")
  ) {
    insights.push(
      `Habits cost ${formatRupees(habitsTotal)} over these ${months.filter((m) => m.hasData).length} months`,
    );
  }

  // One suggested action: the larger of the two over-cap parts.
  let suggestedAction: string | null = null;
  if (possibleSaving) {
    const top = [...possibleSaving.parts].sort(
      (a, b) => b.amount - a.amount,
    )[0];
    suggestedAction =
      top.key === "habits"
        ? `Set a limit on Habits next month. Cutting them could free up ${formatRupees(top.amount)} a month.`
        : `Trim Wants by ${formatRupees(top.amount)} next month to get back to the ${top.capPct}% guide.`;
  } else if (
    biggestMover &&
    biggestMover.direction === "up" &&
    !GOOD_WHEN_UP[biggestMover.key]
  ) {
    suggestedAction = `Check what pushed ${biggestMover.label} up in ${latest.name}, and set a limit for next month.`;
  }

  return {
    months,
    rows,
    totals,
    latestIndex,
    prevIndex,
    biggestMover,
    insights: insights.slice(0, NATURE_RULES.maxInsights),
    possibleSaving,
    suggestedAction,
  };
}

/** Copy shared word for word by the web and the mobile Money Map. */
export const MONEY_MAP_COPY = {
  title: "Where your money goes",
  subtitle: "By nature, across your last months",
  reportButton: "Report",
  reportTitle: "Your spending report",
  close: "Close",
  moverHeading: "Biggest mover",
  insightsHeading: "What stands out",
  savingHeading: "Possible saving",
  actionHeading: "Suggested action",
  noMover: "Nothing moved much since last month.",
  trendColumn: "Trend",
  totalRow: "Total",
  cardNote: "Bill payments. Not added to the total.",
  partialNote: "so far",
  showAmounts: "Show amounts",
  hideAmounts: "Hide amounts",
  lockedHeading: "Money Map is a Pro feature",
  lockedNoMover: "See every month side by side.",
  cta: "Unlock with Pro yearly",
  ctaSoonApp: "Available soon in the app",
} as const;

/** "Up 18%", "Down 5%", "New", "Flat", or "No data" for the trend cell. */
export function natureTrendText(
  row: Pick<NatureRow, "trend" | "deltaPct" | "delta">,
  hasPrev: boolean,
): string {
  if (!hasPrev) return "No data";
  if (row.trend === "flat") return "Flat";
  const word = row.trend === "up" ? "Up" : "Down";
  if (row.deltaPct == null) return row.trend === "up" ? "New" : word;
  return `${word} ${Math.round(Math.abs(row.deltaPct))}%`;
}

/** Arrow glyph for a trend (never the only signal: the text sits beside it). */
export function natureTrendArrow(trend: NatureTrend): string {
  return trend === "up" ? "▲" : trend === "down" ? "▼" : "→";
}

/** Good, bad or neutral reading of a trend (Investment up is good). */
export function natureTrendTone(
  row: Pick<NatureRow, "trend" | "goodWhenUp" | "inTotal">,
): "good" | "bad" | "neutral" {
  if (row.trend === "flat" || !row.inTotal) return "neutral";
  const good = row.trend === "up" ? row.goodWhenUp : !row.goodWhenUp;
  return good ? "good" : "bad";
}

/** "Wants fell ₹4,500 (45%) since September", for the report's top block. */
export function natureMoverLine(report: NatureReport): string {
  const mover = report.biggestMover;
  if (!mover || report.prevIndex == null) return MONEY_MAP_COPY.noMover;
  const verb = mover.direction === "up" ? "rose" : "fell";
  const pct = mover.pct != null ? ` (${Math.round(Math.abs(mover.pct))}%)` : "";
  return `${mover.label} ${verb} ${formatRupees(mover.delta)}${pct} since ${report.months[report.prevIndex].name}`;
}

/** Sentence for the possible saving block. */
export function natureSavingLine(saving: NaturePossibleSaving): string {
  return `Keeping Wants and Habits within their guide could save about ${formatRupees(saving.monthly)} a month (${formatRupees(saving.yearly)} a year), based on ${saving.basisMonth}.`;
}

/** Teaser line for free users: the mover's name only, never an amount. */
export function natureLockedTeaser(report: NatureReport): string {
  return report.biggestMover
    ? `Your biggest mover is ${report.biggestMover.label}.`
    : MONEY_MAP_COPY.lockedNoMover;
}

/** "₹12,345" (no sign), shared by both apps. */
export function natureRupees(n: number): string {
  return formatRupees(n);
}
