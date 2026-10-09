import type { SmartBudget } from "@/lib/universal-buckets";
import { z } from "zod";
import {
  RISK_TOLERANCE_VALUES,
  scoreRiskTolerance,
  type RiskTolerance,
} from "@/lib/riskProfile";

/** Stable id for obligation / other-insurance field-array rows (persisted in profile + drafts). */
export function newAnalyseRowId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/** Zeros legacy per-type loan scalars when unified loans are cleared in the UI. */
export function clearLegacyLoanScalars(): Partial<AnalyseFormValues> {
  return {
    homeLoanEMI: 0,
    secondPropertyEMI: 0,
    personalLoanEMI: 0,
    carLoanEMI: 0,
    bikeEMI: 0,
    personalLoanOutstanding: 0,
    homeLoanOutstanding: 0,
    carLoanOutstanding: 0,
    bikeOutstanding: 0,
    personalLoanLenderName: "",
    homeLoanLenderName: "",
    carLoanLenderName: "",
    bikeLoanLenderName: "",
    additionalObligations: [],
  };
}

export const LIFE_STAGE_VALUES = [
  "bachelor",
  "married",
  "kids",
  "senior",
] as const;

export type LifeStage = (typeof LIFE_STAGE_VALUES)[number];

export const LIFE_STAGE_LABELS: Record<LifeStage, string> = {
  bachelor: "Single / bachelor",
  married: "Married, no kids",
  kids: "Married with kids",
  senior: "Pre-retirement (50+)",
};

export const CITY_TIER_VALUES = ["metro", "tier2", "tier3"] as const;
export type CityTier = (typeof CITY_TIER_VALUES)[number];

export const CITY_TIER_LABELS: Record<CityTier, string> = {
  metro: "Metro (Mumbai / Delhi / Bengaluru / Chennai / Hyderabad / Pune)",
  tier2: "Tier 2 city",
  tier3: "Tier 3 city / town",
};

export const PRIMARY_GOAL_VALUES = [
  "buy_home",
  "clear_debt",
  "retire_early",
  "grow_wealth",
  "kids_education",
  "build_emergency_fund",
  "build_insurance_premium_fund",
  "buy_car",
] as const;

export type PrimaryGoal = (typeof PRIMARY_GOAL_VALUES)[number];

export const PRIMARY_GOAL_LABELS: Record<PrimaryGoal, string> = {
  buy_home: "Buy a home",
  clear_debt: "Clear all debt",
  retire_early: "Retire early",
  grow_wealth: "Grow wealth",
  kids_education: "Kids education fund",
  build_emergency_fund: "Build emergency fund",
  build_insurance_premium_fund: "Insurance premium reserve (financial freedom)",
  buy_car: "Buy a car",
};

export const PREMIUM_FREQUENCY_VALUES = ["monthly", "yearly"] as const;
export type PremiumFrequency = (typeof PREMIUM_FREQUENCY_VALUES)[number];
export const KID_GENDER_VALUES = ["boy", "girl"] as const;
export type KidGender = (typeof KID_GENDER_VALUES)[number];

/** India Post / National Savings schemes (lump-sum or balance holdings). */
export const POST_OFFICE_SCHEME_VALUES = [
  "savings_account",
  "recurring_deposit",
  "time_deposit",
  "nsc",
  "kvp",
  "mis",
  "scss",
  "mssc",
  "other",
] as const;
export type PostOfficeSchemeId = (typeof POST_OFFICE_SCHEME_VALUES)[number];
export const POST_OFFICE_SCHEME_LABELS: Record<PostOfficeSchemeId, string> = {
  savings_account: "Post Office Savings Account",
  recurring_deposit: "National Savings Recurring Deposit (RD)",
  time_deposit: "Post Office Time Deposit (TD)",
  nsc: "National Savings Certificate (NSC)",
  kvp: "Kisan Vikas Patra (KVP)",
  mis: "Monthly Income Scheme (MIS)",
  scss: "Senior Citizen Savings Scheme (SCSS)",
  mssc: "Mahila Samman Savings Certificate",
  other: "Other post office scheme",
};

export const ADDITIONAL_OBLIGATION_TYPE_VALUES = [
  "Personal Loan",
  "Marriage Loan",
  "Home Loan",
  "Car Loan",
  "Bike Loan",
  "Education Loan",
  "Medical Loan",
  "Other Loan",
  "Overdraft (OD)",
  "Credit Card minimum due",
  "Other",
] as const;

export const UNIFIED_LOAN_TYPE_VALUES = [
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

export type UnifiedLoanType = (typeof UNIFIED_LOAN_TYPE_VALUES)[number];

export interface FinancialProfile {
  lifeStage: "bachelor" | "married" | "kids" | "senior";
  selfAge: number;
  spouseAge?: number;
  numberOfKids?: number;
  kidsAges?: number[];
  kidsGenders?: KidGender[];
  cityTier: "metro" | "tier2" | "tier3";

  monthlySalary: number;
  spouseIncome?: number;
  otherIncome?: number;

  rentAmount?: number;
  /** Society / flat maintenance when renting (monthly). */
  rentMaintenanceMonthly?: number;
  homeLoanEMI?: number;
  secondPropertyEMI?: number;
  carLoanEMI?: number;
  bikeEMI?: number;
  personalLoanEMI?: number;
  /** Optional: current principal / outstanding on the personal loan. EMI-only users can leave this unset. */
  personalLoanOutstanding?: number;
  personalLoanLenderName?: string;
  personalLoanRate?: number;
  personalLoanRemainingMonths?: number;
  homeLoanLenderName?: string;
  homeLoanRate?: number;
  homeLoanRemainingMonths?: number;
  carLoanLenderName?: string;
  carLoanRate?: number;
  carLoanRemainingMonths?: number;
  bikeLoanLenderName?: string;
  bikeLoanRate?: number;
  bikeLoanRemainingMonths?: number;
  bikeOutstanding?: number;
  /** Typical monthly payment toward credit cards (full pay-off or rolling balance). */
  creditCardBillMonthly?: number;
  /** Monthly EMIs on card purchases converted to EMI (counts under Loans). */
  creditCardEmiMonthly?: number;
  /** Card balance not paid in full and carried to next month (a debt). */
  creditCardCarriedBalance?: number;
  /** Optional EMI / bill debit day of month (1–31) for calendar reminders. */
  homeLoanEMIDay?: number;
  homeLoanEMIMonth?: number;
  carLoanEMIDay?: number;
  personalLoanEMIDay?: number;
  educationLoanEMIDay?: number;
  creditCardBillDay?: number;
  sipAutoDebitDay?: number;
  ppfDepositDay?: number;
  additionalObligations: Array<{
    id?: string;
    type: string;
    lenderName?: string;
    monthlyAmount: number;
    outstandingAmount?: number;
    tenureMonths?: number;
    loanTakenYear?: number;
  }>;
  unifiedLoans?: Array<{
    id?: string;
    loanType: UnifiedLoanType;
    lenderName?: string;
    monthlyEMI: number;
    outstandingAmount?: number;
    interestRate?: number;
    remainingMonths?: number;
    odLimit?: number;
    odUsed?: number;
    odInterestOnlyYears?: number;
    /** Day of month EMI is typically debited (1–31). */
    emiDay?: number;
    /** Calendar month of debit (1–12). Year is not collected. */
    emiMonth?: number;
    /** Tracker `financial_obligations.id` this loan is linked to (either direction). */
    trackerObligationId?: string;
    /** User skipped the one-time "outstanding + rate" ask for an imported Tracker loan. */
    detailsSkipped?: boolean;
  }>;

  /** @deprecated Use `foodTotal`; kept for backward compatibility. */
  vegetables: number;
  /** @deprecated Use `foodTotal`; kept for backward compatibility. */
  grocery: number;
  /** @deprecated Use `foodTotal`; kept for backward compatibility. */
  medicine: number;
  /** @deprecated Use `transportTotal`; kept for backward compatibility. */
  fuel: number;
  /** @deprecated Use `transportTotal`; kept for backward compatibility. */
  cabMetro: number;
  /** @deprecated Use `utilityTotal`; kept for backward compatibility. */
  electricity: number;
  /** @deprecated Use `utilityTotal`; kept for backward compatibility. */
  internet: number;
  /** @deprecated Use `utilityTotal`; kept for backward compatibility. */
  gas: number;
  /** @deprecated Use `utilityTotal`; kept for backward compatibility. */
  water?: number;
  /** @deprecated Use `domesticHelpTotal`; kept for backward compatibility. */
  houseHelpMonthly?: number;
  /** @deprecated Use `domesticHelpTotal`; kept for backward compatibility. */
  cookHelpMonthly?: number;
  /** @deprecated Use `lifestyleTotal`; kept for backward compatibility. */
  entertainment: number;
  /** @deprecated Use `lifestyleTotal`; kept for backward compatibility. */
  shopping: number;
  /** @deprecated Use `lifestyleTotal`; kept for backward compatibility. */
  personalCare?: number;
  foodTotal?: number;
  transportTotal?: number;
  utilityTotal?: number;
  domesticHelpTotal?: number;
  lifestyleTotal?: number;
  kidsSchoolFees?: number;
  kidsActivities?: number;
  parentsSupport?: number;
  parentsHealthInsuranceSumInsured?: number;
  parentsEmergencyCash?: number;
  parentsCity?: "metro" | "tier2" | "tier3";

  hasHealthInsurance: boolean;
  healthInsuranceSumInsured?: number;
  /** Monthly equivalent for engine / allocations (derived from input + frequency). */
  healthInsurancePremiumMonthly?: number;
  /** Raw premium as entered (e.g. yearly amount stays yearly in the wizard). */
  healthInsurancePremiumInput?: number;
  healthInsurancePremiumFrequency?: PremiumFrequency;
  /** Optional renewal calendar (1–12 / 1–31) for obligation reminders. */
  healthInsuranceRenewalMonth?: number;
  healthInsuranceRenewalDay?: number;
  hasTermInsurance: boolean;
  termInsuranceSumAssured?: number;
  termInsurancePremiumMonthly?: number;
  termInsurancePremiumInput?: number;
  termInsurancePremiumFrequency?: PremiumFrequency;
  termInsurancePremiumTillYear?: number;
  termInsuranceRenewalMonth?: number;
  termInsuranceRenewalDay?: number;
  carInsurancePremiumMonthly?: number;
  carInsurancePremiumInput?: number;
  carInsurancePremiumFrequency?: PremiumFrequency;
  carInsuranceRenewalMonth?: number;
  carInsuranceRenewalDay?: number;
  bikeInsurancePremiumMonthly?: number;
  bikeInsurancePremiumInput?: number;
  bikeInsurancePremiumFrequency?: PremiumFrequency;
  bikeInsuranceRenewalMonth?: number;
  bikeInsuranceRenewalDay?: number;
  otherInsurancePremiumMonthly?: number;
  otherInsurancePremiumInput?: number;
  otherInsurancePremiumFrequency?: PremiumFrequency;
  lifeInsuranceMaturityAmount?: number;
  lifeInsuranceMaturityYear?: number;
  /** Persisted for form rehydration (policies + names). */
  hasOtherInsurance?: boolean;
  otherInsurancePremiums?: Array<{
    id?: string;
    policyName?: string;
    /** As entered (monthly or yearly per `frequency`). */
    premiumAmount?: number;
    frequency?: PremiumFrequency;
    /** Monthly rupees (filled when persisting profile). */
    monthlyAmount?: number;
    maturityAmount?: number;
    maturityYear?: number;
    renewalMonth?: number;
    renewalDay?: number;
  }>;

  savingsAccountBalance: number;
  fdValue?: number;
  fdRate?: number;
  fdMaturityYear?: number;
  fdTenureYears?: number;
  liquidMFValue?: number;
  /** @deprecated Legacy ring-fenced amount from older wizard; merged into weighted emergency total at 100%. Prefer savings + liquid MF + FD + other liquid. */
  emergencyFundCurrent: number;
  /** Gold ETF, short-term bonds, money market, etc. — counts 50% toward accessible emergency fund. */
  otherLiquidSavings?: number;
  mfValue?: number;
  indianStocksValue?: number;
  usStocksValueINR?: number;
  usMFValueINR?: number;
  rsuValueINR?: number;
  totalEquityValue?: number;
  customInvestments?: Array<{
    label: string;
    currentValue: number;
    monthlyContribution: number;
    type: "equity" | "debt" | "real_estate" | "other";
  }>;
  ppfBalance?: number;
  npsBalance?: number;
  epfBalance?: number;
  ownsHome: boolean;
  homeMarketValue?: number;
  homeLoanOutstanding?: number;
  ownsCar: boolean;
  carMarketValue?: number;
  carLoanOutstanding?: number;
  goldValue?: number;
  otherAssets?: number;
  /** Label for "other" physical / tangible asset (e.g. art, collectibles). */
  otherAssetLabel?: string;
  monthlySIP: number;
  monthlyRD?: number;
  monthlyPPFContribution?: number;
  monthlyNPSContribution?: number;
  monthlyEPFContribution: number;
  ssy?: number;
  /** Principal / current holding in NSC (one-time certificate purchase, not a monthly SIP). */
  nscDepositAmount?: number;
  nscMaturityYear?: number;
  /** When false, NSC is hidden in the form and not scored in the safety net. */
  investsInNsc?: boolean;
  /** Any India Post / national savings scheme holdings. */
  hasPostOfficeSchemes?: boolean;
  postOfficeSchemes?: Array<{
    id?: string;
    scheme: PostOfficeSchemeId;
    amount: number;
    maturityYear?: number;
  }>;
  odLimit?: number;
  odUsed?: number;
  odInterestRate?: number;
  odInterestOnlyYears?: number;
  odEMIStartYear?: number;

  primaryGoal: string;
  retirementTargetCorpus?: number;
  retirementAge?: number;
  kidsEducationFundTarget?: number;
  kidsMarriageFundTarget?: number;
  emergencyFundTarget?: number;
  medicalEmergencyFund?: number;
  bereavementFund?: number;
  homePurchaseTarget?: number;
  homePurchaseYear?: number;
  carPurchaseTarget?: number;
  carPurchaseYear?: number;
  /** Per-child targets (index = kidsAges index), today's rupees. */
  kidsEducationFundTargets?: number[];
  kidsMarriageFundTargets?: number[];
  /** Prompted after the report (bachelors). undefined = not asked yet. */
  planningMarriage?: boolean;
  marriageFundTarget?: number;
  marriageFundYear?: number;
  /** Prompted after the report (married, no kids). undefined = not asked yet. */
  planningBaby?: boolean;
  babyFundTarget?: number;
  babyFundYear?: number;
  /** Implied goal ids the user removed from their goal list. */
  dismissedGoals?: string[];
  /** Risk quiz answers (index = RISK_QUESTIONS index, 0–2 each). */
  riskAnswers?: (number | null)[];
  /** Derived from riskAnswers once all are answered. */
  riskTolerance?: RiskTolerance;
  /**
   * Budget split the tracker learned from the last 3 months of spending.
   * Stored next to the profile in the Analyse snapshot, never in the form.
   */
  smartBudget?: SmartBudget | null;
}

export type AdditionalObligation =
  FinancialProfile["additionalObligations"][number];

export type AnalyseFormValues = Omit<FinancialProfile, "kidsAges"> & {
  kidsAges?: Array<number | undefined>;
};

export function parseMoneyInput(val: unknown): number | undefined {
  if (val === "" || val === null || val === undefined) return undefined;
  if (typeof val === "number") return Number.isFinite(val) ? val : undefined;
  if (typeof val !== "string") return undefined;

  const normalized = val.replace(/[,\s₹]/g, "").trim();
  if (!normalized) return undefined;

  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

const optionalMoney = z.preprocess(
  parseMoneyInput,
  z.number().min(0, "Cannot be negative").optional(),
);

const requiredMoney = (message: string) =>
  z.preprocess(
    parseMoneyInput,
    z
      .number({
        required_error: message,
        invalid_type_error: message,
      })
      .min(0, "Cannot be negative"),
  );

const requiredPositiveMoney = (message: string) =>
  z.preprocess(
    parseMoneyInput,
    z
      .number({
        required_error: message,
        invalid_type_error: message,
      })
      .positive(message),
  );

const optionalWholeNumber = z.preprocess((val) => {
  const n = parseMoneyInput(val);
  if (n === undefined) return undefined;
  if (!Number.isFinite(n)) return undefined;
  // Accept decimal entry (e.g. 12.5 months) without blocking Next.
  return Math.round(n);
}, z.number().int("Enter a whole number").min(0, "Cannot be negative").optional());

/** Money / rate fields — decimals allowed. */
const optionalDecimalNumber = optionalMoney;

const optionalSpouseAge = z.preprocess(
  parseMoneyInput,
  z.number().min(0, "Cannot be negative").optional().or(z.literal(0)),
);

const premiumFrequencySchema = z.enum(PREMIUM_FREQUENCY_VALUES);

const additionalObligationSchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1, "Select an obligation type"),
  lenderName: z.string().optional(),
  monthlyAmount: requiredPositiveMoney("Enter the monthly payment amount"),
  outstandingAmount: optionalMoney,
  tenureMonths: optionalWholeNumber,
  loanTakenYear: optionalWholeNumber,
});

