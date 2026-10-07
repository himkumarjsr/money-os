"use client";

import { AnalyseResultErrorBoundary } from "@/components/analyse/analyse-result-error-boundary";
import { PaywallModal } from "@/components/analyse/paywall-modal";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import FeedbackWidget from "@/components/FeedbackWidget";
import PrivateAmount from "@/components/ui/PrivateAmount";
import SpeedoMeter from "@/components/ui/SpeedoMeter";
import { buildPriorityPlan } from "@/lib/priorityEngine";
import { Analytics } from "@/lib/analytics";
import { buildSpeedoMeterProps } from "@/lib/speedo-meter-buckets";
import {
  analyseFinances,
  assessTermCover,
  medicalEmergencyTarget,
  monthlyTotalIncome,
  scoreBand,
} from "@/lib/financialEngine";
import {
  getEpfContributionMonthly,
  getInHandOutflow,
  getUnallocatedIncome,
  getUniversalBucketActuals,
  getUniversalCaps,
} from "@/lib/universal-buckets";
import { getBucketBreakdown } from "@/lib/bucket-breakdown";
import {
  SCORE_BAND_UI,
  deriveCtaCopy,
  derivePlanTeaser,
  emergencyFundCheck,
  profileSummaryLabels,
} from "./resultModel";
import { useAuthStore } from "@/store/authStore";
import { useRestoreAnalyseSnapshot } from "@/lib/useRestoreAnalyseSnapshot";
import { useFinancialStore } from "@/store/financialStore";
import { useObligationStore } from "@/store/obligationStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";

