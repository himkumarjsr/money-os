import type { AnalyseFormValues, CityOption, LifeStage } from "@/lib/analyse-form-schema";

/** Full onboarding payload — same shape as the analyse form. */
export type FinancialProfile = AnalyseFormValues;

const METROS: readonly CityOption[] = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Chennai",
  "Hyderabad",
  "Pune",
] as const;

type StageBucket = "bachelor" | "married" | "kids" | "senior";

const LIFE_STAGE_TO_BUCKET: Record<LifeStage, StageBucket> = {
  single_bachelor: "bachelor",
  married_no_kids: "married",
  married_with_kids: "kids",
  pre_retirement_50_plus: "senior",
};

function lifeStageToBucket(stage: LifeStage): StageBucket {
  return LIFE_STAGE_TO_BUCKET[stage];
}

const SAVINGS_TARGET_PCT: Record<StageBucket, number> = {
  bachelor: 30,
  married: 25,
  kids: 20,
  senior: 40,
};

const DEBT_SAFE_LIMIT_PCT: Record<StageBucket, number> = {
  bachelor: 35,
  married: 40,
  kids: 40,
  senior: 30,
};

const EMERGENCY_TARGET_MONTHS: Record<StageBucket, number> = {
  bachelor: 3,
  married: 6,
  kids: 9,
  senior: 12,
};

/** Metro cost-of-living multiplier vs tier-2 benchmark for emergency corpus. */
const METRO_EXPENSE_BENCHMARK_MULTIPLIER = 1.3;

export type IssueSeverity = "critical" | "warning" | "info" | "good";

export type AnalysisIssue = {
  /** Higher sorts first (more urgent). */
  severityScore: number;
  severity: IssueSeverity;
  code: string;
  message: string;
};

export type AnalysisFlag = {
  type: "critical" | "warning" | "good";
  message: string;
};

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
};

export function isMetroCity(city: CityOption): boolean {
  return (METROS as readonly string[]).includes(city);
}

/** Target savings % of income for the user’s life stage (for UI thresholds). */
export function getSavingsTargetPercent(p: FinancialProfile): number {
  return SAVINGS_TARGET_PCT[lifeStageToBucket(p.lifeStage)];
}

/** Safe max housing + EMI % of income for the life stage. */
export function getDebtSafeLimitPercent(p: FinancialProfile): number {
  return DEBT_SAFE_LIMIT_PCT[lifeStageToBucket(p.lifeStage)];
}

function n(v: number | undefined): number {
  return v ?? 0;
}

export function monthlyTotalIncome(p: FinancialProfile): number {
  return n(p.monthlySalary) + n(p.spouseIncome) + n(p.otherIncome);
}

export function monthlyTotalExpenses(p: FinancialProfile): number {
  return (
    n(p.rentOrHomeLoanEmi) +
    n(p.otherLoanEmis) +
    n(p.foodGroceries) +
    n(p.transport) +
    n(p.utilities) +
    n(p.entertainmentDiningShopping) +
    n(p.insurancePremiumsMonthly) +
    n(p.kidsExpenses) +
    n(p.parentsFamilySupport)
  );
}

export function housingAndEmiTotal(p: FinancialProfile): number {
  return n(p.rentOrHomeLoanEmi) + n(p.otherLoanEmis);
}

function buildIssues(params: {
  bucket: StageBucket;
  savingsRate: number;
  savingsTarget: number;
  debtRatio: number;
  debtLimit: number;
  totalIncome: number;
  untrackedCash: number;
  emergencyFundGap: number;
  insuranceGap: boolean;
}): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];

  const {
    bucket,
    savingsRate,
    savingsTarget,
    debtRatio,
    debtLimit,
    totalIncome,
    untrackedCash,
    emergencyFundGap,
    insuranceGap,
  } = params;

  if (totalIncome <= 0) {
    issues.push({
      severityScore: 100,
      severity: "critical",
      code: "income_zero",
      message: "Add income details — savings and debt ratios need a positive total income.",
    });
    return issues;
  }

  if (savingsRate + 1e-6 < savingsTarget) {
    const shortBy = savingsTarget - savingsRate;
    issues.push({
      severityScore: 85,
      severity: "critical",
      code: "savings_below_target",
      message: `Savings rate is ${savingsRate.toFixed(1)}%, below your ${bucket} target of ${savingsTarget}% (short by ~${shortBy.toFixed(1)} pts).`,
    });
  } else {
    issues.push({
      severityScore: 15,
      severity: "good",
      code: "savings_on_track",
      message: `Savings rate ${savingsRate.toFixed(1)}% meets or beats the ${savingsTarget}% target for your life stage.`,
    });
  }

  if (debtRatio > debtLimit + 1e-6) {
    issues.push({
      severityScore: 80,
      severity: "critical",
      code: "debt_ratio_high",
      message: `Rent + EMIs are ${debtRatio.toFixed(1)}% of income — above the safe ${debtLimit}% limit for your profile.`,
    });
  } else if (debtRatio > debtLimit * 0.85) {
    issues.push({
      severityScore: 45,
      severity: "warning",
      code: "debt_ratio_elevated",
      message: `Housing + loan payments are ${debtRatio.toFixed(1)}% of income — comfortable but close to your ${debtLimit}% guardrail.`,
    });
  } else {
    issues.push({
      severityScore: 20,
      severity: "good",
      code: "debt_ratio_ok",
      message: `Rent/EMI load is ${debtRatio.toFixed(1)}% of income — within the ${debtLimit}% safe range.`,
    });
  }

  const untrackedThreshold = 0.1 * totalIncome;
  if (untrackedCash > untrackedThreshold + 1e-6) {
    issues.push({
      severityScore: 70,
      severity: "warning",
      code: "untracked_cash_high",
      message: `About ₹${Math.round(untrackedCash).toLocaleString("en-IN")}/mo isn’t explained by expenses + savings — more than 10% of income. You may be under-tracking spends.`,
    });
  } else if (untrackedCash < -untrackedThreshold) {
    issues.push({
      severityScore: 50,
      severity: "warning",
      code: "budget_overstated",
      message: `Expenses + savings exceed income by ₹${Math.round(-untrackedCash).toLocaleString("en-IN")}/mo — double-check amounts or one-off costs.`,
    });
  }

  if (emergencyFundGap > 0) {
    issues.push({
      severityScore: 75,
      severity: "critical",
      code: "emergency_fund_short",
      message: `Emergency fund is short by ~₹${Math.round(emergencyFundGap).toLocaleString("en-IN")} for your city-adjusted ${EMERGENCY_TARGET_MONTHS[bucket]}-month targets.`,
    });
  } else {
    issues.push({
      severityScore: 25,
      severity: "good",
      code: "emergency_fund_ok",
      message: "Emergency fund meets or exceeds the recommended corpus for your life stage and city.",
    });
  }

  if (insuranceGap) {
    issues.push({
      severityScore: 55,
      severity: "warning",
      code: "insurance_missing",
      message: "No monthly insurance premium recorded — confirm health/life/vehicle cover so a single event doesn’t wipe savings.",
    });
  }

  issues.sort((a, b) => b.severityScore - a.severityScore);
  return issues;
}

