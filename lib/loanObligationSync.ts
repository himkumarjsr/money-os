/**
 * Two-way sync between Analyse loans (`unifiedLoans`) and Tracker loan
 * obligations (`financial_obligations.category = 'loan_emi'`).
 * Pure helpers; each platform's obligation store does the I/O.
 */
import {
  financialProfileToFormValues,
  normalizeAnalyseFormValues,
  type AnalyseFormValues,
  type FinancialProfile,
  type UnifiedLoanType,
} from "@/lib/analyse-form-schema";

/** Analyse loan created from a Tracker row: `tracker:<obligation id>`. */
export const TRACKER_LOAN_ID_PREFIX = "tracker:";

export type UnifiedLoan = NonNullable<AnalyseFormValues["unifiedLoans"]>[number];

export type LoanObligationLike = {
  id: string;
  title: string;
  category: string;
  amount: number;
  due_day?: number | null;
  is_active: boolean;
  source?: string | null;
  updated_at?: string | null;
};

const TYPE_LABEL: Record<UnifiedLoanType, string> = {
  home_loan: "Home Loan",
  personal_loan: "Personal Loan",
  car_loan: "Car Loan",
  bike_loan: "Bike Loan",
  education_loan: "Education Loan",
  pf_loan: "PF Loan",
  overdraft: "Overdraft",
  gold_loan: "Gold Loan",
  business_loan: "Business Loan",
  credit_card: "Credit Card",
  other: "Loan",
};

/** Same format syncFromHealthCheck has always used, e.g. "Home Loan EMI · HDFC". */
export function loanObligationTitle(loan: {
  loanType: UnifiedLoanType;
  lenderName?: string;
}): string {
  const base = `${TYPE_LABEL[loan.loanType] ?? "Loan"} EMI`;
  const lender = loan.lenderName?.trim();
  return lender ? `${base} · ${lender}` : base;
}

export function inferLoanType(title: string): UnifiedLoanType {
  const t = title.toLowerCase();
  if (/\bhome\b|housing|mortgage/.test(t)) return "home_loan";
  if (/two[- ]?wheeler|\bbike\b|scooter/.test(t)) return "bike_loan";
  if (/\bcar\b|vehicle|auto loan/.test(t)) return "car_loan";
  if (/education|student/.test(t)) return "education_loan";
  if (/\bgold\b/.test(t)) return "gold_loan";
  if (/business/.test(t)) return "business_loan";
  if (/\bpf\b|provident/.test(t)) return "pf_loan";
  if (/overdraft|\bod\b/.test(t)) return "overdraft";
  if (/personal/.test(t)) return "personal_loan";
  return "other";
}

const LOAN_WORDS =
  /\b(home|housing|car|bike|two[- ]?wheeler|personal|education|gold|business|pf|loan|emi|monthly|instal+ment)\b/gi;

export function lenderFromTitle(title: string): string {
  if (title.includes("·")) return title.split("·").slice(1).join("·").trim();
  return title.replace(LOAN_WORDS, " ").replace(/\s+/g, " ").trim();
}

function strongMatch(loan: UnifiedLoan, ob: LoanObligationLike): boolean {
  if (loan.id && loan.id === `${TRACKER_LOAN_ID_PREFIX}${ob.id}`) return true;
  if (ob.title === loanObligationTitle(loan)) return true;
  const lender = loan.lenderName?.trim().toLowerCase() ?? "";
  if (lender.length >= 3 && ob.title.toLowerCase().includes(lender)) {
    const obType = inferLoanType(ob.title);
    return obType === "other" || obType === loan.loanType;
  }
  return false;
}

function amountMatch(loan: UnifiedLoan, ob: LoanObligationLike): boolean {
  return Math.abs(Number(loan.monthlyEMI ?? 0) - Number(ob.amount ?? 0)) < 1;
}

/**
 * Pair each loan obligation with at most one loan: strong matches first
 * (link id / title / lender), then same-EMI matches for the leftovers.
 */
export function pairLoansWithObligations(
  loans: UnifiedLoan[],
  obligations: LoanObligationLike[],
): Map<string, number> {
  const pairs = new Map<string, number>();
  const usedLoans = new Set<number>();
  const loanObs = obligations.filter((o) => o.category === "loan_emi");
  for (const pass of [strongMatch, amountMatch]) {
    for (const ob of loanObs) {
      if (pairs.has(ob.id)) continue;
      // Closed rows only pair on a strong match so a coincidental EMI amount
      // can't remove an unrelated loan.
      if (pass === amountMatch && !ob.is_active) continue;
      const idx = loans.findIndex((l, i) => !usedLoans.has(i) && pass(l, ob));
      if (idx >= 0) {
        pairs.set(ob.id, idx);
        usedLoans.add(idx);
      }
    }
  }
  return pairs;
}

function profileLoans(profile: FinancialProfile): UnifiedLoan[] {
  return financialProfileToFormValues(profile).unifiedLoans ?? [];
}

