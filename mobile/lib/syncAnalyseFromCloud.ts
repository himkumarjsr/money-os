import { isValidStoredAnalysis } from "@/lib/analysisSnapshotValidation";
import { analyseFinances } from "@/lib/financialEngine";
import { fetchUserAnalyseSnapshot } from "@/lib/userAnalyseSnapshot";
import { useFinancialStore } from "@/store/financialStore";

/** JSON with sorted keys, so Postgres jsonb key order doesn't count as a change. */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([a], [b]) =>
            a < b ? -1 : a > b ? 1 : 0,
          ),
        )
      : v,
  );
}

/**
 * Brings this device's health check in line with the saved one in
 * `user_analyse_snapshots`, which every submit and every Profile edit writes.
 * The store is only replaced when the saved answers differ, so an unchanged
 * report keeps its in-progress Retake draft. Returns whether a report exists.
 * Copy of the web `lib/syncAnalyseFromCloud.ts`.
 */
export async function syncAnalyseFromCloud(userId: string): Promise<boolean> {
  const local = useFinancialStore.getState();
  const hasLocal = !!(local.result && local.lastSubmission);

  let snap: Awaited<ReturnType<typeof fetchUserAnalyseSnapshot>>;
  try {
    snap = await fetchUserAnalyseSnapshot(userId);
  } catch {
    return hasLocal;
  }
  if (!snap?.lastSubmission) return hasLocal;

  const st = useFinancialStore.getState();
  if (
    st.result &&
    st.lastSubmission &&
    stableJson(st.lastSubmission) === stableJson(snap.lastSubmission)
  ) {
    return true;
  }
  st.hydrateFromSnapshot(
    snap.lastSubmission,
    snap.result && isValidStoredAnalysis(snap.result)
      ? snap.result
      : analyseFinances(snap.lastSubmission),
    {
      aiPlan: snap.aiPlan ?? undefined,
      analysisPatch: snap.analysis ?? undefined,
    },
  );
  return true;
}
