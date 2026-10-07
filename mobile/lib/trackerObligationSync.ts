import { EXPENSE_SUBCATEGORY_TO_OBLIGATION } from "@/lib/trackerMonthIncome";

export const OBLIGATION_HINTS: Record<string, string> = {
  insurance: "insurance_life",
  lic: "insurance_life",
  "health insurance": "insurance_health",
  emi: "loan_emi",
  "home loan": "loan_emi",
  "home emi": "loan_emi",
  "car loan": "loan_emi",
  sip: "investment_sip",
  "mutual fund": "investment_sip",
  ppf: "investment_ppf",
  "credit card": "credit_card",
  rent: "rent",
};

export function obligationCategoryFromExpense(txn: {
  bucket?: string | null;
  subcategory?: string | null;
  category?: string | null;
  description?: string | null;
}): string | null {
  const subKey = (txn.subcategory || txn.category || "").trim();
  const fromSub = EXPENSE_SUBCATEGORY_TO_OBLIGATION[subKey];
  if (fromSub) return fromSub;

  const bucket = (txn.bucket || "").trim();
  if (bucket === "loans" && subKey !== "others") {
    if (subKey === "credit_card") return "credit_card";
    if (subKey) return "loan_emi";
  }
  if (bucket === "investment" && (subKey === "sip" || !subKey)) {
    return "investment_sip";
  }

  const desc = (txn.description || "").toLowerCase();
  const hints = Object.entries(OBLIGATION_HINTS).sort(
    (a, b) => b[0].length - a[0].length,
  );
  return hints.find(([kw]) => desc.includes(kw))?.[1] ?? null;
}

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(Number(a) - Number(b)) < 1;
}

function titleOverlap(
  description: string | null | undefined,
  title: string | null | undefined,
): boolean {
  const desc = (description || "").toLowerCase().trim();
  const t = (title || "").toLowerCase().trim();
  if (!desc || !t) return false;
  const n = Math.min(8, desc.length, t.length);
  if (n < 3) return false;
  return desc.includes(t.slice(0, n)) || t.includes(desc.slice(0, n));
}

