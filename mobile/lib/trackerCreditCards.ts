/**
 * Tracker credit-card helpers: payment-method encoding, saved cards (local + DB),
 * cash-vs-card spend, and statement-window bill suggestions.
 */

import { getSupabase } from "@/lib/supabase";
import { syncKv } from "@/lib/syncKv";

export const TRACKER_CONSENT_VERSION = "v2";
export const TRACKER_CONSENT_STORAGE_KEY = "finkoin_tracker_consent";

export type SavedCreditCard = {
  id: string;
  nickname: string;
  /** Optional last 4 digits only — never full PAN. */
  last4?: string;
  /** Statement generation day of month (1–31). */
  billingDay?: number;
  /** Payment due day of month (1–31). */
  dueDay?: number;
  createdAt: string;
};

export type CreditCardBillLine = {
  cardId: string;
  label: string;
  amount: number;
  billingDay?: number;
  dueDay?: number;
  /** Inclusive statement window used for the amount. */
  statementStart?: string;
  statementEnd?: string;
  /** Next due date ISO (yyyy-mm-dd) when known. */
  dueDate?: string;
};

export type CreditCardBillStatus = CreditCardBillLine & {
  /** CC purchase charges in available history (carry-forward base). */
  charged: number;
  /** Cash bill payments (loans → credit_card) matched to this card. */
  paid: number;
  /** max(0, charged − paid) — what still needs to leave the bank account. */
  remaining: number;
  status: "due" | "paid" | "clear";
  overdue: boolean;
};

