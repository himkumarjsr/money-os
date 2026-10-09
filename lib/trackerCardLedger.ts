/**
 * Card money over time: card EMI instalments, how much of each bill payment
 * was already counted as card spends, and what is kept aside for card bills.
 *
 * Card spends count (in their bucket and in purple SPENT / LEFT) the day they
 * are made. A bill payment then only settles them, so it counts nowhere —
 * except the part above every card spend still unpaid at that point
 * (interest, fees, a balance from before tracking), which is new money out
 * and is added as a `card_extra` Loans row.
 */

import {
  CARD_EMI_SUBCATEGORY,
  CARD_EXTRA_SUBCATEGORY,
  CARD_OVERDUE_SUBCATEGORY,
  VIRTUAL_TXN_PREFIX,
  cardBillAmount,
  displayExpenseDescription,
  isCardEmiPurchase,
  isCreditCardBillPayment,
  parseCardEmiPlan,
  parsePayBillLabel,
  type CreditCardOverdue,
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
 * a bill payment first settles that (no new money out), and anything above it
 * is `excess`. Same-day spends are settled before the payment.
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
  /** Month rows + this month's EMI rows + `card_extra` rows. */
  rows: CardLedgerTxn[];
  /** Generated EMI rows (any month in the history window, up to month end). */
  emiRows: CardLedgerTxn[];
  /** Card spends not yet paid at month end — money to keep for card bills. */
  keptAside: number;
};

/**
 * Rows to count for one month, with card EMIs and bill-payment extras added.
 *
 * `priorRows` are earlier months already loaded (the more, the better a bill
 * payment can be matched to the spends it settles). `emiSources` are EMI
 * purchases from any month, so long EMIs keep showing after the purchase
 * month leaves the history window. A payment for spends from before
 * `historyStart` counts as older balance.
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

  const raw = dedupeById([...prior, ...opts.monthRows]).filter((r) => {
    const d = rowDate(r);
    return d >= historyStart! && d <= monthEnd;
  });
  const emiRows = cardEmiRowsInRange(
    [...(opts.emiSources ?? []), ...prior, ...opts.monthRows],
    historyStart,
    monthEnd,
  );
  const ledger = runCardLedger([...raw, ...emiRows], monthEnd);

  const emiInMonth = emiRows.filter(
    (r) => r.date >= monthStart && r.date <= monthEnd,
  );
  const extraRows: CardLedgerTxn[] = [];
  for (const p of opts.monthRows) {
    if (!isCreditCardBillPayment(p)) continue;
    const excess = ledger.excessById.get(p.id) ?? 0;
    if (excess < 1) continue;
    const card =
      parsePayBillLabel(p.description) ||
      displayExpenseDescription(p.description) ||
      "credit card";
    extraRows.push({
      id: `${VIRTUAL_TXN_PREFIX}card-extra:${p.id}`,
      date: rowDate(p),
      amount: excess,
      bucket: "loans",
      category: CARD_EXTRA_SUBCATEGORY,
      subcategory: CARD_EXTRA_SUBCATEGORY,
      // Same rail as the payment, so it counts as cash out.
      payment_method: p.payment_method,
      description: `Above tracked card spends · ${card}`,
    });
  }

  return {
    rows: [...opts.monthRows, ...emiInMonth, ...extraRows],
    emiRows,
    keptAside: Math.max(0, Math.round(ledger.owed)),
  };
}

/**
 * Loans rows for statements left unpaid after their due date. Display only:
 * the spends already counted when made, so these never touch SPENT / LEFT.
 */
export function cardOverdueRows(
  overdue: CreditCardOverdue[],
  dateIso: string,
): CardLedgerTxn[] {
  return overdue.map((o) => ({
    id: `${VIRTUAL_TXN_PREFIX}card-overdue:${o.cardId}`,
    date: dateIso,
    amount: o.remaining,
    bucket: "loans",
    category: CARD_OVERDUE_SUBCATEGORY,
    subcategory: CARD_OVERDUE_SUBCATEGORY,
    payment_method: null,
    description: `Unpaid card bill · ${o.label}`,
  }));
}

/** First day (ISO) of the month `back` months before (year, monthIndex). */
export function monthStartIso(
  year: number,
  monthIndex: number,
  back = 0,
): string {
  return isoDate(year, monthIndex - back, 1);
}