function normaliseName(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Expense note names the obligation (e.g. "Niva Bupa premium" ↔ "Niva Bupa").
 * Lets a payment tick its obligation after the premium / EMI amount changed.
 */
export function obligationNameMatches(
  description: string | null | undefined,
  title: string | null | undefined,
): boolean {
  const desc = normaliseName(description);
  const t = normaliseName(title);
  if (t.length < 3 || desc.length < 3) return false;
  return ` ${desc} `.includes(` ${t} `) || ` ${t} `.includes(` ${desc} `);
}

/** Amount-matched pairs always outrank name-only ones. */
const AMOUNT_MATCH_BONUS = 100;

type ExpenseLike = {
  id?: string;
  amount: number | string;
  bucket?: string | null;
  subcategory?: string | null;
  category?: string | null;
  description?: string | null;
};

type ChecklistLike = {
  id: string;
  status: string;
  expected_amount?: number | null;
  paid_amount?: number | null;
  obligation?: {
    title?: string | null;
    category?: string | null;
    amount?: number | null;
    is_active?: boolean | null;
  } | null;
};

/** Match expense ₹ to checklist expected amount OR live obligation amount. */
function itemAmountMatches(amount: number, item: ChecklistLike): boolean {
  const expense = Math.round(Number(amount));
  if (!Number.isFinite(expense) || expense <= 0) return false;

  const expected = Number(item.expected_amount);
  if (Number.isFinite(expected) && amountsMatch(expected, expense)) return true;

  // After obligation edits, checklist.expected_amount can stay stale
  // (generate_monthly_checklist uses ON CONFLICT DO NOTHING). UI shows
  // obligation.amount — matching must use that too.
  const live = Number(item.obligation?.amount);
  if (Number.isFinite(live) && live > 0 && amountsMatch(live, expense)) {
    return true;
  }

  if (
    item.paid_amount != null &&
    amountsMatch(Number(item.paid_amount), expense)
  ) {
    return true;
  }
  return false;
}

function matchScore(expense: ExpenseLike, item: ChecklistLike): number | null {
  const byAmount = itemAmountMatches(Number(expense.amount), item);
  const byName = obligationNameMatches(
    expense.description,
    item.obligation?.title,
  );
  if (!byAmount && !byName) return null;
  return (
    (byAmount ? AMOUNT_MATCH_BONUS : 0) + obligationMatchScore(expense, item)
  );
}

/** Credit card bill pays live in CC dues UI — never touch obligations. */
export function isCreditCardObligationExpense(e: {
  bucket?: string | null;
  subcategory?: string | null;
  category?: string | null;
  description?: string | null;
}): boolean {
  const sub = (e.subcategory || e.category || "").trim();
  if (sub === "credit_card") return true;
  return obligationCategoryFromExpense(e) === "credit_card";
}

/** Income / CC bill pays never tick obligations. */
function isEligibleExpense(e: ExpenseLike): boolean {
  if ((e.bucket || "").trim() === "income") return false;
  if (isCreditCardObligationExpense(e)) return false;
  const n = Number(e.amount);
  return Number.isFinite(n) && n > 0;
}

/**
 * Soft score for tie-breaks only. Amount match is required separately.
 * Higher = better guess when two obligations share the same ₹.
 */
export function obligationMatchScore(
  expense: ExpenseLike,
  item: ChecklistLike,
): number {
  let score = 0;
  const cat = obligationCategoryFromExpense(expense);
  const obCat = item.obligation?.category || "";
  if (cat && cat === obCat) score += 10;
  if (titleOverlap(expense.description, item.obligation?.title)) score += 6;

  const bucket = (expense.bucket || "").trim();
  if (bucket === "loans" && obCat === "loan_emi") score += 4;
  if (bucket === "loans" && obCat === "credit_card") score += 2;
  if (bucket === "investment" && obCat.startsWith("investment")) score += 4;
  if (bucket === "needs" && (obCat === "rent" || obCat.startsWith("insurance")))
    score += 3;
  return score;
}

/**
 * Same ₹, or the expense note names the obligation.
 * `obligationCategory` kept for call-site compat; ignored for the gate.
 */
export function expenseCoversChecklistItem(
  amount: number,
  description: string | null | undefined,
  _obligationCategory: string | null,
  item: {
    expected_amount?: number | null;
    paid_amount?: number | null;
    obligation?: {
      title?: string | null;
      category?: string | null;
      amount?: number | null;
    } | null;
  },
): boolean {
  return (
    itemAmountMatches(amount, item as ChecklistLike) ||
    obligationNameMatches(description, item.obligation?.title)
  );
}

/** Best pending row for a new expense — amount match first, then name, then soft score. */
export function findPendingChecklistForExpense(
  checklist: ChecklistLike[],
  expense: ExpenseLike,
): ChecklistLike | undefined {
  if (!isEligibleExpense(expense)) return undefined;
  let best: { item: ChecklistLike; score: number } | undefined;
  for (const c of checklist) {
    if (c.status !== "pending" || c.obligation?.is_active === false) continue;
    const score = matchScore(expense, c);
    if (score == null) continue;
    if (!best || score > best.score) best = { item: c, score };
  }
  return best?.item;
}

/**
 * Sync ✓ from expenses.
 * 1) Match by amount, or by the expense note naming the obligation
 * 2) Amount matches win; ties break on soft score (category/title)
 * 3) One expense → one obligation
 */
export function planObligationExpenseSync(opts: {
  checklist: ChecklistLike[];
  expenses: ExpenseLike[];
}): { markPaid: Array<{ id: string; amount: number }>; markUnpaid: string[] } {
  const expenses = opts.expenses.filter(isEligibleExpense);
  const items = opts.checklist.filter(
    (c) =>
      c.status !== "skipped" &&
      c.status !== "auto_debit" &&
      c.obligation?.is_active !== false,
  );

  type Pair = {
    expenseId: string | undefined;
    checklistId: string;
    amount: number;
    score: number;
  };

  const pairs: Pair[] = [];
  for (const e of expenses) {
    const amount = Number(e.amount);
    for (const c of items) {
      const score = matchScore(e, c);
      if (score == null) continue;
      pairs.push({ expenseId: e.id, checklistId: c.id, amount, score });
    }
  }

  pairs.sort((a, b) => b.score - a.score || b.amount - a.amount);

  const usedExpense = new Set<string>();
  const usedChecklist = new Set<string>();
  const assigned = new Map<string, number>();

  for (const p of pairs) {
    if (p.expenseId && usedExpense.has(p.expenseId)) continue;
    if (usedChecklist.has(p.checklistId)) continue;
    if (p.expenseId) usedExpense.add(p.expenseId);
    usedChecklist.add(p.checklistId);
    assigned.set(p.checklistId, p.amount);
  }

  const markPaid: Array<{ id: string; amount: number }> = [];
  const markUnpaid: string[] = [];

  for (const c of items) {
    const covered = assigned.has(c.id);
    if (c.status === "paid") {
      if (!covered) markUnpaid.push(c.id);
    } else if (c.status === "pending" && covered) {
      markPaid.push({ id: c.id, amount: assigned.get(c.id)! });
    }
  }

  return { markPaid, markUnpaid };
}
