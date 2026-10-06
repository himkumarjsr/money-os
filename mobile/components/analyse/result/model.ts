/**
 * Derivations for the Result screen — mirrors the inline math in web
 * `app/analyse/result/page.tsx` line-for-line, using the shared lib helpers.
 */
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import type { AppIconName } from "@/components/ui/AppIcon";
import {
  analyseFinances,
  assessTermCover,
  medicalEmergencyTarget,
  monthlyTotalIncome,
  type AnalysisResult,
  type TermCoverStatus,
} from "@/lib/financialEngine";
import { buildPriorityPlan, type PriorityPlan } from "@/lib/priorityEngine";
import {
  getEpfContributionMonthly,
  getInHandOutflow,
  getUnallocatedIncome,
  getUniversalBucketActuals,
  type UniversalBucketKey,
} from "@/lib/universal-buckets";
import { getBucketBreakdown } from "@/lib/bucket-breakdown";
import type { BandLabel } from "./format";

export type BucketView = {
  key: UniversalBucketKey;
  label: string;
  capPercent: number;
  actual: number;
  capAmount: number;
  details: string;
  status: BandLabel;
  items: { label: string; value: number }[];
};

export type SafetyItem = {
  id: string;
  title: string;
  currentText: string;
  targetText: string;
  isOk: boolean;
  status?: TermCoverStatus;
  infoText?: string;
  icon: AppIconName;
};

export type CtaCopy = { title: string; subText: string };

const rupees = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

export function buildResultPriorityPlan(
  profile: FinancialProfile,
  result: AnalysisResult | null,
): PriorityPlan {
  const stableResult = result ?? analyseFinances(profile);
  const bucketActualsForPlan = getUniversalBucketActuals(profile);
  return buildPriorityPlan(profile, {
    needsActual: bucketActualsForPlan.needs,
    loansActual: bucketActualsForPlan.loans,
    wantsActual: bucketActualsForPlan.wants,
    investmentActual: bucketActualsForPlan.investment,
    overallScore: stableResult.overallScore,
  });
}

export function scoreBand(score: number): BandLabel {
  return score < 40 ? "Critical" : score < 70 ? "Warning" : "Good";
}

