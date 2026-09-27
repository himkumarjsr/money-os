import { sumCashSpend } from "@/lib/trackerCreditCards";

export const SAVINGS_CARRY_FORWARD_DESC = "Saving from last month";

type IncomeLikeTxn = {
  id?: string;
  amount: number | string;
  bucket?: string | null;
  subcategory?: string | null;
  category?: string | null;
  description?: string | null;
  payment_method?: string | null;
};

/** True once local calendar date is on/after the 1st of that month. */
export function monthHasStarted(
  monthIndex: number,
  year: number,
  today: Date = new Date(),
): boolean {
  const first = new Date(year, monthIndex, 1);
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return todayStart.getTime() >= first.getTime();
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Last Friday (local calendar) of the given month. */
export function lastFridayOfMonth(year: number, monthIndex: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0);
  const offset = (lastDay.getDay() - 5 + 7) % 7;
  return new Date(year, monthIndex, lastDay.getDate() - offset);
}

/**
 * Next tracker month unlocks on/after the last working Friday of the
 * current calendar month (salary often credits around month-end).
 */
export function isNextTrackerMonthUnlocked(today: Date = new Date()): boolean {
  const unlock = lastFridayOfMonth(today.getFullYear(), today.getMonth());
  return startOfLocalDay(today).getTime() >= startOfLocalDay(unlock).getTime();
}

/** Farthest month the tracker month-switcher may open. */
export function trackerForwardLimit(today: Date = new Date()): {
  month: number;
  year: number;
} {
  const month = today.getMonth();
  const year = today.getFullYear();
  if (!isNextTrackerMonthUnlocked(today)) {
    return { month, year };
  }
  if (month === 11) return { month: 0, year: year + 1 };
  return { month: month + 1, year };
}

export function sumLoggedIncome(txns: IncomeLikeTxn[]): number {
  return txns.reduce((sum, t) => {
    if (t.bucket !== "income") return sum;
    const n = Number(t.amount);
    return Number.isFinite(n) && n > 0 ? sum + n : sum;
  }, 0);
}

export function sumSalaryIncome(txns: IncomeLikeTxn[]): number {
  return txns.reduce((sum, t) => {
    if (t.bucket !== "income") return sum;
    const sub = t.subcategory || t.category;
    if (sub !== "salary") return sum;
    const n = Number(t.amount);
    return Number.isFinite(n) && n > 0 ? sum + n : sum;
  }, 0);
}

