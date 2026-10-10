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
  smartBudgetSummary,
  getUniversalBucketActuals,
} from "@/lib/universal-buckets";
import { getBucketBreakdown } from "@/lib/bucket-breakdown";
import type { BandLabel } from "./bandLabel";
import {
  bucketCapRows,
  deriveCtaCopy,
  derivePlanTeaser,
  emergencyFundCheck,
  scoreBandLabel,
  type BucketCapRow,
  type CtaCopy,
} from "./resultDerivations";

export type BucketView = BucketCapRow & {
  actual: number;
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

const rupees = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

/** Same engine plan the Fix Plan screen starts from (real profile + full analysis). */
export function buildResultPriorityPlan(
  profile: FinancialProfile,
  result: AnalysisResult | null,
): PriorityPlan {
  return buildPriorityPlan(profile, result ?? analyseFinances(profile));
}

export function buildResultModel(
  profile: FinancialProfile,
  analysis: AnalysisResult,
  priorityPlan: PriorityPlan,
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

  const actualByKey = {
    needs: needsActual,
    wants: lifestyleActual,
    security: securityActual,
    loans: loansActual,
    investment: investmentActual,
  };
  const buckets: BucketView[] = bucketCapRows(profile, income).map((b) => {
    const actual = actualByKey[b.key];
    return {
      ...b,
      actual,
      status:
        actual > b.capAmount * 1.15
          ? "Critical"
          : actual > b.capAmount
            ? "Warning"
            : "Good",
      items: getBucketBreakdown(b.key, profile) ?? [],
    };
  });

  const termAssessment = assessTermCover({
    hasTermInsurance: profile.hasTermInsurance ?? false,
    termCover: profile.termInsuranceSumAssured || 0,
    termNeeded: analysis.termInsuranceNeeded || 0,
  });
  const termStatus = termAssessment.status;
  const medEmergencyTargetAmount = medicalEmergencyTarget(profile);
  const medEmergencyCurrent = profile.medicalEmergencyFund || 0;

  const emergency = emergencyFundCheck(
    profile,
    needsMonthly,
    analysis.realEmergencyFund?.monthsCovered || 0,
  );
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
      targetText: rupees(emergency.target),
      isOk: emergency.isOk,
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
        termCover === 0
          ? "None"
          : `₹${(termCover / 10000000).toFixed(1)} crore`,
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
        healthCover === 0
          ? "None"
          : `₹${(healthCover / 100000).toFixed(0)} lakh`,
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

  const planTeaser = derivePlanTeaser(priorityPlan);
  const ctaCopy: CtaCopy = deriveCtaCopy({
    score,
    openCount: planTeaser.openCount,
    topPriorityTitle: planTeaser.first?.title ?? null,
    hasCriticalIssues: (analysis.criticalIssueCount || 0) > 0,
  });

  return {
    score,
    band: scoreBandLabel(score),
    income,
    needsActual,
    loansActual,
    securityActual,
    investmentActual,
    lifestyleActual,
    epfMonthly,
    totalOutflow,
    amountLeftInHand,
    smartNote: smartBudgetSummary(profile),
    assets: analysis.totalAssets || 0,
    liabilities: analysis.totalLiabilities || 0,
    netWorth: analysis.netWorth || 0,
    buckets,
    safetyItems,
    completeCount,
    termStatus,
    planTeaser,
    ctaCopy,
  };
}

export type ResultModel = ReturnType<typeof buildResultModel>;
