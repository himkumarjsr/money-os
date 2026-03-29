"use client";

import { Button } from "@/components/ui/button";
import {
  CITY_VALUES,
  LIFE_STAGE_LABELS,
  LIFE_STAGE_VALUES,
  PRIMARY_GOAL_LABELS,
  PRIMARY_GOAL_VALUES,
  type LifeStage,
  analyseDefaultValues,
  fullAnalyseSchema,
  parseMoneyInput,
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  type AnalyseFormValues,
} from "@/lib/analyse-form-schema";
import { useFinancialStore } from "@/store/use-financial-store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, useCallback, useEffect, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";

const STEPS = [
  { title: "Life stage", short: "Life" },
  { title: "Income", short: "Income" },
  { title: "Monthly expenses", short: "Expenses" },
  { title: "Savings & goals", short: "Goals" },
] as const;

const STEP_SCHEMAS = [step1Schema, step2Schema, step3Schema, step4Schema] as const;

const moneyFieldOptions = {
  setValueAs: parseMoneyInput,
} as const;

const MoneyInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    id: string;
    label: string;
    error?: string;
    required?: boolean;
  }
>(function MoneyInput({ id, label, error, required, ...inputProps }, ref) {
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
          {...inputProps}
        />
      </div>
      {error ? <p className="text-sm text-[#E24B4A]">{error}</p> : null}
    </div>
  );
});

MoneyInput.displayName = "MoneyInput";

function applyZodFieldErrors(
  flat: { fieldErrors: Record<string, string[] | undefined> },
  setError: (name: FieldPath<Partial<AnalyseFormValues>>, error: { message: string }) => void,
) {
  const fieldErrors = flat.fieldErrors;
  for (const key of Object.keys(fieldErrors)) {
    const msgs = fieldErrors[key];
    const msg = msgs?.[0];
    if (msg) {
      setError(key as FieldPath<Partial<AnalyseFormValues>>, { message: msg });
    }
  }
}

