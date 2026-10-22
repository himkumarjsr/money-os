import type { CityTier, FinancialProfile } from "@/lib/analyse-form-schema";
import {
  BASE_UNIVERSAL_CAPS,
  BUCKET_CAPS,
  getUniversalCaps,
  getUnallocatedIncome,
  getUniversalBucketActuals,
  getUniversalBucketRows,
} from "@/lib/universal-buckets";
import { existingEquityValue } from "@/lib/holdings";
import { computeMoneyScore, type MoneyScore } from "@/lib/moneyScore";

export {
  existingEquityValue,
  LONG_RUN_INFLATION,
  projectRetirementAccounts,
  RETIREMENT_ACCOUNT_RATES,
  type RetirementAccountProjection,
} from "@/lib/holdings";

export type { FinancialProfile } from "@/lib/analyse-form-schema";

export type IssueSeverity = "critical" | "warning" | "info" | "good";

export type AnalysisIssue = {
  severityScore: number;
  severity: IssueSeverity;
  code: string;
  message: string;
};

export type AnalysisFlag = {
  type: "critical" | "warning" | "good";
  message: string;
};

export interface SecurityItem {
  label: string;
  status: "ok" | "warning" | "critical" | "na";
  detail: string;
  actionNeeded?: string;
  /** Optional emoji / icon for checklist (e.g. emergency fund 🛡️). */
  checklistIcon?: string;
  /** Short headline value (e.g. "6.0 months (₹6,00,000 available)"). */
  checklistValue?: string;
  /** Extra small line under detail (e.g. savings / liquid / FD breakdown). */
  breakdownHint?: string;
}

/** Weighted “accessible in ~48h” emergency corpus for targets and checklist. */
export type RealEmergencyFundBreakdown = {
  realTotal: number;
  savingsRaw: number;
  savingsCounted: number;
  liquidRaw: number;
  liquidCounted: number;
  fdRaw: number;
  fdCounted: number;
  otherRaw: number;
  otherCounted: number;
  /** Legacy “emergency fund set aside” field from older forms - counted at 100%. */
  legacyCounted: number;
  monthlyExpenses: number;
  /** Months of `needs` covered; 0 if no expenses line. */
  monthsCovered: number;
};

export function computeRealEmergencyFund(
  data: FinancialProfile,
): RealEmergencyFundBreakdown {
  const bucketActuals = getUniversalBucketActuals(data);
  const monthlyExpenses = bucketActuals.needs;
  const sav = n(data.savingsAccountBalance);
  const liq = n(data.liquidMFValue);
  const fd = n(data.fdValue);
  const oth = n(data.otherLiquidSavings);
  const legacy = n(data.emergencyFundCurrent);
  const savingsCounted = sav * 1.0;
  const liquidCounted = liq * 0.95;
  const fdCounted = fd * 0.7;
  const otherCounted = oth * 0.5;
  const legacyCounted = legacy * 1.0;
  const realTotal =
    savingsCounted + liquidCounted + fdCounted + otherCounted + legacyCounted;
  const monthsCovered = monthlyExpenses > 0 ? realTotal / monthlyExpenses : 0;
  return {
    realTotal,
    savingsRaw: sav,
    savingsCounted,
    liquidRaw: liq,
    liquidCounted,
    fdRaw: fd,
    fdCounted,
    otherRaw: oth,
    otherCounted,
    legacyCounted,
    monthlyExpenses,
    monthsCovered,
  };
}

export type AnalysisResult = {
  overallScore: number;
  /** Pillar breakdown behind overallScore. Missing on results saved before it existed. */
  moneyScore?: MoneyScore;
  criticalIssueCount: number;
  warningIssueCount: number;
  scores: {
    savingsRate: number;
    debtRatio: number;
    untrackedCash: number;
    emergencyFundGap: number;
  };
  flags: AnalysisFlag[];
  issues: AnalysisIssue[];
  teaser: string;
  planSteps: string[];
  securityChecklist: SecurityItem[];
  realEmergencyFund: RealEmergencyFundBreakdown & {
    total: number;
    savings: number;
    fd: number;
    fdWeighted: number;
    liquidMF: number;
  };
  termInsuranceNeeded: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  universalBuckets: {
    needs: {
      capPercent: number;
      capAmount: number;
      actual: number;
      status: string;
    };
    wants: {
      capPercent: number;
      capAmount: number;
      actual: number;
      status: string;
    };
    security: {
      capPercent: number;
      capAmount: number;
      actual: number;
      status: string;
    };
    loans: {
      capPercent: number;
      capAmount: number;
      actual: number;
      status: string;
    };
    investment: {
      capPercent: number;
      capAmount: number;
      actual: number;
      status: string;
    };
  };
};

function n(v: number | undefined): number {
  return v ?? 0;
}

/** Outstanding loan principal used for net worth. Prefer unified loan rows; assets-step home/car are additive when absent from unified list. */
export function totalLoanLiabilities(data: FinancialProfile): number {
  // Typical bill as a revolving proxy, plus any balance carried forward.
  const credit =
    n(data.creditCardBillMonthly) * 3 + n(data.creditCardCarriedBalance);
  const unified = (data.unifiedLoans ?? []).filter(
    (loan) => n(loan.monthlyEMI) > 0 || n(loan.outstandingAmount) > 0,
  );

  const outstandingFromLoan = (loan: {
    outstandingAmount?: number;
    monthlyEMI?: number;
    remainingMonths?: number;
  }) => {
    const out = n(loan.outstandingAmount);
    if (out > 0) return out;
    return n(loan.monthlyEMI) * (n(loan.remainingMonths) || 18);
  };

  if (unified.length > 0) {
    const loanSum = unified.reduce(
      (sum, loan) => sum + outstandingFromLoan(loan),
      0,
    );
    const hasHomeInUnified = unified.some((l) => l.loanType === "home_loan");
    const hasCarInUnified = unified.some((l) => l.loanType === "car_loan");
    return (
      loanSum +
      (hasHomeInUnified ? 0 : n(data.homeLoanOutstanding)) +
      (hasCarInUnified ? 0 : n(data.carLoanOutstanding)) +
      credit
    );
  }

  return (
    n(data.homeLoanOutstanding) +
    n(data.carLoanOutstanding) +
    (n(data.personalLoanOutstanding) || n(data.personalLoanEMI) * 24) +
    n(data.bikeEMI) * 24 +
    credit
  );
}

/** Health cover a household should carry: more in metros and with kids. */
export function healthCoverTarget(data: Partial<FinancialProfile>): number {
  if (n(data.numberOfKids) > 0) return 20_00_000;
  const metro = data.cityTier === "metro";
  if (data.lifeStage === "bachelor") return metro ? 10_00_000 : 5_00_000;
  return metro ? 15_00_000 : 10_00_000;
}

