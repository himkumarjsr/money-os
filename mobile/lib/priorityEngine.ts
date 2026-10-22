import { calculateOutstanding } from "@/lib/amortisation";
import {
  calculateTermNeeded,
  computeRealEmergencyFund,
  emergencyFundMonthsNeeded,
  emergencyMonthlyBase,
  existingEquityValue,
  healthCoverHeld,
  healthCoverTarget,
  medicalEmergencyTarget,
  ownHealthPolicyTarget,
  termCoverOptional,
  termPremiumMonthlyEstimate,
} from "@/lib/financialEngine";
import {
  buildGoalFundingPlan,
  earmarkExistingSavings,
  type GoalFundingItem,
  type GoalFundingPlan,
} from "@/lib/goalFunding";
import {
  buildUrgentGoalItems,
  goalReach,
  type GoalReach,
} from "@/lib/goalReach";
import type { PortfolioAllocation } from "@/lib/portfolioAllocation";
import { sipStepUp } from "@/lib/goalMath";
import {
  getUniversalBucketActuals,
  licEndowmentPremiumMonthly,
  parentsPremiumMonthly,
  travelMonthly,
} from "@/lib/universal-buckets";

export interface PriorityItem {
  rank: number;
  id: string;
  title: string;
  category: string;
  urgency: "critical" | "high" | "medium";
  status: "missing" | "partial" | "complete";
  currentAmount: number;
  targetAmount: number;
  gap: number;
  monthlyRequired: number;
  monthlyContribution: number;
  surplusBefore: number;
  surplusAfterThis: number;
  monthsToComplete: number;
  instrument: string;
  actionThisWeek: string;
  whyThisMatters: string;
  icon: string;
  canBuyFromFinkoin: boolean;
  finkoinProductType?: string;
  startMonth?: number;
  /** Paid in one go from existing savings, on top of any monthly amount. */
  fromSavings?: number;
  /** Waiting on a yes/no from the user (term top-up); costs nothing until then. */
  needsAnswer?: boolean;
  /** What the step would cost per month if the user says yes. */
  quoteMonthly?: number;
  /** Goals only: what the SIP reaches by the goal's own year. */
  reach?: GoalReach;
}

export interface DebtItem {
  type: string;
  lenderName?: string;
  displayName?: string;
  outstanding: number;
  emi: number;
  rate: number;
  priorityRank: number;
  extraEMIRecommended: number;
  monthsToClearWithExtra: number;
  icon: string;
  /** Outstanding was guessed from the EMI - the user never entered it. */
  outstandingEstimated?: boolean;
  /** Rate was not entered: a typical rate for the loan type, or 0 when unknown. */
  rateEstimated?: boolean;
}

export interface GoalItem {
  goalType: string;
  targetAmount: number;
  currentSaved: number;
  monthlyRequired: number;
  yearsToGoal: number;
  instrument: string;
  readyToStart: boolean;
  blockedBy: string | null;
  icon: string;
  /** Set for goals funded by the weighted-parallel split (see goalFunding). */
  goalId?: string;
  label?: string;
  monthlyAllocated?: number;
  sharePct?: number;
  allocation?: PortfolioAllocation;
  /** Running SIPs / RD already counted toward this goal (₹/month). */
  existingMonthly?: number;
  /** Yearly SIP increase the amounts assume (decimal, 0 = flat SIP). */
  stepUp?: number;
}

export interface PriorityPlan {
  priorities: PriorityItem[];
  debts: DebtItem[];
  goals: GoalItem[];
  monthlyIncome: number;
  monthlySurplus: number;
  surplusBreakdown: {
    totalIncome: number;
    needsActual: number;
    loansActual: number;
    wantsActual: number;
    investmentActual: number;
    existingInsurancePremiums: number;
    netSurplus: number;
    afterAllPriorities: number;
  };
  allocationPlan: {
    category: string;
    amount: number;
    percent: number;
    where: string;
  }[];
  scoreToday: number;
  scoreAfter12Months: number;
  topAction: string;
  fdSuggestion?: {
    message: string;
    cta: string;
    bank: string;
    bestRate: number;
    currentRate: number;
    extraAnnual: number;
  };
  monthlyPlan?: Array<{
    month: number;
    emergency: number;
    medical: number;
    termYearly: number;
    sip: number;
    extraDebt: number;
    remaining: number;
    note: string;
  }>;
  /** Every active goal funded in parallel once safety steps are covered. */
  goalFunding?: GoalFundingPlan;
}

function normalizeStage(
  lifeStage: string,
): "bachelor" | "married" | "kids" | "senior" {
  if (lifeStage === "single") return "bachelor";
  if (lifeStage === "bachelor") return "bachelor";
  if (lifeStage === "married") return "married";
  if (lifeStage === "kids") return "kids";
  if (lifeStage === "senior") return "senior";
  return "bachelor";
}

const GOAL_ICONS: Record<string, string> = {
  kid_education: "🎓",
  kid_marriage: "💍",
  home_purchase: "🏠",
  vehicle_purchase: "🚗",
  parents_eldercare: "👵",
  retirement: "🔥",
  marriage: "💍",
  baby: "👶",
};

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const rupeesFmt = rupees;

function goalFundingAction(
  item: GoalFundingItem,
  startMonth: number,
  stepUp: number,
): string {
  const what = `${rupees(item.monthlyAllocated)}/month into ${item.instrument} for ${item.label.toLowerCase()} (${item.sharePct}% of your goal budget)`;
  const raise =
    stepUp > 0
      ? ` Raise it ${Math.round(stepUp * 100)}% every year with your salary hike - the plan counts on it.`
      : "";
  return startMonth > 1
    ? `From month ${startMonth}, put ${what}.${raise}`
    : `Put ${what}.${raise}`;
}

function goalFundingWhy(item: GoalFundingItem): string {
  const base =
    item.yearsToGoal <= 3
      ? `Hard deadline in ${item.yearsToGoal} ${item.yearsToGoal === 1 ? "year" : "years"} - it can't benefit from waiting, so it gets a bigger share.`
      : `${item.yearsToGoal} years away - funded now, not deferred, because every year skipped is compounding lost.`;
  return item.fundedPct < 100
    ? `${base} This covers ${item.fundedPct}% of the ${rupees(item.monthlyRequired)}/month needed to hit ${rupees(item.targetAmount)} by ${item.targetYear}.`
    : `${base} Fully funded to reach ${rupees(item.targetAmount)} by ${item.targetYear}.`;
}

const MAX_PAYOFF_MONTHS = 600;
/** Sukanya Samriddhi deposit limits: ₹250 to ₹1.5L a year. */
const SSY_MAX_MONTHLY = 12_500;
const SSY_MIN_MONTHLY = 500;

/** Month-by-month amortisation; null when the payment never clears the balance within 50 years. */
export function simulateLoanPayoff(
  outstanding: number,
  annualRatePercent: number,
  monthlyPayment: number,
): { months: number; totalInterest: number } | null {
  if (!(outstanding > 0)) return { months: 0, totalInterest: 0 };
  if (!(monthlyPayment > 0)) return null;
  const r = Math.max(0, annualRatePercent) / 100 / 12;
  let balance = outstanding;
  let totalInterest = 0;
  let months = 0;
  while (balance > 0.5) {
    if (months >= MAX_PAYOFF_MONTHS) return null;
    const interest = balance * r;
    if (monthlyPayment <= interest) return null;
    totalInterest += interest;
    balance = balance + interest - monthlyPayment;
    months += 1;
  }
  return { months, totalInterest };
}

export type DebtPayoffNumbers = {
  extraPayment: number;
  outstanding: number;
  currentEMI: number;
  /** Months to clear with the extra payment applied. */
  monthsNow: number;
  monthsSaved: number;
  /** Interest at current EMI minus interest with the extra payment; 0 when not computable. */
  interestSaved: number;
  /** EMI barely covers the interest, so the entry is probably wrong. */
  emiTooLow: boolean;
};

