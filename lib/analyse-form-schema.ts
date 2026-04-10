import { z } from "zod";

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

export const ADDITIONAL_OBLIGATION_TYPE_VALUES = [
  "PF Loan",
  "Overdraft (OD)",
  "Credit Card minimum due",
  "Other",
] as const;

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
  /** Typical monthly payment toward credit cards (full pay-off or rolling balance). */
  creditCardBillMonthly?: number;
  additionalObligations: Array<{
    type: string;
    lender?: string;
    monthlyAmount: number;
  }>;

  vegetables: number;
  grocery: number;
  medicine: number;
  fuel: number;
  cabMetro: number;
  electricity: number;
  internet: number;
  gas: number;
  water?: number;
  houseHelpMonthly?: number;
  cookHelpMonthly?: number;
  entertainment: number;
  shopping: number;
  personalCare?: number;
  kidsSchoolFees?: number;
  kidsActivities?: number;
  parentsSupport?: number;
  parentsHealthInsuranceSumInsured?: number;
  parentsEmergencyCash?: number;
  parentsCity?: "metro" | "tier2" | "tier3";

  hasHealthInsurance: boolean;
  healthInsuranceSumInsured?: number;
  healthInsurancePremiumMonthly?: number;
  hasTermInsurance: boolean;
  termInsuranceSumAssured?: number;
  termInsurancePremiumMonthly?: number;
  carInsurancePremiumMonthly?: number;
  bikeInsurancePremiumMonthly?: number;
  otherInsurancePremiumMonthly?: number;

  savingsAccountBalance: number;
  fdValue?: number;
  liquidMFValue?: number;
  emergencyFundCurrent: number;
  mfValue?: number;
  indianStocksValue?: number;
  usStocksValueINR?: number;
  usMFValueINR?: number;
  rsuValueINR?: number;
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
  monthlySIP: number;
  monthlyRD?: number;
  monthlyPPFContribution?: number;
  monthlyNPSContribution?: number;
  monthlyEPFContribution: number;
  ssy?: number;
  nscMonthly?: number;
  /** When false, NSC is hidden in the form and not scored in the safety net. */
  investsInNsc?: boolean;

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
}

export type AdditionalObligation = FinancialProfile["additionalObligations"][number];

export type AnalyseFormValues = Omit<FinancialProfile, "kidsAges"> & {
  kidsAges?: Array<number | undefined>;
  healthInsurancePremiumInput?: number;
  healthInsurancePremiumFrequency?: PremiumFrequency;
  termInsurancePremiumInput?: number;
  termInsurancePremiumFrequency?: PremiumFrequency;
  carInsurancePremiumInput?: number;
  carInsurancePremiumFrequency?: PremiumFrequency;
  bikeInsurancePremiumInput?: number;
  bikeInsurancePremiumFrequency?: PremiumFrequency;
  hasOtherInsurance?: boolean;
  otherInsurancePremiumInput?: number;
  otherInsurancePremiumFrequency?: PremiumFrequency;
  otherInsurancePolicies?: Array<{
    policyName?: string;
    premiumInput?: number;
    frequency?: PremiumFrequency;
  }>;
  otherAssetLabel?: string;
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

const optionalWholeNumber = z.preprocess(
  parseMoneyInput,
  z.number().int("Enter a whole number").min(0, "Cannot be negative").optional(),
);

const premiumFrequencySchema = z.enum(PREMIUM_FREQUENCY_VALUES);

const additionalObligationSchema = z.object({
  type: z.string().min(1, "Select an obligation type"),
  lender: z.string().optional(),
  monthlyAmount: requiredPositiveMoney("Enter the monthly payment amount"),
});

const otherInsurancePolicySchema = z.object({
  policyName: z.string().optional(),
  premiumInput: optionalMoney,
  frequency: premiumFrequencySchema.default("monthly"),
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
    spouseAge: optionalWholeNumber,
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
    creditCardBillMonthly: optionalMoney,
    additionalObligations: z.array(additionalObligationSchema).max(6),

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
    hasTermInsurance: z.boolean(),
    termInsuranceSumAssured: optionalMoney,
    termInsurancePremiumInput: optionalMoney,
    termInsurancePremiumFrequency: premiumFrequencySchema.default("monthly"),
    carInsurancePremiumInput: optionalMoney,
    carInsurancePremiumFrequency: premiumFrequencySchema.default("monthly"),
    bikeInsurancePremiumInput: optionalMoney,
    bikeInsurancePremiumFrequency: premiumFrequencySchema.default("monthly"),
    hasOtherInsurance: z.boolean().default(false),
    otherInsurancePremiumInput: optionalMoney,
    otherInsurancePremiumFrequency: premiumFrequencySchema.default("monthly"),
    otherInsurancePolicies: z.array(otherInsurancePolicySchema).max(6).default([]),

    savingsAccountBalance: optionalMoney,
    fdValue: optionalMoney,
    liquidMFValue: optionalMoney,
    emergencyFundCurrent: optionalMoney,
    mfValue: optionalMoney,
    indianStocksValue: optionalMoney,
    usStocksValueINR: optionalMoney,
    usMFValueINR: optionalMoney,
    rsuValueINR: optionalMoney,
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
    nscMonthly: optionalMoney,
    investsInNsc: z.boolean().optional().default(false),

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

    healthInsurancePremiumMonthly: optionalMoney,
    termInsurancePremiumMonthly: optionalMoney,
    carInsurancePremiumMonthly: optionalMoney,
    bikeInsurancePremiumMonthly: optionalMoney,
    otherInsurancePremiumMonthly: optionalMoney,
  } satisfies z.ZodRawShape;

const baseFormSchema = z.object(formShape);

const formSchema = baseFormSchema
  .superRefine((data, ctx) => {
    if (data.lifeStage !== "bachelor" && !data.spouseAge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["spouseAge"],
        message: "Enter spouse age",
      });
    }

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

    if (data.hasOtherInsurance && !data.otherInsurancePremiumInput) {
      const validRows =
        data.otherInsurancePolicies?.filter((row) => row.premiumInput !== undefined) ?? [];
      if (validRows.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["otherInsurancePolicies"],
          message: "Add at least one other insurance premium",
        });
      }
      data.otherInsurancePolicies?.forEach((row, index) => {
        if (row.premiumInput === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["otherInsurancePolicies", index, "premiumInput"],
            message: "Enter premium amount",
          });
        }
      });
    }

    if (data.ownsHome) {
      if (!data.homeMarketValue && data.homeMarketValue !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["homeMarketValue"],
          message: "Enter current home market value",
        });
      }
      if (
        !data.homeLoanOutstanding &&
        data.homeLoanOutstanding !== 0
      ) {
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

    if (data.lifeStage === "kids" && data.kidsEducationFundTarget === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["kidsEducationFundTarget"],
        message: "Enter kids education fund target",
      });
    }
  });