/** Drop empty/stale obligation rows that block Next with no visible UI. */
function sanitizeAdditionalObligationsInput(val: unknown) {
  if (!Array.isArray(val)) return [];
  return val.filter((row) => {
    if (!row || typeof row !== "object") return false;
    const r = row as Record<string, unknown>;
    const type = String(r.type ?? "").trim();
    const amt = parseMoneyInput(r.monthlyAmount) ?? 0;
    return type.length > 0 && amt > 0;
  });
}

const unifiedLoanSchema = z.object({
  id: z.string().optional(),
  loanType: z.enum(UNIFIED_LOAN_TYPE_VALUES),
  lenderName: z.string().optional(),
  monthlyEMI: optionalMoney.default(0),
  outstandingAmount: optionalMoney,
  interestRate: optionalDecimalNumber,
  remainingMonths: optionalWholeNumber,
  odLimit: optionalMoney,
  odUsed: optionalMoney,
  odInterestOnlyYears: optionalWholeNumber,
  emiDay: optionalWholeNumber,
  emiMonth: optionalWholeNumber,
  trackerObligationId: z.string().optional(),
  detailsSkipped: z.boolean().optional(),
});

/** Tracker link + skipped-details flag, carried through every loan copy. */
function loanLinkFields(row: {
  trackerObligationId?: unknown;
  detailsSkipped?: unknown;
}): { trackerObligationId?: string; detailsSkipped?: boolean } {
  const out: { trackerObligationId?: string; detailsSkipped?: boolean } = {};
  if (typeof row.trackerObligationId === "string" && row.trackerObligationId) {
    out.trackerObligationId = row.trackerObligationId;
  }
  if (row.detailsSkipped === true) out.detailsSkipped = true;
  return out;
}

/** Coerce legacy loanType labels so Next isn't blocked by invisible enum errors. */
function sanitizeUnifiedLoansInput(val: unknown) {
  if (!Array.isArray(val)) return [];
  return val.map((row) => {
    if (!row || typeof row !== "object") {
      return { loanType: "other" as UnifiedLoanType, monthlyEMI: 0 };
    }
    const r = row as Record<string, unknown>;
    const raw = String(r.loanType ?? "").trim();
    const loanType = (UNIFIED_LOAN_TYPE_VALUES as readonly string[]).includes(
      raw,
    )
      ? (raw as UnifiedLoanType)
      : ("other" as UnifiedLoanType);
    return { ...r, loanType };
  });
}

const otherInsurancePremiumSchema = z.object({
  id: z.string().optional(),
  policyName: z.string().optional(),
  premiumAmount: optionalMoney,
  frequency: premiumFrequencySchema.default("monthly"),
  maturityAmount: optionalMoney,
  maturityYear: optionalWholeNumber,
  renewalMonth: optionalWholeNumber,
  renewalDay: optionalWholeNumber,
});

const postOfficeSchemeSchema = z.object({
  id: z.string().optional(),
  scheme: z.enum(POST_OFFICE_SCHEME_VALUES).default("nsc"),
  amount: optionalMoney.default(0),
  maturityYear: optionalWholeNumber,
});

const customInvestmentSchema = z.object({
  label: z.string().optional().default(""),
  currentValue: optionalMoney.default(0),
  monthlyContribution: optionalMoney.default(0),
  type: z.enum(["equity", "debt", "real_estate", "other"]).default("other"),
});

const formShape = {
  lifeStage: z.enum(LIFE_STAGE_VALUES, {
    required_error: "Select your life stage",
  }),
  selfAge: z.preprocess(
    parseMoneyInput,
    z
      .number({
        required_error: "Enter your age",
        invalid_type_error: "Enter your age",
      })
      .int("Enter a whole number")
      .min(18, "Age must be between 18 and 80")
      .max(80, "Age must be between 18 and 80"),
  ),
  spouseAge: optionalSpouseAge,
  numberOfKids: z.preprocess(
    parseMoneyInput,
    z
      .number()
      .int("Enter a whole number")
      .min(1, "At least 1 child")
      .max(6, "Maximum 6 children")
      .optional(),
  ),
  kidsAges: z.array(optionalWholeNumber).max(6).optional(),
  kidsGenders: z.array(z.enum(KID_GENDER_VALUES)).max(6).optional(),
  cityTier: z.enum(CITY_TIER_VALUES, {
    required_error: "Select your city tier",
  }),

  monthlySalary: requiredPositiveMoney("Enter your monthly take-home salary"),
  spouseIncome: optionalMoney,
  otherIncome: optionalMoney,

  rentAmount: optionalMoney,
  rentMaintenanceMonthly: optionalMoney,
  homeLoanEMI: optionalMoney,
  secondPropertyEMI: optionalMoney,
  carLoanEMI: optionalMoney,
  bikeEMI: optionalMoney,
  personalLoanEMI: optionalMoney,
  personalLoanOutstanding: optionalMoney,
  personalLoanLenderName: z.string().optional(),
  personalLoanRate: optionalMoney,
  personalLoanRemainingMonths: optionalWholeNumber,
  homeLoanLenderName: z.string().optional(),
  homeLoanRate: optionalMoney,
  homeLoanRemainingMonths: optionalWholeNumber,
  carLoanLenderName: z.string().optional(),
  carLoanRate: optionalMoney,
  carLoanRemainingMonths: optionalWholeNumber,
  bikeLoanLenderName: z.string().optional(),
  bikeLoanRate: optionalMoney,
  bikeLoanRemainingMonths: optionalWholeNumber,
  bikeOutstanding: optionalMoney,
  creditCardBillMonthly: optionalMoney,
  creditCardEmiMonthly: optionalMoney,
  creditCardCarriedBalance: optionalMoney,
  homeLoanEMIDay: optionalWholeNumber,
  homeLoanEMIMonth: optionalWholeNumber,
  carLoanEMIDay: optionalWholeNumber,
  personalLoanEMIDay: optionalWholeNumber,
  educationLoanEMIDay: optionalWholeNumber,
  creditCardBillDay: optionalWholeNumber,
  sipAutoDebitDay: optionalWholeNumber,
  ppfDepositDay: optionalWholeNumber,
  additionalObligations: z.preprocess(
    sanitizeAdditionalObligationsInput,
    z.array(additionalObligationSchema).max(6),
  ),
  unifiedLoans: z.preprocess(
    sanitizeUnifiedLoansInput,
    z.array(unifiedLoanSchema).optional().default([]),
  ),
  odLimit: optionalMoney,
  odUsed: optionalMoney,
  odInterestRate: optionalMoney,
  odInterestOnlyYears: optionalWholeNumber,
  odEMIStartYear: optionalWholeNumber,

  vegetables: optionalMoney,
  grocery: optionalMoney,
  medicine: optionalMoney,
  fuel: optionalMoney,
  cabMetro: optionalMoney,
  electricity: optionalMoney,
  internet: optionalMoney,
  gas: optionalMoney,
  water: optionalMoney,
  houseHelpMonthly: optionalMoney,
  cookHelpMonthly: optionalMoney,
  entertainment: optionalMoney,
  shopping: optionalMoney,
  personalCare: optionalMoney,
  foodTotal: optionalMoney,
  transportTotal: optionalMoney,
  utilityTotal: optionalMoney,
  domesticHelpTotal: optionalMoney,
  lifestyleTotal: optionalMoney,
  kidsSchoolFees: optionalMoney,
  kidsActivities: optionalMoney,
  parentsSupport: optionalMoney,
  parentsHealthInsuranceSumInsured: optionalMoney,
  parentsEmergencyCash: optionalMoney,
  parentsCity: z.enum(CITY_TIER_VALUES).optional(),

  hasHealthInsurance: z.boolean(),
  healthInsuranceSumInsured: optionalMoney,
  healthInsurancePremiumInput: optionalMoney,
  healthInsurancePremiumFrequency: premiumFrequencySchema.default("monthly"),
  healthInsuranceRenewalMonth: optionalWholeNumber,
  healthInsuranceRenewalDay: optionalWholeNumber,
  hasTermInsurance: z.boolean(),
  termInsuranceSumAssured: optionalMoney,
  termInsurancePremiumInput: optionalMoney,
  termInsurancePremiumFrequency: premiumFrequencySchema.default("monthly"),
  termInsurancePremiumTillYear: optionalWholeNumber,
  termInsuranceRenewalMonth: optionalWholeNumber,
  termInsuranceRenewalDay: optionalWholeNumber,
  carInsurancePremiumInput: optionalMoney,
  carInsurancePremiumFrequency: premiumFrequencySchema.default("monthly"),
  carInsuranceRenewalMonth: optionalWholeNumber,
  carInsuranceRenewalDay: optionalWholeNumber,
  bikeInsurancePremiumInput: optionalMoney,
  bikeInsurancePremiumFrequency: premiumFrequencySchema.default("monthly"),
  bikeInsuranceRenewalMonth: optionalWholeNumber,
  bikeInsuranceRenewalDay: optionalWholeNumber,
  hasOtherInsurance: z.boolean().default(false),
  otherInsurancePremiumInput: optionalMoney,
  otherInsurancePremiumFrequency: premiumFrequencySchema.default("monthly"),
  otherInsurancePremiums: z
    .array(otherInsurancePremiumSchema)
    .max(6)
    .default([]),
  lifeInsuranceMaturityAmount: optionalMoney,
  lifeInsuranceMaturityYear: optionalWholeNumber,

  savingsAccountBalance: optionalMoney,
  fdValue: optionalMoney,
  fdRate: optionalMoney,
  fdMaturityYear: optionalWholeNumber,
  fdTenureYears: optionalWholeNumber,
  liquidMFValue: optionalMoney,
  emergencyFundCurrent: optionalMoney,
  otherLiquidSavings: optionalMoney,
  mfValue: optionalMoney,
  indianStocksValue: optionalMoney,
  usStocksValueINR: optionalMoney,
  usMFValueINR: optionalMoney,
  rsuValueINR: optionalMoney,
  totalEquityValue: optionalMoney,
  customInvestments: z.array(customInvestmentSchema).max(5).default([]),
  ppfBalance: optionalMoney,
  npsBalance: optionalMoney,
  epfBalance: optionalMoney,
  ownsHome: z.boolean(),
  homeMarketValue: optionalMoney,
  homeLoanOutstanding: optionalMoney,
  ownsCar: z.boolean(),
  carMarketValue: optionalMoney,
  carLoanOutstanding: optionalMoney,
  goldValue: optionalMoney,
  otherAssets: optionalMoney,
  otherAssetLabel: z.string().optional(),
  monthlySIP: optionalMoney,
  monthlyRD: optionalMoney,
  monthlyPPFContribution: optionalMoney,
  monthlyNPSContribution: optionalMoney,
  monthlyEPFContribution: optionalMoney,
  ssy: optionalMoney,
  nscDepositAmount: optionalMoney,
  nscMaturityYear: optionalWholeNumber,
  investsInNsc: z.boolean().optional().default(false),
  hasPostOfficeSchemes: z.boolean().optional().default(false),
  postOfficeSchemes: z.array(postOfficeSchemeSchema).max(8).default([]),

  primaryGoal: z.string().min(1, "Choose a primary goal"),
  retirementTargetCorpus: optionalMoney,
  retirementAge: optionalWholeNumber,
  kidsEducationFundTarget: optionalMoney,
  kidsMarriageFundTarget: optionalMoney,
  emergencyFundTarget: optionalMoney,
  medicalEmergencyFund: optionalMoney,
  bereavementFund: optionalMoney,
  homePurchaseTarget: optionalMoney,
  homePurchaseYear: optionalWholeNumber,
  carPurchaseTarget: optionalMoney,
  carPurchaseYear: optionalWholeNumber,
  kidsEducationFundTargets: z.array(z.number().min(0)).max(6).optional(),
  kidsMarriageFundTargets: z.array(z.number().min(0)).max(6).optional(),
  planningMarriage: z.boolean().optional(),
  marriageFundTarget: optionalMoney,
  marriageFundYear: optionalWholeNumber,
  planningBaby: z.boolean().optional(),
  babyFundTarget: optionalMoney,
  babyFundYear: optionalWholeNumber,
  dismissedGoals: z.array(z.string()).max(40).optional(),
  riskAnswers: z
    .array(z.number().int().min(0).max(2).nullable())
    .max(3)
    .optional(),
  riskTolerance: z.enum(RISK_TOLERANCE_VALUES).optional(),

  healthInsurancePremiumMonthly: optionalMoney,
  termInsurancePremiumMonthly: optionalMoney,
  carInsurancePremiumMonthly: optionalMoney,
  bikeInsurancePremiumMonthly: optionalMoney,
  otherInsurancePremiumMonthly: optionalMoney,
} satisfies z.ZodRawShape;

