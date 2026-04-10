"use client";

import { PaywallModal } from "@/components/analyse/paywall-modal";
import SpeedoMeter from "@/components/ui/SpeedoMeter";
import { buildSpeedoMeterProps } from "@/lib/speedo-meter-buckets";
import { Button } from "@/components/ui/button";
import {
  CITY_TIER_LABELS,
  LIFE_STAGE_LABELS,
  PRIMARY_GOAL_LABELS,
  type LifeStage,
  type PrimaryGoal,
} from "@/lib/analyse-form-schema";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/finance";
import {
  analyseFinances,
  getDebtSafeLimitPercent,
  getSavingsTargetPercent,
  monthlyTotalIncome,
} from "@/lib/financialEngine";
import {
  buildNetWorth,
  getNetWorthStanding,
  netWorthMetricTones,
  netWorthSectionTone,
} from "@/lib/netWorth";
import { getUnallocatedIncome, getUniversalBucketRows } from "@/lib/universal-buckets";
import { fadeUp, scaleIn, slideInLeft, staggerContainer } from "@/lib/animations";
import { useFinancialStore } from "@/store/use-financial-store";
import { useAuthStore } from "@/store/authStore";
import { useGamificationStore } from "@/store/gamificationStore";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

export default function AnalyseResultPage() {
  const router = useRouter();
  const data = useFinancialStore((s) => s.lastSubmission);
  const storedResult = useFinancialStore((s) => s.result);
  const hasHydrated = useFinancialStore((s) => s.hasHydrated);
  const tier = useAuthStore((s) => s.subscriptionTier);
  const earnTokens = useGamificationStore((s) => s.earnTokens);
  const awardBadge = useGamificationStore((s) => s.awardBadge);
  const hasEarnedAction = useGamificationStore((s) => s.hasEarnedAction);
  const markEarnedAction = useGamificationStore((s) => s.markEarnedAction);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!data) {
      router.replace("/analyse");
    }
  }, [data, hasHydrated, router]);

  const analysis = useMemo(
    () => storedResult ?? (data ? analyseFinances(data) : null),
    [data, storedResult],
  );
  const income = data ? monthlyTotalIncome(data) : 0;
  const savingsTarget = data ? getSavingsTargetPercent(data) : 0;
  const debtLimit = getDebtSafeLimitPercent();
  const bucketRows = data ? getUniversalBucketRows(data) : [];
  const unallocated = data ? getUnallocatedIncome(data) : 0;
  const netWorth = useMemo(() => (data ? buildNetWorth(data) : null), [data]);
  const netWorthStanding =
    data && netWorth ? getNetWorthStanding(data.selfAge, netWorth.netWorth) : null;

  useEffect(() => {
    if (!analysis) return;
    if (hasEarnedAction("analysis-complete")) return;
    earnTokens(50, "Financial analysis complete");
    awardBadge("money-starter");
    markEarnedAction("analysis-complete");
  }, [analysis, awardBadge, earnTokens, hasEarnedAction, markEarnedAction]);

  const healthScore = analysis
    ? Math.max(
        0,
        100 -
          analysis.issues.filter((i) => i.severity === "critical").length * 15 -
          analysis.issues.filter((i) => i.severity === "warning").length * 7,
      )
    : 0;

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

  if (!hasHydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white text-slate-600">
        Loading your report…
      </div>
    );
  }

  if (!data || !analysis) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white text-slate-600">
        No analysis found.{" "}
        <Link href="/analyse" className="ml-1 text-[#534AB7]">
          Go to analyse
        </Link>
      </div>
    );
  }

  const sTone = lowerIsBetterTone(analysis.scores.savingsRate, savingsTarget);
  const dTone = lowerIsBetterTone(analysis.scores.debtRatio, debtLimit);
  const uTone = untrackedTone(analysis.scores.untrackedCash, income);
  const checklistOkCount = analysis.securityChecklist.filter((item) => item.status === "ok" || item.status === "na").length;
  const checklistTotal = analysis.securityChecklist.filter((item) => item.status !== "na").length;
  const checklistPct =
    checklistTotal > 0 ? Math.round((checklistOkCount / checklistTotal) * 100) : 0;
  return (
    <div className="min-h-dvh bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/analyse"
            className="text-sm font-medium text-[#534AB7] hover:underline"
          >
            ← Edit answers
          </Link>
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:space-y-12 sm:px-6 sm:py-10">
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
                    {formatCurrency(netWorth.assets, "en-IN", "INR")}
                  </p>
                </div>
              </div>
              <div className={cn("min-w-0 rounded-2xl border p-4", netWorthMetricTones.liabilities)}>
                <p className="text-xs font-semibold uppercase tracking-wide">Total liabilities</p>
                <div className="mt-2 overflow-x-auto [-webkit-overflow-scrolling:touch]">
                  <p className="text-2xl font-semibold tabular-nums tracking-tight whitespace-nowrap sm:text-3xl">
                    {formatCurrency(netWorth.liabilities, "en-IN", "INR")}
                  </p>
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
                    {formatCurrency(netWorth.netWorth, "en-IN", "INR")}
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
                {formatCurrency(analysis.scores.untrackedCash, "en-IN", "INR")}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                {analysis.scores.untrackedCash < 0
                  ? `Spending exceeds income by ${formatCurrency(Math.abs(analysis.scores.untrackedCash), "en-IN", "INR")}/month`
                  : "Assign to a savings bucket"}
              </p>
            </motion.article>
          </motion.div>
        </section>

        <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Need / Want / Security / Loan / Investment summary</h2>
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
                {bucketRows.map((row) => (
                  <motion.tr variants={fadeUp} key={row.key} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-3 font-medium text-slate-900">{row.label}</td>
                    <td className="py-3">
                      <span>{row.capLabel ?? `${Math.round(row.capPercent * 100)}%`}</span>
                      {row.capHelper ? (
                        <p className="mt-1 text-xs text-slate-500">{row.capHelper}</p>
                      ) : null}
                    </td>
                    <td className="py-3">{formatCurrency(row.capAmount, "en-IN", "INR")}</td>
                    <td
                      className={cn(
                        "py-3 font-medium",
                        row.status === "good" ? "text-emerald-700" : "text-red-600",
                      )}
                    >
                      {formatCurrency(row.actual, "en-IN", "INR")}
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
                ))}
                <motion.tr variants={fadeUp}>
                  <td className="py-3 font-medium text-slate-600">Unallocated</td>
                  <td className="py-3 text-slate-400">—</td>
                  <td className="py-3 text-slate-400">—</td>
                  <td className={cn("py-3 font-medium", unallocated >= 0 ? "text-slate-500" : "text-red-600")}>
                    {formatCurrency(unallocated, "en-IN", "INR")}
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
                Emergency fund, medical cover, term cover, premium reserve, child goals, and add-ons (SSY, NSC if you use it), plus family-specific items below.
              </p>
            </div>
          </div>

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
                        "mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                        icon.className,
                      )}
                    >
                      {icon.label}
                    </span>
                    <div>
                      <p className="font-medium text-slate-900">{item.label}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
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
                      <Button type="button" variant="primary" onClick={() => setPaywallOpen(true)}>
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
          ) : (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
              {analysis.planSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          )}
        </section>

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
    </div>
  );
}
