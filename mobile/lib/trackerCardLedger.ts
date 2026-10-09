/**
 * Card money over time: card EMI instalments, and how bill payments line up
 * with the card spends they settle.
 *
 * Card spends count in their bucket (Needs, Wants, …) the day they are made.
 * The bank SPENT / LEFT on the top card only moves when money leaves the
 * bank — a card bill payment the day it is paid. Card bill payments never
 * count in Loans, and nothing is generated for interest or unpaid bills:
 * those live in the Card bills section.
 */

import {
  CARD_EMI_SUBCATEGORY,
  VIRTUAL_TXN_PREFIX,
  cardBillAmount,
  displayExpenseDescription,
  isCardEmiPurchase,
  isCreditCardBillPayment,
  parseCardEmiPlan,
} from "@/lib/trackerCreditCards";

export type CardLedgerTxn = {
  id: string;
  date: string;
  amount: number;
  category: string;
  subcategory: string | null;
  description: string | null;
  bucket: string;
  payment_method: string | null;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDate(year: number, monthIndex: number, day: number): string {
  const d = new Date(year, monthIndex, day);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function monthEndIso(year: number, monthIndex: number): string {
  return isoDate(year, monthIndex + 1, 0);
}

/** Same day `k` months later, clamped to that month's length. */
function addMonthsIso(iso: string, k: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const target = new Date(y, m - 1 + k, 1);
  const dim = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  return isoDate(target.getFullYear(), target.getMonth(), Math.min(d, dim));
}

function rowDate(t: { date?: string | null }): string {
  return String(t.date || "").slice(0, 10);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    if (r.id && seen.has(r.id)) continue;
    if (r.id) seen.add(r.id);
    out.push(r);
  }
  return out;
}

/**
 * Monthly EMI rows (Loans → Credit card EMI, on the same card) for one
 * purchase converted to EMI. The first falls in the purchase month, the last
 * `months − 1` months later. A processing fee is one extra row in month one.
 */
export function cardEmiRows(purchase: CardLedgerTxn): CardLedgerTxn[] {
  if (!isCardEmiPurchase(purchase)) return [];
  const plan = parseCardEmiPlan(purchase.description);
  const start = rowDate(purchase);
  if (!plan || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return [];
  const label =
    displayExpenseDescription(purchase.description) || "Card purchase";
  const base = {
    bucket: "loans",
    category: CARD_EMI_SUBCATEGORY,
    subcategory: CARD_EMI_SUBCATEGORY,
    payment_method: purchase.payment_method,
  };
  const rows: CardLedgerTxn[] = [];
  for (let k = 0; k < plan.months; k++) {
    rows.push({
      ...base,
      id: `${VIRTUAL_TXN_PREFIX}emi:${purchase.id}:${k + 1}`,
      date: addMonthsIso(start, k),
      amount: plan.monthly,
      description: `EMI ${k + 1}/${plan.months} · ${label}`,
    });
  }
  if (plan.fee > 0) {
    rows.push({
      ...base,
      id: `${VIRTUAL_TXN_PREFIX}emi-fee:${purchase.id}`,
      date: start,
      amount: plan.fee,
      description: `EMI processing fee · ${label}`,
    });
  }
  return rows;
}

/** EMI rows from every known EMI purchase, dated within [fromIso, toIso]. */
export function cardEmiRowsInRange(
  purchases: CardLedgerTxn[],
  fromIso: string,
  toIso: string,
): CardLedgerTxn[] {
  return dedupeById(purchases)
    .flatMap(cardEmiRows)
    .filter((r) => r.date >= fromIso && r.date <= toIso)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export type CardLedgerResult = {
  /** Bill payment id → part of it not covered by card spends counted earlier. */
  excessById: Map<string, number>;
  /** Card spends (net of refunds) not yet paid off, after the last row. */
  owed: number;
};

/**
 * Walk card rows in date order, all cards pooled. Spends add to what is owed;
 * a bill payment first settles that, and anything above it is `excess`
 * (interest, fees, a balance from before tracking). Same-day spends are
 * settled before the payment. Informational only — nothing here is counted
 * in bucket totals or the bank SPENT.
 */
export function runCardLedger(
  rows: CardLedgerTxn[],
  untilIso?: string,
): CardLedgerResult {
  const relevant = rows
    .filter((r) => !untilIso || rowDate(r) <= untilIso)
    .filter((r) => isCreditCardBillPayment(r) || cardBillAmount(r) !== 0)
    .map((r, i) => ({ r, i, pay: isCreditCardBillPayment(r) ? 1 : 0 }))
    .sort((a, b) => {
      const da = rowDate(a.r);
      const db = rowDate(b.r);
      if (da !== db) return da < db ? -1 : 1;
      return a.pay - b.pay || a.i - b.i;
    });

  const excessById = new Map<string, number>();
  let owed = 0;
  for (const { r, pay } of relevant) {
    if (pay) {
      const amt = Number(r.amount);
      if (!Number.isFinite(amt) || amt <= 0) continue;
      const covered = Math.min(amt, Math.max(0, owed));
      owed = round2(owed - covered);
      excessById.set(r.id, round2(amt - covered));
    } else {
      owed = round2(owed + cardBillAmount(r));
    }
  }
  return { excessById, owed };
}

export type CardMonthRows = {
  /** Month rows + this month's card EMI rows. */
  rows: CardLedgerTxn[];
  /** Generated EMI rows (any month in the history window, up to month end). */
  emiRows: CardLedgerTxn[];
};

/**
 * Rows to count for one month, with card EMI instalments added.
 *
 * `priorRows` are earlier months already loaded. `emiSources` are EMI
 * purchases from any month, so long EMIs keep showing after the purchase
 * month leaves the history window.
 */
export function buildCardMonthRows(opts: {
  year: number;
  monthIndex: number;
  monthRows: CardLedgerTxn[];
  priorRows?: CardLedgerTxn[];
  emiSources?: CardLedgerTxn[];
  /** First day (ISO) of the loaded history. Defaults to the oldest row's month. */
  historyStart?: string;
}): CardMonthRows {
  const monthStart = isoDate(opts.year, opts.monthIndex, 1);
  const monthEnd = monthEndIso(opts.year, opts.monthIndex);
  const prior = opts.priorRows ?? [];
  let historyStart = opts.historyStart;
  if (!historyStart) {
    const oldest = prior
      .map(rowDate)
      .filter(Boolean)
      .reduce((min, d) => (d < min ? d : min), monthStart);
    historyStart = `${oldest.slice(0, 7)}-01`;
  }

  const emiRows = cardEmiRowsInRange(
    [...(opts.emiSources ?? []), ...prior, ...opts.monthRows],
    historyStart,
    monthEnd,
  );
  const emiInMonth = emiRows.filter(
    (r) => r.date >= monthStart && r.date <= monthEnd,
  );

  return {
    rows: [...opts.monthRows, ...emiInMonth],
    emiRows,
  };
}

/** First day (ISO) of the month `back` months before (year, monthIndex). */
export function monthStartIso(
  year: number,
  monthIndex: number,
  back = 0,
): string {
  return isoDate(year, monthIndex - back, 1);
}
