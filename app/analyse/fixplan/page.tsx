"use client";

import { getCachedPlan, hashProfile, setCachedPlan } from "@/lib/cache";
import { downloadOptimizerPDF } from "@/lib/generatePDF";
import { buildPriorityPlan } from "@/lib/priorityEngine";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const fixPlanInFlight = new Map<string, Promise<void>>();

const LOADING_MESSAGES = [
  "Reading your profile...",
  "Calculating insurance gaps...",
  "Building debt strategy...",
  "Generating 12-month roadmap...",
  "Almost ready...",
];

export default function FixPlanPage() {
  const router = useRouter();
  const hasLoadedRef = useRef(false);
  const lastLoadKeyRef = useRef<string | null>(null);
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const profile = useFinancialStore((s) => s.lastSubmission);
  const result = useFinancialStore((s) => s.result);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState("");
  const [aiPlan, setAiPlan] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const monthsFromGap = (gap: number, monthly: number) =>
    monthly > 0 ? Math.max(1, Math.ceil(gap / monthly)) : 0;
  const monthsForPriority = (id: string, gap: number, monthly: number) => {
    if (id === "term_insurance" || id === "health_insurance") return 1;
    return monthsFromGap(gap, monthly);
  };

  useEffect(() => {
    const id = setInterval(() => setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length), 2500);
    return () => clearInterval(id);
  }, []);

  const loadFixPlan = useCallback(
    async (forceRefresh = false) => {
      if (!profile || !result) return;
      const currentHash = hashProfile(profile);
      const flowKey = `${currentHash}:${forceRefresh ? "f" : "n"}`;
      if (!forceRefresh) {
        const pending = fixPlanInFlight.get(flowKey);
        if (pending) {
          await pending;
          return;
        }
      }
      const run = (async () => {
    const cached = !forceRefresh ? getCachedPlan(currentHash) : null;
    if (cached) {
      console.log("Using cached AI plan ✓");
      const enginePriorityPlan = buildPriorityPlan(profile, result);
      const cachedPlan = cached.aiPlan || {};
      const mergedCachedPriority = {
        ...enginePriorityPlan,
        ...(cachedPlan.priorityPlan || {}),
        priorities: (enginePriorityPlan.priorities || []).map((p: any, idx: number) => {
          const cp = (cachedPlan.priorityPlan?.priorities || [])[idx] || {};
          const monthly = Math.max(0, Number(p.monthlyContribution || 0));
          const gap = Math.max(0, Number(p.gap || 0));
          const isComplete = gap <= 0 || monthly <= 0 || p.status === "complete";
          return {
            ...p,
            rank: p.rank,
            gap,
            monthlyContribution: monthly,
            monthlyRequired: Number(p.monthlyRequired || monthly),
            monthsToComplete: monthsForPriority(String(p.id || ""), gap, monthly),
            surplusBefore: Number(p.surplusBefore || 0),
            surplusAfterThis: Number(p.surplusAfterThis || 0),
            title: cp.title || p.title,
            instrument: isComplete ? p.instrument : (cp.instrument || p.instrument),
            actionThisWeek: isComplete ? "Maintain this completed bucket and continue monitoring monthly." : p.actionThisWeek,
            whyThisMatters: isComplete ? "This bucket is already on track. Keep it funded and shift new surplus to the next gap." : (cp.whyThisMatters || p.whyThisMatters),
          };
        }),
        debts: enginePriorityPlan.debts,
        goals: enginePriorityPlan.goals,
        monthlyIncome: enginePriorityPlan.monthlyIncome,
        monthlySurplus: enginePriorityPlan.monthlySurplus,
        surplusBreakdown: enginePriorityPlan.surplusBreakdown,
      };
      setAiPlan({
        ...cachedPlan,
        priorityPlan: mergedCachedPriority,
      });
      setAiLoading(false);
      return;
    }

    console.log("Calling AI (cache miss)...");
    setAiLoading(true);
    try {
      const response = await fetch("/api/ai/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, analysis: result }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI failed");
      const enginePriorityPlan = buildPriorityPlan(profile, result);
      const aiPriorityPlan = data.priorityPlan || {};
      const mergedPriorityPlan = {
        ...enginePriorityPlan,
        ...aiPriorityPlan,
        priorities: (enginePriorityPlan.priorities || []).map((p: any, idx: number) => {
          const aiP = (aiPriorityPlan.priorities || [])[idx] || {};
          const monthly = Math.max(0, Number(p.monthlyContribution || 0));
          const gap = Math.max(0, Number(p.gap || 0));
          const isComplete = gap <= 0 || monthly <= 0 || p.status === "complete";
          return {
            ...p,
            // keep deterministic numbers from engine as source of truth
            rank: p.rank,
            gap,
            monthlyContribution: monthly,
            monthlyRequired: Number(p.monthlyRequired || monthly),
            monthsToComplete: monthsForPriority(String(p.id || ""), gap, monthly),
            surplusBefore: Number(p.surplusBefore || 0),
            surplusAfterThis: Number(p.surplusAfterThis || 0),
            // allow AI to enhance text/instrument if provided
            title: aiP.title || p.title,
            instrument: isComplete ? p.instrument : (aiP.instrument || p.instrument),
            actionThisWeek: isComplete ? "Maintain this completed bucket and continue monitoring monthly." : p.actionThisWeek,
            whyThisMatters: isComplete ? "This bucket is already on track. Keep it funded and shift new surplus to the next gap." : (aiP.whyThisMatters || p.whyThisMatters),
          };
        }),
        debts: enginePriorityPlan.debts || aiPriorityPlan.debts || [],
        goals: enginePriorityPlan.goals || aiPriorityPlan.goals || [],
        monthlyIncome: enginePriorityPlan.monthlyIncome,
        monthlySurplus: enginePriorityPlan.monthlySurplus,
        surplusBreakdown: enginePriorityPlan.surplusBreakdown || aiPriorityPlan.surplusBreakdown,
      };
      const combinedPlan = { priorityPlan: mergedPriorityPlan, explanations: data.explanations, isFallback: !!data.isFallback };
      setCachedPlan(currentHash, combinedPlan, null);

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

  useEffect(() => {
    if (!hasInitialized) return;
    if (!isLoggedIn) {
      router.replace("/login?redirect=/analyse/fixplan");
      return;
    }
    let mounted = true;
    (async () => {
      const skipPayment = process.env.NEXT_PUBLIC_SKIP_PAYMENT === "true";

      if (skipPayment) {
        console.log("fixplan: skip payment enabled");
      } else {
        const hasAccess =
          user?.subscriptionTier === "pro" ||
          user?.subscriptionTier === "promax" ||
          user?.isAdmin;

        if (!hasAccess) {
          console.log("fixplan: no access, redirecting to result");
          router.replace("/analyse/result");
          return;
        }
      }
      if (!profile || !result) return;
      const loadKey = `${hashProfile(profile)}:${String((result as any)?.overallScore ?? "")}`;
      if (lastLoadKeyRef.current !== loadKey) {
        lastLoadKeyRef.current = loadKey;
        hasLoadedRef.current = false;
      }
      if (hasLoadedRef.current) return;
      hasLoadedRef.current = true;
      if (mounted) void loadFixPlan();
    })();
    return () => {
      mounted = false;
    };
  }, [hasInitialized, isLoggedIn, user?.subscriptionTier, user?.isAdmin, router, profile, result, loadFixPlan]);

  useEffect(() => {
    if (aiPlan?.isFallback) {
      const timer = setTimeout(async () => {
        await loadFixPlan(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [aiPlan?.isFallback, loadFixPlan]);

  const lastSubmission = profile;
  const aiData = aiPlan;
  const visiblePriorities = (aiPlan?.priorityPlan?.priorities || []).filter((p: any) => {
    const gap = Number(p?.gap || 0);
    const monthly = Number(p?.monthlyContribution || 0);
    return gap > 0 || monthly > 0;
  });
  const attentionCount = visiblePriorities.length;
  const monthlyPlanRows = aiPlan?.priorityPlan?.monthlyPlan || [];
  const showEmergencyCol = monthlyPlanRows.some((m: any) => Number(m?.emergency || 0) > 0);
  const showMedicalCol = monthlyPlanRows.some((m: any) => Number(m?.medical || 0) > 0);
  const showTermCol = monthlyPlanRows.some((m: any) => Number(m?.termYearly || 0) > 0);
  const showSipCol = monthlyPlanRows.some((m: any) => Number(m?.sip || 0) > 0);
  const showDebtCol = monthlyPlanRows.some((m: any) => Number(m?.extraDebt || 0) > 0);

  if (!hasInitialized) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#F7F7F4]">
        <div className="h-11 w-11 animate-spin rounded-full border-[3px] border-[#534AB7] border-t-transparent" />
        <p className="text-sm text-[#9B9A94]">Loading…</p>
      </div>
    );
  }

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const pp = aiData?.priorityPlan;
      const expl = aiData?.explanations;
      const pri = [...(pp?.priorities || [])].sort((a: any, b: any) => (a.rank || 0) - (b.rank || 0));
      const phase1Tasks = pri
        .filter((p: any) => p.rank === 1)
        .map((p: any) => `${p.title}: ${p.actionThisWeek || p.description || p.whyThisMatters || ""}`.trim());
      const phase2Tasks = pri
        .filter((p: any) => p.rank === 2 || p.rank === 3)
        .map((p: any) => `${p.title}${p.actionThisWeek ? ` — ${p.actionThisWeek}` : ""}`);
      const phase3Tasks = pri.filter((p: any) => (p.rank || 0) > 3).map((p: any) => p.title);
      const emerg = pri.find((p: any) => p.id === "emergency_fund");
      const term = pri.find((p: any) => p.id === "term_insurance");
      const health = pri.find((p: any) => p.id === "health_insurance");
      const keySnapshot = [
        `Monthly surplus: ₹${Math.round(pp?.monthlySurplus || 0).toLocaleString("en-IN")}`,
        ...(pp?.debts?.length
          ? (pp.debts as any[]).map(
              (d) =>
                `${d.displayName || d.type}: outstanding ₹${Number(d.outstanding || 0).toLocaleString("en-IN")} @ ${d.rate}% · EMI ₹${Number(d.emi || 0).toLocaleString("en-IN")}/mo · extra ₹${Number(d.extraEMIRecommended || 0).toLocaleString("en-IN")}/mo · ~${d.monthsToClearWithExtra || 0} mo to clear`,
            )
          : ["Debt: none in engine plan"]),
        emerg && Number(emerg.gap || 0) > 0
          ? `Emergency fund gap: ₹${Number(emerg.gap || 0).toLocaleString("en-IN")}`
          : null,
        term && Number(term.gap || 0) > 0
          ? `Term cover gap: ₹${Number(term.gap || 0).toLocaleString("en-IN")}`
          : null,
        health && Number(health.gap || 0) > 0
          ? `Health cover gap: ₹${Number(health.gap || 0).toLocaleString("en-IN")}`
          : null,
      ].filter(Boolean) as string[];

      const phases = [
        {
          phase: 1,
          title: "Phase 1 — Immediate (This Week)",
          subtitle: "Highest-ranked actions",
          color: [226, 75, 74] as [number, number, number],
          tasks: phase1Tasks.length > 0 ? phase1Tasks : ["Complete your financial review"],
          outcomes: [`Address top risk: ${pri[0]?.title || "safety and liquidity"}`],
        },
        {
          phase: 2,
          title: "Phase 2 — Short term (1–3 months)",
          subtitle: "Protection and foundation",
          color: [186, 117, 23] as [number, number, number],
          tasks: phase2Tasks.length > 0 ? phase2Tasks : ["Build financial foundation"],
          outcomes: [typeof expl?.in12Months === "string" ? expl.in12Months.slice(0, 160) : "Improved financial health"],
        },
        {
          phase: 3,
          title: "Phase 3 — Medium term (3–12 months)",
          subtitle: "Wealth and consistency",
          color: [29, 158, 117] as [number, number, number],
          tasks: phase3Tasks.length > 0 ? phase3Tasks : ["Grow wealth systematically"],
          outcomes: ["Financial independence on track"],
        },
        {
          phase: 4,
          title: "Phase 4 — Year end",
          subtitle: "Review and upgrade",
          color: [83, 74, 183] as [number, number, number],
          tasks: [
            "80C / tax-saving check — use actual salary and 80C numbers next run",
            "Re-analyse on Finkoin with updated balances",
            "Review insurance covers vs income",
          ],
          outcomes: ["Year 1 complete", "Year 2 plan ready"],
        },
      ];

      await downloadOptimizerPDF(lastSubmission, result, aiData?.priorityPlan, aiData?.explanations, {
        phases,
        keySnapshot,
      });
    } catch (err) {
      console.error("PDF error:", err);
    } finally {
      setDownloading(false);
    }
  };

  if (aiLoading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-[#534AB7] to-[#6E62D7] p-6">
        <div className="mx-auto flex min-h-[70dvh] max-w-3xl flex-col items-center justify-center text-white">
          <div className="mb-5 flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-white/20 text-2xl font-bold">FK</div>
          <p className="text-2xl font-bold">Building your personalised plan...</p>
          <p className="mt-3 text-sm text-white/90">{LOADING_MESSAGES[messageIndex]}</p>
          <div className="mt-6 h-1.5 w-full max-w-xl overflow-hidden rounded-full bg-white/20">
            <div className="h-full w-[90%] animate-pulse rounded-full bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (aiError || !aiPlan || !profile) {
    return <div className="min-h-dvh p-8">Unable to generate fix plan. {aiError}</div>;
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
          <p className="text-xs uppercase tracking-wide text-white/80">Finkoin AI</p>
          <p className="mt-2 text-sm italic">
            {attentionCount > 0
              ? `Based on your financial profile, we identified ${attentionCount} ${attentionCount === 1 ? "area" : "areas"} that need attention.`
              : "Your core safety and allocation buckets are currently on track."}
          </p>
          <p className="mt-2 text-sm text-white/90">{aiPlan.explanations?.overallSummary || "This plan improves your score by prioritising safety, debt and growth in sequence."}</p>
          <p className="mt-1 text-xs text-white/90">
            {aiPlan?.isFallback ? "ℹ️ Showing estimated plan — AI analysis will load shortly" : "✓ AI personalised analysis"}
          </p>
        </section>

        {aiPlan.priorityPlan?.surplusBreakdown ? (
          <details className="rounded-xl bg-[#F7F7F4] p-4 text-sm">
            <summary className="cursor-pointer font-semibold text-[#3C3489]">
              Your monthly surplus: ₹{Math.round(aiPlan.priorityPlan.surplusBreakdown.netSurplus || 0).toLocaleString("en-IN")}
              <span className="ml-2 font-normal text-[#9B9A94]">(tap to see breakdown)</span>
            </summary>
            <div className="mt-3 space-y-1 text-[#5F5E5A]">
              <div className="flex justify-between"><span>Monthly income</span><span className="font-medium">+₹{Math.round(aiPlan.priorityPlan.surplusBreakdown.totalIncome || 0).toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-[#8C3A3A]"><span>Living expenses (needs)</span><span>-₹{Math.round(aiPlan.priorityPlan.surplusBreakdown.needsActual || 0).toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-[#8C3A3A]"><span>Loan EMIs</span><span>-₹{Math.round(aiPlan.priorityPlan.surplusBreakdown.loansActual || 0).toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-[#8C3A3A]"><span>Insurance premiums</span><span>-₹{Math.round(aiPlan.priorityPlan.surplusBreakdown.existingInsurancePremiums || 0).toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-[#8C3A3A]"><span>Lifestyle / wants</span><span>-₹{Math.round(aiPlan.priorityPlan.surplusBreakdown.wantsActual || 0).toLocaleString("en-IN")}</span></div>
              <div className="mt-2 flex justify-between border-t border-[#E8E6F0] pt-2 font-bold text-[#1D9E75]">
                <span>Your available surplus</span>
                <span>₹{Math.round(aiPlan.priorityPlan.surplusBreakdown.netSurplus || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </details>
        ) : null}

        {visiblePriorities
          .filter((p: any) => !["emergency_fund", "medical_fund", "term_insurance", "start_sip"].includes(String(p.id)))
          .map((p: any) => (
          <section key={p.id} className={`rounded-2xl border-l-4 bg-white p-4 shadow-sm ${(p.id === "term_insurance" && p.status === "partial" ? "high" : p.urgency) === "critical" ? "border-[#E24B4A]" : (p.id === "term_insurance" && p.status === "partial" ? "high" : p.urgency) === "high" ? "border-[#BA7517]" : "border-[#1D9E75]"}`}>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#EEEDFE] text-sm text-[#534AB7]">{p.rank}</span>
                <span>{p.id === "term_insurance" && p.status === "partial" ? "Consider term top-up plan" : p.title}</span>
              </h3>
              <span className="rounded-full bg-[#F7F6FE] px-2 py-1 text-xs uppercase text-[#534AB7]">{p.id === "term_insurance" && p.status === "partial" ? "high" : p.urgency}</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-[#F7F7F4] p-2 text-sm">Gap ₹{p.gap?.toLocaleString("en-IN")}</div>
              <div className="rounded-lg bg-[#F7F7F4] p-2 text-sm">
                Monthly ₹{p.monthlyContribution?.toLocaleString("en-IN")}
                <p className="mt-0.5 text-xs text-gray-500">
                  From your ₹{Math.round(aiPlan.priorityPlan?.monthlySurplus || 0).toLocaleString("en-IN")} surplus
                  {" · "}₹{Math.round(p.surplusAfterThis || 0).toLocaleString("en-IN")} left after this step
                </p>
              </div>
              <div className="rounded-lg bg-[#F7F7F4] p-2 text-sm">Timeline {monthsForPriority(String(p.id || ""), Number(p.gap || 0), Number(p.monthlyContribution || 0))} months</div>
            </div>
            <p className="mt-2 text-sm text-[#534AB7]">Where to invest: {p.instrument || "As recommended in your plan"}</p>
            <p className="mt-2 text-sm italic text-[#7A7871]">
              {p.id === "term_insurance" && p.status === "partial"
                ? `You have ₹${((p.currentAmount || 0) / 10000000).toFixed(1)}Cr term cover which is good. For your current income and family situation, ₹${((p.targetAmount || 0) / 10000000).toFixed(1)}Cr is recommended. IMPORTANT: Do NOT cancel your existing policy. Instead buy a separate top-up or additional term plan from a different insurer. This costs less than a new full policy and gives you the extra coverage needed.`
                : aiPlan.explanations?.priorityExplanations?.[p.id] || p.whyThisMatters}
            </p>
            <p className="mt-2 rounded-xl bg-[#E7F6F4] p-3 text-sm">
              <strong>This week:</strong> {p.actionThisWeek}
            </p>
            {(p.id === "term_insurance" || p.id === "health_insurance") ? (
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
            <h3 className="text-lg font-semibold">Surplus Allocation Summary</h3>
            <div className="mt-3 space-y-1 text-sm text-[#5F5E5A]">
              <div className="flex justify-between font-medium">
                <span>Your surplus</span>
                <span>₹{Math.round(aiPlan.priorityPlan.monthlySurplus || 0).toLocaleString("en-IN")}</span>
              </div>
              {visiblePriorities.map((p: any, idx: number) => (
                <div key={`surplus-line-${p.id}-${idx}`} className="flex justify-between">
                  <span>Step {idx + 1} — {p.title}</span>
                  <span>-₹{Math.round(p.monthlyContribution || 0).toLocaleString("en-IN")}</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between border-t border-[#E8E6F0] pt-2 font-bold text-[#1D9E75]">
                <span>Remaining buffer</span>
                <span>₹{Math.round(aiPlan.priorityPlan?.surplusBreakdown?.afterAllPriorities ?? 0).toLocaleString("en-IN")}</span>
              </div>
              <p className="text-xs text-[#9B9A94]">(Available for debt extra payment + future SIP)</p>
            </div>
          </section>
        ) : null}

        {monthlyPlanRows.length > 0 ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold">Month-wise execution plan (12 months)</h3>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Month</th>
                    {showEmergencyCol ? <th className="px-3 py-2">Emergency</th> : null}
                    {showMedicalCol ? <th className="px-3 py-2">Medical</th> : null}
                    {showTermCol ? <th className="px-3 py-2">Term (yearly)</th> : null}
                    {showSipCol ? <th className="px-3 py-2">SIP</th> : null}
                    {showDebtCol ? <th className="px-3 py-2">Extra debt</th> : null}
                    <th className="px-3 py-2">Remaining</th>
                    <th className="px-3 py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyPlanRows.map((m: any) => (
                    <tr key={`month-plan-${m.month}`} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium">{m.month}</td>
                      {showEmergencyCol ? <td className="px-3 py-2">₹{Math.round(m.emergency || 0).toLocaleString("en-IN")}</td> : null}
                      {showMedicalCol ? <td className="px-3 py-2">₹{Math.round(m.medical || 0).toLocaleString("en-IN")}</td> : null}
                      {showTermCol ? <td className="px-3 py-2">₹{Math.round(m.termYearly || 0).toLocaleString("en-IN")}</td> : null}
                      {showSipCol ? <td className="px-3 py-2">₹{Math.round(m.sip || 0).toLocaleString("en-IN")}</td> : null}
                      {showDebtCol ? <td className="px-3 py-2">₹{Math.round(m.extraDebt || 0).toLocaleString("en-IN")}</td> : null}
                      <td className="px-3 py-2">₹{Math.round(m.remaining || 0).toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2 text-xs text-slate-600">{m.note}</td>
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
                    const extraPayment = Number(debt.extraEMIRecommended || 0);
                    const rateM = (Number(debt.rate || debt.interestRate || 12) / 100) / 12;
                    const outstanding = Number(debt.outstanding || debt.balance || 0);
                    const currentEMI = Number(debt.emi || debt.monthlyEMI || 0);
                    const totalPayment = currentEMI + extraPayment;
                    const monthsNow =
                      extraPayment > 0 && totalPayment > 0 && rateM > 0 && outstanding > 0
                        ? Math.ceil(
                            -Math.log(1 - (rateM * outstanding) / totalPayment) / Math.log(1 + rateM),
                          )
                        : Number(debt.monthsToClearWithExtra || 0);
                    const monthsOriginal =
                      currentEMI > 0 && rateM > 0 && outstanding > 0
                        ? Math.ceil(
                            -Math.log(1 - (rateM * outstanding) / currentEMI) / Math.log(1 + rateM),
                          )
                        : 0;
                    const monthsSaved = Math.max(0, monthsOriginal - monthsNow);
                    const interestSaved = Math.round(
                      extraPayment > 0
                        ? Math.max(0, Number(debt.extraEMIRecommended || 0)) *
                            Math.max(0, Number(debt.monthsToClearWithExtra || 0)) *
                            0.35
                        : 0,
                    );
                    const label = debt.displayName || debt.label || debt.name || debt.type;
                    return (
                      <div
                        key={`${debt.type}-${i}`}
                        style={{
                          padding: "14px 16px",
                          borderBottom: i < debts.length - 1 ? "1px solid #F7F7F4" : "none",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 10,
                          }}
                        >
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#111110" }}>{label}</div>
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
                              ["Outstanding", `₹${outstanding.toLocaleString("en-IN")}`],
                              ["Current EMI", `₹${currentEMI.toLocaleString("en-IN")}/mo`],
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
                              <div style={{ fontSize: 10, color: "#9B9A94", marginBottom: 3 }}>{lbl}</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}>{value}</div>
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
                              Clear in {monthsNow || debt.monthsToClearWithExtra || 0} months
                              {monthsSaved > 0 ? ` (save ${monthsSaved} months vs EMI-only)` : ""}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#1D9E75" }}>
                              Save ₹{interestSaved.toLocaleString("en-IN")} (est.)
                            </span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <p className="mt-1 text-sm italic text-[#7A7871]">
              {aiPlan.explanations?.debtStrategy || "Clear high-interest debt first, then roll freed EMI into the next debt."}
            </p>
          </section>
        ) : null}

        {aiPlan.priorityPlan?.goals?.[0] ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold">Goal plan</h3>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ECEAF5]">
              <div
                className="h-full bg-[#534AB7]"
                style={{ width: `${Math.min(100, (aiPlan.priorityPlan.goals[0].currentSaved / Math.max(aiPlan.priorityPlan.goals[0].targetAmount, 1)) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-sm">Target ₹{aiPlan.priorityPlan.goals[0].targetAmount?.toLocaleString("en-IN")} · Saved ₹{aiPlan.priorityPlan.goals[0].currentSaved?.toLocaleString("en-IN")}</p>
            <p className="text-sm text-[#534AB7]">Monthly required ₹{aiPlan.priorityPlan.goals[0].monthlyRequired?.toLocaleString("en-IN")} · Timeline {aiPlan.priorityPlan.goals[0].yearsToGoal} years</p>
            <p className="text-sm text-[#7A7871]">Instrument: {aiPlan.priorityPlan.goals[0].instrument}</p>
          </section>
        ) : null}

        {profile ? (
          (() => {
            const scoreToday = aiData?.priorityPlan?.scoreToday || 0;
            const scoreAfter = aiData?.priorityPlan?.scoreAfter12Months || 0;
            const scoreGain = scoreAfter - scoreToday;
            const getScoreColor = (s: number) => (s < 40 ? "#E24B4A" : s < 70 ? "#BA7517" : "#1D9E75");
            const getScoreBg = (s: number) => (s < 40 ? "#FCEBEB" : s < 70 ? "#FAEEDA" : "#E1F5EE");

            return (
              <div style={{ border: "1px solid #E8E6F0", borderRadius: 16, padding: "20px 24px", marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111110", marginBottom: 4 }}>Score projection</div>
                <div style={{ fontSize: 13, color: "#9B9A94", marginBottom: 24 }}>Follow this plan for 12 months</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#9B9A94", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Today</div>
                    <div style={{ width: 80, height: 80, borderRadius: "50%", background: getScoreBg(scoreToday), border: `3px solid ${getScoreColor(scoreToday)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: getScoreColor(scoreToday), lineHeight: 1 }}>{scoreToday}</div>
                      <div style={{ fontSize: 10, color: "#9B9A94" }}>/100</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 28, color: "#534AB7", lineHeight: 1 }}>→</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1D9E75", marginTop: 6 }}>+{scoreGain} pts</div>
                    <div style={{ fontSize: 11, color: "#9B9A94", marginTop: 2 }}>in 12 months</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#9B9A94", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Month 12</div>
                    <div style={{ width: 80, height: 80, borderRadius: "50%", background: getScoreBg(scoreAfter), border: `3px solid ${getScoreColor(scoreAfter)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: getScoreColor(scoreAfter), lineHeight: 1 }}>{scoreAfter}</div>
                      <div style={{ fontSize: 10, color: "#9B9A94" }}>/100</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        ) : null}

        {aiPlan.priorityPlan?.fdSuggestion ? (
          <section className="rounded-2xl border border-[#E8E6F0] bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold">FD opportunity</h3>
            <p className="mt-2 text-sm text-[#5F5E5A]">{aiPlan.priorityPlan.fdSuggestion.message}</p>
            <button className="mt-3 rounded-lg bg-[#534AB7] px-3 py-2 text-sm font-semibold text-white">
              {aiPlan.priorityPlan.fdSuggestion.cta}
            </button>
          </section>
        ) : null}

        <section className="rounded-2xl border border-[#E7D7A7] bg-[#FFF4D8] p-4">
          <p className="text-xs font-semibold uppercase text-[#BA7517]">Do this first — this week</p>
          <p className="mt-1 text-sm text-[#5F5E5A]">{aiPlan.explanations?.thisWeekAction || aiPlan.priorityPlan?.topAction}</p>
        </section>

        <section className="rounded-2xl border border-[#CBEBDD] bg-[#E8F6F1] p-4">
          <p className="text-sm text-[#1D9E75]">{aiPlan.explanations?.encouragement || "You have already taken the hardest step by starting. Stay consistent and your score will improve."}</p>
        </section>

        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="h-12 w-full rounded-xl border border-[#534AB7] bg-white font-bold text-[#534AB7] disabled:opacity-70"
        >
          {downloading ? "Generating PDF..." : "📄 Download full report PDF"}
        </button>

        <p className="pb-4 text-center text-xs text-[#9B9A94]">Educational guidance only. Not SEBI registered investment advice.</p>
      </div>
    </div>
  );
}