export type HealthCoverHeld = {
  /** The user's own policy. */
  own: number;
  /** Company group cover - it ends with the job. */
  employer: number;
  total: number;
  /** All the cover comes from the employer. */
  employerOnly: boolean;
};

export function healthCoverHeld(
  data: Partial<FinancialProfile>,
): HealthCoverHeld {
  if (!data.hasHealthInsurance) {
    return { own: 0, employer: 0, total: 0, employerOnly: false };
  }
  const sum = n(data.healthInsuranceSumInsured);
  const source = data.healthInsuranceSource;
  const own = source === "employer" ? 0 : sum;
  const employer =
    source === "employer"
      ? sum
      : source === "both"
        ? n(data.employerHealthCover)
        : 0;
  return {
    own,
    employer,
    total: own + employer,
    employerOnly: own <= 0 && employer > 0,
  };
}

/** Own base policy to buy when all cover comes from the employer. */
export function ownHealthPolicyTarget(data: Partial<FinancialProfile>): number {
  return Math.min(healthCoverTarget(data), 10_00_000);
}

/**
 * Rough pure-term premium, ₹/month, for `cover` at this age (non-smoker,
 * 30-year term). Only a budgeting guide - real quotes vary by insurer.
 */
export function termPremiumMonthlyEstimate(cover: number, age: number): number {
  if (cover <= 0) return 0;
  const perCrore =
    age < 30
      ? 850
      : age < 35
        ? 1200
        : age < 40
          ? 1700
          : age < 45
            ? 2500
            : age < 50
              ? 3800
              : 5500;
  return Math.max(
    500,
    Math.round(((cover / 1_00_00_000) * perCrore) / 50) * 50,
  );
}

/**
 * Term cover only protects people who depend on the income, or family who
 * would inherit a loan. With neither, it is optional (cheap to lock in young).
 */
export function termCoverOptional(data: FinancialProfile): boolean {
  const dependants =
    data.lifeStage !== "bachelor" ||
    n(data.numberOfKids) > 0 ||
    n(data.parentsSupport) > 0;
  return !dependants && getUniversalBucketActuals(data).loans <= 0;
}

/** Suggested medical emergency corpus (beyond health insurance) by city, age, and dependants. */
export function medicalEmergencyTarget(data: FinancialProfile): number {
  let target =
    data.cityTier === "metro"
      ? 3_00_000
      : data.cityTier === "tier2"
        ? 2_50_000
        : 2_00_000;
  if (data.selfAge >= 45) target += 50_000;
  if (data.lifeStage === "kids") target += 50_000;
  return target;
}

/**
 * Months of expenses the emergency fund should cover (6–12, life-stage aware).
 * The single source for the engine target, the safety-net check, the Fix Plan
 * emergency priority and the form's suggested target.
 */
export function emergencyFundMonthsNeeded(profile: {
  lifeStage?: string;
  parentsSupport?: number;
  selfAge?: number;
  kidsAges?: unknown;
  kids?: unknown;
}): number {
  const raw = profile.lifeStage;
  const stage =
    raw === "married" || raw === "kids" || raw === "senior" ? raw : "bachelor";
  const kids = Array.isArray(profile.kidsAges)
    ? profile.kidsAges
    : Array.isArray(profile.kids)
      ? profile.kids
      : [];
  const age = profile.selfAge || 30;
  if (stage === "bachelor") return (profile.parentsSupport || 0) === 0 ? 6 : 9;
  if (stage === "married" && kids.length === 0) return 9;
  if (stage === "kids" || stage === "senior") return 12;
  return age >= 50 ? 12 : 6;
}

/** Score colour bands used by every score visual: >= good is green, >= warning is amber, below is red. */
export const SCORE_BANDS = { good: 70, warning: 40 } as const;

export type ScoreBand = "good" | "warning" | "critical";

export function scoreBand(score: number): ScoreBand {
  if (score >= SCORE_BANDS.good) return "good";
  if (score >= SCORE_BANDS.warning) return "warning";
  return "critical";
}

