/**
 * Tracker credit-card helpers: payment-method encoding, saved cards (local + DB),
 * cash-vs-card spend, and statement-window bill suggestions.
 */

import { getSupabase } from "@/lib/supabase";
import { isPaidFromSavings } from "@/lib/trackerSavingsPayment";

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
  /** Optional credit limit in rupees (for usage warnings). */
  creditLimit?: number;
  /**
   * Statement close dates (yyyy-mm-dd) the user marked as paid when no logged
   * payment could be matched. Kept in the local card cache only.
   */
  paidStatements?: string[];
  createdAt: string;
};

/** Refund / cashback logged against a card, in the bucket of the original spend. */
export const CARD_REFUND_SUBCATEGORY = "card_refund";
/** Monthly instalment of a card purchase converted to EMI (generated, Loans). */
export const CARD_EMI_SUBCATEGORY = "card_emi";
/**
 * Legacy generated rows (bill paid above tracked spends / unpaid bill). No
 * longer generated; ignored by every total if an old cache still has them.
 */
export const CARD_EXTRA_SUBCATEGORY = "card_extra";
export const CARD_OVERDUE_SUBCATEGORY = "card_overdue";
/** Id prefix for rows the tracker generates (never stored, no edit / delete). */
export const VIRTUAL_TXN_PREFIX = "virtual:";

export function isVirtualTxnId(id: string | null | undefined): boolean {
  return !!id && id.startsWith(VIRTUAL_TXN_PREFIX);
}

/** Card EMI terms saved on the original purchase row. */
export type CardEmiPlan = {
  months: number;
  /** Monthly EMI in rupees. */
  monthly: number;
  /** One-time processing fee, charged with the first EMI. */
  fee: number;
};