export const step1Schema = baseFormSchema.pick({
  lifeStage: true,
  selfAge: true,
  spouseAge: true,
  numberOfKids: true,
  kidsAges: true,
  kidsGenders: true,
  cityTier: true,
}).superRefine((data, ctx) => {
  if (data.lifeStage !== "bachelor" && !data.spouseAge) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["spouseAge"],
      message: "Enter spouse age",
    });
  }

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
  creditCardBillMonthly: true,
  additionalObligations: true,
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
  kidsSchoolFees: true,
  kidsActivities: true,
  parentsSupport: true,
  parentsHealthInsuranceSumInsured: true,
  parentsEmergencyCash: true,
  parentsCity: true,
});

export const step5Schema = baseFormSchema.pick({
  hasHealthInsurance: true,
  healthInsuranceSumInsured: true,
  healthInsurancePremiumInput: true,
  healthInsurancePremiumFrequency: true,
  hasTermInsurance: true,
  termInsuranceSumAssured: true,
  termInsurancePremiumInput: true,
  termInsurancePremiumFrequency: true,
  carInsurancePremiumInput: true,
  carInsurancePremiumFrequency: true,
  bikeInsurancePremiumInput: true,
  bikeInsurancePremiumFrequency: true,
  hasOtherInsurance: true,
  otherInsurancePremiumInput: true,
  otherInsurancePremiumFrequency: true,
  otherInsurancePolicies: true,
}).superRefine((data, ctx) => {
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

  if (data.hasOtherInsurance && !data.otherInsurancePremiumInput) {
    const validRows =
      data.otherInsurancePolicies?.filter((row) => row.premiumInput !== undefined) ?? [];
    if (validRows.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherInsurancePolicies"],
        message: "Add at least one other insurance premium",
      });
    }
    data.otherInsurancePolicies?.forEach((row, index) => {
      if (row.premiumInput === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["otherInsurancePolicies", index, "premiumInput"],
          message: "Enter premium amount",
        });
      }
    });
  }
});

export const step6Schema = baseFormSchema.pick({
  savingsAccountBalance: true,
  fdValue: true,
  liquidMFValue: true,
  emergencyFundCurrent: true,
  mfValue: true,
  indianStocksValue: true,
  usStocksValueINR: true,
  usMFValueINR: true,
  rsuValueINR: true,
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
  nscMonthly: true,
  investsInNsc: true,
  bereavementFund: true,
}).superRefine((data, ctx) => {
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

export const step7Schema = baseFormSchema.pick({
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
}).superRefine((data, ctx) => {
  if (data.lifeStage === "kids" && data.kidsEducationFundTarget === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["kidsEducationFundTarget"],
      message: "Enter kids education fund target",
    });
  }
});

