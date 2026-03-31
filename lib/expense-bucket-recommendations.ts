import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { getUniversalBucketRows } from "@/lib/universal-buckets";

export type ExpenseBucketRow = {
  id: string;
  label: string;
  actual: number;
  recommended: number;
  overLimit: boolean;
};

export function getExpenseBucketRows(p: FinancialProfile): ExpenseBucketRow[] {
  return getUniversalBucketRows(p).map((row) => ({
    id: row.key,
    label: row.label,
    actual: row.actual,
    recommended: row.capAmount,
    overLimit: row.status !== "good",
  }));
}
