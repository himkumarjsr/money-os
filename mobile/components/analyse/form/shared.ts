import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
  step7Schema,
  type AnalyseFormValues,
  type UnifiedLoanType,
} from "@/lib/analyse-form-schema";
import { formatIndian } from "@/lib/formatters";
import {
  emergencyFundSuggestionFor,
  type AnalyseFormUiState,
} from "./formState";

export const STEPS = [
  { title: "Personal profile", short: "Profile" },
  { title: "Income", short: "Income" },
  { title: "Fixed obligations", short: "Obligations" },
  { title: "Living expenses", short: "Expenses" },
  { title: "Insurance coverage", short: "Insurance" },
  { title: "Assets and savings", short: "Assets" },
  { title: "Goals", short: "Goals" },
] as const;

export const STEP_SCHEMAS = [
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
  step7Schema,
] as const;

export const LOAN_TYPE_OPTIONS: Array<{
  value: UnifiedLoanType;
  label: string;
}> = [
  { value: "home_loan", label: "Home loan" },
  { value: "personal_loan", label: "Personal loan" },
  { value: "car_loan", label: "Car loan" },
  { value: "bike_loan", label: "Two-wheeler loan" },
  { value: "education_loan", label: "Education loan" },
  { value: "pf_loan", label: "PF / EPF loan" },
  { value: "overdraft", label: "Overdraft (OD)" },
  { value: "gold_loan", label: "Gold loan" },
  { value: "business_loan", label: "Business loan" },
  { value: "credit_card", label: "Credit card" },
  { value: "other", label: "Other loan" },
];

export const CUSTOM_INVESTMENT_TYPE_OPTIONS = [
  { value: "equity", label: "Equity" },
  { value: "debt", label: "Debt" },
  { value: "real_estate", label: "Real estate" },
  { value: "other", label: "Other" },
] as const;

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export { initialUiState, type AnalyseFormUiState } from "./formState";

export type PatchUi = (patch: Partial<AnalyseFormUiState>) => void;

export function detectLastStep(
  profile: Partial<AnalyseFormValues> | null,
): number {
  const p = profile ?? {};
  if (
    (p.retirementTargetCorpus ?? 0) > 0 ||
    (p.emergencyFundTarget ?? 0) > 0 ||
    (p.kidsEducationFundTarget ?? 0) > 0 ||
    (p.kidsMarriageFundTarget ?? 0) > 0 ||
    (p.homePurchaseTarget ?? 0) > 0
  ) {
    return 6;
  }
  if (
    (p.mfValue ?? 0) > 0 ||
    (p.epfBalance ?? 0) > 0 ||
    (p.fdValue ?? 0) > 0 ||
    (p.savingsAccountBalance ?? 0) > 0 ||
    (p.ppfBalance ?? 0) > 0 ||
    (p.medicalEmergencyFund ?? 0) > 0 ||
    (p.emergencyFundCurrent ?? 0) > 0
  ) {
    return 5;
  }
  if (
    p.hasHealthInsurance ||
    p.hasTermInsurance ||
    (p.healthInsurancePremiumInput ?? 0) > 0 ||
    (p.termInsurancePremiumInput ?? 0) > 0
  ) {
    return 4;
  }
  const food =
    (p.foodTotal ?? 0) > 0
      ? (p.foodTotal ?? 0)
      : (p.vegetables ?? 0) + (p.grocery ?? 0);
  if (
    food > 0 ||
    (p.utilityTotal ?? 0) > 0 ||
    (p.electricity ?? 0) > 0 ||
    (p.transportTotal ?? 0) > 0 ||
    (p.fuel ?? 0) > 0
  ) {
    return 3;
  }
  const hasHomeLoanFlow =
    (p.homeLoanEMI ?? 0) > 0 ||
    (p.unifiedLoans ?? []).some(
      (l) => l.loanType === "home_loan" && (l.monthlyEMI ?? 0) > 0,
    );
  if ((p.rentAmount ?? 0) > 0 || hasHomeLoanFlow) {
    return 2;
  }
  if ((p.monthlySalary ?? 0) > 0) {
    return 1;
  }
  return 0;
}

