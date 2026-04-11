import { z } from "zod";

/** Stable id for obligation / other-insurance field-array rows (persisted in profile + drafts). */
export function newAnalyseRowId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
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
  /** Optional: current principal / outstanding on the personal loan. EMI-only users can leave this unset. */
  personalLoanOutstanding?: number;
  /** Typical monthly payment toward credit cards (full pay-off or rolling balance). */
  creditCardBillMonthly?: number;
  additionalObligations: Array<{
    id?: string;
    type: string;
    lenderName?: string;
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
  /** Monthly equivalent for engine / allocations (derived from input + frequency). */
  healthInsurancePremiumMonthly?: number;
  /** Raw premium as entered (e.g. yearly amount stays yearly in the wizard). */
  healthInsurancePremiumInput?: number;
  healthInsurancePremiumFrequency?: PremiumFrequency;
  hasTermInsurance: boolean;
  termInsuranceSumAssured?: number;
  termInsurancePremiumMonthly?: number;
  termInsurancePremiumInput?: number;
  termInsurancePremiumFrequency?: PremiumFrequency;
  carInsurancePremiumMonthly?: number;
  carInsurancePremiumInput?: number;
  carInsurancePremiumFrequency?: PremiumFrequency;
  bikeInsurancePremiumMonthly?: number;
  bikeInsurancePremiumInput?: number;
  bikeInsurancePremiumFrequency?: PremiumFrequency;
  otherInsurancePremiumMonthly?: number;
  otherInsurancePremiumInput?: number;
  otherInsurancePremiumFrequency?: PremiumFrequency;
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
  }>;

  savingsAccountBalance: number;
  fdValue?: number;
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
  id: z.string().optional(),
  type: z.string().min(1, "Select an obligation type"),
  lenderName: z.string().optional(),
  monthlyAmount: requiredPositiveMoney("Enter the monthly payment amount"),
});