/**
 * Tracker → Analyse. Active Tracker loans missing from the profile are added,
 * EMI/day edits made in Tracker win, and loans closed in Tracker are dropped.
 * `closedAfter` (the report's submittedAt) ignores rows closed before the
 * report was saved, so a loan re-added in the form isn't dropped again.
 */
export function mergeTrackerLoansIntoProfile(
  profile: FinancialProfile,
  allObligations: LoanObligationLike[],
  opts: { closedAfter?: string | null } = {},
): { profile: FinancialProfile; changed: boolean } {
  const closedAfter = opts.closedAfter ? Date.parse(opts.closedAfter) : NaN;
  const obligations = allObligations.filter(
    (o) =>
      o.is_active ||
      !Number.isFinite(closedAfter) ||
      !o.updated_at ||
      Date.parse(o.updated_at) > closedAfter,
  );
  const form = financialProfileToFormValues(profile);
  const loans: UnifiedLoan[] = [...(form.unifiedLoans ?? [])];
  const pairs = pairLoansWithObligations(loans, obligations);
  const drop = new Set<number>();
  let changed = false;

  for (const ob of obligations) {
    if (ob.category !== "loan_emi") continue;
    const idx = pairs.get(ob.id);
    if (idx === undefined) {
      if (!ob.is_active || !(ob.amount > 0)) continue;
      loans.push({
        id: `${TRACKER_LOAN_ID_PREFIX}${ob.id}`,
        loanType: inferLoanType(ob.title),
        lenderName: lenderFromTitle(ob.title),
        monthlyEMI: Number(ob.amount),
        outstandingAmount: 0,
        interestRate: 0,
        remainingMonths: 0,
        odLimit: 0,
        odUsed: 0,
        odInterestOnlyYears: 0,
        emiDay: ob.due_day ?? undefined,
      });
      changed = true;
      continue;
    }
    if (!ob.is_active) {
      drop.add(idx);
      changed = true;
      continue;
    }
    const loan = loans[idx];
    const emiChanged = Math.abs(Number(loan.monthlyEMI ?? 0) - ob.amount) >= 1;
    const dayChanged = ob.due_day != null && loan.emiDay !== ob.due_day;
    if (emiChanged || dayChanged) {
      loans[idx] = {
        ...loan,
        monthlyEMI: emiChanged ? Number(ob.amount) : loan.monthlyEMI,
        emiDay: dayChanged ? (ob.due_day ?? undefined) : loan.emiDay,
      };
      changed = true;
    }
  }

  if (!changed) return { profile, changed: false };
  const next = normalizeAnalyseFormValues({
    ...form,
    unifiedLoans: loans.filter((_, i) => !drop.has(i)),
  });
  return { profile: next, changed: true };
}

export type LoanObligationPlan = {
  inserts: Array<{
    title: string;
    amount: number;
    due_day: number;
  }>;
  updates: Array<{
    id: string;
    amount: number;
    due_day: number;
    is_active: true;
  }>;
  deactivate: string[];
};

/**
 * Analyse → Tracker. Every loan (not just the first of each type) gets a
 * Tracker row; edited EMIs update it; loans the user removed from the form
 * are closed. `previous` is the profile the form was edited from — a manual
 * Tracker loan is only closed if the user saw it in the form and removed it.
 */
export function planLoanObligationSync(
  submission: FinancialProfile,
  existing: LoanObligationLike[],
  previous?: FinancialProfile | null,
): LoanObligationPlan {
  const loans = profileLoans(submission).filter(
    (l) => l.loanType !== "credit_card" && Number(l.monthlyEMI ?? 0) > 0,
  );
  const loanObs = existing.filter((o) => o.category === "loan_emi");
  const pairs = pairLoansWithObligations(loans, loanObs);
  const pairedLoan = new Set(pairs.values());
  const plan: LoanObligationPlan = { inserts: [], updates: [], deactivate: [] };

  for (const ob of loanObs) {
    const idx = pairs.get(ob.id);
    if (idx !== undefined) {
      const loan = loans[idx];
      const amount = Number(loan.monthlyEMI);
      const dueDay = loan.emiDay || ob.due_day || 5;
      if (
        !ob.is_active ||
        Math.abs(ob.amount - amount) >= 1 ||
        (ob.due_day ?? 0) !== dueDay
      ) {
        plan.updates.push({ id: ob.id, amount, due_day: dueDay, is_active: true });
      }
      continue;
    }
    if (!ob.is_active) continue;
    const sawIt = previous
      ? pairLoansWithObligations(profileLoans(previous), [ob]).has(ob.id)
      : false;
    if (ob.source === "health_check" || sawIt) plan.deactivate.push(ob.id);
  }

  const takenTitles = new Set(loanObs.map((o) => o.title));
  loans.forEach((loan, idx) => {
    if (pairedLoan.has(idx)) return;
    const base = loanObligationTitle(loan);
    let title = base;
    for (let n = 2; takenTitles.has(title); n++) title = `${base} (${n})`;
    takenTitles.add(title);
    plan.inserts.push({
      title,
      amount: Number(loan.monthlyEMI),
      due_day: loan.emiDay || 5,
    });
  });

  return plan;
}
