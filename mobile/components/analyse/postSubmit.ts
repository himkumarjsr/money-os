/**
 * Background chain run after the health check is submitted — web parity with
 * `analyse-onboarding-form.tsx` handleFinalSubmit: AI plan → store →
 * encrypted snapshot save → obligation sync → `/api/financial-data`.
 * Also warms the Fix Plan cache from the same response so that screen does
 * not cold-load behind a loader.
 */
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import type { AnalysisResult } from "@/lib/financialEngine";
import { buildPriorityPlan } from "@/lib/priorityEngine";
import {
  buildFallbackFinkoinPlan,
  isValidFinkoinAIPlan,
  type FinkoinAIPlan,
} from "@/lib/finkoinAiPlan";
import {
  enginePlanFingerprint,
  hashProfile,
  setCachedPlan,
} from "@/lib/cache";
import {
  mergeEnginePriorityPlan,
  monthsForPriority,
  reconcileExplanations,
  type FixPlanData,
} from "@/lib/fixPlanMerge";
import { saveUserAnalyseSnapshotAiPlan } from "@/lib/userAnalyseSnapshot";
import { useFinancialStore } from "@/store/financialStore";
import { getSupabase } from "@/lib/supabase";
import { siteBase, splitApi } from "@/lib/splitApi";

const AI_TIMEOUT_MS = 60_000;

async function postAnalyse(
  profile: FinancialProfile,
  analysis: AnalysisResult,
): Promise<Record<string, any>> {
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("no session");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch(`${siteBase()}/api/ai/analyse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ profile, analysis }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`AI ${res.status}`);
    return (await res.json()) as Record<string, any>;
  } finally {
    clearTimeout(timer);
  }
}

export async function runPostSubmitChain(args: {
  uid: string;
  profile: FinancialProfile;
  result: AnalysisResult;
}): Promise<void> {
  const { uid, profile, result } = args;

  let aiPlan: FinkoinAIPlan;
  try {
    const data = await postAnalyse(profile, result);
    aiPlan = isValidFinkoinAIPlan(data.plan)
      ? (data.plan as FinkoinAIPlan)
      : buildFallbackFinkoinPlan(profile, result);

    // Warm the Fix Plan cache (same shape useFixPlan stores).
    if (data.priorityPlan && !data.isFallback) {
      try {
        const engine = buildPriorityPlan(profile, result);
        const merged = mergeEnginePriorityPlan(
          engine,
          data.priorityPlan,
          monthsForPriority,
        );
        const combined: FixPlanData = {
          priorityPlan: merged,
          explanations: reconcileExplanations(
            data.explanations,
            merged,
            result,
          ),
          isFallback: false,
        };
        setCachedPlan(
          hashProfile(profile, result),
          combined,
          null,
          enginePlanFingerprint(engine),
        );
      } catch (e) {
        console.warn("Fix plan cache warm failed:", e);
      }
    }
  } catch {
    aiPlan = buildFallbackFinkoinPlan(profile, result);
  }

  useFinancialStore.getState().setAiPlan(aiPlan);

  void saveUserAnalyseSnapshotAiPlan(uid, aiPlan).then(({ error }) => {
    if (error) console.warn("AI plan save failed:", error.message);
  });

  void splitApi("/api/financial-data", {
    method: "POST",
    body: { submission: profile },
  }).then((r) => {
    if (!r.ok) console.warn("Encrypted financial data save failed:", r.error);
  });
}
