"use client";

import { IncomeMeter } from "@/components/IncomeMeter";
import { Button } from "@/components/ui/button";
import {
  ADDITIONAL_OBLIGATION_TYPE_VALUES,
  CITY_TIER_LABELS,
  CITY_TIER_VALUES,
  LIFE_STAGE_LABELS,
  LIFE_STAGE_VALUES,
  PREMIUM_FREQUENCY_VALUES,
  PRIMARY_GOAL_LABELS,
  PRIMARY_GOAL_VALUES,
  analyseDefaultValues,
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
  type PremiumFrequency,
} from "@/lib/analyse-form-schema";
import { formatCurrency } from "@/lib/finance";
import { useFinancialStore } from "@/store/financialStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm, type FieldPath } from "react-hook-form";

const STEPS = [
  { title: "Personal profile", short: "Profile" },
  { title: "Income", short: "Income" },
  { title: "Fixed obligations", short: "Obligations" },
  { title: "Living expenses", short: "Expenses" },
  { title: "Insurance coverage", short: "Insurance" },
  { title: "Assets and savings", short: "Assets" },
  { title: "Goals", short: "Goals" },
] as const;

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

const ageBenchmarks = [
  { min: 25, max: 30, low: 2_00_000, high: 5_00_000 },
  { min: 30, max: 35, low: 8_00_000, high: 15_00_000 },
  { min: 35, max: 40, low: 20_00_000, high: 40_00_000 },
  { min: 40, max: 50, low: 40_00_000, high: 80_00_000 },
] as const;

const netWorthCardTone = (value: number) =>
  value >= 0
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : "border-red-200 bg-red-50 text-red-900";

const metricTone = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-900",
  red: "border-red-200 bg-red-50 text-red-900",
} as const;

const FIELD_HELPER = "text-xs text-slate-500";
const INVESTMENT_CACHE_HELPER = "Investment cache";

function mergeHelpers(...helpers: Array<string | undefined>) {
  return helpers.filter(Boolean).join(" · ");
}

const MoneyInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    id: string;
    label: string;
    error?: string;
    helper?: string;
    required?: boolean;
  }
>(function MoneyInput(
  { id, label, error, helper, required, placeholder = "0", ...inputProps },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-[#E24B4A]"> *</span> : null}
      </label>
      <div className="flex min-h-11 items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-[#534AB7]/25">
        <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600">
          ₹
        </span>
        <input
          ref={ref}
          id={id}
          inputMode="decimal"
          autoComplete="off"
          className="min-w-0 flex-1 border-0 bg-transparent px-3 text-slate-900 outline-none placeholder:text-slate-400"
          placeholder={placeholder}
          {...inputProps}
        />
      </div>
      {helper ? <p className={FIELD_HELPER}>{helper}</p> : null}
      {error ? <p className="text-sm text-[#E24B4A]">{error}</p> : null}
    </div>
  );
});

MoneyInput.displayName = "MoneyInput";

const NumberInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    id: string;
    label: string;
    error?: string;
    helper?: string;
    required?: boolean;
  }
>(function NumberInput(
  { id, label, error, helper, required, placeholder = "0", ...inputProps },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-[#E24B4A]"> *</span> : null}
      </label>
      <input
        ref={ref}
        id={id}
        inputMode="numeric"
        autoComplete="off"
        className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#534AB7]/25 placeholder:text-slate-400"
        placeholder={placeholder}
        {...inputProps}
      />
      {helper ? <p className={FIELD_HELPER}>{helper}</p> : null}
      {error ? <p className="text-sm text-[#E24B4A]">{error}</p> : null}
    </div>
  );
});

NumberInput.displayName = "NumberInput";

