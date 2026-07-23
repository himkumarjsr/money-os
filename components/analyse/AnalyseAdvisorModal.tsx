"use client";

import {
  CITY_TIER_LABELS,
  CITY_TIER_VALUES,
  LIFE_STAGE_LABELS,
  LIFE_STAGE_VALUES,
  PRIMARY_GOAL_LABELS,
  PRIMARY_GOAL_VALUES,
  newAnalyseRowId,
  parseMoneyInput,
  type AnalyseFormValues,
  type CityTier,
  type LifeStage,
  type PrimaryGoal,
} from "@/lib/analyse-form-schema";
import {
  DayOfMonthPicker,
  MonthDaySelects,
} from "@/components/forms/ObligationDateFields";
import { clearBodyScrollLocks, lockBodyScroll } from "@/lib/bodyScrollLock";
import { formatIndian } from "@/lib/formatters";
import { AppIcon } from "@/components/ui/AppIcon";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import MoneyInput from "@/components/ui/MoneyInput";
import NumberInput from "@/components/ui/NumberInput";
import { useEffect, useMemo, useState } from "react";
import type {
  FieldPath,
  UseFormGetValues,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";

function AdvisorMoney({
  id,
  label,
  amount,
  onAmount,
  optional,
}: {
  id: string;
  label: string;
  amount: number;
  onAmount: (n: number) => void;
  optional?: boolean;
}) {
  return (
    <MoneyInput
      key={id}
      id={id}
      label={label}
      optional={optional}
      defaultValue={amount > 0 ? formatIndian(amount) : ""}
      onChange={(e) => onAmount(parseMoneyInput(e.target.value) ?? 0)}
    />
  );
}

type StepId =
  | "welcome"
  | "lifeStage"
  | "selfAge"
  | "cityTier"
  | "kidsCount"
  | "salary"
  | "spouseIncome"
  | "otherIncome"
  | "rentGate"
  | "rentAmount"
  | "emiGate"
  | "emiAmount"
  | "ccGate"
  | "ccAmount"
  | "food"
  | "transport"
  | "utilities"
  | "lifestyle"
  | "parentsGate"
  | "parentsAmount"
  | "healthGate"
  | "healthCover"
  | "termGate"
  | "termCover"
  | "emergencyCash"
  | "monthlySip"
  | "ownsHome"
  | "ownsCar"
  | "primaryGoal"
  | "goalAmount"
  | "review";

type StepDef = {
  id: StepId;
  section: string;
  question: string;
  hint?: string;
  skippable?: boolean;
};

const BASE_STEPS: StepDef[] = [
  {
    id: "welcome",
    section: "Get ready",
    question: "Hi — I’m your Finkoin financial advisor.",
    hint: "I’ll ask short questions (no long form). Your answers save automatically as we go.",
  },
  {
    id: "lifeStage",
    section: "About you",
    question: "Which best describes your household today?",
  },
  {
    id: "selfAge",
    section: "About you",
    question: "What’s your age?",
    hint: "Between 18 and 80.",
  },
  {
    id: "cityTier",
    section: "About you",
    question: "Where do you live?",
  },
  {
    id: "kidsCount",
    section: "About you",
    question: "How many kids do you have?",
  },
  {
    id: "salary",
    section: "Income",
    question: "What’s your monthly take-home salary?",
    hint: "After PF / tax — the amount that lands in your account.",
  },
  {
    id: "spouseIncome",
    section: "Income",
    question: "Spouse’s monthly take-home (if any)?",
    skippable: true,
  },
  {
    id: "otherIncome",
    section: "Income",
    question: "Any other monthly income?",
    hint: "Freelance, rent from property you own, side income…",
    skippable: true,
  },
  {
    id: "rentGate",
    section: "Obligations",
    question: "Do you pay house rent every month?",
  },
  {
    id: "rentAmount",
    section: "Obligations",
    question: "What’s your monthly rent?",
  },
  {
    id: "emiGate",
    section: "Obligations",
    question: "Do you have any loan EMIs right now?",
  },
  {
    id: "emiAmount",
    section: "Obligations",
    question: "About how much do you pay in EMIs each month (total)?",
  },
  {
    id: "ccGate",
    section: "Obligations",
    question: "Do you carry a credit-card balance you pay each month?",
  },
  {
    id: "ccAmount",
    section: "Obligations",
    question: "Rough monthly credit-card bill you actually pay?",
  },
  {
    id: "food",
    section: "Living costs",
    question: "Monthly food & groceries spend?",
    skippable: true,
  },
  {
    id: "transport",
    section: "Living costs",
    question: "Monthly transport (fuel, cab, metro)?",
    skippable: true,
  },
  {
    id: "utilities",
    section: "Living costs",
    question: "Monthly utilities (electricity, internet, gas, water)?",
    skippable: true,
  },
  {
    id: "lifestyle",
    section: "Living costs",
    question: "Monthly lifestyle (shopping, entertainment, personal care)?",
    skippable: true,
  },
  {
    id: "parentsGate",
    section: "Living costs",
    question: "Do you support your parents financially?",
  },
  {
    id: "parentsAmount",
    section: "Living costs",
    question: "How much do you send them each month?",
  },
  {
    id: "healthGate",
    section: "Protection",
    question: "Do you have health insurance?",
  },
  {
    id: "healthCover",
    section: "Protection",
    question: "Health cover amount and yearly premium?",
  },
  {
    id: "termGate",
    section: "Protection",
    question: "Do you have term life insurance?",
  },
  {
    id: "termCover",
    section: "Protection",
    question: "Term cover amount and yearly premium?",
  },
  {
    id: "emergencyCash",
    section: "Savings",
    question: "How much liquid cash / savings can you access quickly?",
    hint: "Savings account + liquid funds — your emergency buffer.",
    skippable: true,
  },
  {
    id: "monthlySip",
    section: "Savings",
    question: "How much do you invest via SIP each month?",
    skippable: true,
  },
  {
    id: "ownsHome",
    section: "Assets",
    question: "Do you own a home?",
  },
  {
    id: "ownsCar",
    section: "Assets",
    question: "Do you own a car?",
  },
  {
    id: "primaryGoal",
    section: "Goals",
    question: "What’s your #1 money goal right now?",
  },
  {
    id: "goalAmount",
    section: "Goals",
    question: "What target amount are you aiming for?",
    skippable: true,
  },
  {
    id: "review",
    section: "Review",
    question: "Here’s what I’ve captured — ready for your health check?",
  },
];

function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold transition ${
        active
          ? "border-[#534AB7] bg-[#EEEDFE] text-[#3C3489]"
          : "border-[#E8E6F0] bg-white text-[#111110] hover:border-[#AFA9EC]"
      }`}
    >
      {children}
    </button>
  );
}

function YesNo({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Chip active={value === true} onClick={() => onChange(true)}>
        Yes
      </Chip>
      <Chip active={value === false} onClick={() => onChange(false)}>
        No
      </Chip>
    </div>
  );
}

export default function AnalyseAdvisorModal({
  open,
  watch,
  setValue,
  getValues,
  onClose,
  onComplete,
  isSubmitting,
  submitError,
}: {
  open: boolean;
  watch: UseFormWatch<AnalyseFormValues>;
  setValue: UseFormSetValue<AnalyseFormValues>;
  getValues: UseFormGetValues<AnalyseFormValues>;
  onClose: () => void;
  onComplete: () => void;
  isSubmitting: boolean;
  submitError: string | null;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rentYes, setRentYes] = useState<boolean | null>(null);
  const [emiYes, setEmiYes] = useState<boolean | null>(null);
  const [ccYes, setCcYes] = useState<boolean | null>(null);
  const [parentsYes, setParentsYes] = useState<boolean | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const lifeStage = watch("lifeStage");
  const hasHealth = watch("hasHealthInsurance");
  const hasTerm = watch("hasTermInsurance");
  const ownsHome = watch("ownsHome");
  const ownsCar = watch("ownsCar");
  const primaryGoal = watch("primaryGoal");
  const monthlySalary = watch("monthlySalary");
  const selfAge = watch("selfAge");
  const cityTier = watch("cityTier");
  const numberOfKids = watch("numberOfKids");
  const rentAmount = watch("rentAmount");
  const creditCardBillMonthly = watch("creditCardBillMonthly");
  const parentsSupport = watch("parentsSupport");
  const healthCover = watch("healthInsuranceSumInsured");
  const healthPremium = watch("healthInsurancePremiumInput");
  const termCover = watch("termInsuranceSumAssured");
  const termPremium = watch("termInsurancePremiumInput");
  const foodTotal = watch("foodTotal");
  const transportTotal = watch("transportTotal");
  const utilityTotal = watch("utilityTotal");
  const lifestyleTotal = watch("lifestyleTotal");
  const savingsAccountBalance = watch("savingsAccountBalance");
  const liquidMFValue = watch("liquidMFValue");
  const monthlySIP = watch("monthlySIP");
  const spouseIncome = watch("spouseIncome");
  const otherIncome = watch("otherIncome");
  const unifiedLoans = watch("unifiedLoans");
  const kidsEducationFundTarget = watch("kidsEducationFundTarget");
  const homePurchaseTarget = watch("homePurchaseTarget");
  const retirementTargetCorpus = watch("retirementTargetCorpus");
  const emergencyFundTarget = watch("emergencyFundTarget");
  const carPurchaseTarget = watch("carPurchaseTarget");
  const healthRenewalMonth = watch("healthInsuranceRenewalMonth");
  const healthRenewalDay = watch("healthInsuranceRenewalDay");
  const termRenewalMonth = watch("termInsuranceRenewalMonth");
  const termRenewalDay = watch("termInsuranceRenewalDay");
  const homeLoanEMIDay = watch("homeLoanEMIDay");
  const creditCardBillDay = watch("creditCardBillDay");
  const sipAutoDebitDay = watch("sipAutoDebitDay");

  const steps = useMemo(() => {
    return BASE_STEPS.filter((s) => {
      if (s.id === "kidsCount" && lifeStage !== "kids") return false;
      if (
        s.id === "spouseIncome" &&
        (lifeStage === "bachelor" || lifeStage === "senior")
      )
        return false;
      if (s.id === "rentAmount" && rentYes !== true) return false;
      if (s.id === "emiAmount" && emiYes !== true) return false;
      if (s.id === "ccAmount" && ccYes !== true) return false;
      if (s.id === "parentsAmount" && parentsYes !== true) return false;
      if (s.id === "healthCover" && !hasHealth) return false;
      if (s.id === "termCover" && !hasTerm) return false;
      if (s.id === "goalAmount") {
        if (
          !primaryGoal ||
          primaryGoal === "clear_debt" ||
          primaryGoal === "grow_wealth" ||
          primaryGoal === "build_insurance_premium_fund"
        )
          return false;
      }
      return true;
    });
  }, [
    lifeStage,
    rentYes,
    emiYes,
    ccYes,
    parentsYes,
    hasHealth,
    hasTerm,
    primaryGoal,
  ]);

  const safeIndex = Math.min(stepIndex, Math.max(0, steps.length - 1));
  const current = steps[safeIndex] ?? steps[0];
  const progress = Math.round(((safeIndex + 1) / steps.length) * 100);

  useEffect(() => {
    if (!open) return;
    const unlock = lockBodyScroll();
    return () => {
      unlock();
      clearBodyScrollLocks();
    };
  }, [open]);

  useEffect(() => {
    // Keep index in range when conditional steps drop out.
    setStepIndex((i) => Math.min(i, Math.max(0, steps.length - 1)));
  }, [steps.length]);

  useEffect(() => {
    if (!open) return;
    // Seed Yes/No gates from existing cached values.
    const v = getValues();
    if (rentYes === null && (v.rentAmount ?? 0) > 0) setRentYes(true);
    if (emiYes === null && (v.unifiedLoans?.length ?? 0) > 0) setEmiYes(true);
    if (ccYes === null && (v.creditCardBillMonthly ?? 0) > 0) setCcYes(true);
    if (parentsYes === null && (v.parentsSupport ?? 0) > 0) setParentsYes(true);
  }, [open]);

  const setMoney = (name: FieldPath<AnalyseFormValues>, n: number) => {
    setValue(name, n as never, { shouldDirty: true, shouldValidate: false });
  };

  const validateCurrent = (): string | null => {
    switch (current.id) {
      case "lifeStage":
        return lifeStage ? null : "Pick one option to continue.";
      case "selfAge": {
        const age = Number(selfAge);
        if (!age || age < 18 || age > 80)
          return "Enter an age between 18 and 80.";
        return null;
      }
      case "cityTier":
        return cityTier ? null : "Pick your city type.";
      case "kidsCount": {
        const n = Number(numberOfKids);
        if (!n || n < 1 || n > 6) return "Enter kids between 1 and 6.";
        return null;
      }
      case "salary":
        return Number(monthlySalary) > 0
          ? null
          : "Enter your monthly take-home salary.";
      case "rentGate":
        return rentYes === null ? "Choose Yes or No." : null;
      case "rentAmount":
        return Number(rentAmount) > 0 ? null : "Enter monthly rent.";
      case "emiGate":
        return emiYes === null ? "Choose Yes or No." : null;
      case "emiAmount": {
        const emi = (unifiedLoans ?? []).reduce(
          (s, l) => s + Number(l.monthlyEMI ?? 0),
          0,
        );
        return emi > 0 ? null : "Enter total monthly EMI.";
      }
      case "ccGate":
        return ccYes === null ? "Choose Yes or No." : null;
      case "ccAmount":
        return Number(creditCardBillMonthly) > 0
          ? null
          : "Enter the monthly amount you pay.";
      case "parentsGate":
        return parentsYes === null ? "Choose Yes or No." : null;
      case "parentsAmount":
        return Number(parentsSupport) > 0 ? null : "Enter monthly support.";
      case "healthGate":
        return typeof hasHealth === "boolean" ? null : "Choose Yes or No.";
      case "healthCover":
        if (!(Number(healthCover) > 0)) return "Enter health cover amount.";
        if (!(Number(healthPremium) > 0)) return "Enter yearly premium.";
        return null;
      case "termGate":
        return typeof hasTerm === "boolean" ? null : "Choose Yes or No.";
      case "termCover":
        if (!(Number(termCover) > 0)) return "Enter term cover amount.";
        if (!(Number(termPremium) > 0)) return "Enter yearly premium.";
        return null;
      case "ownsHome":
        return typeof ownsHome === "boolean" ? null : "Choose Yes or No.";
      case "ownsCar":
        return typeof ownsCar === "boolean" ? null : "Choose Yes or No.";
      case "primaryGoal":
        return primaryGoal ? null : "Pick your primary goal.";
      default:
        return null;
    }
  };

  const goNext = () => {
    const err = validateCurrent();
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);

    if (current.id === "rentGate" && rentYes === false) {
      setMoney("rentAmount", 0);
      setMoney("rentMaintenanceMonthly", 0);
    }
    if (current.id === "emiGate" && emiYes === false) {
      setValue("unifiedLoans", [], { shouldDirty: true });
    }
    if (current.id === "ccGate" && ccYes === false) {
      setMoney("creditCardBillMonthly", 0);
    }
    if (current.id === "parentsGate" && parentsYes === false) {
      setMoney("parentsSupport", 0);
    }
    if (current.id === "healthGate" && !hasHealth) {
      setMoney("healthInsuranceSumInsured", 0);
      setMoney("healthInsurancePremiumInput", 0);
    }
    if (current.id === "termGate" && !hasTerm) {
      setMoney("termInsuranceSumAssured", 0);
      setMoney("termInsurancePremiumInput", 0);
    }
    if (current.id === "kidsCount") {
      const n = Math.max(1, Math.min(6, Number(numberOfKids) || 1));
      const ages = Array.from({ length: n }, (_, i) =>
        Number(getValues("kidsAges")?.[i] ?? 5),
      );
      const genders = Array.from(
        { length: n },
        (_, i) => getValues("kidsGenders")?.[i] ?? "boy",
      );
      setValue("numberOfKids", n, { shouldDirty: true });
      setValue("kidsAges", ages, { shouldDirty: true });
      setValue("kidsGenders", genders as AnalyseFormValues["kidsGenders"], {
        shouldDirty: true,
      });
    }
    if (current.id === "healthCover") {
      setValue("healthInsurancePremiumFrequency", "yearly", {
        shouldDirty: true,
      });
    }
    if (current.id === "termCover") {
      setValue("termInsurancePremiumFrequency", "yearly", {
        shouldDirty: true,
      });
    }

    if (safeIndex >= steps.length - 1) {
      onComplete();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const goBack = () => {
    setStepError(null);
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const skip = () => {
    setStepError(null);
    if (safeIndex >= steps.length - 1) return;
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const setEmiTotal = (total: number) => {
    const existing = getValues("unifiedLoans") ?? [];
    if (existing.length > 0) {
      const next = [...existing];
      next[0] = {
        ...next[0],
        id: next[0].id ?? newAnalyseRowId(),
        monthlyEMI: total,
      };
      setValue("unifiedLoans", next, { shouldDirty: true });
      return;
    }
    setValue(
      "unifiedLoans",
      [
        {
          id: newAnalyseRowId(),
          loanType: "personal_loan",
          lenderName: "",
          monthlyEMI: total,
          outstandingAmount: 0,
          interestRate: 0,
          remainingMonths: 0,
          odLimit: 0,
          odUsed: 0,
          odInterestOnlyYears: 0,
        },
      ],
      { shouldDirty: true },
    );
  };

  const emiTotal = (unifiedLoans ?? []).reduce(
    (s, l) => s + Number(l.monthlyEMI ?? 0),
    0,
  );
  const liquidTotal =
    Number(savingsAccountBalance ?? 0) + Number(liquidMFValue ?? 0);

  const goalTargetField = ((): FieldPath<AnalyseFormValues> | null => {
    switch (primaryGoal) {
      case "kids_education":
        return "kidsEducationFundTarget";
      case "buy_home":
        return "homePurchaseTarget";
      case "retire_early":
        return "retirementTargetCorpus";
      case "build_emergency_fund":
        return "emergencyFundTarget";
      case "buy_car":
        return "carPurchaseTarget";
      default:
        return null;
    }
  })();

  const goalTargetValue = (() => {
    switch (primaryGoal) {
      case "kids_education":
        return kidsEducationFundTarget;
      case "buy_home":
        return homePurchaseTarget;
      case "retire_early":
        return retirementTargetCorpus;
      case "build_emergency_fund":
        return emergencyFundTarget;
      case "buy_car":
        return carPurchaseTarget;
      default:
        return 0;
    }
  })();

  if (!open || !current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-900/60 p-4 py-8 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analyse-advisor-title"
    >
      <div className="my-auto flex max-h-[min(90dvh,52rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white p-4 shadow-xl sm:p-6">
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#534AB7]">
              Finkoin advisor
            </p>
            <h2
              id="analyse-advisor-title"
              className="text-lg font-semibold text-slate-900 sm:text-xl"
            >
              Guided money check
            </h2>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Step {safeIndex + 1} of {steps.length} · {current.section}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg p-2 text-[#534AB7] hover:bg-slate-100"
            aria-label="Close and edit full form"
            title="Edit full form"
          >
            <AppIcon name="close" size={16} color="#534AB7" />
          </button>
        </div>

        <div className="mt-3 h-2 w-full shrink-0 overflow-hidden rounded-full bg-[#EEEDFE]">
          <div
            className="h-full rounded-full bg-[#534AB7] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 shrink-0 text-right text-[11px] text-[#7A7871]">
          {progress}% complete
        </p>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          <p className="text-base font-semibold text-[#111110] sm:text-lg">
            {current.question}
          </p>
          {current.hint ? (
            <p className="mt-1.5 text-sm text-[#9B9A94]">{current.hint}</p>
          ) : null}

          <div className="mt-5 space-y-3">
            {current.id === "welcome" ? (
              <div className="rounded-2xl border border-[#E8E6F0] bg-[#F7F7F4] p-4 text-sm text-[#5F5E5A]">
                Have handy: salary, rent/EMI, insurance covers, and rough
                monthly spends. You can skip optional questions anytime.
              </div>
            ) : null}

            {current.id === "lifeStage" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {LIFE_STAGE_VALUES.map((v) => (
                  <Chip
                    key={v}
                    active={lifeStage === v}
                    onClick={() =>
                      setValue("lifeStage", v as LifeStage, {
                        shouldDirty: true,
                      })
                    }
                  >
                    {LIFE_STAGE_LABELS[v]}
                  </Chip>
                ))}
              </div>
            ) : null}

            {current.id === "selfAge" ? (
              <NumberInput
                value={Number(selfAge) || 0}
                onChange={(n) => setMoney("selfAge", n)}
                placeholder="e.g. 32"
                min={18}
                max={80}
                step={1}
              />
            ) : null}

            {current.id === "cityTier" ? (
              <div className="grid gap-2">
                {CITY_TIER_VALUES.map((v) => (
                  <Chip
                    key={v}
                    active={cityTier === v}
                    onClick={() =>
                      setValue("cityTier", v as CityTier, { shouldDirty: true })
                    }
                  >
                    {CITY_TIER_LABELS[v]}
                  </Chip>
                ))}
              </div>
            ) : null}

            {current.id === "kidsCount" ? (
              <NumberInput
                value={Number(numberOfKids) || 0}
                onChange={(n) => setMoney("numberOfKids", n)}
                placeholder="e.g. 2"
                min={1}
                max={6}
                step={1}
              />
            ) : null}

            {current.id === "salary" ? (
              <AdvisorMoney
                id="adv-salary"
                label="Monthly take-home"
                amount={Number(monthlySalary) || 0}
                onAmount={(n) => setMoney("monthlySalary", n)}
              />
            ) : null}
            {current.id === "spouseIncome" ? (
              <AdvisorMoney
                id="adv-spouse"
                label="Spouse take-home"
                amount={Number(spouseIncome) || 0}
                onAmount={(n) => setMoney("spouseIncome", n)}
                optional
              />
            ) : null}
            {current.id === "otherIncome" ? (
              <AdvisorMoney
                id="adv-other-inc"
                label="Other monthly income"
                amount={Number(otherIncome) || 0}
                onAmount={(n) => setMoney("otherIncome", n)}
                optional
              />
            ) : null}
            {current.id === "rentAmount" ? (
              <AdvisorMoney
                id="adv-rent"
                label="Monthly rent"
                amount={Number(rentAmount) || 0}
                onAmount={(n) => setMoney("rentAmount", n)}
              />
            ) : null}
            {current.id === "ccAmount" ? (
              <div className="space-y-1">
                <AdvisorMoney
                  id="adv-cc"
                  label="Monthly card payment"
                  amount={Number(creditCardBillMonthly) || 0}
                  onAmount={(n) => setMoney("creditCardBillMonthly", n)}
                />
                {(Number(creditCardBillMonthly) || 0) > 0 ? (
                  <DayOfMonthPicker
                    label="Bill due day (optional)"
                    value={creditCardBillDay || undefined}
                    onChange={(day) =>
                      setValue("creditCardBillDay", day, { shouldDirty: true })
                    }
                  />
                ) : null}
              </div>
            ) : null}
            {current.id === "food" ? (
              <AdvisorMoney
                id="adv-food"
                label="Food & groceries"
                amount={Number(foodTotal) || 0}
                onAmount={(n) => setMoney("foodTotal", n)}
                optional
              />
            ) : null}
            {current.id === "transport" ? (
              <AdvisorMoney
                id="adv-transport"
                label="Transport"
                amount={Number(transportTotal) || 0}
                onAmount={(n) => setMoney("transportTotal", n)}
                optional
              />
            ) : null}
            {current.id === "utilities" ? (
              <AdvisorMoney
                id="adv-util"
                label="Utilities"
                amount={Number(utilityTotal) || 0}
                onAmount={(n) => setMoney("utilityTotal", n)}
                optional
              />
            ) : null}
            {current.id === "lifestyle" ? (
              <AdvisorMoney
                id="adv-life"
                label="Lifestyle"
                amount={Number(lifestyleTotal) || 0}
                onAmount={(n) => setMoney("lifestyleTotal", n)}
                optional
              />
            ) : null}
            {current.id === "parentsAmount" ? (
              <AdvisorMoney
                id="adv-parents"
                label="Monthly support"
                amount={Number(parentsSupport) || 0}
                onAmount={(n) => setMoney("parentsSupport", n)}
              />
            ) : null}
            {current.id === "monthlySip" ? (
              <div className="space-y-1">
                <AdvisorMoney
                  id="adv-sip"
                  label="Monthly SIP"
                  amount={Number(monthlySIP) || 0}
                  onAmount={(n) => setMoney("monthlySIP", n)}
                  optional
                />
                {(Number(monthlySIP) || 0) > 0 ? (
                  <DayOfMonthPicker
                    label="SIP auto-debit day (optional)"
                    value={sipAutoDebitDay || undefined}
                    onChange={(day) =>
                      setValue("sipAutoDebitDay", day, { shouldDirty: true })
                    }
                    hint="We’ll remind you before the debit"
                  />
                ) : null}
              </div>
            ) : null}

            {current.id === "emiAmount" ? (
              <div className="space-y-1">
                <AdvisorMoney
                  id="adv-emi"
                  label="Total EMIs / month"
                  amount={emiTotal}
                  onAmount={setEmiTotal}
                />
                {emiTotal > 0 ? (
                  <DayOfMonthPicker
                    label="Typical EMI debit day (optional)"
                    value={homeLoanEMIDay || undefined}
                    onChange={(day) =>
                      setValue("homeLoanEMIDay", day, { shouldDirty: true })
                    }
                    hint="Used for calendar reminders"
                  />
                ) : null}
              </div>
            ) : null}

            {current.id === "emergencyCash" ? (
              <div className="space-y-1">
                <AdvisorMoney
                  id="adv-savings"
                  label="Savings account"
                  amount={Number(savingsAccountBalance) || 0}
                  onAmount={(n) => setMoney("savingsAccountBalance", n)}
                  optional
                />
                <AdvisorMoney
                  id="adv-liquid"
                  label="Liquid mutual funds"
                  amount={Number(liquidMFValue) || 0}
                  onAmount={(n) => setMoney("liquidMFValue", n)}
                  optional
                />
              </div>
            ) : null}

            {current.id === "rentGate" ? (
              <YesNo value={rentYes} onChange={setRentYes} />
            ) : null}
            {current.id === "emiGate" ? (
              <YesNo value={emiYes} onChange={setEmiYes} />
            ) : null}
            {current.id === "ccGate" ? (
              <YesNo value={ccYes} onChange={setCcYes} />
            ) : null}
            {current.id === "parentsGate" ? (
              <YesNo value={parentsYes} onChange={setParentsYes} />
            ) : null}

            {current.id === "healthGate" ? (
              <YesNo
                value={typeof hasHealth === "boolean" ? hasHealth : null}
                onChange={(v) =>
                  setValue("hasHealthInsurance", v, { shouldDirty: true })
                }
              />
            ) : null}
            {current.id === "termGate" ? (
              <YesNo
                value={typeof hasTerm === "boolean" ? hasTerm : null}
                onChange={(v) =>
                  setValue("hasTermInsurance", v, { shouldDirty: true })
                }
              />
            ) : null}
            {current.id === "ownsHome" ? (
              <YesNo
                value={typeof ownsHome === "boolean" ? ownsHome : null}
                onChange={(v) => setValue("ownsHome", v, { shouldDirty: true })}
              />
            ) : null}
            {current.id === "ownsCar" ? (
              <YesNo
                value={typeof ownsCar === "boolean" ? ownsCar : null}
                onChange={(v) => setValue("ownsCar", v, { shouldDirty: true })}
              />
            ) : null}

            {current.id === "healthCover" || current.id === "termCover" ? (
              <div className="space-y-1">
                <AdvisorMoney
                  id={
                    current.id === "healthCover"
                      ? "adv-health-cover"
                      : "adv-term-cover"
                  }
                  label="Cover amount"
                  amount={
                    current.id === "healthCover"
                      ? Number(healthCover) || 0
                      : Number(termCover) || 0
                  }
                  onAmount={(n) =>
                    setMoney(
                      current.id === "healthCover"
                        ? "healthInsuranceSumInsured"
                        : "termInsuranceSumAssured",
                      n,
                    )
                  }
                />
                <AdvisorMoney
                  id={
                    current.id === "healthCover"
                      ? "adv-health-prem"
                      : "adv-term-prem"
                  }
                  label="Yearly premium"
                  amount={
                    current.id === "healthCover"
                      ? Number(healthPremium) || 0
                      : Number(termPremium) || 0
                  }
                  onAmount={(n) =>
                    setMoney(
                      current.id === "healthCover"
                        ? "healthInsurancePremiumInput"
                        : "termInsurancePremiumInput",
                      n,
                    )
                  }
                />
                {current.id === "healthCover" &&
                (Number(healthPremium) || 0) > 0 ? (
                  <MonthDaySelects
                    label="When is your health insurance renewal? (optional)"
                    month={healthRenewalMonth || undefined}
                    day={healthRenewalDay || undefined}
                    onMonth={(m) =>
                      setValue("healthInsuranceRenewalMonth", m, {
                        shouldDirty: true,
                      })
                    }
                    onDay={(d) =>
                      setValue("healthInsuranceRenewalDay", d, {
                        shouldDirty: true,
                      })
                    }
                    hint="We’ll remind you before renewal"
                  />
                ) : null}
                {current.id === "termCover" &&
                (Number(termPremium) || 0) > 0 ? (
                  <MonthDaySelects
                    label="When is your term insurance renewal? (optional)"
                    month={termRenewalMonth || undefined}
                    day={termRenewalDay || undefined}
                    onMonth={(m) =>
                      setValue("termInsuranceRenewalMonth", m, {
                        shouldDirty: true,
                      })
                    }
                    onDay={(d) =>
                      setValue("termInsuranceRenewalDay", d, {
                        shouldDirty: true,
                      })
                    }
                    hint="We’ll remind you before renewal"
                  />
                ) : null}
              </div>
            ) : null}

            {current.id === "primaryGoal" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {PRIMARY_GOAL_VALUES.map((v) => (
                  <Chip
                    key={v}
                    active={primaryGoal === v}
                    onClick={() =>
                      setValue("primaryGoal", v as PrimaryGoal, {
                        shouldDirty: true,
                      })
                    }
                  >
                    {PRIMARY_GOAL_LABELS[v]}
                  </Chip>
                ))}
              </div>
            ) : null}

            {current.id === "goalAmount" && goalTargetField ? (
              <AdvisorMoney
                id="adv-goal-amt"
                label="Target amount"
                amount={Number(goalTargetValue) || 0}
                onAmount={(n) => setMoney(goalTargetField, n)}
                optional
              />
            ) : null}

            {current.id === "review" ? (
              <div className="space-y-2 rounded-2xl border border-[#E8E6F0] bg-[#F7F7F4] p-4 text-sm text-[#5F5E5A]">
                <p>
                  <span className="font-semibold text-[#111110]">Profile:</span>{" "}
                  {lifeStage ? LIFE_STAGE_LABELS[lifeStage as LifeStage] : "—"}
                  {selfAge ? ` · ${selfAge} yrs` : ""}
                </p>
                <p>
                  <span className="font-semibold text-[#111110]">Salary:</span>{" "}
                  ₹{formatIndian(Math.round(Number(monthlySalary) || 0))}/mo
                </p>
                <p>
                  <span className="font-semibold text-[#111110]">
                    Liquid buffer:
                  </span>{" "}
                  ₹{formatIndian(Math.round(liquidTotal))}
                </p>
                <p>
                  <span className="font-semibold text-[#111110]">Goal:</span>{" "}
                  {primaryGoal
                    ? PRIMARY_GOAL_LABELS[primaryGoal as PrimaryGoal]
                    : "Grow wealth"}
                </p>
                <p className="pt-1 text-xs text-[#9B9A94]">
                  Want more detail? Close and use Edit full form anytime — your
                  answers are already saved.
                </p>
              </div>
            ) : null}
          </div>

          {stepError ? (
            <p className="mt-3 text-sm font-medium text-[#E24B4A]">
              {stepError}
            </p>
          ) : null}
          {submitError ? (
            <p className="mt-3 text-sm font-medium text-[#E24B4A]">
              {submitError}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#F0EFF8] pt-4">
          <button
            type="button"
            onClick={goBack}
            disabled={safeIndex === 0 || isSubmitting}
            className="min-h-[44px] rounded-xl px-4 text-sm font-semibold text-[#534AB7] disabled:opacity-40"
          >
            Back
          </button>
          <div className="flex flex-wrap gap-2">
            {current.skippable && current.id !== "review" ? (
              <button
                type="button"
                onClick={skip}
                disabled={isSubmitting}
                className="min-h-[44px] rounded-xl border border-[#E8E6F0] px-4 text-sm font-semibold text-[#5F5E5A]"
              >
                Skip
              </button>
            ) : null}
            <button
              type="button"
              onClick={goNext}
              disabled={isSubmitting}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#534AB7] px-5 text-sm font-bold text-white disabled:opacity-70"
            >
              {isSubmitting ? (
                <BrandPageLoader bare size="xs" label="" />
              ) : current.id === "review" ? (
                "See my health check →"
              ) : current.id === "welcome" ? (
                "Let’s begin"
              ) : (
                "Continue"
              )}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-2 shrink-0 text-center text-xs font-medium text-[#9B9A94] underline-offset-2 hover:underline"
        >
          Prefer the full form instead?
        </button>
      </div>
    </div>
  );
}