const baseFormSchema = z.object(formShape);

/** A row only counts when it has a real premium; a defaulted 0 is not an answer. */
function refineOtherInsurance(
  data: {
    hasOtherInsurance?: boolean;
    otherInsurancePremiumInput?: number;
    otherInsurancePremiums?: { premiumAmount?: number }[];
  },
  ctx: z.RefinementCtx,
) {
  if (!data.hasOtherInsurance || (data.otherInsurancePremiumInput ?? 0) > 0) {
    return;
  }
  const rows = data.otherInsurancePremiums ?? [];
  if (!rows.some((row) => (row.premiumAmount ?? 0) > 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["otherInsurancePremiums"],
      message: "Add at least one other insurance premium",
    });
  }
  rows.forEach((row, index) => {
    if (!((row.premiumAmount ?? 0) > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherInsurancePremiums", index, "premiumAmount"],
        message: "Enter premium amount",
      });
    }
  });
}

function refineKidsEducationTarget(
  data: { lifeStage?: string; kidsEducationFundTarget?: number },
  ctx: z.RefinementCtx,
) {
  if (data.lifeStage === "kids" && !((data.kidsEducationFundTarget ?? 0) > 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["kidsEducationFundTarget"],
      message: "Enter kids education fund target",
    });
  }
}

const formSchema = baseFormSchema.superRefine((data, ctx) => {
  if (data.lifeStage === "kids") {
    if (!data.numberOfKids) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["numberOfKids"],
        message: "Enter number of kids",
      });
    }

    const count = data.numberOfKids ?? 0;
    for (let index = 0; index < count; index += 1) {
      if (!data.kidsAges?.[index] && data.kidsAges?.[index] !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["kidsAges", index],
          message: `Enter age for kid ${index + 1}`,
        });
      }
      if (!data.kidsGenders?.[index]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["kidsGenders", index],
          message: `Select gender for kid ${index + 1}`,
        });
      }
    }
  }

  if (data.hasHealthInsurance) {
    if (!data.healthInsuranceSumInsured) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["healthInsuranceSumInsured"],
        message: "Enter health insurance sum insured",
      });
    }
    if (!data.healthInsurancePremiumInput) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["healthInsurancePremiumInput"],
        message: "Enter health insurance premium",
      });
    }
  }

  if (data.hasTermInsurance) {
    if (!data.termInsuranceSumAssured) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["termInsuranceSumAssured"],
        message: "Enter term insurance sum assured",
      });
    }
    if (!data.termInsurancePremiumInput) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["termInsurancePremiumInput"],
        message: "Enter term insurance premium",
      });
    }
  }

  refineOtherInsurance(data, ctx);

  if (data.ownsHome) {
    if (!data.homeMarketValue && data.homeMarketValue !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["homeMarketValue"],
        message: "Enter current home market value",
      });
    }
    if (!data.homeLoanOutstanding && data.homeLoanOutstanding !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["homeLoanOutstanding"],
        message: "Enter outstanding home loan",
      });
    }
  }

  if (data.ownsCar) {
    if (!data.carMarketValue && data.carMarketValue !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["carMarketValue"],
        message: "Enter current car market value",
      });
    }
    if (!data.carLoanOutstanding && data.carLoanOutstanding !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["carLoanOutstanding"],
        message: "Enter outstanding car loan",
      });
    }
  }

  refineKidsEducationTarget(data, ctx);
});

export const step1Schema = baseFormSchema
  .pick({
    lifeStage: true,
    selfAge: true,
    spouseAge: true,
    numberOfKids: true,
    kidsAges: true,
    kidsGenders: true,
    cityTier: true,
  })
  .superRefine((data, ctx) => {
    if (data.lifeStage === "kids") {
      if (!data.numberOfKids) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["numberOfKids"],
          message: "Enter number of kids",
        });
      }

      const count = data.numberOfKids ?? 0;
      for (let index = 0; index < count; index += 1) {
        if (!data.kidsAges?.[index] && data.kidsAges?.[index] !== 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["kidsAges", index],
            message: `Enter age for kid ${index + 1}`,
          });
        }
        if (!data.kidsGenders?.[index]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["kidsGenders", index],
            message: `Select gender for kid ${index + 1}`,
          });
        }
      }
    }
  });

export const step2Schema = baseFormSchema.pick({
  monthlySalary: true,
  spouseIncome: true,
  otherIncome: true,
});

export const step3Schema = baseFormSchema.pick({
  rentAmount: true,
  rentMaintenanceMonthly: true,
  homeLoanEMI: true,
  secondPropertyEMI: true,
  carLoanEMI: true,
  bikeEMI: true,
  personalLoanEMI: true,
  personalLoanOutstanding: true,
  personalLoanLenderName: true,
  personalLoanRate: true,
  personalLoanRemainingMonths: true,
  homeLoanLenderName: true,
  homeLoanRate: true,
  homeLoanRemainingMonths: true,
  carLoanLenderName: true,
  carLoanRate: true,
  carLoanRemainingMonths: true,
  bikeLoanLenderName: true,
  bikeLoanRate: true,
  bikeLoanRemainingMonths: true,
  bikeOutstanding: true,
  creditCardBillMonthly: true,
  creditCardEmiMonthly: true,
  creditCardCarriedBalance: true,
  additionalObligations: true,
  unifiedLoans: true,
  odLimit: true,
  odUsed: true,
  odInterestRate: true,
  odInterestOnlyYears: true,
  odEMIStartYear: true,
});

export const step4Schema = baseFormSchema.pick({
  vegetables: true,
  grocery: true,
  medicine: true,
  fuel: true,
  cabMetro: true,
  electricity: true,
  internet: true,
  gas: true,
  water: true,
  houseHelpMonthly: true,
  cookHelpMonthly: true,
  entertainment: true,
  shopping: true,
  personalCare: true,
  foodTotal: true,
  transportTotal: true,
  utilityTotal: true,
  domesticHelpTotal: true,
  lifestyleTotal: true,
  kidsSchoolFees: true,
  kidsActivities: true,
  parentsSupport: true,
  parentsHealthInsuranceSumInsured: true,
  parentsEmergencyCash: true,
  parentsCity: true,
});

export const step5Schema = baseFormSchema
  .pick({
    hasHealthInsurance: true,
    healthInsuranceSumInsured: true,
    healthInsurancePremiumInput: true,
    healthInsurancePremiumFrequency: true,
    hasTermInsurance: true,
    termInsuranceSumAssured: true,
    termInsurancePremiumInput: true,
    termInsurancePremiumFrequency: true,
    termInsurancePremiumTillYear: true,
    carInsurancePremiumInput: true,
    carInsurancePremiumFrequency: true,
    carInsuranceRenewalMonth: true,
    carInsuranceRenewalDay: true,
    bikeInsurancePremiumInput: true,
    bikeInsurancePremiumFrequency: true,
    bikeInsuranceRenewalMonth: true,
    bikeInsuranceRenewalDay: true,
    hasOtherInsurance: true,
    otherInsurancePremiumInput: true,
    otherInsurancePremiumFrequency: true,
    otherInsurancePremiums: true,
    lifeInsuranceMaturityAmount: true,
    lifeInsuranceMaturityYear: true,
  })
  .superRefine((data, ctx) => {
    if (data.hasHealthInsurance) {
      if (!data.healthInsuranceSumInsured) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["healthInsuranceSumInsured"],
          message: "Enter health insurance sum insured",
        });
      }
      if (!data.healthInsurancePremiumInput) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["healthInsurancePremiumInput"],
          message: "Enter health insurance premium",
        });
      }
    }

    if (data.hasTermInsurance) {
      if (!data.termInsuranceSumAssured) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["termInsuranceSumAssured"],
          message: "Enter term insurance sum assured",
        });
      }
      if (!data.termInsurancePremiumInput) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["termInsurancePremiumInput"],
          message: "Enter term insurance premium",
        });
      }
    }

    refineOtherInsurance(data, ctx);
  });

export const step6Schema = baseFormSchema
  .pick({
    savingsAccountBalance: true,
    fdValue: true,
    fdRate: true,
    fdMaturityYear: true,
    fdTenureYears: true,
    liquidMFValue: true,
    otherLiquidSavings: true,
    mfValue: true,
    indianStocksValue: true,
    usStocksValueINR: true,
    usMFValueINR: true,
    rsuValueINR: true,
    totalEquityValue: true,
    customInvestments: true,
    ppfBalance: true,
    npsBalance: true,
    epfBalance: true,
    ownsHome: true,
    homeMarketValue: true,
    homeLoanOutstanding: true,
    ownsCar: true,
    carMarketValue: true,
    carLoanOutstanding: true,
    goldValue: true,
    otherAssets: true,
    otherAssetLabel: true,
    monthlySIP: true,
    monthlyRD: true,
    monthlyPPFContribution: true,
    monthlyNPSContribution: true,
    monthlyEPFContribution: true,
    ssy: true,
    nscDepositAmount: true,
    nscMaturityYear: true,
    investsInNsc: true,
    hasPostOfficeSchemes: true,
    postOfficeSchemes: true,
    bereavementFund: true,
  })
  .superRefine((data, ctx) => {
    if (data.ownsHome) {
      if (!data.homeMarketValue && data.homeMarketValue !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["homeMarketValue"],
          message: "Enter current home market value",
        });
      }
      if (!data.homeLoanOutstanding && data.homeLoanOutstanding !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["homeLoanOutstanding"],
          message: "Enter outstanding home loan",
        });
      }
    }

    if (data.ownsCar) {
      if (!data.carMarketValue && data.carMarketValue !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["carMarketValue"],
          message: "Enter current car market value",
        });
      }
      if (!data.carLoanOutstanding && data.carLoanOutstanding !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["carLoanOutstanding"],
          message: "Enter outstanding car loan",
        });
      }
    }
  });

export const step7Schema = baseFormSchema
  .pick({
    primaryGoal: true,
    retirementTargetCorpus: true,
    retirementAge: true,
    kidsEducationFundTarget: true,
    kidsMarriageFundTarget: true,
    emergencyFundTarget: true,
    medicalEmergencyFund: true,
    homePurchaseTarget: true,
    homePurchaseYear: true,
    carPurchaseTarget: true,
    carPurchaseYear: true,
    lifeStage: true,
  })
  .superRefine((data, ctx) => {
    refineKidsEducationTarget(data, ctx);
  });

