"use client";

import { FinkoinAiPlanView } from "@/components/finkoin/finkoin-ai-plan-view";
import { getAIFixPlan, type FinkoinAIPlan } from "@/lib/aiService";
import { monthlyTotalIncome } from "@/lib/financialEngine";
import { fmt, fmtWords } from "@/lib/optimizer-format";
import { getUniversalBucketActuals } from "@/lib/universal-buckets";
import { useFinancialStore } from "@/store/use-financial-store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function OptimizerPage() {
  const router = useRouter();
  const hasHydrated = useFinancialStore((s) => s.hasHydrated);
  const lastSubmission = useFinancialStore((s) => s.lastSubmission);
  const analysisResult = useFinancialStore((s) => s.result);

  const [aiPlan, setAiPlan] = useState<FinkoinAIPlan | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [calcSnap, setCalcSnap] = useState<{
    income: number;
    monthlySurplus: number;
    outflow: number;
  } | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!lastSubmission) router.replace("/analyse");
  }, [hasHydrated, lastSubmission, router]);

  const bucketSummary = useMemo(() => {
    if (!lastSubmission) return null;
    const b = getUniversalBucketActuals(lastSubmission);
    const income = monthlyTotalIncome(lastSubmission);
    const out = b.needs + b.wants + b.security + b.loans + b.investment;
    return { income, out, surplus: Math.max(0, income - out) };
  }, [lastSubmission]);

  useEffect(() => {
    if (!lastSubmission || !analysisResult) return;
    let cancelled = false;
    setAiLoading(true);
    setAiNotice(null);
    void getAIFixPlan(lastSubmission, analysisResult)
      .then(({ plan, notice, calculatedNumbers }) => {
        if (cancelled) return;
        setAiPlan(plan);
        setAiNotice(notice);
        if (calculatedNumbers?.income != null || calculatedNumbers?.monthlySurplus != null) {
          const inc = Number(calculatedNumbers.income) || 0;
          const sur = Number(calculatedNumbers.monthlySurplus) || 0;
          setCalcSnap({
            income: inc,
            monthlySurplus: sur,
            outflow: Math.max(0, inc - sur),
          });
        }
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lastSubmission, analysisResult]);

  if (!hasHydrated || !lastSubmission) {
    return (
      <main className="mx-auto min-h-[50vh] max-w-6xl px-4 py-16 text-center text-slate-600">
        Loading your optimizer…
      </main>
    );
  }

  if (!analysisResult) {
    return (
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Run analysis first</h1>
        <p className="text-sm text-slate-600">
          We need your saved health report to call the AI. Submit the analyse form, then open this page again.
        </p>
        <Link href="/analyse" className="inline-flex rounded-xl bg-[#534AB7] px-6 py-3 text-sm font-semibold text-white">
          Go to analyse →
        </Link>
        <p className="text-xs text-slate-500">
          Or open <Link href="/analyse/result">your last result</Link> once after submitting.
        </p>
      </main>
    );
  }

  const income = Math.round(calcSnap?.income ?? bucketSummary?.income ?? 0);
  const outflow = Math.round(calcSnap?.outflow ?? bucketSummary?.out ?? 0);
  const surplus = Math.round(calcSnap?.monthlySurplus ?? bucketSummary?.surplus ?? 0);

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-[#534AB7]">Finkoin optimizer</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Your money optimizer</h1>
        <p className="max-w-2xl text-lg text-slate-600">
          Based on your income and expenses, here is what you have left to build wealth with every month.
        </p>
      </header>

      <div className="rounded-3xl bg-gradient-to-br from-[#534AB7] via-[#6B5FD4] to-[#8B7FE8] p-6 text-white shadow-lg sm:p-8">
        <p className="text-sm font-medium text-white/90">From your saved profile</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-white/75">Monthly income</p>
            <p className="text-xl font-bold tabular-nums">{fmt(income)}</p>
            {income >= 1_00_000 ? <p className="mt-1 text-xs text-white/70">{fmtWords(income)}</p> : null}
          </div>
          <div>
            <p className="text-xs text-white/75">Monthly expenses</p>
            <p className="text-xl font-bold tabular-nums">{fmt(outflow)}</p>
            {outflow >= 1_00_000 ? <p className="mt-1 text-xs text-white/70">{fmtWords(outflow)}</p> : null}
          </div>
          <div>
            <p className="text-xs text-white/75">Available to optimize</p>
            <p className="text-xl font-bold tabular-nums">{fmt(surplus)}</p>
            {surplus > 0 ? (
              <p className="mt-1 text-xs text-white/70">
                {fmtWords(surplus)} per month
              </p>
            ) : null}
          </div>
        </div>
        <p className="mt-4 text-sm text-white/85">
          If the AI service is unavailable, you still see a rule-based plan that follows Finkoin safety ordering.
        </p>
      </div>

      {aiNotice ? (
        <div
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          {aiNotice}
        </div>
      ) : null}

      {aiLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          Generating your full personalised plan…
        </div>
      ) : aiPlan ? (
        <FinkoinAiPlanView
          plan={aiPlan}
          variant="full"
          profile={lastSubmission}
          surplusMonthly={surplus}
        />
      ) : null}

      <div className="flex flex-col items-center gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:justify-between">
        <p className="text-sm text-slate-600">
          Want the short version? See the same AI block on your{" "}
          <Link href="/analyse/result" className="font-semibold text-[#534AB7] underline">
            analyse result
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
