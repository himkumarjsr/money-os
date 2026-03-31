import type { FinancialProfile } from "@/lib/analyse-form-schema";

export const BASE_UNIVERSAL_CAPS = {
  wants: 0.05,
  security: 0.05,
  loans: 0.4,
  investment: 0.2,
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

function n(v: number | undefined): number {
  return v ?? 0;
}

function totalIncome(data: Partial<FinancialProfile>) {
  return n(data.monthlySalary) + n(data.spouseIncome) + n(data.otherIncome);
}

export function hasHomeLoan(data: Partial<FinancialProfile>) {
  return n(data.homeLoanEMI) > 0 || n(data.secondPropertyEMI) > 0;
}

export function getUniversalCaps(data: Partial<FinancialProfile>) {
  const homeEmiNeeds = hasHomeLoan(data) ? 0.3 : 0.2;
  return {
    needs: homeEmiNeeds,
    wants: BASE_UNIVERSAL_CAPS.wants,
    security: BASE_UNIVERSAL_CAPS.security,
    loans: BASE_UNIVERSAL_CAPS.loans,
    investment: hasHomeLoan(data) ? BASE_UNIVERSAL_CAPS.investment : 0.3,
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

export function getUniversalBucketActuals(data: Partial<FinancialProfile>) {
  let needsActual =
    n(data.rentAmount) +
    n(data.homeLoanEMI) +
    n(data.secondPropertyEMI) +
    n(data.vegetables) +
    n(data.grocery) +
    n(data.medicine) +
    n(data.electricity) +
    n(data.internet) +
    n(data.gas) +
    n(data.water) +
    n(data.fuel) +
    n(data.cabMetro) +
    n(data.entertainment) +
    n(data.kidsSchoolFees);

  if (n(data.parentsSupport) > 0) {
    needsActual += n(data.parentsSupport);
  }

  needsActual += n(data.personalCare) + n(data.kidsActivities);

  const wantsActual =
    n(data.shopping);

  const securityActual =
    n(data.healthInsurancePremiumMonthly) +
    n(data.termInsurancePremiumMonthly) +
    n(data.carInsurancePremiumMonthly) +
    n(data.bikeInsurancePremiumMonthly) +
    n(data.otherInsurancePremiumMonthly) +
    n(data.ssy);

  const loansActual =
    n(data.carLoanEMI) +
    n(data.bikeEMI) +
    n(data.personalLoanEMI);

  // MONTHLY CONTRIBUTIONS ONLY
  // Asset values (mfValue, epfBalance etc.)
  // go to netWorth calculation, not here
  // Insurance and SSY are treated as security / goal buckets,
  // not monthly investment flow in the take-home income meter.
  const investmentActual =
    n(data.monthlySIP) +
    n(data.monthlyRD) +
    n(data.monthlyNPSContribution) +
    n(data.nscMonthly);

  return {
    needs: needsActual,
    wants: wantsActual,
    security: securityActual,
    loans: loansActual,
    investment: investmentActual,
  };
}

export function getUniversalBucketRows(data: Partial<FinancialProfile>): UniversalBucketRow[] {
  const totalMonthlyIncome = totalIncome(data);
  const actuals = getUniversalBucketActuals(data);
  const caps = getUniversalCaps(data);
  const defs: Array<{ key: UniversalBucketKey; label: string }> = [
    { key: "needs", label: "Needs" },
    { key: "wants", label: "Wants" },
    { key: "security", label: "Security" },
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
          ? hasHomeLoan(data)
            ? "30% (home EMI adjustment)"
            : "20%"
          : key === "wants"
            ? "5%"
          : key === "security"
            ? "5%"
          : key === "loans"
            ? "40%"
          : key === "investment"
            ? hasHomeLoan(data)
              ? "20%"
              : "30% (extra 10% when no home EMI)"
            : `${Math.round(capPercent * 100)}%`,
      capHelper:
        key === "loans"
          ? "(home EMI sits in Needs)"
          : undefined,
      capAmount,
      actual,
      status: getUniversalBucketStatus(actual, capAmount),
    };
  });
}

export function getUnallocatedIncome(data: Partial<FinancialProfile>): number {
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