export function buildResultModel(
  profile: FinancialProfile,
  analysis: AnalysisResult,
) {
  const score = analysis.overallScore ?? 0;
  const bucketActuals = getUniversalBucketActuals(profile);
  const income = monthlyTotalIncome(profile);
  const needsActual = bucketActuals.needs;
  const loansActual = bucketActuals.loans;
  const securityActual = bucketActuals.security;
  const investmentActual = bucketActuals.investment;
  const lifestyleActual = bucketActuals.wants;
  const needsMonthly = bucketActuals.needs;

  const epfMonthly = getEpfContributionMonthly(profile);
  const totalOutflow = getInHandOutflow(profile);
  const amountLeftInHand = getUnallocatedIncome(profile);

  const rawBuckets: Omit<BucketView, "status" | "items">[] = [
    {
      key: "needs",
      label: "Needs",
      capPercent: 30,
      actual: needsActual,
      capAmount: income * 0.3,
      details: "Housing + essentials + family support",
    },
    {
      key: "wants",
      label: "Wants",
      capPercent: 5,
      actual: lifestyleActual,
      capAmount: income * 0.05,
      details: "Shopping, entertainment and lifestyle spends",
    },
    {
      key: "security",
      label: "Insurance premiums",
      capPercent: 5,
      actual: securityActual,
      capAmount: income * 0.05,
      details: "Term, health, motor and other insurance premiums (monthly)",
    },
    {
      key: "loans",
      label: "Loans",
      capPercent: 40,
      actual: loansActual,
      capAmount: income * 0.4,
      details: "All monthly debt obligations",
    },
    {
      key: "investment",
      label: "Investment",
      capPercent: 20,
      actual: investmentActual,
      capAmount: income * 0.2,
      details: "SIP, RD, NPS, PPF, EPF, SSY and other monthly contributions",
    },
  ];
  const buckets: BucketView[] = rawBuckets.map((b) => ({
    ...b,
    status:
      b.actual > b.capAmount * 1.15
        ? "Critical"
        : b.actual > b.capAmount
          ? "Warning"
          : "Good",
    items: getBucketBreakdown(b.key, profile) ?? [],
  }));

  const termAssessment = assessTermCover({
    hasTermInsurance: profile.hasTermInsurance ?? false,
    termCover: profile.termInsuranceSumAssured || 0,
    termNeeded: analysis.termInsuranceNeeded || 0,
  });
  const termStatus = termAssessment.status;
  const medEmergencyTargetAmount = medicalEmergencyTarget(profile);
  const medEmergencyCurrent = profile.medicalEmergencyFund || 0;

  const emergencyTarget =
    needsMonthly *
    (profile.lifeStage === "kids" ? 12 : profile.lifeStage === "married" ? 9 : 6);
  const termCover = profile.termInsuranceSumAssured || 0;
  const termNeeded = analysis.termInsuranceNeeded || 0;
  const healthCover = profile.healthInsuranceSumInsured || 0;
  const healthTarget = profile.lifeStage === "bachelor" ? 500000 : 1000000;
  const savingsRate = analysis.scores?.savingsRate || 0;

  const safetyItems: SafetyItem[] = [
    {
      id: "emergency",
      title: "Emergency fund",
      currentText: rupees(analysis.realEmergencyFund?.total || 0),
      targetText: rupees(emergencyTarget),
      isOk:
        (analysis.realEmergencyFund?.monthsCovered || 0) >=
        (profile.lifeStage === "kids"
          ? 9
          : profile.lifeStage === "married"
            ? 6
            : 6),
      icon: "shield",
    },
    {
      id: "medical",
      title: "Medical emergency fund",
      currentText: rupees(medEmergencyCurrent),
      targetText: rupees(medEmergencyTargetAmount),
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
            : "Term insurance",
      currentText:
        termCover === 0 ? "None" : `₹${(termCover / 10000000).toFixed(1)} crore`,
      targetText:
        termStatus === "partial" || termStatus === "baseline_ok"
          ? `₹${(termNeeded / 10000000).toFixed(1)} crore at today's income`
          : `₹${(termNeeded / 10000000).toFixed(1)} crore`,
      isOk: termAssessment.safetyNetOk,
      status: termStatus === "baseline_ok" ? "partial" : termStatus,
      infoText: termAssessment.infoText,
      icon: "shield",
    },
    {
      id: "health",
      title: healthCover > 0 ? "Health insurance" : "Health cover",
      currentText:
        healthCover === 0 ? "None" : `₹${(healthCover / 100000).toFixed(0)} lakh`,
      targetText: `₹${(healthTarget / 100000).toFixed(0)} lakh`,
      isOk: healthCover >= healthTarget,
      icon: "hospital",
    },
    {
      id: "investment",
      title: "Investing regularly",
      currentText: `${Math.round(savingsRate)}% of income`,
      targetText: "15% minimum",
      isOk: savingsRate >= 15,
      icon: "trending",
    },
  ];
  const completeCount = safetyItems.filter((i) => i.isOk).length;

  const hasCriticalIssues = (analysis.criticalIssueCount || 0) > 0;
  const ctaCopy: CtaCopy = hasCriticalIssues
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

  return {
    score,
    band: scoreBand(score),
    income,
    needsActual,
    loansActual,
    securityActual,
    investmentActual,
    lifestyleActual,
    epfMonthly,
    totalOutflow,
    amountLeftInHand,
    assets: analysis.totalAssets || 0,
    liabilities: analysis.totalLiabilities || 0,
    netWorth: analysis.netWorth || 0,
    buckets,
    safetyItems,
    completeCount,
    termStatus,
    ctaCopy,
  };
}

export type ResultModel = ReturnType<typeof buildResultModel>;
