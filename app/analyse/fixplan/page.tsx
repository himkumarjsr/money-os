"use client";

import { apiFetch } from "@/lib/apiFetch";
import {
  getCachedPlan,
  hashProfile,
  setCachedPlan,
  enginePlanFingerprint,
  FIX_PLAN_RATE_LIMIT_MESSAGE,
  isCachedAiStale,
  tryStartForcedRefresh,
} from "@/lib/cache";
import {
  LOADING_MESSAGES,
  mergeEnginePriorityPlan,
  monthsForPriority,
  noGainProjectionMessage,
  openPriorities,
  reconcileExplanations,
  scoreProjectionGain,
} from "@/lib/fixPlanMerge";
import { Analytics } from "@/lib/analytics";
import { scoreBand } from "@/lib/financialEngine";
import { buildPriorityPlan, debtPayoffNumbers } from "@/lib/priorityEngine";
import { loginHrefPreserveRef } from "@/lib/referralRewards";
import PrivateAmount from "@/components/ui/PrivateAmount";
import { AppIcon } from "@/components/ui/AppIcon";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import { resolveAuthenticated } from "@/lib/authSession";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useRestoreAnalyseSnapshot } from "@/lib/useRestoreAnalyseSnapshot";
import { useFinancialStore } from "@/store/financialStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const fixPlanInFlight = new Map<string, Promise<void>>();