export function sum(values: Array<number | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

/** Mirrors web `formatCurrency(value, "en-IN", "INR")` (max 2 decimals). */
export function formatCurrencyINR(value: number): string {
  if (!Number.isFinite(value)) return "₹0";
  const sign = value < 0 ? "-" : "";
  return `${sign}₹${formatIndian(Math.round(Math.abs(value) * 100) / 100)}`;
}

export function mergeHelpers(...helpers: Array<string | undefined>) {
  return helpers.filter(Boolean).join(" · ");
}

export type NoteTone = "yellow" | "red" | "green" | "blue";

/** Live (non-input) numbers the web form derives from `watch()` on every render. */
export function computeLiveTotals(v: Partial<AnalyseFormValues>) {
  const lifeStage = v.lifeStage;
  const ownsHome = v.ownsHome;
  const ownsCar = v.ownsCar;

  const totalIncome = sum([
    v.monthlySalary,
    lifeStage !== "bachelor" ? v.spouseIncome : 0,
    v.otherIncome,
  ]);

  const homeLoanEmiLive = (() => {
    const rows = v.unifiedLoans ?? [];
    const fromUnified = rows
      .filter((r) => r.loanType === "home_loan")
      .reduce((s, r) => s + (r.monthlyEMI ?? 0), 0);
    if (fromUnified > 0) return fromUnified;
    return v.homeLoanEMI ?? 0;
  })();

  const fixedObligations = sum([
    v.rentAmount,
    (v.rentAmount ?? 0) > 0 ? v.rentMaintenanceMonthly : 0,
    v.secondPropertyEMI,
    v.creditCardBillMonthly,
    v.creditCardEmiMonthly,
    ...(v.unifiedLoans ?? []).map((row) => row.monthlyEMI ?? 0),
  ]);

  const monthlyLivingExpenses = sum([
    (v.foodTotal ?? 0) > 0
      ? v.foodTotal
      : sum([v.vegetables, v.grocery, v.medicine]),
    (v.transportTotal ?? 0) > 0 ? v.transportTotal : sum([v.fuel, v.cabMetro]),
    (v.utilityTotal ?? 0) > 0
      ? v.utilityTotal
      : sum([v.electricity, v.internet, v.gas, v.water]),
    (v.domesticHelpTotal ?? 0) > 0
      ? v.domesticHelpTotal
      : sum([v.houseHelpMonthly, v.cookHelpMonthly]),
    (v.lifestyleTotal ?? 0) > 0
      ? v.lifestyleTotal
      : sum([v.entertainment, v.shopping, v.personalCare]),
    lifeStage === "kids" ? v.kidsSchoolFees : 0,
    lifeStage === "kids" ? v.kidsActivities : 0,
    v.parentsSupport,
  ]);

  const { months: emergencyFundMonths, amount: emergencyFundSuggestion } =
    emergencyFundSuggestionFor(v, monthlyLivingExpenses + fixedObligations);

  const selfAge = v.selfAge;
  const retirementAge = v.retirementAge ?? 60;
  const retirementYears =
    selfAge && retirementAge ? Math.max(0, retirementAge - selfAge) : undefined;

  const hasEligibleGirlChild = (v.kidsGenders ?? []).some(
    (gender, index) => gender === "girl" && (v.kidsAges?.[index] ?? 99) < 10,
  );

  const investmentsEmpty = !sum([
    v.fdValue,
    v.liquidMFValue,
    v.totalEquityValue,
    v.mfValue,
    v.indianStocksValue,
    v.usStocksValueINR,
    v.usMFValueINR,
    v.rsuValueINR,
    v.ppfBalance,
    v.npsBalance,
    v.epfBalance,
    ...(v.customInvestments ?? []).map((inv) => inv.currentValue),
  ]);

  const monthlyNeedsForEmergency = monthlyLivingExpenses + fixedObligations;
  const erSavings = v.savingsAccountBalance ?? 0;
  const erLiq = v.liquidMFValue ?? 0;
  const erFd = v.fdValue ?? 0;
  const erOther = v.otherLiquidSavings ?? 0;
  const erSavingsCounted = erSavings * 1;
  const erLiqCounted = erLiq * 0.95;
  const erFdCounted = erFd * 0.7;
  const erOtherCounted = erOther * 0.5;
  const erTotal =
    erSavingsCounted + erLiqCounted + erFdCounted + erOtherCounted;
  const erMonths =
    monthlyNeedsForEmergency > 0 ? erTotal / monthlyNeedsForEmergency : 0;
  const erMonthsColor =
    monthlyNeedsForEmergency <= 0
      ? "#64748B"
      : erMonths >= 6
        ? "#059669"
        : erMonths >= 3
          ? "#D97706"
          : "#DC2626";

  const estimatedAssets = sum([
    v.savingsAccountBalance,
    v.fdValue,
    v.liquidMFValue,
    v.emergencyFundCurrent,
    v.otherLiquidSavings,
    v.bereavementFund,
    v.mfValue,
    v.indianStocksValue,
    v.usStocksValueINR,
    v.usMFValueINR,
    v.rsuValueINR,
    v.ppfBalance,
    v.npsBalance,
    v.epfBalance,
    ownsHome ? v.homeMarketValue : 0,
    ownsCar ? v.carMarketValue : 0,
    v.goldValue,
    v.otherAssets,
    v.hasPostOfficeSchemes
      ? (v.postOfficeSchemes ?? []).reduce((s, row) => s + (row.amount ?? 0), 0)
      : v.investsInNsc
        ? v.nscDepositAmount
        : 0,
  ]);
  const estimatedLiabilities = sum([
    ownsHome ? v.homeLoanOutstanding : 0,
    ownsCar ? v.carLoanOutstanding : 0,
  ]);
  const estimatedNetWorth = estimatedAssets - estimatedLiabilities;

  const debtWarning =
    totalIncome > 0 && fixedObligations > totalIncome * 0.5
      ? "Your fixed obligations are above 50% of household income. That can make cash flow fragile."
      : null;

  const housingTotal = sum([
    v.rentAmount,
    homeLoanEmiLive,
    v.secondPropertyEMI,
  ]);
  const housingNote: { tone: NoteTone; text: string } | null = (() => {
    const rent = v.rentAmount ?? 0;
    const homeLoan = homeLoanEmiLive;
    const secondProperty = v.secondPropertyEMI ?? 0;
    if (rent > 0 && homeLoan > 0 && secondProperty > 0) {
      return {
        tone: "yellow",
        text: `Total housing obligation: ${formatCurrencyINR(housingTotal)}/month across rent + 2 properties`,
      };
    }
    if (rent > 0 && homeLoan > 0) {
      return {
        tone: "blue",
        text: "You have both rent and home loan. This is valid if your mortgaged property is rented out and you live in a rented place.",
      };
    }
    if (homeLoan > 0 || secondProperty > 0) {
      return {
        tone: "green",
        text:
          secondProperty > 0 && homeLoan === 0
            ? `Second property EMI — ${formatCurrencyINR(housingTotal)}/month`
            : `Home loan EMI — ${formatCurrencyINR(housingTotal)}/month`,
      };
    }
    return null;
  })();

  return {
    totalIncome,
    homeLoanEmiLive,
    fixedObligations,
    monthlyLivingExpenses,
    emergencyFundSuggestion,
    emergencyFundMonths,
    retirementYears,
    hasEligibleGirlChild,
    investmentsEmpty,
    monthlyNeedsForEmergency,
    erSavings,
    erLiq,
    erFd,
    erOther,
    erSavingsCounted,
    erLiqCounted,
    erFdCounted,
    erOtherCounted,
    erTotal,
    erMonths,
    erMonthsColor,
    estimatedNetWorth,
    debtWarning,
    housingNote,
  };
}

export type LiveTotals = ReturnType<typeof computeLiveTotals>;

export type StepProps = {
  live: LiveTotals;
  ui: AnalyseFormUiState;
  patchUi: PatchUi;
};
