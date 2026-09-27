import type { FinancialProfile } from "@/lib/analyse-form-schema";
import {
  calculateTermNeeded,
  computeRealEmergencyFund,
  monthlyInsuranceTotal,
  monthlyTotalIncome,
  type AnalysisResult,
} from "@/lib/financialEngine";
import { buildNetWorth } from "@/lib/netWorth";
import { getUniversalBucketActuals } from "@/lib/universal-buckets";

export type FinkoinUrgency = "critical" | "high" | "medium";

export interface FinkoinLifeStageInsight {
  stage?: string;
  headline?: string;
  keyChallenge?: string;
  biggestMistake?: string;
  smartMove?: string;
  nextMilestone?: string;
}

export interface FinkoinDebtPlanItem {
  debtType?: string;
  outstanding?: number;
  currentEMI?: number;
  extraMonthlyPayment?: number;
  monthsToClear?: number;
  priorityRank?: number;
  reasoning?: string;
}

export interface FinkoinMandatoryFund {
  fundName?: string;
  purpose?: string;
  targetAmount?: number;
  currentAmount?: number;
  gap?: number;
  monthlyContribution?: number;
  monthsToComplete?: number;
  whereToKeep?: string;
  whyThisInstrument?: string;
  urgency?: string;
  actionThisWeek?: string;
}

export interface FinkoinAssetSplitPlan {
  keepAmount?: number;
  keepWhere?: string;
  keepReason?: string;
  moveAmount?: number;
  moveWhere?: string;
  moveReason?: string;
  moveAmount2?: number;
  moveWhere2?: string;
  moveReason2?: string;
}

export interface FinkoinAssetOptimization {
  currentAsset?: string;
  currentAmount?: number;
  problem?: string;
  action?: string;
  splitPlan?: FinkoinAssetSplitPlan;
  benefit?: string;
  howToDoIt?: string;
}

export interface FinkoinInsuranceGap {
  type?: string;
  currentCover?: number;
  recommendedCover?: number;
  gap?: number;
  urgency?: string;
  monthlyPremiumEstimate?: number;
  whyThisAmount?: string;
  consequence?: string;
  buyFromFinkoin?: boolean;
}

export interface FinkoinMonthlyAllocationRow {
  priority?: number;
  category?: string;
  amount?: number;
  where?: string;
  why?: string;
}

export interface FinkoinSpecialSituations {
  educationLoan?: { applicable?: boolean; advice?: string };
  planningBaby?: {
    applicable?: boolean;
    maternityFund?: number;
    advice?: string;
  };
  ssyUrgent?: { applicable?: boolean; monthsLeft?: number; advice?: string };
  homePurchasePlan?: {
    applicable?: boolean;
    currentSaved?: number;
    targetSaved?: number;
    monthsToReady?: number;
    advice?: string;
  };
  retirementGap?: {
    applicable?: boolean;
    corpusNeeded?: number;
    currentTrajectory?: number;
    gap?: number;
    advice?: string;
  };
}

export interface FinkoinKvpStrategy {
  applicable?: boolean;
  totalYearlyPremiums?: number;
  kvpAmount?: number;
  rdMonthlyAmount?: number;
  yearsToBeSelfSustaining?: number;
  explanation?: string;
}

/** Rich AI plan returned by `/api/ai/analyse` (Groq). */
export interface FinkoinAIPlan {
  lifeStageInsight?: FinkoinLifeStageInsight;
  debtPlan?: FinkoinDebtPlanItem[];
  mandatoryFunds?: FinkoinMandatoryFund[];
  assetOptimization?: FinkoinAssetOptimization[];
  insuranceGaps?: FinkoinInsuranceGap[];
  monthlyAllocation?: FinkoinMonthlyAllocationRow[];
  specialSituations?: FinkoinSpecialSituations;
  kvpInsuranceStrategy?: FinkoinKvpStrategy;
  topPriorityAction?: string;
  oneLiner?: string;
  disclaimer?: string;
}

export function isValidFinkoinAIPlan(x: unknown): x is FinkoinAIPlan {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.oneLiner === "string" && typeof o.topPriorityAction === "string"
  );
}

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

type ExtProfile = FinancialProfile & {
  educationLoanEMI?: number;
  educationLoanOutstanding?: number;
  educationLoanRate?: number;
  medicalLoanEMI?: number;
  medicalLoanOutstanding?: number;
  marriageLoanEMI?: number;
  marriageLoanOutstanding?: number;
  homeLoanRate?: number;
  planningBaby?: boolean;
  planningHomePurchase?: boolean;
};

function educationLoanEmiFromProfile(profile: FinancialProfile): number {
  const ext = profile as ExtProfile;
  if (n(ext.educationLoanEMI) > 0) return n(ext.educationLoanEMI);
  const row = profile.additionalObligations?.find((o) =>
    /education|student/i.test(o.type),
  );
  return n(row?.monthlyAmount);
}