/** Main salary figure for the month (largest salary row — avoids summing dupes). */
export function primarySalaryAmount(txns: IncomeLikeTxn[]): number {
  let max = 0;
  for (const t of txns) {
    if (t.bucket !== "income") continue;
    const sub = t.subcategory || t.category;
    if (sub !== "salary") continue;
    const n = Number(t.amount);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

export function isSavingsCarryForwardTxn(txn: IncomeLikeTxn): boolean {
  if (txn.bucket !== "income") return false;
  const desc = (txn.description || "").trim().toLowerCase();
  return desc === SAVINGS_CARRY_FORWARD_DESC.toLowerCase();
}

export function sumSavingsCarryForward(txns: IncomeLikeTxn[]): number {
  return txns.reduce((sum, t) => {
    if (!isSavingsCarryForwardTxn(t)) return sum;
    const n = Number(t.amount);
    return Number.isFinite(n) && n > 0 ? sum + n : sum;
  }, 0);
}

/** Single CF figure (max) so duplicate carry-forward rows don't stack. */
export function primarySavingsCarryForward(txns: IncomeLikeTxn[]): number {
  let max = 0;
  for (const t of txns) {
    if (!isSavingsCarryForwardTxn(t)) continue;
    const n = Number(t.amount);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

export function listSavingsCarryForward(
  txns: IncomeLikeTxn[],
): IncomeLikeTxn[] {
  return txns.filter(isSavingsCarryForwardTxn);
}

/**
 * Income total counting at most one salary + one CF (+ any true other income).
 * Prevents duplicate auto-seeded salary rows from inflating the purple total.
 */
export function sumCanonicalMonthIncome(txns: IncomeLikeTxn[]): number {
  const salary = primarySalaryAmount(txns);
  const cf = primarySavingsCarryForward(txns);
  let other = 0;
  for (const t of txns) {
    if (t.bucket !== "income") continue;
    if ((t.subcategory || t.category) === "salary") continue;
    if (isSavingsCarryForwardTxn(t)) continue;
    const n = Number(t.amount);
    if (Number.isFinite(n) && n > 0) other += n;
  }
  return Math.round((salary + cf + other) * 100) / 100;
}

/** Leftover cash in salary pocket after purple cash spend. */
export function computeMonthLeftover(
  incomeTotal: number,
  txns: IncomeLikeTxn[],
): number {
  const spent = sumCashSpend(txns);
  return Math.max(0, Math.round((incomeTotal - spent) * 100) / 100);
}

/**
 * Only salary (+ prior CF) forms the pocket that can leave a carry-forward.
 * Ad-hoc other income does not increase next month's "Saving from last month".
 */
export function salaryPocketTotal(txns: IncomeLikeTxn[]): number {
  return (
    Math.round(
      (primarySalaryAmount(txns) + primarySavingsCarryForward(txns)) * 100,
    ) / 100
  );
}

export type MonthIncomePlan = {
  /** Salary to show / sync (from prior month primary salary, else profile). */
  salaryAmount: number;
  /** Prior month leftover to carry as income. */
  savingsAmount: number;
  /** Combined display when nothing logged yet. */
  displayTotal: number;
  needsSalaryRow: boolean;
  needsSavingsRow: boolean;
};

/**
 * Plan income for a selected month from prior-month activity + profile fallback.
 *
 * Next month gets:
 *  1) One Salary (copy of last month's main salary)
 *  2) One "Saving from last month" = unspent salary pocket leftover
 * Never a second salary. Other income is not carried forward as salary.
 */
export function planMonthIncomeFromPrior(opts: {
  previousTxns: IncomeLikeTxn[];
  currentTxns: IncomeLikeTxn[];
  profileSalary: number;
}): MonthIncomePlan {
  const prevPrimarySalary = primarySalaryAmount(opts.previousTxns);
  const prevPocket = salaryPocketTotal(opts.previousTxns);
  // Leftover only from salary pocket (salary + prior CF), not bonuses.
  const savingsAmount =
    prevPocket > 0 ? computeMonthLeftover(prevPocket, opts.previousTxns) : 0;

  // Copy last month's main salary only — never treat other-income / CF as salary.
  const salaryAmount =
    prevPrimarySalary > 0 ? prevPrimarySalary : Math.max(0, opts.profileSalary);

  const hasSalaryRow = primarySalaryAmount(opts.currentTxns) > 0;
  const hasSavingsRow = primarySavingsCarryForward(opts.currentTxns) > 0;
  const currentCanonical = sumCanonicalMonthIncome(opts.currentTxns);
  const needsSalaryRow = !hasSalaryRow && salaryAmount > 0;
  const needsSavingsRow = !hasSavingsRow && savingsAmount > 0;

  const displayTotal =
    Math.round(
      (currentCanonical +
        (needsSalaryRow ? salaryAmount : 0) +
        (needsSavingsRow ? savingsAmount : 0)) *
        100,
    ) / 100;

  return {
    salaryAmount: Math.round(salaryAmount * 100) / 100,
    savingsAmount: Math.round(savingsAmount * 100) / 100,
    displayTotal,
    needsSalaryRow,
    needsSavingsRow,
  };
}

export type AutoIncomeCleanup = {
  /** Extra salary / CF rows to delete. */
  dropIds: string[];
  /** Correct carry-forward amount on the kept CF row (or null). */
  updateCf: { id: string; amount: number } | null;
  needsWork: boolean;
};

/**
 * Enforce at most one Salary + one "Saving from last month" for a month.
 * Keeps salary closest to planned amount; CF amount is forced to planned leftover.
 */
export function planAutoIncomeCleanup(opts: {
  currentTxns: IncomeLikeTxn[];
  salaryAmount: number;
  savingsAmount: number;
}): AutoIncomeCleanup {
  const dropIds: string[] = [];
  const salaries = opts.currentTxns.filter(
    (t) =>
      t.bucket === "income" &&
      (t.subcategory || t.category) === "salary" &&
      Boolean(t.id),
  );
  if (salaries.length > 1) {
    const target = opts.salaryAmount;
    const sorted = [...salaries].sort((a, b) => {
      const da = Math.abs(Number(a.amount) - target);
      const db = Math.abs(Number(b.amount) - target);
      if (da !== db) return da - db;
      // Prefer exact target, then larger amount (more likely real paycheck).
      return Number(b.amount) - Number(a.amount);
    });
    for (const t of sorted.slice(1)) {
      if (t.id) dropIds.push(t.id);
    }
  }

  const cfs = listSavingsCarryForward(opts.currentTxns).filter((t) =>
    Boolean(t.id),
  );
  let updateCf: { id: string; amount: number } | null = null;
  const targetCf = Math.max(0, Math.round(opts.savingsAmount * 100) / 100);

  if (cfs.length > 1) {
    const sorted = [...cfs].sort(
      (a, b) =>
        Math.abs(Number(a.amount) - targetCf) -
        Math.abs(Number(b.amount) - targetCf),
    );
    for (const t of sorted.slice(1)) {
      if (t.id) dropIds.push(t.id);
    }
    const keep = sorted[0];
    if (keep?.id) {
      if (targetCf <= 0) dropIds.push(keep.id);
      else if (Math.abs(Number(keep.amount) - targetCf) >= 1) {
        updateCf = { id: keep.id, amount: targetCf };
      }
    }
  } else if (cfs.length === 1 && cfs[0]?.id) {
    const keep = cfs[0];
    if (targetCf <= 0) {
      dropIds.push(keep.id!);
    } else if (Math.abs(Number(keep.amount) - targetCf) >= 1) {
      updateCf = { id: keep.id!, amount: targetCf };
    }
  }

  const uniqueDrop = Array.from(new Set(dropIds));
  return {
    dropIds: uniqueDrop,
    updateCf,
    needsWork: uniqueDrop.length > 0 || updateCf != null,
  };
}

/**
 * Map tracker expense subcategory → obligation category.
 * IDs must match TRACKER_CATEGORIES (e.g. personal_loan, not personal_loan_emi).
 */
export const EXPENSE_SUBCATEGORY_TO_OBLIGATION: Record<string, string> = {
  home_loan_emi: "loan_emi",
  car_loan_emi: "loan_emi",
  personal_loan: "loan_emi",
  personal_loan_emi: "loan_emi",
  education_loan: "loan_emi",
  education_loan_emi: "loan_emi",
  bike_loan: "loan_emi",
  gold_loan_emi: "loan_emi",
  bnpl: "loan_emi",
  other_loan: "loan_emi",
  other_loan_emi: "loan_emi",
  credit_card: "credit_card",
  sip: "investment_sip",
  mutual_fund: "investment_sip",
  ppf: "investment_ppf",
  epf: "investment_ppf",
  nps: "investment_ppf",
  fd: "investment_fd",
  rd: "investment_fd",
  rent: "rent",
  life_insurance: "insurance_life",
  health_insurance: "insurance_health",
  insurance_premium: "insurance_life",
};
