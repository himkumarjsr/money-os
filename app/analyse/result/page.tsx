"use client";

import { PaywallModal } from "@/components/analyse/paywall-modal";
import SpeedoMeter from "@/components/ui/SpeedoMeter";
import { buildPriorityPlan } from "@/lib/priorityEngine";
import { buildSpeedoMeterProps } from "@/lib/speedo-meter-buckets";
import { analyseFinances } from "@/lib/financialEngine";
import { useFinancialStore } from "@/store/financialStore";
import { Fragment, useMemo, useState } from "react";

export default function AnalyseResultPage() {
  const data = useFinancialStore((s) => s.lastSubmission);
  const result = useFinancialStore((s) => s.result);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const toggleRow = (key: string) => {
    setExpandedRows((prev) => (prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]));
  };

  const priorityPlan = useMemo(() => {
    if (!data) return null;
    const stableResult = result ?? analyseFinances(data);
    return buildPriorityPlan(data, {
      needsActual: (data.rentAmount || 0) + (data.grocery || 0) + (data.vegetables || 0),
      loansActual: (data.homeLoanEMI || 0) + (data.personalLoanEMI || 0),
      wantsActual: (data.shopping || 0) + (data.entertainment || 0),
      investmentActual: data.monthlySIP || 0,
      overallScore: stableResult.overallScore,
    });
  }, [data, result]);

  if (!data || !priorityPlan) {
    return <div className="min-h-dvh p-8">No analysis found. Please submit the form first.</div>;
  }

  const profile = data;
  const analysis = useMemo(() => result ?? analyseFinances(data), [data, result]);
  const score = analysis?.overallScore ?? 0;
  const scoreBadgeTone = score < 40 ? "bg-[#E24B4A]/25 text-[#FFE6E6]" : score < 70 ? "bg-[#BA7517]/25 text-[#FFEFD8]" : "bg-[#1D9E75]/25 text-[#E5FFF7]";
  const scoreLabel = score < 40 ? "Critical" : score < 70 ? "Warning" : "Good";

  const assets = analysis?.totalAssets || 0;
  const liabilities = analysis?.totalLiabilities || 0;
  const netWorth = analysis?.netWorth || 0;
  if (process.env.NODE_ENV === "development") {
    console.log("NET WORTH CALC:", {
      homeMarketValue: data.homeMarketValue,
      carMarketValue: data.carMarketValue,
      epfBalance: data.epfBalance,
      fdValue: data.fdValue,
      savingsAccountBalance: data.savingsAccountBalance,
      goldValue: data.goldValue,
    });
  }
  const income = (data.monthlySalary || 0) + (data.spouseIncome || 0) + (data.otherIncome || 0);
  const foodActual =
    (data.foodTotal || 0) > 0
      ? (data.foodTotal || 0)
      : (data.vegetables || 0) + (data.grocery || 0) + (data.medicine || 0);
  const transportActual =
    (data.transportTotal || 0) > 0
      ? (data.transportTotal || 0)
      : (data.fuel || 0) + (data.cabMetro || 0);
  const utilityActual =
    (data.utilityTotal || 0) > 0
      ? (data.utilityTotal || 0)
      : (data.electricity || 0) + (data.internet || 0) + (data.gas || 0) + (data.water || 0);
  const domesticActual =
    (data.domesticHelpTotal || 0) > 0
      ? (data.domesticHelpTotal || 0)
      : (data.houseHelpMonthly || 0) + (data.cookHelpMonthly || 0);
  const lifestyleActual =
    (data.lifestyleTotal || 0) > 0
      ? (data.lifestyleTotal || 0)
      : (data.entertainment || 0) + (data.shopping || 0) + (data.personalCare || 0);
  const additionalObligationLoanActual = (data.additionalObligations || []).reduce(
    (sum: number, obligation: any) => sum + (obligation?.monthlyAmount || 0),
    0,
  );
  const needsActual =
    (data.rentAmount || 0) +
    (data.rentMaintenanceMonthly || 0) +
    (data.homeLoanEMI || 0) +
    (data.secondPropertyEMI || 0) +
    foodActual +
    transportActual +
    utilityActual +
    domesticActual +
    (data.kidsSchoolFees || 0) +
    (data.kidsActivities || 0) +
    (data.parentsSupport || 0);
  const loansActual =
    (data.personalLoanEMI || 0) +
    (data.carLoanEMI || 0) +
    (data.bikeEMI || 0) +
    (data.creditCardBillMonthly || 0) +
    additionalObligationLoanActual;
  const securityActual = (data.monthlyPPFContribution || 0) + (data.monthlyNPSContribution || 0);
  const investmentActual = data.monthlySIP || 0;
  const needsMonthly =
    (data.rentAmount || 0) +
    (data.homeLoanEMI || 0) +
    foodActual +
    transportActual +
    utilityActual +
    domesticActual;

  const needsExpandedItems = [
    { label: "Rent", value: profile.rentAmount },
    { label: "Rent maintenance", value: profile.rentMaintenanceMonthly },
    { label: "Home loan EMI", value: profile.homeLoanEMI },
    { label: "Second property EMI", value: profile.secondPropertyEMI },
    { label: "Food and daily essentials", value: foodActual },
    { label: "Transport", value: transportActual },
    { label: "Utilities", value: utilityActual },
    { label: "Domestic help", value: domesticActual },
    { label: "Kids school", value: profile.kidsSchoolFees },
    { label: "Kids activities", value: profile.kidsActivities },
    { label: "Parents support", value: profile.parentsSupport },
  ].filter((item) => (item.value || 0) > 0);

  const getLoanLabel = (baseName: string, lenderName?: string) => {
    if (lenderName && lenderName.trim()) return `${baseName} (${lenderName.trim()})`;
    return baseName;
  };

  const loanExpandedItems = [
    { label: getLoanLabel("Home loan EMI", profile.homeLoanLenderName), value: profile.homeLoanEMI },
    { label: getLoanLabel("Car loan EMI", profile.carLoanLenderName), value: profile.carLoanEMI },
    { label: getLoanLabel("Bike loan EMI", profile.bikeLoanLenderName), value: profile.bikeEMI },
    { label: getLoanLabel("Personal loan EMI", profile.personalLoanLenderName), value: profile.personalLoanEMI },
    { label: "Credit card", value: profile.creditCardBillMonthly },
    ...((profile.additionalObligations || []).map((o: any) => ({
      label: o.lenderName ? `${o.type} (${o.lenderName})` : (o.type || "Other loan"),
      value: o.monthlyAmount,
    })) as { label: string; value: number }[]),
  ].filter((item) => (item.value || 0) > 0);

  if (process.env.NODE_ENV === "development") {
    console.log("LENDER NAMES:", {
      personal: profile.personalLoanLenderName,
      additional: profile.additionalObligations?.map((o: any) => o.lenderName),
    });
  }

  const buckets = [
    { key: "needs", label: "Needs", capPercent: 20, actual: needsActual, capAmount: income * 0.2, details: "Housing + essentials + family support" },
    { key: "wants", label: "Wants", capPercent: 5, actual: lifestyleActual, capAmount: income * 0.05, details: "Shopping, entertainment and lifestyle spends" },
    { key: "security", label: "Security", capPercent: 5, actual: securityActual, capAmount: income * 0.05, details: "Protection reserves and safety corpus" },
    { key: "loans", label: "Loans", capPercent: 40, actual: loansActual, capAmount: income * 0.4, details: "All monthly debt obligations" },
    { key: "investment", label: "Investment", capPercent: 30, actual: investmentActual, capAmount: income * 0.3, details: "Wealth creation and long-term investing" },
  ];

  const termStatus = (() => {
    const hasTerm = profile?.hasTermInsurance;
    const termCover = profile?.termInsuranceSumAssured || 0;
    const termNeeded = analysis?.termInsuranceNeeded || 0;
    if (!hasTerm || termCover === 0) return "missing" as const;
    if (termNeeded > 0 && termCover >= termNeeded) return "complete" as const;
    return "partial" as const;
  })();

  const safetyItems = [
    {
      id: "emergency",
      title: "Emergency fund",
      current: analysis?.realEmergencyFund?.total || 0,
      target: needsMonthly * (profile?.lifeStage === "kids" ? 12 : profile?.lifeStage === "married" ? 9 : 6),
      formatCurrent: (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`,
      formatTarget: (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`,
      isOk: (analysis?.realEmergencyFund?.monthsCovered || 0) >= (profile?.lifeStage === "kids" ? 9 : profile?.lifeStage === "married" ? 6 : 6),
      icon: "🛡️",
    },
    {
      id: "medical",
      title: "Medical emergency fund",
      current: profile?.medicalEmergencyFund || 0,
      target: 200000,
      formatCurrent: (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`,
      formatTarget: () => "₹2,00,000",
      isOk: (profile?.medicalEmergencyFund || 0) >= 200000,
      icon: "🏥",
    },
    {
      id: "term",
      title:
        termStatus === "missing"
          ? "Buy term insurance"
          : termStatus === "partial"
            ? "Term cover"
            : "Term insurance",
      current: profile?.termInsuranceSumAssured || 0,
      target: analysis?.termInsuranceNeeded || 0,
      formatCurrent: (v: number) => (v === 0 ? "None" : `₹${(v / 10000000).toFixed(1)} crore`),
      formatTarget: (v: number) =>
        termStatus === "partial"
          ? `₹${(v / 10000000).toFixed(1)} crore recommended`
          : `₹${(v / 10000000).toFixed(1)} crore`,
      isOk: termStatus === "complete",
      status: termStatus,
      infoText:
        termStatus === "partial"
          ? "Your existing policy is good. A top-up plan can add more cover at lower cost than a new policy."
          : termStatus === "complete"
            ? "Cover is adequate"
            : "You have no term insurance",
      actionLabel: termStatus === "missing" ? "Buy from Finkoin →" : undefined,
      icon: "🛡️",
    },
    {
      id: "health",
      title: (profile?.healthInsuranceSumInsured || 0) > 0 ? "Health insurance" : "Buy health insurance",
      current: profile?.healthInsuranceSumInsured || 0,
      target: profile?.lifeStage === "bachelor" ? 500000 : 1000000,
      formatCurrent: (v: number) => (v === 0 ? "None" : `₹${(v / 100000).toFixed(0)} lakh`),
      formatTarget: (v: number) => `₹${(v / 100000).toFixed(0)} lakh`,
      isOk: (profile?.healthInsuranceSumInsured || 0) >= (profile?.lifeStage === "bachelor" ? 500000 : 1000000),
      icon: "🏥",
    },
    {
      id: "investment",
      title: "Investing regularly",
      current: analysis?.scores?.savingsRate || 0,
      target: 15,
      formatCurrent: (v: number) => `${Math.round(v)}% of income`,
      formatTarget: () => "15% minimum",
      isOk: (analysis?.scores?.savingsRate || 0) >= 15,
      icon: "📈",
    },
  ];
  const completeCount = safetyItems.filter((i) => i.isOk).length;
  const hasCriticalIssues = (analysis?.criticalIssueCount || 0) > 0;
  const ctaCopy = hasCriticalIssues
    ? {
        title: "Get my personalised fix plan →",
        subText: "See exactly how to fix these gaps",
      }
    : score < 50
      ? {
          title: "See my complete recovery plan →",
          subText: "12-month step by step roadmap",
        }
      : score <= 70
        ? {
            title: "Get my optimisation plan →",
            subText: "Turn gaps into growth",
          }
        : score > 70
          ? {
              title: "Get my wealth building plan →",
              subText: "Next steps to financial freedom",
            }
          : {
              title: "Get my complete financial plan →",
              subText: "Your next steps are ready",
            };

  const handleOpenModal = () => {
    setShowPaymentModal(true);
  };
  const handleCloseModal = () => {
    setShowPaymentModal(false);
  };

  return (
    <div className="min-h-dvh bg-[#F7F7F4] px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-3xl bg-[linear-gradient(135deg,#3C3489_0%,#534AB7_100%)] p-5 text-white">
          <div className="grid items-center gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-sm text-[#D5D0FA]">Health report</p>
              <p className="mt-1 text-3xl font-bold">Your financial health</p>
              <p className="mt-1 text-sm text-[#D5D0FA]">{data.lifeStage} · {data.cityTier} · {data.primaryGoal}</p>
              <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${scoreBadgeTone}`}>{scoreLabel}</span>
            </div>
            <div className="ml-auto w-full max-w-[230px] rounded-2xl p-2 text-center bg-white/10">
              <p className="text-xs uppercase tracking-wide text-white/90">Health score</p>
              <SpeedoMeter
                income={100}
                needs={score}
                wants={0}
                loans={0}
                investment={0}
                title=""
                singleScore={score}
                singleTone={score < 40 ? "red" : score < 70 ? "amber" : "green"}
                className="border-0 bg-transparent p-0 shadow-none"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E8E6F0] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#534AB7]">LIVE NET WORTH SUMMARY</p>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <div><p className="text-xs text-[#9B9A94]">TOTAL ASSETS</p><p className="text-2xl font-bold text-[#111110]">₹{Math.round(assets).toLocaleString("en-IN")}</p></div>
            <div><p className="text-xs text-[#9B9A94]">TOTAL LIABILITIES</p><p className="text-2xl font-bold text-[#8C3A3A]">₹{Math.round(liabilities).toLocaleString("en-IN")}</p></div>
            <div><p className="text-xs text-[#9B9A94]">NET WORTH</p><p className={`text-2xl font-bold ${netWorth >= 0 ? "text-[#1D9E75]" : "text-[#E24B4A]"}`}>₹{Math.round(netWorth).toLocaleString("en-IN")}</p></div>
          </div>
          <p className="mt-3 text-xs text-[#7A7871]">You are around the 62nd percentile compared to similar users by life-stage and city tier.</p>
        </section>

        {/* <section className="rounded-2xl bg-gradient-to-r from-[#4A3FB2] to-[#6E62D7] p-5 text-white">
          <p className="text-xs uppercase tracking-wide text-[#D5D0FA]">HEALTH SCORE</p>
          <p className="mt-2 text-5xl font-extrabold">{score}/100</p>
        </section> */}

        <section className="rounded-2xl bg-white p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[#E8E6F0] p-3"><p className="text-xs text-[#9B9A94]">Monthly investment rate</p><p className="text-2xl font-bold">{Math.round(((data.monthlySIP || 0) / Math.max(income, 1)) * 100)}%</p></div>
            <div className="rounded-xl border border-[#E8E6F0] p-3"><p className="text-xs text-[#9B9A94]">Loan ratio</p><p className="text-2xl font-bold text-[#8C3A3A]">{Math.round((((data.homeLoanEMI || 0) + (data.personalLoanEMI || 0)) / Math.max(income, 1)) * 100)}%</p></div>
            <div className="rounded-xl border border-[#E8E6F0] p-3"><p className="text-xs text-[#9B9A94]">Unallocated ₹</p><p className="text-2xl font-bold text-[#BA7517]">₹{Math.max(0, income - buckets.reduce((s, b) => s + b.actual, 0)).toLocaleString("en-IN")}</p></div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#E8E6F0]">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-[#F7F6FE] text-xs text-[#534AB7]"><tr><th className="px-3 py-2">Category</th><th className="px-3 py-2">Cap%</th><th className="px-3 py-2">Cap₹</th><th className="px-3 py-2">Actual₹</th><th className="px-3 py-2">Status</th></tr></thead>
              <tbody>
                {buckets.map((b) => {
                  const status = b.actual > b.capAmount * 1.15 ? "Critical" : b.actual > b.capAmount ? "Warning" : "Good";
                  const expandable = b.key === "needs" || b.key === "loans";
                  const isOpen = expandedRows.includes(b.key);
                  const items = b.key === "needs" ? needsExpandedItems : b.key === "loans" ? loanExpandedItems : [];
                  const total = items.reduce((sum, item) => sum + (item.value || 0), 0);
                  return (
                    <Fragment key={b.key}>
                      <tr className={expandable ? "cursor-pointer border-t border-[#EFEDE7]" : "border-t border-[#EFEDE7]"} onClick={expandable ? () => toggleRow(b.key) : undefined}>
                        <td className="px-3 py-2 font-medium">
                          <span className="inline-flex items-center gap-2">
                            {expandable ? <span className={`transition-transform ${isOpen ? "rotate-90" : ""}`}>►</span> : null}
                            <span>{b.label}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2">{b.capPercent}%</td>
                        <td className="px-3 py-2">₹{Math.round(b.capAmount).toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2">₹{Math.round(b.actual).toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2">{status}</td>
                      </tr>
                      {expandable && isOpen ? (
                        <tr>
                          <td colSpan={5} className="border-t border-[#E8E6F0] bg-[#F7F7F4] px-4 py-2">
                            {items.map((item) => (
                              <div key={item.label} className="flex justify-between py-1 text-[13px] text-[#5F5E5A]">
                                <span>{item.label}</span>
                                <span>₹{Math.round(item.value || 0).toLocaleString("en-IN")}</span>
                              </div>
                            ))}
                            <div className="flex justify-between py-1 text-[13px] font-bold text-[#111110]">
                              <span>Total</span>
                              <span>₹{Math.round(total).toLocaleString("en-IN")}</span>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
                <tr className="border-t border-[#EFEDE7] bg-[#F7F7F4]"><td className="px-3 py-2 font-semibold">Unallocated</td><td className="px-3 py-2">—</td><td className="px-3 py-2">—</td><td className="px-3 py-2">₹{Math.max(0, income - buckets.reduce((s, b) => s + b.actual, 0)).toLocaleString("en-IN")}</td><td className="px-3 py-2">—</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5">
          <h2 className="text-xl font-semibold">Your financial health gauges</h2>
          <div className="mt-3 rounded-2xl bg-[#FAFAFE] p-3">
            <SpeedoMeter {...buildSpeedoMeterProps(data)} title="" />
          </div>
          <ul className="mt-3 list-disc pl-5 text-sm text-[#7A7871]"><li>Needs should stay close to cap for stability.</li><li>Loan ratio under 40% improves flexibility.</li><li>Investment consistency drives score growth.</li></ul>
        </section>

        <section className="rounded-2xl bg-white p-5">
          <h2 className="text-xl font-semibold">Your financial safety net</h2>
          <p className="text-sm text-[#7A7871]">Emergency fund · insurance cover · medical reserve · debt protection · goal readiness</p>
          <div className="mt-3 space-y-2">
            {safetyItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#ECEAF5] p-3">
                <div className="text-sm">
                  <p className="font-semibold">
                    {item.icon} {item.title}
                  </p>
                  <p className="text-[#7A7871]">
                    Current {item.formatCurrent(item.current)} vs target {item.formatTarget(item.target)}
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
                    {(item as any).status === "partial" ? "⚠" : item.isOk ? "✓" : "✕"}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {(safetyItems.find((i: any) => i.id === "term") as any)?.infoText ? (
            <p className="mt-2 text-xs text-[#7A7871]">
              {(safetyItems.find((i: any) => i.id === "term") as any).infoText}
            </p>
          ) : null}
          {(safetyItems.find((i: any) => i.id === "term") as any)?.actionLabel ? (
            <button className="mt-2 rounded-lg bg-[#534AB7] px-3 py-2 text-xs font-semibold text-white">
              {(safetyItems.find((i: any) => i.id === "term") as any).actionLabel}
            </button>
          ) : null}
          <p className="mt-3 text-sm text-[#7A7871]">{completeCount} of 5 in place</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ECEAF5]"><div className="h-full bg-[#534AB7]" style={{ width: `${(completeCount / 5) * 100}%` }} /></div>
        </section>

        <section className="rounded-2xl border border-[#DCD8F4] bg-white p-5">
          <h2 className="text-xl font-semibold">Your personalised 12-month plan</h2>
          <div className="mt-3 rounded-xl bg-[#F7F6FE] p-3 text-sm">
            <p className="font-medium">✓ Step 1: {priorityPlan.priorities[0]?.title || "Emergency fund"}</p>
            <p className="mt-1 text-[#7A7871]">{priorityPlan.priorities[0]?.actionThisWeek || "Start building your safety layer."}</p>
            <p className="mt-3 blur-[2px]">🔒 Step 2: [blurred] — unlock to see</p>
            <p className="blur-[2px]">🔒 Step 3: [blurred] — unlock to see</p>
            <p className="mt-2 text-xs text-[#7A7871]">+ 8 more personalised steps</p>
          </div>
          <div className="mt-4 rounded-xl border border-[#E8E6F0] p-4">
            <p className="text-lg font-semibold">Your complete financial roadmap</p>
            <p className="text-sm text-[#7A7871]">₹99 one-time · Yours forever</p>
            <p className="mt-2 text-sm text-[#534AB7]">
              Pay ₹99 · Earn Finkoin Keys (FK) for activity — redeem them as discounts on insurance from Finkoin, not on this unlock.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-[#5F5E5A]"><li>✓ Complete priority plan</li><li>✓ Debt clearance strategy</li><li>✓ 12-month action plan</li><li>✓ PDF download</li><li>✓ Insurance from Finkoin</li></ul>
            <button onClick={handleOpenModal} className="mt-4 h-12 w-full rounded-xl bg-[#534AB7] font-bold text-white">{ctaCopy.title}</button>
            <p className="mt-2 text-center text-xs text-[#7A7871]">{ctaCopy.subText}</p>
            <p className="mt-2 text-center text-xs text-[#9B9A94]">Educational only</p>
          </div>
        </section>
      </div>

      <PaywallModal open={showPaymentModal} onClose={handleCloseModal} priceLabel="Pay ₹99" />
    </div>
  );
}
