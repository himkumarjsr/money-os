/**
 * Pure analyse-form state logic (no React / react-native) so it can be unit
 * tested from the repo root with vitest.
 */
import {
  clearLegacyLoanScalars,
  mergeAnalyseDraftWithProfile,
  parseMoneyInput,
  type AnalyseFormValues,
  type FinancialProfile,
} from "@/lib/analyse-form-schema";
import { emergencyFundMonthsNeeded } from "@/lib/financialEngine";

type UnifiedLoanRow = NonNullable<AnalyseFormValues["unifiedLoans"]>[number];

/** UI-only toggles that are not schema fields (web keeps these in component state). */
export type AnalyseFormUiState = {
  isRenting: boolean;
  hasLoans: boolean;
  hasCreditCardOutstanding: boolean;
  /** Persisted `unifiedLoans[i].id` of loan cards collapsed to a summary. */
  savedLoanIds: string[];
};

export function initialUiState(
  lastSubmission: FinancialProfile | null | undefined,
): AnalyseFormUiState {
  return {
    isRenting: (lastSubmission?.rentAmount || 0) > 0,
    hasLoans:
      (lastSubmission?.unifiedLoans?.length ?? 0) > 0 ||
      (lastSubmission?.homeLoanEMI || 0) > 0 ||
      (lastSubmission?.personalLoanEMI || 0) > 0 ||
      (lastSubmission?.carLoanEMI || 0) > 0,
    hasCreditCardOutstanding:
      (lastSubmission?.creditCardBillMonthly || 0) > 0 ||
      (lastSubmission?.creditCardEmiMonthly || 0) > 0 ||
      (lastSubmission?.creditCardCarriedBalance || 0) > 0,
    savedLoanIds: [],
  };
}

/** "Start fresh": every UI toggle back to an empty form, including all loan card state. */
export function startFreshUiState(): AnalyseFormUiState {
  return initialUiState(null);
}

const hasRows = (rows: unknown[] | undefined) => (rows?.length ?? 0) > 0;

/**
 * Draft always carries `unifiedLoans` (store merges defaults in), so a plain
 * merge lets an empty draft array wipe loans from the last submission. Loans
 * come from whichever source actually has rows (draft first).
 */
export function mergeResumeValues(
  profileForm: Partial<AnalyseFormValues>,
  draft: Partial<AnalyseFormValues>,
  loansClearedByUser = false,
): Partial<AnalyseFormValues> {
  if (loansClearedByUser) {
    return {
      ...mergeAnalyseDraftWithProfile(profileForm, draft),
      ...loansOffPatch(),
    };
  }
  const draftForMerge = { ...draft };
  if (!hasRows(draft.unifiedLoans) && hasRows(profileForm.unifiedLoans)) {
    delete draftForMerge.unifiedLoans;
  }
  return mergeAnalyseDraftWithProfile(profileForm, draftForMerge);
}

/** Set when the user answers No to "any loans?" so resume doesn't bring last submission's loans back. */
export const LOANS_CLEARED_KEY = "finkoin_analyse_loans_cleared";

type FlagStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function readLoansCleared(storage: FlagStorage): boolean {
  return storage.getItem(LOANS_CLEARED_KEY) === "1";
}

export function writeLoansCleared(storage: FlagStorage, cleared: boolean) {
  if (cleared) storage.setItem(LOANS_CLEARED_KEY, "1");
  else storage.removeItem(LOANS_CLEARED_KEY);
}

/** Loan UI restored on resume: toggle on when rows exist; filled rows start collapsed. */
export function loanUiFromRows(
  rows: AnalyseFormValues["unifiedLoans"],
): Pick<AnalyseFormUiState, "hasLoans" | "savedLoanIds"> {
  const list = rows ?? [];
  return {
    hasLoans: list.length > 0,
    savedLoanIds: list
      .filter((row) => Number(row?.monthlyEMI ?? 0) > 0 && !!row?.id)
      .map((row) => row.id as string),
  };
}

/** Values written to the form and draft when "Do you have any loan EMIs?" flips to No. */
export function loansOffPatch(): Partial<AnalyseFormValues> {
  return { ...clearLegacyLoanScalars(), unifiedLoans: [] };
}

export const UNIFIED_LOAN_TYPES = [
  "home_loan",
  "personal_loan",
  "car_loan",
  "bike_loan",
  "education_loan",
  "pf_loan",
  "overdraft",
  "gold_loan",
  "business_loan",
  "credit_card",
  "other",
] as const;

/**
 * Drops blank loan rows / obligations with no visible fields so stale rows
 * can't block validation, and canonicalises lender names + OD usage.
 */