/** Payoff figures for a debt card / PDF row (accepts engine and AI debt shapes). */
export function debtPayoffNumbers(debt: any): DebtPayoffNumbers {
  const extraPayment = Math.max(0, Number(debt?.extraEMIRecommended || 0));
  const rate = Number(debt?.rate || debt?.interestRate || 12);
  const outstanding = Number(debt?.outstanding || debt?.balance || 0);
  const currentEMI = Number(debt?.emi || debt?.monthlyEMI || 0);
  const fallbackMonths = Math.max(0, Number(debt?.monthsToClearWithExtra || 0));

  const base = simulateLoanPayoff(outstanding, rate, currentEMI);
  const withExtra =
    extraPayment > 0
      ? simulateLoanPayoff(outstanding, rate, currentEMI + extraPayment)
      : base;

  const monthsNow =
    withExtra && outstanding > 0 ? withExtra.months : fallbackMonths;
  const monthsSaved =
    base && withExtra ? Math.max(0, base.months - withExtra.months) : 0;
  const interestSaved =
    extraPayment > 0 && base && withExtra
      ? Math.max(0, Math.round(base.totalInterest - withExtra.totalInterest))
      : 0;

  const monthlyInterest = (outstanding * rate) / 1200;
  const emiTooLow =
    outstanding > 0 && currentEMI > 0 && currentEMI < monthlyInterest * 1.5;

  return {
    extraPayment,
    outstanding,
    currentEMI,
    monthsNow,
    monthsSaved,
    interestSaved,
    emiTooLow,
  };
}

