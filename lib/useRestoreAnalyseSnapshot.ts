"use client";

import { analyseFinances } from "@/lib/financialEngine";
import { fetchUserAnalyseSnapshot } from "@/lib/userAnalyseSnapshot";
import { useFinancialStore } from "@/store/financialStore";
import { useEffect } from "react";

/**
 * The financial store only lives in sessionStorage, so a new tab starts empty.
 * Signed-in users get their last report back from `user_analyse_snapshots`.
 */
export function useRestoreAnalyseSnapshot(userId: string | null | undefined) {
  const result = useFinancialStore((s) => s.result);
  const lastSubmission = useFinancialStore((s) => s.lastSubmission);
  const hasHydrated = useFinancialStore((s) => s.hasHydrated);
  const hydrateFromSnapshot = useFinancialStore((s) => s.hydrateFromSnapshot);

  useEffect(() => {
    if (!hasHydrated || (result && lastSubmission) || !userId) return;
    let cancelled = false;

    void (async () => {
      try {
        const snap = await fetchUserAnalyseSnapshot(userId);
        if (cancelled || !snap) return;
        hydrateFromSnapshot(
          snap.lastSubmission,
          snap.result ?? analyseFinances(snap.lastSubmission),
          {
            aiPlan: snap.aiPlan,
            analysisPatch: snap.analysis ?? undefined,
          },
        );
      } catch (err) {
        console.log("No snapshot found:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, userId, result, lastSubmission, hydrateFromSnapshot]);
}
