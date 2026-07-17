"use client";

import { FinkoinAiPlanView } from "@/components/finkoin/finkoin-ai-plan-view";
import PrivateAmount from "@/components/ui/PrivateAmount";
import { getAIFixPlan, type FinkoinAIPlan } from "@/lib/aiService";
import { monthlyTotalIncome } from "@/lib/financialEngine";
import { downloadOptimizerPDF } from "@/lib/generatePDF";
import { fmt, fmtWords } from "@/lib/optimizer-format";
import { buildPriorityPlan } from "@/lib/priorityEngine";
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
  const persistedAiPlan = useFinancialStore((s) => s.aiPlan);

  const [aiPlan, setAiPlan] = useState<FinkoinAIPlan | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
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
    if (persistedAiPlan) {
      setAiPlan(persistedAiPlan);
      setAiNotice(null);
      setAiLoading(false);
      return;
    }
    let cancelled = false;
    setAiLoading(true);
    setAiNotice(null);
    void getAIFixPlan(lastSubmission, analysisResult)
      .then(({ plan, notice, calculatedNumbers }) => {
        if (cancelled) return;
        setAiPlan(plan);
        setAiNotice(notice);
        if (
          calculatedNumbers?.income != null ||
          calculatedNumbers?.monthlySurplus != null
        ) {
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
  }, [lastSubmission, analysisResult, persistedAiPlan]);

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
        <h1 className="text-xl font-semibold text-slate-900">
          Run analysis first
        </h1>
        <p className="text-sm text-slate-600">
          We need your saved health report to call the AI. Submit the analyse
          form, then open this page again.
        </p>
        <Link
          href="/analyse"
          className="inline-flex rounded-xl bg-[#534AB7] px-6 py-3 text-sm font-semibold text-white"
        >
          Go to analyse →
        </Link>
        <p className="text-xs text-slate-500">
          Or open <Link href="/analyse/result">your last result</Link> once
          after submitting.
        </p>
      </main>
    );
  }

  const income = Math.round(calcSnap?.income ?? bucketSummary?.income ?? 0);
  const outflow = Math.round(calcSnap?.outflow ?? bucketSummary?.out ?? 0);
  const surplus = Math.round(
    calcSnap?.monthlySurplus ?? bucketSummary?.surplus ?? 0,
  );
  const computedPriorityPlan = buildPriorityPlan(
    lastSubmission,
    analysisResult,
  );
  const activePriorityPlan =
    (aiPlan as any)?.priorityPlan ?? computedPriorityPlan;
  const totalIncome =
    (lastSubmission?.monthlySalary || 0) +
    (lastSubmission?.spouseIncome || 0) +
    (lastSubmission?.otherIncome || 0);
  const totalExpenses =
    (analysisResult?.universalBuckets?.needs?.actual || 0) +
    (analysisResult?.universalBuckets?.loans?.actual || 0) +
    (analysisResult?.universalBuckets?.wants?.actual || 0) +
    (analysisResult?.universalBuckets?.security?.actual || 0) +
    (analysisResult?.universalBuckets?.investment?.actual || 0);
  const amountLeftInHand = Math.round(totalIncome - totalExpenses);
  const allocationSuggestion = {
    emergencyFund: Math.max(0, Math.round(amountLeftInHand * 0.3)),
    termInsurance: Math.max(0, Math.round(amountLeftInHand * 0.1)),
    sip: Math.max(0, Math.round(amountLeftInHand * 0.4)),
    medicalFund: Math.max(0, Math.round(amountLeftInHand * 0.2)),
  };
  const needsActual = analysisResult?.universalBuckets?.needs?.actual || 0;
  const loansActual = analysisResult?.universalBuckets?.loans?.actual || 0;
  const wantsActual = analysisResult?.universalBuckets?.wants?.actual || 0;
  const securityActual =
    analysisResult?.universalBuckets?.security?.actual || 0;
  const investmentActual =
    analysisResult?.universalBuckets?.investment?.actual || 0;
  const pieTotal = Math.max(
    totalIncome,
    needsActual + loansActual + wantsActual + securityActual + investmentActual,
    1,
  );
  const pNeeds = (needsActual / pieTotal) * 100;
  const pLoans = (loansActual / pieTotal) * 100;
  const pWants = (wantsActual / pieTotal) * 100;
  const pSecurity = (securityActual / pieTotal) * 100;
  const pInvestment = (investmentActual / pieTotal) * 100;
  const pieStyle = {
    background: `conic-gradient(
      #534AB7 0 ${pNeeds}%,
      #E24B4A ${pNeeds}% ${pNeeds + pLoans}%,
      #BA7517 ${pNeeds + pLoans}% ${pNeeds + pLoans + pWants}%,
      #1D9E75 ${pNeeds + pLoans + pWants}% ${pNeeds + pLoans + pWants + pSecurity}%,
      #3C3489 ${pNeeds + pLoans + pWants + pSecurity}% 100%
    )`,
  } as const;

  const handleDownload = async () => {
    if (!lastSubmission || !analysisResult || !aiPlan) return;
    setDownloading(true);
    try {
      const priorityPlan =
        (aiPlan as any)?.priorityPlan ??
        buildPriorityPlan(lastSubmission, analysisResult);
      const explanations = {
        greeting: aiPlan.oneLiner || "Your personalised report is ready.",
        overallSummary:
          aiPlan.lifeStageInsight?.headline || aiPlan.topPriorityAction || "",
        debtStrategy: aiPlan.debtPlan?.[0]?.reasoning || "",
        disclaimer: aiPlan.disclaimer,
      };
      await downloadOptimizerPDF(
        lastSubmission,
        analysisResult,
        priorityPlan,
        explanations,
        {},
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-10 text-slate-900 sm:px-6">
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
      <header className="space-y-2">
        <p className="text-sm font-medium text-[#534AB7]">Finkoin optimizer</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Your money optimizer
        </h1>
        <p className="max-w-2xl text-lg text-slate-600">
          Based on your income and expenses, here is what you have left to build
          wealth with every month.
        </p>
      </header>

      <div className="rounded-3xl bg-gradient-to-br from-[#534AB7] via-[#6B5FD4] to-[#8B7FE8] p-6 text-white shadow-lg sm:p-8">
        <p className="text-sm font-medium text-white/90">
          From your saved profile
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-white/75">Monthly income</p>
            <PrivateAmount
              value={income}
              label="monthly income"
              valueClassName="text-xl font-bold tabular-nums"
            >
              {fmt(income)}
            </PrivateAmount>
            {income >= 1_00_000 ? (
              <p className="mt-1 text-xs text-white/70">{fmtWords(income)}</p>
            ) : null}
          </div>
          <div>
            <p className="text-xs text-white/75">Monthly expenses</p>
            <p className="text-xl font-bold tabular-nums">{fmt(outflow)}</p>
            {outflow >= 1_00_000 ? (
              <p className="mt-1 text-xs text-white/70">{fmtWords(outflow)}</p>
            ) : null}
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
          If the AI service is unavailable, you still see a rule-based plan that
          follows Finkoin safety ordering.
        </p>
      </div>

      <div className="rounded-2xl border border-[#E8E6F0] bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#534AB7]">
          Monthly Summary
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs text-[#9B9A94]">Total income</p>
            <PrivateAmount
              value={totalIncome}
              label="total income"
              valueClassName="text-2xl font-bold text-[#111110]"
            >
              ₹{Math.round(totalIncome).toLocaleString("en-IN")}
            </PrivateAmount>
          </div>
          <div>
            <p className="text-xs text-[#9B9A94]">Total outflow</p>
            <p className="text-2xl font-bold text-[#E24B4A]">
              ₹{Math.round(totalExpenses).toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#9B9A94]">Left in hand</p>
            <p
              className={`text-2xl font-bold ${amountLeftInHand >= 0 ? "text-[#1D9E75]" : "text-[#E24B4A]"}`}
            >
              ₹{Math.abs(amountLeftInHand).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="flex items-center justify-center">
            <div className="h-44 w-44 rounded-full" style={pieStyle} />
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-[#111110]">
              Income split pie (monthly)
            </p>
            <p className="text-[#5F5E5A]">
              <span className="inline-block h-2 w-2 rounded-full bg-[#534AB7] mr-2" />
              Needs: ₹{Math.round(needsActual).toLocaleString("en-IN")} (
              {pNeeds.toFixed(1)}%)
            </p>
            <p className="text-[#5F5E5A]">
              <span className="inline-block h-2 w-2 rounded-full bg-[#E24B4A] mr-2" />
              Loans: ₹{Math.round(loansActual).toLocaleString("en-IN")} (
              {pLoans.toFixed(1)}%)
            </p>
            <p className="text-[#5F5E5A]">
              <span className="inline-block h-2 w-2 rounded-full bg-[#BA7517] mr-2" />
              Wants: ₹{Math.round(wantsActual).toLocaleString("en-IN")} (
              {pWants.toFixed(1)}%)
            </p>
            <p className="text-[#5F5E5A]">
              <span className="inline-block h-2 w-2 rounded-full bg-[#1D9E75] mr-2" />
              Security: ₹{Math.round(securityActual).toLocaleString("en-IN")} (
              {pSecurity.toFixed(1)}%)
            </p>
            <p className="text-[#5F5E5A]">
              <span className="inline-block h-2 w-2 rounded-full bg-[#3C3489] mr-2" />
              Investment: ₹
              {Math.round(investmentActual).toLocaleString("en-IN")} (
              {pInvestment.toFixed(1)}%)
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E8E6F0] bg-white p-5">
        <h3 className="text-lg font-semibold">
          SECTION 2 — Where Every Rupee Goes
        </h3>
        <div className="mt-3 space-y-2 text-sm">
          {[
            ["Needs", needsActual, "#534AB7"],
            ["Loans", loansActual, "#E24B4A"],
            ["Wants", wantsActual, "#BA7517"],
            ["Security", securityActual, "#1D9E75"],
            ["Investment", investmentActual, "#3C3489"],
          ].map(([label, value, color]: any) => {
            const pct =
              totalIncome > 0 ? Math.min(100, (value / totalIncome) * 100) : 0;
            return (
              <div key={label}>
                <div className="mb-1 flex justify-between">
                  <span>{label}</span>
                  <span>
                    ₹{Math.round(value).toLocaleString("en-IN")} (
                    {pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#ECEAF5]">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-[#E8E6F0] bg-white p-5">
        <h3 className="text-lg font-semibold">
          SECTION 3 — Your Surplus Allocation
        </h3>
        <p className="mt-1 text-sm text-[#5F5E5A]">
          You have ₹{Math.max(0, amountLeftInHand).toLocaleString("en-IN")} left
          each month. Here is the optimal way to use it:
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-[#F7F7F4] p-3 text-sm">
            Emergency fund top-up: ₹
            {allocationSuggestion.emergencyFund.toLocaleString("en-IN")}/month
          </div>
          <div className="rounded-lg bg-[#F7F7F4] p-3 text-sm">
            Term insurance premium: ₹
            {allocationSuggestion.termInsurance.toLocaleString("en-IN")}/month
          </div>
          <div className="rounded-lg bg-[#F7F7F4] p-3 text-sm">
            SIP investment: ₹{allocationSuggestion.sip.toLocaleString("en-IN")}
            /month
          </div>
          <div className="rounded-lg bg-[#F7F7F4] p-3 text-sm">
            Medical emergency fund: ₹
            {allocationSuggestion.medicalFund.toLocaleString("en-IN")}/month
          </div>
        </div>
        <div className="mt-4 space-y-2 rounded-xl bg-[#FAFAFE] p-4 text-sm">
          {(activePriorityPlan?.priorities || [])
            .slice(0, 4)
            .map((p: any, idx: number) => (
              <div
                key={`priority-alloc-${p.id}-${idx}`}
                className="rounded-lg border border-[#E8E6F0] bg-white p-3"
              >
                <p className="font-semibold">
                  Priority {idx + 1}: {p.title}
                </p>
                <p className="text-[#5F5E5A]">
                  Invest ₹
                  {Math.round(p.monthlyContribution || 0).toLocaleString(
                    "en-IN",
                  )}
                  /month · Achieve in {p.monthsToComplete || 0} months
                </p>
                <p className="text-[#534AB7]">
                  Where: {p.instrument || "As suggested in your AI plan"}
                </p>
              </div>
            ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#E8E6F0] bg-white p-5">
        <h3 className="text-lg font-semibold">
          SECTION 4 — Debt Payoff Calculator
        </h3>
        <div className="mt-3 space-y-2 text-sm">
          {(activePriorityPlan?.debts || []).map((d: any) => {
            const currentMonths =
              d.emi > 0 ? Math.ceil((d.outstanding || 0) / d.emi) : 0;
            const improvedMonths = d.monthsToClearWithExtra || currentMonths;
            return (
              <div
                key={`${d.type}-${d.priorityRank}`}
                className="rounded-lg bg-[#F7F7F4] p-3"
              >
                <p className="font-medium">{d.displayName || d.type}</p>
                <p>
                  Current payoff: {currentMonths} months · With extra ₹
                  {Math.round(d.extraEMIRecommended || 0).toLocaleString(
                    "en-IN",
                  )}
                  /month: {improvedMonths} months
                </p>
                <p>
                  Months saved: {Math.max(0, currentMonths - improvedMonths)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-[#E8E6F0] bg-white p-5">
        <h3 className="text-lg font-semibold">SECTION 5 — Goal Timeline</h3>
        {activePriorityPlan?.goals?.[0] ? (
          <>
            <p className="mt-1 text-sm text-[#5F5E5A]">
              {activePriorityPlan.goals[0].goalType}: target ₹
              {Math.round(
                activePriorityPlan.goals[0].targetAmount || 0,
              ).toLocaleString("en-IN")}{" "}
              · timeline {activePriorityPlan.goals[0].yearsToGoal || 0} years
            </p>
            <div className="mt-3 h-2 rounded-full bg-[#ECEAF5]">
              <div
                className="h-2 rounded-full bg-[#534AB7]"
                style={{
                  width: `${Math.min(100, ((activePriorityPlan.goals[0].currentSaved || 0) / Math.max(activePriorityPlan.goals[0].targetAmount || 1, 1)) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-2 text-sm text-[#5F5E5A]">
              Monthly required: ₹
              {Math.round(
                activePriorityPlan.goals[0].monthlyRequired || 0,
              ).toLocaleString("en-IN")}{" "}
              · instrument:{" "}
              {activePriorityPlan.goals[0].instrument || "As suggested"}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-[#5F5E5A]">
            Goal timeline will appear once the AI goal plan is generated.
          </p>
        )}
      </div>

      {activePriorityPlan?.fdSuggestion ? (
        <div className="rounded-2xl border border-[#E8E6F0] bg-white p-5">
          <h3 className="text-lg font-semibold">SECTION 6 — FD Rate Alert</h3>
          <p className="mt-2 text-sm text-[#5F5E5A]">
            {activePriorityPlan.fdSuggestion.message}
          </p>
          <p className="mt-1 text-sm text-[#534AB7]">
            Current: {activePriorityPlan.fdSuggestion.currentRate}% · Better:{" "}
            {activePriorityPlan.fdSuggestion.bestRate}% · Extra/year: ₹
            {Math.round(
              activePriorityPlan.fdSuggestion.extraAnnual || 0,
            ).toLocaleString("en-IN")}
          </p>
        </div>
      ) : null}

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
          <Link
            href="/analyse/result"
            className="font-semibold text-[#534AB7] underline"
          >
            analyse result
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading || !aiPlan}
          className="rounded-xl border border-[#534AB7] px-4 py-2 text-sm font-semibold text-[#534AB7] disabled:opacity-60"
        >
          {downloading ? "Generating PDF..." : "📄 Download full report PDF"}
        </button>
      </div>
    </main>
  );
}