export function buildPriorityPlan(profile: any, analysis: any): PriorityPlan {
  const monthlyIncome =
    (profile.monthlySalary || 0) +
    (profile.lifeStage !== "bachelor" ? profile.spouseIncome || 0 : 0) +
    (profile.otherIncome || 0);
  const lifestyleActual =
    (profile.lifestyleTotal || 0) > 0
      ? profile.lifestyleTotal || 0
      : (profile.entertainment || 0) +
        (profile.shopping || 0) +
        (profile.personalCare || 0);

  // Same Needs figure as the report's buckets, so every screen agrees.
  const needsActual = getUniversalBucketActuals(profile).needs;
  const dedupedAdditionalRows = Array.from(
    new Map(
      (profile.additionalObligations || [])
        .filter((row: any) => Number(row?.monthlyAmount || 0) > 0)
        .map((row: any) => {
          const key = [
            String(row?.type || "other")
              .toLowerCase()
              .trim(),
            String(row?.lenderName || "")
              .toLowerCase()
              .trim(),
            Math.round(Number(row?.monthlyAmount || 0)),
          ].join("|");
          return [key, row] as const;
        }),
    ).values(),
  );
  const additionalLoanObligations = dedupedAdditionalRows.reduce(
    (sum: number, row: any) => sum + (row?.monthlyAmount || 0),
    0,
  );
  const loansActual =
    (profile.homeLoanEMI || 0) +
    (profile.secondPropertyEMI || 0) +
    (profile.carLoanEMI || 0) +
    (profile.bikeEMI || 0) +
    (profile.personalLoanEMI || 0) +
    (profile.creditCardBillMonthly || 0) +
    (profile.creditCardEmiMonthly || 0) +
    additionalLoanObligations;
  const wantsActual = lifestyleActual + travelMonthly(profile);
  const investmentActual =
    (profile.monthlySIP || 0) +
    (profile.monthlyRD || 0) +
    (profile.monthlyPPFContribution || 0) +
    (profile.monthlyNPSContribution || 0) +
    (profile.monthlyEPFContribution || 0) +
    (profile.ssy || 0) +
    licEndowmentPremiumMonthly(profile) +
    (profile.customInvestments || []).reduce(
      (sum: number, row: any) => sum + (row?.monthlyContribution || 0),
      0,
    );
  const existingInsurancePremiums =
    (profile.healthInsurancePremiumMonthly || 0) +
    (profile.termInsurancePremiumMonthly || 0) +
    (profile.carInsurancePremiumMonthly || 0) +
    (profile.bikeInsurancePremiumMonthly || 0) +
    (profile.otherInsurancePremiums || []).reduce((sum: number, p: any) => {
      if (p?.countAsInvestment) return sum; // counted as investment above
      const amount = p?.premiumAmount || p?.premiumInput || 0;
      const monthly = p?.frequency === "yearly" ? amount / 12 : amount;
      return sum + monthly;
    }, 0) +
    parentsPremiumMonthly(profile);
  const monthlySurplus = Math.max(
    0,
    monthlyIncome -
      needsActual -
      loansActual -
      wantsActual -
      Math.max(0, investmentActual - (profile.monthlyEPFContribution || 0)) -
      existingInsurancePremiums,
  );
  let runningSurplus = monthlySurplus;
  // Yearly SIP increase every goal amount assumes (0 = a flat SIP).
  const stepUp = sipStepUp(profile);

  const age = profile.selfAge || 30;
  const stage = normalizeStage(profile.lifeStage || "bachelor");
  const city = profile.city || profile.cityTier || "metro";
  const kids = Array.isArray(profile.kidsAges)
    ? profile.kidsAges
    : profile.kids || [];

  const priorities: PriorityItem[] = [];
  let rank = 1;

  const emergencyMonthsNeeded = emergencyFundMonthsNeeded({
    lifeStage: stage,
    parentsSupport: profile.parentsSupport,
    selfAge: age,
    kidsAges: kids,
  });

  // Months of everything that must still be paid if income stops: needs,
  // every EMI and insurance premiums (same base as the report).
  const emergencyBaseMonthly = emergencyMonthlyBase(profile);
  const emergencyTarget = emergencyBaseMonthly * emergencyMonthsNeeded;
  const emergencyFund = computeRealEmergencyFund(profile);
  const emergencyCurrent = emergencyFund.realTotal;
  const emergencyMonthsCovered = emergencyFund.monthsCovered;
  const emergencyGap = Math.max(0, emergencyTarget - emergencyCurrent);
  // Like an adviser would: fill the gap today from money already invested
  // before asking months of surplus for it. FDs count at 70% while locked;
  // moved to a sweep-in FD / liquid fund they count in full. Then funds /
  // stocks, then gold. Land, PF / PPF and NSC can't be drawn on.
  const fdHeld = profile.fdValue || 0;
  let equityPool = existingEquityValue(profile);
  let goldPool = profile.goldValue || 0;
  let emergencyGapLeft = emergencyGap;
  const emergencyFdToLiquid =
    emergencyGapLeft > 0
      ? Math.round(Math.min(fdHeld, emergencyGapLeft / 0.3))
      : 0;
  emergencyGapLeft = Math.max(0, emergencyGapLeft - emergencyFdToLiquid * 0.3);
  const emergencyFromEquity = Math.round(
    Math.min(emergencyGapLeft, equityPool),
  );
  equityPool -= emergencyFromEquity;
  emergencyGapLeft = Math.max(0, emergencyGapLeft - emergencyFromEquity);
  const emergencyFromGold = Math.round(Math.min(emergencyGapLeft, goldPool));
  goldPool -= emergencyFromGold;
  emergencyGapLeft = Math.max(0, emergencyGapLeft - emergencyFromGold);
  const emergencyFromSavings =
    emergencyFdToLiquid + emergencyFromEquity + emergencyFromGold;
  const hardPriorityMode = emergencyGapLeft > 0;
  const emergencySuggested =
    emergencyGapLeft > 0
      ? Math.round(Math.min(monthlySurplus, emergencyGapLeft))
      : 0;
  const emergencyMonthly = Math.max(
    0,
    Math.min(emergencySuggested, runningSurplus),
  );
  const emergencySurplusBefore = runningSurplus;
  runningSurplus = Math.max(0, runningSurplus - emergencyMonthly);
  const emergencyMonthsToComplete =
    emergencyGapLeft > 0 && emergencyMonthly > 0
      ? Math.ceil(emergencyGapLeft / emergencyMonthly)
      : 0;
  const emergencyMoves = [
    emergencyFdToLiquid > 0
      ? `move ${rupeesFmt(emergencyFdToLiquid)} of your FDs into a sweep-in FD or liquid fund`
      : "",
    emergencyFromEquity > 0
      ? `redeem ${rupeesFmt(emergencyFromEquity)} from your mutual funds / stocks into a liquid fund (sell units held over a year first to keep tax low)`
      : "",
    emergencyFromGold > 0
      ? `sell ${rupeesFmt(emergencyFromGold)} of gold into a liquid fund`
      : "",
  ].filter(Boolean);

  priorities.push({
    rank: rank++,
    id: "emergency_fund",
    title: "Emergency fund",
    category: "safety",
    urgency:
      emergencyMonthsCovered < 2
        ? "critical"
        : emergencyMonthsCovered < 4
          ? "high"
          : "medium",
    status:
      emergencyMonthsCovered >= emergencyMonthsNeeded
        ? "complete"
        : emergencyMonthsCovered >= emergencyMonthsNeeded * 0.5
          ? "partial"
          : "missing",
    currentAmount: Math.round(emergencyCurrent),
    targetAmount: Math.round(emergencyTarget),
    gap: Math.round(emergencyGap),
    monthlyRequired: emergencyMonthly,
    monthlyContribution: emergencyMonthly,
    surplusBefore: emergencySurplusBefore,
    surplusAfterThis: runningSurplus,
    monthsToComplete: emergencyMonthsToComplete,
    instrument: "Liquid Mutual Fund + Savings account",
    actionThisWeek:
      emergencyMoves.length > 0
        ? `Use what you already have: ${emergencyMoves.join(", and ")}. Keep it only for emergencies.${
            emergencyMonthly > 0
              ? ` Then save ${rupeesFmt(emergencyMonthly)}/month for the rest.`
              : ""
          }`
        : emergencyGap > 0
          ? `Start ${rupeesFmt(emergencyMonthly)}/month into a liquid fund and keep it only for emergencies.`
          : "Emergency fund complete. Well done.",
    whyThisMatters: `If your income stops tomorrow you need ${emergencyMonthsNeeded} months to recover.`,
    icon: "🛡️",
    canBuyFromFinkoin: false,
    startMonth: 1,
    ...(emergencyFromSavings > 0 ? { fromSavings: emergencyFromSavings } : {}),
  });

  // Fixed-date goals that are close (a wedding next year) can't wait for the
  // rest of the plan: they come straight after the emergency fund.
  const urgentStartMonth =
    hardPriorityMode && emergencyMonthsToComplete > 0
      ? emergencyMonthsToComplete + 1
      : 1;
  // FDs the emergency fund still leans on stay out of goal earmarking.
  const fdNeededForEmergency = Math.min(
    profile.fdValue || 0,
    Math.max(
      0,
      emergencyTarget - (emergencyCurrent - emergencyFund.fdCounted),
    ) / 0.7,
  );
  // Medical fund needs are worked out here so existing savings go to the
  // safety funds before goals; its step is listed after urgent goals.
  const medicalTarget = medicalEmergencyTarget(profile);
  const enteredMedical = Number(profile.medicalEmergencyFund ?? 0) || 0;
  let medicalCurrent = enteredMedical;
  if (medicalCurrent <= 0) {
    // Only estimate from liquid assets when the user did not enter a dedicated medical pot.
    medicalCurrent = Math.min(
      (profile.liquidMFValue || 0) * 0.5,
      medicalTarget,
    );
  }
  const medicalGap = Math.max(0, medicalTarget - medicalCurrent);
  // Cash already in savings / liquid funds beyond the emergency fund isn't
  // set aside for anything yet, so it can fill the medical fund today
  // instead of months of top-ups. (Liquid funds already estimated as the
  // medical pot above aren't counted twice.)
  const spareCash = Math.max(
    0,
    Math.min(
      (profile.savingsAccountBalance || 0) + (profile.liquidMFValue || 0),
      emergencyCurrent - emergencyTarget,
    ) - (enteredMedical > 0 ? 0 : medicalCurrent),
  );
  const medicalFromCash = Math.round(Math.min(spareCash, medicalGap));
  let medicalGapLeft = Math.max(0, medicalGap - medicalFromCash);
  // Then FDs the emergency fund doesn't need, funds / stocks, and gold.
  const medicalFromFd = Math.round(
    Math.min(medicalGapLeft, Math.max(0, fdHeld - fdNeededForEmergency)),
  );
  medicalGapLeft = Math.max(0, medicalGapLeft - medicalFromFd);
  const medicalFromEquity = Math.round(Math.min(medicalGapLeft, equityPool));
  equityPool -= medicalFromEquity;
  medicalGapLeft = Math.max(0, medicalGapLeft - medicalFromEquity);
  const medicalFromGold = Math.round(Math.min(medicalGapLeft, goldPool));
  goldPool -= medicalFromGold;
  medicalGapLeft = Math.max(0, medicalGapLeft - medicalFromGold);
  const medicalFromSavings =
    medicalFromCash + medicalFromFd + medicalFromEquity + medicalFromGold;
  const safetyReserve = {
    fdNeededForEmergency: fdNeededForEmergency + medicalFromFd,
    equityUsedForSafety: emergencyFromEquity + medicalFromEquity,
    goldUsedForSafety: emergencyFromGold + medicalFromGold,
  };
  const urgentGoals = buildUrgentGoalItems(
    profile,
    hardPriorityMode ? monthlySurplus : runningSurplus,
    urgentStartMonth,
    new Date(),
    safetyReserve,
  );
  const urgentMonthly = urgentGoals.reduce((s, g) => s + g.monthlyAllocated, 0);
  for (const item of urgentGoals) {
    const before = runningSurplus;
    runningSurplus = Math.max(0, runningSurplus - item.monthlyAllocated);
    priorities.push({
      rank: rank++,
      id: `goal_${item.goalId.replace(":", "_")}`,
      title: item.label,
      category: "goal",
      urgency: "high",
      status: item.fundedPct >= 100 ? "partial" : "missing",
      currentAmount: 0,
      targetAmount: item.targetAmount,
      gap: item.targetAmount,
      monthlyRequired: item.monthlyRequired,
      monthlyContribution: item.monthlyAllocated,
      surplusBefore: before,
      surplusAfterThis: runningSurplus,
      monthsToComplete: item.yearsToGoal * 12,
      instrument: item.instrument,
      actionThisWeek:
        urgentStartMonth > 1
          ? `From month ${urgentStartMonth}, put ${rupeesFmt(item.monthlyAllocated)}/month into ${item.instrument} for ${item.label.toLowerCase()}.`
          : `Put ${rupeesFmt(item.monthlyAllocated)}/month into ${item.instrument} for ${item.label.toLowerCase()}.`,
      whyThisMatters: `${item.label} is on a date you can't move (${item.targetYear}), so it is funded right after your emergency fund - before other goals and wealth SIPs.`,
      icon: GOAL_ICONS[item.type] ?? "🎯",
      canBuyFromFinkoin: false,
      startMonth: urgentStartMonth,
      reach: goalReach(item, { profile, startMonth: urgentStartMonth }),
    });
  }

  const medicalStartMonth =
    hardPriorityMode && emergencyMonthsToComplete > 0
      ? emergencyMonthsToComplete + 1
      : 1;
  const medicalSuggested =
    medicalGapLeft > 0
      ? Math.round(
          Math.min(
            Math.max(0, monthlySurplus - emergencyMonthly - urgentMonthly),
            Math.ceil(medicalGapLeft / 6),
          ),
        )
      : 0;
  const medicalMonthly = Math.max(
    0,
    Math.min(medicalSuggested, runningSurplus),
  );
  const medicalSurplusBefore = runningSurplus;
  runningSurplus = Math.max(0, runningSurplus - medicalMonthly);
  const medicalMonthsToComplete =
    medicalGapLeft > 0 && medicalMonthly > 0
      ? Math.ceil(medicalGapLeft / medicalMonthly)
      : 0;
  priorities.push({
    rank: rank++,
    id: "medical_fund",
    title: "Medical emergency fund",
    category: "safety",
    urgency:
      medicalGap <= 0 ? "medium" : medicalCurrent === 0 ? "critical" : "high",
    status:
      medicalCurrent >= medicalTarget
        ? "complete"
        : medicalCurrent > 0
          ? "partial"
          : "missing",
    currentAmount: Math.round(medicalCurrent),
    targetAmount: medicalTarget,
    gap: Math.round(medicalGap),
    monthlyRequired: medicalMonthly,
    monthlyContribution: medicalMonthly,
    surplusBefore: medicalSurplusBefore,
    surplusAfterThis: runningSurplus,
    monthsToComplete: medicalMonthsToComplete,
    instrument: "Liquid Mutual Fund",
    actionThisWeek:
      medicalFromSavings > 0
        ? `Move ${[
            medicalFromCash > 0
              ? `${rupeesFmt(medicalFromCash)} of your spare savings`
              : "",
            medicalFromFd > 0
              ? `${rupeesFmt(medicalFromFd)} of FDs your emergency fund doesn't need`
              : "",
            medicalFromEquity > 0
              ? `${rupeesFmt(medicalFromEquity)} from mutual funds / stocks`
              : "",
            medicalFromGold > 0 ? `${rupeesFmt(medicalFromGold)} of gold` : "",
          ]
            .filter(Boolean)
            .join(
              ", ",
            )} into a separate liquid fund today and keep it only for medical bills.${
            medicalMonthly > 0
              ? ` Then invest ₹${Math.round(medicalMonthly).toLocaleString("en-IN")}/month for the rest.`
              : ""
          }`
        : medicalGap > 0
          ? medicalStartMonth > 1
            ? `From month ${medicalStartMonth}, invest ₹${Math.round(medicalMonthly).toLocaleString("en-IN")}/month for medical fund.`
            : `Invest ₹${Math.round(medicalMonthly).toLocaleString("en-IN")}/month.`
          : "Medical fund ready.",
    whyThisMatters:
      "Insurance has waiting periods; you need cash for immediate hospitalization.",
    icon: "🏥",
    canBuyFromFinkoin: false,
    startMonth: medicalStartMonth,
    ...(medicalFromSavings > 0 ? { fromSavings: medicalFromSavings } : {}),
  });

  const termNeeded = calculateTermNeeded(profile);
  const termHave =
    profile.termInsuranceSumAssured || profile.termInsuranceCover || 0;
  const termGap = Math.max(0, termNeeded - termHave);
  const termPremiumEstRaw = termPremiumMonthlyEstimate(termGap, age);
  const termStartMonth =
    medicalGapLeft > 0 && medicalMonthsToComplete > 0
      ? medicalStartMonth + medicalMonthsToComplete
      : medicalStartMonth;
  // A solid base (₹1Cr+, or half of today's need) is enough: we don't push a
  // top-up every time income grows. It only comes back if the user asked.
  const termSolidBase =
    termHave >= 10_000_000 || termHave >= Math.max(5_000_000, termNeeded * 0.5);
  const termSkip =
    (termHave > 0 && termSolidBase && profile.wantsTermTopUp !== true) ||
    (termHave <= 0 && termCoverOptional(profile));
  // Below that base, someone who already has cover may not want (or be able)
  // to top it up: it is only budgeted once they say yes, and dropped on no.
  const termTopUpAsk = termHave > 0 && termGap > 0 && !termSolidBase;
  const termIncluded = !termTopUpAsk || profile.wantsTermTopUp === true;
  const termPremiumQuote = Math.max(
    0,
    Math.min(termPremiumEstRaw, monthlySurplus),
  );
  const termPremiumEst = termIncluded ? termPremiumQuote : 0;
  const termYearlyPremium =
    termGap > 0 && termIncluded && !termSkip
      ? Math.max(termPremiumEstRaw * 12, 12000)
      : 0;

  if (
    termGap > 0 &&
    !termSkip &&
    !(termTopUpAsk && profile.wantsTermTopUp === false)
  ) {
    const termGapCr = (termGap / 10000000).toFixed(1);
    const termHaveCr = (termHave / 10000000).toFixed(1);
    priorities.push({
      rank: rank++,
      id: "term_insurance",
      title:
        termHave === 0
          ? "Close term cover gap"
          : termIncluded
            ? "Term top-up (keep existing policy)"
            : "Term top-up (your choice)",
      category: "insurance",
      urgency: termHave === 0 ? "critical" : "high",
      status:
        termHave === 0
          ? "missing"
          : termHave >= termNeeded
            ? "complete"
            : "partial",
      currentAmount: termHave,
      targetAmount: termNeeded,
      gap: termGap,
      monthlyRequired: termPremiumEst,
      monthlyContribution: termPremiumEst,
      surplusBefore: runningSurplus,
      surplusAfterThis: Math.max(0, runningSurplus - termPremiumEst),
      monthsToComplete: 1,
      instrument:
        termHave === 0
          ? "Pure term plan from an insurer with a strong claim-settlement record - no ULIP or endowment"
          : "Separate top-up / additional term from another insurer - do not cancel your ₹" +
            termHaveCr +
            "Cr policy",
      actionThisWeek: !termIncluded
        ? `You have ₹${termHaveCr}Cr cover. A ₹${termGapCr} crore top-up would cost about ₹${termPremiumQuote.toLocaleString("en-IN")}/month. Tell us if you want it; it's only added to your plan if you say yes.`
        : termHave === 0
          ? termStartMonth > 1
            ? `From month ${termStartMonth}, compare pure term quotes. Budget ~₹${termPremiumEst.toLocaleString("en-IN")}/month for ₹${termGapCr} crore cover.`
            : `Compare 3 term insurance quotes online. Budget ~₹${termPremiumEst.toLocaleString("en-IN")}/month for ₹${termGapCr} crore cover.`
          : termStartMonth > 1
            ? `From month ${termStartMonth}, add a top-up for ~₹${termGapCr} crore only (you already have ₹${termHaveCr}Cr). Keep the old policy - income proof limits often block a second full policy at today's salary.`
            : `Add a top-up for ~₹${termGapCr} crore only (existing ₹${termHaveCr}Cr stays). Do not cancel - buy additional cover from another insurer if needed.`,
      whyThisMatters:
        termHave === 0
          ? "Your family has zero income if you pass away. All EMIs continue with no salary."
          : `Income has likely grown since you bought ₹${termHaveCr}Cr cover. We only flag the ₹${termGapCr} crore gap - top-up, not a second full policy or cancel-and-rebuy.`,
      icon: "🛡️",
      canBuyFromFinkoin: false,
      finkoinProductType: "term",
      startMonth: termStartMonth,
      ...(termIncluded
        ? {}
        : { needsAnswer: true, quoteMonthly: termPremiumQuote }),
    });
    runningSurplus = Math.max(0, runningSurplus - termPremiumEst);
  }

  const healthNeeded = healthCoverTarget(profile);
  const healthHeld = healthCoverHeld(profile);
  const healthHave = healthHeld.total || profile.healthInsuranceCover || 0;
  // Company cover ends with the job, so an own base policy is still needed.
  const healthOwnNeeded = healthHeld.employerOnly
    ? ownHealthPolicyTarget(profile)
    : 0;
  const healthGap = Math.max(0, healthNeeded - healthHave, healthOwnNeeded);
  const healthPremiumEstRaw =
    (profile.numberOfKids || 0) > 0 ? 2000 : stage !== "bachelor" ? 1500 : 1000;
  const healthPremiumEst = Math.max(
    0,
    Math.min(healthPremiumEstRaw, runningSurplus),
  );

  if (healthGap > 0) {
    priorities.push({
      rank: rank++,
      id: "health_insurance",
      title:
        healthHave === 0
          ? "Close health cover gap"
          : healthHeld.employerOnly
            ? "Buy your own health policy"
            : "Increase health cover",
      category: "insurance",
      urgency: healthHave === 0 ? "critical" : "high",
      status: healthHave === 0 ? "missing" : "partial",
      currentAmount: healthHave,
      targetAmount: healthNeeded,
      gap: healthGap,
      monthlyRequired: healthPremiumEst,
      monthlyContribution: healthPremiumEst,
      surplusBefore: runningSurplus,
      surplusAfterThis: Math.max(0, runningSurplus - healthPremiumEst),
      monthsToComplete: 1,
      instrument: healthHeld.employerOnly
        ? "Own family floater base policy - keep the company cover on top of it"
        : healthHave > 0
          ? "Super top-up over your existing policy - far cheaper than a bigger base plan"
          : "Family floater health policy - compare room-rent limits, co-pay and waiting periods across 2–3 insurers",
      actionThisWeek: healthHeld.employerOnly
        ? `Buy your own ₹${(healthOwnNeeded / 100000).toFixed(0)} lakh health policy. Your company cover stops when you change jobs or retire, and a new policy's waiting periods (2-4 years for existing illnesses) start only when you buy it.`
        : healthHave > 0
          ? `Add a ₹${(healthGap / 100000).toFixed(0)} lakh super top-up to reach ₹${(healthNeeded / 100000).toFixed(0)} lakh cover. Compare quotes on IRDAI-registered insurer or aggregator sites.`
          : `Get ₹${(healthNeeded / 100000).toFixed(0)} lakh health cover. Compare quotes on IRDAI-registered insurer or aggregator sites, or through a licensed advisor.`,
      whyThisMatters: healthHeld.employerOnly
        ? "Company cover is tied to the job. Buying your own policy while healthy keeps you covered between jobs and after retirement."
        : "One hospitalisation in metro costs ₹2-5 lakh. Without cover your savings get wiped.",
      icon: "🏥",
      canBuyFromFinkoin: false,
      finkoinProductType: "health",
    });
    runningSurplus = Math.max(0, runningSurplus - healthPremiumEst);
  }

  const primaryGoal = String(profile.primaryGoal || "grow_wealth");
  const wealthDeploy = (() => {
    switch (primaryGoal) {
      case "clear_debt":
        return {
          id: "accelerate_debt",
          title: "Accelerate debt paydown",
          instrument: "Extra EMI toward highest-rate loans first",
          why: "Your chosen goal is clearing debt - surplus after safety should cut interest cost before new investing.",
          icon: "💳",
          noteSafe: (m: number) =>
            `Safety complete. Route surplus to extra EMI / debt prepay from month ${m}.`,
          action: (amt: number, start: number) =>
            start > 1
              ? `From month ${start}, put ₹${Math.round(amt).toLocaleString("en-IN")}/month as extra EMI on your highest-rate loan.`
              : `Put ₹${Math.round(amt).toLocaleString("en-IN")}/month as extra EMI on your highest-rate loan.`,
        };
      case "buy_home":
        return {
          id: "home_downpayment",
          title: "Home down-payment corpus",
          instrument: "Debt funds / RD for <5y horizon; Nifty 50 SIP if 5y+",
          why: "Your goal is buying a home - after safety layers and other obligations, route whatever surplus remains to the down-payment corpus.",
          icon: "🏠",
          noteSafe: (m: number) =>
            `Safety complete. Fund home down-payment SIP from month ${m} (last in surplus waterfall).`,
          action: (amt: number, start: number) =>
            start > 1
              ? `From month ${start}, invest ₹${Math.round(amt).toLocaleString("en-IN")}/month toward your home down payment.`
              : `Invest ₹${Math.round(amt).toLocaleString("en-IN")}/month toward your home down payment.`,
        };
      case "buy_car":
        return {
          id: "car_purchase_fund",
          title: "Car purchase fund",
          instrument: "Post Office RD or liquid / short-duration debt fund",
          why: "Your goal is buying a car - keep this surplus in low-volatility instruments for the purchase horizon.",
          icon: "🚗",
          noteSafe: (m: number) =>
            `Safety complete. Build car purchase fund from month ${m}.`,
          action: (amt: number, start: number) =>
            start > 1
              ? `From month ${start}, save ₹${Math.round(amt).toLocaleString("en-IN")}/month for the car fund.`
              : `Save ₹${Math.round(amt).toLocaleString("en-IN")}/month for the car fund.`,
        };
      case "kids_education":
        return {
          id: "kids_education_sip",
          title: "Kids education fund",
          instrument: "Child education SIP / SSY (if eligible) + equity SIP",
          why: "Your goal is kids' education - surplus should go to a dedicated education corpus.",
          icon: "🎓",
          noteSafe: (m: number) =>
            `Safety complete. Education SIP from month ${m}.`,
          action: (amt: number, start: number) =>
            start > 1
              ? `From month ${start}, invest ₹${Math.round(amt).toLocaleString("en-IN")}/month into the education fund.`
              : `Invest ₹${Math.round(amt).toLocaleString("en-IN")}/month into the education fund.`,
        };
      case "build_emergency_fund":
        return {
          id: "boost_emergency",
          title: "Strengthen emergency fund",
          instrument: "Liquid mutual fund + savings buffer",
          why: "Your goal is building the emergency fund - keep surplus liquid until the target months of cover are solid.",
          icon: "🛡️",
          noteSafe: (m: number) =>
            `Safety complete. Keep boosting liquid emergency reserves from month ${m}.`,
          action: (amt: number, start: number) =>
            start > 1
              ? `From month ${start}, add ₹${Math.round(amt).toLocaleString("en-IN")}/month to liquid emergency reserves.`
              : `Add ₹${Math.round(amt).toLocaleString("en-IN")}/month to liquid emergency reserves.`,
        };
      case "build_insurance_premium_fund":
        return {
          id: "premium_reserve",
          title: "Insurance premium reserve",
          instrument: "KVP ladder + post office RD / liquid MF",
          why: "Your goal is an insurance premium reserve so renewals never stress monthly cash flow.",
          icon: "📋",
          noteSafe: (m: number) =>
            `Safety complete. Fund premium reserve from month ${m}.`,
          action: (amt: number, start: number) =>
            start > 1
              ? `From month ${start}, set aside ₹${Math.round(amt).toLocaleString("en-IN")}/month for the premium reserve.`
              : `Set aside ₹${Math.round(amt).toLocaleString("en-IN")}/month for the premium reserve.`,
        };
      case "retire_early":
        return {
          id: "start_sip",
          title: "Early-retirement SIP",
          instrument: "Nifty 50 / flexi-cap SIP + NPS",
          why: "Your goal is retiring early - surplus after safety should compound aggressively toward FIRE.",
          icon: "🔥",
          noteSafe: (m: number) =>
            `Safety complete. Early-retirement SIP from month ${m}; route leftover to debt prepay if any.`,
          action: (amt: number, start: number) =>
            start > 1
              ? `From month ${start}, start ₹${Math.round(amt).toLocaleString("en-IN")}/month SIP for early retirement.`
              : `Start ₹${Math.round(amt).toLocaleString("en-IN")}/month SIP for early retirement.`,
        };
      case "grow_wealth":
      default:
        return {
          id: "start_sip",
          title: "Start SIP wealth building",
          instrument: "Nifty 50 index fund / flexi-cap fund SIP",
          why: "After safety buckets are completed, this surplus should compound through disciplined SIP investing.",
          icon: "📈",
          noteSafe: (m: number) =>
            `Safety complete. Start SIP from month ${m} and route remaining to debt prepay.`,
          action: (amt: number, start: number) =>
            start > 1
              ? `Start SIP of ₹${Math.round(amt).toLocaleString("en-IN")}/month from month ${start} once safety gaps are complete.`
              : `Start SIP of ₹${Math.round(amt).toLocaleString("en-IN")}/month now.`,
        };
    }
  })();

  const sipStartMonth =
    termGap > 0
      ? termStartMonth + 1
      : medicalGapLeft > 0
        ? medicalStartMonth + medicalMonthsToComplete
        : 1;

  // Month-wise execution plan (12 months) with hard-priority sequencing.
  const monthlyPlan: PriorityPlan["monthlyPlan"] = [];
  let emRemaining = Math.max(0, Math.round(emergencyGap));
  let medRemaining = Math.max(0, Math.round(medicalGapLeft));
  let termRemaining = Math.max(0, Math.round(termYearlyPremium));
  const debtExtraBudgetBase =
    primaryGoal === "clear_debt"
      ? Math.max(0, Math.round(monthlySurplus * 0.8))
      : Math.max(0, Math.round(monthlySurplus * 0.5));

  // Steady-state goal budget once safety is covered: surplus minus new
  // premiums and SSY. "Clear debt" keeps most of it for prepayment.
  // A new Sukanya account per daughter under 10 (none when SSY is already
  // running): it carries the safe half of her education goal, up to the
  // ₹1.5L/year limit, and counts toward that goal - never saved twice.
  const educationNeeds = earmarkExistingSavings(
    profile,
    new Date(),
    safetyReserve,
  );
  const ssyPlan =
    (profile.ssy || 0) > 0
      ? []
      : (Array.isArray(profile.kidsAges) ? (profile.kidsAges as number[]) : [])
          .map((age, index) => ({
            age,
            index,
            girl:
              ((profile.kidsGenders as string[] | undefined)?.[index] ||
                "boy") === "girl",
          }))
          .filter((k) => k.girl && k.age < 10)
          .map((k) => {
            const need =
              educationNeeds.get(`kid_education:${k.index}`)?.monthlyRequired ??
              0;
            return {
              age: k.age,
              index: k.index,
              monthly:
                need > 0
                  ? Math.min(
                      SSY_MAX_MONTHLY,
                      Math.max(
                        SSY_MIN_MONTHLY,
                        Math.round(need / 2 / 500) * 500,
                      ),
                    )
                  : 0,
            };
          })
          .filter((k) => k.monthly > 0);
  const ssyReserve = ssyPlan.reduce((s, k) => s + k.monthly, 0);
  // Recurring steps (SSY, debt deploy, goals, leftover SIP) draw from the same
  // steady-state budget the goal split uses - never from the month-1 leftover
  // after emergency/medical top-ups, which are temporary.
  const steadyStateBudget = Math.max(
    0,
    monthlySurplus - termPremiumEst - healthPremiumEst - urgentMonthly,
  );
  let steadyRunning = steadyStateBudget;
  const postSafetyBudget = Math.max(0, steadyStateBudget - ssyReserve);
  const debtDeployMonthly =
    primaryGoal === "clear_debt" ? Math.round(postSafetyBudget * 0.8) : 0;
  const safetyNetComplete = priorities
    .filter((p) =>
      [
        "emergency_fund",
        "medical_fund",
        "term_insurance",
        "health_insurance",
      ].includes(p.id),
    )
    .every((p) => p.status === "complete");
  const parallelFunding = buildGoalFundingPlan(
    profile,
    postSafetyBudget - debtDeployMonthly,
    new Date(),
    {
      safetyNetComplete,
      excludeGoalIds: urgentGoals.map((g) => g.goalId),
      ...safetyReserve,
      plannedSsyMonthly: ssyReserve,
    },
  );
  // Urgent goals keep their own earlier step; list them with the rest.
  const goalFunding: GoalFundingPlan = {
    ...parallelFunding,
    totalRequired:
      parallelFunding.totalRequired +
      urgentGoals.reduce((s, g) => s + g.monthlyRequired, 0),
    items: [...urgentGoals, ...parallelFunding.items],
  };

  const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  let safetyNoted = false;
  for (let month = 1; month <= 12; month += 1) {
    let left = Math.max(0, Math.round(monthlySurplus));
    let emergency = 0;
    let medical = 0;
    let termYearly = 0;
    let sip = 0;
    let extraDebt = 0;
    let note = "";

    // Goal 1: Close emergency in 2 months.
    if (emRemaining > 0) {
      emergency = Math.min(left, emRemaining);
      emRemaining = Math.max(0, emRemaining - emergency);
      left -= emergency;
    }

    // Close fixed-date goals (a wedding next year) come next, until their date.
    let urgent = 0;
    if (emRemaining === 0 && month >= urgentStartMonth) {
      const due = urgentGoals
        .filter((g) => month <= g.yearsToGoal * 12)
        .reduce((s, g) => s + g.monthlyAllocated, 0);
      urgent = Math.min(left, due);
      left -= urgent;
    }

    // Goal 2: Fill medical with remaining and post-emergency freed surplus.
    if (medRemaining > 0 && left > 0) {
      medical = Math.min(left, medRemaining);
      medRemaining = Math.max(0, medRemaining - medical);
      left -= medical;
    }

    // Yearly term premium as soon as the emergency fund is in place.
    if (termRemaining > 0 && emRemaining === 0 && left > 0) {
      termYearly = Math.min(left, termRemaining);
      termRemaining = Math.max(0, termRemaining - termYearly);
      left -= termYearly;
    }

    const safetyDone =
      emRemaining === 0 && medRemaining === 0 && termRemaining === 0;
    if (safetyDone && left > 0) {
      if (primaryGoal === "clear_debt") {
        extraDebt = Math.min(left, debtExtraBudgetBase);
        left -= extraDebt;
        sip = Math.min(
          left,
          goalFunding.totalAllocated + goalFunding.unallocated,
        );
        left -= sip;
      } else {
        sip = Math.min(left, goalFunding.totalAllocated);
        left -= sip;
        if (loansActual > 0) {
          extraDebt = Math.min(left, debtExtraBudgetBase);
          left -= extraDebt;
        }
        const generalSip = Math.min(left, goalFunding.unallocated);
        sip += generalSip;
        left -= generalSip;
      }
    }

    // Plain notes with the month's own amounts and no month numbers, so
    // identical months read the same and can be shown as one range.
    const parts: string[] = [];
    if (emergency > 0) {
      parts.push(
        emRemaining > 0
          ? `${rupees(emergency)} to the emergency fund (${rupees(emRemaining)} still to go)`
          : `${rupees(emergency)} to finish the emergency fund`,
      );
    }
    if (medical > 0) {
      parts.push(
        medRemaining > 0
          ? `${rupees(medical)} to the medical fund (${rupees(medRemaining)} still to go)`
          : `${rupees(medical)} to finish the medical fund`,
      );
    }
    if (urgent > 0) {
      parts.push(
        `${rupees(urgent)} to ${urgentGoals.map((g) => g.label.toLowerCase()).join(" and ")}`,
      );
    }
    if (termYearly > 0) {
      parts.push(`pay the ${rupees(termYearly)} yearly term premium`);
    }
    if (extraDebt > 0) {
      parts.push(`${rupees(extraDebt)} extra on your highest-rate loan`);
    }
    if (sip > 0) {
      const goals = goalFunding.items.length;
      parts.push(
        `${rupees(sip)} into SIPs${goals > 1 ? ` across your ${goals} goals` : ""}`,
      );
    }
    const plan = parts.join(", ");
    const sentence = plan
      ? `${plan.charAt(0).toUpperCase()}${plan.slice(1)}.`
      : "Keep the same allocation.";
    if (safetyDone && !safetyNoted) {
      safetyNoted = true;
      note = `Safety net done. ${sentence}`;
    } else {
      note = sentence;
    }

    monthlyPlan.push({
      month,
      emergency,
      medical,
      termYearly,
      sip: sip + urgent,
      extraDebt,
      remaining: left,
      note,
    });
  }

  const ssyIds = new Set<string>();
  ssyPlan.forEach((girl) => {
    const monthsLeft = (10 - girl.age) * 12;
    const isUrgent = girl.age >= 8;
    const ssyBefore = steadyRunning;
    const ssyMonthly = Math.max(0, Math.min(girl.monthly, steadyRunning));
    steadyRunning = Math.max(0, steadyRunning - ssyMonthly);
    // Twins share an age; keep each step's id unique.
    let id = `ssy_girl_age_${girl.age}`;
    if (ssyIds.has(id)) id = `${id}_${girl.index + 1}`;
    ssyIds.add(id);

    priorities.push({
      rank: rank++,
      id,
      title: isUrgent
        ? `⚠️ URGENT: Open SSY - daughter age ${girl.age}`
        : `Open SSY for daughter age ${girl.age}`,
      category: "kids",
      urgency: isUrgent ? "critical" : "high",
      status: "missing",
      currentAmount: 0,
      targetAmount: 1500000,
      gap: 1500000,
      monthlyRequired: ssyMonthly,
      monthlyContribution: ssyMonthly,
      surplusBefore: ssyBefore,
      surplusAfterThis: steadyRunning,
      monthsToComplete: (21 - girl.age) * 12,
      instrument:
        "Sukanya Samriddhi Yojana at any Post Office or authorised bank",
      actionThisWeek: isUrgent
        ? `OPEN THIS WEEK. Only ${monthsLeft} months left before window closes forever. Visit post office with daughter Aadhaar.`
        : `Open SSY account at post office. Start ${rupeesFmt(ssyMonthly)}/month. 8.2% guaranteed tax-free.`,
      whyThisMatters: `SSY gives 8.2% guaranteed returns completely tax-free, and it is counted toward her education goal - the safe half of it. ${isUrgent ? `Account CANNOT open after she turns 10. Only ${monthsLeft} months left.` : "Best safe investment for girl child in India."}`,
      icon: "👧",
      canBuyFromFinkoin: false,
    });
  });

  if (debtDeployMonthly > 0) {
    const before = steadyRunning;
    const amount = Math.min(steadyRunning, debtDeployMonthly);
    steadyRunning = Math.max(0, steadyRunning - amount);
    priorities.push({
      rank: rank++,
      id: wealthDeploy.id,
      title: wealthDeploy.title,
      category: "debt",
      urgency: "medium",
      status: "missing",
      currentAmount: 0,
      targetAmount: debtDeployMonthly,
      gap: debtDeployMonthly,
      monthlyRequired: debtDeployMonthly,
      monthlyContribution: amount,
      surplusBefore: before,
      surplusAfterThis: steadyRunning,
      monthsToComplete: 1,
      instrument: wealthDeploy.instrument,
      actionThisWeek: wealthDeploy.action(
        amount > 0 ? amount : debtDeployMonthly,
        sipStartMonth,
      ),
      whyThisMatters: wealthDeploy.why,
      icon: wealthDeploy.icon,
      canBuyFromFinkoin: false,
      startMonth: sipStartMonth,
    });
  }

  for (const item of parallelFunding.items) {
    if (item.monthlyAllocated <= 0) continue;
    const before = steadyRunning;
    // Exactly the split amount: the goals table, actions and PDF all show it.
    const amount = item.monthlyAllocated;
    steadyRunning = Math.max(0, steadyRunning - amount);
    priorities.push({
      rank: rank++,
      id: `goal_${item.goalId.replace(":", "_")}`,
      title: item.label,
      category: "goal",
      urgency: "medium",
      status: item.fundedPct >= 100 ? "partial" : "missing",
      currentAmount: item.currentSaved,
      targetAmount: item.targetAmount,
      gap: Math.max(0, item.targetAmount - item.currentSaved),
      monthlyRequired: item.monthlyRequired,
      monthlyContribution: amount,
      surplusBefore: before,
      surplusAfterThis: steadyRunning,
      monthsToComplete: item.yearsToGoal * 12,
      instrument: item.instrument,
      actionThisWeek: goalFundingAction(item, sipStartMonth, stepUp),
      whyThisMatters: goalFundingWhy(item),
      icon: GOAL_ICONS[item.type] ?? "🎯",
      canBuyFromFinkoin: false,
      startMonth: sipStartMonth,
      reach: goalReach(item, { profile, startMonth: sipStartMonth }),
    });
  }

  if (goalFunding.unallocated > 0) {
    const before = steadyRunning;
    const amount = Math.min(steadyRunning, goalFunding.unallocated);
    steadyRunning = Math.max(0, steadyRunning - amount);
    priorities.push({
      rank: rank++,
      id: "start_sip",
      title: "Start SIP wealth building",
      category: "investment",
      urgency: "medium",
      status: "missing",
      currentAmount: investmentActual,
      targetAmount: goalFunding.unallocated,
      gap: goalFunding.unallocated,
      monthlyRequired: goalFunding.unallocated,
      monthlyContribution: amount,
      surplusBefore: before,
      surplusAfterThis: steadyRunning,
      monthsToComplete: 1,
      instrument: "Nifty 50 index fund / flexi-cap fund SIP",
      actionThisWeek:
        sipStartMonth > 1
          ? `From month ${sipStartMonth}, invest the remaining ₹${Math.round(amount).toLocaleString("en-IN")}/month in an index fund SIP.`
          : `Invest the remaining ₹${Math.round(amount).toLocaleString("en-IN")}/month in an index fund SIP.`,
      whyThisMatters:
        "Every goal is already funded on time - this extra builds long-run wealth.",
      icon: "📈",
      canBuyFromFinkoin: false,
      startMonth: sipStartMonth,
    });
  }

  const DEBT_CONFIG = [
    {
      profileKey: "creditCardBillMonthly",
      type: "Credit card",
      rate: 36,
      icon: "💳",
      priority: 1,
    },
    {
      profileKey: "personalLoanEMI",
      type: "Personal loan",
      rate: 16,
      icon: "💰",
      priority: 2,
    },
    {
      profileKey: "bikeEMI",
      type: "Bike loan",
      rate: 14,
      icon: "🏍️",
      priority: 3,
    },
    {
      profileKey: "carLoanEMI",
      type: "Car loan",
      rate: 9,
      icon: "🚗",
      priority: 4,
    },
    {
      profileKey: "homeLoanEMI",
      type: "Home loan",
      rate: 8.5,
      icon: "🏠",
      priority: 5,
    },
  ] as const;

  const UNIFIED_LOAN_TYPE: Record<string, string> = {
    personalLoanEMI: "personal_loan",
    bikeEMI: "bike_loan",
    carLoanEMI: "car_loan",
    homeLoanEMI: "home_loan",
  };
  const debtList: DebtItem[] = [];
  const estimateOutstanding = (emi: number, loanType: string): number => {
    const remainingMonths: Record<string, number> = {
      homeLoanEMI: 120,
      carLoanEMI: 36,
      bikeEMI: 24,
      personalLoanEMI: 24,
      creditCardBillMonthly: 3,
      medicalLoanEMI: 18,
      marriageLoanEMI: 24,
      educationLoanEMI: 48,
    };
    return emi * (remainingMonths[loanType] || 24);
  };

  DEBT_CONFIG.forEach((config) => {
    const emi = (profile as any)[config.profileKey] || 0;
    if (emi > 0) {
      const outstandingKey = config.profileKey
        .replace("EMI", "Outstanding")
        .replace("Bill", "Outstanding")
        .replace("Monthly", "Outstanding");
      const explicitOutstanding = (profile as any)[outstandingKey];
      const rateKey =
        config.profileKey === "bikeEMI"
          ? "bikeLoanRate"
          : config.profileKey
              .replace("EMI", "Rate")
              .replace("BillMonthly", "Rate");
      const monthsKey = config.profileKey
        .replace("EMI", "RemainingMonths")
        .replace("BillMonthly", "RemainingMonths");
      const unified = UNIFIED_LOAN_TYPE[config.profileKey]
        ? ((profile.unifiedLoans || []) as any[]).find(
            (l) => l?.loanType === UNIFIED_LOAN_TYPE[config.profileKey],
          )
        : undefined;
      const enteredRate =
        Number((profile as any)[rateKey]) || Number(unified?.interestRate) || 0;
      const rate = enteredRate || config.rate;
      const remainingMonths = (profile as any)[monthsKey] || 0;
      const outstandingEstimated =
        !explicitOutstanding && !(rate > 0 && remainingMonths > 0);
      const outstanding =
        explicitOutstanding ||
        (rate > 0 && remainingMonths > 0
          ? calculateOutstanding(emi, rate, remainingMonths)
          : estimateOutstanding(emi, config.profileKey));
      const extraEMI = Math.min(
        Math.round(emi * 0.3),
        Math.round(monthlySurplus * 0.15),
      );
      const monthsToClear =
        extraEMI > 0
          ? Math.ceil(outstanding / (emi + extraEMI))
          : Math.ceil(outstanding / emi);

      debtList.push({
        type: config.type,
        lenderName:
          config.profileKey === "personalLoanEMI"
            ? profile.personalLoanLenderName || ""
            : config.profileKey === "carLoanEMI"
              ? profile.carLoanLenderName || ""
              : config.profileKey === "bikeEMI"
                ? profile.bikeLoanLenderName || ""
                : config.profileKey === "homeLoanEMI"
                  ? profile.homeLoanLenderName || ""
                  : "",
        displayName:
          config.profileKey === "personalLoanEMI"
            ? profile.personalLoanLenderName
              ? `Personal loan (${profile.personalLoanLenderName})`
              : "Personal loan"
            : config.profileKey === "carLoanEMI"
              ? profile.carLoanLenderName
                ? `Car loan (${profile.carLoanLenderName})`
                : "Car loan"
              : config.profileKey === "bikeEMI"
                ? profile.bikeLoanLenderName
                  ? `Bike loan (${profile.bikeLoanLenderName})`
                  : "Bike loan"
                : config.profileKey === "homeLoanEMI"
                  ? profile.homeLoanLenderName
                    ? `Home loan (${profile.homeLoanLenderName})`
                    : "Home loan"
                  : config.type,
        outstanding: Math.round(outstanding),
        emi: Math.round(emi),
        rate: rate,
        priorityRank: config.priority,
        extraEMIRecommended: extraEMI,
        monthsToClearWithExtra: monthsToClear,
        icon: config.icon,
        outstandingEstimated,
        rateEstimated: enteredRate <= 0,
      });
    }
  });

  const additionalDebts = Array.from(
    new Map(
      (profile.additionalObligations || [])
        .filter((o: any) => Number(o?.monthlyAmount || 0) > 0)
        .map((o: any) => {
          const key = [
            String(o?.type || "other")
              .toLowerCase()
              .trim(),
            String(o?.lenderName || "")
              .toLowerCase()
              .trim(),
            Math.round(Number(o?.monthlyAmount || 0)),
          ].join("|");
          return [key, o] as const;
        }),
    ).values(),
  );

  additionalDebts.forEach((debt: any, i: number) => {
    const emi = debt.monthlyAmount || 0;
    const outstandingEstimated = !(Number(debt.outstandingAmount) > 0);
    const outstanding = debt.outstandingAmount || emi * 18;
    const rate = Number(debt.rateOfInterest) || 0;
    const remainingMonths = debt.remainingMonths || debt.tenureMonths || 18;
    debtList.push({
      type: debt.type || `Obligation ${i + 1}`,
      lenderName: debt.lenderName || "",
      displayName: debt.lenderName
        ? `${debt.type} (${debt.lenderName})`
        : debt.type,
      outstanding,
      emi,
      rate,
      priorityRank: 5 + i,
      extraEMIRecommended: Math.min(
        Math.round(emi * 0.3),
        Math.round(monthlySurplus * 0.1),
      ),
      monthsToClearWithExtra: remainingMonths,
      icon: "🏦",
      outstandingEstimated,
      // A real 0% loan is only trusted when the user also gave the balance.
      rateEstimated: !(rate > 0) && outstandingEstimated,
    });
  });

  // Avalanche: the highest interest rate is cleared first, whatever the loan type.
  debtList.sort((a, b) => b.rate - a.rate || a.priorityRank - b.priorityRank);

  const goalList: GoalItem[] = [];

  if (primaryGoal === "clear_debt") {
    const totalDebt = debtList.reduce((s, d) => s + (d.outstanding || 0), 0);
    const totalEmi = debtList.reduce((s, d) => s + (d.emi || 0), 0);
    goalList.push({
      goalType: "clear_debt",
      targetAmount: Math.round(totalDebt),
      currentSaved: 0,
      monthlyRequired: Math.round(totalEmi + Math.max(0, monthlySurplus * 0.5)),
      yearsToGoal:
        totalDebt > 0 && monthlySurplus > 0
          ? Math.max(1, Math.ceil(totalDebt / (monthlySurplus * 0.5) / 12))
          : 3,
      instrument: "Avalanche: highest rate first, then snowball leftovers",
      readyToStart: debtList.length > 0,
      blockedBy: debtList.length === 0 ? "No loans on file" : null,
      icon: "💳",
    });
  }

  if (primaryGoal === "build_emergency_fund") {
    goalList.push({
      goalType: "build_emergency_fund",
      targetAmount: Math.round(emergencyTarget),
      currentSaved: Math.round(emergencyCurrent),
      monthlyRequired: Math.max(0, Math.round(emergencyGap / Math.max(1, 12))),
      yearsToGoal: 1,
      instrument: "Liquid mutual fund + savings",
      readyToStart: true,
      blockedBy: null,
      icon: "🛡️",
    });
  }

  if (primaryGoal === "build_insurance_premium_fund") {
    const yearlyPrem = existingInsurancePremiums * 12;
    goalList.push({
      goalType: "build_insurance_premium_fund",
      targetAmount: Math.round(yearlyPrem || 100_000),
      currentSaved: 0,
      monthlyRequired: Math.round((yearlyPrem || 100_000) / 12),
      yearsToGoal: 1,
      instrument: "KVP ladder + post office RD",
      readyToStart: true,
      blockedBy: null,
      icon: "📋",
    });
  }

  const blockingCritical = priorities.find(
    (p) => p.urgency === "critical" && p.status !== "complete",
  );
  for (const item of goalFunding.items) {
    goalList.push({
      goalType: item.type,
      goalId: item.goalId,
      label: item.label,
      targetAmount: Math.round(item.targetAmount),
      currentSaved: Math.round(item.currentSaved),
      monthlyRequired: item.monthlyRequired,
      monthlyAllocated: item.monthlyAllocated,
      existingMonthly: item.existingMonthly ?? 0,
      stepUp,
      sharePct: item.sharePct,
      yearsToGoal: item.yearsToGoal,
      instrument: item.instrument,
      allocation: item.allocation,
      readyToStart: !blockingCritical,
      blockedBy: blockingCritical?.title || null,
      icon: GOAL_ICONS[item.type] ?? "🎯",
    });
  }

  const scoreToday = analysis.overallScore || 0;
  const criticalCount = priorities.filter(
    (p) => p.urgency === "critical" && p.status !== "complete",
  ).length;
  const highCount = priorities.filter(
    (p) => p.urgency === "high" && p.status !== "complete",
  ).length;
  const mediumCount = priorities.filter(
    (p) => p.urgency === "medium" && p.status !== "complete",
  ).length;

  const scoreGainIfFixed = criticalCount * 15 + highCount * 8 + mediumCount * 4;

  const scoreAfter12Months = Math.min(
    100,
    scoreToday + Math.round(scoreGainIfFixed * 0.7),
  );

  const BEST_FD_RATES_2024 = [
    { bank: "IDFC First Bank", rate: 7.9 },
    { bank: "DCB Bank", rate: 7.9 },
    { bank: "Unity Small Finance Bank", rate: 9.0 },
    { bank: "Utkarsh Small Finance Bank", rate: 8.5 },
    { bank: "SBM Bank", rate: 8.25 },
    { bank: "AU Small Finance Bank", rate: 8.1 },
  ];
  const bestFd = BEST_FD_RATES_2024.reduce(
    (best, row) => (row.rate > best.rate ? row : best),
    BEST_FD_RATES_2024[0],
  );
  const fdRate = profile.fdRate || 0;
  const fdValue = profile.fdValue || 0;
  const fdSuggestion =
    fdRate > 0 && fdValue > 0 && fdRate < bestFd.rate - 0.5
      ? {
          message: `Your FD earns ${fdRate}%. ${bestFd.bank} offers ${bestFd.rate}%. On ₹${Math.round(fdValue).toLocaleString("en-IN")} that is ₹${Math.round((fdValue * (bestFd.rate - fdRate)) / 100).toLocaleString("en-IN")} more per year. Consider shifting at maturity.`,
          cta: "Shift FD to better bank via Finkoin →",
          bank: bestFd.bank,
          bestRate: bestFd.rate,
          currentRate: fdRate,
          extraAnnual: Math.round((fdValue * (bestFd.rate - fdRate)) / 100),
        }
      : undefined;

  return {
    priorities,
    debts: debtList,
    goals: goalList,
    monthlyIncome,
    monthlySurplus,
    surplusBreakdown: {
      totalIncome: monthlyIncome,
      needsActual,
      loansActual,
      wantsActual,
      investmentActual,
      existingInsurancePremiums,
      netSurplus: monthlySurplus,
      afterAllPriorities: steadyRunning,
    },
    allocationPlan: [],
    scoreToday,
    scoreAfter12Months,
    topAction:
      priorities.find((p) => p.status !== "complete")?.actionThisWeek ||
      "All priorities complete!",
    fdSuggestion,
    monthlyPlan,
    goalFunding,
  };
}
