import type {
  FinancialProfile,
  UnifiedLoanType,
} from "@/lib/analyse-form-schema";
import { UNIFIED_LOAN_TYPE_VALUES } from "@/lib/analyse-form-schema";

export type AssetSection = "cash" | "investments" | "physical" | "liabilities";

export type AssetFieldKey =
  | "savingsAccountBalance"
  | "liquidMFValue"
  | "otherLiquidSavings"
  | "mfValue"
  | "fdValue"
  | "ppfBalance"
  | "epfBalance"
  | "npsBalance"
  | "indianStocksValue"
  | "usStocksValueINR"
  | "usMFValueINR"
  | "rsuValueINR"
  | "totalEquityValue"
  | "goldValue"
  | "homeMarketValue"
  | "carMarketValue"
  | "otherAssets";

export type AssetCatalogItem = {
  field?: AssetFieldKey;
  id: string;
  label: string;
  section: AssetSection;
  /** Extra fields shown when adding/editing this kind of item. */
  extras?: Array<
    "lenderName" | "monthlyEMI" | "interestRate" | "remainingMonths"
  >;
  loanType?: UnifiedLoanType;
  custom?: boolean;
};

export const CASH_CATALOG: AssetCatalogItem[] = [
  {
    id: "savings",
    field: "savingsAccountBalance",
    label: "Bank / savings account",
    section: "cash",
  },
  {
    id: "liquid-mf",
    field: "liquidMFValue",
    label: "Liquid mutual funds",
    section: "cash",
  },
  {
    id: "other-liquid",
    field: "otherLiquidSavings",
    label: "Other liquid savings",
    section: "cash",
  },
];

export const INVESTMENT_CATALOG: AssetCatalogItem[] = [
  { id: "mf", field: "mfValue", label: "Mutual funds", section: "investments" },
  {
    id: "equity",
    field: "totalEquityValue",
    label: "Equity / stocks / RSU",
    section: "investments",
  },
  {
    id: "fd",
    field: "fdValue",
    label: "Fixed deposits",
    section: "investments",
  },
  { id: "ppf", field: "ppfBalance", label: "PPF", section: "investments" },
  { id: "epf", field: "epfBalance", label: "EPF", section: "investments" },
  { id: "nps", field: "npsBalance", label: "NPS", section: "investments" },
  {
    id: "indian-stocks",
    field: "indianStocksValue",
    label: "Indian stocks",
    section: "investments",
  },
  {
    id: "us-stocks",
    field: "usStocksValueINR",
    label: "US stocks (INR)",
    section: "investments",
  },
  {
    id: "us-mf",
    field: "usMFValueINR",
    label: "US mutual funds (INR)",
    section: "investments",
  },
  {
    id: "rsu",
    field: "rsuValueINR",
    label: "RSU / ESOP (INR)",
    section: "investments",
  },
  {
    id: "custom",
    label: "Other investment",
    section: "investments",
    custom: true,
  },
];

export const PHYSICAL_CATALOG: AssetCatalogItem[] = [
  {
    id: "home",
    field: "homeMarketValue",
    label: "Home / property",
    section: "physical",
  },
  {
    id: "car",
    field: "carMarketValue",
    label: "Car / vehicle",
    section: "physical",
  },
  { id: "gold", field: "goldValue", label: "Gold", section: "physical" },
  {
    id: "other-assets",
    field: "otherAssets",
    label: "Other assets",
    section: "physical",
  },
];

export const LIABILITY_CATALOG: AssetCatalogItem[] =
  UNIFIED_LOAN_TYPE_VALUES.map((loanType) => ({
    id: `loan-${loanType}`,
    label: loanType
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    section: "liabilities" as const,
    loanType,
    extras: [
      "lenderName",
      "monthlyEMI",
      "interestRate",
      "remainingMonths",
    ] as AssetCatalogItem["extras"],
  }));

export function catalogForSection(section: AssetSection): AssetCatalogItem[] {
  switch (section) {
    case "cash":
      return CASH_CATALOG;
    case "investments":
      return INVESTMENT_CATALOG;
    case "physical":
      return PHYSICAL_CATALOG;
    case "liabilities":
      return LIABILITY_CATALOG;
  }
}

function n(v: unknown): number {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? Math.max(0, x) : 0;
}

export function getScalarAssetValue(
  profile: FinancialProfile,
  field: AssetFieldKey,
): number {
  return n(profile[field]);
}

export function patchScalarAsset(
  profile: FinancialProfile,
  field: AssetFieldKey,
  value: number,
): FinancialProfile {
  const amount = n(value);
  const next: FinancialProfile = { ...profile, [field]: amount };

  if (field === "homeMarketValue") {
    next.ownsHome = amount > 0 ? true : profile.ownsHome;
  }
  if (field === "carMarketValue") {
    next.ownsCar = amount > 0 ? true : profile.ownsCar;
  }
  if (field === "totalEquityValue" && amount > 0) {
    // Prefer blended equity total when user edits the combined field.
    next.totalEquityValue = amount;
  }
  return next;
}

export type LoanDraft = {
  id?: string;
  loanType: UnifiedLoanType;
  lenderName?: string;
  monthlyEMI: number;
  outstandingAmount: number;
  interestRate?: number;
  remainingMonths?: number;
};

export function upsertUnifiedLoan(
  profile: FinancialProfile,
  draft: LoanDraft,
): FinancialProfile {
  const loans = [...(profile.unifiedLoans ?? [])];
  const id = draft.id?.trim() || `loan-${Date.now()}`;
  const row = {
    id,
    loanType: draft.loanType,
    lenderName: draft.lenderName?.trim() || undefined,
    monthlyEMI: n(draft.monthlyEMI),
    outstandingAmount: n(draft.outstandingAmount),
    interestRate:
      draft.interestRate != null ? n(draft.interestRate) : undefined,
    remainingMonths:
      draft.remainingMonths != null
        ? Math.round(n(draft.remainingMonths))
        : undefined,
  };
  const idx = loans.findIndex((l) => l.id === id);
  if (idx >= 0) loans[idx] = { ...loans[idx], ...row };
  else loans.push(row);
  return { ...profile, unifiedLoans: loans };
}

export function removeUnifiedLoan(
  profile: FinancialProfile,
  loanId: string,
): FinancialProfile {
  const loans = (profile.unifiedLoans ?? []).filter((l) => l.id !== loanId);
  return { ...profile, unifiedLoans: loans };
}

export type CustomInvestmentDraft = {
  index?: number;
  label: string;
  currentValue: number;
  monthlyContribution?: number;
  type?: "equity" | "debt" | "real_estate" | "other";
};

export function upsertCustomInvestment(
  profile: FinancialProfile,
  draft: CustomInvestmentDraft,
): FinancialProfile {
  const list = [...(profile.customInvestments ?? [])];
  const row = {
    label: draft.label.trim() || "Other investment",
    currentValue: n(draft.currentValue),
    monthlyContribution: n(draft.monthlyContribution),
    type: draft.type ?? ("other" as const),
  };
  if (draft.index != null && draft.index >= 0 && draft.index < list.length) {
    list[draft.index] = row;
  } else {
    list.push(row);
  }
  return { ...profile, customInvestments: list };
}

export function removeCustomInvestment(
  profile: FinancialProfile,
  index: number,
): FinancialProfile {
  const list = [...(profile.customInvestments ?? [])];
  if (index < 0 || index >= list.length) return profile;
  list.splice(index, 1);
  return { ...profile, customInvestments: list };
}