export default function AnalyseResultPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { result, lastSubmission, hasHydrated } = useFinancialStore();
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFeedback, setShowFeedback] = useState(true);
  const toggleRow = (key: string) => {
    setExpandedRows((prev) =>
      prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key],
    );
  };

  useRestoreAnalyseSnapshot(user?.id);
  useEffect(() => {
    if (user?.id) void useObligationStore.getState().syncLoansToAnalyse(user.id);
  }, [user?.id]);

  const analysis = useMemo(() => {
    if (!lastSubmission) return null;
    return result ?? analyseFinances(lastSubmission);
  }, [lastSubmission, result]);

  const priorityPlan = useMemo(() => {
    if (!lastSubmission || !analysis) return null;
    return buildPriorityPlan(lastSubmission, analysis);
  }, [lastSubmission, analysis]);

  const reportScore = result?.overallScore ?? 0;

  useEffect(() => {
    if (!hasHydrated || !result || !lastSubmission || !priorityPlan) return;
    Analytics.reportViewed(reportScore);
    Analytics.healthCheckCompleted(reportScore);
  }, [hasHydrated, result, lastSubmission, priorityPlan, reportScore]);

  useEffect(() => {
    if (!showPaymentModal) return;
    Analytics.paywallViewed();
  }, [showPaymentModal]);

  if (!hasHydrated) {
    return <BrandPageLoader fullScreen={false} label="Loading…" />;
  }

  if (!result || !lastSubmission || !priorityPlan) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          flexDirection: "column",
          gap: 16,
          padding: 24,
        }}
      >
        <div style={{ fontSize: 48 }}>
          <AppIcon name="chart" size={44} color="#534AB7" />
        </div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#111110",
            textAlign: "center",
          }}
        >
          No analysis found
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "#9B9A94",
            textAlign: "center",
            maxWidth: 300,
          }}
        >
          Please complete the financial analysis form to see your results.
        </p>
        <button
          onClick={() => router.push("/analyse")}
          style={{
            height: 48,
            padding: "0 24px",
            borderRadius: 12,
            background: "#534AB7",
            color: "white",
            border: "none",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Start analysis →
        </button>
      </div>
    );
  }

  const profile = lastSubmission;
  const score = result?.overallScore ?? analysis?.overallScore ?? 0;

  const scoreUi = SCORE_BAND_UI[scoreBand(score)];

  const assets = analysis?.totalAssets || 0;
  const liabilities = analysis?.totalLiabilities || 0;
  const netWorth = analysis?.netWorth || 0;
  if (process.env.NODE_ENV === "development") {
    console.log("NET WORTH CALC:", {
      homeMarketValue: lastSubmission?.homeMarketValue,
      carMarketValue: lastSubmission?.carMarketValue,
      epfBalance: lastSubmission?.epfBalance,
      fdValue: lastSubmission?.fdValue,
      savingsAccountBalance: lastSubmission?.savingsAccountBalance,
      goldValue: lastSubmission?.goldValue,
    });
  }

  const bucketActuals = getUniversalBucketActuals(profile);
  const income = monthlyTotalIncome(profile);
  const needsActual = bucketActuals.needs;
  const loansActual = bucketActuals.loans;
  const securityActual = bucketActuals.security;
  const investmentActual = bucketActuals.investment;
  const lifestyleActual = bucketActuals.wants;
  const needsMonthly = bucketActuals.needs;

  const bucketExpandedItems = {
    needs: getBucketBreakdown("needs", profile),
    wants: getBucketBreakdown("wants", profile),
    security: getBucketBreakdown("security", profile),
    loans: getBucketBreakdown("loans", profile),
    investment: getBucketBreakdown("investment", profile),
  } as const;

  const totalIncome = income;
  const epfMonthly = getEpfContributionMonthly(profile);
  // EPF is deducted at source — not paid from in-hand, so exclude from surplus/outflow.
  const totalOutflow = getInHandOutflow(profile);
  const amountLeftInHand = getUnallocatedIncome(profile);
  const caps = getUniversalCaps(profile);
  const buckets = (
    [
      {
        key: "needs",
        label: "Needs",
        actual: needsActual,
        details: "Housing + essentials + family support",
      },
      {
        key: "wants",
        label: "Wants",
        actual: lifestyleActual,
        details: "Shopping, entertainment and lifestyle spends",
      },
      {
        key: "security",
        label: "Insurance premiums",
        actual: securityActual,
        details: "Term, health, motor and other insurance premiums (monthly)",
      },
      {
        key: "loans",
        label: "Loans",
        actual: loansActual,
        details: "All monthly debt obligations",
      },
      {
        key: "investment",
        label: "Investment",
        actual: investmentActual,
        details: "SIP, RD, NPS, PPF, EPF, SSY and other monthly contributions",
      },
    ] as const
  ).map((b) => ({
    ...b,
    capPercent: Math.round(caps[b.key] * 100),
    capAmount: income * caps[b.key],
  }));

  const termAssessment = assessTermCover({
    hasTermInsurance: profile?.hasTermInsurance ?? false,
    termCover: profile?.termInsuranceSumAssured || 0,
    termNeeded: analysis?.termInsuranceNeeded || 0,
  });
  const termStatus = termAssessment.status;

  const medEmergencyTargetAmount = profile
    ? medicalEmergencyTarget(profile)
    : 200_000;
  const medEmergencyCurrent = profile?.medicalEmergencyFund || 0;

  const emergency = emergencyFundCheck(
    profile,
    needsMonthly,
    analysis?.realEmergencyFund?.monthsCovered || 0,
  );

  const safetyItems = [
    {
      id: "emergency",
      title: "Emergency fund",
      current: analysis?.realEmergencyFund?.total || 0,
      target: emergency.target,
      formatCurrent: (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`,
      formatTarget: (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`,
      isOk: emergency.isOk,
      icon: "shield",
    },
    {
      id: "medical",
      title: "Medical emergency fund",
      current: medEmergencyCurrent,
      target: medEmergencyTargetAmount,
      formatCurrent: (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`,
      formatTarget: (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`,
      isOk: medEmergencyCurrent >= medEmergencyTargetAmount,
      icon: "hospital",
    },
    {
      id: "term",
      title:
        termStatus === "missing"
          ? "Term life cover"
          : termStatus === "partial"
            ? "Term cover"
            : termStatus === "baseline_ok"
              ? "Term insurance"
              : "Term insurance",
      current: profile?.termInsuranceSumAssured || 0,
      target: analysis?.termInsuranceNeeded || 0,
      formatCurrent: (v: number) =>
        v === 0 ? "None" : `₹${(v / 10000000).toFixed(1)} crore`,
      formatTarget: (v: number) =>
        termStatus === "partial" || termStatus === "baseline_ok"
          ? `₹${(v / 10000000).toFixed(1)} crore at today's income`
          : `₹${(v / 10000000).toFixed(1)} crore`,
      isOk: termAssessment.safetyNetOk,
      status: termStatus === "baseline_ok" ? "partial" : termStatus,
      infoText: termAssessment.infoText,
      icon: "shield",
    },
    {
      id: "health",
      title:
        (profile?.healthInsuranceSumInsured || 0) > 0
          ? "Health insurance"
          : "Health cover",
      current: profile?.healthInsuranceSumInsured || 0,
      target: profile?.lifeStage === "bachelor" ? 500000 : 1000000,
      formatCurrent: (v: number) =>
        v === 0 ? "None" : `₹${(v / 100000).toFixed(0)} lakh`,
      formatTarget: (v: number) => `₹${(v / 100000).toFixed(0)} lakh`,
      isOk:
        (profile?.healthInsuranceSumInsured || 0) >=
        (profile?.lifeStage === "bachelor" ? 500000 : 1000000),
      icon: "hospital",
    },
    {
      id: "investment",
      title: "Investing regularly",
      current: analysis?.scores?.savingsRate || 0,
      target: 15,
      formatCurrent: (v: number) => `${Math.round(v)}% of income`,
      formatTarget: () => "15% minimum",
      isOk: (analysis?.scores?.savingsRate || 0) >= 15,
      icon: "trending",
    },
  ];
  const completeCount = safetyItems.filter((i) => i.isOk).length;
  const safetyNetSubtitle = safetyItems.map((i) => i.title).join(" · ");
  const hasCriticalIssues = (analysis?.criticalIssueCount || 0) > 0;
  const planTeaser = derivePlanTeaser(priorityPlan);
  const ctaCopy = deriveCtaCopy({
    score,
    openCount: planTeaser.openCount,
    topPriorityTitle: planTeaser.first?.title ?? null,
    hasCriticalIssues,
  });
  const profileLabels = profileSummaryLabels(profile);

  const handleUnlockClick = async () => {
    console.log("=== UNLOCK CLICKED ===");

    try {
      const skipPayment = process.env.NEXT_PUBLIC_SKIP_PAYMENT === "true";

      console.log("skipPayment:", skipPayment);
      console.log("user:", user?.id);
      console.log("subscriptionTier:", user?.subscriptionTier);

      if (skipPayment) {
        console.log("Skip payment → going to fixplan");
        router.push("/analyse/fixplan");
        return;
      }

      if (
        user?.subscriptionTier === "pro" ||
        user?.subscriptionTier === "promax"
      ) {
        console.log("Pro user → going to fixplan");
        router.push("/analyse/fixplan");
        return;
      }

      console.log("Opening payment modal");
      setShowPaymentModal(true);
    } catch (err) {
      console.error("Unlock error:", err);
    }
  };
  const handleCloseModal = () => {
    setShowPaymentModal(false);
  };

  return (
    <AnalyseResultErrorBoundary>
      <div className="min-h-dvh bg-[#F7F7F4] px-4 py-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <button
            onClick={() => router.push("/analyse")}
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
            ← Back to form
          </button>
          <section className="rounded-3xl bg-[linear-gradient(135deg,#3C3489_0%,#534AB7_100%)] p-5 text-white">
            <div className="grid items-center gap-6 md:grid-cols-[1.2fr_0.8fr] md:gap-4">
              <div className="text-center md:text-left">
                <p className="text-sm font-medium text-white/90">
                  Health report
                </p>
                <p className="mt-1 text-3xl font-bold text-white">
                  Your financial health
                </p>
                {profileLabels.length > 0 ? (
                  <p className="mt-1 text-sm text-white/85">
                    {profileLabels.join(" · ")}
                  </p>
                ) : null}
                <span
                  className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${scoreUi.badgeTone}`}
                >
                  {scoreUi.label}
                </span>
              </div>
              <div className="mx-auto w-full max-w-[280px] rounded-2xl bg-white/15 p-3 text-center md:mx-0 md:ml-auto md:mr-0 md:max-w-[240px] md:bg-white/10 md:p-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-white">
                  Health score
                </p>
                <SpeedoMeter
                  income={100}
                  needs={score}
                  wants={0}
                  loans={0}
                  investment={0}
                  title=""
                  singleScore={score}
                  singleTone={scoreUi.gaugeTone}
                  className="border-0 bg-transparent p-0 shadow-none [&_svg]:mx-auto [&_svg]:h-[132px] [&_svg]:w-[min(100%,220px)] sm:[&_svg]:h-[120px] sm:[&_svg]:w-[180px]"
                />
              </div>
            </div>
          </section>

          <div className="mb-4 rounded-2xl border border-[#E8E6F0] bg-white p-4 sm:p-6">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-wide text-[#534AB7]">
              Monthly summary
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
              <div className="min-w-0 rounded-xl border border-[#F0EFF8] bg-[#FAFAFE] p-4 sm:border-0 sm:bg-transparent sm:p-0">
                <div className="mb-1 text-xs font-semibold text-[#5F5E5A]">
                  Total income
                </div>
                <PrivateAmount
                  value={totalIncome}
                  label="total income"
                  valueClassName="break-words font-extrabold leading-tight text-[#111110] tabular-nums text-[length:clamp(14px,calc(8px + 4.2vw),22px)] sm:text-[22px]"
                >
                  ₹{Math.round(totalIncome).toLocaleString("en-IN")}
                </PrivateAmount>
                <div className="mt-1 text-xs font-medium text-[#5F5E5A]">
                  per month
                </div>
              </div>
              <div className="min-w-0 rounded-xl border border-[#F0EFF8] bg-[#FAFAFE] p-4 sm:border-0 sm:bg-transparent sm:p-0">
                <div className="mb-1 text-xs font-semibold text-[#5F5E5A]">
                  Total outflow
                </div>
                <div className="break-words font-extrabold leading-tight text-[#B42323] tabular-nums text-[length:clamp(14px,calc(8px + 4.2vw),22px)] sm:text-[22px]">
                  ₹{Math.round(totalOutflow).toLocaleString("en-IN")}
                </div>
                <div className="mt-1 text-xs font-medium text-[#5F5E5A]">
                  {epfMonthly > 0
                    ? "from in-hand (EPF excluded)"
                    : "needs + loans + insurance + wants + SIP"}
                </div>
              </div>
              <div className="min-w-0 rounded-xl border border-[#F0EFF8] bg-[#FAFAFE] p-4 sm:border-0 sm:bg-transparent sm:p-0">
                <div className="mb-1 text-xs font-semibold text-[#5F5E5A]">
                  Left in hand
                </div>
                <div
                  className={`break-words font-extrabold leading-tight tabular-nums text-[length:clamp(14px,calc(8px + 4.2vw),22px)] sm:text-[22px] ${amountLeftInHand >= 0 ? "text-[#0F766E]" : "text-[#B42323]"}`}
                >
                  ₹
                  {Math.abs(Math.round(amountLeftInHand)).toLocaleString(
                    "en-IN",
                  )}
                </div>
                <div
                  className={`mt-1 text-xs font-semibold ${amountLeftInHand >= 0 ? "text-[#0F766E]" : "text-[#B42323]"}`}
                >
                  {amountLeftInHand >= 0
                    ? "available to invest"
                    : "overspending"}
                </div>
              </div>
            </div>
          </div>

          <section className="rounded-2xl border border-[#E8E6F0] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#534AB7]">
              Live net worth summary
            </p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#5F5E5A]">
                  Total assets
                </p>
                <p className="break-words font-bold leading-tight text-[#111110] tabular-nums text-[length:clamp(15px,calc(9px + 3.8vw),24px)] sm:text-2xl">
                  ₹{Math.round(assets).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#5F5E5A]">
                  Total liabilities
                </p>
                <p className="break-words font-bold leading-tight text-[#8C3A3A] tabular-nums text-[length:clamp(15px,calc(9px + 3.8vw),24px)] sm:text-2xl">
                  ₹{Math.round(liabilities).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#5F5E5A]">
                  Net worth
                </p>
                <p
                  className={`break-words font-bold leading-tight tabular-nums text-[length:clamp(15px,calc(9px + 3.8vw),24px)] sm:text-2xl ${netWorth >= 0 ? "text-[#0F766E]" : "text-[#B42323]"}`}
                >
                  ₹{Math.round(netWorth).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs font-medium leading-relaxed text-[#5F5E5A]">
              Net worth is your total assets minus total liabilities, based on
              the values you entered.
            </p>
          </section>

          {/* <section className="rounded-2xl bg-gradient-to-r from-[#4A3FB2] to-[#6E62D7] p-5 text-white">
          <p className="text-xs uppercase tracking-wide text-[#D5D0FA]">HEALTH SCORE</p>
          <p className="mt-2 text-5xl font-extrabold">{score}/100</p>
        </section> */}

          <section className="rounded-2xl bg-white p-4 sm:p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#534AB7]">
              Category caps vs actual
            </p>

            <div className="space-y-3 md:hidden">
              {buckets.map((b) => {
                const status =
                  b.actual > b.capAmount * 1.15
                    ? "Critical"
                    : b.actual > b.capAmount
                      ? "Warning"
                      : "Good";
                const statusClass =
                  status === "Critical"
                    ? "bg-[#FDEDED] text-[#991B1B]"
                    : status === "Warning"
                      ? "bg-[#FFF4E5] text-[#92400E]"
                      : "bg-[#DCFCE7] text-[#166534]";
                const isOpen = expandedRows.includes(b.key);
                const items =
                  bucketExpandedItems[
                    b.key as keyof typeof bucketExpandedItems
                  ] ?? [];
                const total = items.reduce(
                  (sum, item) => sum + (item.value || 0),
                  0,
                );
                return (
                  <div
                    key={`m-${b.key}`}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer rounded-2xl border border-[#E8E6F0] bg-[#FAFAFE] p-4 active:bg-[#F3F2FB]"
                    onClick={() => toggleRow(b.key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleRow(b.key);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 font-semibold text-[#111110]">
                          <span
                            className={`inline-block text-[#534AB7] transition-transform ${isOpen ? "rotate-90" : ""}`}
                          >
                            ▸
                          </span>
                          <span>{b.label}</span>
                        </div>
                        <p className="mt-1 text-xs leading-snug text-[#5F5E5A]">
                          {b.details}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass}`}
                      >
                        {status}
                      </span>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#5F5E5A]">
                          Cap %
                        </dt>
                        <dd className="font-bold tabular-nums text-[#111110]">
                          {b.capPercent}%
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#5F5E5A]">
                          Cap ₹
                        </dt>
                        <dd className="break-all font-bold tabular-nums text-[#111110]">
                          ₹{Math.round(b.capAmount).toLocaleString("en-IN")}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#5F5E5A]">
                          Actual ₹
                        </dt>
                        <dd className="break-all text-lg font-extrabold tabular-nums text-[#111110]">
                          ₹{Math.round(b.actual).toLocaleString("en-IN")}
                        </dd>
                      </div>
                    </dl>
                    {isOpen ? (
                      <div className="mt-3 border-t border-[#E8E6F0] pt-3">
                        {items.length === 0 ? (
                          <p className="py-1.5 text-[13px] text-[#9B9A94]">
                            No line items in this category yet.
                          </p>
                        ) : null}
                        {items.map((item) => (
                          <div
                            key={item.label}
                            className="flex justify-between gap-3 py-1.5 text-[13px] text-[#454442]"
                          >
                            <span className="min-w-0 flex-1 leading-snug">
                              {item.label}
                            </span>
                            <span className="shrink-0 font-semibold tabular-nums text-[#111110]">
                              ₹
                              {Math.round(item.value || 0).toLocaleString(
                                "en-IN",
                              )}
                            </span>
                          </div>
                        ))}
                        {items.length > 0 ? (
                          <div className="mt-2 flex justify-between border-t border-[#E8E6F0] pt-2 text-[13px] font-bold text-[#111110]">
                            <span>Total</span>
                            <span className="tabular-nums">
                              ₹{Math.round(total).toLocaleString("en-IN")}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <div className="rounded-2xl border border-dashed border-[#D4D2F5] bg-[#F7F7F4] p-4">
                <div className="space-y-2 text-[13px]">
                  <div className="flex justify-between gap-3">
                    <span className="text-[#5F5E5A]">Total income</span>
                    <span className="font-semibold tabular-nums text-[#111110]">
                      ₹{Math.round(totalIncome).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#5F5E5A]">
                      Total outflow
                      {epfMonthly > 0 ? " (excl. EPF)" : ""}
                    </span>
                    <span className="font-semibold tabular-nums text-[#B42323]">
                      ₹{Math.round(totalOutflow).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3 border-t border-[#E8E6F0] pt-2">
                    <span className="font-semibold text-[#111110]">
                      Amount left
                    </span>
                    <span
                      className={`break-all text-right font-bold tabular-nums ${amountLeftInHand >= 0 ? "text-[#0F766E]" : "text-[#B42323]"}`}
                    >
                      ₹{Math.round(amountLeftInHand).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs font-medium text-[#5F5E5A]">
                  {epfMonthly > 0
                    ? `EPF ₹${Math.round(epfMonthly).toLocaleString("en-IN")}/mo is deducted at source and is not subtracted from in-hand surplus.`
                    : "Income not mapped into these buckets."}
                </p>
              </div>
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-[#E8E6F0] md:block">
              <table className="w-full min-w-[640px] text-left text-sm text-[#111110]">
                <thead className="bg-[#F7F6FE] text-xs font-semibold text-[#3C3489]">
                  <tr>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Cap%</th>
                    <th className="px-3 py-2">Cap₹</th>
                    <th className="px-3 py-2">Actual₹</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[#111110]">
                  {buckets.map((b) => {
                    const status =
                      b.actual > b.capAmount * 1.15
                        ? "Critical"
                        : b.actual > b.capAmount
                          ? "Warning"
                          : "Good";
                    const isOpen = expandedRows.includes(b.key);
                    const items =
                      bucketExpandedItems[
                        b.key as keyof typeof bucketExpandedItems
                      ] ?? [];
                    const total = items.reduce(
                      (sum, item) => sum + (item.value || 0),
                      0,
                    );
                    return (
                      <Fragment key={b.key}>
                        <tr
                          className="cursor-pointer border-t border-[#EFEDE7] hover:bg-[#FAFAFE]"
                          onClick={() => toggleRow(b.key)}
                        >
                          <td className="px-3 py-2 font-medium text-[#111110]">
                            <span className="inline-flex items-center gap-2">
                              <span
                                className={`text-[#534AB7] transition-transform ${isOpen ? "rotate-90" : ""}`}
                              >
                                ▸
                              </span>
                              <span>{b.label}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2 font-semibold tabular-nums">
                            {b.capPercent}%
                          </td>
                          <td className="px-3 py-2 font-semibold tabular-nums">
                            ₹{Math.round(b.capAmount).toLocaleString("en-IN")}
                          </td>
                          <td className="px-3 py-2 font-semibold tabular-nums">
                            ₹{Math.round(b.actual).toLocaleString("en-IN")}
                          </td>
                          <td className="px-3 py-2 font-semibold">{status}</td>
                        </tr>
                        {isOpen ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="border-t border-[#E8E6F0] bg-[#F7F7F4] px-4 py-2"
                            >
                              {items.length === 0 ? (
                                <p className="py-1 text-[13px] text-[#9B9A94]">
                                  No line items in this category yet.
                                </p>
                              ) : null}
                              {items.map((item) => (
                                <div
                                  key={item.label}
                                  className="flex justify-between py-1 text-[13px] text-[#454442]"
                                >
                                  <span>{item.label}</span>
                                  <span className="font-semibold tabular-nums text-[#111110]">
                                    ₹
                                    {Math.round(item.value || 0).toLocaleString(
                                      "en-IN",
                                    )}
                                  </span>
                                </div>
                              ))}
                              {items.length > 0 ? (
                                <div className="flex justify-between py-1 text-[13px] font-bold text-[#111110]">
                                  <span>Total</span>
                                  <span className="tabular-nums">
                                    ₹{Math.round(total).toLocaleString("en-IN")}
                                  </span>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                  <tr className="border-t border-[#EFEDE7] bg-[#F7F7F4]">
                    <td className="px-3 py-2 font-semibold text-[#111110]">
                      Total income
                    </td>
                    <td className="px-3 py-2 text-[#5F5E5A]">—</td>
                    <td className="px-3 py-2 text-[#5F5E5A]">—</td>
                    <td className="px-3 py-2 font-semibold tabular-nums text-[#111110]">
                      ₹{Math.round(totalIncome).toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-2 text-[#5F5E5A]">—</td>
                  </tr>
                  <tr className="border-t border-[#EFEDE7] bg-[#F7F7F4]">
                    <td className="px-3 py-2 font-semibold text-[#111110]">
                      Total outflow
                      {epfMonthly > 0 ? (
                        <span className="ml-1 text-xs font-medium text-[#5F5E5A]">
                          (excl. EPF)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-[#5F5E5A]">—</td>
                    <td className="px-3 py-2 text-[#5F5E5A]">—</td>
                    <td className="px-3 py-2 font-semibold tabular-nums text-[#B42323]">
                      ₹{Math.round(totalOutflow).toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-2 text-[#5F5E5A]">—</td>
                  </tr>
                  <tr className="border-t border-[#EFEDE7] bg-[#EEEDFE]">
                    <td className="px-3 py-2 font-semibold text-[#111110]">
                      Amount left
                    </td>
                    <td className="px-3 py-2 text-[#5F5E5A]">—</td>
                    <td className="px-3 py-2 text-[#5F5E5A]">—</td>
                    <td
                      className={`px-3 py-2 font-bold tabular-nums ${amountLeftInHand >= 0 ? "text-[#0F766E]" : "text-[#B42323]"}`}
                    >
                      ₹{Math.round(amountLeftInHand).toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-2 text-[#5F5E5A]">—</td>
                  </tr>
                </tbody>
              </table>
              {epfMonthly > 0 ? (
                <p className="border-t border-[#E8E6F0] bg-white px-3 py-2 text-xs font-medium text-[#5F5E5A]">
                  EPF ₹{Math.round(epfMonthly).toLocaleString("en-IN")}/mo still
                  shows under Investment for savings tracking, but is deducted
                  at source — not counted in total outflow or amount left.
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5">
            <h2 className="text-xl font-semibold">
              Your financial health gauges
            </h2>
            <div className="mt-3 rounded-2xl bg-[#FAFAFE] p-3">
              <SpeedoMeter
                {...buildSpeedoMeterProps(lastSubmission)}
                title=""
              />
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm font-medium leading-relaxed text-[#454442]">
              <li>Needs should stay close to cap for stability.</li>
              <li>
                Loan ratio under {Math.round(caps.loans * 100)}% improves
                flexibility.
              </li>
              <li>Investment consistency drives score growth.</li>
            </ul>
          </section>

          <section className="rounded-2xl bg-white p-5">
            <h2 className="text-xl font-semibold">
              {`Your financial safety net — ${safetyItems.length} checks`}
            </h2>
            <p className="text-sm font-medium leading-relaxed text-[#454442]">
              {safetyNetSubtitle}
            </p>
            <div className="mt-3 space-y-2">
              {safetyItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-[#ECEAF5] p-3"
                >
                  <div className="text-sm">
                    <p className="font-semibold">
                      <span className="inline-flex items-center gap-2">
                        <AppIcon
                          name={item.icon as AppIconName}
                          size={18}
                          color="#534AB7"
                        />
                        {item.title}
                      </span>
                    </p>
                    <p className="text-[13px] font-medium leading-snug text-[#454442]">
                      Current {item.formatCurrent(item.current)} vs target{" "}
                      {item.formatTarget(item.target)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                        (item as any).status === "partial"
                          ? "bg-[#FFF3E6] text-[#BA7517]"
                          : item.isOk
                            ? "bg-[#E8F6F1] text-[#1D9E75]"
                            : "bg-[#FDEDEC] text-[#E24B4A]"
                      }`}
                    >
                      {(item as any).status === "partial"
                        ? "⚠"
                        : item.isOk
                          ? "✓"
                          : "✕"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {(safetyItems.find((i: any) => i.id === "term") as any)
              ?.infoText ? (
              <p className="mt-2 text-xs font-medium leading-relaxed text-[#5F5E5A]">
                {
                  (safetyItems.find((i: any) => i.id === "term") as any)
                    .infoText
                }
              </p>
            ) : null}
            {termStatus === "missing" ? (
              <Link
                href="/learn/term-insurance-vs-endowment-why-most-indians-buy-wrong"
                className="mt-2 inline-flex rounded-lg bg-[#534AB7] px-3 py-2 text-xs font-semibold text-white hover:opacity-95"
              >
                Why term cover matters (educational) →
              </Link>
            ) : null}
            <p className="mt-3 text-sm font-semibold text-[#454442]">
              {completeCount} of {safetyItems.length} in place
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ECEAF5]">
              <div
                className="h-full bg-[#534AB7]"
                style={{
                  width: `${(completeCount / safetyItems.length) * 100}%`,
                }}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-[#DCD8F4] bg-white p-5">
            <h2 className="text-xl font-semibold">
              Your personalised 12-month plan
            </h2>
            <div className="mt-3 rounded-xl bg-[#F7F6FE] p-3 text-sm">
              {planTeaser.first ? (
                <>
                  <p className="font-medium">
                    ✓ Step 1: {planTeaser.first.title}
                  </p>
                  {planTeaser.first.actionThisWeek ? (
                    <p className="mt-1 font-medium leading-relaxed text-[#454442]">
                      {planTeaser.first.actionThisWeek}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="font-medium">
                  ✓ No open gaps right now — keep your current plan on track.
                </p>
              )}
              {planTeaser.teaserTitles.map((title, i) => (
                <p
                  key={`teaser-${i}`}
                  className={`blur-[2px] ${i === 0 ? "mt-3" : ""}`}
                >
                  <span className="inline-flex items-center gap-2">
                    <AppIcon name="lock" size={14} color="currentColor" />
                    Step {i + 2}: {title} — unlock to see
                  </span>
                </p>
              ))}
              {planTeaser.moreCount > 0 ? (
                <p className="mt-2 text-xs font-medium text-[#5F5E5A]">
                  + {planTeaser.moreCount} more personalised{" "}
                  {planTeaser.moreCount === 1 ? "step" : "steps"}
                </p>
              ) : null}
            </div>
            <div className="mt-4 rounded-xl border border-[#E8E6F0] p-4">
              <p className="text-lg font-semibold">
                Your complete financial roadmap
              </p>
              <p className="text-sm font-medium text-[#454442]">
                ₹99 one-time · Yours forever
              </p>
              <p className="mt-2 text-sm text-[#534AB7]">
                Pay ₹99 · Earn Finkoin Keys (FK) for activity on Finkoin — use
                them on partner perks where available. FK do not reduce this
                unlock price.
              </p>
              {priorityPlan?.surplusBreakdown ? (
                <div className="mt-3 rounded-lg border border-[#E8E6F0] bg-[#FAFAFE] p-3 text-xs text-[#5F5E5A]">
                  <div className="flex items-center justify-between">
                    <span>Monthly Income</span>
                    <PrivateAmount value={totalIncome} label="monthly income">
                      ₹{Math.round(totalIncome).toLocaleString("en-IN")}
                    </PrivateAmount>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Less: Living expenses (Needs)</span>
                    <span>
                      -₹{Math.round(needsActual).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Less: Loan EMIs</span>
                    <span>
                      -₹{Math.round(loansActual).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Less: Wants + lifestyle</span>
                    <span>
                      -₹{Math.round(lifestyleActual).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Less: Insurance premiums + investment</span>
                    <span>
                      -₹
                      {Math.round(
                        securityActual + investmentActual,
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="mt-2 border-t border-[#E8E6F0] pt-2 text-sm font-semibold text-[#3C3489] flex items-center justify-between">
                    <span>Your Monthly Surplus</span>
                    <span>
                      ₹{Math.round(amountLeftInHand).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ) : null}
              <ul className="mt-3 space-y-1 text-sm text-[#5F5E5A]">
                <li>✓ Complete priority plan</li>
                <li>✓ Debt clearance strategy</li>
                <li>✓ 12-month action plan</li>
                <li>✓ PDF download</li>
                <li>✓ Insurance gap checklist (educational)</li>
              </ul>
              <button
                onClick={() => void handleUnlockClick()}
                className="mt-4 h-12 w-full rounded-xl bg-[#534AB7] font-bold text-white"
              >
                {ctaCopy.title}
              </button>
              <p className="mt-2 text-center text-xs font-medium text-[#5F5E5A]">
                {ctaCopy.subText}
              </p>
              <p className="mt-2 text-center text-xs font-medium text-[#5F5E5A]">
                Educational only
              </p>
            </div>
          </section>

          {showFeedback ? (
            <div style={{ padding: "0 16px 16px" }}>
              <FeedbackWidget
                pageContext="analyse"
                onClose={() => setShowFeedback(false)}
              />
            </div>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-semibold text-slate-900">Keep going</h2>
            <p className="mt-1 text-sm text-slate-600">
              Explore calculators and tools that pair with your report.
            </p>
            <ul className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-[#534AB7]">
              <li>
                <Link
                  href="/calculators/tax-regime-2026"
                  className="hover:underline"
                >
                  Tax regime calculator
                </Link>
              </li>
              <li>
                <Link href="/tracker" className="hover:underline">
                  Expense tracker
                </Link>
              </li>
              <li>
                <Link href="/learn" className="hover:underline">
                  Learn personal finance
                </Link>
              </li>
            </ul>
          </section>
        </div>

        <PaywallModal
          open={showPaymentModal}
          onClose={handleCloseModal}
          priceLabel="Pay ₹99"
        />
      </div>
    </AnalyseResultErrorBoundary>
  );
}