function issuesToFlags(issues: AnalysisIssue[]): AnalysisFlag[] {
  const flags: AnalysisFlag[] = [];
  const critical = issues.find((i) => i.severity === "critical");
  const warning = issues.find((i) => i.severity === "warning");
  const good = issues.find((i) => i.severity === "good");
  if (critical) flags.push({ type: "critical", message: critical.message });
  if (warning) flags.push({ type: "warning", message: warning.message });
  if (good) flags.push({ type: "good", message: good.message });
  return flags;
}

function buildPlanSteps(issues: AnalysisIssue[], p: FinancialProfile): string[] {
  const codes = new Set(issues.map((i) => i.code));
  const steps: string[] = [];

  if (codes.has("untracked_cash_high") || codes.has("budget_overstated")) {
    steps.push(
      "For one month, log every rupee in UPI, cards, and cash so income = expenses + savings + known gaps.",
    );
  }

  if (codes.has("savings_below_target")) {
    steps.push(
      "Automate a SIP or transfer on salary day — raise it by 10% until you hit your life-stage savings target.",
    );
  }

  if (codes.has("emergency_fund_short")) {
    steps.push(
      "Park 1–2 months of expenses in a sweep FD or liquid fund before chasing higher returns.",
    );
  }

  if (codes.has("debt_ratio_high") || codes.has("debt_ratio_elevated")) {
    steps.push(
      "List all loans by interest rate; prepay the costliest slice or refinance if your CIBIL supports a lower rate.",
    );
  }

  if (codes.has("insurance_missing")) {
    steps.push(
      "Buy or top up health (₹10–25L floater for family) and pure-term life cover ~10–15× annual income if dependents rely on you.",
    );
  }

  steps.push(
    "Align spending to your primary goal (home / debt-free / retirement) — cut one recurring category for 90 days.",
  );

  steps.push(
    "Set calendar nudges for rent/EMI, insurance, and tax-saving ELSS/PPF so premiums don’t become surprises.",
  );

  steps.push(
    "Book a MoneyOS Advisor session to stress-test this plan against real tax slabs, employer benefits, and goals.",
  );

  while (steps.length < 7) {
    steps.push(
      "Revisit this checklist after every salary increment — bump savings rate before lifestyle creep.",
    );
  }

  return steps.slice(0, 7);
}

export function analyseFinances(data: FinancialProfile): AnalysisResult {
  const bucket = lifeStageToBucket(data.lifeStage);
  const savingsTarget = SAVINGS_TARGET_PCT[bucket];
  const debtLimit = DEBT_SAFE_LIMIT_PCT[bucket];
  const emergencyMonths = EMERGENCY_TARGET_MONTHS[bucket];

  const totalIncome = monthlyTotalIncome(data);
  const totalExpenses = monthlyTotalExpenses(data);
  const savings = n(data.monthlySavingsOrSip);
  const housingEmi = housingAndEmiTotal(data);

  const savingsRate =
    totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  const debtRatio =
    totalIncome > 0 ? (housingEmi / totalIncome) * 100 : 0;

  const untrackedCash = totalIncome - totalExpenses - savings;

  const cityMult = isMetroCity(data.city)
    ? METRO_EXPENSE_BENCHMARK_MULTIPLIER
    : 1;
  const emergencyTarget =
    totalExpenses * emergencyMonths * cityMult;
  const emergencyFundGap = emergencyTarget - n(data.emergencyFundSaved);

  const insuranceGap = n(data.insurancePremiumsMonthly) === 0;

  const issues = buildIssues({
    bucket,
    savingsRate,
    savingsTarget,
    debtRatio,
    debtLimit,
    totalIncome,
    untrackedCash,
    emergencyFundGap,
    insuranceGap,
  });

  const planSteps = buildPlanSteps(issues, data);
  const teaser =
    planSteps[0] ??
    "Start by tracking every rupee for 30 days so income, spends, and savings reconcile.";

  return {
    scores: {
      savingsRate: round2(savingsRate),
      debtRatio: round2(debtRatio),
      untrackedCash: round2(untrackedCash),
      emergencyFundGap: round2(emergencyFundGap),
    },
    flags: issuesToFlags(issues),
    issues,
    teaser,
    planSteps,
  };
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
