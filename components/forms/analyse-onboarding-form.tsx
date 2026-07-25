"use client";

import { Button } from "@/components/ui/button";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import MoneyInput from "@/components/ui/MoneyInput";
import PrivateAmount from "@/components/ui/PrivateAmount";
import AnalyseAdvisorModal from "@/components/analyse/AnalyseAdvisorModal";
import {
  DayOfMonthPicker,
  PremiumDueFields,
} from "@/components/forms/ObligationDateFields";
import NumberInput from "../ui/NumberInput";
import {
  CITY_TIER_LABELS,
  CITY_TIER_VALUES,
  LIFE_STAGE_LABELS,
  LIFE_STAGE_VALUES,
  POST_OFFICE_SCHEME_LABELS,
  POST_OFFICE_SCHEME_VALUES,
  PREMIUM_FREQUENCY_VALUES,
  PRIMARY_GOAL_LABELS,
  PRIMARY_GOAL_VALUES,
  UNIFIED_LOAN_TYPE_VALUES,
  analyseDefaultValues,
  coalesceInsuranceToggles,
  financialProfileToFormValues,
  mergeAnalyseDraftWithProfile,
  newAnalyseRowId,
  normalizeAnalyseFormValues,
  parseMoneyInput,
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
  step7Schema,
  type AnalyseFormValues,
  type FinancialProfile,
  type PostOfficeSchemeId,
  type PremiumFrequency,
} from "@/lib/analyse-form-schema";
import { isValidStoredAnalysis } from "@/lib/analysisSnapshotValidation";
import { formatCurrency } from "@/lib/finance";
import { formatIndian, formatInWords } from "@/lib/formatters";
import { cn } from "@/lib/cn";
import { getAIFixPlan } from "@/lib/aiService";
import { invalidateProfileMonthlySalaryCache } from "@/lib/trackerProfileIncome";
import {
  fetchUserAnalyseSnapshot,
  upsertUserAnalyseSnapshot,
} from "@/lib/userAnalyseSnapshot";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import { useObligationStore } from "@/store/obligationStore";
import { AnimatePresence, m } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  type FieldPath,
} from "react-hook-form";

function wipeAnalyseLocalCaches() {
  try {
    const uid = useAuthStore.getState().user?.id ?? "__guest__";
    localStorage.removeItem(`finkoin-financial:${uid}`);
    localStorage.removeItem("finkoin-financial");
    localStorage.removeItem("finkoin_ai_cache");
  } catch {
    /* ignore */
  }
}

const STEPS = [
  { title: "Personal profile", short: "Profile" },
  { title: "Income", short: "Income" },
  { title: "Fixed obligations", short: "Obligations" },
  { title: "Living expenses", short: "Expenses" },
  { title: "Insurance coverage", short: "Insurance" },
  { title: "Assets and savings", short: "Assets" },
  { title: "Goals", short: "Goals" },
] as const;

