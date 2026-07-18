import type {
  FinancialProfile,
  PremiumFrequency,
} from "@/lib/analyse-form-schema";
import { toMonthlyEquivalent } from "@/lib/analyse-form-schema";

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
    return (data.otherInsurancePremiums ?? []).reduce(
      (total, row) =>
        total +
        n(
          toMonthlyEquivalent(
            row.premiumAmount ??
              (row as { premiumInput?: number }).premiumInput,
            row.frequency,
          ),
        ),
      0,
    );
  }
  return 0;
}

/** Monthly insurance premiums only (health, term, motor, other) — for speedometer “investment” split. */
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
  security: 0.05,
  loans: 0.4,
  investment: 0.2,
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

export function getUniversalCaps(data: Partial<FinancialProfile>) {
  return {
    needs: BUCKET_CAPS.needs,
    wants: BUCKET_CAPS.wants,
    security: BUCKET_CAPS.security,
    loans: BUCKET_CAPS.loans,
    investment: BUCKET_CAPS.investment,
  } as const;
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

  // MONTHLY CONTRIBUTIONS ONLY — SIP, RD, NPS, PPF, EPF (employee), SSY deposits.
  const investmentActual =
    n(data.monthlySIP) +
    n(data.monthlyRD) +
    n(data.monthlyNPSContribution) +
    n(data.monthlyPPFContribution) +
    n(data.monthlyEPFContribution) +
    n(data.ssy);

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
      capLabel:
        key === "needs"
          ? "30%"
          : key === "wants"
            ? "5%"
            : key === "security"
              ? "5%"
              : key === "loans"
                ? "40%"
                : key === "investment"
                  ? "20%"
                  : `${Math.round(capPercent * 100)}%`,
      capHelper:
        key === "loans" ? "(includes home EMI obligations)" : undefined,
      capAmount,
      actual,
      status: getUniversalBucketStatus(actual, capAmount),
    };
  });
}

export function getUnallocatedIncome(data: BucketProfileInput): number {
  const totalMonthlyIncome = totalIncome(data);
  const actuals = getUniversalBucketActuals(data);
  return (
    totalMonthlyIncome -
    actuals.needs -
    actuals.wants -
    actuals.security -
    actuals.loans -
    actuals.investment
  );
}

export function getInsuranceGuideline(totalIncome: number) {
  return totalIncome * 0.05;
}

export function getInsuranceCriticalFloor(totalIncome: number) {
  return totalIncome * 0.02;
}