function overallScoreFromAnalysis(analysis: AnalysisResult): number {
  return Math.max(
    0,
    100 -
      analysis.issues.filter((i) => i.severity === "critical").length * 15 -
      analysis.issues.filter((i) => i.severity === "warning").length * 7,
  );
}

function girlUnder10(profile: FinancialProfile): {
  has: boolean;
  age?: number;
} {
  const nk = profile.numberOfKids ?? 0;
  const ages = profile.kidsAges ?? [];
  const g = profile.kidsGenders ?? [];
  for (let i = 0; i < nk; i++) {
    if (g[i] === "girl" && n(ages[i]) < 10)
      return { has: true, age: n(ages[i]) };
  }
  return { has: false };
}

/** Rule-based plan when Groq is unavailable or returns invalid JSON. */
export function buildFallbackFinkoinPlan(
  profile: FinancialProfile,
  analysis: AnalysisResult,
): FinkoinAIPlan {
  const ext = profile as ExtProfile;
  const buckets = getUniversalBucketActuals(profile);
  const income = monthlyTotalIncome(profile);
  const out =
    buckets.needs +
    buckets.wants +
    buckets.security +
    buckets.loans +
    buckets.investment;
  const surplus = Math.max(0, income - out);
  const er = computeRealEmergencyFund(profile);
  const emergencyTarget = buckets.needs * 6;
  const emergencyGap = Math.max(0, emergencyTarget - er.realTotal);
  const termNeed = calculateTermNeeded(profile);
  const termHave = profile.hasTermInsurance
    ? n(profile.termInsuranceSumAssured)
    : 0;
  const healthNeed = profile.cityTier === "metro" ? 10_00_000 : 7_00_000;
  const healthHave = profile.hasHealthInsurance
    ? n(profile.healthInsuranceSumInsured)
    : 0;
  const yearlyPrem = monthlyInsuranceTotal(profile) * 12;
  const { has: hasGirlU10, age: girlAge } = girlUnder10(profile);
  const monthsToSsyClose =
    girlAge !== undefined && girlAge < 10
      ? Math.max(0, (10 - girlAge) * 12)
      : 0;

  const mandatory: FinkoinMandatoryFund[] = [];
  if (emergencyGap > 0) {
    mandatory.push({
      fundName: "Emergency fund",
      purpose:
        "Six months of needs, weighted for accessible cash (savings + liquid MF; FD only 70%).",
      targetAmount: emergencyTarget,
      currentAmount: Math.round(er.realTotal),
      gap: emergencyGap,
      monthlyContribution: Math.min(surplus * 0.35, emergencyGap / 12),
      monthsToComplete: Math.ceil(emergencyGap / Math.max(1, surplus * 0.35)),
      whereToKeep: "Savings ₹50k + rest liquid MF",
      whyThisInstrument:
        "Instant access without FD break penalty on the liquid slice.",
      urgency: er.monthsCovered < 3 ? "critical" : "high",
      actionThisWeek: `Set up liquid MF SIP of ₹${Math.max(500, Math.round(emergencyGap / 12)).toLocaleString("en-IN")} or move one FD tranche after checking penalty.`,
    });
  }
  if (termHave < termNeed) {
    mandatory.push({
      fundName: "Term life cover",
      purpose: "Income replacement for dependants and loan co-signers.",
      targetAmount: termNeed,
      currentAmount: termHave,
      gap: termNeed - termHave,
      monthlyContribution: 0,
      monthsToComplete: 1,
      whereToKeep: "Pure term from a reputable insurer",
      whyThisInstrument: "Cheapest cost per lakh; avoid ULIPs.",
      urgency: termHave === 0 ? "critical" : "high",
      actionThisWeek:
        "Compare 3 pure-term quotes on cover, premium waiver, and claim settlement.",
    });
  }

  const insuranceGaps: FinkoinInsuranceGap[] = [];
  if (termHave < termNeed) {
    insuranceGaps.push({
      type: "Term life",
      currentCover: termHave,
      recommendedCover: termNeed,
      gap: termNeed - termHave,
      urgency: "this-week",
      monthlyPremiumEstimate: profile.selfAge < 35 ? 900 : 1500,
      whyThisAmount:
        "Roughly 10–15× annual income adjusted for loans and dependants.",
      consequence:
        "Family bears EMIs and living costs with no income replacement.",
      buyFromFinkoin: true,
    });
  }
  if (healthHave < healthNeed) {
    insuranceGaps.push({
      type: "Health (floater)",
      currentCover: healthHave,
      recommendedCover: healthNeed,
      gap: healthNeed - healthHave,
      urgency: "this-month",
      monthlyPremiumEstimate: 1200,
      whyThisAmount: "Metro hospitalisation routinely exceeds ₹5L bills.",
      consequence: "One admission can wipe savings and force debt.",
      buyFromFinkoin: true,
    });
  }

  const top =
    emergencyGap > 0 && er.monthsCovered < 3
      ? `This week: move ₹${Math.min(50_000, Math.round(emergencyGap)).toLocaleString("en-IN")} to liquid MF or savings earmarked “emergency” — you are below 3 months of needs on accessible cash.`
      : termHave === 0
        ? "This week: buy a pure-term quote for at least ₹1 crore (adjust with advisor) before starting new SIPs."
        : hasGirlU10 && girlAge !== undefined && girlAge >= 8
          ? "This week: open Sukanya Samriddhi at India Post / bank — account must open before she turns 10."
          : `This week: allocate ₹${Math.max(0, Math.round(surplus * 0.2)).toLocaleString("en-IN")}/mo to your top gap above.`;

  return {
    lifeStageInsight: {
      stage: profile.lifeStage,
      headline: `Household income about ${formatLakh(income)}/month with ₹${surplus.toLocaleString("en-IN")} model surplus.`,
      keyChallenge:
        emergencyGap > termNeed - termHave
          ? "Building accessible emergency money without relying on FD breaks."
          : "Closing protection gaps before scaling investments.",
      biggestMistake:
        "Starting aggressive SIPs while high-interest or protection gaps remain.",
      smartMove: top,
      nextMilestone:
        emergencyGap <= 0
          ? "Fully fund 6-month weighted emergency layer."
          : "Reach 3 months accessible cash first.",
    },
    debtPlan: [],
    mandatoryFunds: mandatory,
    assetOptimization: [],
    insuranceGaps,
    monthlyAllocation:
      surplus > 0
        ? [
            {
              priority: 1,
              category: "Safety net & premiums",
              amount: Math.round(surplus * 0.4),
              where: "Savings + liquid MF + renewal RD",
              why: "Keeps renewals and shocks off credit card debt.",
            },
            {
              priority: 2,
              category: "Investments (after safety)",
              amount: Math.round(surplus * 0.35),
              where: "Index / goal SIPs",
              why: "Only after emergency and insurance minimums.",
            },
          ]
        : [
            {
              priority: 1,
              category: "Free cash flow",
              amount: 0,
              where: "—",
              why: "No surplus on paper — cut wants/EMIs or raise income before new commitments.",
            },
          ],
    specialSituations: {
      educationLoan: {
        applicable: educationLoanEmiFromProfile(profile) > 0,
        advice:
          educationLoanEmiFromProfile(profile) > 0
            ? "Education loan often has co-signer parents — keep term cover and avoid new consumer debt until rates are under control."
            : "",
      },
      planningBaby: {
        applicable: !!ext.planningBaby,
        maternityFund: ext.planningBaby ? buckets.needs * 6 : 0,
        advice: ext.planningBaby
          ? "Add maternity cover / waiting-period check on health policy; build 6 months needs in liquid before due date."
          : "",
      },
      ssyUrgent: {
        applicable: hasGirlU10 && girlAge !== undefined && girlAge >= 8,
        monthsLeft: monthsToSsyClose,
        advice: hasGirlU10
          ? "SSY must open before age 10 — gather birth certificate and guardian KYC this week."
          : "",
      },
      homePurchasePlan: {
        applicable:
          !!ext.planningHomePurchase || n(profile.homePurchaseTarget) > 0,
        advice:
          n(profile.homePurchaseTarget) > 0
            ? `Target down payment discipline toward ₹${n(profile.homePurchaseTarget).toLocaleString("en-IN")}.`
            : "",
      },
      retirementGap: {
        applicable: profile.lifeStage === "senior" || profile.selfAge >= 50,
        advice:
          profile.selfAge >= 50
            ? "If no EPF/NPS, open NPS (extra ₹50k under 80CCD) and increase debt-heavy allocation per age rule."
            : "",
      },
    },
    kvpInsuranceStrategy: {
      applicable: yearlyPrem > 0,
      totalYearlyPremiums: Math.round(yearlyPrem),
      kvpAmount: Math.round(yearlyPrem),
      rdMonthlyAmount: Math.round(yearlyPrem / 12),
      yearsToBeSelfSustaining: 3,
      explanation: `Model: RD ~₹${Math.round(yearlyPrem / 12).toLocaleString("en-IN")}/mo + small-savings ladder so yearly premiums (~₹${Math.round(yearlyPrem).toLocaleString("en-IN")}) stop coming from salary alone.`,
    },
    topPriorityAction: top,
    oneLiner:
      surplus > 0
        ? `You have about ₹${surplus.toLocaleString("en-IN")}/month to steer — fund safety first, then invest.`
        : "Surplus is tight on paper — trim wants or EMIs before adding risk.",
    disclaimer:
      "Educational guidance only. Finkoin is not a SEBI registered investment advisor. Consult a qualified advisor before investing.",
  };
}

function formatLakh(income: number): string {
  if (income >= 100000) return `₹${(income / 100000).toFixed(2)} lakh`;
  return `₹${income.toLocaleString("en-IN")}`;
}
