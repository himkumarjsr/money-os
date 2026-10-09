import type {
  AnalyseFormValues,
  FinancialProfile,
} from "@/lib/analyse-form-schema";
import { monthlyTotalIncome } from "@/lib/financialEngine";
import {
  type BucketProfileInput,
  CAP_FLOORS,
  getUniversalBucketActuals,
  getUniversalCaps,
  hasHomeLoan,
} from "@/lib/universal-buckets";

/** Caps as fractions of monthly income — same as monthly allocation table (`getUniversalCaps`). */
export type SpeedoMeterCaps = {
  needs: number;
  wants: number;
  security?: number;
  loans: number;
  investment: number;
};

export interface SpeedoMeterProps {
  income: number;
  needs: number;
  wants: number;
  /** Monthly insurance premiums (Security bucket). */
  security?: number;
  loans: number;
  investment: number;
  hasHomeLoan?: boolean;
  /** When set, gauge caps and labels match the allocation table. */
  caps?: SpeedoMeterCaps;
}

/**
 * Health gauges use the same bucket actuals and caps as the monthly allocation table
 * (`getUniversalBucketActuals` / `getUniversalCaps`).
 */
export function buildSpeedoMeterProps(
  data: Partial<AnalyseFormValues> | FinancialProfile,
): SpeedoMeterProps {
  const row = data as BucketProfileInput;
  const actuals = getUniversalBucketActuals(row);
  const capRow = getUniversalCaps(data as FinancialProfile);
  const hl = hasHomeLoan(row);

  return {
    income: monthlyTotalIncome(data as FinancialProfile),
    needs: actuals.needs,
    wants: actuals.wants,
    security: actuals.security,
    loans: actuals.loans,
    investment: actuals.investment,
    hasHomeLoan: hl,
    caps: {
      needs: capRow.needs,
      wants: capRow.wants,
      security: capRow.security,
      loans: capRow.loans,
      investment: capRow.investment,
    },
  };
}

export type SpeedoStatus = "good" | "warning" | "critical";

/**
 * The user's investment target in whole percent of income: their Investment
 * cap from `getUniversalCaps` (smart budget included), never below the 15%
 * budget floor.
 */
export function investmentTargetPct(investCapFraction: number): number {
  return Math.max(CAP_FLOORS.investment, Math.round(investCapFraction * 100));
}

/**
 * Investment is a target, so more is never a problem.
 * Good at or above the target; "Watch" down to the 15% floor (or 85% of a
 * 15% target, so there is always a small warning band); low below that.
 */
export function investStatus(
  actualPct: number,
  targetPct: number,
): SpeedoStatus {
  if (actualPct >= targetPct - 1e-6) return "good";
  const warnFrom = Math.min(CAP_FLOORS.investment, targetPct * 0.85);
  if (actualPct >= warnFrom - 1e-6) return "warning";
  return "critical";
}
