"use client";

import { PaywallModal } from "@/components/analyse/paywall-modal";
import SpeedoMeter from "@/components/ui/SpeedoMeter";
import { buildSpeedoMeterProps } from "@/lib/speedo-meter-buckets";
import { canBypassProPaywall } from "@/lib/subscriptionBypass";
import { Button } from "@/components/ui/button";
import { AnalyseResultErrorBoundary } from "@/components/analyse/analyse-result-error-boundary";
import {
  CITY_TIER_LABELS,
  LIFE_STAGE_LABELS,
  PRIMARY_GOAL_LABELS,
  type FinancialProfile,
  type LifeStage,
  type PrimaryGoal,
} from "@/lib/analyse-form-schema";
import { getBucketBreakdown } from "@/lib/bucket-breakdown";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/finance";
import { formatInWords, formatIndian } from "@/lib/formatters";
import { FinkoinAiPlanView } from "@/components/finkoin/finkoin-ai-plan-view";
import { getAIFixPlan, type FinkoinAIPlan } from "@/lib/aiService";
import {
  analyseFinances,
  getDebtSafeLimitPercent,
  getSavingsTargetPercent,
  monthlyTotalIncome,
  type AnalysisResult,
} from "@/lib/financialEngine";
import {
  buildNetWorth,
  getNetWorthStanding,
  netWorthMetricTones,
  netWorthSectionTone,
} from "@/lib/netWorth";
import { formatPolicyCover } from "@/lib/userPolicies";
import { buildOptimizerAnalysisFromProfile, optimizeFinances } from "@/lib/financialOptimizer";
import { getUnallocatedIncome, getUniversalBucketRows } from "@/lib/universal-buckets";
import { fadeUp, scaleIn, slideInLeft, staggerContainer } from "@/lib/animations";
import { supabase } from "@/lib/supabaseClient";
import { fetchUserAnalyseSnapshot } from "@/lib/userAnalyseSnapshot";
import { useFinancialStore } from "@/store/use-financial-store";
import { useAuthStore } from "@/store/authStore";
import { useGamificationStore } from "@/store/gamificationStore";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isValidStoredAnalysis } from "@/lib/analysisSnapshotValidation";
import { Fragment, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";

/** Free users see this many fix-plan steps before the ₹49 unlock. */
const FREE_FIX_PLAN_STEPS = 2;

function toneBarClass(t: "red" | "amber" | "green") {
  if (t === "green") return "border-emerald-500/80 bg-emerald-50";
  if (t === "amber") return "border-amber-400 bg-amber-50";
  return "border-red-500/80 bg-red-50";
}

function toneTextClass(t: "red" | "amber" | "green") {
  if (t === "green") return "text-emerald-800";
  if (t === "amber") return "text-amber-900";
  return "text-red-800";
}

function lowerIsBetterTone(value: number, cap: number): "red" | "amber" | "green" {
  if (value <= cap + 1e-6) return "green";
  if (value <= cap * 1.15) return "amber";
  return "red";
}

function untrackedTone(
  untracked: number,
  income: number,
): "red" | "amber" | "green" {
  if (income <= 0) return "amber";
  const abs = Math.abs(untracked);
  if (abs <= income * 0.1 + 1e-6) return "green";
  if (abs <= income * 0.2) return "amber";
  return "red";
}

function statusIcon(status: "ok" | "warning" | "critical" | "na") {
  if (status === "ok") return { label: "✓", className: "bg-emerald-500 text-white" };
  if (status === "warning") return { label: "!", className: "bg-amber-400 text-white" };
  if (status === "critical") return { label: "✗", className: "bg-red-500 text-white" };
  return { label: "—", className: "bg-slate-300 text-slate-700" };
}

function ResultPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#F7F7F4] text-slate-900">
      <header className="border-b border-[#F0EFF8] bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <Link href="/analyse" className="text-sm text-[#9B9A94] hover:text-slate-700">
              ← Back to form
            </Link>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-[#111110] sm:text-2xl">
              Your financial health report
            </h1>
          </div>
          <Link href="/" className="text-sm font-medium text-[#534AB7] hover:underline sm:self-start">
            Home
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}

function NoSubmissionEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-2xl bg-white px-6 py-14 text-center shadow-sm">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full bg-[#EEEDFE] text-3xl"
        aria-hidden
      >
        📊
      </div>
      <h2 className="text-xl font-bold text-[#111110]">No analysis found</h2>
      <p className="max-w-sm text-[15px] text-[#9B9A94]">
        Complete the financial health form to see your personalised report.
      </p>
      <Link
        href="/analyse"
        className="rounded-xl bg-[#534AB7] px-8 py-3 text-[15px] font-semibold text-white no-underline"
      >
        Start my analysis →
      </Link>
    </div>
  );
}

