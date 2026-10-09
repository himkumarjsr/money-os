import type {
  FinancialProfile,
  PremiumFrequency,
} from "@/lib/analyse-form-schema";
import {
  otherPremiumRowsMonthly,
  toMonthlyEquivalent,
} from "@/lib/analyse-form-schema";

/** Form fields used before `normalizeAnalyseFormValues` runs */
export type FormPremiumOverlay = {
  healthInsurancePremiumInput?: number;
  healthInsurancePremiumFrequency?: PremiumFrequency;
  termInsurancePremiumInput?: number;
  termInsurancePremiumFrequency?: PremiumFrequency;
  carInsurancePremiumInput?: number;
  carInsurancePremiumFrequency?: PremiumFrequency;
  bikeInsurancePremiumInput?: number;
  bikeInsurancePremiumFrequency?: PremiumFrequency;
  hasOtherInsurance?: boolean;
  otherInsurancePremiums?: Array<{
    policyName?: string;
    premiumAmount?: number;
    premiumInput?: number;
    frequency?: PremiumFrequency;
    countAsInvestment?: boolean;
  }>;
};

export type BucketProfileInput = Partial<FinancialProfile> & FormPremiumOverlay;

function n(v: number | undefined): number {
  return v ?? 0;
}

function healthPremiumMonthly(data: BucketProfileInput): number {
  if (typeof data.healthInsurancePremiumMonthly === "number") {
    return n(data.healthInsurancePremiumMonthly);
  }
  if (data.hasHealthInsurance) {
    return n(
      toMonthlyEquivalent(
        data.healthInsurancePremiumInput,
        data.healthInsurancePremiumFrequency,
      ),
    );
  }
  return 0;
}

function termPremiumMonthly(data: BucketProfileInput): number {
  if (typeof data.termInsurancePremiumMonthly === "number") {
    return n(data.termInsurancePremiumMonthly);
  }
  if (data.hasTermInsurance) {
    return n(
      toMonthlyEquivalent(
        data.termInsurancePremiumInput,
        data.termInsurancePremiumFrequency,
      ),
    );
  }
  return 0;
}

function carPremiumMonthly(data: BucketProfileInput): number {
  if (typeof data.carInsurancePremiumMonthly === "number") {
    return n(data.carInsurancePremiumMonthly);
  }
  return n(
    toMonthlyEquivalent(
      data.carInsurancePremiumInput,
      data.carInsurancePremiumFrequency,
    ),
  );
}

function bikePremiumMonthly(data: BucketProfileInput): number {
  if (typeof data.bikeInsurancePremiumMonthly === "number") {
    return n(data.bikeInsurancePremiumMonthly);
  }
  return n(
    toMonthlyEquivalent(
      data.bikeInsurancePremiumInput,
      data.bikeInsurancePremiumFrequency,
    ),
  );
}

function otherInsurancePremiumMonthly(data: BucketProfileInput): number {
  if (typeof data.otherInsurancePremiumMonthly === "number") {
    return n(data.otherInsurancePremiumMonthly);
  }
  if (
    data.hasOtherInsurance &&
    (data.otherInsurancePremiums?.length ?? 0) > 0
  ) {
    return otherPremiumRowsMonthly(data.otherInsurancePremiums ?? [], false);
  }
  return 0;
}

/**
 * LIC / endowment premiums with a maturity value, marked in Analyse to count
 * under Investment instead of Security.
 */
export function licEndowmentPremiumMonthly(data: BucketProfileInput): number {
  if (typeof data.licEndowmentPremiumMonthly === "number") {
    return n(data.licEndowmentPremiumMonthly);
  }
  if (!data.hasOtherInsurance) return 0;
  return otherPremiumRowsMonthly(data.otherInsurancePremiums ?? [], true);
}

/** Monthly insurance premiums only (health, term, motor, other; not LIC / endowment marked as investment). */
export function getInsurancePremiumsMonthly(data: BucketProfileInput): number {
  return (
    healthPremiumMonthly(data) +
    termPremiumMonthly(data) +
    carPremiumMonthly(data) +
    bikePremiumMonthly(data) +
    otherInsurancePremiumMonthly(data)
  );
}

export const BUCKET_CAPS = {
  needs: 0.3,
  wants: 0.05,
  security: 0.1,
  loans: 0.3,
  investment: 0.25,
} as const;

