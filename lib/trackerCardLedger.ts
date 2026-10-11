/**
 * Card money over time: card EMI instalments, and how bill payments line up
 * with the card spends they settle.
 *
 * Card spends count in their bucket (Needs, Wants, …) the day they are made.
 * The bank SPENT / LEFT on the top card only moves when money leaves the
 * bank — a card bill payment the day it is paid. A card bill payment counts
 * in its bucket (Loans & Credit) only above the same card's purchases already
 * counted (see `applyCardBillCoverage`), so nothing is counted twice. Nothing
 * is generated for interest or unpaid bills: those live in the Card bills
 * section.
 */

import { trackerTotalAmount } from "@/lib/tracker-categories";
import {
  CARD_EMI_SUBCATEGORY,
  VIRTUAL_TXN_PREFIX,
  billPaymentMatchesCard,
  cardBillAmount,
  displayExpenseDescription,
  isCardEmiPurchase,
  isCreditCardBillPayment,
  isCreditCardPaymentMethod,
  parseCardEmiPlan,
  parseCreditCardPaymentMethod,
  parsePayBillLabel,
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
  /** Bill payments only: part counted in its bucket (`applyCardBillCoverage`). */
  card_bill_counted?: number | null;
  /** Bill payments only: part already counted as card purchases. */
  card_bill_already_counted?: number | null;
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

type CoverageRow = {
  id?: string | null;
  date?: string | null;
  amount: number | string;
  bucket?: string | null;
  category?: string | null;
  subcategory?: string | null;
  description?: string | null;
  payment_method?: string | null;
  card_bill_counted?: number | null;
  card_bill_already_counted?: number | null;
};

/** First day (ISO) of the calendar month before `iso`'s month. */
function prevMonthStartIso(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return isoDate(y, m - 2, 1);
}

function cardKeyOf(method: string | null | undefined): string {
  const { cardId, label } = parseCreditCardPaymentMethod(method);
  if (cardId) return `id:${cardId}`;
  return `label:${(label || "Credit card").toLowerCase()}`;
}

/**
 * Card bill payments in `rows`, with how much of each counts in its bucket.
 *
 * Rule: a bill payment counts at its amount minus the purchases on the SAME
 * card that the tracker already counts in a bucket (net of refunds; card EMI
 * instalments included), dated from the 1st of the calendar month before the
 * payment month up to the payment date — never below 0. A purchase offsets
 * only one payment (earlier payments use it up first).
 *
 * The card comes from the payment's note ("Pay bill · <card>", `[#id]`),
 * matched against the cards seen on purchases (`credit_card::<id>::<name>`).
 * A payment naming no card is matched to every card (usually just one); one
 * naming a card with no logged purchases offsets nothing.
 *
 * `contextRows` are other loaded rows (earlier months, generated card EMI
 * rows); purchases outside the loaded rows are unknown and offset nothing.
 *
 * Returns `rows` with bill payments copied and given `card_bill_counted`
 * (read by `trackerTotalAmount`) and `card_bill_already_counted`.
 */
export function applyCardBillCoverage<T extends CoverageRow>(
  rows: T[],
  contextRows: CoverageRow[] = [],
): T[] {
  if (!rows.some((r) => isCreditCardBillPayment(r))) return rows;

  const seen = new Set<string>();
  const all: CoverageRow[] = [];
  for (const r of [...contextRows, ...rows]) {
    if (r.id) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
    }
    all.push(r);
  }

  // Card purchases already counted in a bucket, per card.
  type Charge = { date: string; left: number };
  const charges = new Map<string, Charge[]>();
  const cards = new Map<string, { id: string; nickname: string }>();
  const refunds: Array<{ key: string; date: string; amount: number }> = [];
  for (const r of all) {
    if (!isCreditCardPaymentMethod(r.payment_method)) continue;
    if (isCreditCardBillPayment(r)) continue;
    const amt = trackerTotalAmount(r);
    if (amt === 0) continue;
    const key = cardKeyOf(r.payment_method);
    const date = rowDate(r);
    if (!cards.has(key)) {
      const { cardId, label } = parseCreditCardPaymentMethod(r.payment_method);
      cards.set(key, {
        id: cardId || label || "Credit card",
        nickname: label || "Credit card",
      });
    }
    if (amt < 0) {
      refunds.push({ key, date, amount: -amt });
      continue;
    }
    const list = charges.get(key) ?? [];
    list.push({ date, left: amt });
    charges.set(key, list);
  }
  for (const list of charges.values()) {
    list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }
  // A refund lowers the latest purchase on that card up to its date.
  for (const f of refunds) {
    let rest = f.amount;
    const list = charges.get(f.key) ?? [];
    for (let i = list.length - 1; i >= 0 && rest > 0; i--) {
      if (list[i].date > f.date && f.date) continue;
      const take = Math.min(rest, list[i].left);
      list[i].left = round2(list[i].left - take);
      rest = round2(rest - take);
    }
  }

  const cardKeysFor = (p: CoverageRow): string[] => {
    const matched = Array.from(cards.entries())
      .filter(([, card]) => billPaymentMatchesCard(p, card))
      .map(([key]) => key);
    if (matched.length > 0) return matched;
    const namesCard =
      /\[#[^\]]+\]/.test(p.description || "") ||
      !!parsePayBillLabel(p.description);
    return namesCard ? [] : Array.from(cards.keys());
  };

  const coverage = new Map<CoverageRow, number>();
  const payments = all
    .filter((r) => isCreditCardBillPayment(r))
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const da = rowDate(a.r);
      const db = rowDate(b.r);
      if (da !== db) return da < db ? -1 : 1;
      return a.i - b.i;
    });
  for (const { r } of payments) {
    const amt = Number(r.amount);
    const date = rowDate(r);
    if (
      !Number.isFinite(amt) ||
      amt <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      coverage.set(r, 0);
      continue;
    }
    const from = prevMonthStartIso(date);
    const inWindow = cardKeysFor(r)
      .flatMap((key) => charges.get(key) ?? [])
      .filter((c) => c.left > 0 && c.date >= from && c.date <= date)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    let rest = amt;
    for (const c of inWindow) {
      if (rest <= 0) break;
      const take = Math.min(rest, c.left);
      c.left = round2(c.left - take);
      rest = round2(rest - take);
    }
    coverage.set(r, round2(amt - rest));
  }

  return rows.map((r) => {
    if (!isCreditCardBillPayment(r)) return r;
    const amt = Number(r.amount);
    const already = coverage.get(r) ?? 0;
    return {
      ...r,
      card_bill_already_counted: already,
      card_bill_counted: Number.isFinite(amt)
        ? round2(Math.max(0, amt - already))
        : 0,
    };
  });
}

/**
 * Note for a card bill payment row explaining the part already counted as
 * card purchases, or null when the full payment counts.
 */
export function cardBillCoverageNote(
  txn: CoverageRow,
): { alreadyCounted: number; fullyCounted: boolean } | null {
  if (!isCreditCardBillPayment(txn)) return null;
  const already = Number(txn.card_bill_already_counted);
  if (!Number.isFinite(already) || already <= 0) return null;
  const counted = Number(txn.card_bill_counted);
  return {
    alreadyCounted: already,
    fullyCounted: !Number.isFinite(counted) || counted <= 0,
  };
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
    rows: applyCardBillCoverage(
      [...opts.monthRows, ...emiInMonth],
      [...prior, ...emiRows],
    ),
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
