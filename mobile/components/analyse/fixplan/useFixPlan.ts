/**
 * Load flow from web app/analyse/fixplan/page.tsx: engine plan → cache →
 * POST /api/ai/analyse → merge (engine wins) → cache + legacy user_analysis.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import type { AnalysisResult } from "@/lib/financialEngine";
import { buildPriorityPlan } from "@/lib/priorityEngine";
import {
  FIX_PLAN_RATE_LIMIT_MESSAGE,
  FIX_PLAN_REFRESH_UP_TO_DATE,
  enginePlanFingerprint,
  getCachedPlan,
  hashProfile,
  isCachedAiStale,
  setCachedPlan,
  tryStartForcedRefresh,
} from "@/lib/cache";
import {
  mergeEnginePriorityPlan,
  monthsForPriority,
  reconcileExplanations,
  type FixPlanData,
} from "@/lib/fixPlanMerge";
import { hydrateSyncKv } from "@/lib/syncKv";
import { siteBase } from "@/lib/splitApi";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

const AI_TIMEOUT_MS = 60_000;
const FALLBACK_RETRY_MS = 5000;
const NOTICE_MS = 5000;

const fixPlanInFlight = new Map<string, Promise<void>>();

class RateLimitError extends Error {
  constructor() {
    super(FIX_PLAN_RATE_LIMIT_MESSAGE);
    this.name = "RateLimitError";
  }
}

async function postAnalyse(
  profile: FinancialProfile,
  analysis: AnalysisResult,
): Promise<any> {
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Sign in again to continue.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${siteBase()}/api/ai/analyse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ profile, analysis }),
      signal: controller.signal,
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    throw new Error(
      aborted
        ? "Request timed out. Check your connection and try again."
        : "Network error. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 429) throw new RateLimitError();

  let data: any = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) throw new Error(data.error || "AI failed");
  return data;
}

type Args = {
  profile: FinancialProfile | null;
  result: AnalysisResult | null;
  userId: string | undefined;
  /** Auth/entitlement gate passed and store data is ready. */
  enabled: boolean;
};

export function useFixPlan({ profile, result, userId, enabled }: Args) {
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState("");
  const [aiPlan, setAiPlan] = useState<FixPlanData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPlanRef = useRef(false);

  const showNotice = useCallback((message: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice(message);
    noticeTimerRef.current = setTimeout(() => setNotice(""), NOTICE_MS);
  }, []);

  useEffect(
    () => () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    },
    [],
  );
  const lastLoadKeyRef = useRef<string | null>(null);
  const loadRef = useRef<((forceRefresh?: boolean) => Promise<void>) | null>(
    null,
  );

  const load = useCallback(
    async (forceRefresh = false) => {
      if (!profile || !result) return;
      await hydrateSyncKv();
      let currentHash: string;
      let enginePriorityPlan: any;
      let currentFingerprint: string;
      try {
        currentHash = hashProfile(profile, result);
        enginePriorityPlan = buildPriorityPlan(profile, result);
        currentFingerprint = enginePlanFingerprint(enginePriorityPlan);
      } catch (e) {
        setAiError(e instanceof Error ? e.message : "Could not build plan");
        setAiLoading(false);
        return;
      }
      const flowKey = `${currentHash}:${currentFingerprint}:${forceRefresh ? "f" : "n"}`;
      if (!forceRefresh) {
        const pending = fixPlanInFlight.get(flowKey);
        if (pending) {
          await pending;
          return;
        }
      }
      const run = (async () => {
        const cached = !forceRefresh ? getCachedPlan(currentHash) : null;
        const cacheUsable =
          cached && !isCachedAiStale(cached, currentFingerprint);

        if (cacheUsable && cached) {
          const cachedPlan = cached.aiPlan || {};
          const mergedCachedPriority = mergeEnginePriorityPlan(
            enginePriorityPlan,
            cachedPlan.priorityPlan || {},
            monthsForPriority,
          );
          setAiError("");
          setAiPlan({
            ...cachedPlan,
            priorityPlan: mergedCachedPriority,
            explanations: reconcileExplanations(
              cachedPlan.explanations,
              mergedCachedPriority,
              result,
            ),
          });
          setAiLoading(false);
          return;
        }

        // Keep existing plan visible on refreshes; only show loader on first load.
        if (!hasPlanRef.current) setAiLoading(true);
        try {
          const data = await postAnalyse(profile, result);
          const mergedPriorityPlan = mergeEnginePriorityPlan(
            enginePriorityPlan,
            data.priorityPlan || {},
            monthsForPriority,
          );
          const combinedPlan: FixPlanData = {
            priorityPlan: mergedPriorityPlan,
            explanations: reconcileExplanations(
              data.explanations,
              mergedPriorityPlan,
              result,
            ),
            isFallback: !!data.isFallback,
          };
          setCachedPlan(currentHash, combinedPlan, null, currentFingerprint);

          if (userId && isSupabaseConfigured()) {
            getSupabase()
              .from("user_analysis")
              .update({
                ai_fix_plan: combinedPlan,
                ai_generated_at: new Date().toISOString(),
              })
              .eq("user_id", userId)
              .then(
                () => {},
                () => {},
              );
          }
          setAiError("");
          setAiPlan(combinedPlan);
        } catch (error) {
          if (error instanceof RateLimitError && hasPlanRef.current) {
            showNotice(FIX_PLAN_RATE_LIMIT_MESSAGE);
          } else {
            setAiError(error instanceof Error ? error.message : "AI failed");
          }
        } finally {
          setAiLoading(false);
        }
      })();
      if (!forceRefresh) fixPlanInFlight.set(flowKey, run);
      try {
        await run;
      } finally {
        if (!forceRefresh) fixPlanInFlight.delete(flowKey);
      }
    },
    [profile, result, userId, showNotice],
  );

  loadRef.current = load;
  hasPlanRef.current = Boolean(aiPlan);

  useEffect(() => {
    if (!enabled || !profile || !result) return;
    const loadKey = `${hashProfile(profile, result)}:${String(result.overallScore ?? "")}`;
    if (lastLoadKeyRef.current === loadKey) return;
    lastLoadKeyRef.current = loadKey;
    void loadRef.current?.(false);
  }, [enabled, profile, result]);

  /** Forced regenerate, throttled by `tryStartForcedRefresh` (shared 2-minute window). */
  const regenerate = useCallback(
    async (notifyIfThrottled: boolean) => {
      if (!tryStartForcedRefresh()) {
        if (notifyIfThrottled) showNotice(FIX_PLAN_REFRESH_UP_TO_DATE);
        if (!hasPlanRef.current) await loadRef.current?.(false);
        return;
      }
      await loadRef.current?.(true);
    },
    [showNotice],
  );

  useEffect(() => {
    // Silent background retry for fallback plans — do not remount the loader.
    if (!aiPlan?.isFallback) return;
    const timer = setTimeout(() => {
      void regenerate(false);
    }, FALLBACK_RETRY_MS);
    return () => clearTimeout(timer);
  }, [aiPlan?.isFallback, regenerate]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await regenerate(true);
    } catch {
      // load() reports its own errors; this only guarantees the spinner stops.
    } finally {
      setRefreshing(false);
    }
  }, [regenerate]);

  /** Initial-load retry when no plan is shown — cache first, network on miss. */
  const retry = useCallback(() => loadRef.current?.(false), []);

  return { aiPlan, aiLoading, aiError, refreshing, notice, retry, refresh };
}
