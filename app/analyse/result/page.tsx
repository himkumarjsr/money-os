"use client";

import { PaywallModal } from "@/components/analyse/paywall-modal";
import { IncomeMeter } from "@/components/IncomeMeter";
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
import { getUnallocatedIncome, getUniversalBucketRows } from "@/lib/universal-buckets";
import { useFinancialStore } from "@/store/use-financial-store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  const [paywallOpen, setPaywallOpen] = useState(false);

  useEffect(() => {
    if (!data) {
      router.replace("/analyse");
    }
  }, [data, router]);

  const analysis = useMemo(() => (data ? analyseFinances(data) : null), [data]);
  const income = data ? monthlyTotalIncome(data) : 0;
  const savingsTarget = data ? getSavingsTargetPercent(data) : 0;
  const debtLimit = getDebtSafeLimitPercent();
  const bucketRows = data ? getUniversalBucketRows(data) : [];
  const unallocated = data ? getUnallocatedIncome(data) : 0;

  if (!data || !analysis) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white text-slate-600">
        Loading...
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

        <section aria-label="Key metrics">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className={cn("rounded-2xl border-l-4 p-5 shadow-sm", toneBarClass(sTone))}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Monthly investment rate
              </p>
              <p className={cn("mt-2 text-3xl font-semibold tabular-nums", toneTextClass(sTone))}>
                {analysis.scores.savingsRate.toFixed(1)}%
              </p>
              <p className="mt-2 text-xs text-slate-600">
                of monthly take-home income
              </p>
            </article>

            <article className={cn("rounded-2xl border-l-4 p-5 shadow-sm", toneBarClass(dTone))}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Loan ratio
              </p>
              <p className={cn("mt-2 text-3xl font-semibold tabular-nums", toneTextClass(dTone))}>
                {analysis.scores.debtRatio.toFixed(1)}%
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Universal cap {debtLimit}% of income
              </p>
            </article>

            <article className={cn("rounded-2xl border-l-4 p-5 shadow-sm", toneBarClass(uTone))}>
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
            </article>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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
              <tbody>
                {bucketRows.map((row) => (
                  <tr key={row.key} className="border-b border-slate-100 last:border-b-0">
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
                  </tr>
                ))}
                <tr>
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
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <IncomeMeter totalIncome={income} profile={data} />

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Your financial safety net</h2>
              <p className="mt-1 text-sm text-slate-600">
                These checks focus on protection, liquidity, and family preparedness.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {analysis.securityChecklist.map((item) => {
              const icon = statusIcon(item.status);
              return (
                <div
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
                </div>
              );
            })}
          </div>

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
        </section>

        {/* COMMENTED — AI fix plan — enable in Phase 2 */}
        {/* COMMENTED — Bucket bars detail — enable in Phase 2 */}

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Unlock your full plan</h2>
              <p className="mt-1 text-sm text-slate-600">
                Payment opens the full fix plan and premium guidance layers.
              </p>
            </div>
            <Button type="button" variant="primary" onClick={() => setPaywallOpen(true)}>
              View plans
            </Button>
          </div>
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