export const BASE_UNIVERSAL_CAPS = {
  wants: BUCKET_CAPS.wants,
  security: BUCKET_CAPS.security,
  loans: BUCKET_CAPS.loans,
  investment: BUCKET_CAPS.investment,
} as const;

export type UniversalBucketKey = "needs" | keyof typeof BASE_UNIVERSAL_CAPS;
export type UniversalBucketStatus = "good" | "warning" | "critical";

export type UniversalBucketRow = {
  key: UniversalBucketKey;
  label: string;
  capPercent: number;
  capLabel?: string;
  capHelper?: string;
  capAmount: number;
  actual: number;
  status: UniversalBucketStatus;
};

function totalIncome(data: Partial<FinancialProfile>) {
  const spouse = data.lifeStage === "bachelor" ? 0 : n(data.spouseIncome);
  return n(data.monthlySalary) + spouse + n(data.otherIncome);
}

export function hasHomeLoan(data: Partial<FinancialProfile>) {
  return n(data.homeLoanEMI) > 0 || n(data.secondPropertyEMI) > 0;
}

type CapPercents = Record<UniversalBucketKey, number>;

/** One change the tracker made to a budget, for the explanation note. */
export type SmartBudgetAdjustment = {
  key: "needs" | "wants";
  fromPercent: number;
  toPercent: number;
  averageSpend: number;
  /** Rupees a month moved from this bucket into Investment. */
  movedToInvestment: number;
};

/** Budget split learned from tracked spending (see `lib/learned-caps.ts`). */
export type SmartBudget = {
  /** Profile caps the adjustment was made from; a new Analyse answer set voids it. */
  baseCaps: Record<UniversalBucketKey, number>;
  caps: Record<UniversalBucketKey, number>;
  adjustments: SmartBudgetAdjustment[];
  /** False when the user pressed Undo. */
  enabled: boolean;
  computedAt: string;
};

function sameCaps(
  a: Record<UniversalBucketKey, number>,
  b: Record<UniversalBucketKey, number>,
) {
  return (Object.keys(a) as UniversalBucketKey[]).every(
    (k) => Math.abs(a[k] - (b[k] ?? NaN)) < 1e-9,
  );
}

/** The smart budget, when it is on and still matches the profile's own caps. */
export function getActiveSmartBudget(
  data: Partial<FinancialProfile>,
): SmartBudget | null {
  const sb = data.smartBudget;
  if (!sb?.enabled || sb.adjustments.length === 0) return null;
  return sameCaps(sb.baseCaps, getProfileCaps(data)) ? sb : null;
}

/** One line explaining an active smart budget on the report, or null. */
export function smartBudgetSummary(
  data: Partial<FinancialProfile>,
): string | null {
  const sb = getActiveSmartBudget(data);
  if (!sb) return null;
  const changes = sb.adjustments
    .map(
      (a) =>
        `${a.key === "needs" ? "Needs" : "Wants"} ${a.fromPercent}% to ${a.toPercent}%`,
    )
    .join(" and ");
  return `Smart budget from your last 3 months of tracked spending: ${changes}, with the difference added to Investment. You can undo it in Tracker.`;
}

/**
 * Whole-number splits (Needs / Wants / Security / Loans / Investment) per life stage.
 * Each row adds up to 100.
 */
export const LIFE_STAGE_SPLITS = {
  bachelorUnder30: {
    needs: 30,
    wants: 5,
    security: 7,
    loans: 30,
    investment: 28,
  },
  bachelor: { needs: 30, wants: 5, security: 10, loans: 30, investment: 25 },
  married: { needs: 30, wants: 5, security: 10, loans: 30, investment: 25 },
  kids: { needs: 33, wants: 5, security: 12, loans: 28, investment: 22 },
  senior: { needs: 40, wants: 7, security: 15, loans: 10, investment: 28 },
} as const satisfies Record<string, CapPercents>;

/**
 * Monthly household income bands per city tier (today's rupees).
 * Below `low`, fixed costs eat a bigger share; above `high`, a smaller one.
 * Review these each year for inflation.
 */
export const INCOME_BANDS = {
  metro: { low: 40_000, high: 3_00_000 },
  tier2: { low: 30_000, high: 2_00_000 },
  tier3: { low: 20_000, high: 1_50_000 },
} as const;

