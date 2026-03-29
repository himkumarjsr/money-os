"use client";

import { PaywallModal } from "@/components/analyse/paywall-modal";
import { Button } from "@/components/ui/button";
import {
  LIFE_STAGE_LABELS,
  PRIMARY_GOAL_LABELS,
  type LifeStage,
  type PrimaryGoal,
} from "@/lib/analyse-form-schema";
import { cn } from "@/lib/cn";
import { getExpenseBucketRows } from "@/lib/expense-bucket-recommendations";
import { formatCurrency } from "@/lib/finance";
import {
  analyseFinances,
  getDebtSafeLimitPercent,
  getSavingsTargetPercent,
  monthlyTotalIncome,
} from "@/lib/financialEngine";
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

function savingsTone(rate: number, target: number): "red" | "amber" | "green" {
  if (rate >= target - 1e-6) return "green";
  if (rate >= target * 0.85) return "amber";
  return "red";
}

function debtTone(ratio: number, limit: number): "red" | "amber" | "green" {
  if (ratio <= limit + 1e-6) return "green";
  if (ratio <= limit * 1.1) return "amber";
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
  const buckets = useMemo(() => (data ? getExpenseBucketRows(data) : []), [data]);
  const income = data ? monthlyTotalIncome(data) : 0;
  const savingsTarget = data ? getSavingsTargetPercent(data) : 0;
  const debtLimit = data ? getDebtSafeLimitPercent(data) : 0;

  if (!data || !analysis) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white text-slate-600">
        Loading…
      </div>
    );
  }

  const sTone = savingsTone(analysis.scores.savingsRate, savingsTarget);
  const dTone = debtTone(analysis.scores.debtRatio, debtLimit);
  const uTone = untrackedTone(analysis.scores.untrackedCash, income);

  const criticalIssues = analysis.issues.filter((i) => i.severity === "critical");
  const warningIssues = analysis.issues.filter((i) => i.severity === "warning");
  const goodIssues = analysis.issues.filter((i) => i.severity === "good");

  const planCount = analysis.planSteps.length;
  const step1 = analysis.planSteps[0] ?? analysis.teaser;

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
            {LIFE_STAGE_LABELS[data.lifeStage as LifeStage]} · {data.city} · Goal:{" "}
            {PRIMARY_GOAL_LABELS[data.primaryGoal as PrimaryGoal]}
          </p>
        </div>

        <section aria-label="Key metrics">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <article
              className={cn(
                "rounded-2xl border-l-4 p-5 shadow-sm",
                toneBarClass(sTone),
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Savings rate
              </p>
              <p
                className={cn(
                  "mt-2 text-3xl font-semibold tabular-nums",
                  toneTextClass(sTone),
                )}
              >
                {analysis.scores.savingsRate.toFixed(1)}%
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Target {savingsTarget}% for your life stage
              </p>
            </article>

            <article
              className={cn(
                "rounded-2xl border-l-4 p-5 shadow-sm",
                toneBarClass(dTone),
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Debt ratio
              </p>
              <p
                className={cn(
                  "mt-2 text-3xl font-semibold tabular-nums",
                  toneTextClass(dTone),
                )}
              >
                {analysis.scores.debtRatio.toFixed(1)}%
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Rent + EMIs vs income · safe cap {debtLimit}%
              </p>
            </article>

            <article
              className={cn(
                "rounded-2xl border-l-4 p-5 shadow-sm",
                toneBarClass(uTone),
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Untracked cash
              </p>
              <p
                className={cn(
                  "mt-2 text-2xl font-semibold tabular-nums sm:text-3xl",
                  toneTextClass(uTone),
                )}
              >
                {formatCurrency(
                  analysis.scores.untrackedCash,
                  "en-IN",
                  "INR",
                )}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Income minus expenses and savings
              </p>
            </article>
          </div>
        </section>

        <section aria-label="Issues" className="space-y-4">
          <h2 className="text-lg font-semibold">What we noticed</h2>
          <ul className="space-y-3">
            {criticalIssues.map((i) => (
              <li
                key={i.code}
                className="rounded-xl border border-slate-100 bg-white py-3 pl-4 pr-4 shadow-sm [border-left-width:4px] [border-left-color:#E24B4A]"
              >
                <p className="text-sm font-medium text-slate-900">{i.message}</p>
              </li>
            ))}
            {warningIssues.map((i) => (
              <li
                key={i.code}
                className="rounded-xl border border-slate-100 bg-white py-3 pl-4 pr-4 shadow-sm [border-left-width:4px] [border-left-color:#BA7517]"
              >
                <p className="text-sm font-medium text-slate-900">{i.message}</p>
              </li>
            ))}
            {goodIssues.map((i) => (
              <li
                key={i.code}
                className="rounded-xl border border-slate-100 bg-white py-3 pl-4 pr-4 shadow-sm [border-left-width:4px] [border-left-color:#1D9E75]"
              >
                <p className="text-sm font-medium text-slate-900">{i.message}</p>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="rounded-2xl bg-[#534AB7] px-5 py-6 text-white shadow-md sm:px-8 sm:py-8"
          aria-label="Fix plan teaser"
        >
          <h2 className="text-lg font-semibold sm:text-xl">
            Your {planCount}-step fix plan is ready
          </h2>
          <div className="mt-4 rounded-xl bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
              Step 1
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white sm:text-base">
              {step1}
            </p>
          </div>
          <p className="mt-4 text-sm text-white/65">
            Steps 2–{planCount} locked
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-6 w-full border-0 bg-white text-[#534AB7] hover:bg-white/90 sm:w-auto"
            onClick={() => setPaywallOpen(true)}
          >
            Unlock full plan — ₹49/month
          </Button>
        </section>

        <section aria-label="Expense buckets">
          <h2 className="text-lg font-semibold">Spending vs recommended cap</h2>
          <p className="mt-1 text-sm text-slate-600">
            Caps scale with income, life stage, and city (metro benchmarks ~30%
            higher vs tier 2). Bars turn red when you are above the cap.
          </p>
          <ul className="mt-6 space-y-5">
            {buckets.map((row) => {
              const scale = Math.max(row.actual, row.recommended, 1) * 1.08;
              const actualPct = (row.actual / scale) * 100;
              const recPct = (row.recommended / scale) * 100;
              return (
                <li key={row.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      {row.label}
                    </p>
                    <p className="text-xs text-slate-500">
                      Actual{" "}
                      <span className="font-medium text-slate-800">
                        {formatCurrency(row.actual, "en-IN", "INR")}
                      </span>{" "}
                      · Cap{" "}
                      <span className="font-medium text-slate-800">
                        {formatCurrency(row.recommended, "en-IN", "INR")}
                      </span>
                    </p>
                  </div>
                  <div className="relative mt-2 h-3 rounded-full bg-slate-100">
                    <div
                      className={cn(
                        "absolute left-0 top-0 h-3 rounded-l-full transition-[width]",
                        row.overLimit ? "bg-[#E24B4A]" : "bg-[#1D9E75]",
                      )}
                      style={{
                        width: `${Math.min(100, actualPct)}%`,
                      }}
                    />
                    <div
                      className="absolute top-0 h-3 w-0.5 -translate-x-1/2 rounded-full bg-slate-900"
                      style={{ left: `${Math.min(100, recPct)}%` }}
                      title="Recommended cap"
                    />
                  </div>
                </li>
              );
            })}
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