export const fullAnalyseSchema = formSchema;

const STEP_SCHEMAS = [
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
  step7Schema,
] as const;

function stepFieldNames(schema: z.ZodTypeAny): string[] {
  const inner = schema instanceof z.ZodEffects ? schema.innerType() : schema;
  return inner instanceof z.ZodObject ? Object.keys(inner.shape) : [];
}

const STEP_FIELDS: string[][] = STEP_SCHEMAS.map(stepFieldNames);

/** 1-based step that owns a field; fields not on any step map to the last step. */
export function analyseStepForField(field: string): number {
  // lifeStage is picked into step 7 for its rules but is entered on step 1.
  const index = STEP_FIELDS.findIndex((fields) => fields.includes(field));
  return index === -1 ? STEP_SCHEMAS.length : index + 1;
}

export type AnalyseSubmitIssue = { path: (string | number)[]; message: string };

/**
 * Final-submit check against the full cross-field schema. Returns the earliest
 * step with a problem and its issues, or null when the profile is complete.
 */
export function findFirstInvalidAnalyseStep(
  values: unknown,
): { step: number; issues: AnalyseSubmitIssue[] } | null {
  const parsed = fullAnalyseSchema.safeParse(values);
  if (parsed.success) return null;
  const issues = parsed.error.issues.map((issue) => ({
    path: issue.path,
    message: issue.message,
  }));
  const step = Math.min(
    ...issues.map((issue) => analyseStepForField(String(issue.path[0] ?? ""))),
  );
  return {
    step,
    issues: issues.filter(
      (issue) => analyseStepForField(String(issue.path[0] ?? "")) === step,
    ),
  };
}

export function toMonthlyEquivalent(
  amount: number | undefined,
  frequency: PremiumFrequency | undefined,
): number | undefined {
  if (amount === undefined) return undefined;
  if (frequency === "yearly") return amount / 12;
  return amount;
}

/**
 * Restores form fields from a saved {@link FinancialProfile} (e.g. after analyse) so insurance
 * sum assured / premiums repopulate when the draft `analysis` blob was incomplete.
 */
export function lastSubmissionToFormPartial(
  profile: FinancialProfile | null | undefined,
): Partial<AnalyseFormValues> {
  if (!profile) return {};
  const partial: Partial<AnalyseFormValues> = {};
  if (profile.hasHealthInsurance) {
    partial.hasHealthInsurance = true;
    if (profile.healthInsuranceSumInsured != null) {
      partial.healthInsuranceSumInsured = profile.healthInsuranceSumInsured;
    }
    if (
      profile.healthInsurancePremiumInput != null &&
      profile.healthInsurancePremiumInput > 0
    ) {
      partial.healthInsurancePremiumInput = profile.healthInsurancePremiumInput;
      partial.healthInsurancePremiumFrequency =
        profile.healthInsurancePremiumFrequency ?? "monthly";
    } else {
      const pm = profile.healthInsurancePremiumMonthly;
      if (typeof pm === "number" && pm > 0) {
        partial.healthInsurancePremiumInput = pm;
        partial.healthInsurancePremiumFrequency = "monthly";
      }
    }
  }
  if (profile.hasTermInsurance) {
    partial.hasTermInsurance = true;
    if (profile.termInsuranceSumAssured != null) {
      partial.termInsuranceSumAssured = profile.termInsuranceSumAssured;
    }
    if (
      profile.termInsurancePremiumInput != null &&
      profile.termInsurancePremiumInput > 0
    ) {
      partial.termInsurancePremiumInput = profile.termInsurancePremiumInput;
      partial.termInsurancePremiumFrequency =
        profile.termInsurancePremiumFrequency ?? "monthly";
    } else {
      const pm = profile.termInsurancePremiumMonthly;
      if (typeof pm === "number" && pm > 0) {
        partial.termInsurancePremiumInput = pm;
        partial.termInsurancePremiumFrequency = "monthly";
      }
    }
  }
  if (profile.investsInNsc) {
    partial.investsInNsc = true;
    const nscAmt =
      profile.nscDepositAmount ??
      (profile as FinancialProfile & { nscMonthly?: number }).nscMonthly;
    if (typeof nscAmt === "number" && nscAmt > 0) {
      partial.nscDepositAmount = nscAmt;
    }
  }

  return partial;
}

/**
 * When persisted `analysis` draft lost rows (e.g. empty arrays), copy obligations / other policies
 * from the last submitted profile without clobbering in-progress draft edits.
 */
export function fillDraftGapsFromProfile(
  draft: Partial<AnalyseFormValues>,
  profile: FinancialProfile | null,
): Partial<AnalyseFormValues> {
  if (!profile) return draft;
  const next = { ...draft };
  const draftObl = next.additionalObligations ?? [];
  if (
    draftObl.length === 0 &&
    (profile.additionalObligations?.length ?? 0) > 0
  ) {
    next.additionalObligations = profile.additionalObligations.map((o) => ({
      id: o.id ?? newAnalyseRowId(),
      type: o.type,
      lenderName: o.lenderName ?? (o as { lender?: string }).lender ?? "",
      monthlyAmount: o.monthlyAmount,
    }));
  }
  const draftPol = next.otherInsurancePremiums ?? [];
  const profilePremiums =
    profile.otherInsurancePremiums ??
    (
      profile as FinancialProfile & {
        otherInsurancePolicies?: NonNullable<
          FinancialProfile["otherInsurancePremiums"]
        >;
      }
    ).otherInsurancePolicies ??
    [];
  if (
    profile.hasOtherInsurance &&
    draftPol.length === 0 &&
    profilePremiums.length > 0
  ) {
    next.hasOtherInsurance = true;
    next.otherInsurancePremiums = profilePremiums.map((p) => ({
      id: p.id ?? newAnalyseRowId(),
      policyName: p.policyName,
      premiumAmount:
        p.premiumAmount ?? (p as { premiumInput?: number }).premiumInput,
      frequency: p.frequency ?? "monthly",
    }));
  }
  return next;
}

function preferNonEmptyString(
  a?: string | null,
  b?: string | null,
): string | undefined {
  const t = typeof a === "string" ? a.trim() : "";
  if (t) return t;
  const t2 = typeof b === "string" ? b.trim() : "";
  return t2 ? t2 : undefined;
}

/**
 * Merges Zustand-persisted draft (`watch` output) with fields rebuilt from {@link lastSubmission}.
 * Draft wins for most scalars; obligation / other-policy rows are zipped so optional text
 * (`lenderName`, `policyName`) is kept when either side has it (fixes profile overwriting cached draft).
 */
function migrateLegacyAnalysePartial(
  input: Partial<AnalyseFormValues>,
): Partial<AnalyseFormValues> {
  const out = { ...input } as Record<string, unknown>;

  const obl = out.additionalObligations;
  if (Array.isArray(obl)) {
    out.additionalObligations = (obl as Record<string, unknown>[]).map(
      (row) => ({
        id: row.id,
        type: row.type ?? "",
        lenderName: (row.lenderName ?? row.lender ?? "") as string,
        monthlyAmount: row.monthlyAmount ?? 0,
        outstandingAmount: row.outstandingAmount ?? 0,
        tenureMonths: row.tenureMonths ?? 0,
        loanTakenYear: row.loanTakenYear ?? 0,
      }),
    );
  }

  const unified = out.unifiedLoans;
  if (Array.isArray(unified)) {
    out.unifiedLoans = (unified as Record<string, unknown>[]).map((row) => {
      const loanType = (row.loanType ?? "other") as UnifiedLoanType;
      const outstanding = Number(row.outstandingAmount ?? 0) || 0;
      return {
        id: row.id,
        loanType,
        lenderName: (row.lenderName ?? "") as string,
        monthlyEMI: row.monthlyEMI ?? 0,
        outstandingAmount: outstanding,
        interestRate: row.interestRate ?? 0,
        remainingMonths: row.remainingMonths ?? 0,
        odLimit: row.odLimit ?? 0,
        // OD "amount used" is the same as outstanding — keep one source of truth.
        odUsed:
          loanType === "overdraft"
            ? outstanding || Number(row.odUsed ?? 0) || 0
            : Number(row.odUsed ?? 0) || 0,
        odInterestOnlyYears: row.odInterestOnlyYears ?? 0,
        emiDay: row.emiDay == null ? undefined : Number(row.emiDay),
        emiMonth: row.emiMonth == null ? undefined : Number(row.emiMonth),
        ...loanLinkFields(row),
      };
    });
  }

  const legacyPrem = out.otherInsurancePolicies as
    | Record<string, unknown>[]
    | undefined;
  const newPrem = out.otherInsurancePremiums as
    | Record<string, unknown>[]
    | undefined;
  const src = newPrem ?? legacyPrem;
  if (Array.isArray(src)) {
    out.otherInsurancePremiums = src.map((row) => ({
      id: row.id,
      policyName: row.policyName,
      premiumAmount: row.premiumAmount ?? row.premiumInput,
      frequency: row.frequency ?? "monthly",
      maturityAmount: row.maturityAmount ?? 0,
      maturityYear: row.maturityYear ?? 0,
      renewalMonth:
        row.renewalMonth == null ? undefined : Number(row.renewalMonth),
      renewalDay: row.renewalDay == null ? undefined : Number(row.renewalDay),
    }));
    delete out.otherInsurancePolicies;
  }

  return out as Partial<AnalyseFormValues>;
}