/** Floors that adjustments never break. Shortfalls come out of Needs. */
export const CAP_FLOORS = { wants: 5, security: 7, investment: 15 } as const;

function shift(caps: CapPercents, delta: Partial<CapPercents>) {
  for (const [k, v] of Object.entries(delta))
    caps[k as UniversalBucketKey] += v;
}

/**
 * Budget caps as fractions of monthly income.
 * Without Analyse answers (no life stage) this is the generic `BUCKET_CAPS`;
 * otherwise the split is tailored to life stage, age, income for the city,
 * parent support and home loan.
 */
export function getUniversalCaps(
  data: Partial<FinancialProfile>,
): Record<UniversalBucketKey, number> {
  const smart = getActiveSmartBudget(data);
  return smart ? { ...smart.caps } : getProfileCaps(data);
}

/** Caps from the Analyse answers alone, ignoring any smart-budget adjustment. */
export function getProfileCaps(
  data: Partial<FinancialProfile>,
): Record<UniversalBucketKey, number> {
  if (!data.lifeStage) return { ...BUCKET_CAPS };

  const age = n(data.selfAge);
  const base =
    data.lifeStage === "bachelor" && age > 0 && age < 30
      ? LIFE_STAGE_SPLITS.bachelorUnder30
      : LIFE_STAGE_SPLITS[data.lifeStage];
  const caps: CapPercents = { ...base };

  const income = totalIncome(data);
  const band = INCOME_BANDS[data.cityTier ?? "tier2"];
  if (income > 0 && income < band.low) {
    shift(caps, { needs: 10, loans: -5, investment: -5 });
  } else if (income > band.high) {
    shift(caps, { needs: -5, investment: 5 });
  }

  if (n(data.parentsSupport) > 0) shift(caps, { security: 3, investment: -3 });
  if (hasHomeLoan(data)) shift(caps, { loans: 5, investment: -5 });
  if (data.lifeStage !== "senior" && age >= 45 && age < 60) {
    shift(caps, { loans: -5, investment: 5 });
  }

  for (const [k, floor] of Object.entries(CAP_FLOORS)) {
    const key = k as UniversalBucketKey;
    if (caps[key] < floor) {
      caps.needs -= floor - caps[key];
      caps[key] = floor;
    }
  }

  return {
    needs: caps.needs / 100,
    wants: caps.wants / 100,
    security: caps.security / 100,
    loans: caps.loans / 100,
    investment: caps.investment / 100,
  };
}

export function getUniversalBucketStatus(
  actual: number,
  capAmount: number,
): UniversalBucketStatus {
  if (actual <= capAmount + 1e-6) return "good";
  if (actual <= capAmount * 1.15 + 1e-6) return "warning";
  return "critical";
}

