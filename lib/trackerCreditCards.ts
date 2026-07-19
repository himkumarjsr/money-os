export type SavedCreditCard = {
  id: string;
  nickname: string;
  /** Optional; older saved cards may still have this. Not collected for new cards. */
  last4?: string;
  createdAt: string;
};

export type CreditCardBillLine = {
  cardId: string;
  label: string;
  amount: number;
};

const STORAGE_PREFIX = "finkoin_credit_cards_";
const DISMISS_PREFIX = "finkoin_cc_bill_dismissed_";

export function formatCreditCardLabel(
  card: Pick<SavedCreditCard, "nickname" | "last4">,
) {
  const nick = card.nickname.trim() || "Credit card";
  const last4 = (card.last4 ?? "").replace(/\D/g, "").slice(-4);
  // Prefer name-only; keep last4 in label only for legacy saved cards.
  return last4 ? `${nick} ****${last4}` : nick;
}

export function encodeCreditCardPaymentMethod(
  card: Pick<SavedCreditCard, "id" | "nickname" | "last4">,
) {
  const label = formatCreditCardLabel(card).replace(/\|/g, "/");
  return `credit_card::${card.id}::${label}`;
}

export function isCreditCardPaymentMethod(method: string | null | undefined) {
  const m = (method ?? "").toLowerCase();
  return m === "card" || m === "credit_card" || m.startsWith("credit_card::");
}

export function parseCreditCardPaymentMethod(
  method: string | null | undefined,
): {
  cardId: string | null;
  label: string | null;
} {
  const raw = method ?? "";
  if (!isCreditCardPaymentMethod(raw)) {
    return { cardId: null, label: null };
  }
  if (raw.startsWith("credit_card::")) {
    const parts = raw.split("::");
    return {
      cardId: parts[1] || null,
      label: parts.slice(2).join("::") || null,
    };
  }
  return { cardId: null, label: "Credit card" };
}

export function displayPaymentMethod(method: string | null | undefined) {
  if (!method) return "—";
  if (isCreditCardPaymentMethod(method)) {
    const { label } = parseCreditCardPaymentMethod(method);
    return label || "Credit card";
  }
  if (method === "upi") return "UPI";
  if (method === "netbanking") return "Net banking";
  if (method === "cash") return "Cash";
  if (method === "wallet") return "Wallet";
  return method;
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function loadSavedCreditCards(userId: string): SavedCreditCard[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedCreditCard[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c) => c && typeof c.id === "string" && typeof c.nickname === "string",
    );
  } catch {
    return [];
  }
}

export function saveCreditCards(userId: string, cards: SavedCreditCard[]) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(cards));
  } catch {
    /* ignore quota */
  }
}

export function upsertSavedCreditCard(
  userId: string,
  input: { nickname: string; last4?: string; id?: string },
): SavedCreditCard {
  const nickname = input.nickname.trim();
  const last4 = (input.last4 ?? "").replace(/\D/g, "").slice(-4);
  const cards = loadSavedCreditCards(userId);
  const existingIdx = input.id
    ? cards.findIndex((c) => c.id === input.id)
    : cards.findIndex(
        (c) => c.nickname.toLowerCase() === nickname.toLowerCase(),
      );

  const next: SavedCreditCard = {
    id: existingIdx >= 0 ? cards[existingIdx].id : crypto.randomUUID(),
    nickname,
    ...(last4 ? { last4 } : {}),
    createdAt:
      existingIdx >= 0
        ? cards[existingIdx].createdAt
        : new Date().toISOString(),
  };

  if (existingIdx >= 0) cards[existingIdx] = next;
  else cards.unshift(next);
  saveCreditCards(userId, cards);
  return next;
}

export function deleteSavedCreditCard(userId: string, cardId: string): boolean {
  if (!userId || !cardId) return false;
  const cards = loadSavedCreditCards(userId);
  const next = cards.filter((c) => c.id !== cardId);
  if (next.length === cards.length) return false;
  saveCreditCards(userId, next);
  return true;
}

export function summarizeCreditCardBills(
  transactions: Array<{
    amount: number;
    bucket?: string | null;
    subcategory?: string | null;
    payment_method?: string | null;
  }>,
): CreditCardBillLine[] {
  const map = new Map<string, CreditCardBillLine>();
  for (const t of transactions) {
    if (t.bucket === "income") continue;
    // Don't count paying the CC bill itself (loans → credit_card).
    if (t.bucket === "loans" && t.subcategory === "credit_card") continue;
    if (!isCreditCardPaymentMethod(t.payment_method)) continue;
    const parsed = parseCreditCardPaymentMethod(t.payment_method);
    const key = parsed.cardId || parsed.label || "credit_card";
    const label = parsed.label || "Credit card";
    const prev = map.get(key);
    const amount = Math.max(0, Number(t.amount) || 0);
    if (prev) prev.amount += amount;
    else map.set(key, { cardId: key, label, amount });
  }
  return Array.from(map.values())
    .filter((b) => b.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function creditCardBillDismissKey(year: number, monthName: string) {
  return `${DISMISS_PREFIX}${year}-${monthName}`;
}

export function isCreditCardBillDismissed(year: number, monthName: string) {
  if (typeof window === "undefined") return false;
  try {
    return (
      localStorage.getItem(creditCardBillDismissKey(year, monthName)) === "1"
    );
  } catch {
    return false;
  }
}

export function dismissCreditCardBillReminder(year: number, monthName: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(creditCardBillDismissKey(year, monthName), "1");
  } catch {
    /* ignore */
  }
}