export function mergeAnalyseDraftWithProfile(
  profileForm: Partial<AnalyseFormValues>,
  draft: Partial<AnalyseFormValues>,
): Partial<AnalyseFormValues> {
  const profileFormN = migrateLegacyAnalysePartial(profileForm);
  const draftN = migrateLegacyAnalysePartial(draft);
  const merged: Partial<AnalyseFormValues> = {
    ...profileFormN,
    ...draftN,
  };

  const pObl = profileFormN.additionalObligations;
  const dObl = draftN.additionalObligations;
  if ((pObl?.length ?? 0) > 0 || (dObl?.length ?? 0) > 0) {
    const len = Math.max(pObl?.length ?? 0, dObl?.length ?? 0);
    merged.additionalObligations = Array.from({ length: len }, (_, i) => {
      const p = pObl?.[i];
      const d = dObl?.[i];
      const typeFromDraft = d?.type?.trim();
      return {
        id: d?.id ?? p?.id ?? newAnalyseRowId(),
        type: typeFromDraft || p?.type || "Other",
        monthlyAmount: d?.monthlyAmount ?? p?.monthlyAmount ?? 0,
        lenderName: preferNonEmptyString(d?.lenderName, p?.lenderName),
        outstandingAmount: d?.outstandingAmount ?? p?.outstandingAmount ?? 0,
        tenureMonths: d?.tenureMonths ?? p?.tenureMonths ?? 0,
        loanTakenYear: d?.loanTakenYear ?? p?.loanTakenYear ?? 0,
      };
    });
  }

  const pPol = profileFormN.otherInsurancePremiums;
  const dPol = draftN.otherInsurancePremiums;
  if ((pPol?.length ?? 0) > 0 || (dPol?.length ?? 0) > 0) {
    const len = Math.max(pPol?.length ?? 0, dPol?.length ?? 0);
    merged.otherInsurancePremiums = Array.from({ length: len }, (_, i) => {
      const p = pPol?.[i];
      const d = dPol?.[i];
      return {
        id: d?.id ?? p?.id ?? newAnalyseRowId(),
        policyName: preferNonEmptyString(d?.policyName, p?.policyName),
        premiumAmount: d?.premiumAmount ?? p?.premiumAmount,
        frequency: (d?.frequency ??
          p?.frequency ??
          "monthly") as PremiumFrequency,
        maturityAmount: (() => {
          const dAmt = Number(d?.maturityAmount ?? 0) || 0;
          const pAmt = Number(p?.maturityAmount ?? 0) || 0;
          return dAmt > 0 ? dAmt : pAmt;
        })(),
        maturityYear: (() => {
          const dY = Number(d?.maturityYear ?? 0) || 0;
          const pY = Number(p?.maturityYear ?? 0) || 0;
          return dY > 0 ? dY : pY;
        })(),
        renewalMonth: d?.renewalMonth ?? p?.renewalMonth,
        renewalDay: d?.renewalDay ?? p?.renewalDay,
      };
    });
  }

  const pUnified = profileFormN.unifiedLoans;
  const dUnified = draftN.unifiedLoans;
  if (dUnified !== undefined) {
    merged.unifiedLoans = (dUnified ?? []).map((loan) => {
      const outstanding = loan.outstandingAmount ?? 0;
      return {
        id: loan.id ?? newAnalyseRowId(),
        loanType: loan.loanType,
        lenderName: loan.lenderName ?? "",
        monthlyEMI: loan.monthlyEMI ?? 0,
        outstandingAmount: outstanding,
        interestRate: loan.interestRate ?? 0,
        remainingMonths: loan.remainingMonths ?? 0,
        odLimit: loan.odLimit ?? 0,
        odUsed:
          loan.loanType === "overdraft"
            ? outstanding || loan.odUsed || 0
            : (loan.odUsed ?? 0),
        odInterestOnlyYears: loan.odInterestOnlyYears ?? 0,
        emiDay: loan.emiDay,
        emiMonth: loan.emiMonth,
        ...loanLinkFields(loan),
      };
    });
    if ((dUnified ?? []).length === 0) {
      Object.assign(merged, clearLegacyLoanScalars());
    }
  } else if ((pUnified?.length ?? 0) > 0) {
    merged.unifiedLoans = (pUnified ?? []).map((loan) => {
      const outstanding = loan.outstandingAmount ?? 0;
      return {
        id: loan.id ?? newAnalyseRowId(),
        loanType: loan.loanType,
        lenderName: loan.lenderName ?? "",
        monthlyEMI: loan.monthlyEMI ?? 0,
        outstandingAmount: outstanding,
        interestRate: loan.interestRate ?? 0,
        remainingMonths: loan.remainingMonths ?? 0,
        odLimit: loan.odLimit ?? 0,
        odUsed:
          loan.loanType === "overdraft"
            ? outstanding || loan.odUsed || 0
            : (loan.odUsed ?? 0),
        odInterestOnlyYears: loan.odInterestOnlyYears ?? 0,
        emiDay: loan.emiDay,
        emiMonth: loan.emiMonth,
        ...loanLinkFields(loan),
      };
    });
  }

  if (profileForm.hasHealthInsurance) {
    const pSum = profileForm.healthInsuranceSumInsured ?? 0;
    const pPrem = profileForm.healthInsurancePremiumInput ?? 0;
    const mSum = merged.healthInsuranceSumInsured ?? 0;
    const mPrem = merged.healthInsurancePremiumInput ?? 0;
    if ((pSum > 0 || pPrem > 0) && mSum === 0 && mPrem === 0) {
      merged.hasHealthInsurance = profileForm.hasHealthInsurance;
      merged.healthInsuranceSumInsured = profileForm.healthInsuranceSumInsured;
      merged.healthInsurancePremiumInput =
        profileForm.healthInsurancePremiumInput;
      merged.healthInsurancePremiumFrequency =
        profileForm.healthInsurancePremiumFrequency ??
        merged.healthInsurancePremiumFrequency;
    }
  }

  if (profileForm.hasTermInsurance) {
    const pSum = profileForm.termInsuranceSumAssured ?? 0;
    const pPrem = profileForm.termInsurancePremiumInput ?? 0;
    const mSum = merged.termInsuranceSumAssured ?? 0;
    const mPrem = merged.termInsurancePremiumInput ?? 0;
    if ((pSum > 0 || pPrem > 0) && mSum === 0 && mPrem === 0) {
      merged.hasTermInsurance = profileForm.hasTermInsurance;
      merged.termInsuranceSumAssured = profileForm.termInsuranceSumAssured;
      merged.termInsurancePremiumInput = profileForm.termInsurancePremiumInput;
      merged.termInsurancePremiumFrequency =
        profileForm.termInsurancePremiumFrequency ??
        merged.termInsurancePremiumFrequency;
    }
  }

  if ((pPol?.length ?? 0) > 0) {
    merged.hasOtherInsurance = true;
  }

  // Draft zeros must not wipe restored spouse fields (common after bachelor default mount).
  const draftSpouseIncome = Number(draftN.spouseIncome ?? 0) || 0;
  const profileSpouseIncome = Number(profileFormN.spouseIncome ?? 0) || 0;
  if (draftSpouseIncome <= 0 && profileSpouseIncome > 0) {
    merged.spouseIncome = profileSpouseIncome;
  }
  const draftSpouseAge = Number(draftN.spouseAge ?? 0) || 0;
  const profileSpouseAge = Number(profileFormN.spouseAge ?? 0) || 0;
  if (draftSpouseAge <= 0 && profileSpouseAge > 0) {
    merged.spouseAge = profileSpouseAge;
  }

  // Prefer profile renewal dates when draft cleared them.
  const preferRenewal = <K extends keyof AnalyseFormValues>(key: K) => {
    const dVal = draftN[key];
    const pVal = profileFormN[key];
    if ((dVal == null || dVal === 0) && pVal != null && pVal !== 0) {
      merged[key] = pVal;
    }
  };
  preferRenewal("healthInsuranceRenewalMonth");
  preferRenewal("healthInsuranceRenewalDay");
  preferRenewal("termInsuranceRenewalMonth");
  preferRenewal("termInsuranceRenewalDay");
  preferRenewal("carInsuranceRenewalMonth");
  preferRenewal("carInsuranceRenewalDay");
  preferRenewal("bikeInsuranceRenewalMonth");
  preferRenewal("bikeInsuranceRenewalDay");

  return merged;
}

/**
 * Rebuild analyse form values from a stored {@link FinancialProfile} (inverse of normalize).
 * Uses persisted premium input + frequency when present; otherwise falls back to `*PremiumMonthly` as monthly.
 */
