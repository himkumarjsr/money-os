import {
  financialProfileToFormValues,
  type FinancialProfile,
} from "@/lib/analyse-form-schema";
import { analyseFinances } from "@/lib/financialEngine";
import {
  ANALYSE_SNAPSHOT_VERSION,
  upsertUserAnalyseSnapshot,
} from "@/lib/userAnalyseSnapshot";
import { useFinancialStore } from "@/store/financialStore";

/**
 * Apply a profile change made outside the form (goal cards, prompted goals):
 * recompute the report, update the local store, and save the snapshot.
 */
export async function saveAnalyseProfile(
  userId: string | null | undefined,
  profile: FinancialProfile,
): Promise<{ error?: string }> {
  const store = useFinancialStore.getState();
  const result = analyseFinances(profile);
  const analysis = {
    ...(store.analysis ?? {}),
    ...financialProfileToFormValues(profile),
  };
  store.hydrateFromSnapshot(profile, result, {
    aiPlan: store.aiPlan,
    analysisPatch: analysis,
  });
  if (!userId) return {};
  const { error } = await upsertUserAnalyseSnapshot(userId, {
    profile,
    result,
    submittedAt: new Date().toISOString(),
    version: ANALYSE_SNAPSHOT_VERSION,
    aiPlan: store.aiPlan,
    analysis,
  });
  return error ? { error: error.message } : {};
}
