import {
  clearLegacyLoanScalars,
  mergeAnalyseDraftWithProfile,
  type AnalyseFormValues,
  type AnalyseSubmitIssue,
} from "@/lib/analyse-form-schema";
import { emergencyFundMonthsNeeded } from "@/lib/financialEngine";

export type UnifiedLoanRows = NonNullable<AnalyseFormValues["unifiedLoans"]>;

/**
 * Merge saved draft with the last submitted profile for resume. The draft always
 * carries `unifiedLoans` (often `[]` from autosave), which would otherwise mask
 * loans that only exist on the last submission.
 */
export function mergeResumeDraft(
  profileForm: Partial<AnalyseFormValues>,
  draft: Partial<AnalyseFormValues>,
  loansClearedByUser = false,
): Partial<AnalyseFormValues> {
  if (loansClearedByUser) {
    return {
      ...mergeAnalyseDraftWithProfile(profileForm, draft),
      unifiedLoans: [],
      ...clearLegacyLoanScalars(),
    };
  }
  const draftHasRows = (draft.unifiedLoans?.length ?? 0) > 0;
  const profileHasRows = (profileForm.unifiedLoans?.length ?? 0) > 0;
  if (!draftHasRows && profileHasRows) {
    const { unifiedLoans: _ignored, ...draftWithoutLoans } = draft;
    return mergeAnalyseDraftWithProfile(profileForm, draftWithoutLoans);
  }
  return mergeAnalyseDraftWithProfile(profileForm, draft);
}

/** Set when the user answers No to "any loans?" so resume doesn't bring last submission's loans back. */
export const LOANS_CLEARED_KEY = "finkoin_analyse_loans_cleared";

type FlagStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readLoansCleared(storage: FlagStorage | null): boolean {
  try {
    return storage?.getItem(LOANS_CLEARED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeLoansCleared(
  storage: FlagStorage | null,
  cleared: boolean,
): void {
  try {
    if (cleared) storage?.setItem(LOANS_CLEARED_KEY, "1");
    else storage?.removeItem(LOANS_CLEARED_KEY);
  } catch {
    // storage unavailable
  }
}

export type LoanUiState = {
  hasLoans: boolean;
  /** Row ids (not RHF field keys) of loan cards shown as collapsed summaries. */
  savedLoanIds: string[];
};

export function resumeLoanUiState(loans: UnifiedLoanRows): LoanUiState {
  return {
    hasLoans: loans.length > 0,
    savedLoanIds: loans
      .filter((row) => Boolean(row.id) && Number(row.monthlyEMI ?? 0) > 0)
      .map((row) => row.id as string),
  };
}

export function startFreshLoanUiState(): LoanUiState & {
  unifiedLoans: UnifiedLoanRows;
} {
  return { hasLoans: false, savedLoanIds: [], unifiedLoans: [] };
}

/** Draft to persist immediately when the "any loans?" toggle flips to No. */
export function loansOffDraft(values: AnalyseFormValues): AnalyseFormValues {
  return { ...values, unifiedLoans: [], ...clearLegacyLoanScalars() };
}

type VehicleSource = Pick<
  AnalyseFormValues,
  | "carLoanEMI"
  | "carMarketValue"
  | "bikeEMI"
  | "unifiedLoans"
  | "carInsurancePremiumInput"
  | "bikeInsurancePremiumInput"
>;

/** Vehicle facts entered on other steps (loans / assets) — the toggle cannot override these. */
export function vehicleFromAssets(values: Partial<VehicleSource>): boolean {
  if ((values.carLoanEMI ?? 0) > 0) return true;
  if ((values.carMarketValue ?? 0) > 0) return true;
  if ((values.bikeEMI ?? 0) > 0) return true;
  return (values.unifiedLoans ?? []).some(
    (row) =>
      (row.loanType === "car_loan" || row.loanType === "bike_loan") &&
      Number(row.monthlyEMI ?? 0) > 0,
  );
}

export function deriveHasVehicle(values: Partial<VehicleSource>): boolean {
  return (
    vehicleFromAssets(values) ||
    (values.carInsurancePremiumInput ?? 0) > 0 ||
    (values.bikeInsurancePremiumInput ?? 0) > 0
  );
}

/**
 * `optIn` only covers the gap between tapping Yes and typing a premium; once any
 * number exists the derived value takes over, so the toggle can't stick on Yes.
 */
export function vehicleToggleOn(
  values: Partial<VehicleSource>,
  optIn: boolean,
): boolean {
  return deriveHasVehicle(values) || optIn;
}

export function vehicleOffPatch(): Partial<AnalyseFormValues> {
  return {
    carInsurancePremiumInput: 0,
    bikeInsurancePremiumInput: 0,
    carInsuranceRenewalMonth: undefined,
    carInsuranceRenewalDay: undefined,
    bikeInsuranceRenewalMonth: undefined,
    bikeInsuranceRenewalDay: undefined,
  };
}

/** Fields cleared when "Do you own a car?" flips to No — the car purchase goal is untouched. */
export function ownsCarOffPatch(): Partial<AnalyseFormValues> {
  return { carMarketValue: 0, carLoanOutstanding: 0 };
}

export function emergencyFundSuggestion(
  values: Parameters<typeof emergencyFundMonthsNeeded>[0],
  monthlyBase: number,
): number | undefined {
  if (!(monthlyBase > 0)) return undefined;
  return Math.round(monthlyBase * emergencyFundMonthsNeeded(values));
}

export type EmergencyAutoFillState = { fired: boolean; userEdited: boolean };

export function decideEmergencyAutoFill({
  state,
  eligible,
  suggestion,
  currentValue,
}: {
  state: EmergencyAutoFillState;
  eligible: boolean;
  suggestion: number | undefined;
  currentValue: number | undefined;
}): { fill: number | null; next: EmergencyAutoFillState } {
  if (state.fired || state.userEdited) return { fill: null, next: state };
  if (!eligible || !suggestion || suggestion <= 0) {
    return { fill: null, next: state };
  }
  if ((currentValue ?? 0) > 0) {
    return { fill: null, next: { ...state, fired: true } };
  }
  return { fill: suggestion, next: { ...state, fired: true } };
}

/** Digits typed so far, uncoerced (no clamping while the user is typing). */
export function parseYearDraft(raw: string): number | undefined {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return undefined;
  return Number(digits);
}

export function clampYearOnBlur(
  raw: string,
  min: number,
  max: number,
): number | undefined {
  const year = parseYearDraft(raw);
  if (year === undefined || year === 0) return undefined;
  return Math.min(max, Math.max(min, year));
}

/** Blank stays undefined so validation catches it; a typed 0 is a valid age. */
export function parseKidAgeInput(raw: unknown): number | undefined {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : undefined;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export function resizeKidsAges(
  ages: ReadonlyArray<number | null | undefined> | undefined,
  count: number,
): Array<number | undefined> {
  const size = Math.max(0, Math.floor(count));
  return Array.from({ length: size }, (_, index) => {
    const age = ages?.[index];
    return typeof age === "number" && Number.isFinite(age) ? age : undefined;
  });
}

/** One RHF error per dotted path (first message wins), skipping form-level issues. */
export function issuesToFieldErrors(
  issues: ReadonlyArray<AnalyseSubmitIssue>,
): Array<{ name: string; message: string }> {
  const seen = new Set<string>();
  const out: Array<{ name: string; message: string }> = [];
  for (const issue of issues) {
    const name = issue.path.map(String).join(".");
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({ name, message: issue.message });
  }
  return out;
}
