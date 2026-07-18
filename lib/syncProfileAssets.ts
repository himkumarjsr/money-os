import {
  analyseDefaultValues,
  normalizeAnalyseFormValues,
  type FinancialProfile,
} from "@/lib/analyse-form-schema";
import { analyseFinances } from "@/lib/financialEngine";
import { upsertUserAnalyseSnapshot } from "@/lib/userAnalyseSnapshot";
import { useFinancialStore } from "@/store/financialStore";

/** Ensure we always have a workable profile even before first analysis submit. */
export function ensureEditableProfile(
  profile: FinancialProfile | null,
): FinancialProfile {
  if (profile) return profile;
  return normalizeAnalyseFormValues({
    ...analyseDefaultValues,
  } as Parameters<typeof normalizeAnalyseFormValues>[0]);
}

/**
 * Persist asset edits locally (Zustand) and to Supabase for authenticated users.
 * Recomputes engine result so net worth / checklist stay in sync app-wide.
 */
export async function syncProfileAssets(input: {
  profile: FinancialProfile;
  userId?: string | null;
  aiPlan?: unknown;
}): Promise<{ error?: string }> {
  const profile = input.profile;
  useFinancialStore.getState().setFullAnalysis(profile);

  if (!input.userId) return {};

  try {
    const result = analyseFinances(profile);
    const { error } = await upsertUserAnalyseSnapshot(input.userId, {
      profile,
      result,
      submittedAt: new Date().toISOString(),
      version: "1.0",
      aiPlan: (input.aiPlan as never) ?? useFinancialStore.getState().aiPlan,
      analysis: useFinancialStore.getState().analysis ?? undefined,
    });
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not sync assets",
    };
  }
}
