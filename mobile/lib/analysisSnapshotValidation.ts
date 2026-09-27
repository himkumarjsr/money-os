import type { AnalysisResult } from "@/lib/financialEngine";

/** True if a stored / API analysis payload has the shape the UI expects. */
export function isValidStoredAnalysis(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  const scores = o.scores;
  if (!scores || typeof scores !== "object") return false;
  return (
    Array.isArray(o.issues) &&
    Array.isArray(o.flags) &&
    Array.isArray(o.planSteps) &&
    Array.isArray(o.securityChecklist)
  );
}
