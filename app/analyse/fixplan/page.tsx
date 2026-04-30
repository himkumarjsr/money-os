"use client";

import { downloadOptimizerPDF } from "@/lib/generatePDF";
import { canAccessFixPlan } from "@/lib/payment";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const LOADING_MESSAGES = [
  "Reading your profile...",
  "Calculating insurance gaps...",
  "Building debt strategy...",
  "Generating 12-month roadmap...",
  "Almost ready...",
];

export default function FixPlanPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useFinancialStore((s) => s.lastSubmission);
  const result = useFinancialStore((s) => s.result);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState("");
  const [aiPlan, setAiPlan] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length), 2500);
    return () => clearInterval(id);
  }, []);

  const loadFixPlan = async () => {
    if (!profile || !result) return;
    const { hashProfile, getCachedPlan, setCachedPlan } = await import("@/lib/cache");
    const currentHash = hashProfile(profile);
    const cached = getCachedPlan(currentHash);
    if (cached) {
      console.log("Using cached AI plan ✓");
      setAiPlan(cached.aiPlan);
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
      const combinedPlan = { priorityPlan: data.priorityPlan, explanations: data.explanations };
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
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const access = await canAccessFixPlan(user, supabase);
      if (!access.canAccess) {
        router.replace("/analyse/result");
        return;
      }
      if (mounted) void loadFixPlan();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const lastSubmission = profile;
  const aiData = aiPlan;

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      await downloadOptimizerPDF(
        lastSubmission,
        result,
        aiData?.priorityPlan,
        aiData?.explanations,
        {
          phases: [
            {
              phase: 1,
              title: "Month 1 — Foundation",
              subtitle: "Start your financial base",
              color: [226, 75, 74],
              tasks: ["Set up emergency fund autopilot", "Collect term/health insurance quotes", "Track monthly bucket usage"],
              outcomes: ["Safety baseline created"],
            },
            {
              phase: 2,
              title: "Month 2-3 — Protection",
              subtitle: "Close insurance and debt gaps",
              color: [186, 117, 23],
              tasks: ["Buy or top-up insurance", "Start debt acceleration", "Protect medical liquidity"],
              outcomes: ["Protection layer active"],
            },
            {
              phase: 3,
              title: "Month 4-9 — Build Wealth",
              subtitle: "Shift towards growth",
              color: [29, 158, 117],
              tasks: ["Increase SIP consistency", "Review spending drift monthly", "Grow emergency fund to target"],
              outcomes: ["Wealth engine running"],
            },
            {
              phase: 4,
              title: "Month 10-12 — Year End Review",
              subtitle: "Consolidate and upgrade",
              color: [83, 74, 183],
              tasks: ["Review yearly score progress", "Increase SIP by salary growth", "Re-run full analysis"],
              outcomes: ["Year 2 plan locked"],
            },
          ],
        },
      );
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
        <section className="rounded-2xl bg-gradient-to-r from-[#534AB7] to-[#6E62D7] p-5 text-white">
          <p className="text-xs uppercase tracking-wide text-white/80">Finkoin AI</p>
          <p className="mt-2 text-sm italic">{aiPlan.explanations?.greeting || "Your personalised plan is ready."}</p>
          <p className="mt-2 text-sm text-white/90">{aiPlan.explanations?.overallSummary || "This plan improves your score by prioritising safety, debt and growth in sequence."}</p>
        </section>

        {(aiPlan.priorityPlan?.priorities || []).map((p: any) => (
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
              <div className="rounded-lg bg-[#F7F7F4] p-2 text-sm">Monthly ₹{p.monthlyContribution?.toLocaleString("en-IN")}</div>
              <div className="rounded-lg bg-[#F7F7F4] p-2 text-sm">Timeline {p.monthsToComplete} months</div>
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
            {p.canBuyFromFinkoin ? (
              <button className="mt-3 rounded-lg bg-[#534AB7] px-3 py-2 text-sm font-semibold text-white">
                {p.id === "term_insurance" && p.status === "partial"
                  ? "Compare top-up term plans →"
                  : "Buy from Finkoin →"}
              </button>
            ) : null}
          </section>
        ))}

        {aiPlan.priorityPlan?.debts?.length > 0 ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold">Debt strategy</h3>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr><th className="px-3 py-2">Debt</th><th className="px-3 py-2">Outstanding</th><th className="px-3 py-2">EMI</th><th className="px-3 py-2">Extra/mo</th><th className="px-3 py-2">Months</th><th className="px-3 py-2">Rank</th></tr>
                </thead>
                <tbody>
                  {aiPlan.priorityPlan.debts.map((d: any) => (
                    <tr key={d.type} className="border-t border-slate-100"><td className="px-3 py-2">{d.type}</td><td className="px-3 py-2">₹{d.outstanding?.toLocaleString("en-IN")}</td><td className="px-3 py-2">₹{d.emi?.toLocaleString("en-IN")}</td><td className="px-3 py-2">₹{d.extraEMIRecommended?.toLocaleString("en-IN")}</td><td className="px-3 py-2">{d.monthsToClearWithExtra}</td><td className="px-3 py-2">{d.priorityRank}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm italic text-[#7A7871]">{aiPlan.explanations?.debtStrategy || "Clear high-interest debt first, then roll freed EMI into the next debt."}</p>
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