export default function FixPlanPage() {
  const router = useRouter();
  const hasLoadedRef = useRef(false);
  const lastLoadKeyRef = useRef<string | null>(null);
  const loadFixPlanRef = useRef<
    ((forceRefresh?: boolean) => Promise<void>) | null
  >(null);
  const hasPlanRef = useRef(false);
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const profile = useFinancialStore((s) => s.lastSubmission);
  const result = useFinancialStore((s) => s.result);
  useRestoreAnalyseSnapshot(user?.id);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState("");
  const [aiPlan, setAiPlan] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [refreshNotice, setRefreshNotice] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length),
      2500,
    );
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    Analytics.fixPlanViewed();
  }, []);

  const loadFixPlan = useCallback(
    async (requestedRefresh = false) => {
      if (!profile || !result) return;
      const forceRefresh = requestedRefresh && tryStartForcedRefresh();
      const currentHash = hashProfile(profile, result);
      const enginePriorityPlan = buildPriorityPlan(profile, result);
      const currentFingerprint = enginePlanFingerprint(enginePriorityPlan);
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
          console.log("Using cached AI plan ✓");
          const cachedPlan = cached.aiPlan || {};
          const mergedCachedPriority = mergeEnginePriorityPlan(
            enginePriorityPlan,
            cachedPlan.priorityPlan || {},
            monthsForPriority,
          );
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

        if (cached && !cacheUsable) {
          console.log("AI cache stale vs engine — re-evaluating…");
        }

        console.log("Calling AI (cache miss / refresh)...");
        // Keep existing plan visible on silent retries; only show loader on first load.
        if (!hasPlanRef.current) setAiLoading(true);
        try {
          const response = await apiFetch("/api/ai/analyse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profile, analysis: result }),
          });
          if (response.status === 401) {
            router.replace(
              loginHrefPreserveRef("/login?redirect=/analyse/fixplan"),
            );
            return;
          }
          if (response.status === 429) {
            if (hasPlanRef.current) {
              setRefreshNotice(FIX_PLAN_RATE_LIMIT_MESSAGE);
              return;
            }
            throw new Error(FIX_PLAN_RATE_LIMIT_MESSAGE);
          }
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "AI failed");
          const aiPriorityPlan = data.priorityPlan || {};
          const mergedPriorityPlan = mergeEnginePriorityPlan(
            enginePriorityPlan,
            aiPriorityPlan,
            monthsForPriority,
          );
          const combinedPlan = {
            priorityPlan: mergedPriorityPlan,
            explanations: reconcileExplanations(
              data.explanations,
              mergedPriorityPlan,
              result,
            ),
            isFallback: !!data.isFallback,
          };
          setCachedPlan(currentHash, combinedPlan, null, currentFingerprint);

          if (supabase && user?.id) {
            supabase
              .from("user_analysis")
              .update({
                ai_fix_plan: combinedPlan,
                ai_generated_at: new Date().toISOString(),
              })
              .eq("user_id", user.id)
              .then(() => {});
          }
          setAiPlan(combinedPlan);
        } catch (error: any) {
          setAiError(error.message);
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
    [profile, result, user?.id],
  );

  loadFixPlanRef.current = loadFixPlan;
  hasPlanRef.current = Boolean(aiPlan);

  useEffect(() => {
    if (!hasInitialized) return;

    let cancelled = false;

    void (async () => {
      const authenticated = await resolveAuthenticated();
      if (cancelled) return;
      if (!authenticated) {
        router.replace(
          loginHrefPreserveRef("/login?redirect=/analyse/fixplan"),
        );
        return;
      }

      const skipPayment = process.env.NEXT_PUBLIC_SKIP_PAYMENT === "true";

      if (skipPayment) {
        console.log("fixplan: skip payment enabled");
      } else {
        const currentUser = useAuthStore.getState().user;
        const hasAccess =
          currentUser?.subscriptionTier === "pro" ||
          currentUser?.subscriptionTier === "promax" ||
          currentUser?.isAdmin;

        if (!hasAccess) {
          console.log("fixplan: no access, redirecting to result");
          router.replace("/analyse/result");
          return;
        }
      }
      if (!profile || !result) return;
      const loadKey = `${hashProfile(profile, result)}:${String((result as { overallScore?: number })?.overallScore ?? "")}`;
      if (lastLoadKeyRef.current !== loadKey) {
        lastLoadKeyRef.current = loadKey;
        hasLoadedRef.current = false;
      }
      if (hasLoadedRef.current) return;
      hasLoadedRef.current = true;
      if (!cancelled) void loadFixPlanRef.current?.(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    hasInitialized,
    isLoggedIn,
    user?.subscriptionTier,
    user?.isAdmin,
    router,
    profile,
    result,
  ]);

  useEffect(() => {
    // Silent background retry for fallback plans — do not remount the loading screen.
    if (!aiPlan?.isFallback) return;
    const timer = setTimeout(() => {
      void loadFixPlanRef.current?.(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [aiPlan?.isFallback]);

  const lastSubmission = profile;
  const aiData = aiPlan;
  const visiblePriorities = openPriorities(aiPlan?.priorityPlan);
  const attentionCount = visiblePriorities.length;
  const monthlyPlanRows = aiPlan?.priorityPlan?.monthlyPlan || [];
  const showEmergencyCol = monthlyPlanRows.some(
    (m: any) => Number(m?.emergency || 0) > 0,
  );
  const showMedicalCol = monthlyPlanRows.some(
    (m: any) => Number(m?.medical || 0) > 0,
  );
  const showTermCol = monthlyPlanRows.some(
    (m: any) => Number(m?.termYearly || 0) > 0,
  );
  const showSipCol = monthlyPlanRows.some((m: any) => Number(m?.sip || 0) > 0);
  const showDebtCol = monthlyPlanRows.some(
    (m: any) => Number(m?.extraDebt || 0) > 0,
  );

  if (!hasInitialized) {
    return <BrandPageLoader fullScreen={false} label="Loading…" />;
  }

  const handleDownloadPDF = async () => {
    setDownloading(true);
    setPdfError("");
    try {
      let timeZone: string | undefined;
      try {
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch {
        timeZone = undefined;
      }
      const res = await apiFetch("/api/analyse/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: lastSubmission,
          result,
          priorityPlan: aiData?.priorityPlan,
          explanations: aiData?.explanations ?? {},
          timeZone,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ||
            "Could not generate the PDF. Please try again.",
        );
      }
      const blob = await res.blob();
      const name =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="?([^";]+)"?/i)?.[1] || "Finkoin-Fix-Plan.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      console.error("PDF error:", err);
      setPdfError(
        err instanceof Error
          ? err.message
          : "Could not generate the PDF. Please try again.",
      );
    } finally {
      setDownloading(false);
    }
  };

  if (aiLoading) {
    return (
      <BrandPageLoader
        fullScreen={false}
        label={LOADING_MESSAGES[messageIndex] || "Loading…"}
      />
    );
  }

  if (aiError || !aiPlan || !profile) {
    return (
      <div className="min-h-dvh p-8">
        Unable to generate fix plan. {aiError}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#F7F7F4] p-4">
      <div className="mx-auto max-w-5xl space-y-4">
        <button
          onClick={() => router.push("/analyse/result")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#534AB7",
            fontSize: 14,
            fontWeight: 600,
            padding: "16px 0",
            marginBottom: 8,
          }}
        >
          ← Back to report
        </button>
        <section className="rounded-2xl bg-gradient-to-r from-[#534AB7] to-[#6E62D7] p-5 text-white">
          <p className="text-xs uppercase tracking-wide text-white/80">
            Finkoin AI
          </p>
          <p className="mt-2 text-sm italic">
            {attentionCount > 0
              ? `Based on your financial profile, we identified ${attentionCount} ${attentionCount === 1 ? "area" : "areas"} that need attention.`
              : "Your core safety and allocation buckets are currently on track."}
          </p>
          <p className="mt-2 text-sm text-white/90">
            {aiPlan.explanations?.overallSummary ||
              "This plan improves your score by prioritising safety, debt and growth in sequence."}
          </p>
          <p className="mt-1 text-xs text-white/90">
            {aiPlan?.isFallback
              ? "ℹ️ Showing estimated plan — AI analysis will load shortly"
              : "✓ AI personalised analysis"}
          </p>
          {refreshNotice ? (
            <p className="mt-1 text-xs text-white/90">{refreshNotice}</p>
          ) : null}
        </section>

        {aiPlan.priorityPlan?.surplusBreakdown ? (
          <details className="rounded-xl bg-[#F7F7F4] p-4 text-sm">
            <summary className="cursor-pointer font-semibold text-[#3C3489]">
              Your monthly surplus: ₹
              {Math.round(
                aiPlan.priorityPlan.surplusBreakdown.netSurplus || 0,
              ).toLocaleString("en-IN")}
              <span className="ml-2 font-normal text-[#9B9A94]">
                (tap to see breakdown)
              </span>
            </summary>
            <div className="mt-3 space-y-1 text-[#5F5E5A]">
              <div className="flex justify-between">
                <span>Monthly income</span>
                <PrivateAmount
                  value={aiPlan.priorityPlan.surplusBreakdown.totalIncome || 0}
                  label="monthly income"
                  valueClassName="font-medium"
                >
                  +₹
                  {Math.round(
                    aiPlan.priorityPlan.surplusBreakdown.totalIncome || 0,
                  ).toLocaleString("en-IN")}
                </PrivateAmount>
              </div>
              <div className="flex justify-between text-[#8C3A3A]">
                <span>Living expenses (needs)</span>
                <span>
                  -₹
                  {Math.round(
                    aiPlan.priorityPlan.surplusBreakdown.needsActual || 0,
                  ).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between text-[#8C3A3A]">
                <span>Loan EMIs</span>
                <span>
                  -₹
                  {Math.round(
                    aiPlan.priorityPlan.surplusBreakdown.loansActual || 0,
                  ).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between text-[#8C3A3A]">
                <span>Insurance premiums</span>
                <span>
                  -₹
                  {Math.round(
                    aiPlan.priorityPlan.surplusBreakdown
                      .existingInsurancePremiums || 0,
                  ).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between text-[#8C3A3A]">
                <span>Lifestyle / wants</span>
                <span>
                  -₹
                  {Math.round(
                    aiPlan.priorityPlan.surplusBreakdown.wantsActual || 0,
                  ).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="mt-2 flex justify-between border-t border-[#E8E6F0] pt-2 font-bold text-[#1D9E75]">
                <span>Your available surplus</span>
                <span>
                  ₹
                  {Math.round(
                    aiPlan.priorityPlan.surplusBreakdown.netSurplus || 0,
                  ).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </details>
        ) : null}

        {visiblePriorities.map((p: any) => (
          <section
            key={p.id}
            className={`rounded-2xl border-l-4 bg-white p-4 shadow-sm ${(p.id === "term_insurance" && p.status === "partial" ? "high" : p.urgency) === "critical" ? "border-[#E24B4A]" : (p.id === "term_insurance" && p.status === "partial" ? "high" : p.urgency) === "high" ? "border-[#BA7517]" : "border-[#1D9E75]"}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#EEEDFE] text-sm text-[#534AB7]">
                  {p.rank}
                </span>
                <span>
                  {p.id === "term_insurance" && p.status === "partial"
                    ? "Consider term top-up plan"
                    : p.title}
                </span>
              </h3>
              <span className="rounded-full bg-[#F7F6FE] px-2 py-1 text-xs uppercase text-[#534AB7]">
                {p.id === "term_insurance" && p.status === "partial"
                  ? "high"
                  : p.urgency}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-[#F7F7F4] p-2 text-sm">
                Gap ₹{p.gap?.toLocaleString("en-IN")}
              </div>
              <div className="rounded-lg bg-[#F7F7F4] p-2 text-sm">
                Monthly ₹{p.monthlyContribution?.toLocaleString("en-IN")}
                <p className="mt-0.5 text-xs text-gray-500">
                  From your ₹
                  {Math.round(
                    aiPlan.priorityPlan?.monthlySurplus || 0,
                  ).toLocaleString("en-IN")}{" "}
                  surplus
                  {" · "}₹
                  {Math.round(p.surplusAfterThis || 0).toLocaleString("en-IN")}{" "}
                  left after this step
                </p>
              </div>
              <div className="rounded-lg bg-[#F7F7F4] p-2 text-sm">
                Timeline{" "}
                {monthsForPriority(
                  String(p.id || ""),
                  Number(p.gap || 0),
                  Number(p.monthlyContribution || 0),
                )}{" "}
                months
              </div>
            </div>
            <p className="mt-2 text-sm text-[#534AB7]">
              Where to invest: {p.instrument || "As recommended in your plan"}
            </p>
            <p className="mt-2 text-sm italic text-[#7A7871]">
              {p.id === "term_insurance" && p.status === "partial"
                ? `You have ₹${((p.currentAmount || 0) / 10000000).toFixed(1)}Cr term cover which is good. For your current income and family situation, ₹${((p.targetAmount || 0) / 10000000).toFixed(1)}Cr is recommended. IMPORTANT: Do NOT cancel your existing policy. Instead buy a separate top-up or additional term plan from a different insurer. This costs less than a new full policy and gives you the extra coverage needed.`
                : aiPlan.explanations?.priorityExplanations?.[p.id] ||
                  p.whyThisMatters}
            </p>
            <p className="mt-2 rounded-xl bg-[#E7F6F4] p-3 text-sm">
              <strong>This week:</strong> {p.actionThisWeek}
            </p>
            {p.id === "term_insurance" || p.id === "health_insurance" ? (
              <Link
                href={
                  p.id === "term_insurance"
                    ? "/learn/term-insurance-vs-endowment-why-most-indians-buy-wrong"
                    : "/learn/what-is-health-insurance-floater"
                }
                className="mt-3 inline-flex rounded-lg border border-[#534AB7]/30 bg-[#F7F6FE] px-3 py-2 text-sm font-semibold text-[#534AB7] hover:bg-[#EEEDFE]"
              >
                {p.id === "term_insurance" && p.status === "partial"
                  ? "How term top-ups work (educational) →"
                  : p.id === "term_insurance"
                    ? "Term cover guide (educational) →"
                    : "Health cover guide (educational) →"}
              </Link>
            ) : null}
          </section>
        ))}

        {visiblePriorities.length > 0 ? (
          <section className="rounded-2xl border border-[#E8E6F0] bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold">
              Surplus Allocation Summary
            </h3>
            <div className="mt-3 space-y-1 text-sm text-[#5F5E5A]">
              <div className="flex justify-between font-medium">
                <span>Your surplus</span>
                <span>
                  ₹
                  {Math.round(
                    aiPlan.priorityPlan.monthlySurplus || 0,
                  ).toLocaleString("en-IN")}
                </span>
              </div>
              {visiblePriorities.map((p: any, idx: number) => (
                <div
                  key={`surplus-line-${p.id}-${idx}`}
                  className="flex justify-between"
                >
                  <span>
                    Step {idx + 1} — {p.title}
                  </span>
                  <span>
                    -₹
                    {Math.round(p.monthlyContribution || 0).toLocaleString(
                      "en-IN",
                    )}
                  </span>
                </div>
              ))}
              <div className="mt-2 flex justify-between border-t border-[#E8E6F0] pt-2 font-bold text-[#1D9E75]">
                <span>Remaining buffer</span>
                <span>
                  ₹
                  {Math.round(
                    Math.max(
                      0,
                      (aiPlan.priorityPlan.monthlySurplus || 0) -
                        visiblePriorities.reduce(
                          (s: number, p: any) =>
                            s + Number(p.monthlyContribution || 0),
                          0,
                        ),
                    ),
                  ).toLocaleString("en-IN")}
                </span>
              </div>
              <p className="text-xs text-[#9B9A94]">
                (Available for debt extra payment + future SIP)
              </p>
            </div>
          </section>
        ) : null}

        {monthlyPlanRows.length > 0 ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold">
              Month-wise execution plan (12 months)
            </h3>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Month</th>
                    {showEmergencyCol ? (
                      <th className="px-3 py-2">Emergency</th>
                    ) : null}
                    {showMedicalCol ? (
                      <th className="px-3 py-2">Medical</th>
                    ) : null}
                    {showTermCol ? (
                      <th className="px-3 py-2">Term (yearly)</th>
                    ) : null}
                    {showSipCol ? <th className="px-3 py-2">SIP</th> : null}
                    {showDebtCol ? (
                      <th className="px-3 py-2">Extra debt</th>
                    ) : null}
                    <th className="px-3 py-2">Remaining</th>
                    <th className="px-3 py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyPlanRows.map((m: any) => (
                    <tr
                      key={`month-plan-${m.month}`}
                      className="border-t border-slate-100"
                    >
                      <td className="px-3 py-2 font-medium">{m.month}</td>
                      {showEmergencyCol ? (
                        <td className="px-3 py-2">
                          ₹
                          {Math.round(m.emergency || 0).toLocaleString("en-IN")}
                        </td>
                      ) : null}
                      {showMedicalCol ? (
                        <td className="px-3 py-2">
                          ₹{Math.round(m.medical || 0).toLocaleString("en-IN")}
                        </td>
                      ) : null}
                      {showTermCol ? (
                        <td className="px-3 py-2">
                          ₹
                          {Math.round(m.termYearly || 0).toLocaleString(
                            "en-IN",
                          )}
                        </td>
                      ) : null}
                      {showSipCol ? (
                        <td className="px-3 py-2">
                          ₹{Math.round(m.sip || 0).toLocaleString("en-IN")}
                        </td>
                      ) : null}
                      {showDebtCol ? (
                        <td className="px-3 py-2">
                          ₹
                          {Math.round(m.extraDebt || 0).toLocaleString("en-IN")}
                        </td>
                      ) : null}
                      <td className="px-3 py-2">
                        ₹{Math.round(m.remaining || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {m.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {aiPlan.priorityPlan?.debts?.length > 0 ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold">Debt strategy</h3>
            {(() => {
              const debts = aiPlan.priorityPlan.debts as any[];
              return (
                <div
                  style={{
                    background: "white",
                    borderRadius: 14,
                    border: "1px solid #E8E6F0",
                    overflow: "hidden",
                    marginTop: 12,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      background: "#534AB7",
                      padding: "12px 16px",
                      color: "white",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    Debt Payoff Strategy (Avalanche Method)
                  </div>
                  {debts.map((debt: any, i: number) => {
                    const {
                      extraPayment,
                      outstanding,
                      currentEMI,
                      monthsNow,
                      monthsSaved,
                      interestSaved,
                    } = debtPayoffNumbers(debt);
                    const label =
                      debt.displayName || debt.label || debt.name || debt.type;
                    return (
                      <div
                        key={`${debt.type}-${i}`}
                        style={{
                          padding: "14px 16px",
                          borderBottom:
                            i < debts.length - 1 ? "1px solid #F7F7F4" : "none",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 10,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#111110",
                            }}
                          >
                            {label}
                          </div>
                          <div
                            style={{
                              background: "#FCEBEB",
                              color: "#E24B4A",
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: 20,
                            }}
                          >
                            {debt.rate || debt.interestRate || 0}% interest
                          </div>
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            gap: 8,
                          }}
                        >
                          {(
                            [
                              [
                                "Outstanding",
                                `₹${outstanding.toLocaleString("en-IN")}`,
                              ],
                              [
                                "Current EMI",
                                `₹${currentEMI.toLocaleString("en-IN")}/mo`,
                              ],
                              [
                                "Extra payment",
                                extraPayment > 0
                                  ? `₹${extraPayment.toLocaleString("en-IN")}/mo`
                                  : "After P1 cleared",
                              ],
                            ] as const
                          ).map(([lbl, value]) => (
                            <div
                              key={lbl}
                              style={{
                                background: "#F7F7F4",
                                borderRadius: 8,
                                padding: "8px 10px",
                                textAlign: "center",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 10,
                                  color: "#9B9A94",
                                  marginBottom: 3,
                                }}
                              >
                                {lbl}
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "#111110",
                                }}
                              >
                                {value}
                              </div>
                            </div>
                          ))}
                        </div>
                        {extraPayment > 0 ? (
                          <div
                            style={{
                              background: "#E1F5EE",
                              borderRadius: 8,
                              padding: "8px 12px",
                              marginTop: 10,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span style={{ fontSize: 12, color: "#1D5C3A" }}>
                              Clear in{" "}
                              {monthsNow || debt.monthsToClearWithExtra || 0}{" "}
                              months
                              {monthsSaved > 0
                                ? ` (save ${monthsSaved} months vs EMI-only)`
                                : ""}
                            </span>
                            {interestSaved > 0 ? (
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: "#1D9E75",
                                }}
                              >
                                Save ₹{interestSaved.toLocaleString("en-IN")}{" "}
                                interest
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <p className="mt-1 text-sm italic text-[#7A7871]">
              {aiPlan.explanations?.debtStrategy ||
                "Clear high-interest debt first, then roll freed EMI into the next debt."}
            </p>
          </section>
        ) : null}

        {aiPlan.priorityPlan?.goals?.length ? (
          <GoalSplitCard goals={aiPlan.priorityPlan.goals} />
        ) : null}

        {profile
          ? (() => {
              const scoreToday = aiData?.priorityPlan?.scoreToday || 0;
              const scoreAfter = aiData?.priorityPlan?.scoreAfter12Months || 0;
              const scoreGain = scoreProjectionGain(aiData?.priorityPlan);
              const getScoreColor = (s: number) =>
                ({ critical: "#E24B4A", warning: "#BA7517", good: "#1D9E75" })[
                  scoreBand(s)
                ];
              const getScoreBg = (s: number) =>
                ({ critical: "#FCEBEB", warning: "#FAEEDA", good: "#E1F5EE" })[
                  scoreBand(s)
                ];

              return (
                <div
                  style={{
                    border: "1px solid #E8E6F0",
                    borderRadius: 16,
                    padding: "20px 24px",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#111110",
                      marginBottom: 4,
                    }}
                  >
                    Score projection
                  </div>
                  {scoreGain > 0 ? (
                    <>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#9B9A94",
                          marginBottom: 24,
                        }}
                      >
                        Follow this plan for 12 months
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#9B9A94",
                              marginBottom: 8,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            Today
                          </div>
                          <div
                            style={{
                              width: 80,
                              height: 80,
                              borderRadius: "50%",
                              background: getScoreBg(scoreToday),
                              border: `3px solid ${getScoreColor(scoreToday)}`,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              margin: "0 auto",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 22,
                                fontWeight: 800,
                                color: getScoreColor(scoreToday),
                                lineHeight: 1,
                              }}
                            >
                              {scoreToday}
                            </div>
                            <div style={{ fontSize: 10, color: "#9B9A94" }}>
                              /100
                            </div>
                          </div>
                        </div>
                        <div style={{ flex: 1, textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: 28,
                              color: "#534AB7",
                              lineHeight: 1,
                            }}
                          >
                            →
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#1D9E75",
                              marginTop: 6,
                            }}
                          >
                            +{scoreGain} pts
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#9B9A94",
                              marginTop: 2,
                            }}
                          >
                            in 12 months
                          </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#9B9A94",
                              marginBottom: 8,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            Month 12
                          </div>
                          <div
                            style={{
                              width: 80,
                              height: 80,
                              borderRadius: "50%",
                              background: getScoreBg(scoreAfter),
                              border: `3px solid ${getScoreColor(scoreAfter)}`,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              margin: "0 auto",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 22,
                                fontWeight: 800,
                                color: getScoreColor(scoreAfter),
                                lineHeight: 1,
                              }}
                            >
                              {scoreAfter}
                            </div>
                            <div style={{ fontSize: 10, color: "#9B9A94" }}>
                              /100
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        marginTop: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: "50%",
                          background: getScoreBg(scoreToday),
                          border: `3px solid ${getScoreColor(scoreToday)}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                          fontWeight: 800,
                          color: getScoreColor(scoreToday),
                          flexShrink: 0,
                        }}
                      >
                        {scoreToday}
                      </div>
                      <div style={{ fontSize: 14, color: "#1D5C3A" }}>
                        {noGainProjectionMessage(scoreToday)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          : null}

        {aiPlan.priorityPlan?.fdSuggestion ? (
          <section className="rounded-2xl border border-[#E8E6F0] bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold">FD opportunity</h3>
            <p className="mt-2 text-sm text-[#5F5E5A]">
              {aiPlan.priorityPlan.fdSuggestion.message}
            </p>
            <button className="mt-3 rounded-lg bg-[#534AB7] px-3 py-2 text-sm font-semibold text-white">
              {aiPlan.priorityPlan.fdSuggestion.cta}
            </button>
          </section>
        ) : null}

        <section className="rounded-2xl border border-[#E7D7A7] bg-[#FFF4D8] p-4">
          <p className="text-xs font-semibold uppercase text-[#BA7517]">
            Do this first — this week
          </p>
          <p className="mt-1 text-sm text-[#5F5E5A]">
            {aiPlan.explanations?.thisWeekAction ||
              aiPlan.priorityPlan?.topAction}
          </p>
        </section>

        <section className="rounded-2xl border border-[#CBEBDD] bg-[#E8F6F1] p-4">
          <p className="text-sm text-[#1D9E75]">
            {aiPlan.explanations?.encouragement ||
              "You have already taken the hardest step by starting. Stay consistent and your score will improve."}
          </p>
        </section>

        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="h-12 w-full rounded-xl border border-[#534AB7] bg-white font-bold text-[#534AB7] disabled:opacity-70"
        >
          {downloading ? (
            "Generating PDF..."
          ) : (
            <span className="inline-flex items-center justify-center gap-2">
              <AppIcon name="download" size={18} color="currentColor" />
              Download full report PDF
            </span>
          )}
        </button>

        {pdfError ? (
          <p role="alert" className="text-center text-sm text-[#991B1B]">
            {pdfError}
          </p>
        ) : null}

        <p className="pb-4 text-center text-xs text-[#9B9A94]">
          Educational guidance only. Not SEBI registered investment advice.
        </p>
      </div>
    </div>
  );
}

type GoalSplitRow = {
  goalType: string;
  goalId?: string;
  label?: string;
  targetAmount: number;
  currentSaved: number;
  monthlyRequired: number;
  monthlyAllocated?: number;
  sharePct?: number;
  yearsToGoal: number;
  instrument: string;
};

function GoalSplitCard({ goals }: { goals: GoalSplitRow[] }) {
  const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  const parallel = goals.some((g) => g.monthlyAllocated != null);
  const budget = goals.reduce((s, g) => s + (g.monthlyAllocated ?? 0), 0);
  const shortfall = goals.reduce(
    (s, g) =>
      s + Math.max(0, g.monthlyRequired - (g.monthlyAllocated ?? g.monthlyRequired)),
    0,
  );
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold">Goal plan</h3>
      {parallel ? (
        <p className="mt-1 text-sm font-medium text-[#454442]">
          {inr(budget)}/month, split across {goals.length}{" "}
          {goals.length === 1 ? "goal" : "goals"} at the same time — nearer
          deadlines get more, long-horizon goals are never left at zero.
        </p>
      ) : null}
      <div className="mt-3 space-y-3">
        {goals.map((g) => {
          const monthly = g.monthlyAllocated ?? g.monthlyRequired;
          const funded =
            g.monthlyRequired > 0
              ? Math.min(100, Math.round((monthly / g.monthlyRequired) * 100))
              : 100;
          return (
            <div
              key={g.goalId ?? g.goalType}
              className="rounded-xl border border-[#ECEAF5] p-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-[#111110]">
                  {g.label ?? g.goalType}
                </p>
                <p className="shrink-0 text-sm font-bold tabular-nums text-[#534AB7]">
                  {inr(monthly)}/mo
                  {g.sharePct != null ? (
                    <span className="ml-1 text-xs font-semibold text-[#7A7871]">
                      {g.sharePct}%
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ECEAF5]">
                <div
                  className="h-full bg-[#534AB7]"
                  style={{ width: `${funded}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs font-medium text-[#454442]">
                Target {inr(g.targetAmount)} in {g.yearsToGoal}{" "}
                {g.yearsToGoal === 1 ? "year" : "years"} ·{" "}
                {funded >= 100
                  ? "fully funded"
                  : `${funded}% of the ${inr(g.monthlyRequired)}/mo needed`}
              </p>
              <p className="text-xs text-[#7A7871]">Instrument: {g.instrument}</p>
            </div>
          );
        })}
      </div>
      {shortfall > 0 ? (
        <p className="mt-3 text-xs font-medium leading-relaxed text-[#5F5E5A]">
          Another {inr(shortfall)}/month would fund every goal on time.
        </p>
      ) : null}
    </section>
  );
}