const LOAN_TYPE_OPTIONS: Array<{
  value: (typeof UNIFIED_LOAN_TYPE_VALUES)[number];
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

function detectLastStep(profile: Partial<AnalyseFormValues> | null): number {
  const p = profile ?? {};
  if (
    (p.retirementTargetCorpus ?? 0) > 0 ||
    (p.emergencyFundTarget ?? 0) > 0 ||
    (p.kidsEducationFundTarget ?? 0) > 0 ||
    (p.kidsMarriageFundTarget ?? 0) > 0 ||
    (p.homePurchaseTarget ?? 0) > 0 ||
    (p.medicalEmergencyFund ?? 0) > 0
  ) {
    return 6;
  }
  if (
    (p.mfValue ?? 0) > 0 ||
    (p.epfBalance ?? 0) > 0 ||
    (p.fdValue ?? 0) > 0 ||
    (p.savingsAccountBalance ?? 0) > 0 ||
    (p.ppfBalance ?? 0) > 0
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

const STEP_SCHEMAS = [
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
  step7Schema,
] as const;

const moneyFieldOptions = {
  setValueAs: parseMoneyInput,
} as const;

const wholeNumberFieldOptions = {
  setValueAs: (value: unknown) => parseMoneyInput(value),
} as const;

const FIELD_HELPER = "mt-1 text-xs text-[#9B9A94]";
const INVESTMENT_CACHE_HELPER = "Investment cache";

function mergeHelpers(...helpers: Array<string | undefined>) {
  return helpers.filter(Boolean).join(" · ");
}

const AgeNumberInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    id: string;
    label: string;
    error?: string;
    helper?: string;
    required?: boolean;
    inlineOnDesktop?: boolean;
  }
>(function AgeNumberInput(
  {
    id,
    label,
    error,
    helper,
    required,
    inlineOnDesktop = false,
    placeholder = "0",
    ...inputProps
  },
  ref,
) {
  return (
    <div
      className={`flex flex-col gap-1.5 ${inlineOnDesktop ? "sm:flex-row sm:items-center sm:gap-3" : ""}`}
    >
      <label
        htmlFor={id}
        className={`text-[14px] font-medium text-[#5F5E5A] ${inlineOnDesktop ? "sm:min-w-[160px] sm:whitespace-nowrap" : ""}`}
      >
        {label}
        {required ? <span className="text-[#E24B4A]"> *</span> : null}
      </label>
      <input
        ref={ref}
        id={id}
        inputMode="numeric"
        autoComplete="off"
        className={`h-12 rounded-[10px] border-[1.5px] border-[#E8E6F0] bg-white px-[14px] text-[15px] text-[#111110] outline-none focus:border-[#534AB7] focus:shadow-[0_0_0_3px_rgba(83,74,183,0.1)] placeholder:text-slate-400 ${inlineOnDesktop ? "sm:flex-1" : ""}`}
        placeholder={placeholder}
        {...inputProps}
      />
      {helper ? <p className={FIELD_HELPER}>{helper}</p> : null}
      {error ? <p className="text-sm text-[#E24B4A]">{error}</p> : null}
    </div>
  );
});

AgeNumberInput.displayName = "AgeNumberInput";

function TextInput({
  id,
  label,
  error,
  helper,
  required,
  onChange,
  style,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  helper?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[14px] font-medium text-[#5F5E5A]">
        {label}
        {required ? <span className="text-[#E24B4A]"> *</span> : null}
      </label>
      <input
        id={id}
        autoCapitalize="characters"
        className="h-12 rounded-[10px] border-[1.5px] border-[#E8E6F0] bg-white px-[14px] text-[15px] uppercase text-[#111110] outline-none focus:border-[#534AB7] focus:shadow-[0_0_0_3px_rgba(83,74,183,0.1)] placeholder:normal-case placeholder:text-slate-400"
        style={{ textTransform: "uppercase", ...style }}
        onChange={(e) => {
          const start = e.target.selectionStart;
          const end = e.target.selectionEnd;
          const next = e.target.value.toUpperCase();
          e.target.value = next;
          if (start != null && end != null) {
            requestAnimationFrame(() => e.target.setSelectionRange(start, end));
          }
          onChange?.(e);
        }}
        {...props}
      />
      {helper ? <p className={FIELD_HELPER}>{helper}</p> : null}
      {error ? <p className="text-sm text-[#E24B4A]">{error}</p> : null}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#534AB7]">
      {children}
    </h2>
  );
}

function Note({
  tone = "yellow",
  children,
}: {
  tone?: "yellow" | "red" | "green" | "blue";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        tone === "red"
          ? "border-red-200 bg-red-50 text-red-800"
          : tone === "green"
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : tone === "blue"
              ? "border-[#C9C4F2] bg-[#EEEDFE] text-[#3C3489]"
              : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      {children}
    </div>
  );
}

function applyZodFieldErrors(
  flat: { fieldErrors: Record<string, string[] | undefined> },
  setError: (
    name: FieldPath<AnalyseFormValues>,
    error: { message: string },
  ) => void,
) {
  for (const key of Object.keys(flat.fieldErrors)) {
    const message = flat.fieldErrors[key]?.[0];
    if (message) {
      setError(key as FieldPath<AnalyseFormValues>, { message });
    }
  }
}

function sum(values: Array<number | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function ToggleButtons({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const isYesNo =
    options.length === 2 &&
    options.every((o) => o.value === "yes" || o.value === "no");

  // Yes/No: chip cards (not the compact toggle). Monthly/Yearly keep the toggle.
  if (isYesNo) {
    return (
      <div className="flex gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`min-h-[44px] flex-1 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition ${
                selected
                  ? "border-[#534AB7] bg-[#EEEDFE] text-[#3C3489]"
                  : "border-[#E8E6F0] bg-white text-[#111110] hover:border-[#AFA9EC]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex rounded-[10px] bg-[#F7F7F4] p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`h-9 flex-1 rounded-[8px] px-5 text-sm font-medium transition-all duration-150 ${
              selected
                ? "bg-white font-semibold text-[#534AB7] shadow-[0_1px_4px_rgba(0,0,0,0.1)]"
                : "bg-transparent text-[#9B9A94]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function RadioCards({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: string }>;
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-11 rounded-xl border px-3 text-sm font-medium transition-colors ${
              selected
                ? "border-[#534AB7] bg-[#534AB7]/10 text-slate-900"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function PremiumField({
  inputId,
  label,
  amountError,
  frequency,
  onFrequencyChange,
  children,
}: {
  inputId: string;
  label: string;
  amountError?: string;
  frequency: PremiumFrequency;
  onFrequencyChange: (value: PremiumFrequency) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <div className="w-[180px]">
          <ToggleButtons
            options={[
              { label: "Monthly", value: "monthly" },
              { label: "Yearly", value: "yearly" },
            ]}
            value={frequency}
            onChange={(value) => onFrequencyChange(value as PremiumFrequency)}
          />
        </div>
      </div>
      {children}
      {amountError ? (
        <p className="text-sm text-[#E24B4A]">{amountError}</p>
      ) : null}
    </div>
  );
}

export function AnalyseOnboardingForm() {
  const router = useRouter();
  const lastSubmission = useFinancialStore((state) => state.lastSubmission);
  const hasHydrated = useFinancialStore((state) => state.hasHydrated);
  const authUserId = useAuthStore((s) => s.user?.id ?? null);
  const step = useFinancialStore((state) => state.currentStep);
  const setStep = useFinancialStore((state) => state.setCurrentStep);
  const setAnalysis = useFinancialStore((state) => state.setAnalysis);
  const setFullAnalysis = useFinancialStore((state) => state.setFullAnalysis);
  const prevLifeStageRef = useRef<AnalyseFormValues["lifeStage"] | null>(null);
  const prevHasHealthRef = useRef<boolean | undefined>(undefined);
  const prevHasTermRef = useRef<boolean | undefined>(undefined);
  const prevHasOtherInsuranceRef = useRef<boolean | undefined>(undefined);
  const prevOwnsHomeRef = useRef<boolean | undefined>(undefined);
  const prevOwnsCarRef = useRef<boolean | undefined>(undefined);
  const prevInvestsNscRef = useRef<boolean | undefined>(undefined);
  const prevParentsSupportRef = useRef<number | undefined>(undefined);

  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [isRenting, setIsRenting] = useState(
    (lastSubmission?.rentAmount || 0) > 0,
  );
  const [hasLoans, setHasLoans] = useState(
    () =>
      (lastSubmission?.unifiedLoans?.length ?? 0) > 0 ||
      (lastSubmission?.homeLoanEMI || 0) > 0 ||
      (lastSubmission?.personalLoanEMI || 0) > 0 ||
      (lastSubmission?.carLoanEMI || 0) > 0,
  );
  const [hasCreditCardOutstanding, setHasCreditCardOutstanding] = useState(
    (lastSubmission?.creditCardBillMonthly || 0) > 0,
  );
  const [hasVehicleToggle, setHasVehicleToggle] = useState(
    (lastSubmission?.carLoanEMI || 0) > 0 ||
      (lastSubmission?.carMarketValue || 0) > 0,
  );
  /** Loan cards the user marked as saved (collapsed summary). Form values stay intact. */
  const [savedLoanIds, setSavedLoanIds] = useState<string[]>([]);
  const [liquidMfInfoOpen, setLiquidMfInfoOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepNavError, setStepNavError] = useState<string | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [showResumeOption, setShowResumeOption] = useState(false);
  /** Modal wraps the full 7-step form (all fields). Yes/No uses chips; Monthly/Yearly stays toggle. */
  const [advisorOpen, setAdvisorOpen] = useState(true);
  /** Per-user: avoid re-fetching cloud snapshot every mount; cleared when auth user changes. */
  const cloudHydrateKey = useRef<string | null>(null);
  /** After "Start fresh", do not immediately pull server snapshot for this account. */
  const skipCloudHydrateRef = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    resetField,
    reset,
    setError,
    clearErrors,
    getValues,
    formState: { errors },
    control,
  } = useForm<AnalyseFormValues>({
    defaultValues: analyseDefaultValues,
    mode: "onSubmit",
    shouldUnregister: false,
  });

  const bindMoneyField = useCallback(
    (name: FieldPath<AnalyseFormValues>) => {
      const reg = register(name, moneyFieldOptions);
      return {
        ...reg,
        onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
          (
            reg as {
              onFocus?: (ev: React.FocusEvent<HTMLInputElement>) => void;
            }
          ).onFocus?.(e);
          const v = getValues(name);
          const num = typeof v === "number" ? v : Number(v);
          if (num === 0 || v === "" || v === undefined || v === null) {
            setValue(name, undefined as never, {
              shouldValidate: false,
              shouldDirty: true,
            });
            e.target.value = "";
          }
        },
        onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
          const raw = e.currentTarget.value.replace(/[,\s₹]/g, "").trim();
          if (raw === "") {
            setValue(name, 0, { shouldValidate: true, shouldDirty: true });
          }
          (
            reg as { onBlur?: (ev: React.FocusEvent<HTMLInputElement>) => void }
          ).onBlur?.(e);
        },
      };
    },
    [register, setValue, getValues],
  );

  const bindWholeNumberField = useCallback(
    (name: FieldPath<AnalyseFormValues>) => {
      const reg = register(name, wholeNumberFieldOptions);
      return {
        ...reg,
        onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
          (
            reg as {
              onFocus?: (ev: React.FocusEvent<HTMLInputElement>) => void;
            }
          ).onFocus?.(e);
          const v = getValues(name);
          const num = typeof v === "number" ? v : Number(v);
          if (num === 0 || v === "" || v === undefined || v === null) {
            setValue(name, undefined as never, {
              shouldValidate: false,
              shouldDirty: true,
            });
            e.target.value = "";
          }
        },
        onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
          const raw = e.currentTarget.value.trim();
          if (raw === "") {
            setValue(name, 0, { shouldValidate: true, shouldDirty: true });
          }
          (
            reg as { onBlur?: (ev: React.FocusEvent<HTMLInputElement>) => void }
          ).onBlur?.(e);
        },
      };
    },
    [register, setValue, getValues],
  );

  const {
    fields: unifiedLoanFields,
    append: appendUnifiedLoan,
    remove: removeUnifiedLoan,
  } = useFieldArray({
    control,
    name: "unifiedLoans",
  });
  const {
    fields: otherInsuranceFields,
    append: appendOtherInsurance,
    remove: removeOtherInsurance,
  } = useFieldArray({
    control,
    name: "otherInsurancePremiums",
  });
  const {
    fields: postOfficeSchemeFields,
    append: appendPostOfficeScheme,
    remove: removePostOfficeScheme,
  } = useFieldArray({
    control,
    name: "postOfficeSchemes",
  });

  const addOtherInsuranceRow = useCallback(() => {
    const nextIndex = otherInsuranceFields.length;
    appendOtherInsurance({
      id: newAnalyseRowId(),
      policyName: "",
      premiumAmount: 0,
      frequency: "monthly",
      maturityAmount: 0,
      maturityYear: 0,
    });
    resetField(`otherInsurancePremiums.${nextIndex}.policyName` as const, {
      defaultValue: "",
    });
    resetField(`otherInsurancePremiums.${nextIndex}.premiumAmount` as const, {
      defaultValue: 0,
    });
    resetField(`otherInsurancePremiums.${nextIndex}.frequency` as const, {
      defaultValue: "monthly",
    });
    resetField(`otherInsurancePremiums.${nextIndex}.maturityAmount` as const, {
      defaultValue: 0,
    });
    resetField(`otherInsurancePremiums.${nextIndex}.maturityYear` as const, {
      defaultValue: 0,
    });
  }, [appendOtherInsurance, otherInsuranceFields.length, resetField]);
  const {
    fields: customInvestmentFields,
    append: appendCustomInvestment,
    remove: removeCustomInvestment,
  } = useFieldArray({
    control,
    name: "customInvestments",
  });

  const lifeStage = watch("lifeStage");
  const numberOfKids = watch("numberOfKids") ?? 0;
  const hasHealthInsurance = watch("hasHealthInsurance");
  const hasTermInsurance = watch("hasTermInsurance");
  const hasOtherInsurance = watch("hasOtherInsurance");
  const ownsHome = watch("ownsHome");
  const ownsCar = watch("ownsCar");
  const parentsSupport = watch("parentsSupport") ?? 0;
  const hasParentsInsurance =
    (watch("parentsHealthInsuranceSumInsured") ?? 0) > 0;
  const selfAge = watch("selfAge");
  const retirementAge = watch("retirementAge") ?? 60;
  const primaryGoal = watch("primaryGoal");

  const watchedValues = watch();
  const hasCarInForm =
    (watchedValues.carLoanEMI || 0) > 0 ||
    (watchedValues.carMarketValue || 0) > 0 ||
    hasVehicleToggle === true;
  useEffect(() => {
    if ((watchedValues.rentAmount ?? 0) > 0) setIsRenting(true);
    if ((watchedValues.creditCardBillMonthly ?? 0) > 0)
      setHasCreditCardOutstanding(true);
  }, [watchedValues.rentAmount, watchedValues.creditCardBillMonthly]);
  useEffect(() => {
    if (
      (watchedValues.carLoanEMI || 0) > 0 ||
      (watchedValues.carMarketValue || 0) > 0
    ) {
      setHasVehicleToggle(true);
    }
  }, [watchedValues.carLoanEMI, watchedValues.carMarketValue]);

  /** Hidden fields keep react-hook-form values from a prior run — only sum what the current step UI collects. */
  const totalIncome: number = sum([
    watchedValues.monthlySalary,
    lifeStage !== "bachelor" ? watchedValues.spouseIncome : 0,
    watchedValues.otherIncome,
  ]);
  const homeLoanEmiLive = useMemo(() => {
    const rows = watchedValues.unifiedLoans ?? [];
    const fromUnified = rows
      .filter((r) => r.loanType === "home_loan")
      .reduce((s, r) => s + (r.monthlyEMI ?? 0), 0);
    if (fromUnified > 0) return fromUnified;
    return watchedValues.homeLoanEMI ?? 0;
  }, [watchedValues.unifiedLoans, watchedValues.homeLoanEMI]);

  const fixedObligations: number = sum([
    watchedValues.rentAmount,
    (watchedValues.rentAmount ?? 0) > 0
      ? watchedValues.rentMaintenanceMonthly
      : 0,
    watchedValues.secondPropertyEMI,
    watchedValues.creditCardBillMonthly,
    ...(watchedValues.unifiedLoans ?? []).map((row) => row.monthlyEMI ?? 0),
  ]);
  const monthlyLivingExpenses: number = sum([
    (watchedValues.foodTotal ?? 0) > 0
      ? watchedValues.foodTotal
      : sum([
          watchedValues.vegetables,
          watchedValues.grocery,
          watchedValues.medicine,
        ]),
    (watchedValues.transportTotal ?? 0) > 0
      ? watchedValues.transportTotal
      : sum([watchedValues.fuel, watchedValues.cabMetro]),
    (watchedValues.utilityTotal ?? 0) > 0
      ? watchedValues.utilityTotal
      : sum([
          watchedValues.electricity,
          watchedValues.internet,
          watchedValues.gas,
          watchedValues.water,
        ]),
    (watchedValues.domesticHelpTotal ?? 0) > 0
      ? watchedValues.domesticHelpTotal
      : sum([watchedValues.houseHelpMonthly, watchedValues.cookHelpMonthly]),
    (watchedValues.lifestyleTotal ?? 0) > 0
      ? watchedValues.lifestyleTotal
      : sum([
          watchedValues.entertainment,
          watchedValues.shopping,
          watchedValues.personalCare,
        ]),
    lifeStage === "kids" ? watchedValues.kidsSchoolFees : 0,
    lifeStage === "kids" ? watchedValues.kidsActivities : 0,
    watchedValues.parentsSupport,
  ]);
  const emergencyFundSuggestion =
    monthlyLivingExpenses + fixedObligations > 0
      ? (monthlyLivingExpenses + fixedObligations) * 6
      : undefined;
  const retirementYears =
    selfAge && retirementAge ? Math.max(0, retirementAge - selfAge) : undefined;
  const hasEligibleGirlChild = useMemo(
    () =>
      (watchedValues.kidsGenders ?? []).some(
        (gender, index) =>
          gender === "girl" && (watchedValues.kidsAges?.[index] ?? 99) < 10,
      ),
    [watchedValues.kidsAges, watchedValues.kidsGenders],
  );
  const investmentsEmpty = !sum([
    watchedValues.fdValue,
    watchedValues.liquidMFValue,
    watchedValues.totalEquityValue,
    watchedValues.mfValue,
    watchedValues.indianStocksValue,
    watchedValues.usStocksValueINR,
    watchedValues.usMFValueINR,
    watchedValues.rsuValueINR,
    watchedValues.ppfBalance,
    watchedValues.npsBalance,
    watchedValues.epfBalance,
    ...(watchedValues.customInvestments ?? []).map((inv) => inv.currentValue),
  ]);
  const monthlyNeedsForEmergency = monthlyLivingExpenses + fixedObligations;
  const erLiveSavings = watchedValues.savingsAccountBalance ?? 0;
  const erLiveLiq = watchedValues.liquidMFValue ?? 0;
  const erLiveFd = watchedValues.fdValue ?? 0;
  const erLiveOther = watchedValues.otherLiquidSavings ?? 0;
  const erLiveSavingsCounted = erLiveSavings * 1;
  const erLiveLiqCounted = erLiveLiq * 0.95;
  const erLiveFdCounted = erLiveFd * 0.7;
  const erLiveOtherCounted = erLiveOther * 0.5;
  const erLiveTotal =
    erLiveSavingsCounted +
    erLiveLiqCounted +
    erLiveFdCounted +
    erLiveOtherCounted;
  const erLiveMonths =
    monthlyNeedsForEmergency > 0 ? erLiveTotal / monthlyNeedsForEmergency : 0;
  const erMonthsToneClass =
    monthlyNeedsForEmergency <= 0
      ? "text-slate-500"
      : erLiveMonths >= 6
        ? "text-emerald-600"
        : erLiveMonths >= 3
          ? "text-amber-600"
          : "text-red-600";

  const estimatedAssets = sum([
    watchedValues.savingsAccountBalance,
    watchedValues.fdValue,
    watchedValues.liquidMFValue,
    watchedValues.emergencyFundCurrent,
    watchedValues.otherLiquidSavings,
    watchedValues.bereavementFund,
    watchedValues.mfValue,
    watchedValues.indianStocksValue,
    watchedValues.usStocksValueINR,
    watchedValues.usMFValueINR,
    watchedValues.rsuValueINR,
    watchedValues.ppfBalance,
    watchedValues.npsBalance,
    watchedValues.epfBalance,
    ownsHome ? watchedValues.homeMarketValue : 0,
    ownsCar ? watchedValues.carMarketValue : 0,
    watchedValues.goldValue,
    watchedValues.otherAssets,
    watchedValues.hasPostOfficeSchemes
      ? (watchedValues.postOfficeSchemes ?? []).reduce(
          (sum, row) => sum + (row.amount ?? 0),
          0,
        )
      : watchedValues.investsInNsc
        ? watchedValues.nscDepositAmount
        : 0,
  ]);
  const estimatedLiabilities = sum([
    ownsHome ? watchedValues.homeLoanOutstanding : 0,
    ownsCar ? watchedValues.carLoanOutstanding : 0,
  ]);
  const estimatedNetWorth = estimatedAssets - estimatedLiabilities;

  useLayoutEffect(() => {
    if (!hasHydrated) return;
    const { analysis: draft } = useFinancialStore.getState();
    const cached = { ...(draft ?? {}) } as Record<string, unknown>;
    if (cached.nscMonthly != null && cached.nscDepositAmount == null) {
      cached.nscDepositAmount = cached.nscMonthly;
    }
    delete cached.nscMonthly;
    const cachedTyped = cached as Partial<AnalyseFormValues>;
    const merged = {
      ...analyseDefaultValues,
      ...mergeAnalyseDraftWithProfile(
        lastSubmission ? financialProfileToFormValues(lastSubmission) : {},
        cachedTyped,
      ),
    };
    reset(coalesceInsuranceToggles(merged as AnalyseFormValues));
  }, [hasHydrated, lastSubmission, reset]);

  useEffect(() => {
    skipCloudHydrateRef.current = false;
    cloudHydrateKey.current = null;
  }, [authUserId]);

  useEffect(() => {
    if (!hasHydrated || !supabase || !authUserId) return;
    const doneKey = authUserId;
    if (cloudHydrateKey.current === doneKey) return;
    if (skipCloudHydrateRef.current) {
      cloudHydrateKey.current = doneKey;
      return;
    }

    const st = useFinancialStore.getState();
    if (st.lastSubmission) {
      cloudHydrateKey.current = doneKey;
      return;
    }
    if (st.currentStep !== 0) {
      cloudHydrateKey.current = doneKey;
      return;
    }
    if ((st.profile?.monthlySalary ?? 0) > 0) {
      cloudHydrateKey.current = doneKey;
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const remote = await fetchUserAnalyseSnapshot(authUserId);
        if (cancelled) return;
        if (
          remote?.lastSubmission &&
          remote.result &&
          isValidStoredAnalysis(remote.result)
        ) {
          useFinancialStore
            .getState()
            .hydrateFromSnapshot(remote.lastSubmission, remote.result, {
              aiPlan: remote.aiPlan ?? undefined,
              analysisPatch: remote.analysis ?? undefined,
            });
        }
      } finally {
        if (!cancelled) cloudHydrateKey.current = doneKey;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, authUserId, lastSubmission, step]);

  useEffect(() => {
    const store = useFinancialStore.getState();
    if (store.result) {
      setShowResumeOption(true);
    } else if (
      (store.profile?.monthlySalary ?? 0) > 0 ||
      store.currentStep > 0
    ) {
      setShowResumeBanner(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    // Prefer getValues() so nested fields (e.g. lenderName) are always persisted fully.
    const subscription = watch(() => {
      setAnalysis(getValues());
    });
    return () => subscription.unsubscribe();
  }, [hasHydrated, setAnalysis, watch, getValues]);

  useEffect(() => {
    const prev = prevLifeStageRef.current;
    if (lifeStage === "bachelor") {
      setValue("spouseIncome", 0, {
        shouldDirty: false,
        shouldValidate: false,
      });
      setValue("spouseAge", 0, { shouldDirty: false, shouldValidate: false });
    }
    if (prev !== null && lifeStage !== "kids" && prev === "kids") {
      setValue("numberOfKids", undefined);
      setValue("kidsAges", []);
      setValue("kidsGenders", []);
      setValue("kidsSchoolFees", 0);
      setValue("kidsActivities", 0);
      setValue("ssy", 0);
    }
    prevLifeStageRef.current = lifeStage;
  }, [lifeStage, setValue]);

  useEffect(() => {
    const prev = prevHasHealthRef.current;
    if (prev === true && hasHealthInsurance === false) {
      setValue("healthInsuranceSumInsured", 0);
      setValue("healthInsurancePremiumInput", 0);
      setValue("healthInsurancePremiumFrequency", "monthly");
    }
    prevHasHealthRef.current = hasHealthInsurance;
  }, [hasHealthInsurance, setValue]);

  useEffect(() => {
    const prev = prevHasTermRef.current;
    if (prev === true && hasTermInsurance === false) {
      setValue("termInsuranceSumAssured", 0);
      setValue("termInsurancePremiumInput", 0);
      setValue("termInsurancePremiumFrequency", "monthly");
    }
    prevHasTermRef.current = hasTermInsurance;
  }, [hasTermInsurance, setValue]);

  useEffect(() => {
    const prev = prevHasOtherInsuranceRef.current;
    if (
      hasOtherInsurance &&
      prev === false &&
      otherInsuranceFields.length === 0
    ) {
      addOtherInsuranceRow();
    }
    if (prev === true && hasOtherInsurance === false) {
      setValue("otherInsurancePremiums", []);
    }
    prevHasOtherInsuranceRef.current = hasOtherInsurance;
  }, [
    addOtherInsuranceRow,
    hasOtherInsurance,
    otherInsuranceFields.length,
    setValue,
  ]);

  useEffect(() => {
    const prev = prevOwnsHomeRef.current;
    if (prev === true && ownsHome === false) {
      setValue("homeMarketValue", 0);
      setValue("homeLoanOutstanding", 0);
      setValue("homeLoanEMI", 0);
      setValue("homeLoanEMIDay", undefined);
    }
    prevOwnsHomeRef.current = ownsHome;
  }, [ownsHome, setValue]);

  useEffect(() => {
    const prev = prevOwnsCarRef.current;
    if (prev === true && ownsCar === false) {
      setValue("carMarketValue", 0);
      setValue("carLoanOutstanding", 0);
      setValue("carPurchaseTarget", 0);
      setValue("carPurchaseYear", 0);
    }
    prevOwnsCarRef.current = ownsCar;
  }, [ownsCar, setValue]);

  useEffect(() => {
    if (!hasEligibleGirlChild) {
      setValue("ssy", 0);
    }
  }, [hasEligibleGirlChild, setValue]);

  const hasPostOfficeSchemes = watch("hasPostOfficeSchemes");

  useEffect(() => {
    const prev = prevInvestsNscRef.current;
    if (prev === true && hasPostOfficeSchemes === false) {
      setValue("postOfficeSchemes", []);
      setValue("nscDepositAmount", 0);
      setValue("nscMaturityYear", 0);
      setValue("investsInNsc", false);
    }
    prevInvestsNscRef.current = hasPostOfficeSchemes;
  }, [hasPostOfficeSchemes, setValue]);

  useEffect(() => {
    const prev = prevParentsSupportRef.current;
    if (prev !== undefined && prev > 0 && parentsSupport <= 0) {
      setValue("parentsCity", undefined);
      setValue("parentsHealthInsuranceSumInsured", 0);
      setValue("parentsEmergencyCash", 0);
    }
    prevParentsSupportRef.current = parentsSupport;
  }, [parentsSupport, setValue]);

  useEffect(() => {
    if (
      primaryGoal === "build_emergency_fund" &&
      emergencyFundSuggestion &&
      emergencyFundSuggestion > 0
    ) {
      const current = watch("emergencyFundTarget") ?? 0;
      if (current <= 0) {
        setValue("emergencyFundTarget", Math.round(emergencyFundSuggestion), {
          shouldDirty: true,
          shouldValidate: false,
        });
      }
    }
  }, [primaryGoal, emergencyFundSuggestion, setValue, watch]);

  const scrollStepIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      const modalScroll = document.querySelector(
        "[data-analyse-modal-scroll]",
      ) as HTMLElement | null;
      if (modalScroll) {
        modalScroll.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    });
  }, []);

  const forceNext = useCallback(() => {
    clearErrors();
    setStepNavError(null);
    const values = getValues();
    // Keep form state aligned with schema sanitizers so Next isn't blocked by
    // stale additionalObligations / legacy loanType labels with no visible fields.
    const cleanedObligations = (values.additionalObligations ?? []).filter(
      (row) => {
        const type = String(row?.type ?? "").trim();
        const amt = Number(row?.monthlyAmount ?? 0);
        return type.length > 0 && Number.isFinite(amt) && amt > 0;
      },
    );
    if (
      cleanedObligations.length !== (values.additionalObligations?.length ?? 0)
    ) {
      setValue("additionalObligations", cleanedObligations, {
        shouldDirty: true,
      });
    }
    const cleanedLoans = (values.unifiedLoans ?? []).map((row) => {
      const raw = String(row?.loanType ?? "").trim();
      const ok = (
        [
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
        ] as const
      ).includes(raw as never);
      const lenderName =
        typeof row?.lenderName === "string"
          ? row.lenderName.toUpperCase().trim()
          : row?.lenderName;
      const outstanding = Number(row?.outstandingAmount ?? 0) || 0;
      return {
        ...row,
        loanType: ok ? row.loanType : ("other" as const),
        lenderName,
        outstandingAmount: outstanding,
        odUsed:
          (ok ? row.loanType : "other") === "overdraft"
            ? outstanding || Number(row?.odUsed ?? 0) || 0
            : Number(row?.odUsed ?? 0) || 0,
      };
    });
    if (
      JSON.stringify(cleanedLoans) !== JSON.stringify(values.unifiedLoans ?? [])
    ) {
      setValue("unifiedLoans", cleanedLoans, { shouldDirty: true });
    }
    // Keep draft/cache in sync with lender names before leaving the step.
    setAnalysis({
      ...getValues(),
      unifiedLoans: cleanedLoans,
      additionalObligations: cleanedObligations,
    });

    const currentSchema = STEP_SCHEMAS[step];
    const parsed = currentSchema.safeParse({
      ...values,
      additionalObligations: cleanedObligations,
      unifiedLoans: cleanedLoans,
    });
    if (!parsed.success) {
      applyZodFieldErrors(parsed.error.flatten(), setError);
      const flat = parsed.error.flatten();
      const firstField = Object.values(flat.fieldErrors).find(
        (msgs) => msgs?.[0],
      )?.[0];
      const firstForm = flat.formErrors[0];
      setStepNavError(
        firstField ||
          firstForm ||
          "Please fix the highlighted fields before continuing.",
      );
      return;
    }
    setDirection("forward");
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
    scrollStepIntoView();
  }, [
    clearErrors,
    getValues,
    scrollStepIntoView,
    setAnalysis,
    setError,
    setStep,
    setValue,
    step,
  ]);

  const goBack = useCallback(() => {
    clearErrors();
    setStepNavError(null);
    setDirection("back");
    setStep((current) => Math.max(current - 1, 0));
    scrollStepIntoView();
  }, [clearErrors, scrollStepIntoView, setStep]);

  const jumpToStep = useCallback(
    (index: number) => {
      clearErrors();
      setStepNavError(null);
      setDirection(index > step ? "forward" : "back");
      setStep(Math.max(0, Math.min(index, STEPS.length - 1)));
      scrollStepIntoView();
    },
    [clearErrors, scrollStepIntoView, setStep, step],
  );

  const handleFinalSubmit = useCallback(async () => {
    clearErrors();
    const values = getValues();
    const finalParsed = step7Schema.safeParse({
      ...values,
      primaryGoal: values.primaryGoal?.trim()
        ? values.primaryGoal
        : "grow_wealth",
    });
    if (!finalParsed.success) {
      applyZodFieldErrors(finalParsed.error.flatten(), setError);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const mergedValues = coalesceInsuranceToggles({
        ...values,
        primaryGoal: values.primaryGoal || "grow_wealth",
        monthlySalary: values.monthlySalary ?? 0,
      });
      setAnalysis(mergedValues);
      const normalized = normalizeAnalyseFormValues(mergedValues);
      try {
        setFullAnalysis(normalized);
      } catch (e) {
        console.error("Submit / setFullAnalysis error:", e);
        setSubmitError("Analysis failed. Please try again.");
        return;
      }

      const { result: nextResult, lastSubmission: savedProfile } =
        useFinancialStore.getState();
      if (!nextResult || !savedProfile) {
        setSubmitError("Analysis failed. Please try again.");
        return;
      }

      const { plan: aiPlan } = await getAIFixPlan(savedProfile, nextResult);
      useFinancialStore.getState().setAiPlan(aiPlan);

      const uid = useAuthStore.getState().user?.id;
      if (uid && supabase) {
        void upsertUserAnalyseSnapshot(uid, {
          profile: savedProfile,
          result: nextResult,
          submittedAt: new Date().toISOString(),
          version: "1.0",
          aiPlan,
          analysis: mergedValues,
        }).then(({ error }) => {
          if (error) console.warn("Snapshot save failed:", error.message);
          else invalidateProfileMonthlySalaryCache(uid);
        });
        void useObligationStore
          .getState()
          .syncFromHealthCheck(uid, savedProfile)
          .catch((err) => console.warn("Obligation sync failed:", err));
        // Encrypt sensitive money fields server-side (ENCRYPTION_KEY never on client).
        void fetch("/api/financial-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submission: savedProfile }),
        }).catch((err) =>
          console.warn("Encrypted financial data save failed:", err),
        );
      }

      router.push("/analyse/result");
    } catch (e) {
      console.error("Submit error:", e);
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [clearErrors, getValues, router, setAnalysis, setError, setFullAnalysis]);

  const debtWarning =
    totalIncome > 0 && fixedObligations > totalIncome * 0.5
      ? "Your fixed obligations are above 50% of household income. That can make cash flow fragile."
      : null;

  const housingTotal = sum([
    watchedValues.rentAmount,
    homeLoanEmiLive,
    watchedValues.secondPropertyEMI,
  ]);
  const housingNote = (() => {
    const rent = watchedValues.rentAmount ?? 0;
    const homeLoan = homeLoanEmiLive;
    const secondProperty = watchedValues.secondPropertyEMI ?? 0;

    if (rent > 0 && homeLoan > 0 && secondProperty > 0) {
      return {
        tone: "yellow" as const,
        text: `Total housing obligation: ${formatCurrency(housingTotal, "en-IN", "INR")}/month across rent + 2 properties`,
      };
    }
    if (rent > 0 && homeLoan > 0) {
      return {
        tone: "blue" as const,
        text: "You have both rent and home loan. This is valid if your mortgaged property is rented out and you live in a rented place.",
      };
    }
    if (rent > 0) {
      return {
        tone: "yellow" as const,
        text: `Renting — ${formatCurrency(rent, "en-IN", "INR")}/month`,
      };
    }
    if (homeLoan > 0 || secondProperty > 0) {
      return {
        tone: "green" as const,
        text:
          secondProperty > 0 && homeLoan === 0
            ? `Second property EMI — ${formatCurrency(housingTotal, "en-IN", "INR")}/month`
            : `Home loan EMI — ${formatCurrency(housingTotal, "en-IN", "INR")}/month`,
      };
    }
    return null;
  })();

  const handleStartFresh = useCallback(() => {
    skipCloudHydrateRef.current = true;
    wipeAnalyseLocalCaches();
    useFinancialStore.getState().resetStore();
    reset(
      coalesceInsuranceToggles({
        ...analyseDefaultValues,
        unifiedLoans: [],
        additionalObligations: [],
        otherInsurancePremiums: [],
        customInvestments: [],
      } as AnalyseFormValues),
    );
    setIsRenting(false);
    setHasCreditCardOutstanding(false);
    setHasVehicleToggle(false);
    setShowResumeOption(false);
    setShowResumeBanner(false);
    setAdvisorOpen(true);
    window.scrollTo(0, 0);
  }, [reset]);

  return (
    <AnalyseAdvisorModal
      open={advisorOpen}
      step={step}
      stepTitle={STEPS[step]?.title ?? "Profile"}
      stepCount={STEPS.length}
      onClose={() => setAdvisorOpen(false)}
    >
      <div
        className={
          advisorOpen
            ? "mx-auto w-full max-w-xl px-0 py-2"
            : "mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-10 lg:max-w-2xl"
        }
      >
        <div className="mb-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (step > 0) {
                goBack();
                return;
              }
              if (advisorOpen) {
                setAdvisorOpen(false);
                return;
              }
              router.replace("/");
            }}
            className="text-sm font-medium text-[#534AB7] hover:underline"
          >
            ← Back
          </button>
          {!advisorOpen ? (
            <button
              type="button"
              onClick={() => setAdvisorOpen(true)}
              className="rounded-lg bg-[#EEEDFE] px-3 py-1.5 text-[12px] font-bold text-[#534AB7]"
            >
              Open as modal
            </button>
          ) : null}
          {showResumeOption ? (
            <div className="flex items-center gap-2">
              <Link
                href="/analyse/result"
                className="inline-flex items-center justify-center rounded-lg bg-[#534AB7] px-3.5 py-2 text-[13px] font-semibold text-white no-underline"
              >
                View report
              </Link>
              <button
                type="button"
                onClick={handleStartFresh}
                className="rounded-lg border border-[#E8E6F0] bg-transparent px-3.5 py-2 text-[13px] text-[#9B9A94]"
              >
                Start fresh
              </button>
            </div>
          ) : null}
          <p className="text-xs font-medium text-slate-500 sm:text-sm">
            Step {step + 1} of {STEPS.length}
          </p>
        </div>

        <div className="mb-8">
          <div
            className="flex h-2 gap-1 overflow-hidden rounded-full bg-slate-100 sm:h-2.5 sm:gap-1.5"
            role="tablist"
            aria-label="Form steps"
          >
            {STEPS.map((item, index) => (
              <button
                key={item.short}
                type="button"
                title={`Go to ${item.title}`}
                onClick={() => jumpToStep(index)}
                className={`min-w-0 flex-1 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7]/40 ${
                  index <= step ? "bg-[#534AB7]" : "bg-slate-200"
                }`}
                aria-current={index === step ? "step" : undefined}
                aria-label={`Step ${index + 1}: ${item.title}`}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-between gap-0.5 text-[0.65rem] font-medium text-slate-500 sm:gap-1 sm:text-xs">
            {STEPS.map((item, index) => (
              <button
                key={`${item.short}-label`}
                type="button"
                title={`Go to ${item.title}`}
                onClick={() => jumpToStep(index)}
                className={`shrink-0 rounded px-0.5 sm:px-1 ${
                  index === step ? "text-[#534AB7]" : "hover:text-slate-700"
                }`}
              >
                {item.short}
              </button>
            ))}
          </div>
        </div>

        {showResumeBanner ? (
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#AFA9EC] bg-[#EEEDFE] px-[18px] py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[#3C3489]">
                Continue where you left off
              </div>
              <div className="mt-0.5 text-xs text-[#534AB7]">
                Your form data is saved locally
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowResumeBanner(false);
                  const last = detectLastStep(
                    useFinancialStore.getState().profile,
                  );
                  jumpToStep(last);
                }}
                className="rounded-lg bg-[#534AB7] px-3.5 py-2 text-[13px] font-semibold text-white"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={handleStartFresh}
                className="rounded-lg border border-[#E8E6F0] bg-transparent px-3.5 py-2 text-[13px] text-[#9B9A94]"
              >
                Start fresh
              </button>
            </div>
          </div>
        ) : null}

        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (step === STEPS.length - 1) {
              void handleFinalSubmit();
            } else {
              forceNext();
            }
          }}
        >
          <AnimatePresence mode="wait">
            <m.div
              key={step}
              initial={{ opacity: 0, x: direction === "forward" ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction === "forward" ? -40 : 40 }}
              transition={{
                duration: 0.3,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {step === 0 ? (
                <div className="space-y-6">
                  <fieldset className="space-y-3">
                    <legend className="text-sm font-medium text-slate-700">
                      Life stage <span className="text-[#E24B4A]">*</span>
                    </legend>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {LIFE_STAGE_VALUES.map((value) => {
                        const selected = lifeStage === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setValue("lifeStage", value, {
                                shouldDirty: true,
                              })
                            }
                            className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-medium leading-4 transition-colors sm:px-5 sm:py-3.5 sm:text-base sm:leading-4 ${
                              selected
                                ? "border-[#534AB7] bg-[#534AB7]/10 text-slate-900"
                                : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                            }`}
                          >
                            {LIFE_STAGE_LABELS[value]}
                          </button>
                        );
                      })}
                    </div>
                    <input type="hidden" {...register("lifeStage")} />
                    {errors.lifeStage?.message ? (
                      <p className="text-sm text-[#E24B4A]">
                        {errors.lifeStage.message}
                      </p>
                    ) : null}
                  </fieldset>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <AgeNumberInput
                      id="selfAge"
                      label="Your age"
                      required
                      error={errors.selfAge?.message}
                      {...bindWholeNumberField("selfAge")}
                    />
                    {lifeStage && lifeStage !== "bachelor" ? (
                      <AgeNumberInput
                        id="spouseAge"
                        label="Spouse age"
                        helper="Leave 0 if not applicable"
                        error={errors.spouseAge?.message}
                        {...bindWholeNumberField("spouseAge")}
                      />
                    ) : null}
                  </div>

                  {lifeStage === "kids" ? (
                    <div className="space-y-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <AgeNumberInput
                          id="numberOfKids"
                          label="Number of kids"
                          error={errors.numberOfKids?.message}
                          inlineOnDesktop
                          {...bindWholeNumberField("numberOfKids")}
                        />
                      </div>
                      <div className="grid gap-5 sm:grid-cols-3">
                        {Array.from({
                          length: Math.min(numberOfKids, 3),
                        }).map((_, index) => (
                          <div
                            key={index}
                            className="space-y-4 rounded-2xl border border-slate-200 p-4"
                          >
                            <AgeNumberInput
                              id={`kidsAges.${index}`}
                              label={`Kid ${index + 1} age`}
                              error={errors.kidsAges?.[index]?.message}
                              {...bindWholeNumberField(
                                `kidsAges.${index}` as const,
                              )}
                            />
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-slate-700">
                                Kid {index + 1} gender
                              </p>
                              <RadioCards
                                options={[
                                  { label: "Boy", value: "boy" },
                                  { label: "Girl", value: "girl" },
                                ]}
                                value={watch(`kidsGenders.${index}` as const)}
                                onChange={(value) =>
                                  setValue(
                                    `kidsGenders.${index}` as const,
                                    value as "boy" | "girl",
                                  )
                                }
                              />
                              <input
                                type="hidden"
                                {...register(`kidsGenders.${index}` as const)}
                              />
                              {errors.kidsGenders?.[index]?.message ? (
                                <p className="text-sm text-[#E24B4A]">
                                  {errors.kidsGenders[index]?.message}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="cityTier"
                      className="text-sm font-medium text-slate-700"
                    >
                      City tier <span className="text-[#E24B4A]">*</span>
                    </label>
                    <select
                      id="cityTier"
                      className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#534AB7]/25"
                      {...register("cityTier")}
                    >
                      {CITY_TIER_VALUES.map((value) => (
                        <option key={value} value={value}>
                          {CITY_TIER_LABELS[value]}
                        </option>
                      ))}
                    </select>
                    {errors.cityTier?.message ? (
                      <p className="text-sm text-[#E24B4A]">
                        {errors.cityTier.message}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="space-y-5">
                  <MoneyInput
                    id="monthlySalary"
                    label="Monthly take-home salary"
                    required
                    error={errors.monthlySalary?.message}
                    {...bindMoneyField("monthlySalary")}
                  />
                  {lifeStage !== "bachelor" ? (
                    <MoneyInput
                      id="spouseIncome"
                      label="Spouse monthly income"
                      error={errors.spouseIncome?.message}
                      {...bindMoneyField("spouseIncome")}
                    />
                  ) : null}
                  <MoneyInput
                    id="otherIncome"
                    label="Other income — freelance, rental, business"
                    error={errors.otherIncome?.message}
                    {...bindMoneyField("otherIncome")}
                  />
                  <div className="mt-4 flex items-center justify-between rounded-[10px] bg-[#EEEDFE] px-4 py-3">
                    <span className="text-sm font-medium text-[#3C3489]">
                      Total monthly income
                    </span>
                    <PrivateAmount
                      value={totalIncome}
                      label="total monthly income"
                      align="flex-start"
                    >
                      <span className="text-right">
                        <span className="block text-lg font-bold text-[#534AB7]">
                          ₹{formatIndian(totalIncome)}
                        </span>
                        <span className="block text-[11px] text-[#7F77DD]">
                          {formatInWords(totalIncome)}
                        </span>
                      </span>
                    </PrivateAmount>
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <SectionTitle>Housing</SectionTitle>
                    <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-medium text-slate-800">
                          Are you on rent?
                        </p>
                        <div className="w-[180px]">
                          <ToggleButtons
                            options={[
                              { label: "Yes", value: "yes" },
                              { label: "No", value: "no" },
                            ]}
                            value={isRenting ? "yes" : "no"}
                            onChange={(value) => {
                              const next = value === "yes";
                              setIsRenting(next);
                              if (!next) {
                                setValue("rentAmount", 0);
                                setValue("rentMaintenanceMonthly", 0);
                              }
                            }}
                          />
                        </div>
                      </div>
                      {isRenting ? (
                        <div className="grid gap-5 border-l-[3px] border-[#534AB7] pl-4 sm:grid-cols-2">
                          <MoneyInput
                            id="rentAmount"
                            label="Rent you pay monthly"
                            helper="Enter your monthly rent if you live in a rented house. If you have a home loan (own house), enter 0 here — your EMI goes in the Loans section below."
                            error={errors.rentAmount?.message}
                            {...bindMoneyField("rentAmount")}
                          />
                          <MoneyInput
                            id="rentMaintenanceMonthly"
                            label="Flat maintenance"
                            helper="Monthly society charges, maintenance, or similar on top of rent"
                            error={errors.rentMaintenanceMonthly?.message}
                            {...bindMoneyField("rentMaintenanceMonthly")}
                          />
                        </div>
                      ) : null}
                    </div>
                    {housingNote ? (
                      <Note tone={housingNote.tone}>{housingNote.text}</Note>
                    ) : null}
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-medium text-slate-800">
                        Do you have any loan EMIs?
                      </p>
                      <div className="w-full sm:w-[200px]">
                        <ToggleButtons
                          options={[
                            { label: "Yes", value: "yes" },
                            { label: "No", value: "no" },
                          ]}
                          value={hasLoans ? "yes" : "no"}
                          onChange={(value) => {
                            const next = value === "yes";
                            setHasLoans(next);
                            if (!next) {
                              setValue("unifiedLoans", [], {
                                shouldDirty: true,
                              });
                              setSavedLoanIds([]);
                              setValue("homeLoanEMI", 0);
                              setValue("personalLoanEMI", 0);
                              setValue("carLoanEMI", 0);
                              setValue("bikeEMI", 0);
                              setAnalysis(getValues());
                            }
                          }}
                        />
                      </div>
                    </div>

                    {hasLoans ? (
                      <>
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#534AB7]">
                          My loans
                        </h3>
                        <p className="-mt-2 text-[13px] text-[#9B9A94]">
                          Add{" "}
                          <strong className="font-semibold text-slate-700">
                            home loan
                          </strong>{" "}
                          here if you pay EMI on your residence or investment
                          property, plus personal, car, PF, education, OD, or
                          any other loan.
                        </p>

                        <div className="space-y-3">
                          {unifiedLoanFields.map((field, index) => {
                            const loanType = watch(
                              `unifiedLoans.${index}.loanType` as const,
                            );
                            const loanEmi =
                              watch(`unifiedLoans.${index}.monthlyEMI`) ?? 0;
                            const loanOutstanding =
                              watch(
                                `unifiedLoans.${index}.outstandingAmount`,
                              ) ?? 0;
                            const loanLender =
                              watch(`unifiedLoans.${index}.lenderName`) || "";
                            const typeLabel =
                              LOAN_TYPE_OPTIONS.find(
                                (o) => o.value === loanType,
                              )?.label || "Loan";
                            const isSaved = savedLoanIds.includes(field.id);

                            if (isSaved) {
                              return (
                                <div
                                  key={field.id}
                                  className="relative rounded-[14px] border border-[#E8E6F0] bg-[#F7F7F4] p-4"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="text-[13px] font-bold text-[#534AB7]">
                                        {typeLabel}
                                        {loanLender ? ` · ${loanLender}` : ""}
                                      </div>
                                      <div className="mt-1 text-sm text-[#111110]">
                                        EMI ₹
                                        {Number(loanEmi).toLocaleString(
                                          "en-IN",
                                        )}
                                        {loanOutstanding > 0
                                          ? ` · Outstanding ₹${Number(loanOutstanding).toLocaleString("en-IN")}`
                                          : ""}
                                      </div>
                                      <div className="mt-1 text-[11px] text-[#1D9E75]">
                                        Saved — add another loan below if needed
                                      </div>
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSavedLoanIds((ids) =>
                                            ids.filter((id) => id !== field.id),
                                          )
                                        }
                                        className="rounded-lg border border-[#E8E6F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#534AB7]"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSavedLoanIds((ids) =>
                                            ids.filter((id) => id !== field.id),
                                          );
                                          removeUnifiedLoan(index);
                                        }}
                                        className="border-none bg-transparent text-xl font-semibold leading-none text-[#111110] hover:text-[#534AB7]"
                                        aria-label="Remove loan"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={field.id}
                                className="relative rounded-[14px] border border-[#E8E6F0] bg-white p-4"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSavedLoanIds((ids) =>
                                      ids.filter((id) => id !== field.id),
                                    );
                                    removeUnifiedLoan(index);
                                  }}
                                  className="absolute right-3 top-3 border-none bg-transparent text-xl font-semibold leading-none text-[#111110] hover:text-[#534AB7]"
                                >
                                  ×
                                </button>

                                <div className="mb-3 text-[13px] font-bold text-[#534AB7]">
                                  Loan {index + 1}
                                </div>

                                <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div className="flex flex-col gap-1.5">
                                    <label
                                      htmlFor={`unifiedLoans.${index}.loanType`}
                                      className="text-[14px] font-medium text-[#5F5E5A]"
                                    >
                                      Loan type *
                                    </label>
                                    <select
                                      id={`unifiedLoans.${index}.loanType`}
                                      className="h-12 rounded-[10px] border-[1.5px] border-[#E8E6F0] bg-white px-[14px] text-[15px] text-[#111110] outline-none focus:border-[#534AB7] focus:shadow-[0_0_0_3px_rgba(83,74,183,0.1)]"
                                      {...register(
                                        `unifiedLoans.${index}.loanType` as const,
                                      )}
                                    >
                                      {LOAN_TYPE_OPTIONS.map((option) => (
                                        <option
                                          key={option.value}
                                          value={option.value}
                                        >
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <TextInput
                                    id={`unifiedLoans.${index}.lenderName`}
                                    label="Lender name"
                                    placeholder="e.g. HDFC, ICICI"
                                    {...register(
                                      `unifiedLoans.${index}.lenderName` as const,
                                      {
                                        setValueAs: (v) =>
                                          typeof v === "string"
                                            ? v.toUpperCase()
                                            : v,
                                      },
                                    )}
                                    onBlur={(e) => {
                                      const caps = e.target.value
                                        .toUpperCase()
                                        .trim();
                                      setValue(
                                        `unifiedLoans.${index}.lenderName` as const,
                                        caps,
                                        {
                                          shouldDirty: true,
                                          shouldTouch: true,
                                        },
                                      );
                                      setAnalysis(getValues());
                                    }}
                                  />
                                </div>

                                <div className="mb-3 space-y-3">
                                  <Controller
                                    control={control}
                                    name={`unifiedLoans.${index}.monthlyEMI`}
                                    render={({ field }) => (
                                      <MoneyInput
                                        id={`unifiedLoans.${index}.monthlyEMI`}
                                        label="Monthly EMI *"
                                        helper={
                                          watch(
                                            `unifiedLoans.${index}.loanType` as const,
                                          ) === "home_loan"
                                            ? "Enter your home loan EMI. This includes both principal and interest. Check your bank statement for the exact amount."
                                            : "EMI you pay each month"
                                        }
                                        value={field.value ?? 0}
                                        onChange={(e) =>
                                          field.onChange(
                                            parseMoneyInput(
                                              e.currentTarget.value,
                                            ) ?? 0,
                                          )
                                        }
                                      />
                                    )}
                                  />
                                  {(watch(`unifiedLoans.${index}.monthlyEMI`) ??
                                    0) > 0 ? (
                                    <DayOfMonthPicker
                                      label="Which date is this EMI debited? (optional)"
                                      hint="We'll remind you a few days before"
                                      value={
                                        watch(
                                          `unifiedLoans.${index}.emiDay` as const,
                                        ) || undefined
                                      }
                                      onChange={(day) => {
                                        setValue(
                                          `unifiedLoans.${index}.emiDay` as const,
                                          day,
                                        );
                                        const loanType = watch(
                                          `unifiedLoans.${index}.loanType` as const,
                                        );
                                        if (loanType === "home_loan") {
                                          setValue("homeLoanEMIDay", day);
                                        } else if (loanType === "car_loan") {
                                          setValue("carLoanEMIDay", day);
                                        } else if (
                                          loanType === "personal_loan"
                                        ) {
                                          setValue("personalLoanEMIDay", day);
                                        } else if (
                                          loanType === "education_loan"
                                        ) {
                                          setValue("educationLoanEMIDay", day);
                                        }
                                      }}
                                    />
                                  ) : null}
                                  <Controller
                                    control={control}
                                    name={`unifiedLoans.${index}.outstandingAmount`}
                                    render={({ field }) => {
                                      const isOd =
                                        watch(
                                          `unifiedLoans.${index}.loanType` as const,
                                        ) === "overdraft";
                                      return (
                                        <MoneyInput
                                          id={`unifiedLoans.${index}.outstandingAmount`}
                                          label={
                                            isOd
                                              ? "Amount currently used"
                                              : "Outstanding amount (optional)"
                                          }
                                          helper={
                                            isOd
                                              ? "How much of your OD limit is drawn today — this drives your analysis"
                                              : "Total principal still owed"
                                          }
                                          value={field.value ?? 0}
                                          onChange={(e) => {
                                            const next =
                                              parseMoneyInput(
                                                e.currentTarget.value,
                                              ) ?? 0;
                                            field.onChange(next);
                                            if (isOd) {
                                              setValue(
                                                `unifiedLoans.${index}.odUsed` as const,
                                                next,
                                                { shouldDirty: true },
                                              );
                                            }
                                          }}
                                        />
                                      );
                                    }}
                                  />
                                </div>

                                <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <NumberInput
                                    label="Interest rate %"
                                    value={
                                      watch(
                                        `unifiedLoans.${index}.interestRate` as const,
                                      ) || 0
                                    }
                                    onChange={(val: number) =>
                                      setValue(
                                        `unifiedLoans.${index}.interestRate` as const,
                                        val,
                                        {
                                          shouldDirty: true,
                                        },
                                      )
                                    }
                                    suffix="%"
                                    placeholder="e.g. 14"
                                    min={0}
                                    max={50}
                                    step={0.01}
                                    helper="From loan statement"
                                  />
                                  <NumberInput
                                    label="Remaining months"
                                    value={
                                      watch(
                                        `unifiedLoans.${index}.remainingMonths` as const,
                                      ) || 0
                                    }
                                    onChange={(val: number) =>
                                      setValue(
                                        `unifiedLoans.${index}.remainingMonths` as const,
                                        val,
                                        {
                                          shouldDirty: true,
                                        },
                                      )
                                    }
                                    suffix="mo"
                                    placeholder="e.g. 24"
                                    min={0}
                                    max={360}
                                    step={0.01}
                                    helper="Months left to pay"
                                  />
                                </div>

                                {watch(
                                  `unifiedLoans.${index}.loanType` as const,
                                ) === "overdraft" ? (
                                  <div className="mt-2 space-y-3 border-l-[3px] border-[#534AB7] pl-3">
                                    <Controller
                                      control={control}
                                      name={`unifiedLoans.${index}.odLimit`}
                                      render={({ field }) => (
                                        <MoneyInput
                                          id={`unifiedLoans.${index}.odLimit`}
                                          label="OD limit"
                                          helper="Maximum overdraft limit sanctioned by the bank"
                                          value={field.value ?? 0}
                                          onChange={(e) =>
                                            field.onChange(
                                              parseMoneyInput(
                                                e.currentTarget.value,
                                              ) ?? 0,
                                            )
                                          }
                                        />
                                      )}
                                    />
                                    <p className="text-[12px] text-[#9B9A94]">
                                      Use <strong>Outstanding amount</strong>{" "}
                                      above for how much of the OD is currently
                                      used — that value drives your analysis.
                                    </p>
                                    <NumberInput
                                      label="Interest-only period (years)"
                                      value={
                                        watch(
                                          `unifiedLoans.${index}.odInterestOnlyYears` as const,
                                        ) || 0
                                      }
                                      onChange={(val: number) =>
                                        setValue(
                                          `unifiedLoans.${index}.odInterestOnlyYears` as const,
                                          val,
                                          {
                                            shouldDirty: true,
                                          },
                                        )
                                      }
                                      suffix="yr"
                                      placeholder="e.g. 2"
                                      min={0}
                                      max={10}
                                      step={0.01}
                                      helper="Years before EMI starts"
                                    />
                                  </div>
                                ) : null}

                                <button
                                  type="button"
                                  disabled={!(loanEmi > 0)}
                                  onClick={() => {
                                    if (!(loanEmi > 0)) return;
                                    setSavedLoanIds((ids) =>
                                      ids.includes(field.id)
                                        ? ids
                                        : [...ids, field.id],
                                    );
                                    if (loanType === "home_loan") {
                                      setValue("homeLoanEMI", loanEmi, {
                                        shouldDirty: true,
                                      });
                                      if (loanOutstanding > 0) {
                                        setValue(
                                          "homeLoanOutstanding",
                                          loanOutstanding,
                                          { shouldDirty: true },
                                        );
                                      }
                                    }
                                    setAnalysis(getValues());
                                  }}
                                  className={`mt-3 flex h-11 w-full items-center justify-center rounded-[10px] text-sm font-semibold ${
                                    loanEmi > 0
                                      ? "bg-[#534AB7] text-white"
                                      : "cursor-not-allowed bg-[#E8E6F0] text-[#9B9A94]"
                                  }`}
                                >
                                  Save this loan
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            appendUnifiedLoan({
                              id: newAnalyseRowId(),
                              loanType: "personal_loan",
                              lenderName: "",
                              monthlyEMI: 0,
                              outstandingAmount: 0,
                              interestRate: 0,
                              remainingMonths: 0,
                              odLimit: 0,
                              odUsed: 0,
                              odInterestOnlyYears: 0,
                            })
                          }
                          className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#534AB7] bg-transparent text-sm font-semibold text-[#534AB7]"
                        >
                          + Add a loan
                        </button>

                        {unifiedLoanFields.length === 0 ? (
                          <p className="mt-2 text-center text-[13px] text-[#9B9A94]">
                            No loans added. Click above to add personal loan,
                            car loan, PF loan, etc.
                          </p>
                        ) : null}
                      </>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-slate-800">
                        Do you have credit card outstanding?
                      </p>
                      <div className="w-[180px]">
                        <ToggleButtons
                          options={[
                            { label: "Yes", value: "yes" },
                            { label: "No", value: "no" },
                          ]}
                          value={hasCreditCardOutstanding ? "yes" : "no"}
                          onChange={(value) => {
                            const next = value === "yes";
                            setHasCreditCardOutstanding(next);
                            if (!next) setValue("creditCardBillMonthly", 0);
                          }}
                        />
                      </div>
                    </div>
                    {hasCreditCardOutstanding ? (
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <MoneyInput
                          id="creditCardBillMonthly"
                          label="Credit card — typical monthly payment"
                          helper="What you usually pay each month across cards (full pay-off or part of balance). Counts toward loan/debt pressure in your meter."
                          error={errors.creditCardBillMonthly?.message}
                          {...bindMoneyField("creditCardBillMonthly")}
                        />
                        {(watch("creditCardBillMonthly") ?? 0) > 0 ? (
                          <DayOfMonthPicker
                            label="Which date is your credit-card bill usually due? (optional)"
                            value={watch("creditCardBillDay") || undefined}
                            onChange={(day) =>
                              setValue("creditCardBillDay", day)
                            }
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {debtWarning ? <Note tone="red">{debtWarning}</Note> : null}
                  <div
                    className={`mt-2 flex items-center justify-between rounded-[10px] px-4 py-3 ${
                      totalIncome > 0 && fixedObligations > totalIncome * 0.5
                        ? "bg-red-50"
                        : totalIncome > 0 &&
                            fixedObligations > totalIncome * 0.35
                          ? "bg-amber-50"
                          : "bg-emerald-50"
                    }`}
                  >
                    <span className="text-sm font-medium text-slate-700">
                      Total monthly obligations
                    </span>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-900">
                        ₹{formatIndian(fixedObligations)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {formatInWords(fixedObligations)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <SectionTitle>Food</SectionTitle>
                    <div className="grid gap-5">
                      <MoneyInput
                        id="foodTotal"
                        label="Food and daily essentials"
                        helper="(groceries + vegetables + medicines + pharmacy) · Combined monthly spend on food and daily household items"
                        error={errors.foodTotal?.message}
                        {...bindMoneyField("foodTotal")}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <SectionTitle>Transport</SectionTitle>
                    <div className="grid gap-5">
                      <MoneyInput
                        id="transportTotal"
                        label="Transport"
                        helper="(fuel + cab / auto / metro / bus)"
                        error={errors.transportTotal?.message}
                        {...bindMoneyField("transportTotal")}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <SectionTitle>Utilities</SectionTitle>
                    <div className="grid gap-5">
                      <MoneyInput
                        id="utilityTotal"
                        label="Utilities"
                        helper="(electricity + internet + mobile + gas + water)"
                        error={errors.utilityTotal?.message}
                        {...bindMoneyField("utilityTotal")}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <SectionTitle>Domestic help</SectionTitle>
                    <div className="grid gap-5">
                      <MoneyInput
                        id="domesticHelpTotal"
                        label="Domestic help"
                        helper="(maid + cook)"
                        error={errors.domesticHelpTotal?.message}
                        {...bindMoneyField("domesticHelpTotal")}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <SectionTitle>Lifestyle</SectionTitle>
                    <div className="grid gap-5">
                      <MoneyInput
                        id="lifestyleTotal"
                        label="Lifestyle and personal"
                        helper="(dining out + OTT + shopping + salon + gym)"
                        error={errors.lifestyleTotal?.message}
                        {...bindMoneyField("lifestyleTotal")}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <SectionTitle>Family</SectionTitle>
                    <div className="grid gap-5 sm:grid-cols-2">
                      {lifeStage === "kids" ? (
                        <>
                          <MoneyInput
                            id="kidsSchoolFees"
                            label="Kids school fees and tuition"
                            error={errors.kidsSchoolFees?.message}
                            {...bindMoneyField("kidsSchoolFees")}
                          />
                          <MoneyInput
                            id="kidsActivities"
                            label="Kids activities — sports, hobby classes"
                            error={errors.kidsActivities?.message}
                            {...bindMoneyField("kidsActivities")}
                          />
                        </>
                      ) : null}
                      <MoneyInput
                        id="parentsSupport"
                        label="Parents / in-laws support"
                        error={errors.parentsSupport?.message}
                        {...bindMoneyField("parentsSupport")}
                      />
                    </div>
                  </div>
                  {parentsSupport > 0 ? (
                    <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                      <SectionTitle>Parents care details</SectionTitle>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="parentsCity"
                            className="text-sm font-medium text-slate-700"
                          >
                            Where do your parents reside?
                          </label>
                          <select
                            id="parentsCity"
                            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#534AB7]/25"
                            {...register("parentsCity")}
                          >
                            <option value="">Select</option>
                            {CITY_TIER_VALUES.map((value) => (
                              <option key={value} value={value}>
                                {CITY_TIER_LABELS[value]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-sm font-medium text-slate-800">
                              Do your parents have health insurance?
                            </p>
                            <div className="w-[180px]">
                              <ToggleButtons
                                options={[
                                  { label: "Yes", value: "yes" },
                                  { label: "No", value: "no" },
                                ]}
                                value={hasParentsInsurance ? "yes" : "no"}
                                onChange={(value) =>
                                  setValue(
                                    "parentsHealthInsuranceSumInsured",
                                    value === "yes"
                                      ? Math.max(
                                          watch(
                                            "parentsHealthInsuranceSumInsured",
                                          ) ?? 0,
                                          5_00_000,
                                        )
                                      : 0,
                                  )
                                }
                              />
                            </div>
                          </div>
                          {hasParentsInsurance ? (
                            <MoneyInput
                              id="parentsHealthInsuranceSumInsured"
                              label="Sum insured (₹)"
                              error={
                                errors.parentsHealthInsuranceSumInsured?.message
                              }
                              {...bindMoneyField(
                                "parentsHealthInsuranceSumInsured",
                              )}
                            />
                          ) : null}
                        </div>
                        <MoneyInput
                          id="parentsEmergencyCash"
                          label="Liquid cash set aside specifically for parents medical needs (₹)"
                          helper="Separate from your emergency fund. Senior medical costs can be sudden and large."
                          error={errors.parentsEmergencyCash?.message}
                          {...bindMoneyField("parentsEmergencyCash")}
                        />
                      </div>
                    </div>
                  ) : null}
                  {debtWarning ? <Note tone="red">{debtWarning}</Note> : null}
                  <div className="mt-2 flex items-center justify-between rounded-[10px] bg-[#EEEDFE] px-4 py-3">
                    <span className="text-sm font-medium text-[#3C3489]">
                      Total monthly expenses
                    </span>
                    <div className="text-right">
                      <div className="text-lg font-bold text-[#534AB7]">
                        ₹{formatIndian(monthlyLivingExpenses)}
                      </div>
                      <div className="text-[11px] text-[#7F77DD]">
                        {formatInWords(monthlyLivingExpenses)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {step === 4 ? (
                <div className="space-y-6">
                  <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-slate-800">
                        Do you have health insurance?
                      </p>
                      <div className="w-[180px]">
                        <ToggleButtons
                          options={[
                            { label: "Yes", value: "yes" },
                            { label: "No", value: "no" },
                          ]}
                          value={hasHealthInsurance ? "yes" : "no"}
                          onChange={(value) =>
                            setValue("hasHealthInsurance", value === "yes")
                          }
                        />
                      </div>
                    </div>
                    {hasHealthInsurance ? (
                      <div className="grid gap-5 sm:grid-cols-2">
                        <MoneyInput
                          id="healthInsuranceSumInsured"
                          label="Sum insured"
                          error={errors.healthInsuranceSumInsured?.message}
                          {...bindMoneyField("healthInsuranceSumInsured")}
                        />
                        <PremiumField
                          inputId="healthInsurancePremiumInput"
                          label="Premium amount"
                          amountError={
                            errors.healthInsurancePremiumInput?.message
                          }
                          frequency={
                            watch("healthInsurancePremiumFrequency") ??
                            "monthly"
                          }
                          onFrequencyChange={(value) =>
                            setValue("healthInsurancePremiumFrequency", value)
                          }
                        >
                          <MoneyInput
                            id="healthInsurancePremiumInput"
                            label="Premium amount"
                            {...bindMoneyField("healthInsurancePremiumInput")}
                          />
                        </PremiumField>
                        {(watch("healthInsurancePremiumInput") ?? 0) > 0 ? (
                          <div className="sm:col-span-2">
                            <PremiumDueFields
                              frequency={
                                watch("healthInsurancePremiumFrequency") ??
                                "monthly"
                              }
                              month={
                                watch("healthInsuranceRenewalMonth") ||
                                undefined
                              }
                              day={
                                watch("healthInsuranceRenewalDay") || undefined
                              }
                              onMonth={(m) =>
                                setValue("healthInsuranceRenewalMonth", m)
                              }
                              onDay={(d) =>
                                setValue("healthInsuranceRenewalDay", d)
                              }
                              yearlyLabel="When is your health insurance renewal? (optional)"
                              monthlyLabel="Which date is the health premium debited? (optional)"
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-slate-800">
                        Do you have term insurance?
                      </p>
                      <div className="w-[180px]">
                        <ToggleButtons
                          options={[
                            { label: "Yes", value: "yes" },
                            { label: "No", value: "no" },
                          ]}
                          value={hasTermInsurance ? "yes" : "no"}
                          onChange={(value) =>
                            setValue("hasTermInsurance", value === "yes")
                          }
                        />
                      </div>
                    </div>
                    {hasTermInsurance ? (
                      <div className="grid gap-5 sm:grid-cols-2">
                        <MoneyInput
                          id="termInsuranceSumAssured"
                          label="Sum assured"
                          error={errors.termInsuranceSumAssured?.message}
                          {...bindMoneyField("termInsuranceSumAssured")}
                        />
                        <PremiumField
                          inputId="termInsurancePremiumInput"
                          label="Premium amount"
                          amountError={
                            errors.termInsurancePremiumInput?.message
                          }
                          frequency={
                            watch("termInsurancePremiumFrequency") ?? "monthly"
                          }
                          onFrequencyChange={(value) =>
                            setValue("termInsurancePremiumFrequency", value)
                          }
                        >
                          <MoneyInput
                            id="termInsurancePremiumInput"
                            label="Premium amount"
                            {...bindMoneyField("termInsurancePremiumInput")}
                          />
                        </PremiumField>
                        <NumberInput
                          label="Premium paying till year (optional)"
                          value={watch("termInsurancePremiumTillYear") || 0}
                          onChange={(val: number) =>
                            setValue(
                              "termInsurancePremiumTillYear",
                              Math.round(val),
                            )
                          }
                          placeholder="e.g. 2045"
                          min={2024}
                          max={2060}
                          step={1}
                          helper="Which year does your term end?"
                        />
                        {(watch("termInsurancePremiumInput") ?? 0) > 0 ? (
                          <div className="sm:col-span-2">
                            <PremiumDueFields
                              frequency={
                                watch("termInsurancePremiumFrequency") ??
                                "monthly"
                              }
                              month={
                                watch("termInsuranceRenewalMonth") || undefined
                              }
                              day={
                                watch("termInsuranceRenewalDay") || undefined
                              }
                              onMonth={(m) =>
                                setValue("termInsuranceRenewalMonth", m)
                              }
                              onDay={(d) =>
                                setValue("termInsuranceRenewalDay", d)
                              }
                              yearlyLabel="When is your term insurance renewal? (optional)"
                              monthlyLabel="Which date is the term premium debited? (optional)"
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                    <SectionTitle>Vehicle insurance</SectionTitle>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-slate-800">
                        Do you have a vehicle?
                      </p>
                      <div className="w-[180px]">
                        <ToggleButtons
                          options={[
                            { label: "Yes", value: "yes" },
                            { label: "No", value: "no" },
                          ]}
                          value={hasCarInForm ? "yes" : "no"}
                          onChange={(value) => {
                            const next = value === "yes";
                            setHasVehicleToggle(next);
                            if (!next) {
                              setValue("carInsurancePremiumInput", 0);
                              setValue("bikeInsurancePremiumInput", 0);
                            }
                          }}
                        />
                      </div>
                    </div>
                    {hasCarInForm ? (
                      <div className="grid gap-5">
                        <PremiumField
                          inputId="carInsurancePremiumInput"
                          label="Car insurance premium"
                          amountError={errors.carInsurancePremiumInput?.message}
                          frequency={
                            watch("carInsurancePremiumFrequency") ?? "monthly"
                          }
                          onFrequencyChange={(value) =>
                            setValue("carInsurancePremiumFrequency", value)
                          }
                        >
                          <MoneyInput
                            id="carInsurancePremiumInput"
                            label="Car insurance premium"
                            {...bindMoneyField("carInsurancePremiumInput")}
                          />
                        </PremiumField>
                        {(watch("carInsurancePremiumInput") ?? 0) > 0 ? (
                          <PremiumDueFields
                            frequency={
                              watch("carInsurancePremiumFrequency") ?? "monthly"
                            }
                            month={
                              watch("carInsuranceRenewalMonth") || undefined
                            }
                            day={watch("carInsuranceRenewalDay") || undefined}
                            onMonth={(m) =>
                              setValue("carInsuranceRenewalMonth", m)
                            }
                            onDay={(d) => setValue("carInsuranceRenewalDay", d)}
                            yearlyLabel="When is your car insurance renewal? (optional)"
                            monthlyLabel="Which date is the car premium debited? (optional)"
                          />
                        ) : null}
                        <PremiumField
                          inputId="bikeInsurancePremiumInput"
                          label="Two-wheeler insurance premium"
                          amountError={
                            errors.bikeInsurancePremiumInput?.message
                          }
                          frequency={
                            watch("bikeInsurancePremiumFrequency") ?? "monthly"
                          }
                          onFrequencyChange={(value) =>
                            setValue("bikeInsurancePremiumFrequency", value)
                          }
                        >
                          <MoneyInput
                            id="bikeInsurancePremiumInput"
                            label="Two-wheeler insurance premium"
                            {...bindMoneyField("bikeInsurancePremiumInput")}
                          />
                        </PremiumField>
                        {(watch("bikeInsurancePremiumInput") ?? 0) > 0 ? (
                          <PremiumDueFields
                            frequency={
                              watch("bikeInsurancePremiumFrequency") ??
                              "monthly"
                            }
                            month={
                              watch("bikeInsuranceRenewalMonth") || undefined
                            }
                            day={watch("bikeInsuranceRenewalDay") || undefined}
                            onMonth={(m) =>
                              setValue("bikeInsuranceRenewalMonth", m)
                            }
                            onDay={(d) =>
                              setValue("bikeInsuranceRenewalDay", d)
                            }
                            yearlyLabel="When is your two-wheeler insurance renewal? (optional)"
                            monthlyLabel="Which date is the two-wheeler premium debited? (optional)"
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-slate-800">
                        Any other insurance premium?
                      </p>
                      <div className="w-[180px]">
                        <ToggleButtons
                          options={[
                            { label: "Yes", value: "yes" },
                            { label: "No", value: "no" },
                          ]}
                          value={hasOtherInsurance ? "yes" : "no"}
                          onChange={(value) =>
                            setValue("hasOtherInsurance", value === "yes")
                          }
                        />
                      </div>
                    </div>
                    {hasOtherInsurance ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-700">
                            Add LIC / endowment / ULIP premiums
                          </p>
                          <Button
                            type="button"
                            variant="secondary"
                            className="border-slate-200"
                            disabled={otherInsuranceFields.length >= 6}
                            onClick={addOtherInsuranceRow}
                          >
                            Add
                          </Button>
                        </div>
                        {errors.otherInsurancePremiums?.message ? (
                          <p className="text-sm text-[#E24B4A]">
                            {errors.otherInsurancePremiums.message}
                          </p>
                        ) : null}
                        <div className="space-y-4">
                          {otherInsuranceFields.map((field, index) => (
                            <div
                              key={field.id}
                              className="rounded-2xl border border-slate-200 p-4"
                            >
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-slate-800">
                                  Other insurance premium {index + 1}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => removeOtherInsurance(index)}
                                  className="text-lg font-semibold leading-none text-[#111110] hover:text-slate-900"
                                >
                                  ×
                                </button>
                              </div>
                              <div className="space-y-4">
                                <Controller
                                  control={control}
                                  name={`otherInsurancePremiums.${index}.policyName`}
                                  render={({ field }) => (
                                    <TextInput
                                      id={`otherInsurancePremiums.${index}.policyName`}
                                      label="Policy name"
                                      error={
                                        errors.otherInsurancePremiums?.[index]
                                          ?.policyName?.message
                                      }
                                      placeholder="LIC / endowment / ULIP / other"
                                      value={field.value ?? ""}
                                      onChange={field.onChange}
                                      onBlur={field.onBlur}
                                    />
                                  )}
                                />
                                <PremiumField
                                  inputId={`otherInsurancePremiums.${index}.premiumAmount`}
                                  label="Premium amount"
                                  amountError={
                                    errors.otherInsurancePremiums?.[index]
                                      ?.premiumAmount?.message
                                  }
                                  frequency={
                                    watch(
                                      `otherInsurancePremiums.${index}.frequency` as const,
                                    ) ?? "monthly"
                                  }
                                  onFrequencyChange={(value) =>
                                    setValue(
                                      `otherInsurancePremiums.${index}.frequency` as const,
                                      value,
                                    )
                                  }
                                >
                                  <MoneyInput
                                    id={`otherInsurancePremiums.${index}.premiumAmount`}
                                    label="Premium amount"
                                    {...bindMoneyField(
                                      `otherInsurancePremiums.${index}.premiumAmount` as const,
                                    )}
                                  />
                                </PremiumField>
                                {(watch(
                                  `otherInsurancePremiums.${index}.premiumAmount` as const,
                                ) ?? 0) > 0 ? (
                                  <PremiumDueFields
                                    frequency={
                                      watch(
                                        `otherInsurancePremiums.${index}.frequency` as const,
                                      ) ?? "monthly"
                                    }
                                    month={
                                      watch(
                                        `otherInsurancePremiums.${index}.renewalMonth` as const,
                                      ) || undefined
                                    }
                                    day={
                                      watch(
                                        `otherInsurancePremiums.${index}.renewalDay` as const,
                                      ) || undefined
                                    }
                                    onMonth={(m) =>
                                      setValue(
                                        `otherInsurancePremiums.${index}.renewalMonth` as const,
                                        m,
                                      )
                                    }
                                    onDay={(d) =>
                                      setValue(
                                        `otherInsurancePremiums.${index}.renewalDay` as const,
                                        d,
                                      )
                                    }
                                  />
                                ) : null}
                                <MoneyInput
                                  id={`otherInsurancePremiums.${index}.maturityAmount`}
                                  label="Maturity amount (if any)"
                                  helper="Amount you receive at maturity"
                                  error={
                                    errors.otherInsurancePremiums?.[index]
                                      ?.maturityAmount?.message
                                  }
                                  {...bindMoneyField(
                                    `otherInsurancePremiums.${index}.maturityAmount` as const,
                                  )}
                                />
                                <NumberInput
                                  label="Maturity year (optional)"
                                  value={
                                    watch(
                                      `otherInsurancePremiums.${index}.maturityYear` as const,
                                    ) || 0
                                  }
                                  onChange={(val: number) =>
                                    setValue(
                                      `otherInsurancePremiums.${index}.maturityYear` as const,
                                      Math.round(val),
                                    )
                                  }
                                  placeholder="e.g. 2035"
                                  min={2024}
                                  max={2060}
                                  step={1}
                                  helper="e.g. 2035"
                                />
                                <div className="rounded-lg bg-[#FAEEDA] px-3 py-2 text-xs text-[#633806]">
                                  ⚠️ If this is a ULIP or endowment plan, the
                                  fix plan will suggest comparing with a pure
                                  term plan.
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {debtWarning ? <Note tone="red">{debtWarning}</Note> : null}
                </div>
              ) : null}

              {step === 5 ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <SectionTitle>Cash and liquid assets</SectionTitle>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="sm:col-span-2 space-y-2">
                        <MoneyInput
                          id="fdValue"
                          label="Fixed Deposit total value"
                          error={errors.fdValue?.message}
                          {...bindMoneyField("fdValue")}
                        />
                        <div className="grid gap-5 sm:grid-cols-2">
                          <NumberInput
                            label="FD interest rate % (optional)"
                            value={watch("fdRate") || 0}
                            onChange={(val: number) => setValue("fdRate", val)}
                            placeholder="e.g. 7.1"
                            suffix="%"
                            min={0}
                            max={15}
                            step={0.1}
                            helper="Check your FD certificate"
                          />
                          <NumberInput
                            label="Tenure in years"
                            value={watch("fdTenureYears") || 0}
                            onChange={(val: number) =>
                              setValue("fdTenureYears", Math.round(val))
                            }
                            placeholder="e.g. 5"
                            min={0}
                            max={50}
                            step={1}
                          />
                          <NumberInput
                            label="Maturity year"
                            value={watch("fdMaturityYear") || 0}
                            onChange={(val: number) =>
                              setValue("fdMaturityYear", Math.round(val))
                            }
                            placeholder="e.g. 2027"
                            min={2024}
                            max={2060}
                            step={1}
                            helper="Year your FD matures"
                          />
                        </div>
                        <div className="rounded-lg bg-[#EEEDFE] px-3 py-2 text-xs text-[#3C3489]">
                          💡 RBI insures max ₹5 lakh per depositor per bank.
                          Keep FD in multiple banks if total exceeds ₹5 lakh.
                        </div>
                        {(watch("fdValue") ?? 0) > 500000 ? (
                          <div className="rounded-lg bg-[#FAEEDA] px-3 py-2 text-xs text-[#633806]">
                            ⚠️ Your FD exceeds ₹5 lakh. Only ₹5 lakh is insured
                            by RBI per bank. Consider spreading across banks.
                          </div>
                        ) : null}
                        <p className="text-xs text-slate-500">
                          FD counts as 70% of emergency fund value due to
                          premature break penalty
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                        Emergency fund
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Money you can access within 48 hours without penalty
                      </p>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <MoneyInput
                        id="savingsAccountBalance"
                        label="Savings account (instantly available)"
                        error={errors.savingsAccountBalance?.message}
                        {...bindMoneyField("savingsAccountBalance")}
                      />

                      <div className="space-y-2">
                        <MoneyInput
                          id="liquidMFValue"
                          label="Liquid mutual funds"
                          error={errors.liquidMFValue?.message}
                          {...bindMoneyField("liquidMFValue")}
                        />
                        <p className="text-xs text-teal-600">
                          Liquid MFs give 6.5-7% returns. Withdraw in 24 hours.
                          Better than FD.
                        </p>
                        <button
                          type="button"
                          onClick={() => setLiquidMfInfoOpen((o) => !o)}
                          className="text-left text-sm font-medium text-[#534AB7] hover:underline"
                        >
                          What is a liquid mutual fund?{" "}
                          {liquidMfInfoOpen ? "▲" : "▼"}
                        </button>
                        <AnimatePresence initial={false}>
                          {liquidMfInfoOpen ? (
                            <m.div
                              key="liquid-mf-info"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{
                                duration: 0.28,
                                ease: [0.4, 0, 0.2, 1],
                              }}
                              className="overflow-hidden"
                            >
                              <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                                <p>
                                  A liquid mutual fund invests in government
                                  securities and bonds.
                                </p>
                                <p>
                                  <span className="font-medium text-slate-800">
                                    Returns:
                                  </span>{" "}
                                  6.5-7% per year
                                  <br />
                                  vs Savings account: 3-4%
                                  <br />
                                  vs FD: 6.5% but with penalty if broken
                                </p>
                                <p className="font-medium text-slate-800">
                                  Why better than FD for emergency:
                                </p>
                                <ul className="list-disc space-y-1 pl-5">
                                  <li>No penalty to withdraw</li>
                                  <li>Money in account within 24 hours</li>
                                  <li>Same or slightly lower returns</li>
                                  <li>Can invest ₹500 minimum</li>
                                </ul>
                                <p className="font-medium text-slate-800">
                                  Good options to consider:
                                </p>
                                <ul className="list-disc space-y-1 pl-5">
                                  <li>SBI Liquid Fund</li>
                                  <li>HDFC Liquid Fund</li>
                                  <li>Parag Parikh Liquid Fund</li>
                                </ul>
                                <p className="text-xs text-slate-500">
                                  This is not investment advice. Please research
                                  before investing.
                                </p>
                              </div>
                            </m.div>
                          ) : null}
                        </AnimatePresence>
                      </div>

                      <div className="sm:col-span-2 space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-sm font-medium text-slate-900">
                          Fixed deposits (breakable)
                        </p>
                        <p className="text-sm text-slate-600">
                          Same as &quot;Fixed Deposit total value&quot; above —
                          enter it once. We weight FD at 70% as emergency money
                          (penalty + time to break).
                        </p>
                        <p className="text-sm text-slate-800">
                          Your FD of {formatCurrency(erLiveFd, "en-IN", "INR")}{" "}
                          counts as{" "}
                          {formatCurrency(erLiveFdCounted, "en-IN", "INR")} (70%
                          after premature break penalty).
                        </p>
                      </div>

                      <MoneyInput
                        id="otherLiquidSavings"
                        label="Other liquid savings"
                        helper="Gold ETF, short term bonds, money market funds"
                        error={errors.otherLiquidSavings?.message}
                        {...bindMoneyField("otherLiquidSavings")}
                      />
                    </div>

                    <div className="rounded-2xl border border-[#E8E6F0] bg-[#FAFAFE] p-4">
                      <p className="text-sm font-medium text-slate-800">
                        Your accessible emergency fund
                      </p>
                      <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                        <li className="flex flex-wrap justify-between gap-2">
                          <span>Savings</span>
                          <span>
                            {formatCurrency(erLiveSavings, "en-IN", "INR")} ×
                            100% ={" "}
                            {formatCurrency(
                              erLiveSavingsCounted,
                              "en-IN",
                              "INR",
                            )}
                          </span>
                        </li>
                        <li className="flex flex-wrap justify-between gap-2">
                          <span>Liquid MF</span>
                          <span>
                            {formatCurrency(erLiveLiq, "en-IN", "INR")} × 95% ={" "}
                            {formatCurrency(erLiveLiqCounted, "en-IN", "INR")}
                          </span>
                        </li>
                        <li className="flex flex-wrap justify-between gap-2">
                          <span>FD</span>
                          <span>
                            {formatCurrency(erLiveFd, "en-IN", "INR")} × 70% ={" "}
                            {formatCurrency(erLiveFdCounted, "en-IN", "INR")}
                          </span>
                        </li>
                        <li className="flex flex-wrap justify-between gap-2">
                          <span>Other</span>
                          <span>
                            {formatCurrency(erLiveOther, "en-IN", "INR")} × 50%
                            ={" "}
                            {formatCurrency(erLiveOtherCounted, "en-IN", "INR")}
                          </span>
                        </li>
                      </ul>
                      <div className="my-3 border-t border-[#E8E6F0]" />
                      <p className="text-2xl font-bold text-[#534AB7]">
                        Real emergency fund:{" "}
                        {formatCurrency(erLiveTotal, "en-IN", "INR")}
                      </p>
                      <p
                        className={cn(
                          "mt-2 text-sm font-medium",
                          erMonthsToneClass,
                        )}
                      >
                        {monthlyNeedsForEmergency > 0 ? (
                          <>
                            This covers {erLiveMonths.toFixed(1)} months of
                            expenses
                          </>
                        ) : (
                          <>
                            Add living and fixed expenses to see months covered
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                    <SectionTitle>Bereavement / demise fund</SectionTitle>
                    <p className="text-sm text-slate-600">
                      Liquid money for last rites, travel, and immediate
                      expenses — not invested. Many families keep at least ₹2L
                      aside; adjust to what feels right for your family.
                    </p>
                    <MoneyInput
                      id="bereavementFund"
                      label="Amount set aside (savings / FD you can break quickly)"
                      error={errors.bereavementFund?.message}
                      {...bindMoneyField("bereavementFund")}
                    />
                  </div>

                  <div className="space-y-4">
                    <SectionTitle>Investments</SectionTitle>
                    <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-slate-800">
                        Retirement investments
                      </p>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <MoneyInput
                          id="ppfBalance"
                          label="PPF current balance"
                          helper="PPF balance — Existing investment cache"
                          error={errors.ppfBalance?.message}
                          {...bindMoneyField("ppfBalance")}
                        />
                        <MoneyInput
                          id="npsBalance"
                          label="NPS current balance"
                          helper="NPS balance — Existing investment cache"
                          error={errors.npsBalance?.message}
                          {...bindMoneyField("npsBalance")}
                        />
                        <MoneyInput
                          id="epfBalance"
                          label="EPF / PF current balance"
                          helper="EPF / PF balance — Existing investment cache"
                          error={errors.epfBalance?.message}
                          {...bindMoneyField("epfBalance")}
                        />
                        <MoneyInput
                          id="monthlySIP"
                          label="Monthly SIP / investment"
                          helper={`${INVESTMENT_CACHE_HELPER} · Long term`}
                          error={errors.monthlySIP?.message}
                          {...bindMoneyField("monthlySIP")}
                        />
                        {(watch("monthlySIP") ?? 0) > 0 ? (
                          <div className="sm:col-span-2">
                            <DayOfMonthPicker
                              label="Which date is your SIP auto-debited? (optional)"
                              value={watch("sipAutoDebitDay") || undefined}
                              onChange={(day) =>
                                setValue("sipAutoDebitDay", day)
                              }
                            />
                          </div>
                        ) : null}
                        {(watch("monthlyPPFContribution") ?? 0) > 0 ||
                        (watch("ppfBalance") ?? 0) > 0 ? (
                          <div className="sm:col-span-2">
                            <DayOfMonthPicker
                              label="Which date do you deposit to PPF? (optional)"
                              value={watch("ppfDepositDay") || undefined}
                              onChange={(day) => setValue("ppfDepositDay", day)}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-slate-800">
                        Market investments
                      </p>
                      <MoneyInput
                        id="totalEquityValue"
                        label="Total equity investments"
                        helper="Mutual funds + Indian stocks + US stocks + RSU/ESOPs"
                        error={errors.totalEquityValue?.message}
                        {...bindMoneyField("totalEquityValue")}
                      />
                    </div>
                    <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">
                          Custom investments
                        </p>
                        <Button
                          type="button"
                          variant="secondary"
                          className="border-slate-200"
                          disabled={customInvestmentFields.length >= 5}
                          onClick={() =>
                            appendCustomInvestment({
                              label: "",
                              currentValue: 0,
                              monthlyContribution: 0,
                              type: "other",
                            })
                          }
                        >
                          Add other investment +
                        </Button>
                      </div>
                      {customInvestmentFields.map((field, index) => (
                        <div
                          key={field.id}
                          className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2"
                        >
                          <TextInput
                            id={`customInvestments.${index}.label`}
                            label="Investment name"
                            {...register(
                              `customInvestments.${index}.label` as const,
                            )}
                          />
                          <div className="flex flex-col gap-1.5">
                            <label
                              htmlFor={`customInvestments.${index}.type`}
                              className="text-sm font-medium text-slate-700"
                            >
                              Type
                            </label>
                            <select
                              id={`customInvestments.${index}.type`}
                              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#534AB7]/25"
                              {...register(
                                `customInvestments.${index}.type` as const,
                              )}
                            >
                              <option value="equity">Equity</option>
                              <option value="debt">Debt</option>
                              <option value="real_estate">Real estate</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <MoneyInput
                            id={`customInvestments.${index}.currentValue`}
                            label="Current value"
                            {...bindMoneyField(
                              `customInvestments.${index}.currentValue` as const,
                            )}
                          />
                          <MoneyInput
                            id={`customInvestments.${index}.monthlyContribution`}
                            label="Monthly contribution"
                            {...bindMoneyField(
                              `customInvestments.${index}.monthlyContribution` as const,
                            )}
                          />
                          <button
                            type="button"
                            className="text-left text-sm font-medium text-slate-500 hover:text-slate-900"
                            onClick={() => removeCustomInvestment(index)}
                          >
                            × Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <SectionTitle>Physical assets</SectionTitle>
                    <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-medium text-slate-800">
                          Do you own a home?
                        </p>
                        <div className="w-[180px]">
                          <ToggleButtons
                            options={[
                              { label: "Yes", value: "yes" },
                              { label: "No", value: "no" },
                            ]}
                            value={ownsHome ? "yes" : "no"}
                            onChange={(value) =>
                              setValue("ownsHome", value === "yes")
                            }
                          />
                        </div>
                      </div>
                      {ownsHome ? (
                        <div className="grid gap-5 sm:grid-cols-2">
                          <MoneyInput
                            id="homeMarketValue"
                            label="Current market value"
                            error={errors.homeMarketValue?.message}
                            {...bindMoneyField("homeMarketValue")}
                          />
                          <MoneyInput
                            id="homeLoanOutstanding"
                            label="Outstanding home loan"
                            error={errors.homeLoanOutstanding?.message}
                            {...bindMoneyField("homeLoanOutstanding")}
                          />
                          <MoneyInput
                            id="homeLoanEMI"
                            label="Home loan EMI (monthly)"
                            helper="If you have a home loan, enter the EMI you pay each month"
                            error={errors.homeLoanEMI?.message}
                            {...bindMoneyField("homeLoanEMI")}
                          />
                          {(watch("homeLoanEMI") ?? 0) > 0 ||
                          (watch("homeLoanOutstanding") ?? 0) > 0 ? (
                            <div className="sm:col-span-2">
                              <DayOfMonthPicker
                                label="Which date is your home loan EMI debited? (optional)"
                                value={watch("homeLoanEMIDay") || undefined}
                                onChange={(day) =>
                                  setValue("homeLoanEMIDay", day)
                                }
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-medium text-slate-800">
                          Do you own a car?
                        </p>
                        <div className="w-[180px]">
                          <ToggleButtons
                            options={[
                              { label: "Yes", value: "yes" },
                              { label: "No", value: "no" },
                            ]}
                            value={ownsCar ? "yes" : "no"}
                            onChange={(value) =>
                              setValue("ownsCar", value === "yes")
                            }
                          />
                        </div>
                      </div>
                      {ownsCar ? (
                        <div className="grid gap-5 sm:grid-cols-2">
                          <MoneyInput
                            id="carMarketValue"
                            label="Current market value"
                            error={errors.carMarketValue?.message}
                            {...bindMoneyField("carMarketValue")}
                          />
                          <MoneyInput
                            id="carLoanOutstanding"
                            label="Outstanding car loan"
                            error={errors.carLoanOutstanding?.message}
                            {...bindMoneyField("carLoanOutstanding")}
                          />
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <MoneyInput
                        id="goldValue"
                        label="Gold and jewellery estimated value"
                        error={errors.goldValue?.message}
                        {...bindMoneyField("goldValue")}
                      />
                      <MoneyInput
                        id="otherAssets"
                        label="Any other property or asset"
                        error={errors.otherAssets?.message}
                        {...bindMoneyField("otherAssets")}
                      />
                      <TextInput
                        id="otherAssetLabel"
                        label="What is the other asset?"
                        error={errors.otherAssetLabel?.message}
                        {...register("otherAssetLabel")}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <SectionTitle>Ongoing savings / investments</SectionTitle>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <MoneyInput
                        id="monthlyRD"
                        label="Monthly RD amount currently running"
                        helper="RD — Investment cache · Emergency / short term"
                        error={errors.monthlyRD?.message}
                        {...bindMoneyField("monthlyRD")}
                      />
                      <MoneyInput
                        id="monthlyPPFContribution"
                        label="Monthly PPF contribution"
                        helper="PPF — Tax-free long term savings"
                        error={errors.monthlyPPFContribution?.message}
                        {...bindMoneyField("monthlyPPFContribution")}
                      />
                      <MoneyInput
                        id="monthlyNPSContribution"
                        label="Monthly NPS contribution"
                        helper="NPS — Investment cache · Retirement"
                        error={errors.monthlyNPSContribution?.message}
                        {...bindMoneyField("monthlyNPSContribution")}
                      />
                      <MoneyInput
                        id="monthlyEPFContribution"
                        label="Monthly EPF contribution — employee side only"
                        helper="EPF — Retirement deduction already reflected in take-home salary"
                        error={errors.monthlyEPFContribution?.message}
                        {...bindMoneyField("monthlyEPFContribution")}
                      />
                      {hasEligibleGirlChild ? (
                        <MoneyInput
                          id="ssy"
                          label="Monthly SSY deposit (girl child under 10)"
                          helper={mergeHelpers(
                            "Sukanya Samriddhi — open before she turns 10",
                            "Max ₹1,50,000/year",
                            "Matures when girl turns 21",
                            "Interest rate 8.2% p.a.",
                            "SSY — Investment cache · Girl child · 8.2% guaranteed",
                          )}
                          error={errors.ssy?.message}
                          {...bindMoneyField("ssy")}
                        />
                      ) : null}
                      <div className="sm:col-span-2 space-y-3 rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              Do you have any India Post / post office savings
                              schemes?
                            </p>
                            <p className="mt-0.5 text-[13px] text-[#9B9A94]">
                              NSC, KVP, MIS, SCSS, RD, time deposits, and
                              similar — holdings count toward net worth.
                            </p>
                          </div>
                          <div className="w-full sm:w-[180px]">
                            <ToggleButtons
                              options={[
                                { label: "Yes", value: "yes" },
                                { label: "No", value: "no" },
                              ]}
                              value={hasPostOfficeSchemes ? "yes" : "no"}
                              onChange={(value) => {
                                const next = value === "yes";
                                setValue("hasPostOfficeSchemes", next, {
                                  shouldDirty: true,
                                });
                                if (
                                  next &&
                                  postOfficeSchemeFields.length === 0
                                ) {
                                  appendPostOfficeScheme({
                                    id: newAnalyseRowId(),
                                    scheme: "nsc",
                                    amount: 0,
                                    maturityYear: undefined,
                                  });
                                }
                                if (!next) {
                                  setValue("postOfficeSchemes", []);
                                  setValue("investsInNsc", false);
                                  setValue("nscDepositAmount", 0);
                                }
                              }}
                            />
                          </div>
                        </div>
                        {hasPostOfficeSchemes ? (
                          <div className="space-y-4">
                            {postOfficeSchemeFields.map((field, index) => (
                              <div
                                key={field.id}
                                className="rounded-xl border border-[#E8E6F0] p-3"
                              >
                                <div className="mb-3 flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-slate-800">
                                    Scheme {index + 1}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removePostOfficeScheme(index)
                                    }
                                    className="text-lg font-semibold leading-none text-[#111110]"
                                  >
                                    ×
                                  </button>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-[#5F5E5A]">
                                      Scheme type
                                    </label>
                                    <select
                                      value={
                                        watch(
                                          `postOfficeSchemes.${index}.scheme` as const,
                                        ) || "nsc"
                                      }
                                      onChange={(e) =>
                                        setValue(
                                          `postOfficeSchemes.${index}.scheme` as const,
                                          e.target.value as PostOfficeSchemeId,
                                          { shouldDirty: true },
                                        )
                                      }
                                      className="h-12 w-full rounded-xl border-[1.5px] border-[#E8E6F0] bg-white px-3.5 text-[15px] text-[#111110] outline-none focus:border-[#534AB7]"
                                    >
                                      {POST_OFFICE_SCHEME_VALUES.map((id) => (
                                        <option key={id} value={id}>
                                          {POST_OFFICE_SCHEME_LABELS[id]}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <Controller
                                    control={control}
                                    name={`postOfficeSchemes.${index}.amount`}
                                    render={({ field: amountField }) => (
                                      <MoneyInput
                                        id={`postOfficeSchemes.${index}.amount`}
                                        label="Current holding / deposit"
                                        helper="Principal or balance you hold today"
                                        value={amountField.value ?? 0}
                                        onChange={(e) =>
                                          amountField.onChange(
                                            parseMoneyInput(
                                              e.currentTarget.value,
                                            ) ?? 0,
                                          )
                                        }
                                      />
                                    )}
                                  />
                                  <NumberInput
                                    label="Maturity year (optional)"
                                    value={
                                      watch(
                                        `postOfficeSchemes.${index}.maturityYear` as const,
                                      ) || 0
                                    }
                                    onChange={(val: number) =>
                                      setValue(
                                        `postOfficeSchemes.${index}.maturityYear` as const,
                                        Math.round(val),
                                      )
                                    }
                                    placeholder="e.g. 2028"
                                    min={2024}
                                    max={2060}
                                    step={1}
                                    helper="From your certificate or passbook"
                                  />
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() =>
                                appendPostOfficeScheme({
                                  id: newAnalyseRowId(),
                                  scheme: "nsc",
                                  amount: 0,
                                  maturityYear: undefined,
                                })
                              }
                              className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#534AB7] bg-transparent text-sm font-semibold text-[#534AB7]"
                            >
                              + Add another scheme
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {investmentsEmpty ? (
                    <Note>
                      Adding your existing investments gives you a more accurate
                      net worth and analysis.
                    </Note>
                  ) : null}
                  <div className="mt-2 flex items-center justify-between rounded-[10px] bg-[#EEEDFE] px-4 py-3">
                    <span className="text-sm font-medium text-[#3C3489]">
                      Estimated net worth
                    </span>
                    <div className="text-right">
                      <div className="text-lg font-bold text-[#534AB7]">
                        ₹{formatIndian(estimatedNetWorth)}
                      </div>
                      <div className="text-[11px] text-[#7F77DD]">
                        {formatInWords(Math.abs(estimatedNetWorth))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {step === 6 ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <SectionTitle>Primary goal</SectionTitle>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {PRIMARY_GOAL_VALUES.map((value) => {
                        const selected = watch("primaryGoal") === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setValue("primaryGoal", value, {
                                shouldDirty: true,
                              })
                            }
                            className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-medium leading-4 transition-colors sm:px-5 sm:py-3.5 sm:text-base sm:leading-4 ${
                              selected
                                ? "border-[#534AB7] bg-[#534AB7]/10 text-slate-900"
                                : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                            }`}
                          >
                            {PRIMARY_GOAL_LABELS[value]}
                          </button>
                        );
                      })}
                    </div>
                    <input type="hidden" {...register("primaryGoal")} />
                    {errors.primaryGoal?.message ? (
                      <p className="text-sm text-[#E24B4A]">
                        {errors.primaryGoal.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    <SectionTitle>Goal amounts and timelines</SectionTitle>
                    <div className="grid gap-5 sm:grid-cols-2">
                      {primaryGoal === "buy_home" ? (
                        <>
                          <MoneyInput
                            id="homePurchaseTarget"
                            label="Home purchase target"
                            error={errors.homePurchaseTarget?.message}
                            {...bindMoneyField("homePurchaseTarget")}
                          />
                          <NumberInput
                            label="Target year"
                            value={watch("homePurchaseYear") || 0}
                            onChange={(val: number) =>
                              setValue("homePurchaseYear", Math.round(val))
                            }
                            placeholder="e.g. 2028"
                            min={2024}
                            max={2060}
                            step={1}
                          />
                          <p className="sm:col-span-2 text-xs text-[#534AB7]">
                            Rule: Save 60% as down payment first.
                          </p>
                        </>
                      ) : null}
                      {primaryGoal === "retire_early" ? (
                        <>
                          <MoneyInput
                            id="retirementTargetCorpus"
                            label="Retirement target corpus"
                            helper={
                              retirementYears !== undefined
                                ? `${retirementYears} years to retirement based on your current age.`
                                : undefined
                            }
                            error={errors.retirementTargetCorpus?.message}
                            {...bindMoneyField("retirementTargetCorpus")}
                          />
                          <NumberInput
                            label="Target retirement age"
                            value={watch("retirementAge") || 0}
                            onChange={(val: number) =>
                              setValue("retirementAge", Math.round(val))
                            }
                            placeholder="e.g. 60"
                            min={30}
                            max={100}
                            step={1}
                          />
                        </>
                      ) : null}
                      {primaryGoal === "kids_education" ? (
                        <>
                          <MoneyInput
                            id="kidsEducationFundTarget"
                            label="Kids education fund target"
                            error={errors.kidsEducationFundTarget?.message}
                            {...bindMoneyField("kidsEducationFundTarget")}
                          />
                          <p className="sm:col-span-2 text-xs text-[#534AB7]">
                            Add per-child target if you have multiple kids.
                          </p>
                        </>
                      ) : null}
                      {primaryGoal === "build_emergency_fund" ? (
                        <>
                          <MoneyInput
                            id="emergencyFundTarget"
                            label="Emergency fund target"
                            helper={
                              emergencyFundSuggestion
                                ? `Suggested baseline: ${formatCurrency(emergencyFundSuggestion, "en-IN", "INR")}`
                                : undefined
                            }
                            error={errors.emergencyFundTarget?.message}
                            {...bindMoneyField("emergencyFundTarget")}
                          />
                        </>
                      ) : null}
                      {primaryGoal === "buy_car" ? (
                        <>
                          <MoneyInput
                            id="carPurchaseTarget"
                            label="Car purchase target"
                            error={errors.carPurchaseTarget?.message}
                            {...bindMoneyField("carPurchaseTarget")}
                          />
                          <NumberInput
                            label="Target year"
                            value={watch("carPurchaseYear") || 0}
                            onChange={(val: number) =>
                              setValue("carPurchaseYear", Math.round(val))
                            }
                            placeholder="e.g. 2028"
                            min={2024}
                            max={2060}
                            step={1}
                          />
                        </>
                      ) : null}
                      {primaryGoal === "clear_debt" ? (
                        <p className="sm:col-span-2 text-sm text-[#7A7871]">
                          Your debt plan will be built from the loans you
                          entered.
                        </p>
                      ) : null}
                      {primaryGoal === "grow_wealth" ? (
                        <p className="sm:col-span-2 text-sm text-[#7A7871]">
                          FIRE number will be calculated from your expenses.
                        </p>
                      ) : null}
                      {primaryGoal === "build_insurance_premium_fund" ? (
                        <p className="sm:col-span-2 text-sm text-[#7A7871]">
                          MIS + RD strategy will be calculated from your
                          insurance premiums.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </m.div>
          </AnimatePresence>

          <div className="relative z-10 flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              className="w-full border-slate-200 sm:w-auto"
              onClick={goBack}
              disabled={step === 0}
            >
              Back
            </Button>
            {step === STEPS.length - 1 ? (
              <div className="w-full sm:w-auto sm:min-w-[280px]">
                <button
                  type="button"
                  onClick={() => void handleFinalSubmit()}
                  disabled={isSubmitting}
                  className="relative z-20 flex w-full touch-manipulation select-none items-center justify-center gap-2 rounded-xl border-0 px-4 text-base font-bold text-white outline-none transition-[background] duration-200 focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] disabled:cursor-not-allowed"
                  style={{
                    height: 52,
                    background: isSubmitting ? "#AFA9EC" : "#534AB7",
                  }}
                >
                  {isSubmitting ? (
                    <BrandPageLoader
                      bare
                      size="xs"
                      inline
                      label="Analysing your finances…"
                    />
                  ) : (
                    "Analyse my finances →"
                  )}
                </button>
                {submitError ? (
                  <div
                    className="mt-3 rounded-lg px-3.5 py-2.5 text-center text-[13px] text-[#791F1F]"
                    style={{ background: "#FCEBEB" }}
                  >
                    {submitError}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="w-full sm:w-auto">
                <button
                  type="button"
                  className="relative z-20 inline-flex min-h-10 w-full touch-manipulation select-none items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-[color:var(--color-primary-foreground)] outline-none transition hover:opacity-95 active:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] sm:w-auto"
                  onClick={() => forceNext()}
                >
                  Next
                </button>
                {stepNavError ? (
                  <div
                    className="mt-3 rounded-lg px-3.5 py-2.5 text-center text-[13px] text-[#791F1F]"
                    style={{ background: "#FCEBEB" }}
                    role="alert"
                  >
                    {stepNavError}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </form>
      </div>
    </AnalyseAdvisorModal>
  );
}
