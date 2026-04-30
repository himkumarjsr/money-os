"use client";

import type { ReactNode } from "react";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import type {
  FinkoinAIPlan,
  FinkoinAssetOptimization,
  FinkoinDebtPlanItem,
  FinkoinInsuranceGap,
  FinkoinMandatoryFund,
  FinkoinMonthlyAllocationRow,
} from "@/lib/finkoinAiPlan";
import { fmt, fmtWords } from "@/lib/optimizer-format";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { MonthlyAllocationPieChart } from "@/components/finkoin/MonthlyAllocationPieChart";
import {
  computeMisladder,
  getOptimizerPhaseNumbers,
  OptimizerStopPayingInsuranceSection,
  OptimizerTwelveMonthPhasesSection,
  OptimizerYearByYearSection,
  TermInsuranceGapCard,
} from "@/components/finkoin/optimizer-full-sections";

const PIE_SAFETY = "#534AB7";
const PIE_INVEST = "#1D9E75";
const PIE_BUFFER = "#E8E6F0";

function num(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

/** Personal loan EMI is known but principal was not entered — do not show invented outstanding/tenure. */
function personalLoanPrincipalUnknown(
  d: FinkoinDebtPlanItem,
  profile?: FinancialProfile | null,
): boolean {
  if (!profile) return false;
  if (!/^personal\s*loan/i.test(String(d.debtType ?? "").trim())) return false;
  const emi = num(profile.personalLoanEMI);
  const out = num(profile.personalLoanOutstanding);
  return emi > 0 && !(out > 0);
}

function sanitizeCopy(s: string): string {
  return s
    .replace(/\bmodel\s+surplus\b/gi, "surplus")
    .replace(/\b\(model\)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-base font-semibold text-slate-900">{children}</h3>;
}

function Rupee({ n: value, words }: { n: number; words?: boolean }) {
  const r = Math.round(value);
  return (
    <span className="tabular-nums">
      {fmt(r)}
      {words && Math.abs(r) >= 1_00_000 ? (
        <span className="mt-0.5 block text-xs font-normal text-[#9B9A94]">{fmtWords(r)}</span>
      ) : null}
    </span>
  );
}

function categorizeRowCategory(category: string): "safety" | "invest" | "other" {
  const c = (category || "").toLowerCase();
  if (/insur|premium|emergency|health|term|medical|ssy|safety|security|protect/.test(c)) return "safety";
  if (/sip|invest|equity|mutual|elss|index|ppf|nps|wealth|grow|fund/.test(c)) return "invest";
  return "other";
}

export function FinkoinAiPlanView({
  plan,
  variant,
  profile,
  surplusMonthly,
}: {
  plan: FinkoinAIPlan;
  variant: "summary" | "full";
  profile?: FinancialProfile | null;
  surplusMonthly?: number;
}) {
  const insight = plan.lifeStageInsight;
  const debts = plan.debtPlan ?? [];
  const funds = plan.mandatoryFunds ?? [];
  const assets = plan.assetOptimization ?? [];
  const gaps = plan.insuranceGaps ?? [];
  const rows = plan.monthlyAllocation ?? [];
  const sp = plan.specialSituations;
  const kvp = plan.kvpInsuranceStrategy;

  const showDebts = variant === "full" ? debts : debts.slice(0, 3);
  const showFunds = variant === "full" ? funds : funds.slice(0, 4);
  const showAssets = variant === "full" ? assets : assets.slice(0, 2);

  const termGapIndex =
    variant === "full"
      ? gaps.findIndex((g) => /term\s*life|term\s*insurance|^term$/i.test((g.type || "").trim()))
      : -1;
  const termGap = termGapIndex >= 0 ? gaps[termGapIndex] : null;
  const otherGaps = termGapIndex >= 0 ? gaps.filter((_, i) => i !== termGapIndex) : gaps;

  const showGaps = variant === "full" ? otherGaps : otherGaps.slice(0, 3);

  let safetyAmount = 0;
  let investAmount = 0;
  let otherAlloc = 0;
  for (const r of rows) {
    const a = num(r.amount);
    if (a <= 0) continue;
    const cat = categorizeRowCategory(String(r.category ?? ""));
    if (cat === "safety") safetyAmount += a;
    else if (cat === "invest") investAmount += a;
    else otherAlloc += a;
  }
  const surplusBuf = Math.max(0, Math.round(surplusMonthly ?? 0));
  const bufferAmount = otherAlloc + surplusBuf;
  const pieAgg = [
    { name: "Safety net", value: Math.round(safetyAmount), fill: PIE_SAFETY },
    { name: "Investments", value: Math.round(investAmount), fill: PIE_INVEST },
    { name: "Buffer", value: Math.round(bufferAmount), fill: PIE_BUFFER },
  ].filter((d) => d.value > 0);
  const totalPie = pieAgg.reduce((s, d) => s + d.value, 0);

  const ladder = computeMisladder(profile ?? null, kvp);
  const phaseNums =
    variant === "full" ? getOptimizerPhaseNumbers(profile ?? null, surplusMonthly ?? 0) : null;

  return (
    <div className="space-y-6">
      {insight && (insight.headline || insight.stage) ? (
        <div className="rounded-2xl border border-[#E8E6F0] bg-gradient-to-br from-[#FAFAFE] to-white p-5">
          <SectionTitle>Life stage insight</SectionTitle>
          {insight.stage ? <p className="mt-1 text-xs font-medium uppercase text-[#534AB7]">{insight.stage}</p> : null}
          {insight.headline ? (
            <p className="mt-2 text-sm font-medium text-slate-900">{sanitizeCopy(insight.headline)}</p>
          ) : null}
          {surplusMonthly != null && surplusMonthly > 0 ? (
            <p className="mt-3 text-sm font-medium text-[#3C3489]">
              You have {fmt(Math.round(surplusMonthly))}/month to build your future with.
            </p>
          ) : null}
          {insight.keyChallenge ? (
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium text-slate-800">Challenge: </span>
              {sanitizeCopy(insight.keyChallenge)}
            </p>
          ) : null}
          {insight.biggestMistake ? (
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-medium text-slate-800">Common mistake: </span>
              {sanitizeCopy(insight.biggestMistake)}
            </p>
          ) : null}
          {insight.smartMove ? (
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-medium text-slate-800">Smart move: </span>
              {sanitizeCopy(insight.smartMove)}
            </p>
          ) : null}
          {insight.nextMilestone ? (
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-medium text-slate-800">Next milestone: </span>
              {sanitizeCopy(insight.nextMilestone)}
            </p>
          ) : null}
        </div>
      ) : null}

      {plan.topPriorityAction ? (
        <div className="rounded-2xl border-2 border-[#534AB7] bg-[#EEEDFE]/50 p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[#3C3489]">Top priority this week</p>
          <p className="mt-2 text-sm font-medium text-slate-900">{sanitizeCopy(plan.topPriorityAction)}</p>
        </div>
      ) : null}

      {plan.oneLiner ? <p className="text-sm font-medium text-slate-800">{sanitizeCopy(plan.oneLiner)}</p> : null}

      {showDebts.length > 0 ? (
        <div className="space-y-3">
          <SectionTitle>Debt plan</SectionTitle>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-3 py-2">Debt</th>
                  <th className="px-3 py-2">Outstanding</th>
                  <th className="px-3 py-2">EMI</th>
                  <th className="px-3 py-2">Extra / mo</th>
                  <th className="px-3 py-2">Months</th>
                  <th className="px-3 py-2">Rank</th>
                </tr>
              </thead>
              <tbody>
                {showDebts.map((d: FinkoinDebtPlanItem, i: number) => {
                  const plUnknown = personalLoanPrincipalUnknown(d, profile);
                  return (
                    <tr key={`${d.debtType}-${i}`} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {(d as FinkoinDebtPlanItem & { displayName?: string }).displayName || d.debtType}
                        {(d as FinkoinDebtPlanItem & { lenderName?: string; displayName?: string }).lenderName &&
                        !(d as FinkoinDebtPlanItem & { displayName?: string }).displayName ? (
                          <span className="block text-[11px] text-[#9B9A94]">
                            {(d as FinkoinDebtPlanItem & { lenderName?: string }).lenderName}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        {plUnknown ? (
                          <span className="text-slate-500">Not provided</span>
                        ) : (
                          <Rupee n={num(d.outstanding)} words={Math.abs(num(d.outstanding)) >= 1_00_000} />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Rupee n={num(d.currentEMI)} />
                      </td>
                      <td className="px-3 py-2">
                        <Rupee n={num(d.extraMonthlyPayment)} />
                      </td>
                      <td className="px-3 py-2">{plUnknown ? "—" : num(d.monthsToClear)}</td>
                      <td className="px-3 py-2">{d.priorityRank ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {debts.map((d, i) =>
            d.reasoning ? (
              <p key={`r-${i}`} className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">{d.debtType}: </span>
                {sanitizeCopy(d.reasoning)}
              </p>
            ) : null,
          )}
        </div>
      ) : null}

      {showFunds.length > 0 ? (
        <div className="space-y-3">
          <SectionTitle>Mandatory funds</SectionTitle>
          <ul className="space-y-3">
            {showFunds.map((f: FinkoinMandatoryFund, i: number) => (
              <li
                key={`${f.fundName}-${i}`}
                className={cn(
                  "rounded-xl border border-slate-200 p-4 border-l-4",
                  f.urgency === "critical" && "border-l-[#E24B4A]",
                  f.urgency === "high" && "border-l-amber-500",
                  f.urgency === "medium" && "border-l-teal-500",
                  !f.urgency && "border-l-slate-300",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{f.fundName}</span>
                  {f.urgency ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">
                      {f.urgency}
                    </span>
                  ) : null}
                </div>
                {f.purpose ? <p className="mt-2 text-sm text-slate-600">{sanitizeCopy(f.purpose)}</p> : null}
                <dl className="mt-3 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                  <div>
                    Target:{" "}
                    <span className="font-medium text-slate-800">
                      <Rupee n={num(f.targetAmount)} words={num(f.targetAmount) >= 1_00_000} />
                    </span>
                  </div>
                  <div>
                    Have:{" "}
                    <span className="font-medium text-slate-800">
                      <Rupee n={num(f.currentAmount)} words={num(f.currentAmount) >= 1_00_000} />
                    </span>
                  </div>
                  <div>
                    Gap: <span className="font-medium text-slate-800">{fmt(num(f.gap))}</span>
                  </div>
                  <div>
                    Monthly: <span className="font-medium text-slate-800">{fmt(num(f.monthlyContribution))}</span>
                  </div>
                </dl>
                {f.whereToKeep ? (
                  <p className="mt-2 text-sm text-slate-700">
                    <span className="font-medium">Where: </span>
                    {f.whereToKeep}
                  </p>
                ) : null}
                {f.whyThisInstrument ? <p className="mt-1 text-xs italic text-slate-500">{f.whyThisInstrument}</p> : null}
                {f.actionThisWeek ? (
                  <p className="mt-2 rounded-lg bg-[#F4F2FC] px-3 py-2 text-xs font-medium text-[#3C3489]">
                    This week: {sanitizeCopy(f.actionThisWeek)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showAssets.length > 0 ? (
        <div className="space-y-3">
          <SectionTitle>Asset optimisation</SectionTitle>
          <ul className="space-y-4">
            {showAssets.map((a: FinkoinAssetOptimization, i: number) => (
              <li key={`${a.currentAsset}-${i}`} className="rounded-xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">
                  {a.currentAsset}{" "}
                  <span className="font-normal text-slate-600">({fmt(num(a.currentAmount))})</span>
                </p>
                {a.problem ? <p className="mt-2 text-sm text-slate-600">{sanitizeCopy(a.problem)}</p> : null}
                {a.action ? (
                  <p className="mt-1 text-xs font-medium uppercase text-[#534AB7]">Action: {a.action}</p>
                ) : null}
                {a.splitPlan && (num(a.splitPlan.keepAmount) > 0 || num(a.splitPlan.moveAmount) > 0) ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {num(a.splitPlan.keepAmount) > 0 ? (
                      <li>
                        Keep {fmt(num(a.splitPlan.keepAmount))} in {a.splitPlan.keepWhere} — {a.splitPlan.keepReason}
                      </li>
                    ) : null}
                    {num(a.splitPlan.moveAmount) > 0 ? (
                      <li>
                        Move {fmt(num(a.splitPlan.moveAmount))} to {a.splitPlan.moveWhere} — {a.splitPlan.moveReason}
                      </li>
                    ) : null}
                    {num(a.splitPlan.moveAmount2) > 0 ? (
                      <li>
                        Move {fmt(num(a.splitPlan.moveAmount2))} to {a.splitPlan.moveWhere2} — {a.splitPlan.moveReason2}
                      </li>
                    ) : null}
                  </ul>
                ) : null}
                {a.benefit ? <p className="mt-2 text-sm text-emerald-800">{sanitizeCopy(a.benefit)}</p> : null}
                {a.howToDoIt ? <p className="mt-1 text-xs text-slate-600">{sanitizeCopy(a.howToDoIt)}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {variant === "full" && termGap && num(termGap.gap) > 0 ? <TermInsuranceGapCard gap={termGap} /> : null}

      {showGaps.length > 0 ? (
        <div className="space-y-3">
          <SectionTitle>{variant === "full" && termGap ? "Other insurance gaps" : "Insurance gaps"}</SectionTitle>
          <ul className="space-y-3">
            {showGaps.map((g: FinkoinInsuranceGap, i: number) => (
              <li key={`${g.type}-${i}`} className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="font-semibold text-slate-900">{g.type}</span>
                  {g.buyFromFinkoin ? (
                    <Link
                      href="/policies"
                      className="shrink-0 rounded-lg bg-[#534AB7] px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-[#4339a0]"
                    >
                      Policy vault →
                    </Link>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-slate-700">
                  Gap {fmt(num(g.gap))} · You have {fmt(num(g.currentCover))} → target {fmt(num(g.recommendedCover))}
                </p>
                {g.urgency ? <p className="mt-1 text-xs font-medium text-amber-900">Urgency: {g.urgency}</p> : null}
                {g.monthlyPremiumEstimate != null ? (
                  <p className="text-xs text-slate-600">Est. premium ~{fmt(num(g.monthlyPremiumEstimate))}/mo</p>
                ) : null}
                {g.whyThisAmount ? <p className="mt-1 text-xs text-slate-600">{g.whyThisAmount}</p> : null}
                {g.consequence ? (
                  <p className="mt-2 text-xs font-medium text-red-800">If skipped: {g.consequence}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {sp &&
      (sp.educationLoan?.applicable ||
        sp.planningBaby?.applicable ||
        sp.ssyUrgent?.applicable ||
        sp.homePurchasePlan?.applicable ||
        sp.retirementGap?.applicable) ? (
        <div className="space-y-3">
          <SectionTitle>Special situations</SectionTitle>
          <div className="space-y-3">
            {sp.educationLoan?.applicable && sp.educationLoan.advice ? (
              <div className="rounded-xl border border-slate-200 p-3 text-sm">
                <p className="font-semibold text-slate-900">Education loan</p>
                <p className="mt-1 text-slate-600">{sanitizeCopy(sp.educationLoan.advice)}</p>
              </div>
            ) : null}
            {sp.planningBaby?.applicable && sp.planningBaby.advice ? (
              <div className="rounded-xl border border-slate-200 p-3 text-sm">
                <p className="font-semibold text-slate-900">Planning a baby</p>
                {sp.planningBaby.maternityFund != null && sp.planningBaby.maternityFund > 0 ? (
                  <p className="mt-1 text-slate-600">Maternity / buffer fund target: {fmt(num(sp.planningBaby.maternityFund))}</p>
                ) : null}
                <p className="mt-1 text-slate-600">{sanitizeCopy(sp.planningBaby.advice)}</p>
              </div>
            ) : null}
            {sp.ssyUrgent?.applicable && sp.ssyUrgent.advice ? (
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 text-sm">
                <p className="font-semibold text-red-900">SSY — urgent</p>
                {sp.ssyUrgent.monthsLeft != null ? (
                  <p className="mt-1 text-xs text-red-800">Months left: ~{num(sp.ssyUrgent.monthsLeft)}</p>
                ) : null}
                <p className="mt-1 text-red-900">{sanitizeCopy(sp.ssyUrgent.advice)}</p>
              </div>
            ) : null}
            {sp.homePurchasePlan?.applicable && sp.homePurchasePlan.advice ? (
              <div className="rounded-xl border border-slate-200 p-3 text-sm">
                <p className="font-semibold text-slate-900">Home purchase</p>
                <p className="mt-1 text-slate-600">{sanitizeCopy(sp.homePurchasePlan.advice)}</p>
              </div>
            ) : null}
            {sp.retirementGap?.applicable && sp.retirementGap.advice ? (
              <div className="rounded-xl border border-slate-200 p-3 text-sm">
                <p className="font-semibold text-slate-900">Retirement</p>
                <p className="mt-1 text-slate-600">{sanitizeCopy(sp.retirementGap.advice)}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="space-y-3">
          <SectionTitle>Monthly allocation</SectionTitle>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Where</th>
                  <th className="px-3 py-2">Why</th>
                </tr>
              </thead>
              <tbody>
                {(variant === "full" ? rows : rows.slice(0, 6)).map((r: FinkoinMonthlyAllocationRow, i: number) => (
                  <tr key={`${r.category}-${i}`} className="border-t border-slate-100">
                    <td className="px-3 py-2">{r.priority ?? i + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{r.category}</td>
                    <td className="px-3 py-2 text-[#534AB7]">{fmt(num(r.amount))}</td>
                    <td className="px-3 py-2 text-slate-600">{r.where}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{r.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {variant === "full" && pieAgg.length > 0 && totalPie > 0 ? (
            <MonthlyAllocationPieChart pieAgg={pieAgg} totalPie={totalPie} />
          ) : null}
        </div>
      ) : null}

      {variant === "full" ? (
        <>
          <OptimizerStopPayingInsuranceSection kvp={kvp} ladder={ladder} />
          <OptimizerYearByYearSection ladder={ladder} />
          {phaseNums ? (
            <OptimizerTwelveMonthPhasesSection profile={profile ?? null} ladder={ladder} {...phaseNums} />
          ) : null}
        </>
      ) : null}

      {plan.disclaimer ? <p className="text-xs text-slate-500">{plan.disclaimer}</p> : null}
    </div>
  );
}