export function AnalyseOnboardingForm() {
  const router = useRouter();
  const setAnalysis = useFinancialStore((s) => s.setAnalysis);
  const setFullAnalysis = useFinancialStore((s) => s.setFullAnalysis);

  const [step, setStep] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    getValues,
    formState: { errors },
  } = useForm<Partial<AnalyseFormValues>>({
    defaultValues: analyseDefaultValues,
    mode: "onSubmit",
    shouldUnregister: false,
  });

  const lifeStage = watch("lifeStage");

  useEffect(() => {
    if (lifeStage !== "married_with_kids") {
      setValue("kidsExpenses", undefined);
    }
  }, [lifeStage, setValue]);

  useEffect(() => {
    const snap = useFinancialStore.getState().analysis;
    if (!snap) return;
    const entries = Object.entries(snap) as [
      keyof AnalyseFormValues,
      AnalyseFormValues[keyof AnalyseFormValues],
    ][];
    for (const [k, v] of entries) {
      if (v !== undefined && v !== null) {
        setValue(k, v);
      }
    }
  }, [setValue]);

  const goNext = useCallback(() => {
    const values = getValues();
    clearErrors();
    const parsed = STEP_SCHEMAS[step].safeParse(values);
    if (!parsed.success) {
      applyZodFieldErrors(parsed.error.flatten(), setError);
      return;
    }
    setAnalysis(parsed.data as Partial<AnalyseFormValues>);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [clearErrors, getValues, setAnalysis, setError, step]);

  const goBack = useCallback(() => {
    clearErrors();
    setStep((s) => Math.max(s - 1, 0));
  }, [clearErrors]);

  const onFinalSubmit = handleSubmit((data) => {
    clearErrors();
    const full = fullAnalyseSchema.safeParse(data);
    if (!full.success) {
      applyZodFieldErrors(full.error.flatten(), setError);
      return;
    }
    setFullAnalysis(full.data);
    router.push("/analyse/result");
  });

  const showKids = lifeStage === "married_with_kids";

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-10 lg:max-w-2xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="text-sm font-medium text-[#534AB7] hover:underline"
        >
          ← Back
        </Link>
        <p className="text-xs font-medium text-slate-500 sm:text-sm">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>

      <div className="mb-8">
        <div className="flex h-2 gap-1 overflow-hidden rounded-full bg-slate-100 sm:h-2.5 sm:gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s.short}
              className={`min-w-0 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-[#534AB7]" : "bg-slate-200"
              }`}
              aria-hidden
            />
          ))}
        </div>
        <div className="mt-3 flex justify-between text-[0.65rem] font-medium text-slate-500 sm:text-xs">
          {STEPS.map((s, i) => (
            <span
              key={s.short}
              className={i === step ? "text-[#534AB7]" : ""}
            >
              {s.short}
            </span>
          ))}
        </div>
      </div>

      <h1 className="mt-8 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
        {STEPS[step].title}
      </h1>
      <p className="mt-2 text-sm text-slate-600 sm:text-base">
        {step === 0 &&
          "Tell us where you are in life so we can tailor your check."}
        {step === 1 &&
          "Salary is required; rest helps us understand your household income."}
        {step === 2 &&
          "Rough monthly figures are fine — estimate if you’re unsure."}
        {step === 3 &&
          "Savings, safety net, and what you’re working toward."}
      </p>

      <form
        className="mt-8 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (step === STEPS.length - 1) {
            onFinalSubmit(e);
          } else {
            goNext();
          }
        }}
      >
        {step === 0 && (
          <fieldset className="space-y-3">
            <legend className="sr-only">Life stage</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {LIFE_STAGE_VALUES.map((value) => {
                const selected = lifeStage === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setValue("lifeStage", value, {
                        shouldValidate: false,
                        shouldDirty: true,
                      });
                    }}
                    className={`rounded-2xl border-2 p-4 text-left text-sm font-medium transition-colors sm:p-5 sm:text-base ${
                      selected
                        ? "border-[#534AB7] bg-[#534AB7]/10 text-slate-900"
                        : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    {LIFE_STAGE_LABELS[value as LifeStage]}
                  </button>
                );
              })}
            </div>
            <input type="hidden" {...register("lifeStage")} />
            {errors.lifeStage?.message ? (
              <p className="text-sm text-[#E24B4A]">{errors.lifeStage.message}</p>
            ) : null}
          </fieldset>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <MoneyInput
              id="monthlySalary"
              label="Monthly take-home salary"
              required
              error={errors.monthlySalary?.message}
              {...register("monthlySalary", moneyFieldOptions)}
            />
            <MoneyInput
              id="spouseIncome"
              label="Spouse income (optional)"
              error={errors.spouseIncome?.message}
              {...register("spouseIncome", moneyFieldOptions)}
            />
            <MoneyInput
              id="otherIncome"
              label="Other income — rent, freelance (optional)"
              error={errors.otherIncome?.message}
              {...register("otherIncome", moneyFieldOptions)}
            />
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="city"
                className="text-sm font-medium text-slate-700"
              >
                City <span className="text-[#E24B4A]">*</span>
              </label>
              <select
                id="city"
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#534AB7]/25"
                {...register("city")}
              >
                <option value="">
                  Select city / tier
                </option>
                {CITY_VALUES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.city?.message ? (
                <p className="text-sm text-[#E24B4A]">{errors.city.message}</p>
              ) : null}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <MoneyInput
              id="rentOrHomeLoanEmi"
              label="Rent or home loan EMI"
              error={errors.rentOrHomeLoanEmi?.message}
              {...register("rentOrHomeLoanEmi", moneyFieldOptions)}
            />
            <MoneyInput
              id="otherLoanEmis"
              label="Other loan EMIs (car, personal)"
              error={errors.otherLoanEmis?.message}
              {...register("otherLoanEmis", moneyFieldOptions)}
            />
            <MoneyInput
              id="foodGroceries"
              label="Food and groceries"
              error={errors.foodGroceries?.message}
              {...register("foodGroceries", moneyFieldOptions)}
            />
            <MoneyInput
              id="transport"
              label="Transport (fuel, Ola, metro)"
              error={errors.transport?.message}
              {...register("transport", moneyFieldOptions)}
            />
            <MoneyInput
              id="utilities"
              label="Utilities (electricity, internet, gas)"
              error={errors.utilities?.message}
              {...register("utilities", moneyFieldOptions)}
            />
            <MoneyInput
              id="entertainmentDiningShopping"
              label="Entertainment, dining, shopping"
              error={errors.entertainmentDiningShopping?.message}
              {...register("entertainmentDiningShopping", moneyFieldOptions)}
            />
            <MoneyInput
              id="insurancePremiumsMonthly"
              label="Insurance premiums (monthly share)"
              error={errors.insurancePremiumsMonthly?.message}
              {...register("insurancePremiumsMonthly", moneyFieldOptions)}
            />
            {showKids ? (
              <MoneyInput
                id="kidsExpenses"
                label="Kids expenses (school, activities)"
                error={errors.kidsExpenses?.message}
                {...register("kidsExpenses", moneyFieldOptions)}
              />
            ) : null}
            <MoneyInput
              id="parentsFamilySupport"
              label="Parents or family support (optional)"
              error={errors.parentsFamilySupport?.message}
              {...register("parentsFamilySupport", moneyFieldOptions)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <MoneyInput
              id="monthlySavingsOrSip"
              label="Current monthly savings or SIP amount"
              required
              error={errors.monthlySavingsOrSip?.message}
              {...register("monthlySavingsOrSip", moneyFieldOptions)}
            />
            <MoneyInput
              id="emergencyFundSaved"
              label="Emergency fund saved so far (total)"
              required
              error={errors.emergencyFundSaved?.message}
              {...register("emergencyFundSaved", moneyFieldOptions)}
            />
            <MoneyInput
              id="totalDebtOutstanding"
              label="Total debt outstanding (all loans combined)"
              required
              error={errors.totalDebtOutstanding?.message}
              {...register("totalDebtOutstanding", moneyFieldOptions)}
            />
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="primaryGoal"
                className="text-sm font-medium text-slate-700"
              >
                Primary goal <span className="text-[#E24B4A]">*</span>
              </label>
              <select
                id="primaryGoal"
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#534AB7]/25"
                {...register("primaryGoal")}
              >
                <option value="">Select primary goal</option>
                {PRIMARY_GOAL_VALUES.map((g) => (
                  <option key={g} value={g}>
                    {PRIMARY_GOAL_LABELS[g]}
                  </option>
                ))}
              </select>
              {errors.primaryGoal?.message ? (
                <p className="text-sm text-[#E24B4A]">
                  {errors.primaryGoal.message}
                </p>
              ) : null}
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            className="w-full border-slate-200 sm:w-auto"
            onClick={goBack}
            disabled={step === 0}
          >
            Back
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="w-full sm:w-auto"
          >
            {step === STEPS.length - 1 ? "See my results" : "Next"}
          </Button>
        </div>
      </form>
    </div>
  );
}