const otherInsurancePremiumSchema = z.object({
  id: z.string().optional(),
  policyName: z.string().optional(),
  premiumAmount: optionalMoney,
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
    personalLoanOutstanding: optionalMoney,
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
    otherInsurancePremiums: z.array(otherInsurancePremiumSchema).max(6).default([]),

    savingsAccountBalance: optionalMoney,
    fdValue: optionalMoney,
    liquidMFValue: optionalMoney,
    emergencyFundCurrent: optionalMoney,
    otherLiquidSavings: optionalMoney,
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
    nscDepositAmount: optionalMoney,
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
        data.otherInsurancePremiums?.filter((row) => row.premiumAmount !== undefined) ?? [];
      if (validRows.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["otherInsurancePremiums"],
          message: "Add at least one other insurance premium",
        });
      }
      data.otherInsurancePremiums?.forEach((row, index) => {
        if (row.premiumAmount === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["otherInsurancePremiums", index, "premiumAmount"],
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
  personalLoanOutstanding: true,
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
  otherInsurancePremiums: true,
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
      data.otherInsurancePremiums?.filter((row) => row.premiumAmount !== undefined) ?? [];
    if (validRows.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherInsurancePremiums"],
        message: "Add at least one other insurance premium",
      });
    }
    data.otherInsurancePremiums?.forEach((row, index) => {
      if (row.premiumAmount === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["otherInsurancePremiums", index, "premiumAmount"],
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
  otherLiquidSavings: true,
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
  nscDepositAmount: true,
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
    if (profile.termInsurancePremiumInput != null && profile.termInsurancePremiumInput > 0) {
      partial.termInsurancePremiumInput = profile.termInsurancePremiumInput;
      partial.termInsurancePremiumFrequency = profile.termInsurancePremiumFrequency ?? "monthly";
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
  if (draftObl.length === 0 && (profile.additionalObligations?.length ?? 0) > 0) {
    next.additionalObligations = profile.additionalObligations.map((o) => ({
      id: o.id ?? newAnalyseRowId(),
      type: o.type,
      lenderName:
        o.lenderName ?? (o as { lender?: string }).lender ?? "",
      monthlyAmount: o.monthlyAmount,
    }));
  }
  const draftPol = next.otherInsurancePremiums ?? [];
  const profilePremiums =
    profile.otherInsurancePremiums ??
    (
      profile as FinancialProfile & {
        otherInsurancePolicies?: NonNullable<FinancialProfile["otherInsurancePremiums"]>;
      }
    ).otherInsurancePolicies ??
    [];
  if (profile.hasOtherInsurance && draftPol.length === 0 && profilePremiums.length > 0) {
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

function preferNonEmptyString(a?: string | null, b?: string | null): string | undefined {
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
    out.additionalObligations = (obl as Record<string, unknown>[]).map((row) => ({
      id: row.id,
      type: row.type ?? "",
      lenderName: (row.lenderName ?? row.lender ?? "") as string,
      monthlyAmount: row.monthlyAmount ?? 0,
    }));
  }

  const legacyPrem = out.otherInsurancePolicies as Record<string, unknown>[] | undefined;
  const newPrem = out.otherInsurancePremiums as Record<string, unknown>[] | undefined;
  const src = newPrem ?? legacyPrem;
  if (Array.isArray(src)) {
    out.otherInsurancePremiums = src.map((row) => ({
      id: row.id,
      policyName: row.policyName,
      premiumAmount: row.premiumAmount ?? row.premiumInput,
      frequency: row.frequency ?? "monthly",
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
        frequency: (d?.frequency ?? p?.frequency ?? "monthly") as PremiumFrequency,
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
      merged.healthInsurancePremiumInput = profileForm.healthInsurancePremiumInput;
      merged.healthInsurancePremiumFrequency =
        profileForm.healthInsurancePremiumFrequency ?? merged.healthInsurancePremiumFrequency;
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
        profileForm.termInsurancePremiumFrequency ?? merged.termInsurancePremiumFrequency;
    }
  }

  if ((pPol?.length ?? 0) > 0) {
    merged.hasOtherInsurance = true;
  }

  return merged;
}

/**
 * Rebuild analyse form values from a stored {@link FinancialProfile} (inverse of normalize).
 * Uses persisted premium input + frequency when present; otherwise falls back to `*PremiumMonthly` as monthly.
 */
export function financialProfileToFormValues(profile: FinancialProfile): Partial<AnalyseFormValues> {
  const p = profile;
  const additionalObligations = (p.additionalObligations ?? []).map((o) => {
    const row = o as {
      id?: string;
      type: string;
      lenderName?: string;
      lender?: string;
      monthlyAmount: number;
    };
    return {
      id: row.id ?? newAnalyseRowId(),
      type: row.type,
      lenderName: row.lenderName ?? row.lender ?? "",
      monthlyAmount: row.monthlyAmount,
    };
  });
  const legacyPolicies = (
    p as FinancialProfile & {
      otherInsurancePolicies?: NonNullable<FinancialProfile["otherInsurancePremiums"]>;
    }
  ).otherInsurancePolicies;
  const otherPolicies = p.otherInsurancePremiums ?? legacyPolicies ?? [];
  const hasOther =
    Boolean(p.hasOtherInsurance) ||
    otherPolicies.length > 0 ||
    (p.otherInsurancePremiumMonthly ?? 0) > 0;

  return {
    lifeStage: p.lifeStage,
    selfAge: p.selfAge,
    spouseAge: p.spouseAge,
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
    secondPropertyEMI: p.secondPropertyEMI ?? 0,
    carLoanEMI: p.carLoanEMI ?? 0,
    bikeEMI: p.bikeEMI ?? 0,
    personalLoanEMI: p.personalLoanEMI ?? 0,
    personalLoanOutstanding: p.personalLoanOutstanding ?? 0,
    creditCardBillMonthly: p.creditCardBillMonthly ?? 0,
    additionalObligations,
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
    healthInsurancePremiumFrequency: p.healthInsurancePremiumFrequency ?? "monthly",
    hasTermInsurance: p.hasTermInsurance,
    termInsuranceSumAssured: p.termInsuranceSumAssured ?? 0,
    termInsurancePremiumInput:
      p.termInsurancePremiumInput ?? p.termInsurancePremiumMonthly ?? 0,
    termInsurancePremiumFrequency: p.termInsurancePremiumFrequency ?? "monthly",
    carInsurancePremiumInput: p.carInsurancePremiumInput ?? p.carInsurancePremiumMonthly ?? 0,
    carInsurancePremiumFrequency: p.carInsurancePremiumFrequency ?? "monthly",
    bikeInsurancePremiumInput: p.bikeInsurancePremiumInput ?? p.bikeInsurancePremiumMonthly ?? 0,
    bikeInsurancePremiumFrequency: p.bikeInsurancePremiumFrequency ?? "monthly",
    hasOtherInsurance: hasOther,
    otherInsurancePremiums: otherPolicies.map((row) => {
      const r = row as {
        id?: string;
        policyName?: string;
        premiumAmount?: number;
        premiumInput?: number;
        frequency?: PremiumFrequency;
        monthlyAmount?: number;
      };
      return {
        id: r.id ?? newAnalyseRowId(),
        policyName: r.policyName,
        premiumAmount: r.premiumAmount ?? r.premiumInput ?? 0,
        frequency: r.frequency ?? "monthly",
      };
    }),
    otherInsurancePremiumInput:
      p.otherInsurancePremiumInput ??
      (otherPolicies.length === 0 ? (p.otherInsurancePremiumMonthly ?? 0) : 0),
    otherInsurancePremiumFrequency: p.otherInsurancePremiumFrequency ?? "monthly",
    savingsAccountBalance: p.savingsAccountBalance ?? 0,
    fdValue: p.fdValue ?? 0,
    liquidMFValue: p.liquidMFValue ?? 0,
    emergencyFundCurrent: p.emergencyFundCurrent ?? 0,
    otherLiquidSavings: p.otherLiquidSavings ?? 0,
    mfValue: p.mfValue ?? 0,
    indianStocksValue: p.indianStocksValue ?? 0,
    usStocksValueINR: p.usStocksValueINR ?? 0,
    usMFValueINR: p.usMFValueINR ?? 0,
    rsuValueINR: p.rsuValueINR ?? 0,
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
    primaryGoal: p.primaryGoal?.trim() ? p.primaryGoal : "grow_wealth",
    retirementTargetCorpus: p.retirementTargetCorpus,
    retirementAge: p.retirementAge ?? 0,
    kidsEducationFundTarget: p.kidsEducationFundTarget,
    kidsMarriageFundTarget: p.kidsMarriageFundTarget,
    emergencyFundTarget: p.emergencyFundTarget,
    medicalEmergencyFund: p.medicalEmergencyFund,
    bereavementFund: p.bereavementFund,
    homePurchaseTarget: p.homePurchaseTarget,
    homePurchaseYear: p.homePurchaseYear,
    carPurchaseTarget: p.carPurchaseTarget,
    carPurchaseYear: p.carPurchaseYear,
  };
}

/**
 * If user entered cover/premium amounts but toggles were missing/false in persisted state,
 * turn toggles on so values are not cleared by effects or stripped in normalize.
 */
export function coalesceInsuranceToggles<T extends Partial<AnalyseFormValues>>(data: T): T {
  const out = { ...data } as T;
  const hasHealthNumbers =
    (out.healthInsuranceSumInsured ?? 0) > 0 || (out.healthInsurancePremiumInput ?? 0) > 0;
  if (hasHealthNumbers && out.hasHealthInsurance !== true) {
    (out as { hasHealthInsurance?: boolean }).hasHealthInsurance = true;
  }
  const hasTermNumbers =
    (out.termInsuranceSumAssured ?? 0) > 0 || (out.termInsurancePremiumInput ?? 0) > 0;
  if (hasTermNumbers && out.hasTermInsurance !== true) {
    (out as { hasTermInsurance?: boolean }).hasTermInsurance = true;
  }
  return out;
}

export function normalizeAnalyseFormValues(data: Partial<AnalyseFormValues>): FinancialProfile {
  const form = migrateLegacyAnalysePartial(data);
  return {
    lifeStage: form.lifeStage ?? "bachelor",
    selfAge: form.selfAge ?? 18,
    spouseAge: form.lifeStage === "bachelor" ? undefined : form.spouseAge,
    numberOfKids: form.lifeStage === "kids" ? form.numberOfKids : undefined,
    kidsAges:
      form.lifeStage === "kids"
        ? (form.kidsAges ?? []).slice(0, form.numberOfKids ?? 0).filter((v): v is number => v !== undefined)
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
    homeLoanEMI: form.homeLoanEMI ?? 0,
    secondPropertyEMI: form.secondPropertyEMI ?? 0,
    carLoanEMI: form.carLoanEMI,
    bikeEMI: form.bikeEMI,
    personalLoanEMI: form.personalLoanEMI,
    personalLoanOutstanding: form.personalLoanOutstanding,
    creditCardBillMonthly: form.creditCardBillMonthly,
    additionalObligations: (form.additionalObligations ?? []).map((row) => {
      const r = row as {
        id?: string;
        type: string;
        lenderName?: string;
        lender?: string;
        monthlyAmount: number;
      };
      return {
        id: r.id,
        type: r.type,
        lenderName: r.lenderName ?? r.lender,
        monthlyAmount: r.monthlyAmount,
      };
    }),

    vegetables: form.vegetables ?? 0,
    grocery: form.grocery ?? 0,
    medicine: form.medicine ?? 0,
    fuel: form.fuel ?? 0,
    cabMetro: form.cabMetro ?? 0,
    electricity: form.electricity ?? 0,
    internet: form.internet ?? 0,
    gas: form.gas ?? 0,
    water: form.water,
    houseHelpMonthly: form.houseHelpMonthly,
    cookHelpMonthly: form.cookHelpMonthly,
    entertainment: form.entertainment ?? 0,
    shopping: form.shopping ?? 0,
    personalCare: form.personalCare,
    kidsSchoolFees: form.lifeStage === "kids" ? form.kidsSchoolFees : undefined,
    kidsActivities: form.lifeStage === "kids" ? form.kidsActivities : undefined,
    parentsSupport: form.parentsSupport,
    parentsHealthInsuranceSumInsured:
      (form.parentsSupport ?? 0) > 0 ? form.parentsHealthInsuranceSumInsured : undefined,
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
      ? form.healthInsurancePremiumFrequency ?? "monthly"
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
    termInsurancePremiumInput: form.hasTermInsurance ? form.termInsurancePremiumInput : undefined,
    termInsurancePremiumFrequency: form.hasTermInsurance
      ? form.termInsurancePremiumFrequency ?? "monthly"
      : undefined,
    carInsurancePremiumMonthly: toMonthlyEquivalent(
      form.carInsurancePremiumInput,
      form.carInsurancePremiumFrequency,
    ),
    carInsurancePremiumInput: form.carInsurancePremiumInput,
    carInsurancePremiumFrequency: form.carInsurancePremiumFrequency ?? "monthly",
    bikeInsurancePremiumMonthly: toMonthlyEquivalent(
      form.bikeInsurancePremiumInput,
      form.bikeInsurancePremiumFrequency,
    ),
    bikeInsurancePremiumInput: form.bikeInsurancePremiumInput,
    bikeInsurancePremiumFrequency: form.bikeInsurancePremiumFrequency ?? "monthly",
    hasOtherInsurance: form.hasOtherInsurance ?? false,
    otherInsurancePremiums: form.hasOtherInsurance
      ? (form.otherInsurancePremiums ?? []).map((row) => {
          const r = row as {
            id?: string;
            policyName?: string;
            premiumAmount?: number;
            premiumInput?: number;
            frequency?: PremiumFrequency;
          };
          const amount = r.premiumAmount ?? r.premiumInput;
          const freq = r.frequency ?? "monthly";
          return {
            id: r.id,
            policyName: r.policyName,
            premiumAmount: amount,
            frequency: freq,
            monthlyAmount: toMonthlyEquivalent(amount, freq) ?? 0,
          };
        })
      : [],
    otherInsurancePremiumMonthly: form.hasOtherInsurance
      ? (() => {
          const rows = form.otherInsurancePremiums ?? [];
          const fromPolicies = rows.reduce(
            (total, row) => {
              const r = row as { premiumAmount?: number; premiumInput?: number; frequency?: PremiumFrequency };
              const amount = r.premiumAmount ?? r.premiumInput;
              return total + (toMonthlyEquivalent(amount, r.frequency) ?? 0);
            },
            0,
          );
          if (fromPolicies > 0) return fromPolicies;
          return (
            toMonthlyEquivalent(
              form.otherInsurancePremiumInput,
              form.otherInsurancePremiumFrequency,
            ) ?? 0
          );
        })()
      : undefined,
    otherInsurancePremiumInput: form.hasOtherInsurance ? form.otherInsurancePremiumInput : undefined,
    otherInsurancePremiumFrequency: form.hasOtherInsurance
      ? form.otherInsurancePremiumFrequency ?? "monthly"
      : undefined,

    savingsAccountBalance: form.savingsAccountBalance ?? 0,
    fdValue: form.fdValue,
    liquidMFValue: form.liquidMFValue,
    emergencyFundCurrent: form.emergencyFundCurrent ?? 0,
    otherLiquidSavings: form.otherLiquidSavings,
    mfValue: form.mfValue,
    indianStocksValue: form.indianStocksValue,
    usStocksValueINR: form.usStocksValueINR,
    usMFValueINR: form.usMFValueINR,
    rsuValueINR: form.rsuValueINR,
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
    nscDepositAmount: form.investsInNsc
      ? (form.nscDepositAmount ??
          (form as Partial<AnalyseFormValues> & { nscMonthly?: number }).nscMonthly ??
          0)
      : 0,
    investsInNsc: form.investsInNsc ?? false,

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
  personalLoanOutstanding: 0,
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
  otherInsurancePremiums: [],
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
  investsInNsc: false,
  savingsAccountBalance: 0,
  fdValue: 0,
  liquidMFValue: 0,
  emergencyFundCurrent: 0,
  otherLiquidSavings: 0,
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
