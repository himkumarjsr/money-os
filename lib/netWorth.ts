import type { AnalyseFormValues } from "@/lib/analyse-form-schema";

function sum(values: Array<number | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

const ageBenchmarks = [
  { min: 25, max: 30, low: 2_00_000, high: 5_00_000 },
  { min: 30, max: 35, low: 8_00_000, high: 15_00_000 },
  { min: 35, max: 40, low: 20_00_000, high: 40_00_000 },
  { min: 40, max: 50, low: 40_00_000, high: 80_00_000 },
] as const;

/** Assets minus liabilities from onboarding / stored profile fields. */
export function buildNetWorth(values: Partial<AnalyseFormValues>) {
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

export function getNetWorthStanding(age: number | undefined, netWorth: number): string | null {
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

export function netWorthSectionTone(value: number) {
  return value >= 0
    ? "border-slate-200 bg-slate-50 text-slate-900"
    : "border-slate-200 bg-slate-50 text-slate-900";
}

export const netWorthMetricTones = {
  assets: "border-emerald-100 bg-emerald-50/80 text-emerald-950",
  liabilities: "border-amber-100 bg-amber-50/80 text-amber-950",
  netPositive: "border-emerald-100 bg-emerald-50/80 text-emerald-950",
  netNegative: "border-amber-100 bg-amber-50/80 text-amber-950",
} as const;