function AnalysisComputeFailed() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-12 text-center">
      <h2 className="text-lg font-semibold text-slate-900">Couldn&apos;t build your report</h2>
      <p className="max-w-md text-sm text-slate-600">
        We saved your answers but the analysis step failed. Go back, check required fields, and try submitting again.
      </p>
      <Link href="/analyse" className="font-semibold text-[#534AB7] underline">
        Return to the form
      </Link>
    </div>
  );
}

function AnalyseResultMain({
  data,
  analysis,
}: {
  data: FinancialProfile;
  analysis: AnalysisResult;
}) {
  const router = useRouter();
  const tier = useAuthStore((s) => s.subscriptionTier);
  const user = useAuthStore((s) => s.user);
  const setSubscription = useAuthStore((s) => s.setSubscription);
  const bypassPaywall = canBypassProPaywall(user?.email, user?.isAdmin);
  const cachedAiPlan = useFinancialStore((s) => s.aiPlan);
  const earnTokens = useGamificationStore((s) => s.earnTokens);
  const awardBadge = useGamificationStore((s) => s.awardBadge);
  const hasEarnedAction = useGamificationStore((s) => s.hasEarnedAction);
  const markEarnedAction = useGamificationStore((s) => s.markEarnedAction);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [aiPlan, setAiPlan] = useState<FinkoinAIPlan | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const toggleRow = (category: string) => {
    setExpandedRows((prev) =>
      prev.includes(category) ? prev.filter((r) => r !== category) : [...prev, category],
    );
  };

  const income = monthlyTotalIncome(data);
  const savingsTarget = getSavingsTargetPercent(data);
  const debtLimit = getDebtSafeLimitPercent();
  const bucketRows = getUniversalBucketRows(data);
  const unallocated = getUnallocatedIncome(data);
  const netWorth = useMemo(() => buildNetWorth(data), [data]);
  const netWorthStanding =
    data && netWorth ? getNetWorthStanding(data.selfAge, netWorth.netWorth) : null;

  useEffect(() => {
    if (hasEarnedAction("analysis-complete")) return;
    earnTokens(50, "Financial analysis complete");
    awardBadge("money-starter");
    markEarnedAction("analysis-complete");
  }, [analysis, awardBadge, earnTokens, hasEarnedAction, markEarnedAction]);

  const healthScore = Math.max(
    0,
    100 -
      analysis.issues.filter((i) => i.severity === "critical").length * 15 -
      analysis.issues.filter((i) => i.severity === "warning").length * 7,
  );

  useEffect(() => {
    let rafId = 0;
    let startTime = 0;
    const duration = 1200;
    const tick = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      setAnimatedScore(Math.round(healthScore * progress));
      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [healthScore]);

  useEffect(() => {
    if (tier === "free") return;
    if (cachedAiPlan) {
      setAiPlan(cachedAiPlan);
      setAiNotice(null);
      setAiLoading(false);
      return;
    }
    let cancelled = false;
    setAiLoading(true);
    void getAIFixPlan(data, analysis)
      .then(({ plan, notice }) => {
        if (!cancelled) {
          setAiPlan(plan);
          setAiNotice(notice);
        }
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [analysis, cachedAiPlan, data, tier]);

  const sTone = lowerIsBetterTone(analysis.scores.savingsRate, savingsTarget);
  const dTone = lowerIsBetterTone(analysis.scores.debtRatio, debtLimit);
  const uTone = untrackedTone(analysis.scores.untrackedCash, income);
  const checklistOkCount = analysis.securityChecklist.filter((item) => item.status === "ok" || item.status === "na").length;
  const checklistTotal = analysis.securityChecklist.filter((item) => item.status !== "na").length;
  const checklistPct =
    checklistTotal > 0 ? Math.round((checklistOkCount / checklistTotal) * 100) : 0;
  const optimizerPlan = useMemo(
    () => optimizeFinances(data, buildOptimizerAnalysisFromProfile(data)),
    [data],
  );
  return (
    <>
      <main className="space-y-10 sm:space-y-12">
        <div>
          <p className="text-sm font-medium text-[#534AB7]">Health report</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Your financial health
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            {LIFE_STAGE_LABELS[data.lifeStage as LifeStage]} · {CITY_TIER_LABELS[data.cityTier]} · Goal:{" "}
            {PRIMARY_GOAL_LABELS[data.primaryGoal as PrimaryGoal]}
          </p>
        </div>

        {netWorth ? (
          <section
            aria-label="Net worth summary"
            className={cn("rounded-3xl border p-6 shadow-sm", netWorthSectionTone(netWorth.netWorth))}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide">Live net worth summary</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className={cn("min-w-0 rounded-2xl border p-4", netWorthMetricTones.assets)}>
                <p className="text-xs font-semibold uppercase tracking-wide">Total assets</p>
                <div className="mt-2 overflow-x-auto [-webkit-overflow-scrolling:touch]">
                  <p className="text-2xl font-semibold tabular-nums tracking-tight whitespace-nowrap sm:text-3xl">
                    {formatCurrency(netWorth.assets, "en-IN", "INR", 0)}
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-[#9B9A94]">{formatInWords(netWorth.assets)}</p>
                </div>
              </div>
              <div className={cn("min-w-0 rounded-2xl border p-4", netWorthMetricTones.liabilities)}>
                <p className="text-xs font-semibold uppercase tracking-wide">Total liabilities</p>
                <div className="mt-2 overflow-x-auto [-webkit-overflow-scrolling:touch]">
                  <p className="text-2xl font-semibold tabular-nums tracking-tight whitespace-nowrap sm:text-3xl">
                    {formatCurrency(netWorth.liabilities, "en-IN", "INR", 0)}
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-[#9B9A94]">{formatInWords(netWorth.liabilities)}</p>
                </div>
              </div>
              <div
                className={cn(
                  "min-w-0 rounded-2xl border p-4",
                  netWorth.netWorth >= 0
                    ? netWorthMetricTones.netPositive
                    : netWorthMetricTones.netNegative,
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-wide">Net worth</p>
                <div className="mt-2 overflow-x-auto [-webkit-overflow-scrolling:touch]">
                  <p className="text-2xl font-semibold tabular-nums tracking-tight whitespace-nowrap sm:text-3xl">
                    {formatCurrency(netWorth.netWorth, "en-IN", "INR", 0)}
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-[#9B9A94]">
                    {netWorth.netWorth < 0
                      ? `Negative ${formatInWords(netWorth.netWorth)}`
                      : formatInWords(netWorth.netWorth)}
                  </p>
                </div>
              </div>
            </div>
            {netWorthStanding ? (
              <p className="mt-4 text-sm opacity-90">{netWorthStanding}</p>
            ) : null}
          </section>
        ) : null}

        <section aria-label="Key metrics">
          <motion.article variants={scaleIn} initial="hidden" animate="visible" className="mb-4 rounded-2xl bg-[#534AB7] p-6 text-white">
            <p className="text-sm uppercase tracking-wide text-white/80">Health score</p>
            <p className="mt-2 text-4xl font-bold">{animatedScore}/100</p>
          </motion.article>
          <motion.div className="grid grid-cols-1 gap-4 md:grid-cols-3" variants={staggerContainer} initial="hidden" animate="visible">
            <motion.article variants={scaleIn} className={cn("rounded-2xl border-l-4 p-5 shadow-sm", toneBarClass(sTone))}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Monthly investment rate
              </p>
              <p className={cn("mt-2 text-3xl font-semibold tabular-nums", toneTextClass(sTone))}>
                {analysis.scores.savingsRate.toFixed(1)}%
              </p>
              <p className="mt-2 text-xs text-slate-600">
                of monthly take-home income
              </p>
            </motion.article>

            <motion.article variants={scaleIn} className={cn("rounded-2xl border-l-4 p-5 shadow-sm", toneBarClass(dTone))}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Loan ratio
              </p>
              <p className={cn("mt-2 text-3xl font-semibold tabular-nums", toneTextClass(dTone))}>
                {analysis.scores.debtRatio.toFixed(1)}%
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Universal cap {debtLimit}% of income
              </p>
            </motion.article>

            <motion.article variants={scaleIn} className={cn("rounded-2xl border-l-4 p-5 shadow-sm", toneBarClass(uTone))}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {analysis.scores.untrackedCash < 0 ? "Overspending" : "Unallocated"}
              </p>
              <p className={cn("mt-2 text-2xl font-semibold tabular-nums sm:text-3xl", toneTextClass(uTone))}>
                {formatCurrency(analysis.scores.untrackedCash, "en-IN", "INR", 0)}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                {analysis.scores.untrackedCash < 0
                  ? `Spending exceeds income by ${formatCurrency(Math.abs(analysis.scores.untrackedCash), "en-IN", "INR", 0)}/month`
                  : "Assign to a savings bucket"}
              </p>
            </motion.article>
          </motion.div>
        </section>

        <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Monthly allocation breakdown</h2>
          <p className="mt-1 text-[13px] italic text-[#9B9A94]">Click any row to see what is included</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium">Cap %</th>
                  <th className="pb-3 font-medium">Cap ₹</th>
                  <th className="pb-3 font-medium">Actual ₹</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <motion.tbody variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                {bucketRows.map((row) => {
                  const breakdown = getBucketBreakdown(row.key, data);
                  const expandable = breakdown.length > 0;
                  const isOpen = expandedRows.includes(row.key);
                  return (
                    <Fragment key={row.key}>
                      <motion.tr
                        variants={fadeUp}
                        onClick={expandable ? () => toggleRow(row.key) : undefined}
                        aria-expanded={expandable ? isOpen : undefined}
                        className={cn(
                          "border-b border-slate-100 last:border-b-0",
                          expandable ? "cursor-pointer select-none hover:bg-slate-50/80" : "",
                        )}
                      >
                        <td className="py-3 font-medium text-slate-900">
                          <span className="inline-flex items-center gap-2">
                            {expandable ? (
                              <span className="w-3 shrink-0 text-center text-xs text-slate-400" aria-hidden>
                                {isOpen ? "▼" : "▶"}
                              </span>
                            ) : (
                              <span className="w-3 shrink-0" aria-hidden />
                            )}
                            {row.label}
                          </span>
                        </td>
                        <td className="py-3">
                          <span>{row.capLabel ?? `${Math.round(row.capPercent * 100)}%`}</span>
                          {row.capHelper ? (
                            <p className="mt-1 text-xs text-slate-500">{row.capHelper}</p>
                          ) : null}
                        </td>
                        <td className="py-3">{formatCurrency(row.capAmount, "en-IN", "INR", 0)}</td>
                        <td
                          className={cn(
                            "py-3 font-medium",
                            row.status === "good" ? "text-emerald-700" : "text-red-600",
                          )}
                        >
                          {formatCurrency(row.actual, "en-IN", "INR", 0)}
                        </td>
                        <td
                          className={cn(
                            "py-3 font-medium capitalize",
                            row.status === "good" ? "text-emerald-700" : "text-red-600",
                          )}
                        >
                          {row.status}
                        </td>
                      </motion.tr>
                      {isOpen && expandable ? (
                        <tr className="border-b border-slate-100 bg-[#FAFAFE]">
                          <td colSpan={5} className="p-0">
                            {breakdown.map((item, idx) => (
                              <div
                                key={`${row.key}-${idx}-${item.label}`}
                                className="flex justify-between py-1 pl-8 pr-4 text-[13px] text-[#5F5E5A]"
                              >
                                <span>{item.label}</span>
                                <span className="tabular-nums">₹{formatIndian(item.value)}</span>
                              </div>
                            ))}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
                <motion.tr variants={fadeUp}>
                  <td className="py-3 font-medium text-slate-600">Unallocated</td>
                  <td className="py-3 text-slate-400">—</td>
                  <td className="py-3 text-slate-400">—</td>
                  <td className={cn("py-3 font-medium", unallocated >= 0 ? "text-slate-500" : "text-red-600")}>
                    {formatCurrency(unallocated, "en-IN", "INR", 0)}
                  </td>
                  <td className="py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                        unallocated >= 0
                          ? "bg-slate-100 text-slate-600"
                          : "bg-red-100 text-red-700",
                      )}
                    >
                      {unallocated >= 0 ? "Free" : "Over limit"}
                    </span>
                  </td>
                </motion.tr>
              </motion.tbody>
            </table>
          </div>
        </motion.section>

        <SpeedoMeter {...buildSpeedoMeterProps(data)} title="Your financial health gauges" />

        <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Your financial safety net</h2>
              <p className="mt-1 text-sm text-slate-600">
                Emergency fund, medical cover, term cover, premium reserve, child goals, SSY (if eligible), NSC holding (one-time certificate, if you use it), plus family-specific items below.
              </p>
            </div>
          </div>

          {data.hasTermInsurance && (data.termInsuranceSumAssured ?? 0) > 0 ? (
            <div className="mt-4 rounded-2xl border border-[#E8E6F0] bg-[#FAFAFE] p-4">
              <p className="text-sm font-medium text-slate-900">
                You have {formatPolicyCover(data.termInsuranceSumAssured ?? 0)} term cover
              </p>
              <Link
                href={`/policies?add=term&cover=${encodeURIComponent(String(data.termInsuranceSumAssured ?? 0))}&premium=${encodeURIComponent(String(data.termInsurancePremiumInput ?? 0))}&freq=${encodeURIComponent(data.termInsurancePremiumFrequency ?? "monthly")}`}
                className="mt-2 inline-block text-sm font-semibold text-[#534AB7] hover:underline"
              >
                Add to policy vault →
              </Link>
            </div>
          ) : null}
          {data.hasHealthInsurance && (data.healthInsuranceSumInsured ?? 0) > 0 ? (
            <div className="mt-3 rounded-2xl border border-[#E8E6F0] bg-[#FAFAFE] p-4">
              <p className="text-sm font-medium text-slate-900">
                You have {formatPolicyCover(data.healthInsuranceSumInsured ?? 0)} health cover
              </p>
              <Link
                href={`/policies?add=health&cover=${encodeURIComponent(String(data.healthInsuranceSumInsured ?? 0))}&premium=${encodeURIComponent(String(data.healthInsurancePremiumInput ?? 0))}&freq=${encodeURIComponent(data.healthInsurancePremiumFrequency ?? "monthly")}`}
                className="mt-2 inline-block text-sm font-semibold text-[#534AB7] hover:underline"
              >
                Track renewal →
              </Link>
            </div>
          ) : null}

          <motion.div className="mt-5 space-y-3" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {analysis.securityChecklist.map((item) => {
              const icon = statusIcon(item.status);
              return (
                <motion.div
                  variants={slideInLeft}
                  key={item.label}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        icon.className,
                      )}
                    >
                      {icon.label}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        {item.checklistIcon ? (
                          <span className="mr-1.5" aria-hidden>
                            {item.checklistIcon}
                          </span>
                        ) : null}
                        {item.label}
                      </p>
                      {item.checklistValue ? (
                        <p className="mt-1 text-base font-semibold text-slate-800">{item.checklistValue}</p>
                      ) : null}
                      <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                      {item.breakdownHint ? (
                        <p className="mt-1 text-xs text-slate-500">{item.breakdownHint}</p>
                      ) : null}
                    </div>
                  </div>
                  {item.actionNeeded ? (
                    <button
                      type="button"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                    >
                      {item.actionNeeded}
                    </button>
                  ) : null}
                </motion.div>
              );
            })}
          </motion.div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">
              {checklistOkCount} of {checklistTotal} applicable security items in place
            </p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${checklistPct}%` }}
              />
            </div>
          </div>
        </motion.section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Your financial fix plan</h2>
          <p className="mt-2 text-sm text-slate-600">
            {tier === "free"
              ? "First steps are free. Unlock the rest for ₹49/month — deepen your health score with AI-guided fixes or a Finkoin expert."
              : "Full prioritised roadmap from your answers and the income meter."}
          </p>
          {tier === "free" ? (
            <div className="mt-4 space-y-6">
              <ul className="list-disc space-y-2 pl-5 text-sm text-slate-800">
                {analysis.planSteps.slice(0, FREE_FIX_PLAN_STEPS).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
              {analysis.planSteps.length > FREE_FIX_PLAN_STEPS ? (
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <ul
                    className="pointer-events-none select-none space-y-2 p-5 pl-9 text-sm text-slate-600 blur-[3px] opacity-45"
                    aria-hidden
                  >
                    {analysis.planSteps.slice(FREE_FIX_PLAN_STEPS).map((step) => (
                      <li key={step} className="list-disc">
                        {step}
                      </li>
                    ))}
                  </ul>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-white/25 via-white/85 to-white p-6 text-center">
                    <p className="text-sm font-semibold text-slate-900">
                      +{analysis.planSteps.length - FREE_FIX_PLAN_STEPS} more steps — unlock full plan
                    </p>
                    <p className="max-w-md text-xs text-slate-600">
                      Pay ₹49/month for the complete fix plan. Improve your financial health score with AI recommendations or book time with a Finkoin expert.
                    </p>
                    <div className="flex flex-col items-center gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => {
                          if (bypassPaywall) {
                            setSubscription("pro");
                            return;
                          }
                          setPaywallOpen(true);
                        }}
                      >
                        Unlock — ₹49
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => router.push("/plans")}>
                        View plans
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : aiLoading ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Groq AI is building your personalised plan…
            </div>
          ) : aiPlan ? (
            <div className="mt-4 space-y-3">
              {aiNotice ? (
                <div
                  role="status"
                  className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                >
                  {aiNotice}
                </div>
              ) : null}
              <FinkoinAiPlanView
                plan={aiPlan}
                variant="summary"
                profile={data}
                surplusMonthly={Math.max(0, unallocated)}
              />
            </div>
          ) : (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
              {analysis.planSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          )}

          <div className="mt-8 border-t border-slate-200 pt-6">
            <h3 className="text-base font-semibold text-slate-900">Money optimizer</h3>
            <p className="mt-2 text-sm text-slate-600">
              Where to park every rupee next — emergency layers, premiums, FD splits, and SIPs — generated from the same
              profile as this report.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>
                <span className="font-medium text-slate-900">Monthly surplus (model):</span>{" "}
                {formatCurrency(optimizerPlan.totalMonthlySurplus, "en-IN", "INR")}
              </li>
              {optimizerPlan.mandatoryFunds
                .filter((f) => !f.isComplete)
                .slice(0, 4)
                .map((f) => (
                  <li key={f.fundName}>
                    <span className="font-semibold text-[#534AB7]">{f.fundName}</span> — gap{" "}
                    {formatCurrency(f.gap, "en-IN", "INR")} ·{" "}
                    <span className="capitalize">{f.urgency}</span> · {f.whereToKeep}
                  </li>
                ))}
            </ul>
          </div>
        </section>

        <div className="rounded-3xl border border-[#534AB7]/25 bg-gradient-to-br from-[#EEEDFE] via-white to-[#F4F2FC] p-6 text-center shadow-sm sm:p-8">
          <p className="text-base font-semibold text-[#3C3489]">See your complete money allocation plan</p>
          <p className="mt-2 text-sm text-slate-600">
            FD ladder, KVP / RD insurance strategy, monthly flows, and timeline — step by step.
          </p>
          <Link
            href="/optimizer"
            className="mt-4 inline-flex rounded-xl bg-[#534AB7] px-6 py-3 text-sm font-semibold text-white no-underline hover:bg-[#4339a0]"
          >
            Open optimizer →
          </Link>
        </div>

        <section aria-label="Issues" className="space-y-4">
          <h2 className="text-lg font-semibold">What we noticed</h2>
          <ul className="space-y-3">
            {analysis.issues.map((issue) => (
              <li
                key={issue.code}
                className={cn(
                  "rounded-xl border border-slate-100 bg-white py-3 pl-4 pr-4 shadow-sm [border-left-width:4px]",
                  issue.severity === "critical" && "[border-left-color:#E24B4A]",
                  issue.severity === "warning" && "[border-left-color:#BA7517]",
                  issue.severity === "good" && "[border-left-color:#1D9E75]",
                )}
              >
                <p className="text-sm font-medium text-slate-900">{issue.message}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/calculators"
            className="inline-flex items-center justify-center text-center text-sm font-semibold text-[#534AB7] hover:underline sm:justify-start"
          >
            Explore free calculators →
          </Link>
        </div>
      </main>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </>
  );
}

export default function AnalyseResultPage() {
  const data = useFinancialStore((s) => s.lastSubmission);
  const storedResult = useFinancialStore((s) => s.result);
  const hasHydrated = useFinancialStore((s) => s.hasHydrated);
  const tier = useAuthStore((s) => s.subscriptionTier);
  const user = useAuthStore((s) => s.user);
  const [loadingFromCloud, setLoadingFromCloud] = useState(false);

  useEffect(() => {
    if (!data || !hasHydrated) return;
    if (isValidStoredAnalysis(storedResult)) return;
    try {
      useFinancialStore.getState().setFullAnalysis(data);
    } catch (e) {
      console.error("Could not heal stored analysis:", e);
    }
  }, [data, hasHydrated, storedResult]);

  const analysis = useMemo((): AnalysisResult | null => {
    if (!data) return null;
    if (isValidStoredAnalysis(storedResult)) return storedResult;
    try {
      return analyseFinances(data);
    } catch (e) {
      console.error("analyseFinances failed:", e);
      return null;
    }
  }, [data, storedResult]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.log("[AnalyseResultPage]", {
      hasHydrated,
      hasData: !!data,
      hasAnalysis: !!analysis,
      subscriptionTier: tier,
    });
  }, [hasHydrated, data, analysis, tier]);

  useLayoutEffect(() => {
    if (!hasHydrated) return;
    const hasLocal = !!(data && storedResult && isValidStoredAnalysis(storedResult));
    if (hasLocal || !user?.id || !supabase) return;
    setLoadingFromCloud(true);
  }, [hasHydrated, user?.id, data, storedResult]);

  useEffect(() => {
    if (!hasHydrated) return;
    const hasLocal = !!(data && storedResult && isValidStoredAnalysis(storedResult));
    if (hasLocal) {
      setLoadingFromCloud(false);
      return;
    }
    if (!user?.id || !supabase) {
      setLoadingFromCloud(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const remote = await fetchUserAnalyseSnapshot(user.id);
        if (cancelled) return;
        if (
          remote?.lastSubmission &&
          remote.result &&
          isValidStoredAnalysis(remote.result)
        ) {
          useFinancialStore.getState().hydrateFromSnapshot(remote.lastSubmission, remote.result, {
            aiPlan: remote.aiPlan ?? undefined,
            analysisPatch: remote.analysis ?? undefined,
          });
        }
      } finally {
        if (!cancelled) setLoadingFromCloud(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasHydrated, user?.id, data, storedResult]);

  if (!hasHydrated) {
    return (
      <ResultPageShell>
        <p className="text-center text-slate-600">Loading your report…</p>
      </ResultPageShell>
    );
  }

  if (loadingFromCloud) {
    return (
      <ResultPageShell>
        <p className="text-center text-slate-600">Loading your report…</p>
      </ResultPageShell>
    );
  }

  if (!data) {
    return (
      <ResultPageShell>
        <NoSubmissionEmpty />
      </ResultPageShell>
    );
  }

  if (!analysis) {
    return (
      <ResultPageShell>
        <AnalysisComputeFailed />
      </ResultPageShell>
    );
  }

  return (
    <ResultPageShell>
      <AnalyseResultErrorBoundary>
        <AnalyseResultMain data={data} analysis={analysis} />
      </AnalyseResultErrorBoundary>
    </ResultPageShell>
  );
}