function fmt(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function isMetroCity(cityTier: CityTier): boolean {
  return cityTier === "metro";
}

export function getSavingsTargetPercent(p: FinancialProfile): number {
  return getUniversalCaps(p).investment * 100;
}

export function getDebtSafeLimitPercent(): number {
  return BASE_UNIVERSAL_CAPS.loans * 100;
}

export function monthlyTotalIncome(p: FinancialProfile): number {
  const spouse = p.lifeStage === "bachelor" ? 0 : n(p.spouseIncome);
  return n(p.monthlySalary) + spouse + n(p.otherIncome);
}

export function monthlySavingsContributions(p: FinancialProfile): number {
  return getUniversalBucketActuals(p).investment;
}

export function monthlyInsuranceTotal(p: FinancialProfile): number {
  return (
    n(p.healthInsurancePremiumMonthly) +
    n(p.termInsurancePremiumMonthly) +
    n(p.carInsurancePremiumMonthly) +
    n(p.bikeInsurancePremiumMonthly) +
    n(p.otherInsurancePremiumMonthly) +
    n(p.parentsHealthInsurancePremiumMonthly)
  );
}

export function monthlyLivingExpenses(p: FinancialProfile): number {
  const buckets = getUniversalBucketActuals(p);
  return buckets.needs + buckets.wants + buckets.security;
}

export function housingAndEmiTotal(p: FinancialProfile): number {
  return (
    n(p.rentAmount) +
    n(p.homeLoanEMI) +
    n(p.secondPropertyEMI) +
    getUniversalBucketActuals(p).loans
  );
}

export function monthlyTotalExpenses(p: FinancialProfile): number {
  const buckets = getUniversalBucketActuals(p);
  return buckets.needs + buckets.wants + buckets.security + buckets.loans;
}

export function calculateTermNeeded(data: FinancialProfile): number {
  const totalIncome = monthlyTotalIncome(data);
  const annualIncome = totalIncome * 12;
  const base = annualIncome * 10;
  const liabilities = n(data.homeLoanOutstanding) + n(data.carLoanOutstanding);
  const equityTotal =
    n(data.totalEquityValue) > 0
      ? n(data.totalEquityValue)
      : n(data.mfValue) +
        n(data.indianStocksValue) +
        n(data.usStocksValueINR) +
        n(data.usMFValueINR) +
        n(data.rsuValueINR);
  const customInvestmentTotal = (data.customInvestments ?? []).reduce(
    (sum, inv) => sum + n(inv.currentValue),
    0,
  );
  const existingAssets =
    equityTotal +
    n(data.ppfBalance) +
    n(data.epfBalance) +
    n(data.fdValue) +
    customInvestmentTotal;
  const ageMultiplier =
    data.selfAge < 30
      ? 1.2
      : data.selfAge < 40
        ? 1
        : data.selfAge < 50
          ? 0.8
          : 0.6;
  const dependentCount =
    (data.lifeStage !== "bachelor" ? 1 : 0) +
    n(data.numberOfKids) +
    (n(data.parentsSupport) > 0 ? 1 : 0);
  const dependentBuffer = dependentCount * 20_00_000;
  const termNeeded = Math.max(
    50_00_000,
    (base + liabilities + dependentBuffer - existingAssets) * ageMultiplier,
  );

  return Math.ceil(termNeeded / 10_00_000) * 10_00_000;
}

export type TermCoverStatus =
  | "missing"
  | "partial"
  | "baseline_ok"
  | "complete";

/** How we judge existing term vs today's income - not "buy another full policy". */
export function assessTermCover(params: {
  hasTermInsurance: boolean;
  termCover: number;
  termNeeded: number;
}): {
  status: TermCoverStatus;
  gap: number;
  adequacyFloor: number;
  infoText: string;
  safetyNetOk: boolean;
} {
  const termCover = Math.max(0, params.termCover);
  const termNeeded = Math.max(0, params.termNeeded);
  const gap = Math.max(0, termNeeded - termCover);
  const adequacyFloor = Math.max(50_00_000, termNeeded * 0.5);

  if (!params.hasTermInsurance || termCover <= 0) {
    return {
      status: "missing",
      gap: termNeeded,
      adequacyFloor,
      infoText: "You have no term insurance",
      safetyNetOk: false,
    };
  }
  if (termCover >= termNeeded) {
    return {
      status: "complete",
      gap: 0,
      adequacyFloor,
      infoText: "Cover is adequate",
      safetyNetOk: true,
    };
  }
  if (termCover >= 10_000_000 || termCover >= adequacyFloor) {
    return {
      status: "baseline_ok",
      gap,
      adequacyFloor,
      infoText:
        "Your existing policy is valuable - premiums rise with age, so keep it. If income has grown, add a separate top-up for the gap only; do not cancel and rebuy.",
      safetyNetOk: true,
    };
  }
  return {
    status: "partial",
    gap,
    adequacyFloor,
    infoText:
      "Your existing policy helps, but cover is still low for your income. Add a top-up for the gap only - no need to replace the old policy.",
    safetyNetOk: false,
  };
}

function issuesToFlags(issues: AnalysisIssue[]): AnalysisFlag[] {
  const flags: AnalysisFlag[] = [];
  const critical = issues.find((issue) => issue.severity === "critical");
  const warning = issues.find((issue) => issue.severity === "warning");
  const good = issues.find((issue) => issue.severity === "good");
  if (critical) flags.push({ type: "critical", message: critical.message });
  if (warning) flags.push({ type: "warning", message: warning.message });
  if (good) flags.push({ type: "good", message: good.message });
  return flags;
}

function goalLabel(goal: FinancialProfile["primaryGoal"]): string {
  return goal.replaceAll("_", " ");
}

function loansCapPercent(
  bucketRows: ReturnType<typeof getUniversalBucketRows>,
): number {
  const cap = bucketRows.find((r) => r.key === "loans")?.capPercent;
  return Math.round((cap ?? BUCKET_CAPS.loans) * 100);
}

function buildIssues(params: {
  totalIncome: number;
  savingsRate: number;
  debtRatio: number;
  untrackedCash: number;
  emergencyFundGap: number;
  accessibleEmergencyTotal: number;
  monthsCoveredEmergency: number;
  emergencyFundTargetMax: number;
  bucketRows: ReturnType<typeof getUniversalBucketRows>;
  insuranceActual: number;
  termCover: number;
  termNeeded: number;
  hasTermInsurance: boolean;
  medEmergencyCurrent: number;
  medEmergencyTarget: number;
  monthlyInvesting: number;
  termOptional: boolean;
  healthHeld: HealthCoverHeld;
  healthTarget: number;
}): AnalysisIssue[] {
  const {
    totalIncome,
    savingsRate,
    debtRatio,
    untrackedCash,
    emergencyFundGap,
    accessibleEmergencyTotal,
    monthsCoveredEmergency,
    emergencyFundTargetMax,
    bucketRows,
    insuranceActual,
    termCover,
    termNeeded,
    hasTermInsurance,
    medEmergencyCurrent,
    medEmergencyTarget,
    monthlyInvesting,
    termOptional,
    healthHeld,
    healthTarget,
  } = params;
  const issues: AnalysisIssue[] = [];

  if (totalIncome <= 0) {
    return [
      {
        severityScore: 100,
        severity: "critical",
        code: "income_zero",
        message:
          "Add your income details so the meter and bucket caps can start working.",
      },
    ];
  }

  for (const row of bucketRows) {
    if (row.status === "critical") {
      issues.push({
        severityScore: row.key === "loans" ? 90 : 75,
        severity: "critical",
        code: `${row.key}_over_cap`,
        message: `${row.label} is at ${fmt(row.actual)}/mo against a cap of ${fmt(row.capAmount)}.`,
      });
    } else if (row.status === "warning") {
      issues.push({
        severityScore: row.key === "loans" ? 60 : 45,
        severity: "warning",
        code: `${row.key}_near_cap`,
        message: `${row.label} is slightly above cap at ${fmt(row.actual)}/mo vs ${fmt(row.capAmount)}.`,
      });
    } else {
      issues.push({
        severityScore: 15,
        severity: "good",
        code: `${row.key}_on_track`,
        message: `${row.label} is within the universal cap at ${fmt(row.actual)}/mo.`,
      });
    }
  }

  // Protection is judged by the cover held, not by how much is spent on it.
  if (healthHeld.total <= 0) {
    issues.push({
      severityScore: 88,
      severity: "critical",
      code: "health_missing",
      message:
        "No health insurance. One hospital stay can cost ₹2-5 lakh and wipe out your savings.",
    });
  } else if (healthHeld.employerOnly) {
    issues.push({
      severityScore: 57,
      severity: "warning",
      code: "health_employer_only",
      message: `Your ${fmt(healthHeld.employer)} health cover comes only from your company and ends when you leave. Buy your own base policy while you're healthy.`,
    });
  } else if (healthHeld.total < healthTarget) {
    issues.push({
      severityScore: 45,
      severity: "warning",
      code: "health_underinsured",
      message: `Health cover ${fmt(healthHeld.total)} is below the ${fmt(healthTarget)} suggested for your family and city. A super top-up closes the gap cheaply.`,
    });
  }

  if (emergencyFundGap > 0) {
    const emergencySeverity: IssueSeverity =
      monthsCoveredEmergency >= 3 ? "warning" : "critical";
    issues.push({
      severityScore: emergencySeverity === "critical" ? 80 : 55,
      severity: emergencySeverity,
      code: "emergency_fund_short",
      message: `Accessible emergency fund ~${fmt(accessibleEmergencyTotal)} (~${monthsCoveredEmergency.toFixed(1)} mo of needs). Target buffer ${fmt(emergencyFundTargetMax)} - short by about ${fmt(emergencyFundGap)}.`,
    });
  } else {
    issues.push({
      severityScore: 20,
      severity: "good",
      code: "emergency_fund_ok",
      message: `Accessible emergency fund ~${fmt(accessibleEmergencyTotal)} covers about ${monthsCoveredEmergency.toFixed(1)} months of needs - on track for your target buffer.`,
    });
  }

  const untrackedThreshold = totalIncome * 0.1;
  if (untrackedCash > untrackedThreshold + 1e-6) {
    issues.push({
      severityScore: 55,
      severity: "warning",
      code: "untracked_cash_high",
      message: `About ${fmt(untrackedCash)}/mo is still unallocated. Decide whether it should stay free cash or move into a goal.`,
    });
  } else if (untrackedCash < -untrackedThreshold) {
    issues.push({
      severityScore: 70,
      severity: "warning",
      code: "budget_overstated",
      message: `Your buckets exceed income by about ${fmt(-untrackedCash)}/mo.`,
    });
  }

  if (monthlyInvesting <= 0) {
    issues.push({
      severityScore: 85,
      severity: "critical",
      code: "investment_missing",
      message:
        "No monthly investing detected. Start a SIP to avoid long-term wealth stagnation.",
    });
  } else if (savingsRate < 10) {
    issues.push({
      severityScore: 50,
      severity: "warning",
      code: "investment_rate_low",
      message: `Investment rate is ${savingsRate.toFixed(1)}% of income. Push this toward at least 15%.`,
    });
  } else {
    issues.push({
      severityScore: 18,
      severity: "good",
      code: "investment_on_track",
      message: `Investment bucket is ${savingsRate.toFixed(1)}% of income and is being checked against your current investment cap.`,
    });
  }

  if (!hasTermInsurance || termCover === 0) {
    if (!termOptional)
      issues.push({
        severityScore: 92,
        severity: "critical",
        code: "term_missing",
        message:
          "You have no term insurance. Your family has zero protection if income stops.",
      });
  } else {
    const termAssessment = assessTermCover({
      hasTermInsurance,
      termCover,
      termNeeded,
    });
    if (termAssessment.status === "partial") {
      issues.push({
        severityScore: 58,
        severity: "warning",
        code: "term_underinsured",
        message: `You have ₹${(termCover / 10000000).toFixed(1)}Cr. Recommended at today's income: ₹${(termNeeded / 10000000).toFixed(1)}Cr - top-up the gap only; keep your existing policy.`,
      });
    } else if (termAssessment.status === "baseline_ok") {
      issues.push({
        severityScore: 32,
        severity: "good",
        code: "term_cover_baseline_ok",
        message:
          termAssessment.gap > 0
            ? `You have ₹${(termCover / 10000000).toFixed(1)}Cr pure term - strong baseline. Reference at today's income is ~₹${(termNeeded / 10000000).toFixed(1)}Cr; optional top-up for the gap, not a second full policy.`
            : "You have strong term cover for your current profile.",
      });
    }
  }

  if (medEmergencyCurrent < medEmergencyTarget) {
    const medCritical = medEmergencyCurrent < medEmergencyTarget * 0.5;
    issues.push({
      severityScore: medCritical ? 90 : 52,
      severity: medCritical ? "critical" : "warning",
      code: "medical_fund_short",
      message: `Medical emergency fund is ${fmt(medEmergencyCurrent)} versus target ${fmt(medEmergencyTarget)}.`,
    });
  }

  if (debtRatio <= loansCapPercent(bucketRows) + 1e-6) {
    issues.push({
      severityScore: 18,
      severity: "good",
      code: "loans_on_track",
      message: `Loan bucket is ${debtRatio.toFixed(1)}% of income, within the ${loansCapPercent(bucketRows)}% ceiling.`,
    });
  }

  return issues.sort((a, b) => b.severityScore - a.severityScore);
}

function buildPlanSteps(
  profile: FinancialProfile,
  bucketRows: ReturnType<typeof getUniversalBucketRows>,
  untrackedCash: number,
  emergencyFundTarget: number,
  emergencyFundGap: number,
  securityChecklist: SecurityItem[],
): string[] {
  const steps: string[] = [];
  const push = (text: string) => {
    if (!steps.includes(text)) {
      steps.push(text);
    }
  };

  const overCapBuckets = bucketRows.filter((row) => row.status !== "good");
  if (overCapBuckets.length > 0) {
    const first = overCapBuckets[0];
    push(
      `Start with ${first.label.toLowerCase()}: reduce it from ${fmt(first.actual)}/mo toward the ${fmt(first.capAmount)} cap.`,
    );
  } else {
    push(
      "All five core buckets are within cap right now. Keep future income growth from spilling into wants by default.",
    );
  }

  if (emergencyFundGap > 0) {
    push(
      `Best place for emergency fund: savings account for the first ₹50,000, then a liquid mutual fund or sweep-in FD for the rest (a regular FD charges a penalty if you break it early). Build toward ${fmt(emergencyFundTarget)} (~${fmt(Math.ceil(emergencyFundGap / 12))}/mo for ~12 months closes the gap).`,
    );
  } else {
    push(
      `Keep at least ${fmt(emergencyFundTarget)} accessible (savings + liquid MF weighted for speed) as your emergency reserve.`,
    );
  }

  const actionableSecurityItems = securityChecklist.filter(
    (item) => item.status !== "ok" && item.status !== "na" && item.actionNeeded,
  );
  for (const item of actionableSecurityItems.slice(0, 2)) {
    push(item.actionNeeded!);
  }

  if (untrackedCash > 0) {
    push(
      `You still have ${fmt(untrackedCash)}/mo unallocated. Assign it deliberately instead of letting it disappear through ad-hoc spending.`,
    );
  } else if (untrackedCash < 0) {
    push(
      `Your plan is overshooting income by ${fmt(-untrackedCash)}/mo. Pause or trim lower-priority buckets until cash flow turns positive.`,
    );
  }

  switch (profile.primaryGoal) {
    case "clear_debt":
      push(
        `Make debt payoff your default surplus use until the loan bucket falls well below the ${loansCapPercent(bucketRows)}% cap.`,
      );
      break;
    case "build_emergency_fund":
      push(
        "Route new surplus into liquid reserves first, then restart longer-term investing once the safety buffer is complete.",
      );
      break;
    case "kids_education":
      push(
        "Create a dedicated child education corpus so that school expenses and long-term goals do not compete with each other.",
      );
      break;
    case "build_insurance_premium_fund":
      push(
        "Prioritise a liquid insurance premium reserve (about 12 months of premiums in savings or liquid MF) so renewals never force you to dip into your emergency fund.",
      );
      break;
    default:
      push(
        `Keep redirecting surplus toward your primary goal: ${goalLabel(profile.primaryGoal)}.`,
      );
      break;
  }

  push(
    "Review the plan after every salary hike or major family change so the bucket mix stays intentional.",
  );

  return steps.slice(0, 7);
}

export function analyseFinances(data: FinancialProfile): AnalysisResult {
  const totalIncome = monthlyTotalIncome(data);
  const bucketRows = getUniversalBucketRows(data);
  const bucketActuals = getUniversalBucketActuals(data);
  const monthlyInvesting = bucketActuals.investment;
  const monthlyLoans = bucketActuals.loans;
  const monthlyExpenses = bucketActuals.needs;
  const savingsRate =
    totalIncome > 0 ? (monthlyInvesting / totalIncome) * 100 : 0;
  const debtRatio = totalIncome > 0 ? (monthlyLoans / totalIncome) * 100 : 0;
  const untrackedCash = getUnallocatedIncome(data);

  const emergencyFundMonthsMax = emergencyFundMonthsNeeded(data);
  const emergencyFundTargetMax = monthlyExpenses * emergencyFundMonthsMax;
  const er = computeRealEmergencyFund(data);
  const emergencyFundCurrent = er.realTotal;
  const emergencyFundGap = Math.max(
    0,
    emergencyFundTargetMax - emergencyFundCurrent,
  );

  const termNeeded = calculateTermNeeded(data);
  // Cover that counts as a solid base (matches assessTermCover).
  const termAdequacyFloor = Math.min(
    10_000_000,
    Math.max(50_00_000, termNeeded * 0.5),
  );
  const healthTarget = healthCoverTarget(data);
  const healthHeld = healthCoverHeld(data);
  const healthInsuranceGap = Math.max(0, healthTarget - healthHeld.total);
  const termOptional = termCoverOptional(data);
  const selfAge = n(data.selfAge) || 30;

  const securityChecklist: SecurityItem[] = [];

  const monthlyPremiumsAll = monthlyInsuranceTotal(data);
  const hasAnyInsuranceProduct =
    data.hasHealthInsurance ||
    data.hasTermInsurance ||
    n(data.carInsurancePremiumMonthly) > 0 ||
    n(data.bikeInsurancePremiumMonthly) > 0 ||
    n(data.otherInsurancePremiumMonthly) > 0;
  const premiumReserveTarget =
    monthlyPremiumsAll > 0 ? monthlyPremiumsAll * 12 : 0;

  // 1. Emergency fund (weighted: savings 100%, liquid MF 95%, FD 70%, other liquid 50%, legacy field 100%)
  const monthsCov = er.monthsCovered;
  const efMonthsNeeded = emergencyFundMonthsMax;
  const efTarget = er.monthlyExpenses * efMonthsNeeded;
  const efGap = Math.max(0, efTarget - er.realTotal);

  // Liquid money beyond the emergency fund fills the other cash buckets in
  // turn (medical fund, premium reserve, bereavement fund), the same way the
  // Fix Plan uses it, so nothing is counted twice or asked for again.
  let spareLiquid = Math.max(0, er.realTotal - efTarget);
  const takeSpare = (needed: number) => {
    const used = Math.min(spareLiquid, Math.max(0, needed));
    spareLiquid -= used;
    return used;
  };
  const medEmergencyTarget = medicalEmergencyTarget(data);
  const medEntered = n(data.medicalEmergencyFund);
  const medFromSavings = takeSpare(medEmergencyTarget - medEntered);
  const medEmergencyCurrent = medEntered + medFromSavings;
  let efStatus: SecurityItem["status"];
  let efDetail: string;
  let efAction: string | undefined;
  const efChecklistValue = `${monthsCov.toFixed(1)} months (${fmt(er.realTotal)} available)`;
  if (er.realTotal <= 0) {
    efStatus = "critical";
    efDetail = "No emergency fund";
    efAction = "Start with a liquid mutual fund. Even ₹10,000 is a start.";
  } else if (monthsCov < 3) {
    efStatus = "critical";
    efDetail = `Only ${monthsCov.toFixed(1)} months covered`;
    efAction = `Target ${efMonthsNeeded} months of expenses = ${fmt(efTarget)}`;
  } else if (monthsCov < efMonthsNeeded) {
    efStatus = "warning";
    efDetail = `${monthsCov.toFixed(1)} months covered - good start`;
    efAction =
      efGap > 0
        ? `Build to ${efMonthsNeeded} months - need ${fmt(efGap)} more`
        : undefined;
  } else {
    efStatus = "ok";
    efDetail = `${monthsCov.toFixed(1)} months covered - excellent. Well done - this is fully funded`;
    efAction = undefined;
  }
  const efBreakdownParts = [
    `Savings: ${fmt(er.savingsRaw)}`,
    `Liquid MF: ${fmt(er.liquidRaw)}`,
    `FD: ${fmt(er.fdRaw)}`,
  ];
  if (er.otherRaw > 0) efBreakdownParts.push(`Other: ${fmt(er.otherRaw)}`);
  securityChecklist.push({
    label: "Emergency fund",
    checklistIcon: "🛡️",
    checklistValue: efChecklistValue,
    status: efStatus,
    detail: efDetail,
    actionNeeded: efAction,
    breakdownHint: efStatus !== "ok" ? efBreakdownParts.join(" | ") : undefined,
  });

  // 2. Medical insurance (own policy + company cover; company cover ends with the job)
  const lakhs = (v: number) => `₹${Math.round(v / 100000)}L`;
  const ownPolicyTarget = ownHealthPolicyTarget(data);
  securityChecklist.push({
    label: "Medical insurance",
    status:
      healthHeld.total <= 0
        ? "critical"
        : healthInsuranceGap > 0 || healthHeld.employerOnly
          ? "warning"
          : "ok",
    detail:
      healthHeld.total <= 0
        ? "No health cover recorded"
        : healthHeld.employerOnly
          ? `${lakhs(healthHeld.employer)} from your company only. It stops if you change jobs or retire, and a new policy then starts its waiting periods (2-4 years for existing illnesses) from zero.`
          : healthHeld.employer > 0
            ? `${lakhs(healthHeld.own)} own policy + ${lakhs(healthHeld.employer)} company cover · Suggested: ${lakhs(healthTarget)}`
            : `${lakhs(healthHeld.own)} sum insured · Suggested: ${lakhs(healthTarget)}`,
    actionNeeded:
      healthHeld.total <= 0
        ? `Buy a ${lakhs(healthTarget)} family floater health policy.`
        : healthHeld.employerOnly
          ? `Buy your own ${lakhs(ownPolicyTarget)} base policy now while you're healthy, so its waiting periods are over before you need it. Keep the company cover on top.`
          : healthInsuranceGap > 0
            ? `Add a ${lakhs(healthInsuranceGap)} super top-up - it costs far less than a bigger base policy.`
            : undefined,
  });

  // 3. Medical emergency fund (out-of-pocket / co-pay / gaps)
  securityChecklist.push({
    label: "Medical emergency fund",
    status:
      medEmergencyCurrent >= medEmergencyTarget
        ? "ok"
        : medEmergencyCurrent >= medEmergencyTarget * 0.5
          ? "warning"
          : "critical",
    detail:
      medFromSavings > 0
        ? `${fmt(medEmergencyCurrent)} of ${fmt(medEmergencyTarget)} - ${fmt(medFromSavings)} of it from savings you hold beyond your emergency fund (for co-pay, room-rent caps and claim gaps)`
        : `${fmt(medEmergencyCurrent)} of ${fmt(medEmergencyTarget)} suggested (beyond insurance, for co-pay, room-rent caps and claim gaps)`,
    actionNeeded:
      medEmergencyCurrent < medEmergencyTarget
        ? medFromSavings > 0
          ? `Move ${fmt(medFromSavings)} of your spare savings into a separate liquid fund or sweep-in FD labelled "medical", and add ${fmt(medEmergencyTarget - medEmergencyCurrent)} more.`
          : `Add ~${fmt(Math.ceil((medEmergencyTarget - medEmergencyCurrent) / 12))}/mo for ~12 months into a separate liquid fund or sweep-in FD`
        : medFromSavings > 0
          ? `Move ${fmt(medFromSavings)} of your spare savings into a separate liquid fund or sweep-in FD labelled "medical".`
          : undefined,
  });

  // 4. Term insurance. A solid base (₹1Cr+, or half of today's need) is
  // enough: we don't ask for a top-up every time income grows.
  const termCover = n(data.termInsuranceSumAssured);
  const termAssessment = assessTermCover({
    hasTermInsurance: !!data.hasTermInsurance,
    termCover,
    termNeeded,
  });
  const termNeededPremium = termPremiumMonthlyEstimate(termNeeded, selfAge);
  const crore = (v: number) => `₹${(v / 10000000).toFixed(2)}Cr`;
  securityChecklist.push({
    label: "Term insurance",
    status:
      termAssessment.status === "missing"
        ? termOptional
          ? "ok"
          : "critical"
        : termAssessment.status === "partial"
          ? "warning"
          : "ok",
    detail:
      termAssessment.status === "missing"
        ? termOptional
          ? "Optional for now - no one depends on your income and you have no loans. Buying young locks a low premium for life."
          : `Recommended cover about ${crore(termNeeded)} (10x income + loans + dependants − assets, adjusted for age)`
        : termAssessment.status === "partial"
          ? `${crore(termCover)} cover · Your family needs at least ${crore(termAdequacyFloor)} as a base (full need at today's income ~${crore(termNeeded)})`
          : termAssessment.status === "complete"
            ? `${crore(termCover)} cover - enough for your family's needs`
            : `${crore(termCover)} cover - a solid base. Keep this policy: premiums rise with age, so cancelling and rebuying costs more. A top-up is optional, not needed every time your salary grows.`,
    actionNeeded:
      termAssessment.status === "missing" && !termOptional
        ? `Buy ~${crore(termNeeded)} pure term - about ${fmt(termNeededPremium)}/mo at your age (non-smoker)`
        : termAssessment.status === "partial"
          ? `Add ~${crore(termAdequacyFloor - termCover)} with a separate policy (about ${fmt(termPremiumMonthlyEstimate(termAdequacyFloor - termCover, selfAge))}/mo); keep the one you have.`
          : undefined,
  });

  // 5. Insurance premium reserve (~12 months in liquid cash - financial freedom habit)
  if (!hasAnyInsuranceProduct) {
    securityChecklist.push({
      label: "Insurance premium reserve (~12 months)",
      status: "na",
      detail:
        "Once you add health or term (and motor) policies, we’ll size a liquid reserve so renewals don’t stress monthly cash flow.",
    });
  } else if (monthlyPremiumsAll <= 0) {
    securityChecklist.push({
      label: "Insurance premium reserve (~12 months)",
      status:
        healthHeld.employerOnly && !data.hasTermInsurance ? "na" : "warning",
      detail:
        "Policies are on but premium amounts look incomplete - enter premiums to target a 12-month cushion in savings / liquid MF.",
      actionNeeded:
        "Update premium fields in the analyse flow so we can calculate your reserve target.",
    });
  } else {
    const premiumReserveHave = takeSpare(premiumReserveTarget);
    securityChecklist.push({
      label: "Insurance premium reserve (~12 months)",
      status:
        premiumReserveHave >= premiumReserveTarget
          ? "ok"
          : premiumReserveHave >= premiumReserveTarget * 0.5
            ? "warning"
            : "critical",
      detail:
        premiumReserveHave >= premiumReserveTarget
          ? `${fmt(premiumReserveTarget)} (${fmt(monthlyPremiumsAll)}/mo × 12) is covered by savings you hold beyond your emergency and medical funds. Keep it aside for renewals.`
          : `${fmt(premiumReserveHave)} spare beyond your emergency and medical funds vs target ${fmt(premiumReserveTarget)} (${fmt(monthlyPremiumsAll)}/mo × 12). Ring-fence this for renewals.`,
      actionNeeded:
        premiumReserveHave < premiumReserveTarget
          ? `Build ${fmt(premiumReserveTarget - premiumReserveHave)} in liquid cash over the next 12–18 months (or set this as your primary goal: insurance premium reserve).`
          : undefined,
    });
  }

  // 6. SSY - girl child under 10
  const hasGirlChild =
    data.kidsGenders?.includes("girl") &&
    data.kidsAges?.some(
      (age, index) => data.kidsGenders?.[index] === "girl" && age < 10,
    );
  if (hasGirlChild) {
    securityChecklist.push({
      label: "SSY - girl child under 10",
      status: n(data.ssy) > 0 ? "ok" : "warning",
      detail:
        n(data.ssy) > 0
          ? `${fmt(n(data.ssy))}/mo toward Sukanya Samriddhi (education / marriage)`
          : "Eligible now - SSY is a strong guaranteed option before she turns 10",
      actionNeeded:
        n(data.ssy) === 0
          ? "Open SSY (min ₹250/mo; max ₹1.5L/year) at an authorised bank or post office."
          : undefined,
    });
  }

  // 7. Post office / NSC holdings (lump-sum - not monthly SIP)
  const postOfficeRows = (
    data as FinancialProfile & {
      postOfficeSchemes?: Array<{
        scheme?: string;
        amount?: number;
      }>;
      hasPostOfficeSchemes?: boolean;
    }
  ).postOfficeSchemes;
  const hasPostOffice =
    Boolean(
      (data as FinancialProfile & { hasPostOfficeSchemes?: boolean })
        .hasPostOfficeSchemes,
    ) ||
    (postOfficeRows?.length ?? 0) > 0 ||
    Boolean(data.investsInNsc);

  if (hasPostOffice) {
    const schemeTotal =
      (postOfficeRows ?? []).reduce((sum, row) => sum + n(row.amount), 0) ||
      n(data.nscDepositAmount) +
        n((data as FinancialProfile & { nscMonthly?: number }).nscMonthly);
    const hasNsc =
      Boolean(data.investsInNsc) ||
      (postOfficeRows ?? []).some(
        (row) => row.scheme === "nsc" && n(row.amount) > 0,
      );
    securityChecklist.push({
      label: hasNsc
        ? "Post office schemes (incl. NSC)"
        : "Post office savings schemes",
      status: schemeTotal > 0 ? "ok" : "warning",
      detail:
        schemeTotal > 0
          ? `${fmt(schemeTotal)} held in post office / national savings schemes`
          : "You marked post office schemes - add the amounts you hold.",
      actionNeeded:
        schemeTotal === 0
          ? "Enter your post office scheme holdings in the Assets step."
          : undefined,
    });
  }

  // 8–9. Child goals
  if (n(data.numberOfKids) > 0) {
    securityChecklist.push({
      label: "Child education fund",
      status: n(data.kidsEducationFundTarget) > 0 ? "ok" : "warning",
      detail:
        n(data.kidsEducationFundTarget) > 0
          ? `Target: ${fmt(n(data.kidsEducationFundTarget))}`
          : "Not planned - set a corpus target in Goals",
      actionNeeded:
        n(data.kidsEducationFundTarget) === 0
          ? "Set kids education fund target in the Goals step."
          : undefined,
    });
    securityChecklist.push({
      label: "Kids marriage fund",
      status: n(data.kidsMarriageFundTarget) > 0 ? "ok" : "warning",
      detail:
        n(data.kidsMarriageFundTarget) > 0
          ? `Target: ${fmt(n(data.kidsMarriageFundTarget))}`
          : "Not planned",
      actionNeeded:
        n(data.kidsMarriageFundTarget) === 0
          ? "Set marriage fund target in the Goals step."
          : undefined,
    });
  }

  if (n(data.parentsSupport) > 0) {
    const parentsInsuranceNeeded =
      data.cityTier === "metro"
        ? 10_00_000
        : data.cityTier === "tier2"
          ? 7_00_000
          : 5_00_000;
    const hasParentsMedical = n(data.parentsHealthInsuranceSumInsured) > 0;
    const parentsInsuranceCovered = hasParentsMedical
      ? n(data.parentsHealthInsuranceSumInsured)
      : 0;
    const parentsLiquidForMedical = n(data.parentsEmergencyCash);
    const parentsMedicalCovered =
      parentsInsuranceCovered + parentsLiquidForMedical;

    securityChecklist.push({
      label: "Parents medical coverage",
      status:
        parentsMedicalCovered >= parentsInsuranceNeeded
          ? "ok"
          : parentsMedicalCovered >= parentsInsuranceNeeded * 0.5
            ? "warning"
            : "critical",
      detail: hasParentsMedical
        ? `₹${(parentsInsuranceCovered / 100000).toFixed(0)}L insurance + ₹${(parentsLiquidForMedical / 100000).toFixed(0)}L cash · Minimum needed: ₹${(parentsInsuranceNeeded / 100000).toFixed(0)}L for ${data.cityTier}`
        : `No parents insurance found. Need ₹${(parentsInsuranceNeeded / 100000).toFixed(0)}L for ${data.cityTier}.`,
      actionNeeded:
        parentsMedicalCovered < parentsInsuranceNeeded
          ? `Buy senior citizen health plan for parents (min ₹${(parentsInsuranceNeeded / 100000).toFixed(0)}L). Cost: ₹8,000–₹25,000/year depending on age.`
          : undefined,
    });

    if (data.parentsCity && data.parentsCity !== data.cityTier) {
      securityChecklist.push({
        label: "Parents in different city",
        status: "warning",
        detail: `Parents in ${data.parentsCity} · You are in ${data.cityTier}. Medical emergencies require immediate travel funds.`,
        actionNeeded:
          "Keep ₹50,000 specifically for emergency travel to parents location. Add this to bereavement fund.",
      });
    }
  }

  const bereavementNeeded = 2_00_000;
  const bereavementEntered = n(data.bereavementFund);
  const bereavementFromSavings = takeSpare(
    bereavementNeeded - bereavementEntered,
  );
  const bereavementFund = bereavementEntered + bereavementFromSavings;
  securityChecklist.push({
    label: "Bereavement / demise fund (last rites)",
    status: bereavementFund >= bereavementNeeded ? "ok" : "warning",
    detail:
      bereavementFund >= bereavementNeeded
        ? bereavementFromSavings > 0
          ? "Covered by savings beyond your other funds · Keep ₹2L where family can reach it the same day"
          : `₹${(bereavementFund / 100000).toFixed(0)}L set aside · For last rites, travel, and immediate family needs`
        : "Not enough set aside · Many families aim for at least ₹2L liquid for last rites and urgent expenses",
    actionNeeded:
      bereavementFund < bereavementNeeded
        ? `Keep ${fmt(bereavementNeeded - bereavementFund)} more in a separate savings account your family can access - same-day access matters more than returns.`
        : undefined,
  });

  let issues = buildIssues({
    totalIncome,
    savingsRate,
    debtRatio,
    untrackedCash,
    emergencyFundGap,
    accessibleEmergencyTotal: er.realTotal,
    monthsCoveredEmergency: er.monthsCovered,
    emergencyFundTargetMax,
    bucketRows,
    insuranceActual: monthlyInsuranceTotal(data),
    termCover,
    termNeeded,
    hasTermInsurance: data.hasTermInsurance,
    medEmergencyCurrent,
    medEmergencyTarget,
    monthlyInvesting,
    termOptional,
    healthHeld,
    healthTarget,
  });

  // Defensive de-dup in case future branches push same issue code twice.
  const seenIssueCodes = new Set<string>();
  issues = issues.filter((issue) => {
    if (seenIssueCodes.has(issue.code)) return false;
    seenIssueCodes.add(issue.code);
    return true;
  });

  const teaser =
    issues[0]?.message ??
    "Your financial picture is ready. The universal income meter is now showing where your cash flow is going.";

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const termInsuranceNeeded = calculateTermNeeded(data);
  const savingsVal = data.savingsAccountBalance || 0;
  const fdVal = data.fdValue || 0;
  const liquidMFVal = data.liquidMFValue || 0;
  const totalAssets =
    savingsVal +
    fdVal +
    (data.liquidMFValue || 0) +
    n(data.otherLiquidSavings) +
    existingEquityValue(data) +
    (data.ppfBalance || 0) +
    (data.npsBalance || 0) +
    (data.epfBalance || 0) +
    (data.homeMarketValue || 0) +
    (data.carMarketValue || 0) +
    (data.goldValue || 0) +
    n(data.emergencyFundCurrent) +
    (() => {
      const schemes = (
        data as FinancialProfile & {
          hasPostOfficeSchemes?: boolean;
          postOfficeSchemes?: Array<{ amount?: number }>;
        }
      ).postOfficeSchemes;
      if (
        (data as FinancialProfile & { hasPostOfficeSchemes?: boolean })
          .hasPostOfficeSchemes &&
        (schemes?.length ?? 0) > 0
      ) {
        return schemes!.reduce((sum, row) => sum + (row.amount || 0), 0);
      }
      return data.nscDepositAmount || 0;
    })() +
    (data.otherAssets || 0) +
    (data.customInvestments || []).reduce(
      (sum: number, inv: any) => sum + (inv.currentValue || 0),
      0,
    );
  const totalLiabilities = totalLoanLiabilities(data);
  const netWorth = totalAssets - totalLiabilities;
  const moneyScore = computeMoneyScore({
    profile: data,
    income: totalIncome,
    investingMonthly: monthlyInvesting,
    loansMonthly: monthlyLoans,
    unallocatedMonthly: untrackedCash,
    emergency: {
      have: er.realTotal,
      target: efTarget,
      monthsHave: er.monthsCovered,
      monthsNeeded: efMonthsNeeded,
    },
    medical: { have: medEmergencyCurrent, target: medEmergencyTarget },
    health: {
      total: healthHeld.total,
      own: healthHeld.own,
      target: healthTarget,
      employerOnly: healthHeld.employerOnly,
    },
    term: {
      optional: termOptional,
      cover: data.hasTermInsurance ? termCover : 0,
      needed: termNeeded,
      floor: termAdequacyFloor,
      premiumMonthly: termNeededPremium,
    },
    netWorth,
    fdNeededForEmergency: Math.min(
      n(data.fdValue),
      Math.max(
        0,
        efTarget - n(data.savingsAccountBalance) - n(data.liquidMFValue) * 0.95,
      ) / 0.7,
    ),
  });
  const overallScore = moneyScore.total;

  return {
    overallScore,
    moneyScore,
    criticalIssueCount: criticalCount,
    warningIssueCount: warningCount,
    scores: {
      savingsRate,
      debtRatio,
      untrackedCash,
      emergencyFundGap,
    },
    flags: issuesToFlags(issues),
    issues,
    teaser,
    planSteps: buildPlanSteps(
      data,
      bucketRows,
      untrackedCash,
      emergencyFundTargetMax,
      emergencyFundGap,
      securityChecklist,
    ),
    securityChecklist,
    termInsuranceNeeded,
    realEmergencyFund: {
      ...er,
      total: er.realTotal,
      monthsCovered: er.monthsCovered,
      savings: savingsVal,
      fd: fdVal,
      fdWeighted: fdVal * 0.7,
      liquidMF: liquidMFVal,
    },
    totalAssets,
    totalLiabilities,
    netWorth,
    universalBuckets: {
      needs: {
        capPercent:
          bucketRows.find((r) => r.key === "needs")?.capPercent ?? 0.3,
        capAmount: bucketRows.find((r) => r.key === "needs")?.capAmount ?? 0,
        actual: bucketRows.find((r) => r.key === "needs")?.actual ?? 0,
        status: bucketRows.find((r) => r.key === "needs")?.status ?? "good",
      },
      wants: {
        capPercent:
          bucketRows.find((r) => r.key === "wants")?.capPercent ?? 0.05,
        capAmount: bucketRows.find((r) => r.key === "wants")?.capAmount ?? 0,
        actual: bucketRows.find((r) => r.key === "wants")?.actual ?? 0,
        status: bucketRows.find((r) => r.key === "wants")?.status ?? "good",
      },
      security: {
        capPercent:
          bucketRows.find((r) => r.key === "security")?.capPercent ??
          BUCKET_CAPS.security,
        capAmount: bucketRows.find((r) => r.key === "security")?.capAmount ?? 0,
        actual: bucketRows.find((r) => r.key === "security")?.actual ?? 0,
        status: bucketRows.find((r) => r.key === "security")?.status ?? "good",
      },
      loans: {
        capPercent:
          bucketRows.find((r) => r.key === "loans")?.capPercent ??
          BUCKET_CAPS.loans,
        capAmount: bucketRows.find((r) => r.key === "loans")?.capAmount ?? 0,
        actual: bucketRows.find((r) => r.key === "loans")?.actual ?? 0,
        status: bucketRows.find((r) => r.key === "loans")?.status ?? "good",
      },
      investment: {
        capPercent:
          bucketRows.find((r) => r.key === "investment")?.capPercent ??
          BUCKET_CAPS.investment,
        capAmount:
          bucketRows.find((r) => r.key === "investment")?.capAmount ?? 0,
        actual: bucketRows.find((r) => r.key === "investment")?.actual ?? 0,
        status:
          bucketRows.find((r) => r.key === "investment")?.status ?? "good",
      },
    },
  };
}
