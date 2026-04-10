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
}

export type AnalysisResult = {
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
};

function n(v: number | undefined): number {
  return v ?? 0;
}

/** Suggested medical emergency corpus (beyond health insurance) by city, age, and dependants. */
function medicalEmergencyTargetLiquid(data: FinancialProfile): number {
  let target =
    data.cityTier === "metro" ? 3_00_000 : data.cityTier === "tier2" ? 2_50_000 : 2_00_000;
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
  return n(p.monthlySalary) + n(p.spouseIncome) + n(p.otherIncome);
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
  const existingAssets =
    n(data.mfValue) +
    n(data.indianStocksValue) +
    n(data.ppfBalance) +
    n(data.epfBalance) +
    n(data.fdValue);
  const ageMultiplier =
    data.selfAge < 30 ? 1.2 : data.selfAge < 40 ? 1 : data.selfAge < 50 ? 0.8 : 0.6;
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
  bucketRows: ReturnType<typeof getUniversalBucketRows>;
  insuranceActual: number;
}): AnalysisIssue[] {
  const {
    totalIncome,
    savingsRate,
    debtRatio,
    untrackedCash,
    emergencyFundGap,
    bucketRows,
    insuranceActual,
  } = params;
  const issues: AnalysisIssue[] = [];

  if (totalIncome <= 0) {
    return [
      {
        severityScore: 100,
        severity: "critical",
        code: "income_zero",
        message: "Add your income details so the meter and bucket caps can start working.",
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
    issues.push({
      severityScore: 80,
      severity: "critical",
      code: "emergency_fund_short",
      message: `Emergency fund is short by about ${fmt(emergencyFundGap)} against your target buffer.`,
    });
  } else {
    issues.push({
      severityScore: 20,
      severity: "good",
      code: "emergency_fund_ok",
      message: "Emergency fund is fully funded for your current life stage.",
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

  if (savingsRate <= BASE_UNIVERSAL_CAPS.investment * 100 + 1e-6) {
    issues.push({
      severityScore: 18,
      severity: "good",
      code: "investment_on_track",
      message: `Investment bucket is ${savingsRate.toFixed(1)}% of income and is being checked against your current investment cap.`,
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
    push("All five core buckets are within cap right now. Keep future income growth from spilling into wants by default.");
  }

  if (emergencyFundGap > 0) {
    push(
      `Build your emergency fund to ${fmt(emergencyFundTarget)}. A steady ${fmt(Math.ceil(emergencyFundGap / 12))}/mo for 12 months will close the gap.`,
    );
  } else {
    push(`Keep at least ${fmt(emergencyFundTarget)} ring-fenced as your emergency reserve.`);
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
      push("Make debt payoff your default surplus use until the loan bucket falls well below the 40% cap.");
      break;
    case "build_emergency_fund":
      push("Route new surplus into liquid reserves first, then restart longer-term investing once the safety buffer is complete.");
      break;
    case "kids_education":
      push("Create a dedicated child education corpus so that school expenses and long-term goals do not compete with each other.");
      break;
    case "build_insurance_premium_fund":
      push(
        "Prioritise a liquid insurance premium reserve (about 12 months of premiums in savings or liquid MF) so renewals never force you to dip into your emergency fund.",
      );
      break;
    default:
      push(`Keep redirecting surplus toward your primary goal: ${goalLabel(profile.primaryGoal)}.`);
      break;
  }

  const insuranceGuideline = getInsuranceGuideline(monthlyTotalIncome(profile));
  push(
    `Aim to keep roughly ${fmt(insuranceGuideline)}/mo available for insurance and protection, but do not count it as monthly investment flow.`,
  );

  while (steps.length < 7) {
    push("Review the meter after every salary hike or major family change so the bucket mix stays intentional.");
  }

  return steps.slice(0, 7);
}

export function analyseFinances(data: FinancialProfile): AnalysisResult {
  const totalIncome = monthlyTotalIncome(data);
  const bucketRows = getUniversalBucketRows(data);
  const bucketActuals = getUniversalBucketActuals(data);
  const monthlyInvesting = bucketActuals.investment;
  const monthlyLoans = bucketActuals.loans;
  const monthlyExpenses = bucketActuals.needs;
  const savingsRate = totalIncome > 0 ? (monthlyInvesting / totalIncome) * 100 : 0;
  const debtRatio = totalIncome > 0 ? (monthlyLoans / totalIncome) * 100 : 0;
  const untrackedCash = getUnallocatedIncome(data);

  const emergencyFundMonthsMin =
    data.lifeStage === "bachelor" ? 3 : data.lifeStage === "married" ? 6 : data.lifeStage === "kids" ? 9 : 6;
  const emergencyFundMonthsMax =
    data.lifeStage === "bachelor" ? 6 : data.lifeStage === "married" ? 12 : 12;
  const emergencyFundTargetMin = monthlyExpenses * emergencyFundMonthsMin;
  const emergencyFundTargetMax = monthlyExpenses * emergencyFundMonthsMax;
  const emergencyFundCurrent = n(data.emergencyFundCurrent) + n(data.fdValue);
  const emergencyFundGap = Math.max(0, emergencyFundTargetMax - emergencyFundCurrent);

  const termNeeded = calculateTermNeeded(data);
  const minimumReasonableTermCover = 50_00_000;
  const termAdequacyFloor = Math.max(minimumReasonableTermCover, termNeeded * 0.5);
  const healthTarget = data.lifeStage === "bachelor" ? 5_00_000 : 10_00_000;
  const healthInsuranceGap = Math.max(0, healthTarget - n(data.healthInsuranceSumInsured));

  const securityChecklist: SecurityItem[] = [];

  const liquidForPremiums = n(data.savingsAccountBalance) + n(data.liquidMFValue);
  const monthlyPremiumsAll = monthlyInsuranceTotal(data);
  const hasAnyInsuranceProduct =
    data.hasHealthInsurance ||
    data.hasTermInsurance ||
    n(data.carInsurancePremiumMonthly) > 0 ||
    n(data.bikeInsurancePremiumMonthly) > 0 ||
    n(data.otherInsurancePremiumMonthly) > 0;
  const premiumReserveTarget = monthlyPremiumsAll > 0 ? monthlyPremiumsAll * 12 : 0;

  const medEmergencyTarget = medicalEmergencyTargetLiquid(data);
  const medEmergencyCurrent = n(data.medicalEmergencyFund);

  // 1. Emergency fund
  securityChecklist.push({
    label: "Emergency fund",
    status:
      emergencyFundCurrent >= emergencyFundTargetMax
        ? "ok"
        : emergencyFundCurrent >= emergencyFundTargetMin
          ? "warning"
          : emergencyFundCurrent >= emergencyFundTargetMin * 0.5
            ? "warning"
            : "critical",
    detail:
      emergencyFundCurrent >= emergencyFundTargetMax
        ? `${fmt(emergencyFundCurrent)} (incl. FD) · ${emergencyFundMonthsMax}-month target met`
        : emergencyFundCurrent >= emergencyFundTargetMin
          ? `${fmt(emergencyFundCurrent)} (incl. FD) · ${emergencyFundMonthsMin}–${emergencyFundMonthsMax} month band · Ideal: ${fmt(emergencyFundTargetMax)}`
          : `${fmt(emergencyFundCurrent)} vs minimum ${fmt(emergencyFundTargetMin)} (${emergencyFundMonthsMin} mo of needs)`,
    actionNeeded:
      emergencyFundCurrent < emergencyFundTargetMin
        ? `Save ${fmt(Math.ceil((emergencyFundTargetMin - emergencyFundCurrent) / 12))}/mo to reach ${emergencyFundMonthsMin}-month minimum in ~12 months`
        : emergencyFundCurrent < emergencyFundTargetMax
          ? `Save ${fmt(Math.ceil((emergencyFundTargetMax - emergencyFundCurrent) / 12))}/mo toward ${emergencyFundMonthsMax}-month target`
          : undefined,
  });

  // 2. Medical insurance
  securityChecklist.push({
    label: "Medical insurance",
    status: !data.hasHealthInsurance ? "critical" : healthInsuranceGap > 0 ? "warning" : "ok",
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

  // 4. Term insurance
  securityChecklist.push({
    label: "Term insurance",
    status: !data.hasTermInsurance
      ? "critical"
      : n(data.termInsuranceSumAssured) >= termAdequacyFloor
        ? "ok"
        : "warning",
    detail: data.hasTermInsurance
      ? `₹${(n(data.termInsuranceSumAssured) / 10000000).toFixed(2)}Cr cover · ~${fmt(n(data.termInsurancePremiumMonthly))}/mo · Reference need: ₹${(termNeeded / 10000000).toFixed(2)}Cr`
      : `Recommended cover about ₹${(termNeeded / 10000000).toFixed(2)}Cr (income ×10 + loans − assets, adjusted for age)`,
    actionNeeded: !data.hasTermInsurance
      ? `Buy ~₹${(termNeeded / 10000000).toFixed(2)}Cr pure term — often ~${fmt(Math.round(termNeeded * 0.000008))}/mo at your age band`
      : n(data.termInsuranceSumAssured) < termAdequacyFloor
        ? `Top up if cover is below ~₹${(termAdequacyFloor / 10000000).toFixed(2)}Cr`
        : undefined,
  });

  // 5. Insurance premium reserve (~12 months in liquid cash — financial freedom habit)
  if (!hasAnyInsuranceProduct) {
    securityChecklist.push({
      label: "Insurance premium reserve (~12 months)",
      status: "na",
      detail: "Once you add health or term (and motor) policies, we’ll size a liquid reserve so renewals don’t stress monthly cash flow.",
    });
  } else if (monthlyPremiumsAll <= 0) {
    securityChecklist.push({
      label: "Insurance premium reserve (~12 months)",
      status: "warning",
      detail: "Policies are on but premium amounts look incomplete — enter premiums to target a 12-month cushion in savings / liquid MF.",
      actionNeeded: "Update premium fields in the analyse flow so we can calculate your reserve target.",
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
    data.kidsAges?.some((age, index) => data.kidsGenders?.[index] === "girl" && age < 10);
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

  // 7. NSC — only if user opted in
  if (data.investsInNsc) {
    securityChecklist.push({
      label: "NSC (National Savings Certificate)",
      status: n(data.nscMonthly) > 0 ? "ok" : "warning",
      detail:
        n(data.nscMonthly) > 0
          ? `${fmt(n(data.nscMonthly))}/mo equivalent · optional 80C / guaranteed slice`
          : "You marked NSC — add your monthly equivalent so we can track it.",
      actionNeeded: n(data.nscMonthly) === 0 ? "Enter monthly NSC equivalent in Assets step." : undefined,
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
      data.cityTier === "metro" ? 10_00_000 : data.cityTier === "tier2" ? 7_00_000 : 5_00_000;
    const hasParentsMedical = n(data.parentsHealthInsuranceSumInsured) > 0;
    const parentsInsuranceCovered = hasParentsMedical ? n(data.parentsHealthInsuranceSumInsured) : 0;
    const parentsLiquidForMedical = n(data.parentsEmergencyCash);
    const parentsMedicalCovered = parentsInsuranceCovered + parentsLiquidForMedical;

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
        actionNeeded: "Keep ₹50,000 specifically for emergency travel to parents location. Add this to bereavement fund.",
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

  const issues = buildIssues({
    totalIncome,
    savingsRate,
    debtRatio,
    untrackedCash,
    emergencyFundGap,
    bucketRows,
    insuranceActual: monthlyInsuranceTotal(data),
  });

  const teaser =
    issues[0]?.message ??
    "Your financial picture is ready. The universal income meter is now showing where your cash flow is going.";

  return {
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
  };
}