export function getUniversalBucketActuals(data: BucketProfileInput) {
  const kids = data.lifeStage === "kids";
  const foodActual =
    n(data.foodTotal) > 0
      ? n(data.foodTotal)
      : n(data.vegetables) + n(data.grocery) + n(data.medicine);
  const transportActual =
    n(data.transportTotal) > 0
      ? n(data.transportTotal)
      : n(data.fuel) + n(data.cabMetro);
  const utilityActual =
    n(data.utilityTotal) > 0
      ? n(data.utilityTotal)
      : n(data.electricity) + n(data.internet) + n(data.gas) + n(data.water);
  const domesticActual =
    n(data.domesticHelpTotal) > 0
      ? n(data.domesticHelpTotal)
      : n(data.houseHelpMonthly) + n(data.cookHelpMonthly);
  const lifestyleActual =
    n(data.lifestyleTotal) > 0
      ? n(data.lifestyleTotal)
      : n(data.entertainment) + n(data.shopping) + n(data.personalCare);

  let needsActual =
    n(data.rentAmount) +
    (n(data.rentAmount) > 0 ? n(data.rentMaintenanceMonthly) : 0) +
    foodActual +
    utilityActual +
    transportActual +
    (kids ? n(data.kidsSchoolFees) : 0);

  if (n(data.parentsSupport) > 0) {
    needsActual += n(data.parentsSupport);
  }

  needsActual += (kids ? n(data.kidsActivities) : 0) + domesticActual;

  const wantsActual = lifestyleActual;

  // Security = insurance premiums only (health + term + motor + other policies).
  // NOT EPF/PF/NPS or SSY — those belong in the investment bucket as monthly contributions.
  const securityActual =
    healthPremiumMonthly(data) +
    termPremiumMonthly(data) +
    carPremiumMonthly(data) +
    bikePremiumMonthly(data) +
    otherInsurancePremiumMonthly(data);

  const dedupedAdditionalRows = Array.from(
    new Map(
      (data.additionalObligations ?? [])
        .filter((row) => n(row.monthlyAmount) > 0)
        .map((row) => {
          const key = [
            String((row as any)?.type || "other")
              .toLowerCase()
              .trim(),
            String((row as any)?.lenderName || "")
              .toLowerCase()
              .trim(),
            Math.round(n((row as any)?.monthlyAmount)),
          ].join("|");
          return [key, row] as const;
        }),
    ).values(),
  );
  const additionalEmiTotal = dedupedAdditionalRows.reduce(
    (sum, row) => sum + n((row as any).monthlyAmount),
    0,
  );
  const loansActual =
    n(data.homeLoanEMI) +
    n(data.secondPropertyEMI) +
    n(data.carLoanEMI) +
    n(data.bikeEMI) +
    n(data.personalLoanEMI) +
    n(data.creditCardBillMonthly) +
    additionalEmiTotal;

  // MONTHLY CONTRIBUTIONS ONLY — SIP, RD, NPS, PPF, EPF (employee), SSY,
  // LIC / endowment premiums marked as investment + custom.
  const customMonthly = (data.customInvestments ?? []).reduce(
    (sum, row) => sum + n(row.monthlyContribution),
    0,
  );
  const investmentActual =
    n(data.monthlySIP) +
    n(data.monthlyRD) +
    n(data.monthlyNPSContribution) +
    n(data.monthlyPPFContribution) +
    n(data.monthlyEPFContribution) +
    n(data.ssy) +
    licEndowmentPremiumMonthly(data) +
    customMonthly;

  return {
    needs: needsActual,
    wants: wantsActual,
    security: securityActual,
    loans: loansActual,
    investment: investmentActual,
  };
}

export function getUniversalBucketRows(
  data: BucketProfileInput,
): UniversalBucketRow[] {
  const totalMonthlyIncome = totalIncome(data);
  const actuals = getUniversalBucketActuals(data);
  const caps = getUniversalCaps(data);
  const defs: Array<{ key: UniversalBucketKey; label: string }> = [
    { key: "needs", label: "Needs / mandatory expenses" },
    { key: "wants", label: "Wants / non-mandatory expenses" },
    { key: "security", label: "Insurance (monthly)" },
    { key: "loans", label: "Loans" },
    { key: "investment", label: "Investment" },
  ];

  return defs.map(({ key, label }) => {
    const capPercent = caps[key];
    const capAmount = totalMonthlyIncome * capPercent;
    const actual = actuals[key];
    return {
      key,
      label,
      capPercent,
      capLabel: `${Math.round(capPercent * 100)}%`,
      capHelper:
        key === "loans" ? "(includes home EMI obligations)" : undefined,
      capAmount,
      actual,
      // Investment is a target, not a limit: investing more than the cap is never a problem.
      status:
        key === "investment"
          ? "good"
          : getUniversalBucketStatus(actual, capAmount),
    };
  });
}

/**
 * Employee EPF is deducted at source — it is not paid from in-hand salary.
 * Keep it in the Investment bucket for savings-rate tracking, but exclude it
 * when computing surplus / unallocated cash.
 */
export function getEpfContributionMonthly(data: BucketProfileInput): number {
  return n(data.monthlyEPFContribution);
}

/** Cash outflow from take-home (all buckets except EPF). */
export function getInHandOutflow(data: BucketProfileInput): number {
  const actuals = getUniversalBucketActuals(data);
  return (
    actuals.needs +
    actuals.wants +
    actuals.security +
    actuals.loans +
    Math.max(0, actuals.investment - getEpfContributionMonthly(data))
  );
}

/** Income left after in-hand outflows (EPF excluded). */
export function getUnallocatedIncome(data: BucketProfileInput): number {
  return totalIncome(data) - getInHandOutflow(data);
}

export function getInsuranceGuideline(totalIncome: number) {
  return totalIncome * BUCKET_CAPS.security;
}

export function getInsuranceCriticalFloor(totalIncome: number) {
  return totalIncome * 0.02;
}