function TextInput({
  id,
  label,
  error,
  helper,
  required,
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
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-[#E24B4A]"> *</span> : null}
      </label>
      <input
        id={id}
        className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#534AB7]/25 placeholder:text-slate-400"
        {...props}
      />
      {helper ? <p className={FIELD_HELPER}>{helper}</p> : null}
      {error ? <p className="text-sm text-[#E24B4A]">{error}</p> : null}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{children}</h2>;
}

function Note({
  tone = "yellow",
  children,
}: {
  tone?: "yellow" | "red" | "green";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        tone === "red"
          ? "border-red-200 bg-red-50 text-red-800"
          : tone === "green"
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      {children}
    </div>
  );
}

function applyZodFieldErrors(
  flat: { fieldErrors: Record<string, string[] | undefined> },
  setError: (name: FieldPath<AnalyseFormValues>, error: { message: string }) => void,
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

function buildNetWorth(values: Partial<AnalyseFormValues>) {
  const obligations = values.additionalObligations ?? [];
  const assets = sum([
    values.savingsAccountBalance,
    values.fdValue,
    values.liquidMFValue,
    values.mfValue,
    values.indianStocksValue,
    values.usStocksValueINR,
    values.usMFValueINR,
    values.rsuValueINR,
    values.ppfBalance,
    values.npsBalance,
    values.epfBalance,
    values.homeMarketValue,
    values.carMarketValue,
    values.goldValue,
    values.otherAssets,
  ]);

  const emiBacklog = sum([
    values.personalLoanEMI ? values.personalLoanEMI * 36 : undefined,
    values.secondPropertyEMI ? values.secondPropertyEMI * 36 : undefined,
    values.bikeEMI ? values.bikeEMI * 36 : undefined,
    values.homeLoanOutstanding === undefined && values.homeLoanEMI
      ? values.homeLoanEMI * 36
      : undefined,
    values.carLoanOutstanding === undefined && values.carLoanEMI
      ? values.carLoanEMI * 36
      : undefined,
    ...obligations.map((item) => (item.monthlyAmount ?? 0) * 36),
  ]);

  const liabilities = sum([
    values.homeLoanOutstanding,
    values.carLoanOutstanding,
    emiBacklog,
  ]);

  return {
    assets,
    liabilities,
    netWorth: assets - liabilities,
  };
}

function getNetWorthStanding(age: number | undefined, netWorth: number) {
  if (!age) return null;
  const band = ageBenchmarks.find((item) => age >= item.min && age < item.max);
  if (!band) return null;
  const median = (band.low + band.high) / 2;

  if (netWorth >= band.high * 2) return "Your net worth puts you in the top 10% of Indians your age.";
  if (netWorth >= band.high) return "Your net worth puts you in the top 25% of Indians your age.";
  if (netWorth >= median) return "Your net worth puts you in the top 40% of Indians your age.";
  if (netWorth >= band.low) return "Your net worth puts you around the middle 50% of Indians your age.";
  return "Your net worth puts you in the bottom 50% of Indians your age.";
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
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-10 rounded-xl px-3 text-sm font-medium transition-colors ${
              selected
                ? "bg-white text-[#534AB7] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
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
      {amountError ? <p className="text-sm text-[#E24B4A]">{amountError}</p> : null}
    </div>
  );
}

export function AnalyseOnboardingForm() {
  const router = useRouter();
  const cachedAnalysis = useFinancialStore((state) => state.analysis);
  const hasHydrated = useFinancialStore((state) => state.hasHydrated);
  const setAnalysis = useFinancialStore((state) => state.setAnalysis);
  const setFullAnalysis = useFinancialStore((state) => state.setFullAnalysis);
  const hydratedResetDoneRef = useRef(false);

  const [step, setStep] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: "additionalObligations",
  });
  const {
    fields: otherInsuranceFields,
    append: appendOtherInsurance,
    remove: removeOtherInsurance,
  } = useFieldArray({
    control,
    name: "otherInsurancePolicies",
  });

  const lifeStage = watch("lifeStage");
  const numberOfKids = watch("numberOfKids") ?? 0;
  const hasHealthInsurance = watch("hasHealthInsurance");
  const hasTermInsurance = watch("hasTermInsurance");
  const hasOtherInsurance = watch("hasOtherInsurance");
  const ownsHome = watch("ownsHome");
  const ownsCar = watch("ownsCar");
  const parentsSupport = watch("parentsSupport") ?? 0;
  const hasParentsInsurance = (watch("parentsHealthInsuranceSumInsured") ?? 0) > 0;
  const selfAge = watch("selfAge");
  const retirementAge = watch("retirementAge") ?? 60;

  const watchedValues = watch();
  const totalIncome: number = sum([
    watchedValues.monthlySalary,
    watchedValues.spouseIncome,
    watchedValues.otherIncome,
  ]);
  const fixedObligations: number = sum([
    watchedValues.rentAmount,
    watchedValues.homeLoanEMI,
    watchedValues.secondPropertyEMI,
    watchedValues.carLoanEMI,
    watchedValues.bikeEMI,
    watchedValues.personalLoanEMI,
    ...(watchedValues.additionalObligations ?? []).map((row) => row.monthlyAmount),
  ]);
  const monthlyLivingExpenses: number = sum([
    watchedValues.vegetables,
    watchedValues.grocery,
    watchedValues.medicine,
    watchedValues.fuel,
    watchedValues.cabMetro,
    watchedValues.electricity,
    watchedValues.internet,
    watchedValues.gas,
    watchedValues.water,
    watchedValues.entertainment,
    watchedValues.shopping,
    watchedValues.personalCare,
    watchedValues.kidsSchoolFees,
    watchedValues.kidsActivities,
    watchedValues.parentsSupport,
  ]);
  const emergencyFundSuggestion =
    monthlyLivingExpenses + fixedObligations > 0
    ? (monthlyLivingExpenses + fixedObligations) * 6
    : undefined;
  const retirementYears = selfAge && retirementAge ? Math.max(0, retirementAge - selfAge) : undefined;
  const netWorth = useMemo(() => buildNetWorth(watchedValues), [watchedValues]);
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
    watchedValues.mfValue,
    watchedValues.indianStocksValue,
    watchedValues.usStocksValueINR,
    watchedValues.usMFValueINR,
    watchedValues.rsuValueINR,
    watchedValues.ppfBalance,
    watchedValues.npsBalance,
    watchedValues.epfBalance,
  ]);

  useEffect(() => {
    if (!hasHydrated || !cachedAnalysis) return;
    if (hydratedResetDoneRef.current) return;
    hydratedResetDoneRef.current = true;
    reset({
      ...analyseDefaultValues,
      ...cachedAnalysis,
    });
  }, [cachedAnalysis, hasHydrated, reset]);

  useEffect(() => {
    if (!hasHydrated) return;
    const subscription = watch((value) => {
      setAnalysis(value as Partial<AnalyseFormValues>);
    });
    return () => subscription.unsubscribe();
  }, [hasHydrated, setAnalysis, watch]);

  useEffect(() => {
    if (lifeStage !== "kids") {
      setValue("numberOfKids", 0);
      setValue("kidsAges", []);
      setValue("kidsGenders", []);
      setValue("kidsSchoolFees", 0);
      setValue("kidsActivities", 0);
      setValue("ssy", 0);
    }

    if (lifeStage === "bachelor") {
      setValue("spouseAge", 0);
      setValue("spouseIncome", 0);
    }
  }, [lifeStage, setValue]);

  useEffect(() => {
    if (!hasHealthInsurance) {
      setValue("healthInsuranceSumInsured", 0);
      setValue("healthInsurancePremiumInput", 0);
    }
  }, [hasHealthInsurance, setValue]);

  useEffect(() => {
    if (!hasTermInsurance) {
      setValue("termInsuranceSumAssured", 0);
      setValue("termInsurancePremiumInput", 0);
    }
  }, [hasTermInsurance, setValue]);

  useEffect(() => {
    if (hasOtherInsurance && otherInsuranceFields.length === 0) {
      appendOtherInsurance({
        policyName: "",
        premiumInput: 0,
        frequency: "monthly",
      });
    }
  }, [appendOtherInsurance, hasOtherInsurance, otherInsuranceFields.length]);

  useEffect(() => {
    if (!hasOtherInsurance) {
      setValue("otherInsurancePolicies", []);
    }
  }, [hasOtherInsurance, setValue]);

  useEffect(() => {
    if (!ownsHome) {
      setValue("homeMarketValue", 0);
      setValue("homeLoanOutstanding", 0);
    }
  }, [ownsHome, setValue]);

  useEffect(() => {
    if (!ownsCar) {
      setValue("carMarketValue", 0);
      setValue("carLoanOutstanding", 0);
      setValue("carPurchaseTarget", 0);
      setValue("carPurchaseYear", 0);
    }
  }, [ownsCar, setValue]);

  useEffect(() => {
    if (!hasEligibleGirlChild) {
      setValue("ssy", 0);
    }
  }, [hasEligibleGirlChild, setValue]);

  useEffect(() => {
    if (parentsSupport <= 0) {
      setValue("parentsCity", undefined);
      setValue("parentsHealthInsuranceSumInsured", 0);
      setValue("parentsEmergencyCash", 0);
    }
  }, [parentsSupport, setValue]);

  const goNext = useCallback(() => {
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }, []);

  const forceNext = useCallback(() => {
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }, []);

  const goBack = useCallback(() => {
    clearErrors();
    setStep((current) => Math.max(current - 1, 0));
  }, [clearErrors]);

  const onFinalSubmit = useCallback(() => {
    clearErrors();
    const values = getValues();
    const normalized = normalizeAnalyseFormValues({
      ...values,
      primaryGoal: values.primaryGoal || "grow_wealth",
      monthlySalary: values.monthlySalary ?? 0,
    });
    setFullAnalysis(normalized);
    router.push("/analyse/result");
  }, [clearErrors, getValues, router, setFullAnalysis]);

  const debtWarning =
    totalIncome > 0 && fixedObligations > totalIncome * 0.5
      ? "Your fixed obligations are above 50% of household income. That can make cash flow fragile."
      : null;

  const standingLine = getNetWorthStanding(selfAge, netWorth.netWorth);
  const housingTotal = sum([
    watchedValues.rentAmount,
    watchedValues.homeLoanEMI,
    watchedValues.secondPropertyEMI,
  ]);
  const housingNote = (() => {
    const rent = watchedValues.rentAmount ?? 0;
    const homeLoan = watchedValues.homeLoanEMI ?? 0;
    const secondProperty = watchedValues.secondPropertyEMI ?? 0;

    if (rent > 0 && homeLoan > 0 && secondProperty > 0) {
      return {
        tone: "yellow" as const,
        text: `Total housing obligation: ${formatCurrency(housingTotal, "en-IN", "INR")}/month across rent + 2 properties`,
      };
    }
    if (rent > 0 && homeLoan > 0) {
      return {
        tone: "yellow" as const,
        text: `You are paying both rent and EMI — total housing cost is ${formatCurrency(housingTotal, "en-IN", "INR")}/month. This is common for under-construction buyers. We will flag if it exceeds safe limits.`,
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
            ? `Own home / property EMI — ${formatCurrency(housingTotal, "en-IN", "INR")}/month`
            : `Own home — EMI ${formatCurrency(housingTotal, "en-IN", "INR")}/month`,
      };
    }
    return null;
  })();

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-10 lg:max-w-2xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/" className="text-sm font-medium text-[#534AB7] hover:underline">
          ← Back
        </Link>
        <p className="text-xs font-medium text-slate-500 sm:text-sm">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>

      <div className="mb-8">
        <div className="flex h-2 gap-1 overflow-hidden rounded-full bg-slate-100 sm:h-2.5 sm:gap-1.5">
          {STEPS.map((item, index) => (
            <div
              key={item.short}
              className={`min-w-0 flex-1 rounded-full transition-colors ${
                index <= step ? "bg-[#534AB7]" : "bg-slate-200"
              }`}
              aria-hidden
            />
          ))}
        </div>
        <div className="mt-3 flex justify-between text-[0.65rem] font-medium text-slate-500 sm:text-xs">
          {STEPS.map((item, index) => (
            <span key={item.short} className={index === step ? "text-[#534AB7]" : ""}>
              {item.short}
            </span>
          ))}
        </div>
      </div>

      <h1 className="mt-8 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
        {STEPS[step].title}
      </h1>
      <p className="mt-2 text-sm text-slate-600 sm:text-base">
        {step === 0 && "We’ll use this to tailor household assumptions, age benchmarks, and goal timelines."}
        {step === 1 && "All income inputs here are monthly take-home numbers in rupees."}
        {step === 2 && "Capture your fixed monthly commitments so we can measure how much of income is already locked in."}
        {step === 3 && "A realistic month is more useful than a perfect one. Estimates are fine."}
        {step === 4 && "Premiums entered as yearly values are converted into monthly equivalents internally."}
        {step === 5 && "Adding assets and ongoing contributions gives us a more useful net-worth baseline."}
        {step === 6 && "Choose the goal that matters most right now and fill only the targets that apply."}
      </p>

      <div className="mt-6">
        <IncomeMeter
          totalIncome={totalIncome}
          profile={watchedValues as Partial<FinancialProfile>}
        />
      </div>

      <form
        className="mt-8 space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (step === STEPS.length - 1) {
            void onFinalSubmit();
          } else {
            goNext();
          }
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
                      onClick={() => setValue("lifeStage", value, { shouldDirty: true })}
                      className={`rounded-2xl border-2 p-4 text-left text-sm font-medium transition-colors sm:p-5 sm:text-base ${
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
                <p className="text-sm text-[#E24B4A]">{errors.lifeStage.message}</p>
              ) : null}
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <NumberInput
                id="selfAge"
                label="Your age"
                required
                error={errors.selfAge?.message}
                {...register("selfAge", wholeNumberFieldOptions)}
              />
              {lifeStage && lifeStage !== "bachelor" ? (
                <NumberInput
                  id="spouseAge"
                  label="Spouse age"
                  error={errors.spouseAge?.message}
                  {...register("spouseAge", wholeNumberFieldOptions)}
                />
              ) : null}
            </div>

            {lifeStage === "kids" ? (
              <div className="space-y-5 rounded-2xl border border-slate-200 p-4">
                <div className="grid gap-5 sm:grid-cols-2">
                  <NumberInput
                    id="numberOfKids"
                    label="Number of kids"
                    error={errors.numberOfKids?.message}
                    {...register("numberOfKids", wholeNumberFieldOptions)}
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-3">
                  {Array.from({ length: Math.min(numberOfKids, 3) }).map((_, index) => (
                    <div key={index} className="space-y-4 rounded-2xl border border-slate-200 p-4">
                      <NumberInput
                        id={`kidsAges.${index}`}
                        label={`Kid ${index + 1} age`}
                        error={errors.kidsAges?.[index]?.message}
                        {...register(`kidsAges.${index}` as const, wholeNumberFieldOptions)}
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
                            setValue(`kidsGenders.${index}` as const, value as "boy" | "girl")
                          }
                        />
                        <input type="hidden" {...register(`kidsGenders.${index}` as const)} />
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
              <label htmlFor="cityTier" className="text-sm font-medium text-slate-700">
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
                <p className="text-sm text-[#E24B4A]">{errors.cityTier.message}</p>
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
              {...register("monthlySalary", moneyFieldOptions)}
            />
            {lifeStage !== "bachelor" ? (
              <MoneyInput
                id="spouseIncome"
                label="Spouse monthly income"
                error={errors.spouseIncome?.message}
                {...register("spouseIncome", moneyFieldOptions)}
              />
            ) : null}
            <MoneyInput
              id="otherIncome"
              label="Other income — freelance, rental, business"
              error={errors.otherIncome?.message}
              {...register("otherIncome", moneyFieldOptions)}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <SectionTitle>Housing</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2">
                <MoneyInput
                  id="rentAmount"
                  label="Rent you pay monthly"
                  helper="Enter 0 if you own and live in your own home"
                  error={errors.rentAmount?.message}
                  {...register("rentAmount", moneyFieldOptions)}
                />
                <MoneyInput
                  id="homeLoanEMI"
                  label="Home loan EMI (if any)"
                  helper="Enter 0 if you have no home loan"
                  error={errors.homeLoanEMI?.message}
                  {...register("homeLoanEMI", moneyFieldOptions)}
                />
                <MoneyInput
                  id="secondPropertyEMI"
                  label="Second property loan EMI (if any)"
                  helper="e.g. flat booked under construction while renting"
                  error={errors.secondPropertyEMI?.message}
                  {...register("secondPropertyEMI", moneyFieldOptions)}
                />
              </div>
              {housingNote ? <Note tone={housingNote.tone}>{housingNote.text}</Note> : null}
            </div>

            <div className="space-y-4">
              <SectionTitle>Vehicle loans</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2">
                <MoneyInput
                  id="carLoanEMI"
                  label="Car loan EMI"
                  error={errors.carLoanEMI?.message}
                  {...register("carLoanEMI", moneyFieldOptions)}
                />
                <MoneyInput
                  id="bikeEMI"
                  label="Two-wheeler loan EMI"
                  error={errors.bikeEMI?.message}
                  {...register("bikeEMI", moneyFieldOptions)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <SectionTitle>Other loans</SectionTitle>
              <MoneyInput
                id="personalLoanEMI"
                label="Personal loan EMI"
                helper="Add your monthly EMI. If you track the loan amount or rate separately, we’ll still use the EMI for analysis."
                error={errors.personalLoanEMI?.message}
                {...register("personalLoanEMI", moneyFieldOptions)}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle>Add more obligations</SectionTitle>
                <Button
                  type="button"
                  variant="secondary"
                  className="border-slate-200"
                  disabled={fields.length >= 6}
                  onClick={() =>
                    append({
                      type: "",
                      lender: "",
                      monthlyAmount: 0,
                    })
                  }
                >
                  Add
                </Button>
              </div>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-800">
                        Additional obligation {index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-sm font-medium text-slate-500 hover:text-slate-900"
                      >
                        ×
                      </button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor={`additionalObligations.${index}.type`}
                          className="text-sm font-medium text-slate-700"
                        >
                          Obligation type <span className="text-[#E24B4A]">*</span>
                        </label>
                        <select
                          id={`additionalObligations.${index}.type`}
                          className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#534AB7]/25"
                          {...register(`additionalObligations.${index}.type` as const)}
                        >
                          <option value="">Select</option>
                          {ADDITIONAL_OBLIGATION_TYPE_VALUES.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                        {errors.additionalObligations?.[index]?.type?.message ? (
                          <p className="text-sm text-[#E24B4A]">
                            {errors.additionalObligations[index]?.type?.message}
                          </p>
                        ) : null}
                      </div>
                      <TextInput
                        id={`additionalObligations.${index}.lender`}
                        label="Lender name"
                        error={errors.additionalObligations?.[index]?.lender?.message}
                        {...register(`additionalObligations.${index}.lender` as const)}
                      />
                      <MoneyInput
                        id={`additionalObligations.${index}.monthlyAmount`}
                        label="Monthly payment amount"
                        required
                        error={errors.additionalObligations?.[index]?.monthlyAmount?.message}
                        {...register(
                          `additionalObligations.${index}.monthlyAmount` as const,
                          moneyFieldOptions,
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {debtWarning ? <Note tone="red">{debtWarning}</Note> : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <SectionTitle>Food</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2">
                <MoneyInput id="vegetables" label="Vegetables and fruits" error={errors.vegetables?.message} {...register("vegetables", moneyFieldOptions)} />
                <MoneyInput id="grocery" label="Grocery and household items" error={errors.grocery?.message} {...register("grocery", moneyFieldOptions)} />
                <MoneyInput id="medicine" label="Medicine and pharmacy" error={errors.medicine?.message} {...register("medicine", moneyFieldOptions)} />
              </div>
            </div>
            <div className="space-y-4">
              <SectionTitle>Transport</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2">
                <MoneyInput id="fuel" label="Fuel" error={errors.fuel?.message} {...register("fuel", moneyFieldOptions)} />
                <MoneyInput id="cabMetro" label="Cab / auto / metro / bus" error={errors.cabMetro?.message} {...register("cabMetro", moneyFieldOptions)} />
              </div>
            </div>
            <div className="space-y-4">
              <SectionTitle>Utilities</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2">
                <MoneyInput id="electricity" label="Electricity" error={errors.electricity?.message} {...register("electricity", moneyFieldOptions)} />
                <MoneyInput id="internet" label="Internet and mobile recharge" error={errors.internet?.message} {...register("internet", moneyFieldOptions)} />
                <MoneyInput id="gas" label="Gas / LPG" error={errors.gas?.message} {...register("gas", moneyFieldOptions)} />
                <MoneyInput id="water" label="Water charges" error={errors.water?.message} {...register("water", moneyFieldOptions)} />
              </div>
            </div>
            <div className="space-y-4">
              <SectionTitle>Lifestyle</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2">
                <MoneyInput id="entertainment" label="Entertainment — OTT, dining out, movies" error={errors.entertainment?.message} {...register("entertainment", moneyFieldOptions)} />
                <MoneyInput id="shopping" label="Shopping — clothes, gadgets, misc" error={errors.shopping?.message} {...register("shopping", moneyFieldOptions)} />
                <MoneyInput id="personalCare" label="Personal care — salon, gym" error={errors.personalCare?.message} {...register("personalCare", moneyFieldOptions)} />
              </div>
            </div>
            <div className="space-y-4">
              <SectionTitle>Family</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2">
                {lifeStage === "kids" ? (
                  <>
                    <MoneyInput id="kidsSchoolFees" label="Kids school fees and tuition" error={errors.kidsSchoolFees?.message} {...register("kidsSchoolFees", moneyFieldOptions)} />
                    <MoneyInput id="kidsActivities" label="Kids activities — sports, hobby classes" error={errors.kidsActivities?.message} {...register("kidsActivities", moneyFieldOptions)} />
                  </>
                ) : null}
                <MoneyInput id="parentsSupport" label="Parents / in-laws support" error={errors.parentsSupport?.message} {...register("parentsSupport", moneyFieldOptions)} />
              </div>
            </div>
            {parentsSupport > 0 ? (
              <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <SectionTitle>Parents care details</SectionTitle>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="parentsCity" className="text-sm font-medium text-slate-700">
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
                                ? Math.max(watch("parentsHealthInsuranceSumInsured") ?? 0, 5_00_000)
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
                        error={errors.parentsHealthInsuranceSumInsured?.message}
                        {...register("parentsHealthInsuranceSumInsured", moneyFieldOptions)}
                      />
                    ) : null}
                  </div>
                  <MoneyInput
                    id="parentsEmergencyCash"
                    label="Liquid cash set aside specifically for parents medical needs (₹)"
                    helper="Separate from your emergency fund. Senior medical costs can be sudden and large."
                    error={errors.parentsEmergencyCash?.message}
                    {...register("parentsEmergencyCash", moneyFieldOptions)}
                  />
                </div>
              </div>
            ) : null}
            {debtWarning ? <Note tone="red">{debtWarning}</Note> : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-slate-800">Do you have health insurance?</p>
                <div className="w-[180px]">
                  <ToggleButtons
                    options={[
                      { label: "Yes", value: "yes" },
                      { label: "No", value: "no" },
                    ]}
                    value={hasHealthInsurance ? "yes" : "no"}
                    onChange={(value) => setValue("hasHealthInsurance", value === "yes")}
                  />
                </div>
              </div>
              {hasHealthInsurance ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  <MoneyInput
                    id="healthInsuranceSumInsured"
                    label="Sum insured"
                    error={errors.healthInsuranceSumInsured?.message}
                    {...register("healthInsuranceSumInsured", moneyFieldOptions)}
                  />
                  <PremiumField
                    inputId="healthInsurancePremiumInput"
                    label="Premium amount"
                    amountError={errors.healthInsurancePremiumInput?.message}
                    frequency={watch("healthInsurancePremiumFrequency") ?? "monthly"}
                    onFrequencyChange={(value) => setValue("healthInsurancePremiumFrequency", value)}
                  >
                    <MoneyInput
                      id="healthInsurancePremiumInput"
                      label="Premium amount"
                      {...register("healthInsurancePremiumInput", moneyFieldOptions)}
                    />
                  </PremiumField>
                </div>
              ) : null}
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-slate-800">Do you have term insurance?</p>
                <div className="w-[180px]">
                  <ToggleButtons
                    options={[
                      { label: "Yes", value: "yes" },
                      { label: "No", value: "no" },
                    ]}
                    value={hasTermInsurance ? "yes" : "no"}
                    onChange={(value) => setValue("hasTermInsurance", value === "yes")}
                  />
                </div>
              </div>
              {hasTermInsurance ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  <MoneyInput
                    id="termInsuranceSumAssured"
                    label="Sum assured"
                    error={errors.termInsuranceSumAssured?.message}
                    {...register("termInsuranceSumAssured", moneyFieldOptions)}
                  />
                  <PremiumField
                    inputId="termInsurancePremiumInput"
                    label="Premium amount"
                    amountError={errors.termInsurancePremiumInput?.message}
                    frequency={watch("termInsurancePremiumFrequency") ?? "monthly"}
                    onFrequencyChange={(value) => setValue("termInsurancePremiumFrequency", value)}
                  >
                    <MoneyInput
                      id="termInsurancePremiumInput"
                      label="Premium amount"
                      {...register("termInsurancePremiumInput", moneyFieldOptions)}
                    />
                  </PremiumField>
                </div>
              ) : null}
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
              <SectionTitle>Vehicle insurance</SectionTitle>
              <div className="grid gap-5">
                <PremiumField
                  inputId="carInsurancePremiumInput"
                  label="Car insurance premium"
                  amountError={errors.carInsurancePremiumInput?.message}
                  frequency={watch("carInsurancePremiumFrequency") ?? "monthly"}
                  onFrequencyChange={(value) => setValue("carInsurancePremiumFrequency", value)}
                >
                  <MoneyInput
                    id="carInsurancePremiumInput"
                    label="Car insurance premium"
                    {...register("carInsurancePremiumInput", moneyFieldOptions)}
                  />
                </PremiumField>
                <PremiumField
                  inputId="bikeInsurancePremiumInput"
                  label="Two-wheeler insurance premium"
                  amountError={errors.bikeInsurancePremiumInput?.message}
                  frequency={watch("bikeInsurancePremiumFrequency") ?? "monthly"}
                  onFrequencyChange={(value) => setValue("bikeInsurancePremiumFrequency", value)}
                >
                  <MoneyInput
                    id="bikeInsurancePremiumInput"
                    label="Two-wheeler insurance premium"
                    {...register("bikeInsurancePremiumInput", moneyFieldOptions)}
                  />
                </PremiumField>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-slate-800">Any other insurance premium?</p>
                <div className="w-[180px]">
                  <ToggleButtons
                    options={[
                      { label: "Yes", value: "yes" },
                      { label: "No", value: "no" },
                    ]}
                    value={hasOtherInsurance ? "yes" : "no"}
                    onChange={(value) => setValue("hasOtherInsurance", value === "yes")}
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
                      onClick={() =>
                        appendOtherInsurance({
                          policyName: "",
                          premiumInput: 0,
                          frequency: "monthly",
                        })
                      }
                    >
                      Add
                    </Button>
                  </div>
                  {errors.otherInsurancePolicies?.message ? (
                    <p className="text-sm text-[#E24B4A]">
                      {errors.otherInsurancePolicies.message}
                    </p>
                  ) : null}
                  <div className="space-y-4">
                    {otherInsuranceFields.map((field, index) => (
                      <div key={field.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-800">
                            Other insurance premium {index + 1}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeOtherInsurance(index)}
                            className="text-sm font-medium text-slate-500 hover:text-slate-900"
                          >
                            ×
                          </button>
                        </div>
                        <div className="space-y-4">
                          <TextInput
                            id={`otherInsurancePolicies.${index}.policyName`}
                            label="Policy name"
                            error={errors.otherInsurancePolicies?.[index]?.policyName?.message}
                            placeholder="LIC / endowment / ULIP / other"
                            {...register(`otherInsurancePolicies.${index}.policyName` as const)}
                          />
                          <PremiumField
                            inputId={`otherInsurancePolicies.${index}.premiumInput`}
                            label="Premium amount"
                            amountError={
                              errors.otherInsurancePolicies?.[index]?.premiumInput?.message
                            }
                            frequency={
                              watch(`otherInsurancePolicies.${index}.frequency` as const) ??
                              "monthly"
                            }
                            onFrequencyChange={(value) =>
                              setValue(
                                `otherInsurancePolicies.${index}.frequency` as const,
                                value,
                              )
                            }
                          >
                            <MoneyInput
                              id={`otherInsurancePolicies.${index}.premiumInput`}
                              label="Premium amount"
                              {...register(
                                `otherInsurancePolicies.${index}.premiumInput` as const,
                                moneyFieldOptions,
                              )}
                            />
                          </PremiumField>
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
                <MoneyInput id="savingsAccountBalance" label="Savings account balance" error={errors.savingsAccountBalance?.message} {...register("savingsAccountBalance", moneyFieldOptions)} />
                <MoneyInput id="fdValue" label="Fixed Deposit total value" error={errors.fdValue?.message} {...register("fdValue", moneyFieldOptions)} />
                <MoneyInput id="liquidMFValue" label="Liquid mutual fund value" error={errors.liquidMFValue?.message} {...register("liquidMFValue", moneyFieldOptions)} />
                <MoneyInput id="emergencyFundCurrent" label="Emergency fund set aside" error={errors.emergencyFundCurrent?.message} {...register("emergencyFundCurrent", moneyFieldOptions)} />
              </div>
            </div>

            <div className="space-y-4">
              <SectionTitle>Investments</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2">
                <MoneyInput id="mfValue" label="Mutual funds total current value" helper="Mutual funds — Existing investment cache" error={errors.mfValue?.message} {...register("mfValue", moneyFieldOptions)} />
                <MoneyInput id="indianStocksValue" label="Indian stocks total current value" helper="Indian stocks — Existing investment cache" error={errors.indianStocksValue?.message} {...register("indianStocksValue", moneyFieldOptions)} />
                <MoneyInput id="usStocksValueINR" label="US stocks total current value" helper="US stocks — Existing investment cache" error={errors.usStocksValueINR?.message} {...register("usStocksValueINR", moneyFieldOptions)} />
                <MoneyInput id="usMFValueINR" label="US mutual funds total current value" error={errors.usMFValueINR?.message} {...register("usMFValueINR", moneyFieldOptions)} />
                <MoneyInput id="rsuValueINR" label="RSU / ESOPs total current value in ₹" helper="RSU / ESOP — Existing investment cache" error={errors.rsuValueINR?.message} {...register("rsuValueINR", moneyFieldOptions)} />
                <MoneyInput id="ppfBalance" label="PPF current balance" helper="PPF balance — Existing investment cache" error={errors.ppfBalance?.message} {...register("ppfBalance", moneyFieldOptions)} />
                <MoneyInput id="npsBalance" label="NPS current balance" helper="NPS balance — Existing investment cache" error={errors.npsBalance?.message} {...register("npsBalance", moneyFieldOptions)} />
                <MoneyInput id="epfBalance" label="EPF / PF current balance" helper="EPF / PF balance — Existing investment cache" error={errors.epfBalance?.message} {...register("epfBalance", moneyFieldOptions)} />
              </div>
            </div>

            <div className="space-y-4">
              <SectionTitle>Physical assets</SectionTitle>
              <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-slate-800">Do you own a home?</p>
                  <div className="w-[180px]">
                    <ToggleButtons
                      options={[
                        { label: "Yes", value: "yes" },
                        { label: "No", value: "no" },
                      ]}
                      value={ownsHome ? "yes" : "no"}
                      onChange={(value) => setValue("ownsHome", value === "yes")}
                    />
                  </div>
                </div>
                {ownsHome ? (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <MoneyInput id="homeMarketValue" label="Current market value" error={errors.homeMarketValue?.message} {...register("homeMarketValue", moneyFieldOptions)} />
                    <MoneyInput id="homeLoanOutstanding" label="Outstanding home loan" error={errors.homeLoanOutstanding?.message} {...register("homeLoanOutstanding", moneyFieldOptions)} />
                  </div>
                ) : null}
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-slate-800">Do you own a car?</p>
                  <div className="w-[180px]">
                    <ToggleButtons
                      options={[
                        { label: "Yes", value: "yes" },
                        { label: "No", value: "no" },
                      ]}
                      value={ownsCar ? "yes" : "no"}
                      onChange={(value) => setValue("ownsCar", value === "yes")}
                    />
                  </div>
                </div>
                {ownsCar ? (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <MoneyInput id="carMarketValue" label="Current market value" error={errors.carMarketValue?.message} {...register("carMarketValue", moneyFieldOptions)} />
                    <MoneyInput id="carLoanOutstanding" label="Outstanding car loan" error={errors.carLoanOutstanding?.message} {...register("carLoanOutstanding", moneyFieldOptions)} />
                  </div>
                ) : null}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <MoneyInput id="goldValue" label="Gold and jewellery estimated value" error={errors.goldValue?.message} {...register("goldValue", moneyFieldOptions)} />
                <MoneyInput id="otherAssets" label="Any other property or asset" error={errors.otherAssets?.message} {...register("otherAssets", moneyFieldOptions)} />
                <TextInput id="otherAssetLabel" label="What is the other asset?" error={errors.otherAssetLabel?.message} {...register("otherAssetLabel")} />
              </div>
            </div>

            <div className="space-y-4">
              <SectionTitle>Ongoing savings / investments</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2">
                <MoneyInput id="monthlySIP" label="Monthly SIP amount currently running" helper="SIP — Investment cache · Long term" error={errors.monthlySIP?.message} {...register("monthlySIP", moneyFieldOptions)} />
                <MoneyInput id="monthlyRD" label="Monthly RD amount currently running" helper="RD — Investment cache · Emergency / short term" error={errors.monthlyRD?.message} {...register("monthlyRD", moneyFieldOptions)} />
                <MoneyInput id="monthlyPPFContribution" label="Monthly PPF contribution" helper="PPF — Tax-free long term savings" error={errors.monthlyPPFContribution?.message} {...register("monthlyPPFContribution", moneyFieldOptions)} />
                <MoneyInput id="monthlyNPSContribution" label="Monthly NPS contribution" helper="NPS — Investment cache · Retirement" error={errors.monthlyNPSContribution?.message} {...register("monthlyNPSContribution", moneyFieldOptions)} />
                <MoneyInput id="monthlyEPFContribution" label="Monthly EPF contribution — employee side only" helper="EPF — Retirement deduction already reflected in take-home salary" error={errors.monthlyEPFContribution?.message} {...register("monthlyEPFContribution", moneyFieldOptions)} />
                {hasEligibleGirlChild ? (
                  <MoneyInput
                    id="ssy"
                    label="Monthly SSY deposit"
                    helper={mergeHelpers(
                      "Max ₹1,50,000/year",
                      "Matures when girl turns 21",
                      "Interest rate 8.2% p.a.",
                      "one of the best guaranteed returns",
                      "SSY — Investment cache · Girl child · 8.2% guaranteed",
                    )}
                    error={errors.ssy?.message}
                    {...register("ssy", moneyFieldOptions)}
                  />
                ) : null}
                <MoneyInput
                  id="nscMonthly"
                  label="Monthly NSC investment equivalent"
                  helper={mergeHelpers(
                    "5-year lock-in",
                    "7.7% p.a.",
                    "80C eligible",
                    "Enter monthly equivalent of what you invest",
                    "NSC — Investment cache · 5yr · 7.7% · 80C eligible",
                  )}
                  error={errors.nscMonthly?.message}
                  {...register("nscMonthly", moneyFieldOptions)}
                />
              </div>
            </div>

            {investmentsEmpty ? (
              <Note>Adding your existing investments gives you a more accurate net worth and analysis.</Note>
            ) : null}
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
                      onClick={() => setValue("primaryGoal", value, { shouldDirty: true })}
                      className={`rounded-2xl border-2 p-4 text-left text-sm font-medium transition-colors sm:p-5 sm:text-base ${
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
                <p className="text-sm text-[#E24B4A]">{errors.primaryGoal.message}</p>
              ) : null}
            </div>

            <div className="space-y-4">
              <SectionTitle>Goal amounts and timelines</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2">
                <MoneyInput
                  id="retirementTargetCorpus"
                  label="Retirement target corpus"
                  helper={retirementYears !== undefined ? `${retirementYears} years to retirement based on your current age.` : undefined}
                  error={errors.retirementTargetCorpus?.message}
                  {...register("retirementTargetCorpus", moneyFieldOptions)}
                />
                <NumberInput
                  id="retirementAge"
                  label="Target retirement age"
                  error={errors.retirementAge?.message}
                  {...register("retirementAge", wholeNumberFieldOptions)}
                />

                {lifeStage === "kids" ? (
                  <>
                    <MoneyInput
                      id="kidsEducationFundTarget"
                      label="Kids education fund target (₹ per child)"
                      helper="e.g. ₹25 lakh per child for engineering"
                      error={errors.kidsEducationFundTarget?.message}
                      {...register("kidsEducationFundTarget", moneyFieldOptions)}
                    />
                    <MoneyInput
                      id="kidsMarriageFundTarget"
                      label="Kids marriage fund target (₹ per child)"
                      helper="e.g. ₹15–25 lakh per child"
                      error={errors.kidsMarriageFundTarget?.message}
                      {...register("kidsMarriageFundTarget", moneyFieldOptions)}
                    />
                  </>
                ) : null}

                <MoneyInput
                  id="emergencyFundTarget"
                  label="Emergency fund target"
                  helper={
                    emergencyFundSuggestion
                      ? `Suggested baseline: ${formatCurrency(emergencyFundSuggestion, "en-IN", "INR")} based on fixed + living expenses.`
                      : undefined
                  }
                  error={errors.emergencyFundTarget?.message}
                  {...register("emergencyFundTarget", moneyFieldOptions)}
                />
                <MoneyInput
                  id="medicalEmergencyFund"
                  label="Medical emergency fund"
                  helper="Separate from health insurance — for gaps, co-pay, elder care"
                  error={errors.medicalEmergencyFund?.message}
                  {...register("medicalEmergencyFund", moneyFieldOptions)}
                />

                {parentsSupport > 0 ? (
                  <MoneyInput
                    id="bereavementFund"
                    label="Amount set aside for family bereavement expenses (₹)"
                    helper="₹2L minimum recommended if you have elderly parents or dependents. Keep in savings account — accessible same day."
                    error={errors.bereavementFund?.message}
                    {...register("bereavementFund", moneyFieldOptions)}
                  />
                ) : null}

                {(watchedValues.rentAmount ?? 0) > 0 ? (
                  <>
                    <MoneyInput
                      id="homePurchaseTarget"
                      label="Home purchase target"
                      error={errors.homePurchaseTarget?.message}
                      {...register("homePurchaseTarget", moneyFieldOptions)}
                    />
                    <NumberInput
                      id="homePurchaseYear"
                      label="Target year"
                      error={errors.homePurchaseYear?.message}
                      {...register("homePurchaseYear", wholeNumberFieldOptions)}
                    />
                  </>
                ) : null}

                {!ownsCar ? (
                  <>
                    <MoneyInput
                      id="carPurchaseTarget"
                      label="Car purchase target"
                      error={errors.carPurchaseTarget?.message}
                      {...register("carPurchaseTarget", moneyFieldOptions)}
                    />
                    <NumberInput
                      id="carPurchaseYear"
                      label="Target year"
                      error={errors.carPurchaseYear?.message}
                      {...register("carPurchaseYear", wholeNumberFieldOptions)}
                    />
                  </>
                ) : null}
              </div>
            </div>

            <div className={`rounded-3xl border p-5 shadow-sm ${netWorthCardTone(netWorth.netWorth)}`}>
              <p className="text-sm font-semibold uppercase tracking-wide">Live net worth summary</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className={`rounded-2xl border p-4 ${metricTone.green}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide">Total assets</p>
                  <p className="mt-2 break-all text-[clamp(1.6rem,4vw,3rem)] font-semibold leading-tight">
                    {formatCurrency(netWorth.assets, "en-IN", "INR")}
                  </p>
                </div>
                <div className={`rounded-2xl border p-4 ${metricTone.red}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide">Total liabilities</p>
                  <p className="mt-2 break-all text-[clamp(1.6rem,4vw,3rem)] font-semibold leading-tight">
                    {formatCurrency(netWorth.liabilities, "en-IN", "INR")}
                  </p>
                </div>
                <div className={`rounded-2xl border p-4 ${netWorth.netWorth >= 0 ? metricTone.green : metricTone.red}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide">Net worth</p>
                  <p className="mt-2 break-all text-[clamp(1.6rem,4vw,3rem)] font-semibold leading-tight">
                    {formatCurrency(netWorth.netWorth, "en-IN", "INR")}
                  </p>
                </div>
              </div>
              {standingLine ? <p className="mt-4 text-sm">{standingLine}</p> : null}
            </div>
          </div>
        ) : null}

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
          <button
            type="button"
            className="relative z-20 inline-flex min-h-10 w-full touch-manipulation select-none items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-[color:var(--color-primary-foreground)] outline-none transition hover:opacity-95 active:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] sm:w-auto"
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => {
              if (step === STEPS.length - 1) {
                void onFinalSubmit();
                return;
              }
              forceNext();
            }}
          >
            {step === STEPS.length - 1
              ? "Analyse my complete financial picture →"
              : "Next"}
          </button>
        </div>
      </form>
    </div>
  );
}
