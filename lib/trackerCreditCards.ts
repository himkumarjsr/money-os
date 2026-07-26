/**
 * Tracker credit-card helpers: payment-method encoding, saved cards (local + DB),
 * cash-vs-card spend, and statement-window bill suggestions.
 */

import { getSupabase } from "@/lib/supabase";

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

/** Description prefix used when logging a CC bill payment expense. */
export function creditCardBillPaymentDescription(
  label: string,
  cardId?: string,
): string {
  const base = `Pay bill · ${label.trim() || "Credit card"}`;
  return cardId ? `${base} [#${cardId}]` : base;
}

const STORAGE_PREFIX = "finkoin_credit_cards_";
const BILL_DISMISS_PREFIX = "finkoin_cc_bill_dismissed_";

/** Typical gap from statement day to payment due (not the ~45-day interest-free period). */
export const DEFAULT_DUE_OFFSET_DAYS = 20;

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
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

/** CC purchase charge (not a cash bill payment under loans → credit_card). */
export function isCreditCardCharge(txn: {
  bucket?: string | null;
  subcategory?: string | null;
  category?: string | null;
  payment_method?: string | null;
}): boolean {
  if (txn.bucket === "income") return false;
  const sub = txn.subcategory || txn.category;
  if (txn.bucket === "loans" && sub === "credit_card") return false;
  return isCreditCardPaymentMethod(txn.payment_method);
}

/**
 * Purple-card cash out: day-to-day money leaving the account this month.
 * Excludes CC purchase charges (debt, not cash yet) and CC bill payments
 * (tracked in Credit card dues instead). Other loan/EMI cash still counts.
 */
export function countsTowardCashSpend(txn: {
  bucket?: string | null;
  subcategory?: string | null;
  category?: string | null;
  payment_method?: string | null;
}): boolean {
  if (txn.bucket === "income") return false;
  if (isCreditCardCharge(txn)) return false;
  if (isCreditCardBillPayment(txn)) return false;
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
}): boolean {
  if (txn.bucket !== "loans") return false;
  const sub = txn.subcategory || txn.category;
  return sub === "credit_card";
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
  // Prefer explicit [#cardId] token from Pay prefills
  const bracket = desc.match(/\[#([^\]]+)\]/);
  if (bracket?.[1]?.toLowerCase() === id) return true;
  if (id && desc.includes(id)) return true;
  const nick = card.nickname.trim().toLowerCase();
  if (nick.length >= 2 && desc.includes(nick)) return true;
  const label = formatCreditCardLabel(card).toLowerCase();
  if (label && label !== "credit card" && desc.includes(label)) return true;
  const parsed = parseCreditCardPaymentMethod(txn.payment_method);
  if (parsed.cardId && parsed.cardId === card.id) return true;
  return false;
}

function sumChargesForCard(transactions: BillTxn[], cardId: string): number {
  return transactions.reduce((sum, t) => {
    if (!isCreditCardCharge(t)) return sum;
    const { cardId: tid } = parseCreditCardPaymentMethod(t.payment_method);
    if (tid !== cardId) return sum;
    const n = Number(t.amount);
    return Number.isFinite(n) && n > 0 ? sum + n : sum;
  }, 0);
}

function sumPaymentsForCard(
  transactions: Array<BillTxn & { description?: string | null }>,
  card: SavedCreditCard,
  soleCardFallback: boolean,
): number {
  return transactions.reduce((sum, t) => {
    if (!isCreditCardBillPayment(t)) return sum;
    const matched = billPaymentMatchesCard(t, card);
    const hasOtherCardToken = /\[#[^\]]+\]/.test(t.description || "");
    const attribute = matched || (soleCardFallback && !hasOtherCardToken);
    if (!attribute) return sum;
    const n = Number(t.amount);
    return Number.isFinite(n) && n > 0 ? sum + n : sum;
  }, 0);
}

/**
 * Per-card due status with unpaid carry-forward:
 * remaining = all CC charges − all matched bill payments in the txn pool.
 * Paid bills show status "paid"; unpaid stay "due" across months until cleared.
 */
export function buildCreditCardBillStatuses(opts: {
  cards: SavedCreditCard[];
  transactions: Array<BillTxn & { description?: string | null }>;
  asOf?: Date;
}): CreditCardBillStatus[] {
  const asOf = opts.asOf ?? new Date();
  const asOfDay = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  const soleCard = opts.cards.length === 1;
  const suggestions = buildCreditCardPaySuggestions({
    cards: opts.cards,
    transactions: opts.transactions,
    asOf,
  });
  const suggestionById = new Map(suggestions.map((s) => [s.cardId, s]));

  const statuses: CreditCardBillStatus[] = opts.cards.map((card) => {
    const charged = sumChargesForCard(opts.transactions, card.id);
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

  // Orphan spend (no saved card id) still shown as due
  for (const sug of suggestions) {
    if (opts.cards.some((c) => c.id === sug.cardId)) continue;
    statuses.push({
      ...sug,
      charged: sug.amount,
      paid: 0,
      remaining: sug.amount,
      status: sug.amount > 0 ? "due" : "clear",
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
 * Upsert a monthly credit-card bill obligation so the daily cron
 * (`/api/obligations/reminders`) can insert an inbox notification
 * `remind_days_before` days before `dueDay`.
 */
export async function syncCreditCardBillObligation(
  userId: string,
  card: { nickname: string; dueDay?: number | null },
  amount = 0,
): Promise<void> {
  if (!userId || !card.dueDay) return;
  try {
    const supabase = getSupabase();
    await supabase.from("financial_obligations").upsert(
      {
        user_id: userId,
        title: creditCardObligationTitle(card.nickname),
        category: "credit_card",
        amount: Math.max(0, Math.round(Number(amount) || 0)),
        frequency: "monthly",
        due_day: card.dueDay,
        source: "tracker",
        remind_days_before: 3,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,title,category" },
    );
  } catch {
    /* optional — table / network */
  }
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
