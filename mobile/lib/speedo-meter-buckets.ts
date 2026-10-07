import type { AnalyseFormValues, FinancialProfile } from "@/lib/analyse-form-schema";
import { monthlyTotalIncome } from "@/lib/financialEngine";
import {
  type BucketProfileInput,
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