/** Clean note when logging a CC bill payment (no internal [#id] tokens). */
export function creditCardBillPaymentDescription(
  label: string,
  _cardId?: string,
): string {
  const name = label.trim() || "Credit card";
  // Strip any leftover [#…] if label was polluted.
  const clean = name.replace(/\s*\[#[^\]]*\]\s*/g, "").trim() || "Credit card";
  return `Pay bill · ${clean}`;
}

/** Hide internal [#cardId] tokens from notes shown in the UI. */
export function displayExpenseDescription(
  description: string | null | undefined,
): string {
  if (!description) return "";
  return description.replace(/\s*\[#[^\]]*\]/g, "").trim();
}

/** Label after "Pay bill · …" if present. */
export function parsePayBillLabel(
  description: string | null | undefined,
): string | null {
  if (!description) return null;
  const cleaned = displayExpenseDescription(description);
  const m = cleaned.match(/^pay bill\s*[·\-–—:]\s*(.+)$/i);
  if (!m?.[1]) return null;
  return m[1].trim() || null;
}

const STORAGE_PREFIX = "finkoin_credit_cards_";
const BILL_DISMISS_PREFIX = "finkoin_cc_bill_dismissed_";
const DUE_HIDDEN_PREFIX = "finkoin_cc_due_hidden_";

/** Typical gap from statement day to payment due (not the ~45-day interest-free period). */
export const DEFAULT_DUE_OFFSET_DAYS = 20;

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function dueHiddenKey(userId: string): string {
  return `${DUE_HIDDEN_PREFIX}${userId}`;
}

/** Card ids the user removed from Credit card dues (expenses stay in history). */
export function loadHiddenCreditCardDueIds(userId: string): string[] {
  if (!userId) return [];
  try {
    const raw = syncKv.getItem(dueHiddenKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => String(x || "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function hideCreditCardDueLine(userId: string, cardId: string): void {
  if (!userId || !cardId.trim()) return;
  try {
    const id = cardId.trim();
    const next = Array.from(
      new Set([...loadHiddenCreditCardDueIds(userId), id]),
    );
    syncKv.setItem(dueHiddenKey(userId), JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function isCreditCardDueLineHidden(
  userId: string,
  cardId: string,
): boolean {
  const id = cardId.trim().toLowerCase();
  if (!id) return false;
  return loadHiddenCreditCardDueIds(userId).some((x) => x.toLowerCase() === id);
}

function clampDay(day: number | undefined | null): number | undefined {
  if (day == null || !Number.isFinite(day)) return undefined;
  const n = Math.round(Number(day));
  if (n < 1 || n > 31) return undefined;
  return n;
}

export function normalizeLast4(
  raw: string | undefined | null,
): string | undefined {
  if (!raw) return undefined;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length < 4) return undefined;
  return digits.slice(-4);
}

export function formatCreditCardLabel(card: {
  nickname?: string | null;
  last4?: string | null;
}): string {
  const nick = (card.nickname || "").trim();
  const last4 = normalizeLast4(card.last4);
  if (nick && last4) return `${nick} ****${last4}`;
  if (nick) return nick;
  if (last4) return `****${last4}`;
  return "Credit card";
}

/** Encode as credit_card::{id}::{label} for expense_transactions.payment_method. */
export function encodeCreditCardPaymentMethod(card: {
  id: string;
  nickname?: string | null;
  last4?: string | null;
}): string {
  const label = formatCreditCardLabel(card).replace(/\|/g, "/");
  return `credit_card::${card.id}::${label}`;
}

export function isCreditCardPaymentMethod(
  method: string | null | undefined,
): boolean {
  if (!method) return false;
  const m = method.trim().toLowerCase();
  return (
    m === "card" ||
    m === "credit_card" ||
    m === "creditcard" ||
    m.startsWith("credit_card::")
  );
}

export function parseCreditCardPaymentMethod(
  method: string | null | undefined,
): {
  cardId: string | null;
  label: string | null;
} {
  if (!method) return { cardId: null, label: null };
  const raw = method.trim();
  if (!isCreditCardPaymentMethod(raw)) return { cardId: null, label: null };
  if (!raw.toLowerCase().startsWith("credit_card::")) {
    return { cardId: null, label: "Credit card" };
  }
  const parts = raw.split("::");
  const cardId = parts[1]?.trim() || null;
  const label = parts.slice(2).join("::").trim() || null;
  if (!cardId && !label) return { cardId: null, label: null };
  return {
    cardId,
    label: label || (cardId ? null : "Credit card"),
  };
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  upi: "UPI",
  cash: "Cash",
  netbanking: "Net banking",
  wallet: "Wallet",
  cheque: "Cheque",
  card: "Credit card",
  credit_card: "Credit card",
  creditcard: "Credit card",
};

export function displayPaymentMethod(
  method: string | null | undefined,
): string {
  if (!method) return "—";
  if (isCreditCardPaymentMethod(method)) {
    const { label } = parseCreditCardPaymentMethod(method);
    return label || "Credit card";
  }
  const key = method.trim().toLowerCase();
  return PAYMENT_METHOD_LABELS[key] || method;
}

/** Payment rails that leave the bank / cash pocket (not revolving on a card). */
export function isCashRailPaymentMethod(
  method: string | null | undefined,
): boolean {
  if (!method || !String(method).trim()) return true;
  if (isCreditCardPaymentMethod(method)) return false;
  return true;
}

/** CC purchase charge (not a cash bill payment under loans → credit_card). */
export function isCreditCardCharge(txn: {
  bucket?: string | null;
  subcategory?: string | null;
  category?: string | null;
  payment_method?: string | null;
}): boolean {
  if (txn.bucket === "income") return false;
  const sub = txn.subcategory || txn.category;
  // Loans → Credit card *payment* is a bill settle, never a purchase charge.
  if (txn.bucket === "loans" && sub === "credit_card") return false;
  return isCreditCardPaymentMethod(txn.payment_method);
}

/**
 * Purple-card cash out (SPENT / LEFT).
 *
 * INCLUDE:
 * - needs / wants / habits / loan EMIs / investments / loan repayment
 * - Loans & Credit → Credit card payment when paid via UPI / cash / netbanking /
 *   wallet (cash left the salary pocket)
 *
 * EXCLUDE:
 * - income
 * - any expense where Paid via = credit card (debt, not this month’s cash)
 */
export function countsTowardCashSpend(txn: {
  bucket?: string | null;
  subcategory?: string | null;
  category?: string | null;
  payment_method?: string | null;
}): boolean {
  if (txn.bucket === "income") return false;

  const sub = txn.subcategory || txn.category;
  // Explicit: Loans & Credit → Credit card payment (bill pay).
  if (txn.bucket === "loans" && sub === "credit_card") {
    return isCashRailPaymentMethod(txn.payment_method);
  }

  // Any other row paid with a credit card stays out of LEFT.
  if (isCreditCardPaymentMethod(txn.payment_method)) return false;
  return true;
}

export function sumCashSpend(
  transactions: Array<{
    amount: number | string;
    bucket?: string | null;
    subcategory?: string | null;
    category?: string | null;
    payment_method?: string | null;
  }>,
): number {
  return transactions.reduce((sum, t) => {
    if (!countsTowardCashSpend(t)) return sum;
    const n = Number(t.amount);
    return Number.isFinite(n) && n > 0 ? sum + n : sum;
  }, 0);
}

export function sumOnCardsSpend(
  transactions: Array<{
    amount: number | string;
    bucket?: string | null;
    subcategory?: string | null;
    category?: string | null;
    payment_method?: string | null;
  }>,
): number {
  return transactions.reduce((sum, t) => {
    if (!isCreditCardCharge(t)) return sum;
    const n = Number(t.amount);
    return Number.isFinite(n) && n > 0 ? sum + n : sum;
  }, 0);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function clampToMonthDay(year: number, monthIndex: number, day: number): Date {
  const dim = daysInMonth(year, monthIndex);
  return new Date(year, monthIndex, Math.min(Math.max(1, day), dim));
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Suggest due day of month from billing day + default offset (wraps within month length). */
export function suggestDueDayFromBilling(
  billingDay: number,
  offsetDays = DEFAULT_DUE_OFFSET_DAYS,
): number {
  const b = clampDay(billingDay);
  if (!b) return Math.min(offsetDays + 1, 28);
  // Approximate: add offset using a mid-month reference so Feb edge cases are rare.
  const ref = new Date(2026, 0, b);
  ref.setDate(ref.getDate() + offsetDays);
  return ref.getDate();
}

/**
 * Last closed statement window for a billing day.
 * End = most recent billing day on or before `asOf`.
 * Start = day after the previous billing day.
 */
export function getLastStatementWindow(
  billingDay: number,
  asOf: Date = new Date(),
): { start: Date; end: Date } | null {
  const day = clampDay(billingDay);
  if (!day) return null;

  let endYear = asOf.getFullYear();
  let endMonth = asOf.getMonth();
  let end = clampToMonthDay(endYear, endMonth, day);
  if (end > asOf) {
    endMonth -= 1;
    if (endMonth < 0) {
      endMonth = 11;
      endYear -= 1;
    }
    end = clampToMonthDay(endYear, endMonth, day);
  }

  let startYear = endYear;
  let startMonth = endMonth - 1;
  if (startMonth < 0) {
    startMonth = 11;
    startYear -= 1;
  }
  const prevBilling = clampToMonthDay(startYear, startMonth, day);
  const start = new Date(prevBilling);
  start.setDate(start.getDate() + 1);

  return { start, end };
}

/** Next due date on/after `asOf` for a due day of month. */
export function getNextDueDate(
  dueDay: number,
  asOf: Date = new Date(),
): Date | null {
  const day = clampDay(dueDay);
  if (!day) return null;
  let y = asOf.getFullYear();
  let m = asOf.getMonth();
  let due = clampToMonthDay(y, m, day);
  const asOfDay = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  if (due < asOfDay) {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    due = clampToMonthDay(y, m, day);
  }
  return due;
}

/** Most recent due date on or before `asOf` (for overdue / carry-forward). */
export function getMostRecentDueDate(
  dueDay: number,
  asOf: Date = new Date(),
): Date | null {
  const day = clampDay(dueDay);
  if (!day) return null;
  let y = asOf.getFullYear();
  let m = asOf.getMonth();
  const asOfDay = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  let due = clampToMonthDay(y, m, day);
  if (due > asOfDay) {
    m -= 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    due = clampToMonthDay(y, m, day);
  }
  return due;
}

function txnDateIso(txn: {
  date?: string | null;
  created_at?: string | null;
}): string | null {
  const raw = txn.date || txn.created_at;
  if (!raw) return null;
  return String(raw).slice(0, 10);
}

function inInclusiveRange(iso: string, start: Date, end: Date): boolean {
  const s = toIsoDate(start);
  const e = toIsoDate(end);
  return iso >= s && iso <= e;
}

type BillTxn = {
  amount: number | string;
  bucket?: string | null;
  subcategory?: string | null;
  category?: string | null;
  payment_method?: string | null;
  date?: string | null;
  created_at?: string | null;
};

/**
 * Sum CC charges per card. When `window` is set, only include txns in that
 * inclusive date range. Bill payments (loans/credit_card) are ignored.
 */
export function summarizeCreditCardBills(
  transactions: BillTxn[],
  opts?: { window?: { start: Date; end: Date } | null },
): CreditCardBillLine[] {
  const map = new Map<string, CreditCardBillLine>();
  const win = opts?.window ?? null;

  for (const t of transactions) {
    if (!isCreditCardCharge(t)) continue;
    const n = Number(t.amount);
    if (!Number.isFinite(n) || n <= 0) continue;

    if (win) {
      const iso = txnDateIso(t);
      if (!iso || !inInclusiveRange(iso, win.start, win.end)) continue;
    }

    const { cardId, label } = parseCreditCardPaymentMethod(t.payment_method);
    const key = cardId || label || "Credit card";
    const display = label || "Credit card";
    const prev = map.get(key);
    if (prev) {
      prev.amount += n;
    } else {
      map.set(key, {
        cardId: key,
        label: display,
        amount: n,
        statementStart: win ? toIsoDate(win.start) : undefined,
        statementEnd: win ? toIsoDate(win.end) : undefined,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

/**
 * Build pay suggestions using each card's billing/due days when available.
 * Falls back to previous-calendar-month totals for cards without a billing day.
 */
export function buildCreditCardPaySuggestions(opts: {
  cards: SavedCreditCard[];
  /** Prefer a wider pool (current + previous month) so statement windows work. */
  transactions: BillTxn[];
  asOf?: Date;
}): CreditCardBillLine[] {
  const asOf = opts.asOf ?? new Date();
  const byId = new Map(opts.cards.map((c) => [c.id, c]));
  const lines: CreditCardBillLine[] = [];
  const seen = new Set<string>();

  for (const card of opts.cards) {
    const billingDay = clampDay(card.billingDay);
    const dueDay =
      clampDay(card.dueDay) ??
      (billingDay ? suggestDueDayFromBilling(billingDay) : undefined);
    const window = billingDay ? getLastStatementWindow(billingDay, asOf) : null;

    const bills = summarizeCreditCardBills(opts.transactions, {
      window: window ?? undefined,
    }).filter((b) => b.cardId === card.id);

    // Also match by label if id missing on older txns
    const byLabel = summarizeCreditCardBills(opts.transactions, {
      window: window ?? undefined,
    }).filter(
      (b) =>
        b.cardId !== card.id &&
        b.label.toLowerCase() === formatCreditCardLabel(card).toLowerCase(),
    );

    const amount =
      (bills[0]?.amount || 0) + byLabel.reduce((s, b) => s + b.amount, 0);

    if (amount <= 0) continue;

    const dueDate = dueDay ? getNextDueDate(dueDay, asOf) : null;
    lines.push({
      cardId: card.id,
      label: formatCreditCardLabel(card),
      amount,
      billingDay: billingDay,
      dueDay,
      statementStart: window ? toIsoDate(window.start) : undefined,
      statementEnd: window ? toIsoDate(window.end) : undefined,
      dueDate: dueDate ? toIsoDate(dueDate) : undefined,
    });
    seen.add(card.id);
  }

  // Orphan spend on unknown / generic cards — previous calendar month fallback
  const prevMonthStart = new Date(asOf.getFullYear(), asOf.getMonth() - 1, 1);
  const prevMonthEnd = new Date(asOf.getFullYear(), asOf.getMonth(), 0);
  const orphans = summarizeCreditCardBills(opts.transactions, {
    window: { start: prevMonthStart, end: prevMonthEnd },
  }).filter((b) => !byId.has(b.cardId) && !seen.has(b.cardId));

  for (const o of orphans) {
    lines.push(o);
  }

  return lines.sort((a, b) => b.amount - a.amount);
}

/** Cash leaving the account to pay a credit-card bill (not a CC purchase). */
export function isCreditCardBillPayment(txn: {
  bucket?: string | null;
  subcategory?: string | null;
  category?: string | null;
  description?: string | null;
  payment_method?: string | null;
}): boolean {
  // Paid *with* a card → purchase charge, not a cash bill payment.
  if (isCreditCardPaymentMethod(txn.payment_method)) return false;
  if (txn.bucket === "loans") {
    const sub = txn.subcategory || txn.category;
    if (sub === "credit_card") return true;
  }
  // Pay-button / manual "Pay bill · …" notes.
  if (parsePayBillLabel(txn.description)) return true;
  return false;
}

export function billPaymentMatchesCard(
  txn: {
    description?: string | null;
    payment_method?: string | null;
  },
  card: { id: string; nickname: string; last4?: string },
): boolean {
  const desc = (txn.description || "").toLowerCase();
  const id = card.id.toLowerCase();
  // Legacy [#cardId] token (older saves)
  const bracket = desc.match(/\[#([^\]]+)\]/);
  if (bracket?.[1]?.toLowerCase() === id) return true;
  if (id && id.length >= 4 && desc.includes(id)) return true;

  const payLabel = (parsePayBillLabel(txn.description) || "").toLowerCase();
  const nick = card.nickname.trim().toLowerCase();
  const label = formatCreditCardLabel(card).toLowerCase();
  if (payLabel) {
    if (payLabel === label || payLabel === nick || payLabel === id) return true;
    if (nick.length >= 2 && payLabel.includes(nick)) return true;
    if (label.length >= 2 && payLabel.includes(label)) return true;
  }
  if (nick.length >= 2 && desc.includes(nick)) return true;
  if (label.length >= 2 && desc.includes(label)) return true;
  const parsed = parseCreditCardPaymentMethod(txn.payment_method);
  if (parsed.cardId && parsed.cardId === card.id) return true;
  return false;
}

function billPaymentMatchesOrphan(
  txn: { description?: string | null; payment_method?: string | null },
  orphan: { cardId: string; label: string },
  soleOrphanFallback: boolean,
): boolean {
  const desc = (txn.description || "").toLowerCase();
  const id = orphan.cardId.toLowerCase();
  const label = orphan.label.toLowerCase();
  const bracket = desc.match(/\[#([^\]]+)\]/);
  if (bracket?.[1]?.toLowerCase() === id) return true;
  const payLabel = (parsePayBillLabel(txn.description) || "").toLowerCase();
  if (payLabel && (payLabel === label || payLabel === id)) return true;
  if (label.length >= 2 && desc.includes(label)) return true;
  if (soleOrphanFallback) return true;
  return false;
}

function txnDateInRange(
  txn: { date?: string | null },
  start: Date,
  end: Date,
): boolean {
  if (!txn.date) return false;
  const d = new Date(`${txn.date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}

function sumChargesForCard(
  transactions: BillTxn[],
  card: SavedCreditCard,
  soleCardFallback: boolean,
  chargeWindow?: { start: Date; end: Date } | null,
): number {
  const cardLabel = formatCreditCardLabel(card).toLowerCase();
  return transactions.reduce((sum, t) => {
    if (!isCreditCardCharge(t)) return sum;
    if (
      chargeWindow &&
      !txnDateInRange(t, chargeWindow.start, chargeWindow.end)
    ) {
      return sum;
    }
    const { cardId: tid, label } = parseCreditCardPaymentMethod(
      t.payment_method,
    );
    const matched =
      tid === card.id ||
      (!!label && label.toLowerCase() === cardLabel) ||
      (soleCardFallback && !tid);
    if (!matched) return sum;
    const n = Number(t.amount);
    return Number.isFinite(n) && n > 0 ? sum + n : sum;
  }, 0);
}

function sumPaymentsForCard(
  transactions: Array<BillTxn & { description?: string | null }>,
  card: SavedCreditCard,
  soleCardFallback: boolean,
): number {
  const ourLabels = [
    formatCreditCardLabel(card).toLowerCase(),
    card.nickname.trim().toLowerCase(),
  ].filter((s) => s.length >= 2);

  return transactions.reduce((sum, t) => {
    if (!isCreditCardBillPayment(t)) return sum;
    const matched = billPaymentMatchesCard(t, card);
    const hasOtherCardToken = /\[#[^\]]+\]/.test(t.description || "");
    const payLabel = (parsePayBillLabel(t.description) || "").toLowerCase();
    const labeledElsewhere =
      !!payLabel &&
      !ourLabels.some(
        (l) => payLabel === l || payLabel.includes(l) || l.includes(payLabel),
      );
    const attribute =
      matched || (soleCardFallback && !hasOtherCardToken && !labeledElsewhere);
    if (!attribute) return sum;
    const n = Number(t.amount);
    return Number.isFinite(n) && n > 0 ? sum + n : sum;
  }, 0);
}

function sumPaymentsForOrphan(
  transactions: Array<BillTxn & { description?: string | null }>,
  orphan: { cardId: string; label: string },
  soleOrphanFallback: boolean,
): number {
  return transactions.reduce((sum, t) => {
    if (!isCreditCardBillPayment(t)) return sum;
    if (!billPaymentMatchesOrphan(t, orphan, soleOrphanFallback)) return sum;
    const n = Number(t.amount);
    return Number.isFinite(n) && n > 0 ? sum + n : sum;
  }, 0);
}

/**
 * Per-card due status with unpaid carry-forward:
 * remaining = CC charges − matched bill payments in the txn pool.
 * Paid bills show status "paid"; unpaid stay "due" across months until cleared.
 *
 * When `previousMonthChargesOnly` is true (default for tracker dues), only the
 * previous calendar month's card purchases count as charges — so a bill paid
 * last month does not keep appearing as due this month.
 */
export function buildCreditCardBillStatuses(opts: {
  cards: SavedCreditCard[];
  transactions: Array<BillTxn & { description?: string | null }>;
  asOf?: Date;
  /** When true: dues reflect last calendar month's card spends only. */
  previousMonthChargesOnly?: boolean;
}): CreditCardBillStatus[] {
  const asOf = opts.asOf ?? new Date();
  const asOfDay = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  const soleCard = opts.cards.length === 1;
  const prevMonthOnly = opts.previousMonthChargesOnly === true;
  const chargeWindow = prevMonthOnly
    ? {
        start: new Date(asOf.getFullYear(), asOf.getMonth() - 1, 1),
        end: new Date(asOf.getFullYear(), asOf.getMonth(), 0, 23, 59, 59, 999),
      }
    : null;
  const suggestions = buildCreditCardPaySuggestions({
    cards: opts.cards,
    transactions: opts.transactions,
    asOf,
  });
  const suggestionById = new Map(suggestions.map((s) => [s.cardId, s]));

  const statuses: CreditCardBillStatus[] = opts.cards.map((card) => {
    const charged = sumChargesForCard(
      opts.transactions,
      card,
      soleCard,
      chargeWindow,
    );
    const paid = sumPaymentsForCard(opts.transactions, card, soleCard);
    const remaining = Math.max(0, Math.round((charged - paid) * 100) / 100);
    const sug = suggestionById.get(card.id);
    const billingDay = clampDay(card.billingDay);
    const dueDay =
      clampDay(card.dueDay) ??
      (billingDay ? suggestDueDayFromBilling(billingDay) : undefined);
    const nextDue = dueDay ? getNextDueDate(dueDay, asOf) : null;
    const lastDue = dueDay ? getMostRecentDueDate(dueDay, asOf) : null;

    let status: CreditCardBillStatus["status"] = "clear";
    if (remaining > 0) status = "due";
    else if (charged > 0 || paid > 0) status = "paid";

    return {
      cardId: card.id,
      label: formatCreditCardLabel(card),
      amount:
        remaining > 0 ? remaining : charged > 0 ? charged : sug?.amount || 0,
      charged,
      paid,
      remaining,
      status,
      overdue:
        remaining > 0 && !!lastDue && lastDue.getTime() < asOfDay.getTime(),
      billingDay,
      dueDay,
      statementStart: sug?.statementStart,
      statementEnd: sug?.statementEnd,
      // Show next upcoming due when paid/clear; when overdue keep last due visible
      dueDate: (() => {
        if (remaining > 0 && lastDue && lastDue.getTime() < asOfDay.getTime()) {
          return toIsoDate(lastDue);
        }
        return nextDue ? toIsoDate(nextDue) : sug?.dueDate;
      })(),
    };
  });

  // Orphan spend (no saved card id) — still track paid vs charged so Pay can tick.
  const orphanSuggestions = suggestions.filter(
    (sug) => !opts.cards.some((c) => c.id === sug.cardId),
  );
  const soleOrphan = orphanSuggestions.length === 1 && opts.cards.length === 0;
  for (const sug of orphanSuggestions) {
    const orphan = { cardId: sug.cardId, label: sug.label };
    const paid = sumPaymentsForOrphan(
      opts.transactions,
      orphan,
      soleOrphan || (opts.cards.length === 0 && orphanSuggestions.length === 1),
    );
    const charged = Math.max(sug.amount, paid);
    const remaining = Math.max(0, Math.round((sug.amount - paid) * 100) / 100);
    let status: CreditCardBillStatus["status"] = "clear";
    if (remaining > 0) status = "due";
    else if (sug.amount > 0 || paid > 0) status = "paid";
    statuses.push({
      ...sug,
      charged: sug.amount,
      paid,
      remaining,
      amount: remaining > 0 ? remaining : charged,
      status,
      overdue: false,
    });
  }

  return statuses.sort((a, b) => {
    const rank = (s: CreditCardBillStatus) =>
      s.status === "due" ? 0 : s.status === "paid" ? 1 : 2;
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return b.remaining - a.remaining || b.charged - a.charged;
  });
}

function parseStoredCard(raw: unknown): SavedCreditCard | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.nickname !== "string") return null;
  const nick = o.nickname.trim();
  if (!nick) return null;
  return {
    id: o.id,
    nickname: nick,
    last4: normalizeLast4(typeof o.last4 === "string" ? o.last4 : undefined),
    billingDay: clampDay(
      typeof o.billingDay === "number"
        ? o.billingDay
        : typeof o.billing_day === "number"
          ? o.billing_day
          : undefined,
    ),
    dueDay: clampDay(
      typeof o.dueDay === "number"
        ? o.dueDay
        : typeof o.due_day === "number"
          ? o.due_day
          : undefined,
    ),
    createdAt:
      typeof o.createdAt === "string"
        ? o.createdAt
        : typeof o.created_at === "string"
          ? o.created_at
          : new Date().toISOString(),
  };
}

export function loadSavedCreditCards(userId: string): SavedCreditCard[] {
  if (!userId) return [];
  try {
    const raw = syncKv.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(parseStoredCard)
      .filter((c): c is SavedCreditCard => c != null);
  } catch {
    return [];
  }
}

export function saveCreditCards(
  userId: string,
  cards: SavedCreditCard[],
): void {
  if (!userId) return;
  try {
    syncKv.setItem(storageKey(userId), JSON.stringify(cards));
  } catch {
    /* quota / private mode */
  }
}

export function upsertSavedCreditCard(
  userId: string,
  input: {
    id?: string;
    nickname: string;
    last4?: string;
    billingDay?: number;
    dueDay?: number;
  },
): SavedCreditCard {
  const nickname = input.nickname.trim();
  const last4 = normalizeLast4(input.last4);
  const billingDay = clampDay(input.billingDay);
  const dueDay =
    clampDay(input.dueDay) ??
    (billingDay ? suggestDueDayFromBilling(billingDay) : undefined);

  const existing = loadSavedCreditCards(userId);
  if (input.id) {
    const idx = existing.findIndex((c) => c.id === input.id);
    if (idx >= 0) {
      const updated: SavedCreditCard = {
        ...existing[idx],
        nickname,
        last4,
        billingDay,
        dueDay,
      };
      existing[idx] = updated;
      saveCreditCards(userId, existing);
      void persistCreditCardToDb(userId, updated);
      return updated;
    }
  }

  const nickKey = nickname.toLowerCase();
  const dupIdx = existing.findIndex(
    (c) => c.nickname.toLowerCase() === nickKey,
  );
  if (dupIdx >= 0) {
    const updated: SavedCreditCard = {
      ...existing[dupIdx],
      nickname,
      last4: last4 ?? existing[dupIdx].last4,
      billingDay: billingDay ?? existing[dupIdx].billingDay,
      dueDay: dueDay ?? existing[dupIdx].dueDay,
    };
    existing[dupIdx] = updated;
    saveCreditCards(userId, existing);
    void persistCreditCardToDb(userId, updated);
    return updated;
  }

  const created: SavedCreditCard = {
    id: input.id || crypto.randomUUID(),
    nickname,
    last4,
    billingDay,
    dueDay,
    createdAt: new Date().toISOString(),
  };
  existing.push(created);
  saveCreditCards(userId, existing);
  void persistCreditCardToDb(userId, created);
  return created;
}

export function deleteSavedCreditCard(userId: string, cardId: string): boolean {
  const existing = loadSavedCreditCards(userId);
  const removed = existing.find((c) => c.id === cardId);
  const next = existing.filter((c) => c.id !== cardId);
  if (next.length === existing.length) return false;
  saveCreditCards(userId, next);
  void deleteCreditCardFromDb(userId, cardId);
  if (removed) void deactivateCreditCardObligation(userId, removed.nickname);
  // Keep charges from resurfacing as an orphan due line under the same id.
  hideCreditCardDueLine(userId, cardId);
  return true;
}

function rowToCard(row: Record<string, unknown>): SavedCreditCard | null {
  return parseStoredCard({
    id: row.id,
    nickname: row.nickname,
    last4: row.last4,
    billing_day: row.billing_day,
    due_day: row.due_day,
    created_at: row.created_at,
  });
}

/** Load from DB, merge with local cache, prefer DB fields, write cache. */
export async function loadCreditCardsMerged(
  userId: string,
): Promise<SavedCreditCard[]> {
  if (!userId) return [];
  const local = loadSavedCreditCards(userId);
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("user_credit_cards")
      .select("id, nickname, last4, billing_day, due_day, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error || !data) {
      // Migrate local → DB if table exists later
      if (local.length > 0) {
        await Promise.all(local.map((c) => persistCreditCardToDb(userId, c)));
      }
      return local;
    }

    const fromDb = data
      .map((r) => rowToCard(r as Record<string, unknown>))
      .filter((c): c is SavedCreditCard => c != null);

    const byId = new Map<string, SavedCreditCard>();
    for (const c of fromDb) byId.set(c.id, c);

    // Local-only cards (not yet migrated)
    for (const c of local) {
      if (!byId.has(c.id)) {
        byId.set(c.id, c);
        void persistCreditCardToDb(userId, c);
      }
    }

    const merged = Array.from(byId.values());
    saveCreditCards(userId, merged);
    return merged;
  } catch {
    return local;
  }
}

export async function persistCreditCardToDb(
  userId: string,
  card: SavedCreditCard,
): Promise<void> {
  if (!userId) return;
  try {
    const supabase = getSupabase();
    await supabase.from("user_credit_cards").upsert(
      {
        id: card.id,
        user_id: userId,
        nickname: card.nickname,
        last4: card.last4 ?? null,
        billing_day: card.billingDay ?? null,
        due_day: card.dueDay ?? null,
        created_at: card.createdAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  } catch {
    /* offline / table missing */
  }
}

export async function deleteCreditCardFromDb(
  userId: string,
  cardId: string,
): Promise<void> {
  if (!userId || !cardId) return;
  try {
    const supabase = getSupabase();
    await supabase
      .from("user_credit_cards")
      .delete()
      .eq("user_id", userId)
      .eq("id", cardId);
  } catch {
    /* ignore */
  }
}

/** Title used for financial_obligations rows synced from tracker cards. */
export function creditCardObligationTitle(nickname: string): string {
  return `CC · ${nickname.trim() || "Credit card"}`;
}

/**
 * Credit card bills live only in the Credit card dues UI — do not upsert
 * obligations. Kept as a no-op so older call sites stay safe.
 */
export async function syncCreditCardBillObligation(
  _userId: string,
  _card: { nickname: string; dueDay?: number | null },
  _amount = 0,
): Promise<void> {
  return;
}

export async function deactivateCreditCardObligation(
  userId: string,
  nickname: string,
): Promise<void> {
  if (!userId || !nickname.trim()) return;
  try {
    const supabase = getSupabase();
    await supabase
      .from("financial_obligations")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("title", creditCardObligationTitle(nickname))
      .eq("category", "credit_card");
  } catch {
    /* ignore */
  }
}

/** Soft-remove every credit_card obligation (dues UI owns CC bills). */
export async function deactivateAllCreditCardObligations(
  userId: string,
): Promise<number> {
  if (!userId) return 0;
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("financial_obligations")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("category", "credit_card")
      .eq("is_active", true)
      .select("id");
    if (error) return 0;
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

function billDismissKey(year: number, monthName: string): string {
  return `${BILL_DISMISS_PREFIX}${year}_${monthName}`;
}

export function isCreditCardBillDismissed(
  year: number,
  monthName: string,
): boolean {
  try {
    return syncKv.getItem(billDismissKey(year, monthName)) === "1";
  } catch {
    return false;
  }
}

export function dismissCreditCardBillReminder(
  year: number,
  monthName: string,
): void {
  try {
    syncKv.setItem(billDismissKey(year, monthName), "1");
  } catch {
    /* ignore */
  }
}

function lsGet(key: string): string | null {
  try {
    return syncKv.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  try {
    syncKv.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function hasTrackerConsentLocal(): boolean {
  return lsGet(TRACKER_CONSENT_STORAGE_KEY) === TRACKER_CONSENT_VERSION;
}

export function setTrackerConsentLocal(): void {
  lsSet(TRACKER_CONSENT_STORAGE_KEY, TRACKER_CONSENT_VERSION);
}
