import type { CityTier, FinancialProfile } from "@/lib/analyse-form-schema";
import {
  BASE_UNIVERSAL_CAPS,
  getInsuranceCriticalFloor,
  getInsuranceGuideline,
  getUniversalCaps,
  getUnallocatedIncome,
  getUniversalBucketActuals,
  getUniversalBucketRows,
} from "@/lib/universal-buckets";

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
  /** Legacy “emergency fund set aside” field from older forms — counted at 100%. */
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
  console.log("=== EMERGENCY FUND CALC ===", {
    savings: data.savingsAccountBalance,
    fd: data.fdValue,
    liquidMF: data.liquidMFValue,
    otherLiquid: data.otherLiquidSavings,
    fdWeighted: (data.fdValue || 0) * 0.7,
    total:
      (data.savingsAccountBalance || 0) +
      (data.liquidMFValue || 0) * 0.95 +
      (data.fdValue || 0) * 0.7 +
      (data.otherLiquidSavings || 0) * 0.5,
  });
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

/** Suggested medical emergency corpus (beyond health insurance) by city, age, and dependants. */
function medicalEmergencyTargetLiquid(data: FinancialProfile): number {
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
    n(p.otherInsurancePremiumMonthly)
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

  const insuranceFloor = getInsuranceCriticalFloor(totalIncome);
  if (insuranceActual < insuranceFloor) {
    issues.push({
      severityScore: 85,
      severity: "critical",
      code: "insurance_below_floor",
      message: `Insurance contributions are only ${fmt(insuranceActual)}/mo. Keep protection spend above ${fmt(insuranceFloor)}/mo.`,
    });
  }

  if (emergencyFundGap > 0) {
    const emergencySeverity: IssueSeverity =
      monthsCoveredEmergency >= 3 ? "warning" : "critical";
    issues.push({
      severityScore: emergencySeverity === "critical" ? 80 : 55,
      severity: emergencySeverity,
      code: "emergency_fund_short",
      message: `Accessible emergency fund ~${fmt(accessibleEmergencyTotal)} (~${monthsCoveredEmergency.toFixed(1)} mo of needs). Target buffer ${fmt(emergencyFundTargetMax)} — short by about ${fmt(emergencyFundGap)}.`,
    });
  } else {
    issues.push({
      severityScore: 20,
      severity: "good",
      code: "emergency_fund_ok",
      message: `Accessible emergency fund ~${fmt(accessibleEmergencyTotal)} covers about ${monthsCoveredEmergency.toFixed(1)} months of needs — on track for your target buffer.`,
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
    issues.push({
      severityScore: 92,
      severity: "critical",
      code: "term_missing",
      message:
        "You have no term insurance. Your family has zero protection if income stops.",
    });
  } else if (termCover < termNeeded) {
    issues.push({
      severityScore: 58,
      severity: "warning",
      code: "term_underinsured",
      message: `You have ₹${(termCover / 10000000).toFixed(1)}Cr. Recommended: ₹${(termNeeded / 10000000).toFixed(1)}Cr.`,
    });
  }

  if (medEmergencyCurrent < medEmergencyTarget) {
    issues.push({
      severityScore: 90,
      severity: "critical",
      code: "medical_fund_short",
      message: `Medical emergency fund is ${fmt(medEmergencyCurrent)} versus target ${fmt(medEmergencyTarget)}.`,
    });
  }

  if (debtRatio <= getDebtSafeLimitPercent() + 1e-6) {
    issues.push({
      severityScore: 18,
      severity: "good",
      code: "loans_on_track",
      message: `Loan bucket is ${debtRatio.toFixed(1)}% of income, within the 40% ceiling.`,
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
      `Best place for emergency fund: savings account for the first ₹50,000, then liquid mutual fund for the rest. Avoid FD for emergency fund — penalty if you need money urgently. Then build toward ${fmt(emergencyFundTarget)} (~${fmt(Math.ceil(emergencyFundGap / 12))}/mo for ~12 months closes the gap).`,
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
        "Make debt payoff your default surplus use until the loan bucket falls well below the 40% cap.",
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

  const insuranceGuideline = getInsuranceGuideline(monthlyTotalIncome(profile));
  push(
    `Aim to keep roughly ${fmt(insuranceGuideline)}/mo available for insurance and protection, but do not count it as monthly investment flow.`,
  );

  while (steps.length < 7) {
    push(
      "Review the meter after every salary hike or major family change so the bucket mix stays intentional.",
    );
  }

  return steps.slice(0, 7);
}

export function analyseFinances(data: FinancialProfile): AnalysisResult {
  console.log("=== ALL LOANS IN ENGINE ===", {
    personalLoanEMI: data.personalLoanEMI,
    carLoanEMI: data.carLoanEMI,
    bikeEMI: data.bikeEMI,
    additionalObligations: data.additionalObligations,
    totalEMI:
      (data.personalLoanEMI || 0) +
      (data.carLoanEMI || 0) +
      (data.bikeEMI || 0) +
      (data.additionalObligations || []).reduce(
        (s: number, o: any) => s + (o.monthlyAmount || 0),
        0,
      ),
  });
  console.log("=== FINKOIN ENGINE DEBUG START ===");
  console.log(
    "RAW PROFILE INPUT:",
    JSON.stringify(
      {
        lifeStage: data.lifeStage,
        monthlySalary: data.monthlySalary,
        spouseIncome: data.spouseIncome,
        otherIncome: data.otherIncome,
        savingsAccountBalance: data.savingsAccountBalance,
        fdValue: data.fdValue,
        liquidMFValue: data.liquidMFValue,
        otherLiquidSavings: data.otherLiquidSavings,
        epfBalance: data.epfBalance,
        mfValue: data.mfValue,
        totalEquityValue: data.totalEquityValue,
        homeMarketValue: data.homeMarketValue,
        homeLoanOutstanding: data.homeLoanOutstanding,
        carMarketValue: data.carMarketValue,
        goldValue: data.goldValue,
        termInsuranceSumAssured: data.termInsuranceSumAssured,
        hasTermInsurance: data.hasTermInsurance,
        healthInsuranceSumInsured: data.healthInsuranceSumInsured,
        foodTotal: data.foodTotal,
        transportTotal: data.transportTotal,
        utilityTotal: data.utilityTotal,
        rentAmount: data.rentAmount,
        homeLoanEMI: data.homeLoanEMI,
        personalLoanEMI: data.personalLoanEMI,
      },
      null,
      2,
    ),
  );
  console.log("=== FINKOIN DEBUG ===");
  console.log("INPUTS:", {
    savingsAccountBalance: data.savingsAccountBalance,
    fdValue: data.fdValue,
    liquidMFValue: data.liquidMFValue,
    homeLoanOutstanding: data.homeLoanOutstanding,
    homeMarketValue: data.homeMarketValue,
    epfBalance: data.epfBalance,
    termInsuranceSumAssured: data.termInsuranceSumAssured,
    monthlySalary: data.monthlySalary,
    spouseIncome: data.spouseIncome,
    otherIncome: data.otherIncome,
    lifeStage: data.lifeStage,
  });
  if (process.env.NODE_ENV === "development") {
    console.log("[analyseFinances] called", {
      lifeStage: data.lifeStage,
      cityTier: data.cityTier,
      monthlySalary: data.monthlySalary,
      fieldCount: Object.keys(data).length,
    });
  }

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

  const emergencyFundMonthsMin =
    data.lifeStage === "bachelor"
      ? 3
      : data.lifeStage === "married"
        ? 6
        : data.lifeStage === "kids"
          ? 9
          : 6;
  const emergencyFundMonthsMax =
    data.lifeStage === "bachelor" ? 6 : data.lifeStage === "married" ? 9 : 12;
  const emergencyFundTargetMin = monthlyExpenses * emergencyFundMonthsMin;
  const emergencyFundTargetMax = monthlyExpenses * emergencyFundMonthsMax;
  const er = computeRealEmergencyFund(data);
  if (process.env.NODE_ENV === "development") {
    console.log("EMERGENCY FUND DEBUG:", {
      savingsAccountBalance: data.savingsAccountBalance,
      fdValue: data.fdValue,
      liquidMFValue: data.liquidMFValue,
      otherLiquidSavings: data.otherLiquidSavings,
    });
  }
  const emergencyFundCurrent = er.realTotal;
  const emergencyFundGap = Math.max(
    0,
    emergencyFundTargetMax - emergencyFundCurrent,
  );

  const termNeeded = calculateTermNeeded(data);
  console.log("=== TERM INSURANCE CALC ===", {
    termSumAssured: data.termInsuranceSumAssured,
    hasTermInsurance: data.hasTermInsurance,
    termInsuranceNeeded: termNeeded,
  });
  console.log("=== NET WORTH CALC ===", {
    savings: data.savingsAccountBalance,
    fd: data.fdValue,
    epf: data.epfBalance,
    equity:
      data.totalEquityValue ||
      (data.mfValue || 0) + (data.indianStocksValue || 0),
    home: data.homeMarketValue,
    car: data.carMarketValue,
    gold: data.goldValue,
    nsc: data.nscDepositAmount,
  });
  const minimumReasonableTermCover = 50_00_000;
  const termAdequacyFloor = Math.max(
    minimumReasonableTermCover,
    termNeeded * 0.5,
  );
  const healthTarget = data.lifeStage === "bachelor" ? 5_00_000 : 10_00_000;
  const healthInsuranceGap = Math.max(
    0,
    healthTarget - n(data.healthInsuranceSumInsured),
  );

  const securityChecklist: SecurityItem[] = [];

  const liquidForPremiums =
    n(data.savingsAccountBalance) + n(data.liquidMFValue);
  const monthlyPremiumsAll = monthlyInsuranceTotal(data);
  const hasAnyInsuranceProduct =
    data.hasHealthInsurance ||
    data.hasTermInsurance ||
    n(data.carInsurancePremiumMonthly) > 0 ||
    n(data.bikeInsurancePremiumMonthly) > 0 ||
    n(data.otherInsurancePremiumMonthly) > 0;
  const premiumReserveTarget =
    monthlyPremiumsAll > 0 ? monthlyPremiumsAll * 12 : 0;

  const medEmergencyTarget = medicalEmergencyTargetLiquid(data);
  const medEmergencyCurrent = n(data.medicalEmergencyFund);

  // 1. Emergency fund (weighted: savings 100%, liquid MF 95%, FD 70%, other liquid 50%, legacy field 100%)
  const monthsCov = er.monthsCovered;
  const target6 = er.monthlyExpenses * 6;
  const gapTo6 = Math.max(0, target6 - er.realTotal);
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
    efAction = `Target 6 months of expenses = ${fmt(target6)}`;
  } else if (monthsCov < 6) {
    efStatus = "warning";
    efDetail = `${monthsCov.toFixed(1)} months covered — good start`;
    efAction =
      gapTo6 > 0 ? `Build to 6 months — need ${fmt(gapTo6)} more` : undefined;
  } else {
    efStatus = "ok";
    efDetail = `${monthsCov.toFixed(1)} months covered — excellent. Well done — this is fully funded`;
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

  // 2. Medical insurance
  securityChecklist.push({
    label: "Medical insurance",
    status: !data.hasHealthInsurance
      ? "critical"
      : healthInsuranceGap > 0
        ? "warning"
        : "ok",
    detail: data.hasHealthInsurance
      ? `₹${(n(data.healthInsuranceSumInsured) / 100000).toFixed(0)}L sum insured`
      : "No family floater recorded",
    actionNeeded: !data.hasHealthInsurance
      ? "Buy at least a ₹5L family floater (increase for metro / kids)."
      : healthInsuranceGap > 0
        ? `Increase cover by about ₹${(healthInsuranceGap / 100000).toFixed(0)}L`
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
    detail: `You entered ${fmt(medEmergencyCurrent)} · Suggested minimum: ${fmt(medEmergencyTarget)} (beyond insurance, for co-pay & gaps)`,
    actionNeeded:
      medEmergencyCurrent < medEmergencyTarget
        ? `Add ~${fmt(Math.ceil((medEmergencyTarget - medEmergencyCurrent) / 12))}/mo for ~12 months into a separate liquid medical bucket`
        : undefined,
  });

  // 4. Term insurance — ₹1Cr+ is treated as a strong baseline (rebuying after income/age jumps is often costly)
  const termCover = n(data.termInsuranceSumAssured);
  const termCoverOneCrOrMore = termCover >= 10_000_000;
  securityChecklist.push({
    label: "Term insurance",
    status: !data.hasTermInsurance
      ? "critical"
      : termCoverOneCrOrMore || termCover >= termAdequacyFloor
        ? "ok"
        : "warning",
    detail: data.hasTermInsurance
      ? termCoverOneCrOrMore
        ? `₹${(termCover / 10000000).toFixed(2)}Cr cover — strong baseline. Reference at today’s income: ~₹${(termNeeded / 10000000).toFixed(2)}Cr. Premiums rise sharply with age; keeping an early policy after a salary jump is often wiser than cancel-and-rebuy.`
        : `₹${(termCover / 10000000).toFixed(2)}Cr cover · ~${fmt(n(data.termInsurancePremiumMonthly))}/mo · Reference need: ₹${(termNeeded / 10000000).toFixed(2)}Cr`
      : `Recommended cover about ₹${(termNeeded / 10000000).toFixed(2)}Cr (income ×10 + loans − assets, adjusted for age)`,
    actionNeeded: !data.hasTermInsurance
      ? `Buy ~₹${(termNeeded / 10000000).toFixed(2)}Cr pure term — often ~${fmt(Math.round(termNeeded * 0.000008))}/mo at your age band`
      : termCoverOneCrOrMore
        ? undefined
        : termCover < termAdequacyFloor
          ? `Top up if cover is below ~₹${(termAdequacyFloor / 10000000).toFixed(2)}Cr`
          : undefined,
  });

  // 5. Insurance premium reserve (~12 months in liquid cash — financial freedom habit)
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
      status: "warning",
      detail:
        "Policies are on but premium amounts look incomplete — enter premiums to target a 12-month cushion in savings / liquid MF.",
      actionNeeded:
        "Update premium fields in the analyse flow so we can calculate your reserve target.",
    });
  } else {
    securityChecklist.push({
      label: "Insurance premium reserve (~12 months)",
      status:
        liquidForPremiums >= premiumReserveTarget
          ? "ok"
          : liquidForPremiums >= premiumReserveTarget * 0.5
            ? "warning"
            : "critical",
      detail: `${fmt(liquidForPremiums)} in savings + liquid MF vs target ${fmt(premiumReserveTarget)} (${fmt(monthlyPremiumsAll)}/mo × 12). Ring-fence this for renewals.`,
      actionNeeded:
        liquidForPremiums < premiumReserveTarget
          ? `Build ${fmt(premiumReserveTarget - liquidForPremiums)} in liquid cash over the next 12–18 months (or set this as your primary goal: insurance premium reserve).`
          : undefined,
    });
  }

  // 6. SSY — girl child under 10
  const hasGirlChild =
    data.kidsGenders?.includes("girl") &&
    data.kidsAges?.some(
      (age, index) => data.kidsGenders?.[index] === "girl" && age < 10,
    );
  if (hasGirlChild) {
    securityChecklist.push({
      label: "SSY — girl child under 10",
      status: n(data.ssy) > 0 ? "ok" : "warning",
      detail:
        n(data.ssy) > 0
          ? `${fmt(n(data.ssy))}/mo toward Sukanya Samriddhi (education / marriage)`
          : "Eligible now — SSY is a strong guaranteed option before she turns 10",
      actionNeeded:
        n(data.ssy) === 0
          ? "Open SSY (min ₹250/mo; max ₹1.5L/year) at an authorised bank or post office."
          : undefined,
    });
  }

  // 7. Post office / NSC holdings (lump-sum — not monthly SIP)
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
          : "You marked post office schemes — add the amounts you hold.",
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
          : "Not planned — set a corpus target in Goals",
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

  const bereavementFund = n(data.bereavementFund);
  const bereavementNeeded = 2_00_000;
  securityChecklist.push({
    label: "Bereavement / demise fund (last rites)",
    status: bereavementFund >= bereavementNeeded ? "ok" : "critical",
    detail:
      bereavementFund >= bereavementNeeded
        ? `₹${(bereavementFund / 100000).toFixed(0)}L set aside · For last rites, travel, and immediate family needs`
        : "Not enough set aside · Many families aim for at least ₹2L liquid for last rites and urgent expenses",
    actionNeeded:
      bereavementFund < bereavementNeeded
        ? 'Keep ₹2,00,000 in a separate savings account labelled "bereavement / demise fund". Keep it in cash or savings — same-day access.'
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
  });

  if (data.hasTermInsurance && n(data.termInsuranceSumAssured) >= 10_000_000) {
    issues.push({
      severityScore: 32,
      severity: "good",
      code: "term_cover_one_crore_baseline",
      message:
        "You have ₹1 crore or more pure term cover — strong protection. If income has grown since you bought it, new cover at today’s age is often much costlier, so your existing policy is still a big win.",
    });
    issues.sort((a, b) => b.severityScore - a.severityScore);
  }

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
  const infoCount = issues.filter((i) => i.severity === "info").length;
  const overallScore = Math.max(
    0,
    Math.min(100, 100 - criticalCount * 15 - warningCount * 7 - infoCount * 2),
  );

  const termInsuranceNeeded = calculateTermNeeded(data);
  const savingsVal = data.savingsAccountBalance || 0;
  const fdVal = data.fdValue || 0;
  const liquidMFVal = data.liquidMFValue || 0;
  const otherLiquidVal = data.otherLiquidSavings || 0;
  const emergencyCorpusTotal =
    savingsVal * 1.0 + liquidMFVal * 0.95 + fdVal * 0.7 + otherLiquidVal * 0.5;
  const needsMonthly = bucketActuals?.needs || 0;
  const monthsCovered =
    needsMonthly > 0 ? emergencyCorpusTotal / needsMonthly : 0;
  const totalAssets =
    savingsVal +
    fdVal +
    (data.liquidMFValue || 0) +
    (n(data.totalEquityValue) > 0
      ? n(data.totalEquityValue)
      : (data.mfValue || 0) +
        (data.indianStocksValue || 0) +
        (data.usStocksValueINR || 0) +
        (data.usMFValueINR || 0) +
        (data.rsuValueINR || 0)) +
    (data.ppfBalance || 0) +
    (data.npsBalance || 0) +
    (data.epfBalance || 0) +
    (data.homeMarketValue || 0) +
    (data.carMarketValue || 0) +
    (data.goldValue || 0) +
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
  const totalLiabilities =
    (data.homeLoanOutstanding || 0) +
    (data.carLoanOutstanding || 0) +
    (data.personalLoanOutstanding || (data.personalLoanEMI || 0) * 24) +
    (data.bikeEMI || 0) * 24 +
    (data.creditCardBillMonthly || 0) * 3 +
    (data.unifiedLoans || []).reduce((sum: number, loan: any) => {
      const alreadyCounted =
        loan.loanType === "personal_loan" ||
        loan.loanType === "car_loan" ||
        loan.loanType === "bike_loan";
      if (alreadyCounted) return sum;
      return (
        sum +
        (loan.outstandingAmount ||
          (loan.monthlyEMI || 0) * (loan.remainingMonths || 18))
      );
    }, 0);
  const netWorth = totalAssets - totalLiabilities;
  if (process.env.NODE_ENV === "development") {
    console.log(
      "ISSUES:",
      issues.map((i) => `${i.code}: ${i.severity}`),
    );
  }

  return {
    overallScore,
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
      total: emergencyCorpusTotal,
      monthsCovered,
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
          bucketRows.find((r) => r.key === "security")?.capPercent ?? 0.05,
        capAmount: bucketRows.find((r) => r.key === "security")?.capAmount ?? 0,
        actual: bucketRows.find((r) => r.key === "security")?.actual ?? 0,
        status: bucketRows.find((r) => r.key === "security")?.status ?? "good",
      },
      loans: {
        capPercent:
          bucketRows.find((r) => r.key === "loans")?.capPercent ?? 0.4,
        capAmount: bucketRows.find((r) => r.key === "loans")?.capAmount ?? 0,
        actual: bucketRows.find((r) => r.key === "loans")?.actual ?? 0,
        status: bucketRows.find((r) => r.key === "loans")?.status ?? "good",
      },
      investment: {
        capPercent:
          bucketRows.find((r) => r.key === "investment")?.capPercent ?? 0.2,
        capAmount:
          bucketRows.find((r) => r.key === "investment")?.capAmount ?? 0,
        actual: bucketRows.find((r) => r.key === "investment")?.actual ?? 0,
        status:
          bucketRows.find((r) => r.key === "investment")?.status ?? "good",
      },
    },
  };
}