export function cleanLoansAndObligations(values: Partial<AnalyseFormValues>): {
  unifiedLoans: UnifiedLoanRow[];
  additionalObligations: NonNullable<
    AnalyseFormValues["additionalObligations"]
  >;
} {
  const additionalObligations = (values.additionalObligations ?? []).filter(
    (row) => {
      const type = String(row?.type ?? "").trim();
      const amt = Number(row?.monthlyAmount ?? 0);
      return type.length > 0 && Number.isFinite(amt) && amt > 0;
    },
  );
  const unifiedLoans = (values.unifiedLoans ?? [])
    .filter((row) => Number(row?.monthlyEMI ?? 0) > 0)
    .map((row) => {
      const raw = String(row?.loanType ?? "").trim();
      const ok = (UNIFIED_LOAN_TYPES as readonly string[]).includes(raw);
      const loanType = ok ? row.loanType : ("other" as const);
      const lenderName =
        typeof row?.lenderName === "string"
          ? row.lenderName.toUpperCase().trim()
          : row?.lenderName;
      const outstanding = Number(row?.outstandingAmount ?? 0) || 0;
      return {
        ...row,
        loanType,
        lenderName,
        outstandingAmount: outstanding,
        odUsed:
          loanType === "overdraft"
            ? outstanding || Number(row?.odUsed ?? 0) || 0
            : Number(row?.odUsed ?? 0) || 0,
      };
    });
  return { unifiedLoans, additionalObligations };
}

/** Vehicle section visibility comes from the numbers themselves, never a sticky flag. */
export function deriveHasVehicle(v: Partial<AnalyseFormValues>): boolean {
  return (
    (v.carLoanEMI || 0) > 0 ||
    (v.carMarketValue || 0) > 0 ||
    (v.bikeEMI || 0) > 0 ||
    (v.carInsurancePremiumInput || 0) > 0 ||
    (v.bikeInsurancePremiumInput || 0) > 0 ||
    (v.unifiedLoans ?? []).some(
      (row) =>
        (row.loanType === "car_loan" || row.loanType === "bike_loan") &&
        (row.monthlyEMI || 0) > 0,
    )
  );
}

/**
 * An explicit Yes/No answer on the current screen wins; with no answer
 * (null) the derived value shows. The answer is never persisted, so it can't
 * outlive the screen and get stuck.
 */
export function resolveVehicleToggle(
  answer: boolean | null,
  derived: boolean,
): boolean {
  return answer ?? derived;
}

/** Turning "own a car" off clears the owned-car numbers but keeps a buy-car goal. */
export function ownsCarOffPatch(): Partial<AnalyseFormValues> {
  return { carMarketValue: 0, carLoanOutstanding: 0 };
}

export function emergencyFundSuggestionFor(
  values: Partial<AnalyseFormValues>,
  monthlyNeeds: number,
): { months: number; amount: number | undefined } {
  const months = emergencyFundMonthsNeeded(values);
  return {
    months,
    amount: monthlyNeeds > 0 ? monthlyNeeds * months : undefined,
  };
}

export function shouldAutoFillEmergencyTarget(input: {
  alreadyFired: boolean;
  primaryGoal: string | undefined;
  suggestion: number | undefined;
  currentValue: number | undefined;
  userEdited: boolean;
}): boolean {
  if (input.alreadyFired || input.userEdited) return false;
  if (input.primaryGoal !== "build_emergency_fund") return false;
  if (!input.suggestion || input.suggestion <= 0) return false;
  return (input.currentValue ?? 0) <= 0;
}

const MONEY_SEPARATORS = /[,\s₹]/g;

/** Focus: blank the text only when the stored value is 0 / empty. */
export function moneyTextOnFocus(text: string, value: unknown): string {
  const n = typeof value === "number" ? value : parseMoneyInput(value);
  if (n === undefined || !Number.isFinite(n) || n === 0) return "";
  return text;
}

/** Blur: empty (after stripping `,` spaces `₹`) snaps to 0; otherwise keep the parsed number. */
export function moneyValueOnBlur(text: string): {
  value: number;
  empty: boolean;
} {
  const stripped = text.replace(MONEY_SEPARATORS, "");
  if (!stripped) return { value: 0, empty: true };
  const n = parseMoneyInput(stripped);
  if (n === undefined) return { value: 0, empty: true };
  return { value: n, empty: false };
}

/** Year / age inputs: free typing, clamp once on blur. Blank means "not set" (0). */
export function clampYearOnBlur(
  raw: string,
  min?: number,
  max?: number,
): number {
  const clean = raw.replace(/[,\s]/g, "");
  if (!clean || clean === ".") return 0;
  const parsed = Math.round(Number(clean));
  if (!Number.isFinite(parsed) || parsed === 0) return 0;
  let next = parsed;
  if (min !== undefined) next = Math.max(min, next);
  if (max !== undefined) next = Math.min(max, next);
  return next;
}

/** One slot per kid; existing answers (incl. a typed 0) kept, new slots undefined. */
export function resizeKidSlots<T>(
  slots: Array<T | undefined> | undefined,
  count: number,
): Array<T | undefined> {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  return Array.from({ length: n }, (_, i) => slots?.[i]);
}