const EMI_TOKEN_RE =
  /\[#emi:(\d{1,3})x(\d+(?:\.\d+)?)(?:\+(\d+(?:\.\d+)?))?\]/i;

/**
 * Card EMI terms live in the purchase note as a hidden `[#emi:6x2500+199]`
 * token (hidden by `displayExpenseDescription`), so no new columns are needed
 * and the plan is removed with the row.
 */
export function encodeCardEmiToken(plan: CardEmiPlan): string {
  const months = Math.round(plan.months);
  const monthly = Math.round(plan.monthly * 100) / 100;
  const fee = Math.round((plan.fee || 0) * 100) / 100;
  return `[#emi:${months}x${monthly}${fee > 0 ? `+${fee}` : ""}]`;
}

export function parseCardEmiPlan(
  description: string | null | undefined,
): CardEmiPlan | null {
  if (!description) return null;
  const m = description.match(EMI_TOKEN_RE);
  if (!m) return null;
  const months = Number(m[1]);
  const monthly = Number(m[2]);
  const fee = m[3] ? Number(m[3]) : 0;
  if (!(months >= 1) || !(monthly > 0)) return null;
  return { months, monthly, fee: Number.isFinite(fee) ? fee : 0 };
}

/** Card refund / cashback row (lowers its bucket and the card bill). */
export function isCreditCardRefund(txn: {
  bucket?: string | null;
  subcategory?: string | null;
  category?: string | null;
  payment_method?: string | null;
}): boolean {
  if (txn.bucket === "income") return false;
  const sub = txn.subcategory || txn.category;
  return (
    sub === CARD_REFUND_SUBCATEGORY &&
    isCreditCardPaymentMethod(txn.payment_method)
  );
}

/** Card purchase converted to EMI: shown in lists, never counted at full price. */
export function isCardEmiPurchase(txn: {
  bucket?: string | null;
  subcategory?: string | null;
  category?: string | null;
  payment_method?: string | null;
  description?: string | null;
}): boolean {
  if (txn.bucket === "income") return false;
  const sub = txn.subcategory || txn.category;
  if (sub === CARD_EMI_SUBCATEGORY || sub === CARD_REFUND_SUBCATEGORY) {
    return false;
  }
  if (txn.bucket === "loans" && sub === "credit_card") return false;
  if (!isCreditCardPaymentMethod(txn.payment_method)) return false;
  return parseCardEmiPlan(txn.description) != null;
}

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

/**
 * Note for a bill payment logged with a card chosen, so it can be matched to
 * that card's bill: "Pay bill · <card>", or the user's note plus the card.
 */
export function billPaymentNoteForCard(
  note: string | null | undefined,
  card: { nickname: string; last4?: string | null },
): string {
  const label = formatCreditCardLabel(card);
  const clean = (note || "").replace(/\s*\[#[^\]]*\]/g, "").trim();
  if (
    !clean ||
    /^pay bill/i.test(clean) ||
    /^credit card( bill)?( payment)?$/i.test(clean)
  ) {
    return creditCardBillPaymentDescription(label);
  }
  const nick = card.nickname.trim().toLowerCase();
  if (nick && clean.toLowerCase().includes(nick)) return clean;
  return `${clean} · ${label}`;
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
  if (!userId || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(dueHiddenKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => String(x || "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function hideCreditCardDueLine(userId: string, cardId: string): void {
  if (!userId || !cardId.trim() || typeof window === "undefined") return;
  try {
    const id = cardId.trim();
    const next = Array.from(
      new Set([...loadHiddenCreditCardDueIds(userId), id]),
    );
    localStorage.setItem(dueHiddenKey(userId), JSON.stringify(next));
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
  rd_savings: "RD savings",
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

type CardRowLike = {
  bucket?: string | null;
  subcategory?: string | null;
  category?: string | null;
  payment_method?: string | null;
  description?: string | null;
};

/**
 * CC purchase charge that lands on the card bill at face value.
 * Not a bill payment, not a refund, and not a purchase converted to EMI (its
 * monthly instalments are the charges instead).
 */
export function isCreditCardCharge(txn: CardRowLike): boolean {
  if (txn.bucket === "income") return false;
  const sub = txn.subcategory || txn.category;
  // Loans → Credit card *payment* is a bill settle, never a purchase charge.
  if (txn.bucket === "loans" && sub === "credit_card") return false;
  if (sub === CARD_REFUND_SUBCATEGORY || sub === CARD_OVERDUE_SUBCATEGORY) {
    return false;
  }
  if (!isCreditCardPaymentMethod(txn.payment_method)) return false;
  return !isCardEmiPurchase(txn);
}

/** Signed effect on the card bill: charges add, refunds / cashback subtract. */
export function cardBillAmount(
  txn: CardRowLike & { amount: number | string },
): number {
  const n = Number(txn.amount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (isCreditCardRefund(txn)) return -n;
  return isCreditCardCharge(txn) ? n : 0;
}

/**
 * Amount for purple SPENT / LEFT: money that left the bank / savings account.
 *
 * INCLUDE:
 * - needs / wants / habits / loan EMIs / investments / loan repayment paid by
 *   UPI, cash, net banking, wallet, cheque
 * - credit card bill payments (Loans → Credit card payment, or a "Pay bill · …"
 *   note) on the day they are paid from the bank
 *
 * EXCLUDE (0):
 * - income
 * - anything paid with a credit card: purchases, card EMI instalments (paid
 *   through the card bill), purchases converted to EMI, card refunds /
 *   cashback — those move the card bill, not the bank balance
 * - premiums paid from RD savings (the monthly RD already counted)
 * - generated `card_extra` / `card_overdue` rows from older builds
 */
export function cashSpendAmount(
  txn: CardRowLike & { amount: number | string },
): number {
  if (txn.bucket === "income") return 0;
  const n = Number(txn.amount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (isPaidFromSavings(txn)) return 0;
  const sub = txn.subcategory || txn.category;
  if (sub === CARD_OVERDUE_SUBCATEGORY || sub === CARD_EXTRA_SUBCATEGORY) {
    return 0;
  }
  // Bill pay from the bank (never true for a row paid with a card).
  if (isCreditCardBillPayment(txn)) return n;
  if (isCreditCardPaymentMethod(txn.payment_method)) return 0;
  return n;
}

/** True when the row adds to purple SPENT (see `cashSpendAmount`). */
export function countsTowardCashSpend(
  txn: CardRowLike & { amount?: number | string },
): boolean {
  return cashSpendAmount({ ...txn, amount: txn.amount ?? 1 }) > 0;
}

export function sumCashSpend(
  transactions: Array<CardRowLike & { amount: number | string }>,
): number {
  const total = transactions.reduce((sum, t) => sum + cashSpendAmount(t), 0);
  return Math.round(total * 100) / 100;
}

/** Net card spend (charges − refunds) in the rows given. */
export function sumOnCardsSpend(
  transactions: Array<CardRowLike & { amount: number | string }>,
): number {
  const total = transactions.reduce((sum, t) => sum + cardBillAmount(t), 0);
  return Math.max(0, Math.round(total * 100) / 100);
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

/**
 * Statement a spend on `date` lands on: spends up to and including the billing
 * day go on that month's statement, later ones on the next.
 */
export function getStatementWindowForDate(
  billingDay: number,
  date: Date,
): { start: Date; end: Date } | null {
  const day = clampDay(billingDay);
  if (!day) return null;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let end = clampToMonthDay(d.getFullYear(), d.getMonth(), day);
  if (end < d) {
    end = clampToMonthDay(d.getFullYear(), d.getMonth() + 1, day);
  }
  const prev = clampToMonthDay(end.getFullYear(), end.getMonth() - 1, day);
  const start = new Date(prev);
  start.setDate(start.getDate() + 1);
  return { start, end };
}

/** Due date for a statement closing on `statementEnd` (first `dueDay` after it). */
export function getStatementDueDate(statementEnd: Date, dueDay: number): Date {
  const day = clampDay(dueDay) ?? DEFAULT_DUE_OFFSET_DAYS;
  let due = clampToMonthDay(
    statementEnd.getFullYear(),
    statementEnd.getMonth(),
    day,
  );
  if (due <= statementEnd) {
    due = clampToMonthDay(
      statementEnd.getFullYear(),
      statementEnd.getMonth() + 1,
      day,
    );
  }
  return due;
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function dayAfter(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
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
  description?: string | null;
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
    const n = cardBillAmount(t);
    if (n === 0) continue;

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

  return Array.from(map.values())
    .filter((b) => b.amount > 0)
    .sort((a, b) => b.amount - a.amount);
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
  if (txn.bucket === "income") return false;
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
    const n = cardBillAmount(t);
    if (n === 0) return sum;
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
    return sum + n;
  }, 0);
}

function sumPaymentsForCard(
  transactions: Array<BillTxn & { description?: string | null }>,
  card: SavedCreditCard,
  soleCardFallback: boolean,
  paymentWindow?: { start: Date; end: Date } | null,
): number {
  const ourLabels = [
    formatCreditCardLabel(card).toLowerCase(),
    card.nickname.trim().toLowerCase(),
  ].filter((s) => s.length >= 2);

  return transactions.reduce((sum, t) => {
    if (!isCreditCardBillPayment(t)) return sum;
    if (
      paymentWindow &&
      !txnDateInRange(t, paymentWindow.start, paymentWindow.end)
    ) {
      return sum;
    }
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

/** Credit-score guideline: keep card usage under this share of the limit. */
export const CREDIT_USAGE_WARN_RATIO = 0.3;

export type CreditCardUsage = {
  cardId: string;
  label: string;
  limit: number;
  /** Net spends on the open (not yet billed) statement. */
  used: number;
  ratio: number;
  statementStart: string;
  overWarn: boolean;
};

/** Open-statement spend vs credit limit, for cards with a limit saved. */
export function buildCreditCardUsage(opts: {
  cards: SavedCreditCard[];
  transactions: Array<BillTxn & { description?: string | null }>;
  asOf?: Date;
}): CreditCardUsage[] {
  const asOf = opts.asOf ?? new Date();
  const soleCard = opts.cards.length === 1;
  const out: CreditCardUsage[] = [];
  for (const card of opts.cards) {
    const limit = Number(card.creditLimit);
    if (!Number.isFinite(limit) || limit <= 0) continue;
    const billingDay = clampDay(card.billingDay);
    const last = billingDay ? getLastStatementWindow(billingDay, asOf) : null;
    const start = last
      ? dayAfter(last.end)
      : new Date(asOf.getFullYear(), asOf.getMonth(), 1);
    const used = Math.max(
      0,
      sumChargesForCard(opts.transactions, card, soleCard, {
        start,
        end: endOfDay(asOf),
      }),
    );
    const ratio = used / limit;
    out.push({
      cardId: card.id,
      label: formatCreditCardLabel(card),
      limit,
      used,
      ratio,
      statementStart: toIsoDate(start),
      overWarn: ratio > CREDIT_USAGE_WARN_RATIO,
    });
  }
  return out;
}

export type CreditCardOverdue = {
  cardId: string;
  label: string;
  statementEnd: string;
  dueDate: string;
  /** Net spends on that statement. */
  statementAmount: number;
  /** Paid (or matched to an unlinked bill payment) by the due date. */
  paidByDue: number;
  /** Still unpaid today. */
  remaining: number;
  /**
   * False when a bill payment without a card (or naming a card we can't
   * match) was logged in this bill's window: it may have paid this bill, so
   * ask the user instead of warning about interest.
   */
  clearlyUnpaid: boolean;
};

type PaymentLink =
  | { kind: "card"; cardId: string }
  /** No card named (or several match): could have paid any card's bill. */
  | { kind: "unlinked" }
  /** Names a card that isn't saved: never allocated, but makes bills unsure. */
  | { kind: "foreign" };

function cardMatchLabels(card: SavedCreditCard): string[] {
  return [
    formatCreditCardLabel(card).toLowerCase(),
    card.nickname.trim().toLowerCase(),
  ].filter((s) => s.length >= 2);
}

/** Which saved card a bill payment was for, as far as its note tells. */
function linkBillPayment(
  txn: { description?: string | null; payment_method?: string | null },
  cards: SavedCreditCard[],
): PaymentLink {
  const rawLabel = (parsePayBillLabel(txn.description) || "").toLowerCase();
  // "Pay bill · Credit card" (generic Pay button) names no card.
  const payLabel = rawLabel === "credit card" ? "" : rawLabel;
  const exact = cards.filter((c) => billPaymentMatchesCard(txn, c));
  if (exact.length === 1) return { kind: "card", cardId: exact[0].id };
  if (exact.length > 1) {
    // "ICICI" and "ICICI Amazon pay" both match "Pay bill · ICICI Amazon pay".
    const same = exact.filter((c) => cardMatchLabels(c).includes(payLabel));
    if (payLabel && same.length === 1) {
      return { kind: "card", cardId: same[0].id };
    }
    return { kind: "unlinked" };
  }
  const hasToken = /\[#(?!emi:)[^\]]+\]/i.test(txn.description || "");
  if (payLabel) {
    const near = cards.filter((c) =>
      cardMatchLabels(c).some(
        (l) => payLabel === l || payLabel.includes(l) || l.includes(payLabel),
      ),
    );
    if (near.length === 1) return { kind: "card", cardId: near[0].id };
    if (near.length > 1) return { kind: "unlinked" };
    return { kind: "foreign" };
  }
  if (hasToken) return { kind: "foreign" };
  if (cards.length === 1) return { kind: "card", cardId: cards[0].id };
  return { kind: "unlinked" };
}

type StatementCalc = {
  card: SavedCreditCard;
  start: Date;
  end: Date;
  due: Date;
  /** First day a payment counts toward this bill (day after the last due). */
  payFrom: Date;
  amount: number;
  paid: number;
  paidByDue: number;
  /** An unlinked / unmatched bill payment was logged in the window. */
  unsure: boolean;
};

type PaymentCalc = {
  iso: string;
  amount: number;
  left: number;
  link: PaymentLink;
};

function statementFor(
  card: SavedCreditCard,
  win: { start: Date; end: Date },
  dueDay: number,
  transactions: BillTxn[],
  soleCard: boolean,
): StatementCalc {
  const due = getStatementDueDate(win.end, dueDay);
  const prevEnd = new Date(
    win.start.getFullYear(),
    win.start.getMonth(),
    win.start.getDate() - 1,
  );
  // Payments after the previous bill's due date go to this bill — including
  // ones made before this statement closed.
  const afterPrevDue = dayAfter(getStatementDueDate(prevEnd, dueDay));
  const afterClose = dayAfter(win.end);
  const payFrom = afterPrevDue < afterClose ? afterPrevDue : afterClose;
  const amount =
    Math.round(
      sumChargesForCard(transactions, card, soleCard, {
        start: win.start,
        end: endOfDay(win.end),
      }) * 100,
    ) / 100;
  return {
    card,
    start: win.start,
    end: win.end,
    due,
    payFrom,
    amount,
    paid: 0,
    paidByDue: 0,
    unsure: false,
  };
}

function remainingOf(s: StatementCalc): number {
  return Math.max(0, Math.round((s.amount - s.paid) * 100) / 100);
}

function inPayWindow(
  p: PaymentCalc,
  s: StatementCalc,
  asOfIso: string,
): boolean {
  return p.iso >= toIsoDate(s.payFrom) && p.iso <= asOfIso;
}

function applyPayment(s: StatementCalc, p: PaymentCalc, take: number): void {
  if (take <= 0) return;
  s.paid = Math.round((s.paid + take) * 100) / 100;
  if (p.iso <= toIsoDate(s.due)) {
    s.paidByDue = Math.round((s.paidByDue + take) * 100) / 100;
  }
  p.left = Math.round((p.left - take) * 100) / 100;
}

/**
 * Match logged bill payments (up to `asOf`) to statements, at most one
 * statement per card.
 *
 * 1. Payments that name a card pay that card's bill.
 * 2. Payments without a card go first to a bill of (about) the same amount,
 *    then to the oldest due date first — so "Credit card payment" rows
 *    logged without choosing a card still clear the right bills.
 *
 * Returns what is left of each named payment, per card, so an early payment
 * can lower that card's open cycle.
 */
function allocateBillPayments(
  statements: StatementCalc[],
  transactions: BillTxn[],
  cards: SavedCreditCard[],
  asOf: Date,
): { leftoverByCard: Map<string, PaymentCalc[]> } {
  const asOfIso = toIsoDate(asOf);
  const payments: PaymentCalc[] = [];
  for (const t of transactions) {
    if (!isCreditCardBillPayment(t)) continue;
    const iso = txnDateIso(t);
    const n = Number(t.amount);
    if (!iso || iso > asOfIso || !Number.isFinite(n) || n <= 0) continue;
    payments.push({ iso, amount: n, left: n, link: linkBillPayment(t, cards) });
  }
  payments.sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));

  const byCard = new Map(statements.map((s) => [s.card.id, s]));
  const leftoverByCard = new Map<string, PaymentCalc[]>();
  for (const p of payments) {
    if (p.link.kind !== "card") continue;
    const cardId = p.link.cardId;
    const s = byCard.get(cardId);
    if (s && inPayWindow(p, s, asOfIso)) {
      applyPayment(s, p, Math.min(p.left, remainingOf(s)));
    }
    if (p.left >= 1) {
      const list = leftoverByCard.get(cardId) ?? [];
      list.push(p);
      leftoverByCard.set(cardId, list);
    }
  }

  const unlinked = payments.filter((p) => p.link.kind === "unlinked");
  for (const s of statements) {
    s.unsure = payments.some(
      (p) => p.link.kind !== "card" && inPayWindow(p, s, asOfIso),
    );
  }
  const open = () =>
    statements
      .filter((s) => remainingOf(s) >= 1)
      .sort((a, b) => a.due.getTime() - b.due.getTime());
  // Same amount first (one payment per bill).
  for (const p of unlinked) {
    const match = open().find(
      (s) =>
        inPayWindow(p, s, asOfIso) && Math.abs(remainingOf(s) - p.left) <= 1,
    );
    if (match) applyPayment(match, p, Math.min(p.left, remainingOf(match)));
  }
  // Then oldest due date first.
  for (const s of open()) {
    for (const p of unlinked) {
      if (p.left <= 0 || !inPayWindow(p, s, asOfIso)) continue;
      applyPayment(s, p, Math.min(p.left, remainingOf(s)));
      if (remainingOf(s) < 1) break;
    }
  }
  return { leftoverByCard };
}

function dueDayFor(card: SavedCreditCard, billingDay: number): number {
  return clampDay(card.dueDay) ?? suggestDueDayFromBilling(billingDay);
}

/** True when the user marked the statement closing on `statementEnd` paid. */
export function isCardStatementMarkedPaid(
  card: Pick<SavedCreditCard, "paidStatements">,
  statementEnd: string,
): boolean {
  return (card.paidStatements ?? []).includes(statementEnd);
}

/**
 * Latest statement whose due date has passed, when it was not paid in full by
 * then. Needs a billing day. Bill payments are matched as in
 * `allocateBillPayments`; statements the user marked paid are skipped.
 */
export function buildCreditCardOverdue(opts: {
  cards: SavedCreditCard[];
  transactions: Array<BillTxn & { description?: string | null }>;
  asOf?: Date;
}): CreditCardOverdue[] {
  const asOf = opts.asOf ?? new Date();
  const asOfDay = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  const soleCard = opts.cards.length === 1;
  const statements: StatementCalc[] = [];
  for (const card of opts.cards) {
    const billingDay = clampDay(card.billingDay);
    if (!billingDay) continue;
    const dueDay = dueDayFor(card, billingDay);
    let win = getLastStatementWindow(billingDay, asOf);
    let due = win ? getStatementDueDate(win.end, dueDay) : null;
    // The latest closed statement may not be due yet — use the one before.
    if (win && due && due >= asOfDay) {
      const before = new Date(win.start);
      before.setDate(before.getDate() - 1);
      win = getLastStatementWindow(billingDay, before);
      due = win ? getStatementDueDate(win.end, dueDay) : null;
    }
    if (!win || !due || due >= asOfDay) continue;
    statements.push(
      statementFor(card, win, dueDay, opts.transactions, soleCard),
    );
  }
  allocateBillPayments(statements, opts.transactions, opts.cards, asOf);

  const out: CreditCardOverdue[] = [];
  for (const s of statements) {
    if (s.amount <= 0) continue;
    const statementEnd = toIsoDate(s.end);
    if (isCardStatementMarkedPaid(s.card, statementEnd)) continue;
    const unpaidAtDue = Math.round((s.amount - s.paidByDue) * 100) / 100;
    const remaining = remainingOf(s);
    if (unpaidAtDue < 1 || remaining < 1) continue;
    out.push({
      cardId: s.card.id,
      label: formatCreditCardLabel(s.card),
      statementEnd,
      dueDate: toIsoDate(s.due),
      statementAmount: s.amount,
      paidByDue: s.paidByDue,
      remaining,
      clearlyUnpaid: !s.unsure,
    });
  }
  return out;
}

export type CardLastBillStatus =
  /** Logged payments cover it. */
  | "paid"
  /** The user tapped "Mark paid". */
  | "marked_paid"
  | "partial"
  | "unpaid";

export type CardLastBill = {
  statementStart: string;
  statementEnd: string;
  dueDate: string;
  /** Net charges on the statement (spends + EMIs + fees − refunds). */
  amount: number;
  paid: number;
  remaining: number;
  status: CardLastBillStatus;
  /** Due date has passed and something is still unpaid. */
  overdue: boolean;
  /**
   * A bill payment without a card (or for a card we can't match) was logged
   * in this bill's window — ask "mark as paid?" rather than warn.
   */
  unsure: boolean;
  /** Overdue with no logged payment that could cover it: interest warning. */
  clearlyUnpaid: boolean;
};

export type CardBillSummary = {
  cardId: string;
  label: string;
  billingDay?: number;
  dueDay?: number;
  hasBillingDay: boolean;
  /** Open statement (or this calendar month without a billing day). */
  cycle: {
    start: string;
    /** Statement close date; null without a billing day. */
    closesOn: string | null;
    dueDate: string | null;
    /** Net charges so far (refunds lower it; EMIs and fees included). */
    spent: number;
    /** Spent minus early payments already made on this card. */
    toPay: number;
  };
  /** Latest closed statement, only when it had charges. */
  lastBill: CardLastBill | null;
  usage: CreditCardUsage | null;
  /** This cycle still to pay plus anything unpaid on the last bill. */
  upcoming: number;
};

export type CardBillsResult = {
  cards: CardBillSummary[];
  /** Card spends this month not linked to a saved card, per label. */
  otherCards: Array<{ key: string; label: string; spent: number }>;
  /** Every card's `upcoming` plus other card spends. */
  totalUpcoming: number;
};

/**
 * Data for the Card bills section: per saved card, the open cycle, the last
 * bill and whether it was paid, credit limit usage, and the total still to
 * leave the bank for card bills.
 */
export function buildCardBills(opts: {
  cards: SavedCreditCard[];
  transactions: Array<BillTxn & { description?: string | null }>;
  asOf?: Date;
}): CardBillsResult {
  const asOf = opts.asOf ?? new Date();
  const asOfDay = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  const soleCard = opts.cards.length === 1;
  const usageById = new Map(
    buildCreditCardUsage({
      cards: opts.cards,
      transactions: opts.transactions,
      asOf,
    }).map((u) => [u.cardId, u]),
  );

  const statements: StatementCalc[] = [];
  const cycles = new Map<
    string,
    { start: Date; closesOn: Date | null; due: Date | null }
  >();
  for (const card of opts.cards) {
    const billingDay = clampDay(card.billingDay);
    if (!billingDay) {
      const dueDay = clampDay(card.dueDay);
      cycles.set(card.id, {
        start: new Date(asOf.getFullYear(), asOf.getMonth(), 1),
        closesOn: null,
        due: dueDay ? getNextDueDate(dueDay, asOf) : null,
      });
      continue;
    }
    const dueDay = dueDayFor(card, billingDay);
    const last = getLastStatementWindow(billingDay, asOf);
    if (!last) continue;
    const start = dayAfter(last.end);
    const closesOn =
      getStatementWindowForDate(billingDay, start)?.end ?? last.end;
    cycles.set(card.id, {
      start,
      closesOn,
      due: getStatementDueDate(closesOn, dueDay),
    });
    statements.push(
      statementFor(card, last, dueDay, opts.transactions, soleCard),
    );
  }
  const { leftoverByCard } = allocateBillPayments(
    statements,
    opts.transactions,
    opts.cards,
    asOf,
  );
  const stmtByCard = new Map(statements.map((s) => [s.card.id, s]));

  const summaries: CardBillSummary[] = [];
  for (const card of opts.cards) {
    const cyc = cycles.get(card.id);
    if (!cyc) continue;
    const spent = Math.max(
      0,
      Math.round(
        sumChargesForCard(opts.transactions, card, soleCard, {
          start: cyc.start,
          end: endOfDay(asOf),
        }) * 100,
      ) / 100,
    );
    const startIso = toIsoDate(cyc.start);
    const earlyPaid = (leftoverByCard.get(card.id) ?? [])
      .filter((p) => p.iso >= startIso)
      .reduce((sum, p) => sum + p.left, 0);
    const toPay = Math.max(0, Math.round((spent - earlyPaid) * 100) / 100);

    let lastBill: CardLastBill | null = null;
    const s = stmtByCard.get(card.id);
    if (s && s.amount >= 1) {
      const statementEnd = toIsoDate(s.end);
      const marked = isCardStatementMarkedPaid(card, statementEnd);
      const left = marked ? 0 : remainingOf(s);
      const remaining = left < 1 ? 0 : left;
      const status: CardLastBillStatus = marked
        ? "marked_paid"
        : remaining === 0
          ? "paid"
          : s.paid >= 1
            ? "partial"
            : "unpaid";
      const overdue = remaining > 0 && s.due < asOfDay;
      lastBill = {
        statementStart: toIsoDate(s.start),
        statementEnd,
        dueDate: toIsoDate(s.due),
        amount: s.amount,
        paid: s.paid,
        remaining,
        status,
        overdue,
        unsure: remaining > 0 && s.unsure,
        clearlyUnpaid: overdue && !s.unsure,
      };
    }

    const billingDay = clampDay(card.billingDay);
    summaries.push({
      cardId: card.id,
      label: formatCreditCardLabel(card),
      billingDay,
      dueDay:
        clampDay(card.dueDay) ??
        (billingDay ? suggestDueDayFromBilling(billingDay) : undefined),
      hasBillingDay: !!billingDay,
      cycle: {
        start: startIso,
        closesOn: cyc.closesOn ? toIsoDate(cyc.closesOn) : null,
        dueDate: cyc.due ? toIsoDate(cyc.due) : null,
        spent,
        toPay,
      },
      lastBill,
      usage: usageById.get(card.id) ?? null,
      upcoming:
        Math.round((toPay + (lastBill ? lastBill.remaining : 0)) * 100) / 100,
    });
  }

  // Card spends this month on cards that aren't saved (or no card chosen).
  const monthStart = new Date(asOf.getFullYear(), asOf.getMonth(), 1);
  const savedIds = new Set(opts.cards.map((c) => c.id));
  const savedLabels = new Set(
    opts.cards.map((c) => formatCreditCardLabel(c).toLowerCase()),
  );
  const other = new Map<
    string,
    { key: string; label: string; spent: number }
  >();
  for (const t of opts.transactions) {
    const n = cardBillAmount(t);
    if (n === 0) continue;
    if (!txnDateInRange(t, monthStart, endOfDay(asOf))) continue;
    const { cardId, label } = parseCreditCardPaymentMethod(t.payment_method);
    if (cardId && savedIds.has(cardId)) continue;
    if (label && savedLabels.has(label.toLowerCase())) continue;
    if (soleCard && !cardId) continue;
    const key = cardId || label || "Credit card";
    const prev = other.get(key);
    if (prev) prev.spent = Math.round((prev.spent + n) * 100) / 100;
    else other.set(key, { key, label: label || "Credit card", spent: n });
  }
  const otherCards = Array.from(other.values()).filter((o) => o.spent >= 1);

  const totalUpcoming =
    Math.round(
      (summaries.reduce((sum, c) => sum + c.upcoming, 0) +
        otherCards.reduce((sum, o) => sum + o.spent, 0)) *
        100,
    ) / 100;
  return { cards: summaries, otherCards, totalUpcoming };
}

function billInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function billShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** "₹X spent so far · bill on 15 Oct · due 1 Nov" for the Card bills list. */
export function cardBillCycleText(c: CardBillSummary): string {
  if (!c.hasBillingDay) return `${billInr(c.cycle.spent)} spent this month`;
  const parts = [`${billInr(c.cycle.spent)} spent so far`];
  if (c.cycle.closesOn)
    parts.push(`bill on ${billShortDate(c.cycle.closesOn)}`);
  if (c.cycle.dueDate) parts.push(`due ${billShortDate(c.cycle.dueDate)}`);
  return parts.join(" · ");
}

/** "₹Y due 1 Oct — Paid ✓" / "— ₹Z of ₹Y paid" / "— Not paid yet". */
export function cardLastBillText(c: CardBillSummary): string | null {
  const b = c.lastBill;
  if (!b) return null;
  const head = `${billInr(b.amount)} due ${billShortDate(b.dueDate)}`;
  if (b.status === "paid" || b.status === "marked_paid") {
    return `${head} — Paid ✓`;
  }
  if (b.status === "partial") {
    return `${head} — ${billInr(b.paid)} of ${billInr(b.amount)} paid`;
  }
  return `${head} — Not paid yet`;
}

export function normalizeCreditLimit(raw: unknown): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(n);
}

const PAID_STATEMENTS_KEEP = 12;

function normalizePaidStatements(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = Array.from(
    new Set(
      raw
        .map((x) => String(x || "").slice(0, 10))
        .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)),
    ),
  )
    .sort()
    .slice(-PAID_STATEMENTS_KEEP);
  return list.length ? list : undefined;
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
    creditLimit: normalizeCreditLimit(o.creditLimit ?? o.credit_limit),
    paidStatements: normalizePaidStatements(o.paidStatements),
    createdAt:
      typeof o.createdAt === "string"
        ? o.createdAt
        : typeof o.created_at === "string"
          ? o.created_at
          : new Date().toISOString(),
  };
}

export function loadSavedCreditCards(userId: string): SavedCreditCard[] {
  if (!userId || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
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
  if (!userId || typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(cards));
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
    /** Omit to keep the saved limit; pass null to clear it. */
    creditLimit?: number | null;
  },
): SavedCreditCard {
  const nickname = input.nickname.trim();
  const last4 = normalizeLast4(input.last4);
  const creditLimit = normalizeCreditLimit(input.creditLimit);
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
        creditLimit:
          input.creditLimit === undefined
            ? existing[idx].creditLimit
            : creditLimit,
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
      creditLimit: creditLimit ?? existing[dupIdx].creditLimit,
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
    creditLimit,
    createdAt: new Date().toISOString(),
  };
  existing.push(created);
  saveCreditCards(userId, existing);
  void persistCreditCardToDb(userId, created);
  return created;
}

/**
 * "Mark paid" on a bill no logged payment could be matched to. Stored on the
 * card in the local card cache (keyed by card + statement close date), so the
 * bill stops showing as unpaid. Returns the updated card, or null.
 */
export function markCardStatementPaid(
  userId: string,
  cardId: string,
  statementEnd: string,
): SavedCreditCard | null {
  const iso = String(statementEnd || "").slice(0, 10);
  if (!userId || !cardId || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const existing = loadSavedCreditCards(userId);
  const idx = existing.findIndex((c) => c.id === cardId);
  if (idx < 0) return null;
  const updated: SavedCreditCard = {
    ...existing[idx],
    paidStatements: normalizePaidStatements([
      ...(existing[idx].paidStatements ?? []),
      iso,
    ]),
  };
  existing[idx] = updated;
  saveCreditCards(userId, existing);
  return updated;
}

/** Undo `markCardStatementPaid`. */
export function unmarkCardStatementPaid(
  userId: string,
  cardId: string,
  statementEnd: string,
): SavedCreditCard | null {
  const existing = loadSavedCreditCards(userId);
  const idx = existing.findIndex((c) => c.id === cardId);
  if (idx < 0) return null;
  const updated: SavedCreditCard = {
    ...existing[idx],
    paidStatements: normalizePaidStatements(
      (existing[idx].paidStatements ?? []).filter((d) => d !== statementEnd),
    ),
  };
  existing[idx] = updated;
  saveCreditCards(userId, existing);
  return updated;
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
    // Missing until migration 041 runs — the local cache keeps it meanwhile.
    credit_limit: row.credit_limit,
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
      // `*` so the load works before and after migration 041 (credit_limit).
      .select("*")
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

    const localById = new Map(local.map((c) => [c.id, c]));
    const byId = new Map<string, SavedCreditCard>();
    for (const c of fromDb) {
      const localCard = localById.get(c.id);
      byId.set(c.id, {
        ...c,
        creditLimit: c.creditLimit ?? localCard?.creditLimit,
        // Bills marked paid live in the local cache only.
        paidStatements: localCard?.paidStatements,
      });
    }

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
    const row: Record<string, unknown> = {
      id: card.id,
      user_id: userId,
      nickname: card.nickname,
      last4: card.last4 ?? null,
      billing_day: card.billingDay ?? null,
      due_day: card.dueDay ?? null,
      credit_limit: card.creditLimit ?? null,
      created_at: card.createdAt,
      updated_at: new Date().toISOString(),
    };
    const res = await supabase
      .from("user_credit_cards")
      .upsert(row, { onConflict: "id" });
    if (res?.error && /credit_limit/i.test(res.error.message || "")) {
      // Migration 041 not applied yet: save the rest; the limit stays local.
      delete row.credit_limit;
      await supabase
        .from("user_credit_cards")
        .upsert(row, { onConflict: "id" });
    }
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
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(billDismissKey(year, monthName)) === "1";
  } catch {
    return false;
  }
}

export function dismissCreditCardBillReminder(
  year: number,
  monthName: string,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(billDismissKey(year, monthName), "1");
  } catch {
    /* ignore */
  }
}

export function hasTrackerConsentLocal(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      localStorage.getItem(TRACKER_CONSENT_STORAGE_KEY) ===
      TRACKER_CONSENT_VERSION
    );
  } catch {
    return false;
  }
}

export function setTrackerConsentLocal(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TRACKER_CONSENT_STORAGE_KEY, TRACKER_CONSENT_VERSION);
  } catch {
    /* ignore */
  }
}
