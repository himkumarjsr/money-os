/**
 * Explain purple-card SPENT / LEFT math line-by-line for debugging mismatches.
 */

import {
  countsTowardCashSpend,
  displayPaymentMethod,
  isCreditCardBillPayment,
  isCreditCardCharge,
  sumCashSpend,
  sumOnCardsSpend,
} from "@/lib/trackerCreditCards";

export type CashAuditReason =
  | "income"
  | "included"
  | "included_loan_emi"
  | "included_loan_repayment"
  | "included_cc_bill_pay"
  | "cc_purchase"
  | "invalid_amount";

export type CashAuditLine = {
  id: string;
  date: string;
  description: string;
  bucket: string;
  subcategory: string;
  paymentMethod: string;
  amount: number;
  reason: CashAuditReason;
  countsInPurpleSpent: boolean;
};

export type CashAuditResult = {
  incomeLogged: number;
  incomeFromProfile: number;
  incomeUsed: number;
  incomeSource: "logged" | "profile" | "none";
  purpleSpent: number;
  onCards: number;
  left: number;
  included: CashAuditLine[];
  excluded: CashAuditLine[];
};

function isLoanEmiSub(sub: string | null | undefined): boolean {
  if (!sub) return false;
  return (
    sub.endsWith("_emi") ||
    sub === "personal_loan" ||
    sub === "education_loan" ||
    sub === "bike_loan" ||
    sub === "other_loan" ||
    sub === "bnpl"
  );
}

function isLoanRepaymentSub(sub: string | null | undefined): boolean {
  if (!sub) return false;
  return sub === "loan_prepayment" || sub === "loan_repayment";
}

function classify(txn: {
  bucket?: string | null;
  subcategory?: string | null;
  category?: string | null;
  payment_method?: string | null;
  amount: number;
}): CashAuditReason {
  if (txn.bucket === "income") return "income";
  const n = Number(txn.amount);
  if (!Number.isFinite(n) || n <= 0) return "invalid_amount";
  if (isCreditCardCharge(txn)) return "cc_purchase";
  if (!countsTowardCashSpend(txn)) return "invalid_amount";
  if (isCreditCardBillPayment(txn)) return "included_cc_bill_pay";
  const sub = txn.subcategory || txn.category;
  if (isLoanRepaymentSub(sub)) return "included_loan_repayment";
  if (txn.bucket === "loans" || isLoanEmiSub(sub)) return "included_loan_emi";
  return "included";
}

export function reasonLabel(reason: CashAuditReason): string {
  switch (reason) {
    case "income":
      return "Income (not spent)";
    case "included":
      return "In purple SPENT";
    case "included_loan_emi":
      return "In purple SPENT — loan EMI";
    case "included_loan_repayment":
      return "In purple SPENT — loan repayment";
    case "included_cc_bill_pay":
      return "In purple SPENT — credit card bill pay (cash out)";
    case "cc_purchase":
      return "Excluded — paid with credit card";
    case "invalid_amount":
      return "Excluded — invalid amount";
  }
}

export function buildCashAudit(opts: {
  transactions: Array<{
    id?: string;
    date?: string | null;
    amount: number | string;
    bucket?: string | null;
    subcategory?: string | null;
    category?: string | null;
    description?: string | null;
    payment_method?: string | null;
  }>;
  profileMonthlyIncome?: number;
}): CashAuditResult {
  const profile = Math.max(0, Number(opts.profileMonthlyIncome) || 0);
  const incomeLogged = opts.transactions.reduce((sum, t) => {
    if (t.bucket !== "income") return sum;
    const n = Number(t.amount);
    return Number.isFinite(n) && n > 0 ? sum + n : sum;
  }, 0);
  const incomeUsed = incomeLogged > 0 ? incomeLogged : profile;
  const incomeSource: CashAuditResult["incomeSource"] =
    incomeLogged > 0 ? "logged" : profile > 0 ? "profile" : "none";

  const lines: CashAuditLine[] = opts.transactions.map((t, i) => {
    const amount = Number(t.amount) || 0;
    const reason = classify({
      bucket: t.bucket,
      subcategory: t.subcategory,
      category: t.category,
      payment_method: t.payment_method,
      amount,
    });
    return {
      id: t.id || `row-${i}`,
      date: t.date || "—",
      description: (t.description || "").trim() || "(no description)",
      bucket: t.bucket || "—",
      subcategory: t.subcategory || t.category || "—",
      paymentMethod: displayPaymentMethod(t.payment_method),
      amount,
      reason,
      countsInPurpleSpent:
        reason === "included" ||
        reason === "included_loan_emi" ||
        reason === "included_loan_repayment" ||
        reason === "included_cc_bill_pay",
    };
  });

  const included = lines.filter((l) => l.countsInPurpleSpent);
  // Only purchases paid *with* a credit card are excluded from purple.
  const excluded = lines.filter((l) => l.reason === "cc_purchase");
  const purpleSpent = sumCashSpend(opts.transactions);
  const onCards = sumOnCardsSpend(opts.transactions);

  return {
    incomeLogged,
    incomeFromProfile: profile,
    incomeUsed,
    incomeSource,
    purpleSpent,
    onCards,
    left: incomeUsed - purpleSpent,
    included,
    excluded,
  };
}

/** Console-friendly dump for local debugging. */
export function logCashAudit(
  audit: CashAuditResult,
  label = "Purple cash",
): void {
  console.group(`[Tracker] ${label}`);
  console.log("Income used", audit.incomeUsed, `(${audit.incomeSource})`, {
    logged: audit.incomeLogged,
    profile: audit.incomeFromProfile,
  });
  console.log("SPENT (purple)", audit.purpleSpent);
  console.log("On cards", audit.onCards);
  console.log("LEFT", audit.left);
  console.table(
    audit.included.map((l) => ({
      date: l.date,
      desc: l.description,
      bucket: l.bucket,
      pay: l.paymentMethod,
      amount: l.amount,
      why: reasonLabel(l.reason),
    })),
  );
  if (audit.excluded.length) {
    console.table(
      audit.excluded.map((l) => ({
        date: l.date,
        desc: l.description,
        bucket: l.bucket,
        pay: l.paymentMethod,
        amount: l.amount,
        why: reasonLabel(l.reason),
      })),
    );
  }
  console.groupEnd();
}
