import { z } from "zod";

export const LIFE_STAGE_VALUES = [
  "single_bachelor",
  "married_no_kids",
  "married_with_kids",
  "pre_retirement_50_plus",
] as const;

export type LifeStage = (typeof LIFE_STAGE_VALUES)[number];

export const LIFE_STAGE_LABELS: Record<LifeStage, string> = {
  single_bachelor: "Single / bachelor",
  married_no_kids: "Married, no kids",
  married_with_kids: "Married with kids",
  pre_retirement_50_plus: "Pre-retirement (50+)",
};

export const CITY_VALUES = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Chennai",
  "Hyderabad",
  "Pune",
  "Tier 2 city",
  "Tier 3 city",
] as const;

export type CityOption = (typeof CITY_VALUES)[number];

export const PRIMARY_GOAL_VALUES = [
  "buy_home",
  "clear_debt",
  "retire_early",
  "grow_wealth",
  "kids_education",
] as const;

export type PrimaryGoal = (typeof PRIMARY_GOAL_VALUES)[number];

export const PRIMARY_GOAL_LABELS: Record<PrimaryGoal, string> = {
  buy_home: "Buy a home",
  clear_debt: "Clear all debt",
  retire_early: "Retire early",
  grow_wealth: "Grow wealth",
  kids_education: "Kids education fund",
};

export function parseMoneyInput(val: unknown): number | undefined {
  if (val === "" || val === null || val === undefined) return undefined;
  if (typeof val === "number") {
    return Number.isFinite(val) ? val : undefined;
  }
  if (typeof val !== "string") return undefined;

  const normalized = val.replace(/[,\s₹]/g, "").trim();
  if (!normalized) return undefined;

  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

const optionalMoney = z.preprocess(
  parseMoneyInput,
  z
    .number()
    .min(0, "Cannot be negative")
    .optional(),
);

export const step1Schema = z.object({
  lifeStage: z.enum(LIFE_STAGE_VALUES, {
    required_error: "Select your life stage",
  }),
});

export const step2Schema = z.object({
  monthlySalary: z.preprocess(
    parseMoneyInput,
    z
      .number({
        required_error: "Enter your monthly take-home salary",
        invalid_type_error: "Enter your monthly take-home salary",
      })
      .positive("Enter a valid salary amount"),
  ),
  spouseIncome: optionalMoney,
  otherIncome: optionalMoney,
  city: z.custom<CityOption>(
    (val) => typeof val === "string" && CITY_VALUES.includes(val as CityOption),
    { message: "Select your city" },
  ),
});

export const step3Schema = z.object({
  rentOrHomeLoanEmi: optionalMoney,
  otherLoanEmis: optionalMoney,
  foodGroceries: optionalMoney,
  transport: optionalMoney,
  utilities: optionalMoney,
  entertainmentDiningShopping: optionalMoney,
  insurancePremiumsMonthly: optionalMoney,
  kidsExpenses: optionalMoney,
  parentsFamilySupport: optionalMoney,
});

export const step4Schema = z.object({
  monthlySavingsOrSip: z.preprocess(
    parseMoneyInput,
    z
      .number({
        required_error: "Enter amount",
        invalid_type_error: "Enter amount",
      })
      .min(0, "Cannot be negative"),
  ),
  emergencyFundSaved: z.preprocess(
    parseMoneyInput,
    z
      .number({
        required_error: "Enter amount",
        invalid_type_error: "Enter amount",
      })
      .min(0, "Cannot be negative"),
  ),
  totalDebtOutstanding: z.preprocess(
    parseMoneyInput,
    z
      .number({
        required_error: "Enter amount",
        invalid_type_error: "Enter amount",
      })
      .min(0, "Cannot be negative"),
  ),
  primaryGoal: z.custom<PrimaryGoal>(
    (val) =>
      typeof val === "string" &&
      PRIMARY_GOAL_VALUES.includes(val as PrimaryGoal),
    { message: "Choose a primary goal" },
  ),
});

export const fullAnalyseSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema);

export type AnalyseFormValues = z.infer<typeof fullAnalyseSchema>;

/** RHF defaults — merge with `useFinancialStore` snapshot on mount */
export const analyseDefaultValues: Partial<AnalyseFormValues> = {};