export function financialProfileToFormValues(
  profile: FinancialProfile,
): Partial<AnalyseFormValues> {
  const p = profile;
  const additionalObligations = (p.additionalObligations ?? []).map((o) => {
    const row = o as {
      id?: string;
      type: string;
      lenderName?: string;
      lender?: string;
      monthlyAmount: number;
      outstandingAmount?: number;
      tenureMonths?: number;
      loanTakenYear?: number;
    };
    return {
      id: row.id ?? newAnalyseRowId(),
      type: row.type,
      lenderName: row.lenderName ?? row.lender ?? "",
      monthlyAmount: row.monthlyAmount,
      outstandingAmount: row.outstandingAmount ?? 0,
      tenureMonths: row.tenureMonths ?? 0,
      loanTakenYear: row.loanTakenYear ?? 0,
    };
  });
  const legacyPolicies = (
    p as FinancialProfile & {
      otherInsurancePolicies?: NonNullable<
        FinancialProfile["otherInsurancePremiums"]
      >;
    }
  ).otherInsurancePolicies;
  const otherPolicies = p.otherInsurancePremiums ?? legacyPolicies ?? [];
  const hasOther =
    Boolean(p.hasOtherInsurance) ||
    otherPolicies.length > 0 ||
    (p.otherInsurancePremiumMonthly ?? 0) > 0;

  const mapObligationTypeToUnified = (value?: string): UnifiedLoanType => {
    const v = (value ?? "").toLowerCase();
    if (v.includes("home")) return "home_loan";
    if (v.includes("personal")) return "personal_loan";
    if (v.includes("car")) return "car_loan";
    if (v.includes("bike") || v.includes("two")) return "bike_loan";
    if (v.includes("education")) return "education_loan";
    if (v.includes("pf")) return "pf_loan";
    if (v.includes("od") || v.includes("overdraft")) return "overdraft";
    if (v.includes("gold")) return "gold_loan";
    if (v.includes("business")) return "business_loan";
    if (v.includes("credit")) return "credit_card";
    return "other";
  };

  const unifiedLoans: NonNullable<AnalyseFormValues["unifiedLoans"]> =
    p.unifiedLoans !== undefined
      ? (p.unifiedLoans ?? []).map((loan) => {
          const outstanding = loan.outstandingAmount ?? 0;
          return {
            id: loan.id ?? newAnalyseRowId(),
            loanType: loan.loanType,
            lenderName: loan.lenderName ?? "",
            monthlyEMI: loan.monthlyEMI ?? 0,
            outstandingAmount: outstanding,
            interestRate: loan.interestRate ?? 0,
            remainingMonths: loan.remainingMonths ?? 0,
            odLimit: loan.odLimit ?? 0,
            odUsed:
              loan.loanType === "overdraft"
                ? outstanding || loan.odUsed || 0
                : (loan.odUsed ?? 0),
            odInterestOnlyYears: loan.odInterestOnlyYears ?? 0,
            emiDay: loan.emiDay,
            emiMonth: loan.emiMonth,
            ...loanLinkFields(loan),
          };
        })
      : [];

  if (p.unifiedLoans === undefined) {
    if ((p.homeLoanEMI ?? 0) > 0) {
      unifiedLoans.push({
        id: newAnalyseRowId(),
        loanType: "home_loan",
        lenderName: p.homeLoanLenderName ?? "",
        monthlyEMI: p.homeLoanEMI ?? 0,
        outstandingAmount: p.homeLoanOutstanding ?? 0,
        interestRate: p.homeLoanRate ?? 0,
        remainingMonths: p.homeLoanRemainingMonths ?? 0,
        odLimit: 0,
        odUsed: 0,
        odInterestOnlyYears: 0,
      });
    }
    if ((p.personalLoanEMI ?? 0) > 0) {
      unifiedLoans.push({
        id: newAnalyseRowId(),
        loanType: "personal_loan",
        lenderName: p.personalLoanLenderName ?? "",
        monthlyEMI: p.personalLoanEMI ?? 0,
        outstandingAmount: p.personalLoanOutstanding ?? 0,
        interestRate: p.personalLoanRate ?? 0,
        remainingMonths: p.personalLoanRemainingMonths ?? 0,
        odLimit: 0,
        odUsed: 0,
        odInterestOnlyYears: 0,
      });
    }
    if ((p.carLoanEMI ?? 0) > 0) {
      unifiedLoans.push({
        id: newAnalyseRowId(),
        loanType: "car_loan",
        lenderName: p.carLoanLenderName ?? "",
        monthlyEMI: p.carLoanEMI ?? 0,
        outstandingAmount: p.carLoanOutstanding ?? 0,
        interestRate: p.carLoanRate ?? 0,
        remainingMonths: p.carLoanRemainingMonths ?? 0,
        odLimit: 0,
        odUsed: 0,
        odInterestOnlyYears: 0,
      });
    }
    if ((p.bikeEMI ?? 0) > 0) {
      unifiedLoans.push({
        id: newAnalyseRowId(),
        loanType: "bike_loan",
        lenderName: p.bikeLoanLenderName ?? "",
        monthlyEMI: p.bikeEMI ?? 0,
        outstandingAmount: p.bikeOutstanding ?? 0,
        interestRate: p.bikeLoanRate ?? 0,
        remainingMonths: p.bikeLoanRemainingMonths ?? 0,
        odLimit: 0,
        odUsed: 0,
        odInterestOnlyYears: 0,
      });
    }
    (p.additionalObligations ?? []).forEach((o) => {
      unifiedLoans.push({
        id: o.id ?? newAnalyseRowId(),
        loanType: mapObligationTypeToUnified(o.type),
        lenderName: o.lenderName ?? "",
        monthlyEMI: o.monthlyAmount ?? 0,
        outstandingAmount: o.outstandingAmount ?? 0,
        interestRate: o.loanTakenYear ?? 0,
        remainingMonths: o.tenureMonths ?? 0,
        odLimit: p.odLimit ?? 0,
        odUsed: p.odUsed ?? 0,
        odInterestOnlyYears: p.odInterestOnlyYears ?? 0,
      });
    });
  }

  return {
    lifeStage: p.lifeStage,
    selfAge: p.selfAge,
    spouseAge: p.spouseAge ?? 0,
    numberOfKids: p.numberOfKids,
    kidsAges: p.kidsAges?.map((a) => a) as AnalyseFormValues["kidsAges"],
    kidsGenders: p.kidsGenders,
    cityTier: p.cityTier,
    monthlySalary: p.monthlySalary,
    spouseIncome: p.spouseIncome ?? 0,
    otherIncome: p.otherIncome ?? 0,
    rentAmount: p.rentAmount ?? 0,
    rentMaintenanceMonthly: p.rentMaintenanceMonthly ?? 0,
    homeLoanEMI: p.homeLoanEMI ?? 0,
    homeLoanEMIDay: p.homeLoanEMIDay,
    homeLoanEMIMonth: p.homeLoanEMIMonth,
    secondPropertyEMI: p.secondPropertyEMI ?? 0,
    carLoanEMI: p.carLoanEMI ?? 0,
    bikeEMI: p.bikeEMI ?? 0,
    personalLoanEMI: p.personalLoanEMI ?? 0,
    personalLoanOutstanding: p.personalLoanOutstanding ?? 0,
    personalLoanLenderName: p.personalLoanLenderName ?? "",
    personalLoanRate: p.personalLoanRate ?? 0,
    personalLoanRemainingMonths: p.personalLoanRemainingMonths ?? 0,
    homeLoanLenderName: p.homeLoanLenderName ?? "",
    homeLoanRate: p.homeLoanRate ?? 0,
    homeLoanRemainingMonths: p.homeLoanRemainingMonths ?? 0,
    carLoanLenderName: p.carLoanLenderName ?? "",
    carLoanRate: p.carLoanRate ?? 0,
    carLoanRemainingMonths: p.carLoanRemainingMonths ?? 0,
    bikeLoanLenderName: p.bikeLoanLenderName ?? "",
    bikeLoanRate: p.bikeLoanRate ?? 0,
    bikeLoanRemainingMonths: p.bikeLoanRemainingMonths ?? 0,
    bikeOutstanding: p.bikeOutstanding ?? 0,
    creditCardBillMonthly: p.creditCardBillMonthly ?? 0,
    creditCardEmiMonthly: p.creditCardEmiMonthly ?? 0,
    creditCardCarriedBalance: p.creditCardCarriedBalance ?? 0,
    additionalObligations,
    unifiedLoans,
    odLimit: p.odLimit ?? 0,
    odUsed: p.odUsed ?? 0,
    odInterestRate: p.odInterestRate ?? 0,
    odInterestOnlyYears: p.odInterestOnlyYears ?? 0,
    odEMIStartYear: p.odEMIStartYear ?? 0,
    vegetables: p.vegetables,
    grocery: p.grocery,
    medicine: p.medicine,
    fuel: p.fuel,
    cabMetro: p.cabMetro,
    electricity: p.electricity,
    internet: p.internet,
    gas: p.gas,
    water: p.water,
    houseHelpMonthly: p.houseHelpMonthly ?? 0,
    cookHelpMonthly: p.cookHelpMonthly ?? 0,
    entertainment: p.entertainment,
    shopping: p.shopping,
    personalCare: p.personalCare ?? 0,
    foodTotal: p.foodTotal ?? 0,
    transportTotal: p.transportTotal ?? 0,
    utilityTotal: p.utilityTotal ?? 0,
    domesticHelpTotal: p.domesticHelpTotal ?? 0,
    lifestyleTotal: p.lifestyleTotal ?? 0,
    kidsSchoolFees: p.kidsSchoolFees ?? 0,
    kidsActivities: p.kidsActivities ?? 0,
    parentsSupport: p.parentsSupport ?? 0,
    parentsHealthInsuranceSumInsured: p.parentsHealthInsuranceSumInsured ?? 0,
    parentsEmergencyCash: p.parentsEmergencyCash ?? 0,
    parentsCity: p.parentsCity,
    hasHealthInsurance: p.hasHealthInsurance,
    healthInsuranceSumInsured: p.healthInsuranceSumInsured ?? 0,
    healthInsurancePremiumInput:
      p.healthInsurancePremiumInput ?? p.healthInsurancePremiumMonthly ?? 0,
    healthInsurancePremiumFrequency:
      p.healthInsurancePremiumFrequency ?? "monthly",
    healthInsuranceRenewalMonth: p.healthInsuranceRenewalMonth,
    healthInsuranceRenewalDay: p.healthInsuranceRenewalDay,
    hasTermInsurance: p.hasTermInsurance,
    termInsuranceSumAssured: p.termInsuranceSumAssured ?? 0,
    termInsurancePremiumInput:
      p.termInsurancePremiumInput ?? p.termInsurancePremiumMonthly ?? 0,
    termInsurancePremiumFrequency: p.termInsurancePremiumFrequency ?? "monthly",
    termInsurancePremiumTillYear: p.termInsurancePremiumTillYear ?? 0,
    termInsuranceRenewalMonth: p.termInsuranceRenewalMonth,
    termInsuranceRenewalDay: p.termInsuranceRenewalDay,
    carInsurancePremiumInput:
      p.carInsurancePremiumInput ?? p.carInsurancePremiumMonthly ?? 0,
    carInsurancePremiumFrequency: p.carInsurancePremiumFrequency ?? "monthly",
    carInsuranceRenewalMonth: p.carInsuranceRenewalMonth,
    carInsuranceRenewalDay: p.carInsuranceRenewalDay,
    bikeInsurancePremiumInput:
      p.bikeInsurancePremiumInput ?? p.bikeInsurancePremiumMonthly ?? 0,
    bikeInsurancePremiumFrequency: p.bikeInsurancePremiumFrequency ?? "monthly",
    bikeInsuranceRenewalMonth: p.bikeInsuranceRenewalMonth,
    bikeInsuranceRenewalDay: p.bikeInsuranceRenewalDay,
    hasOtherInsurance: hasOther,
    otherInsurancePremiums: otherPolicies.map((row) => {
      const r = row as {
        id?: string;
        policyName?: string;
        premiumAmount?: number;
        premiumInput?: number;
        frequency?: PremiumFrequency;
        monthlyAmount?: number;
        maturityAmount?: number;
        maturityYear?: number;
        renewalMonth?: number;
        renewalDay?: number;
      };
      return {
        id: r.id ?? newAnalyseRowId(),
        policyName: r.policyName,
        premiumAmount: r.premiumAmount ?? r.premiumInput ?? 0,
        frequency: r.frequency ?? "monthly",
        maturityAmount: r.maturityAmount ?? 0,
        maturityYear: r.maturityYear ?? 0,
        renewalMonth: r.renewalMonth,
        renewalDay: r.renewalDay,
      };
    }),
    otherInsurancePremiumInput:
      p.otherInsurancePremiumInput ??
      (otherPolicies.length === 0 ? (p.otherInsurancePremiumMonthly ?? 0) : 0),
    otherInsurancePremiumFrequency:
      p.otherInsurancePremiumFrequency ?? "monthly",
    lifeInsuranceMaturityAmount: p.lifeInsuranceMaturityAmount ?? 0,
    lifeInsuranceMaturityYear: p.lifeInsuranceMaturityYear ?? 0,
    savingsAccountBalance: p.savingsAccountBalance ?? 0,
    fdValue: p.fdValue ?? 0,
    fdRate: p.fdRate ?? 0,
    fdMaturityYear: p.fdMaturityYear ?? 0,
    fdTenureYears: p.fdTenureYears ?? 0,
    liquidMFValue: p.liquidMFValue ?? 0,
    emergencyFundCurrent: p.emergencyFundCurrent ?? 0,
    otherLiquidSavings: p.otherLiquidSavings ?? 0,
    mfValue: p.mfValue ?? 0,
    indianStocksValue: p.indianStocksValue ?? 0,
    usStocksValueINR: p.usStocksValueINR ?? 0,
    usMFValueINR: p.usMFValueINR ?? 0,
    rsuValueINR: p.rsuValueINR ?? 0,
    totalEquityValue: p.totalEquityValue ?? 0,
    customInvestments: p.customInvestments ?? [],
    ppfBalance: p.ppfBalance ?? 0,
    npsBalance: p.npsBalance ?? 0,
    epfBalance: p.epfBalance ?? 0,
    ownsHome: p.ownsHome,
    homeMarketValue: p.homeMarketValue ?? 0,
    homeLoanOutstanding: p.homeLoanOutstanding ?? 0,
    ownsCar: p.ownsCar,
    carMarketValue: p.carMarketValue ?? 0,
    carLoanOutstanding: p.carLoanOutstanding ?? 0,
    goldValue: p.goldValue ?? 0,
    otherAssets: p.otherAssets ?? 0,
    otherAssetLabel: p.otherAssetLabel,
    monthlySIP: p.monthlySIP ?? 0,
    monthlyRD: p.monthlyRD ?? 0,
    monthlyPPFContribution: p.monthlyPPFContribution ?? 0,
    monthlyNPSContribution: p.monthlyNPSContribution ?? 0,
    monthlyEPFContribution: p.monthlyEPFContribution ?? 0,
    ssy: p.ssy ?? 0,
    investsInNsc: p.investsInNsc ?? false,
    nscDepositAmount:
      p.nscDepositAmount ??
      (p as FinancialProfile & { nscMonthly?: number }).nscMonthly ??
      0,
    nscMaturityYear: p.nscMaturityYear ?? 0,
    hasPostOfficeSchemes: Boolean(
      p.hasPostOfficeSchemes ||
      p.investsInNsc ||
      (p.postOfficeSchemes?.length ?? 0) > 0,
    ),
    postOfficeSchemes:
      p.postOfficeSchemes && p.postOfficeSchemes.length > 0
        ? p.postOfficeSchemes
        : p.investsInNsc &&
            (p.nscDepositAmount ??
              (p as FinancialProfile & { nscMonthly?: number }).nscMonthly ??
              0) > 0
          ? [
              {
                id: newAnalyseRowId(),
                scheme: "nsc" as const,
                amount:
                  p.nscDepositAmount ??
                  (p as FinancialProfile & { nscMonthly?: number })
                    .nscMonthly ??
                  0,
                maturityYear: p.nscMaturityYear,
              },
            ]
          : [],
    primaryGoal: p.primaryGoal?.trim() ? p.primaryGoal : "grow_wealth",
    retirementTargetCorpus: p.retirementTargetCorpus,
    retirementAge: p.retirementAge ?? 0,
    kidsEducationFundTarget: p.kidsEducationFundTarget,
    kidsMarriageFundTarget: p.kidsMarriageFundTarget,
    emergencyFundTarget: p.emergencyFundTarget,
    medicalEmergencyFund: p.medicalEmergencyFund ?? 0,
    bereavementFund: p.bereavementFund,
    homePurchaseTarget: p.homePurchaseTarget,
    homePurchaseYear: p.homePurchaseYear,
    carPurchaseTarget: p.carPurchaseTarget,
    carPurchaseYear: p.carPurchaseYear,
    kidsEducationFundTargets: p.kidsEducationFundTargets,
    kidsMarriageFundTargets: p.kidsMarriageFundTargets,
    planningMarriage: p.planningMarriage,
    marriageFundTarget: p.marriageFundTarget,
    marriageFundYear: p.marriageFundYear,
    planningBaby: p.planningBaby,
    babyFundTarget: p.babyFundTarget,
    babyFundYear: p.babyFundYear,
    dismissedGoals: p.dismissedGoals,
    riskAnswers: p.riskAnswers,
    riskTolerance: p.riskTolerance,
  };
}

/**
 * If user entered cover/premium amounts but toggles were missing/false in persisted state,
 * turn toggles on so values are not cleared by effects or stripped in normalize.
 */
export function coalesceInsuranceToggles<T extends Partial<AnalyseFormValues>>(
  data: T,
): T {
  const out = { ...data } as T;
  const hasHealthNumbers =
    (out.healthInsuranceSumInsured ?? 0) > 0 ||
    (out.healthInsurancePremiumInput ?? 0) > 0;
  if (hasHealthNumbers && out.hasHealthInsurance !== true) {
    (out as { hasHealthInsurance?: boolean }).hasHealthInsurance = true;
  }
  const hasTermNumbers =
    (out.termInsuranceSumAssured ?? 0) > 0 ||
    (out.termInsurancePremiumInput ?? 0) > 0;
  if (hasTermNumbers && out.hasTermInsurance !== true) {
    (out as { hasTermInsurance?: boolean }).hasTermInsurance = true;
  }
  return out;
}

