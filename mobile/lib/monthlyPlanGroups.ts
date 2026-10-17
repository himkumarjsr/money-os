import type { PriorityPlan } from "@/lib/priorityEngine";

type MonthRow = NonNullable<PriorityPlan["monthlyPlan"]>[number];

export type MonthGroup = MonthRow & {
  /** "1", or "4–12" when consecutive months are the same. */
  label: string;
  fromMonth: number;
  toMonth: number;
};

const AMOUNT_KEYS = [
  "emergency",
  "medical",
  "termYearly",
  "sip",
  "extraDebt",
  "remaining",
] as const;

function sameMonth(a: MonthRow, b: MonthRow): boolean {
  return (
    a.note === b.note &&
    AMOUNT_KEYS.every(
      (k) => Math.round(Number(a[k] || 0)) === Math.round(Number(b[k] || 0)),
    )
  );
}

/** Folds runs of identical months into one row, e.g. months 4–12. */
export function groupMonthlyPlan(rows: MonthRow[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.toMonth === row.month - 1 && sameMonth(last, row)) {
      last.toMonth = row.month;
      last.label = `${last.fromMonth}–${row.month}`;
      continue;
    }
    groups.push({
      ...row,
      label: String(row.month),
      fromMonth: row.month,
      toMonth: row.month,
    });
  }
  return groups;
}