export const fullAnalyseSchema = formSchema;

export function toMonthlyEquivalent(
  amount: number | undefined,
  frequency: PremiumFrequency | undefined,
): number | undefined {
  if (amount === undefined) return undefined;
  if (frequency === "yearly") return amount / 12;
  return amount;
}

export function normalizeAnalyseFormValues(data: Partial<AnalyseFormValues>): FinancialProfile {
  return {
    lifeStage: data.lifeStage ?? "bachelor",
    selfAge: data.selfAge ?? 18,
    spouseAge: data.lifeStage === "bachelor" ? undefined : data.spouseAge,
    numberOfKids: data.lifeStage === "kids" ? data.numberOfKids : undefined,
    kidsAges:
      data.lifeStage === "kids"
        ? (data.kidsAges ?? []).slice(0, data.numberOfKids ?? 0).filter((v): v is number => v !== undefined)
        : undefined,
    kidsGenders:
      data.lifeStage === "kids"
        ? (data.kidsGenders ?? []).slice(0, data.numberOfKids ?? 0)
        : undefined,
    cityTier: data.cityTier ?? "metro",

    monthlySalary: data.monthlySalary ?? 0,
    spouseIncome: data.spouseIncome,
    otherIncome: data.otherIncome,

    rentAmount: data.rentAmount ?? 0,
    rentMaintenanceMonthly: data.rentMaintenanceMonthly,
    homeLoanEMI: data.homeLoanEMI ?? 0,
    secondPropertyEMI: data.secondPropertyEMI ?? 0,
    carLoanEMI: data.carLoanEMI,
    bikeEMI: data.bikeEMI,
    personalLoanEMI: data.personalLoanEMI,
    creditCardBillMonthly: data.creditCardBillMonthly,
    additionalObligations: data.additionalObligations ?? [],

    vegetables: data.vegetables ?? 0,
    grocery: data.grocery ?? 0,
    medicine: data.medicine ?? 0,
    fuel: data.fuel ?? 0,
    cabMetro: data.cabMetro ?? 0,
    electricity: data.electricity ?? 0,
    internet: data.internet ?? 0,
    gas: data.gas ?? 0,
    water: data.water,
    houseHelpMonthly: data.houseHelpMonthly,
    cookHelpMonthly: data.cookHelpMonthly,
    entertainment: data.entertainment ?? 0,
    shopping: data.shopping ?? 0,
    personalCare: data.personalCare,
    kidsSchoolFees: data.lifeStage === "kids" ? data.kidsSchoolFees : undefined,
    kidsActivities: data.lifeStage === "kids" ? data.kidsActivities : undefined,
    parentsSupport: data.parentsSupport,
    parentsHealthInsuranceSumInsured:
      (data.parentsSupport ?? 0) > 0 ? data.parentsHealthInsuranceSumInsured : undefined,
    parentsEmergencyCash:
      (data.parentsSupport ?? 0) > 0 ? data.parentsEmergencyCash : undefined,
    parentsCity: (data.parentsSupport ?? 0) > 0 ? data.parentsCity : undefined,

    hasHealthInsurance: data.hasHealthInsurance ?? false,
    healthInsuranceSumInsured: data.hasHealthInsurance
      ? data.healthInsuranceSumInsured
      : undefined,
    healthInsurancePremiumMonthly: data.hasHealthInsurance
      ? toMonthlyEquivalent(
          data.healthInsurancePremiumInput,
          data.healthInsurancePremiumFrequency,
        )
      : undefined,
    hasTermInsurance: data.hasTermInsurance ?? false,
    termInsuranceSumAssured: data.hasTermInsurance
      ? data.termInsuranceSumAssured
      : undefined,
    termInsurancePremiumMonthly: data.hasTermInsurance
      ? toMonthlyEquivalent(
          data.termInsurancePremiumInput,
          data.termInsurancePremiumFrequency,
        )
      : undefined,
    carInsurancePremiumMonthly: toMonthlyEquivalent(
      data.carInsurancePremiumInput,
      data.carInsurancePremiumFrequency,
    ),
    bikeInsurancePremiumMonthly: toMonthlyEquivalent(
      data.bikeInsurancePremiumInput,
      data.bikeInsurancePremiumFrequency,
    ),
    otherInsurancePremiumMonthly: data.hasOtherInsurance
      ? (data.otherInsurancePolicies ?? []).reduce((total, row) => {
          return total + (toMonthlyEquivalent(row.premiumInput, row.frequency) ?? 0);
        }, 0)
      : undefined,

    savingsAccountBalance: data.savingsAccountBalance ?? 0,
    fdValue: data.fdValue,
    liquidMFValue: data.liquidMFValue,
    emergencyFundCurrent: data.emergencyFundCurrent ?? 0,
    mfValue: data.mfValue,
    indianStocksValue: data.indianStocksValue,
    usStocksValueINR: data.usStocksValueINR,
    usMFValueINR: data.usMFValueINR,
    rsuValueINR: data.rsuValueINR,
    ppfBalance: data.ppfBalance,
    npsBalance: data.npsBalance,
    epfBalance: data.epfBalance,
    ownsHome: data.ownsHome ?? false,
    homeMarketValue: data.ownsHome ? data.homeMarketValue : undefined,
    homeLoanOutstanding: data.ownsHome ? data.homeLoanOutstanding : undefined,
    ownsCar: data.ownsCar ?? false,
    carMarketValue: data.ownsCar ? data.carMarketValue : undefined,
    carLoanOutstanding: data.ownsCar ? data.carLoanOutstanding : undefined,
    goldValue: data.goldValue,
    otherAssets: data.otherAssets,
    monthlySIP: data.monthlySIP ?? 0,
    monthlyRD: data.monthlyRD,
    monthlyPPFContribution: data.monthlyPPFContribution,
    monthlyNPSContribution: data.monthlyNPSContribution,
    monthlyEPFContribution: data.monthlyEPFContribution ?? 0,
    ssy: data.ssy,
    nscMonthly: data.investsInNsc ? data.nscMonthly : 0,
    investsInNsc: data.investsInNsc ?? false,

    primaryGoal: data.primaryGoal ?? "",
    retirementTargetCorpus: data.retirementTargetCorpus,
    retirementAge: data.retirementAge,
    kidsEducationFundTarget:
      data.lifeStage === "kids" ? data.kidsEducationFundTarget : undefined,
    kidsMarriageFundTarget:
      data.lifeStage === "kids" ? data.kidsMarriageFundTarget : undefined,
    emergencyFundTarget: data.emergencyFundTarget,
    medicalEmergencyFund: data.medicalEmergencyFund,
    bereavementFund: data.bereavementFund,
    homePurchaseTarget:
      (data.rentAmount ?? 0) > 0 ? data.homePurchaseTarget : undefined,
    homePurchaseYear:
      (data.rentAmount ?? 0) > 0 ? data.homePurchaseYear : undefined,
    carPurchaseTarget: data.ownsCar ? undefined : data.carPurchaseTarget,
    carPurchaseYear: data.ownsCar ? undefined : data.carPurchaseYear,
  };
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
  rentAmount: 0,
  rentMaintenanceMonthly: 0,
  homeLoanEMI: 0,
  secondPropertyEMI: 0,
  carLoanEMI: 0,
  bikeEMI: 0,
  personalLoanEMI: 0,
  creditCardBillMonthly: 0,
  hasHealthInsurance: false,
  healthInsuranceSumInsured: 0,
  healthInsurancePremiumInput: 0,
  healthInsurancePremiumFrequency: "monthly",
  hasTermInsurance: false,
  termInsuranceSumAssured: 0,
  termInsurancePremiumInput: 0,
  termInsurancePremiumFrequency: "monthly",
  carInsurancePremiumInput: 0,
  carInsurancePremiumFrequency: "monthly",
  bikeInsurancePremiumInput: 0,
  bikeInsurancePremiumFrequency: "monthly",
  hasOtherInsurance: false,
  otherInsurancePremiumInput: 0,
  otherInsurancePremiumFrequency: "monthly",
  otherInsurancePolicies: [],
  ownsHome: false,
  homeMarketValue: 0,
  homeLoanOutstanding: 0,
  ownsCar: false,
  carMarketValue: 0,
  carLoanOutstanding: 0,
  goldValue: 0,
  otherAssets: 0,
  retirementAge: 0,
  monthlySIP: 0,
  monthlyRD: 0,
  monthlyPPFContribution: 0,
  monthlyNPSContribution: 0,
  monthlyEPFContribution: 0,
  ssy: 0,
  nscMonthly: 0,
  investsInNsc: false,
  savingsAccountBalance: 0,
  fdValue: 0,
  liquidMFValue: 0,
  emergencyFundCurrent: 0,
  mfValue: 0,
  indianStocksValue: 0,
  usStocksValueINR: 0,
  usMFValueINR: 0,
  rsuValueINR: 0,
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