export function normalizeAnalyseFormValues(
  data: Partial<AnalyseFormValues>,
): FinancialProfile {
  const form = migrateLegacyAnalysePartial(data);
  const formUnifiedDefined = Array.isArray(form.unifiedLoans);
  /** User cleared every loan in the UI (`unifiedLoans: []`) — drop stale scalars. */
  const clearStaleLegacyLoans =
    formUnifiedDefined && (form.unifiedLoans ?? []).length === 0;
  const unifiedLoans = (form.unifiedLoans ?? []).filter(
    (loan) => (loan.monthlyEMI ?? 0) > 0,
  );

  const mapUnifiedToAdditionalType = (type: UnifiedLoanType): string => {
    switch (type) {
      case "home_loan":
        return "Home Loan";
      case "personal_loan":
        return "Personal Loan";
      case "car_loan":
        return "Car Loan";
      case "bike_loan":
        return "Bike Loan";
      case "education_loan":
        return "Education Loan";
      case "pf_loan":
        return "PF Loan";
      case "overdraft":
        return "Overdraft (OD)";
      case "gold_loan":
        return "Gold Loan";
      case "business_loan":
        return "Business Loan";
      case "credit_card":
        return "Credit Card";
      default:
        return "Other Loan";
    }
  };

  const firstHomeIndex = unifiedLoans.findIndex(
    (loan) => loan.loanType === "home_loan",
  );
  const firstPersonalIndex = unifiedLoans.findIndex(
    (loan) => loan.loanType === "personal_loan",
  );
  const firstCarIndex = unifiedLoans.findIndex(
    (loan) => loan.loanType === "car_loan",
  );
  const firstBikeIndex = unifiedLoans.findIndex(
    (loan) => loan.loanType === "bike_loan",
  );
  const firstHome =
    firstHomeIndex >= 0 ? unifiedLoans[firstHomeIndex] : undefined;
  const firstPersonal =
    firstPersonalIndex >= 0 ? unifiedLoans[firstPersonalIndex] : undefined;
  const firstCar = firstCarIndex >= 0 ? unifiedLoans[firstCarIndex] : undefined;
  const firstBike =
    firstBikeIndex >= 0 ? unifiedLoans[firstBikeIndex] : undefined;

  const existingAdditionalObligations = (form.additionalObligations ?? []).map(
    (row) => {
      const r = row as {
        id?: string;
        type: string;
        lenderName?: string;
        lender?: string;
        monthlyAmount: number;
        outstandingAmount?: number;
        tenureMonths?: number;
        loanTakenYear?: number;
      };
      return {
        id: r.id,
        type: r.type,
        lenderName: r.lenderName ?? r.lender,
        monthlyAmount: r.monthlyAmount,
        outstandingAmount: r.outstandingAmount,
        tenureMonths: r.tenureMonths,
        loanTakenYear: r.loanTakenYear,
      };
    },
  );

  const additionalFromUnified = unifiedLoans
    .map((loan, index) => {
      if (index === firstHomeIndex) return null;
      if (index === firstPersonalIndex) return null;
      if (index === firstCarIndex) return null;
      if (index === firstBikeIndex) return null;
      return {
        id: loan.id,
        type: mapUnifiedToAdditionalType(loan.loanType),
        lenderName: loan.lenderName ?? "",
        monthlyAmount: loan.monthlyEMI ?? 0,
        outstandingAmount: loan.outstandingAmount ?? 0,
        rateOfInterest: loan.interestRate ?? 0,
        remainingMonths: loan.remainingMonths ?? 0,
        odLimit: loan.odLimit ?? 0,
        odUsed: loan.odUsed ?? 0,
        odInterestOnlyYears: loan.odInterestOnlyYears ?? 0,
        tenureMonths: loan.remainingMonths ?? 0,
        loanTakenYear: loan.interestRate ?? 0,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
  const obligationDedupKey = (row: {
    type?: string;
    lenderName?: string;
    monthlyAmount?: number;
  }) =>
    [
      (row.type ?? "").toLowerCase().trim(),
      (row.lenderName ?? "").toLowerCase().trim(),
      Math.round(row.monthlyAmount ?? 0),
    ].join("|");

  // `unifiedLoans` is the source of truth for the loans UI and already contains
  // every loan (including ones that historically lived in `additionalObligations`).
  // When it's present we derive the extra obligations solely from it; merging the
  // legacy `additionalObligations` too would double-count the same loans (they can
  // slip past the dedup when type/lender strings differ slightly).
  const selfDedupe = <
    T extends { type?: string; lenderName?: string; monthlyAmount?: number },
  >(
    rows: T[],
  ): T[] => {
    const seen = new Set<string>();
    return rows.filter((row) => {
      const key = obligationDedupKey(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const resolvedAdditionalObligations = clearStaleLegacyLoans
    ? []
    : unifiedLoans.length > 0
      ? selfDedupe(additionalFromUnified)
      : existingAdditionalObligations;
  const foodTotal =
    (form.foodTotal ?? 0) > 0
      ? (form.foodTotal ?? 0)
      : (form.vegetables ?? 0) + (form.grocery ?? 0) + (form.medicine ?? 0);
  const transportTotal =
    (form.transportTotal ?? 0) > 0
      ? (form.transportTotal ?? 0)
      : (form.fuel ?? 0) + (form.cabMetro ?? 0);
  const utilityTotal =
    (form.utilityTotal ?? 0) > 0
      ? (form.utilityTotal ?? 0)
      : (form.electricity ?? 0) +
        (form.internet ?? 0) +
        (form.gas ?? 0) +
        (form.water ?? 0);
  const domesticHelpTotal =
    (form.domesticHelpTotal ?? 0) > 0
      ? (form.domesticHelpTotal ?? 0)
      : (form.houseHelpMonthly ?? 0) + (form.cookHelpMonthly ?? 0);
  const lifestyleTotal =
    (form.lifestyleTotal ?? 0) > 0
      ? (form.lifestyleTotal ?? 0)
      : (form.entertainment ?? 0) +
        (form.shopping ?? 0) +
        (form.personalCare ?? 0);

  const vegetables =
    (form.foodTotal ?? 0) > 0
      ? Math.round(foodTotal * 0.3)
      : (form.vegetables ?? 0);
  const grocery =
    (form.foodTotal ?? 0) > 0
      ? Math.round(foodTotal * 0.5)
      : (form.grocery ?? 0);
  const medicine =
    (form.foodTotal ?? 0) > 0
      ? Math.round(foodTotal * 0.2)
      : (form.medicine ?? 0);
  const fuel =
    (form.transportTotal ?? 0) > 0
      ? Math.round(transportTotal * 0.6)
      : (form.fuel ?? 0);
  const cabMetro =
    (form.transportTotal ?? 0) > 0
      ? Math.round(transportTotal * 0.4)
      : (form.cabMetro ?? 0);
  const electricity =
    (form.utilityTotal ?? 0) > 0
      ? Math.round(utilityTotal * 0.35)
      : (form.electricity ?? 0);
  const internet =
    (form.utilityTotal ?? 0) > 0
      ? Math.round(utilityTotal * 0.25)
      : (form.internet ?? 0);
  const gas =
    (form.utilityTotal ?? 0) > 0
      ? Math.round(utilityTotal * 0.2)
      : (form.gas ?? 0);
  const water =
    (form.utilityTotal ?? 0) > 0 ? Math.round(utilityTotal * 0.1) : form.water;
  const houseHelpMonthly =
    (form.domesticHelpTotal ?? 0) > 0
      ? Math.round(domesticHelpTotal * 0.6)
      : form.houseHelpMonthly;
  const cookHelpMonthly =
    (form.domesticHelpTotal ?? 0) > 0
      ? Math.round(domesticHelpTotal * 0.4)
      : form.cookHelpMonthly;
  const entertainment =
    (form.lifestyleTotal ?? 0) > 0
      ? Math.round(lifestyleTotal * 0.4)
      : (form.entertainment ?? 0);
  const shopping =
    (form.lifestyleTotal ?? 0) > 0
      ? Math.round(lifestyleTotal * 0.4)
      : (form.shopping ?? 0);
  const personalCare =
    (form.lifestyleTotal ?? 0) > 0
      ? Math.round(lifestyleTotal * 0.2)
      : form.personalCare;

  const normalized: FinancialProfile = {
    lifeStage: form.lifeStage ?? "bachelor",
    selfAge: form.selfAge ?? 18,
    spouseAge: form.lifeStage === "bachelor" ? undefined : form.spouseAge,
    numberOfKids: form.lifeStage === "kids" ? form.numberOfKids : undefined,
    kidsAges:
      form.lifeStage === "kids"
        ? (form.kidsAges ?? [])
            .slice(0, form.numberOfKids ?? 0)
            .filter((v): v is number => v !== undefined)
        : undefined,
    kidsGenders:
      form.lifeStage === "kids"
        ? (form.kidsGenders ?? []).slice(0, form.numberOfKids ?? 0)
        : undefined,
    cityTier: form.cityTier ?? "metro",

    monthlySalary: form.monthlySalary ?? 0,
    spouseIncome: form.lifeStage === "bachelor" ? undefined : form.spouseIncome,
    otherIncome: form.otherIncome,

    rentAmount: form.rentAmount ?? 0,
    rentMaintenanceMonthly: form.rentMaintenanceMonthly,
    // Prefer unified row; keep assets-step / legacy scalars unless user cleared all loans.
    homeLoanEMI: clearStaleLegacyLoans
      ? 0
      : (firstHome?.monthlyEMI ?? form.homeLoanEMI ?? 0),
    secondPropertyEMI: clearStaleLegacyLoans
      ? 0
      : (form.secondPropertyEMI ?? 0),
    carLoanEMI: clearStaleLegacyLoans
      ? 0
      : (firstCar?.monthlyEMI ?? form.carLoanEMI),
    bikeEMI: clearStaleLegacyLoans
      ? 0
      : (firstBike?.monthlyEMI ?? form.bikeEMI),
    personalLoanEMI: clearStaleLegacyLoans
      ? 0
      : (firstPersonal?.monthlyEMI ?? form.personalLoanEMI),
    personalLoanOutstanding: clearStaleLegacyLoans
      ? 0
      : (firstPersonal?.outstandingAmount ?? form.personalLoanOutstanding),
    personalLoanLenderName: clearStaleLegacyLoans
      ? ""
      : (firstPersonal?.lenderName ?? form.personalLoanLenderName ?? ""),
    personalLoanRate: clearStaleLegacyLoans
      ? 0
      : (firstPersonal?.interestRate ?? form.personalLoanRate),
    personalLoanRemainingMonths: clearStaleLegacyLoans
      ? 0
      : (firstPersonal?.remainingMonths ?? form.personalLoanRemainingMonths),
    homeLoanLenderName: clearStaleLegacyLoans
      ? ""
      : (firstHome?.lenderName ?? form.homeLoanLenderName ?? ""),
    homeLoanRate: clearStaleLegacyLoans
      ? 0
      : (firstHome?.interestRate ?? form.homeLoanRate),
    homeLoanRemainingMonths: clearStaleLegacyLoans
      ? 0
      : (firstHome?.remainingMonths ?? form.homeLoanRemainingMonths),
    carLoanLenderName: clearStaleLegacyLoans
      ? ""
      : (firstCar?.lenderName ?? form.carLoanLenderName ?? ""),
    carLoanRate: clearStaleLegacyLoans
      ? 0
      : (firstCar?.interestRate ?? form.carLoanRate),
    carLoanRemainingMonths: clearStaleLegacyLoans
      ? 0
      : (firstCar?.remainingMonths ?? form.carLoanRemainingMonths),
    bikeLoanLenderName: clearStaleLegacyLoans
      ? ""
      : (firstBike?.lenderName ?? form.bikeLoanLenderName ?? ""),
    bikeLoanRate: clearStaleLegacyLoans
      ? 0
      : (firstBike?.interestRate ?? form.bikeLoanRate),
    bikeLoanRemainingMonths: clearStaleLegacyLoans
      ? 0
      : (firstBike?.remainingMonths ?? form.bikeLoanRemainingMonths),
    bikeOutstanding: clearStaleLegacyLoans ? 0 : form.bikeOutstanding,
    creditCardBillMonthly: form.creditCardBillMonthly,
    creditCardEmiMonthly: form.creditCardEmiMonthly ?? 0,
    creditCardCarriedBalance: form.creditCardCarriedBalance ?? 0,
    homeLoanEMIDay: form.homeLoanEMIDay,
    homeLoanEMIMonth: form.homeLoanEMIMonth,
    carLoanEMIDay: form.carLoanEMIDay,
    personalLoanEMIDay: form.personalLoanEMIDay,
    educationLoanEMIDay: form.educationLoanEMIDay,
    creditCardBillDay: form.creditCardBillDay,
    sipAutoDebitDay: form.sipAutoDebitDay,
    ppfDepositDay: form.ppfDepositDay,
    additionalObligations: resolvedAdditionalObligations,
    odLimit: form.odLimit,
    odUsed: form.odUsed,
    odInterestRate: form.odInterestRate,
    odInterestOnlyYears: form.odInterestOnlyYears,
    odEMIStartYear: form.odEMIStartYear,
    unifiedLoans,

    vegetables,
    grocery,
    medicine,
    fuel,
    cabMetro,
    electricity,
    internet,
    gas,
    water,
    houseHelpMonthly,
    cookHelpMonthly,
    entertainment,
    shopping,
    personalCare,
    foodTotal: form.foodTotal ?? 0,
    transportTotal: form.transportTotal ?? 0,
    utilityTotal: form.utilityTotal ?? 0,
    domesticHelpTotal: form.domesticHelpTotal ?? 0,
    lifestyleTotal: form.lifestyleTotal ?? 0,
    kidsSchoolFees: form.lifeStage === "kids" ? form.kidsSchoolFees : undefined,
    kidsActivities: form.lifeStage === "kids" ? form.kidsActivities : undefined,
    parentsSupport: form.parentsSupport,
    parentsHealthInsuranceSumInsured:
      (form.parentsSupport ?? 0) > 0
        ? form.parentsHealthInsuranceSumInsured
        : undefined,
    parentsEmergencyCash:
      (form.parentsSupport ?? 0) > 0 ? form.parentsEmergencyCash : undefined,
    parentsCity: (form.parentsSupport ?? 0) > 0 ? form.parentsCity : undefined,

    hasHealthInsurance: form.hasHealthInsurance ?? false,
    healthInsuranceSumInsured: form.hasHealthInsurance
      ? form.healthInsuranceSumInsured
      : undefined,
    healthInsurancePremiumMonthly: form.hasHealthInsurance
      ? toMonthlyEquivalent(
          form.healthInsurancePremiumInput,
          form.healthInsurancePremiumFrequency,
        )
      : undefined,
    healthInsurancePremiumInput: form.hasHealthInsurance
      ? form.healthInsurancePremiumInput
      : undefined,
    healthInsurancePremiumFrequency: form.hasHealthInsurance
      ? (form.healthInsurancePremiumFrequency ?? "monthly")
      : undefined,
    healthInsuranceRenewalMonth: form.hasHealthInsurance
      ? form.healthInsuranceRenewalMonth
      : undefined,
    healthInsuranceRenewalDay: form.hasHealthInsurance
      ? form.healthInsuranceRenewalDay
      : undefined,
    hasTermInsurance: form.hasTermInsurance ?? false,
    termInsuranceSumAssured: form.hasTermInsurance
      ? form.termInsuranceSumAssured
      : undefined,
    termInsurancePremiumMonthly: form.hasTermInsurance
      ? toMonthlyEquivalent(
          form.termInsurancePremiumInput,
          form.termInsurancePremiumFrequency,
        )
      : undefined,
    termInsurancePremiumInput: form.hasTermInsurance
      ? form.termInsurancePremiumInput
      : undefined,
    termInsurancePremiumFrequency: form.hasTermInsurance
      ? (form.termInsurancePremiumFrequency ?? "monthly")
      : undefined,
    termInsurancePremiumTillYear: form.hasTermInsurance
      ? form.termInsurancePremiumTillYear
      : undefined,
    termInsuranceRenewalMonth: form.hasTermInsurance
      ? form.termInsuranceRenewalMonth
      : undefined,
    termInsuranceRenewalDay: form.hasTermInsurance
      ? form.termInsuranceRenewalDay
      : undefined,
    carInsurancePremiumMonthly: toMonthlyEquivalent(
      form.carInsurancePremiumInput,
      form.carInsurancePremiumFrequency,
    ),
    carInsurancePremiumInput: form.carInsurancePremiumInput,
    carInsurancePremiumFrequency:
      form.carInsurancePremiumFrequency ?? "monthly",
    carInsuranceRenewalMonth: form.carInsuranceRenewalMonth,
    carInsuranceRenewalDay: form.carInsuranceRenewalDay,
    bikeInsurancePremiumMonthly: toMonthlyEquivalent(
      form.bikeInsurancePremiumInput,
      form.bikeInsurancePremiumFrequency,
    ),
    bikeInsurancePremiumInput: form.bikeInsurancePremiumInput,
    bikeInsurancePremiumFrequency:
      form.bikeInsurancePremiumFrequency ?? "monthly",
    bikeInsuranceRenewalMonth: form.bikeInsuranceRenewalMonth,
    bikeInsuranceRenewalDay: form.bikeInsuranceRenewalDay,
    hasOtherInsurance: form.hasOtherInsurance ?? false,
    otherInsurancePremiums: form.hasOtherInsurance
      ? (form.otherInsurancePremiums ?? []).map((row) => {
          const r = row as {
            id?: string;
            policyName?: string;
            premiumAmount?: number;
            premiumInput?: number;
            frequency?: PremiumFrequency;
            maturityAmount?: number;
            maturityYear?: number;
            renewalMonth?: number;
            renewalDay?: number;
          };
          const amount = r.premiumAmount ?? r.premiumInput;
          const freq = r.frequency ?? "monthly";
          return {
            id: r.id,
            policyName: r.policyName,
            premiumAmount: amount,
            frequency: freq,
            monthlyAmount: toMonthlyEquivalent(amount, freq) ?? 0,
            maturityAmount: r.maturityAmount ?? 0,
            maturityYear: r.maturityYear ?? 0,
            renewalMonth: r.renewalMonth,
            renewalDay: r.renewalDay,
          };
        })
      : [],
    otherInsurancePremiumMonthly: form.hasOtherInsurance
      ? (() => {
          const rows = form.otherInsurancePremiums ?? [];
          const fromPolicies = rows.reduce((total, row) => {
            const r = row as {
              premiumAmount?: number;
              premiumInput?: number;
              frequency?: PremiumFrequency;
            };
            const amount = r.premiumAmount ?? r.premiumInput;
            return total + (toMonthlyEquivalent(amount, r.frequency) ?? 0);
          }, 0);
          if (fromPolicies > 0) return fromPolicies;
          return (
            toMonthlyEquivalent(
              form.otherInsurancePremiumInput,
              form.otherInsurancePremiumFrequency,
            ) ?? 0
          );
        })()
      : undefined,
    otherInsurancePremiumInput: form.hasOtherInsurance
      ? form.otherInsurancePremiumInput
      : undefined,
    otherInsurancePremiumFrequency: form.hasOtherInsurance
      ? (form.otherInsurancePremiumFrequency ?? "monthly")
      : undefined,
    lifeInsuranceMaturityAmount: form.hasOtherInsurance
      ? form.lifeInsuranceMaturityAmount
      : undefined,
    lifeInsuranceMaturityYear: form.hasOtherInsurance
      ? form.lifeInsuranceMaturityYear
      : undefined,

    savingsAccountBalance: form.savingsAccountBalance ?? 0,
    fdValue: form.fdValue,
    fdRate: form.fdRate,
    fdMaturityYear: form.fdMaturityYear,
    fdTenureYears: form.fdTenureYears,
    liquidMFValue: form.liquidMFValue,
    emergencyFundCurrent: form.emergencyFundCurrent ?? 0,
    otherLiquidSavings: form.otherLiquidSavings,
    mfValue: form.mfValue,
    indianStocksValue: form.indianStocksValue,
    usStocksValueINR: form.usStocksValueINR,
    usMFValueINR: form.usMFValueINR,
    rsuValueINR: form.rsuValueINR,
    totalEquityValue: form.totalEquityValue,
    customInvestments: form.customInvestments ?? [],
    ppfBalance: form.ppfBalance,
    npsBalance: form.npsBalance,
    epfBalance: form.epfBalance,
    ownsHome: form.ownsHome ?? false,
    homeMarketValue: form.ownsHome ? form.homeMarketValue : undefined,
    homeLoanOutstanding: form.ownsHome ? form.homeLoanOutstanding : undefined,
    ownsCar: form.ownsCar ?? false,
    carMarketValue: form.ownsCar ? form.carMarketValue : undefined,
    carLoanOutstanding: form.ownsCar ? form.carLoanOutstanding : undefined,
    goldValue: form.goldValue,
    otherAssets: form.otherAssets,
    otherAssetLabel:
      (form.otherAssets ?? 0) > 0 && form.otherAssetLabel?.trim()
        ? form.otherAssetLabel.trim()
        : undefined,
    monthlySIP: form.monthlySIP ?? 0,
    monthlyRD: form.monthlyRD,
    monthlyPPFContribution: form.monthlyPPFContribution,
    monthlyNPSContribution: form.monthlyNPSContribution,
    monthlyEPFContribution: form.monthlyEPFContribution ?? 0,
    ssy: form.ssy,
    hasPostOfficeSchemes: form.hasPostOfficeSchemes ?? false,
    postOfficeSchemes: form.hasPostOfficeSchemes
      ? (form.postOfficeSchemes ?? [])
          .filter((row) => (row.amount ?? 0) > 0)
          .map((row) => ({
            id: row.id ?? newAnalyseRowId(),
            scheme: row.scheme ?? "other",
            amount: row.amount ?? 0,
            maturityYear: row.maturityYear,
          }))
      : [],
    nscDepositAmount: (() => {
      if (form.hasPostOfficeSchemes) {
        const nscTotal = (form.postOfficeSchemes ?? [])
          .filter((row) => row.scheme === "nsc")
          .reduce((sum, row) => sum + (row.amount ?? 0), 0);
        if (nscTotal > 0) return nscTotal;
      }
      if (form.investsInNsc) {
        return (
          form.nscDepositAmount ??
          (form as Partial<AnalyseFormValues> & { nscMonthly?: number })
            .nscMonthly ??
          0
        );
      }
      return 0;
    })(),
    nscMaturityYear: (() => {
      if (form.hasPostOfficeSchemes) {
        const nscRow = (form.postOfficeSchemes ?? []).find(
          (row) => row.scheme === "nsc" && (row.amount ?? 0) > 0,
        );
        if (nscRow) return nscRow.maturityYear;
      }
      return form.investsInNsc ? form.nscMaturityYear : undefined;
    })(),
    investsInNsc: (() => {
      if (form.hasPostOfficeSchemes) {
        return (form.postOfficeSchemes ?? []).some(
          (row) => row.scheme === "nsc" && (row.amount ?? 0) > 0,
        );
      }
      return form.investsInNsc ?? false;
    })(),

    primaryGoal: form.primaryGoal ?? "",
    retirementTargetCorpus: form.retirementTargetCorpus,
    retirementAge: form.retirementAge,
    kidsEducationFundTarget:
      form.lifeStage === "kids" ? form.kidsEducationFundTarget : undefined,
    kidsMarriageFundTarget:
      form.lifeStage === "kids" ? form.kidsMarriageFundTarget : undefined,
    emergencyFundTarget: form.emergencyFundTarget,
    medicalEmergencyFund: form.medicalEmergencyFund,
    bereavementFund: form.bereavementFund,
    homePurchaseTarget:
      (form.rentAmount ?? 0) > 0 ? form.homePurchaseTarget : undefined,
    homePurchaseYear:
      (form.rentAmount ?? 0) > 0 ? form.homePurchaseYear : undefined,
    carPurchaseTarget: form.ownsCar ? undefined : form.carPurchaseTarget,
    carPurchaseYear: form.ownsCar ? undefined : form.carPurchaseYear,
    kidsEducationFundTargets:
      form.lifeStage === "kids" ? form.kidsEducationFundTargets : undefined,
    kidsMarriageFundTargets:
      form.lifeStage === "kids" ? form.kidsMarriageFundTargets : undefined,
    planningMarriage: form.planningMarriage,
    marriageFundTarget: form.marriageFundTarget,
    marriageFundYear: form.marriageFundYear,
    planningBaby: form.planningBaby,
    babyFundTarget: form.babyFundTarget,
    babyFundYear: form.babyFundYear,
    dismissedGoals: form.dismissedGoals,
    riskAnswers: form.riskAnswers,
    riskTolerance: scoreRiskTolerance(form.riskAnswers) ?? form.riskTolerance,
  };

  return normalized;
}

export const analyseDefaultValues: Partial<AnalyseFormValues> = {
  lifeStage: "bachelor",
  primaryGoal: "grow_wealth",
  selfAge: 0,
  spouseAge: 0,
  numberOfKids: undefined,
  kidsAges: [],
  kidsGenders: [],
  cityTier: "metro",
  monthlySalary: 0,
  spouseIncome: 0,
  otherIncome: 0,
  additionalObligations: [],
  unifiedLoans: [],
  rentAmount: 0,
  rentMaintenanceMonthly: 0,
  homeLoanEMI: 0,
  secondPropertyEMI: 0,
  carLoanEMI: 0,
  bikeEMI: 0,
  personalLoanEMI: 0,
  personalLoanOutstanding: 0,
  personalLoanLenderName: "",
  personalLoanRate: 0,
  personalLoanRemainingMonths: 0,
  homeLoanLenderName: "",
  homeLoanRate: 0,
  homeLoanRemainingMonths: 0,
  carLoanLenderName: "",
  carLoanRate: 0,
  carLoanRemainingMonths: 0,
  bikeLoanLenderName: "",
  bikeLoanRate: 0,
  bikeLoanRemainingMonths: 0,
  bikeOutstanding: 0,
  creditCardBillMonthly: 0,
  creditCardEmiMonthly: 0,
  creditCardCarriedBalance: 0,
  homeLoanEMIDay: undefined,
  homeLoanEMIMonth: undefined,
  carLoanEMIDay: undefined,
  personalLoanEMIDay: undefined,
  educationLoanEMIDay: undefined,
  creditCardBillDay: undefined,
  sipAutoDebitDay: undefined,
  ppfDepositDay: undefined,
  odLimit: 0,
  odUsed: 0,
  odInterestRate: 0,
  odInterestOnlyYears: 0,
  odEMIStartYear: 0,
  hasHealthInsurance: false,
  healthInsuranceSumInsured: 0,
  healthInsurancePremiumInput: 0,
  healthInsurancePremiumFrequency: "monthly",
  healthInsuranceRenewalMonth: undefined,
  healthInsuranceRenewalDay: undefined,
  hasTermInsurance: false,
  termInsuranceSumAssured: 0,
  termInsurancePremiumInput: 0,
  termInsurancePremiumFrequency: "monthly",
  termInsurancePremiumTillYear: 0,
  termInsuranceRenewalMonth: undefined,
  termInsuranceRenewalDay: undefined,
  carInsurancePremiumInput: 0,
  carInsurancePremiumFrequency: "monthly",
  carInsuranceRenewalMonth: undefined,
  carInsuranceRenewalDay: undefined,
  bikeInsurancePremiumInput: 0,
  bikeInsurancePremiumFrequency: "monthly",
  bikeInsuranceRenewalMonth: undefined,
  bikeInsuranceRenewalDay: undefined,
  hasOtherInsurance: false,
  otherInsurancePremiumInput: 0,
  otherInsurancePremiumFrequency: "monthly",
  otherInsurancePremiums: [],
  lifeInsuranceMaturityAmount: 0,
  lifeInsuranceMaturityYear: 0,
  ownsHome: false,
  homeMarketValue: 0,
  homeLoanOutstanding: 0,
  ownsCar: false,
  carMarketValue: 0,
  carLoanOutstanding: 0,
  goldValue: 0,
  otherAssets: 0,
  otherAssetLabel: "",
  retirementAge: 0,
  monthlySIP: 0,
  monthlyRD: 0,
  monthlyPPFContribution: 0,
  monthlyNPSContribution: 0,
  monthlyEPFContribution: 0,
  ssy: 0,
  nscDepositAmount: 0,
  nscMaturityYear: 0,
  investsInNsc: false,
  hasPostOfficeSchemes: false,
  postOfficeSchemes: [],
  savingsAccountBalance: 0,
  fdValue: 0,
  fdRate: 0,
  fdMaturityYear: 0,
  fdTenureYears: 0,
  liquidMFValue: 0,
  emergencyFundCurrent: 0,
  otherLiquidSavings: 0,
  mfValue: 0,
  indianStocksValue: 0,
  usStocksValueINR: 0,
  usMFValueINR: 0,
  rsuValueINR: 0,
  totalEquityValue: 0,
  customInvestments: [],
  ppfBalance: 0,
  npsBalance: 0,
  epfBalance: 0,
  vegetables: 0,
  grocery: 0,
  medicine: 0,
  fuel: 0,
  cabMetro: 0,
  electricity: 0,
  internet: 0,
  gas: 0,
  water: 0,
  houseHelpMonthly: 0,
  cookHelpMonthly: 0,
  entertainment: 0,
  shopping: 0,
  personalCare: 0,
  foodTotal: 0,
  transportTotal: 0,
  utilityTotal: 0,
  domesticHelpTotal: 0,
  lifestyleTotal: 0,
  kidsSchoolFees: 0,
  kidsActivities: 0,
  parentsSupport: 0,
  parentsHealthInsuranceSumInsured: 0,
  parentsEmergencyCash: 0,
  retirementTargetCorpus: 0,
  kidsEducationFundTarget: 0,
  kidsMarriageFundTarget: 0,
  emergencyFundTarget: 0,
  medicalEmergencyFund: 0,
  bereavementFund: 0,
  homePurchaseTarget: 0,
  homePurchaseYear: 0,
  carPurchaseTarget: 0,
  carPurchaseYear: 0,
};
