import { calculateOutstanding } from "@/lib/amortisation";
import {
  emergencyFundMonthsNeeded,
  medicalEmergencyTarget,
} from "@/lib/financialEngine";
import {
  buildGoalFundingPlan,
  type GoalFundingItem,
  type GoalFundingPlan,
} from "@/lib/goalFunding";
import type { PortfolioAllocation } from "@/lib/portfolioAllocation";

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
  /** Outstanding was guessed from the EMI — the user never entered it. */
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

function goalFundingAction(item: GoalFundingItem, startMonth: number): string {
  const what = `${rupees(item.monthlyAllocated)}/month into ${item.instrument} for ${item.label.toLowerCase()} (${item.sharePct}% of your goal budget)`;
  return startMonth > 1 ? `From month ${startMonth}, put ${what}.` : `Put ${what}.`;
}

function goalFundingWhy(item: GoalFundingItem): string {
  const base =
    item.yearsToGoal <= 3
      ? `Hard deadline in ${item.yearsToGoal} ${item.yearsToGoal === 1 ? "year" : "years"} — it can't benefit from waiting, so it gets a bigger share.`
      : `${item.yearsToGoal} years away — funded now, not deferred, because every year skipped is compounding lost.`;
  return item.fundedPct < 100
    ? `${base} This covers ${item.fundedPct}% of the ${rupees(item.monthlyRequired)}/month needed to hit ${rupees(item.targetAmount)} by ${item.targetYear}.`
    : `${base} Fully funded to reach ${rupees(item.targetAmount)} by ${item.targetYear}.`;
}

const MAX_PAYOFF_MONTHS = 600;

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

  const monthsNow = withExtra && outstanding > 0 ? withExtra.months : fallbackMonths;
  const monthsSaved =
    base && withExtra ? Math.max(0, base.months - withExtra.months) : 0;
  const interestSaved =
    extraPayment > 0 && base && withExtra
      ? Math.max(0, Math.round(base.totalInterest - withExtra.totalInterest))
      : 0;

  return {
    extraPayment,
    outstanding,
    currentEMI,
    monthsNow,
    monthsSaved,
    interestSaved,
  };
}

export function buildPriorityPlan(profile: any, analysis: any): PriorityPlan {
  const monthlyIncome =
    (profile.monthlySalary || 0) +
    (profile.lifeStage !== "bachelor" ? profile.spouseIncome || 0 : 0) +
    (profile.otherIncome || 0);
  const foodActual =
    (profile.foodTotal || 0) > 0
      ? profile.foodTotal || 0
      : (profile.vegetables || 0) +
        (profile.grocery || 0) +
        (profile.medicine || 0);
  const transportActual =
    (profile.transportTotal || 0) > 0
      ? profile.transportTotal || 0
      : (profile.fuel || 0) + (profile.cabMetro || 0);
  const utilityActual =
    (profile.utilityTotal || 0) > 0
      ? profile.utilityTotal || 0
      : (profile.electricity || 0) +
        (profile.internet || 0) +
        (profile.gas || 0) +
        (profile.water || 0);
  const domesticActual =
    (profile.domesticHelpTotal || 0) > 0
      ? profile.domesticHelpTotal || 0
      : (profile.houseHelpMonthly || 0) + (profile.cookHelpMonthly || 0);
  const lifestyleActual =
    (profile.lifestyleTotal || 0) > 0
      ? profile.lifestyleTotal || 0
      : (profile.entertainment || 0) +
        (profile.shopping || 0) +
        (profile.personalCare || 0);

  const needsActual =
    (profile.rentAmount || 0) +
    (profile.rentMaintenanceMonthly || 0) +
    foodActual +
    transportActual +
    utilityActual +
    domesticActual +
    (profile.kidsSchoolFees || 0) +
    (profile.kidsActivities || 0) +
    (profile.parentsSupport || 0);
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
    additionalLoanObligations;
  const wantsActual = lifestyleActual;
  const investmentActual =
    (profile.monthlySIP || 0) +
    (profile.monthlyRD || 0) +
    (profile.monthlyPPFContribution || 0) +
    (profile.monthlyNPSContribution || 0) +
    (profile.monthlyEPFContribution || 0) +
    (profile.ssy || 0) +
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
      const amount = p?.premiumAmount || p?.premiumInput || 0;
      const monthly = p?.frequency === "yearly" ? amount / 12 : amount;
      return sum + monthly;
    }, 0);
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

  // Keep emergency target consistent with report expectation:
  // emergency buffer should also account for housing EMI continuity risk.
  const emergencyBaseMonthly =
    needsActual + (profile.homeLoanEMI || 0) + (profile.secondPropertyEMI || 0);
  const emergencyTarget = emergencyBaseMonthly * emergencyMonthsNeeded;
  const emergencyCurrent =
    (profile.savingsAccountBalance || 0) * 1.0 +
    (profile.liquidMFValue || 0) * 0.95 +
    (profile.fdValue || 0) * 0.7 +
    (profile.otherLiquidSavings || 0) * 0.5;
  const emergencyMonthsCovered =
    needsActual > 0 ? emergencyCurrent / needsActual : 0;
  const emergencyGap = Math.max(0, emergencyTarget - emergencyCurrent);
  const hardPriorityMode = emergencyGap > 0;
  const emergencySuggested =
    emergencyGap > 0 ? Math.round(Math.min(monthlySurplus, emergencyGap)) : 0;
  const emergencyMonthly = Math.max(
    0,
    Math.min(emergencySuggested, runningSurplus),
  );
  const emergencySurplusBefore = runningSurplus;
  runningSurplus = Math.max(0, runningSurplus - emergencyMonthly);
  const emergencyMonthsToComplete =
    emergencyGap > 0 && emergencyMonthly > 0
      ? Math.ceil(emergencyGap / emergencyMonthly)
      : 0;

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
      emergencyGap > 0
        ? `Transfer ₹${Math.round(Math.min(emergencyCurrent * 0.3, 50000)).toLocaleString("en-IN")} to liquid MF today. Start ₹${Math.round(emergencyMonthly).toLocaleString("en-IN")}/month SIP in liquid fund.`
        : "Emergency fund complete. Well done.",
    whyThisMatters: `If your income stops tomorrow you need ${emergencyMonthsNeeded} months to recover.`,
    icon: "🛡️",
    canBuyFromFinkoin: false,
    startMonth: 1,
  });

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
  const medicalStartMonth =
    hardPriorityMode && emergencyMonthsToComplete > 0
      ? emergencyMonthsToComplete + 1
      : 1;
  const medicalSuggested =
    medicalGap > 0
      ? Math.round(
          Math.min(
            Math.max(0, monthlySurplus - emergencyMonthly),
            Math.ceil(medicalGap / 6),
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
    medicalGap > 0 && medicalMonthly > 0
      ? Math.ceil(medicalGap / medicalMonthly)
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
      medicalGap > 0
        ? medicalStartMonth > 1
          ? `From month ${medicalStartMonth}, invest ₹${Math.round(medicalMonthly).toLocaleString("en-IN")}/month for medical fund.`
          : `Invest ₹${Math.round(medicalMonthly).toLocaleString("en-IN")}/month.`
        : "Medical fund ready.",
    whyThisMatters:
      "Insurance has waiting periods; you need cash for immediate hospitalization.",
    icon: "🏥",
    canBuyFromFinkoin: false,
    startMonth: medicalStartMonth,
  });

  const annualIncome = monthlyIncome * 12;
  const ageMultiplier = age < 30 ? 1.2 : age < 40 ? 1.0 : age < 50 ? 0.8 : 0.6;
  const liabilities =
    (profile.homeLoanOutstanding || (profile.homeLoanEMI || 0) * 12 * 10) +
    (profile.carLoanOutstanding || (profile.carLoanEMI || 0) * 12 * 3);
  const equityTotal =
    (profile.totalEquityValue || 0) > 0
      ? profile.totalEquityValue || 0
      : (profile.mfValue || 0) +
        (profile.indianStocksValue || 0) +
        (profile.usStocksValueINR || 0) +
        (profile.usMFValueINR || 0) +
        (profile.rsuValueINR || 0);
  const customInvestmentTotal = (profile.customInvestments || []).reduce(
    (sum: number, inv: any) => sum + (inv.currentValue || 0),
    0,
  );
  const existingAssets =
    equityTotal +
    (profile.ppfBalance || 0) +
    (profile.epfBalance || 0) +
    (profile.fdValue || 0) +
    customInvestmentTotal;
  const dependentCount =
    (stage !== "bachelor" ? 1 : 0) +
    (profile.numberOfKids || 0) +
    ((profile.parentsSupport || 0) > 0 ? 1 : 0);
  const dependentBuffer = dependentCount * 2000000;
  const rawTermNeed =
    (annualIncome * 10 + liabilities + dependentBuffer - existingAssets) *
    ageMultiplier;
  const termNeeded =
    Math.ceil(Math.max(5000000, rawTermNeed) / 1000000) * 1000000;
  const termHave =
    profile.termInsuranceSumAssured || profile.termInsuranceCover || 0;
  const termGap = Math.max(0, termNeeded - termHave);
  const termPremiumEstRaw =
    age < 30
      ? Math.round((termGap / 10000000) * 850)
      : age < 35
        ? Math.round((termGap / 10000000) * 1200)
        : age < 40
          ? Math.round((termGap / 10000000) * 1700)
          : Math.round((termGap / 10000000) * 2500);
  const termStartMonth =
    medicalGap > 0 && medicalMonthsToComplete > 0
      ? medicalStartMonth + medicalMonthsToComplete
      : medicalStartMonth;
  const termPremiumEst = Math.max(
    0,
    Math.min(termPremiumEstRaw, monthlySurplus),
  );
  const termYearlyPremium =
    termGap > 0 ? Math.max(termPremiumEstRaw * 12, 12000) : 0;

  if (termGap > 0) {
    const termGapCr = (termGap / 10000000).toFixed(1);
    const termHaveCr = (termHave / 10000000).toFixed(1);
    priorities.push({
      rank: rank++,
      id: "term_insurance",
      title:
        termHave === 0
          ? "Close term cover gap"
          : "Term top-up (keep existing policy)",
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
          ? "Pure term plan from an insurer with a strong claim-settlement record — no ULIP or endowment"
          : "Separate top-up / additional term from another insurer — do not cancel your ₹" +
            termHaveCr +
            "Cr policy",
      actionThisWeek:
        termHave === 0
          ? termStartMonth > 1
            ? `From month ${termStartMonth}, compare pure term quotes. Budget ~₹${termPremiumEst.toLocaleString("en-IN")}/month for ₹${termGapCr} crore cover.`
            : `Compare 3 term insurance quotes online. Budget ~₹${termPremiumEst.toLocaleString("en-IN")}/month for ₹${termGapCr} crore cover.`
          : termStartMonth > 1
            ? `From month ${termStartMonth}, add a top-up for ~₹${termGapCr} crore only (you already have ₹${termHaveCr}Cr). Keep the old policy — income proof limits often block a second full policy at today's salary.`
            : `Add a top-up for ~₹${termGapCr} crore only (existing ₹${termHaveCr}Cr stays). Do not cancel — buy additional cover from another insurer if needed.`,
      whyThisMatters:
        termHave === 0
          ? "Your family has zero income if you pass away. All EMIs continue with no salary."
          : `Income has likely grown since you bought ₹${termHaveCr}Cr cover. We only flag the ₹${termGapCr} crore gap — top-up, not a second full policy or cancel-and-rebuy.`,
      icon: "🛡️",
      canBuyFromFinkoin: false,
      finkoinProductType: "term",
      startMonth: termStartMonth,
    });
    runningSurplus = Math.max(0, runningSurplus - termPremiumEst);
  }

  const healthNeeded =
    stage === "bachelor"
      ? 500000
      : (profile.numberOfKids || 0) > 0
        ? 2000000
        : 1000000;
  const healthHave =
    profile.healthInsuranceSumInsured || profile.healthInsuranceCover || 0;
  const healthGap = Math.max(0, healthNeeded - healthHave);
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
        healthHave === 0 ? "Close health cover gap" : "Increase health cover",
      category: "insurance",
      urgency: healthHave === 0 ? "critical" : "high",
      status:
        healthHave === 0
          ? "missing"
          : healthHave >= healthNeeded
            ? "complete"
            : "partial",
      currentAmount: healthHave,
      targetAmount: healthNeeded,
      gap: healthGap,
      monthlyRequired: healthPremiumEst,
      monthlyContribution: healthPremiumEst,
      surplusBefore: runningSurplus,
      surplusAfterThis: Math.max(0, runningSurplus - healthPremiumEst),
      monthsToComplete: 1,
      instrument: "Family floater health policy — compare room-rent limits, co-pay and waiting periods across 2–3 insurers",
      actionThisWeek: `Get ₹${(healthNeeded / 100000).toFixed(0)} lakh health cover. Compare quotes on IRDAI-registered insurer or aggregator sites, or through a licensed advisor.`,
      whyThisMatters:
        "One hospitalisation in metro costs ₹2-5 lakh. Without cover your savings get wiped.",
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
          why: "Your chosen goal is clearing debt — surplus after safety should cut interest cost before new investing.",
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
          why: "Your goal is buying a home — after safety layers and other obligations, route whatever surplus remains to the down-payment corpus.",
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
          why: "Your goal is buying a car — keep this surplus in low-volatility instruments for the purchase horizon.",
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
          why: "Your goal is kids' education — surplus should go to a dedicated education corpus.",
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
          why: "Your goal is building the emergency fund — keep surplus liquid until the target months of cover are solid.",
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
          why: "Your goal is retiring early — surplus after safety should compound aggressively toward FIRE.",
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
      : medicalGap > 0
        ? medicalStartMonth + medicalMonthsToComplete
        : 1;

  // Month-wise execution plan (12 months) with hard-priority sequencing.
  const monthlyPlan: PriorityPlan["monthlyPlan"] = [];
  let emRemaining = Math.max(0, Math.round(emergencyGap));
  let medRemaining = Math.max(0, Math.round(medicalGap));
  let termRemaining = Math.max(0, Math.round(termYearlyPremium));
  const debtExtraBudgetBase =
    primaryGoal === "clear_debt"
      ? Math.max(0, Math.round(monthlySurplus * 0.8))
      : Math.max(0, Math.round(monthlySurplus * 0.5));

  // Steady-state goal budget once safety is covered: surplus minus new
  // premiums and SSY. "Clear debt" keeps most of it for prepayment.
  const ssyReserve =
    (Array.isArray(profile.kidsAges) ? (profile.kidsAges as number[]) : []).filter(
      (kidAge, i) =>
        ((profile.kidsGenders as string[] | undefined)?.[i] || "boy") ===
          "girl" && kidAge < 10,
    ).length * 12500;
  // Recurring steps (SSY, debt deploy, goals, leftover SIP) draw from the same
  // steady-state budget the goal split uses — never from the month-1 leftover
  // after emergency/medical top-ups, which are temporary.
  const steadyStateBudget = Math.max(
    0,
    monthlySurplus - termPremiumEst - healthPremiumEst,
  );
  let steadyRunning = steadyStateBudget;
  const postSafetyBudget = Math.max(0, steadyStateBudget - ssyReserve);
  const debtDeployMonthly =
    primaryGoal === "clear_debt" ? Math.round(postSafetyBudget * 0.8) : 0;
  const safetyNetComplete = priorities
    .filter((p) =>
      ["emergency_fund", "medical_fund", "term_insurance", "health_insurance"].includes(p.id),
    )
    .every((p) => p.status === "complete");
  const goalFunding = buildGoalFundingPlan(
    profile,
    postSafetyBudget - debtDeployMonthly,
    new Date(),
    { safetyNetComplete },
  );

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

    // Goal 2: Fill medical with remaining and post-emergency freed surplus.
    if (medRemaining > 0 && left > 0) {
      medical = Math.min(left, medRemaining);
      medRemaining = Math.max(0, medRemaining - medical);
      left -= medical;
    }

    // Term premium as yearly payment month after emergency focus.
    if (termRemaining > 0 && month >= 3 && left > 0) {
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
        note = wealthDeploy.noteSafe(month);
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
        note =
          goalFunding.items.length > 1
            ? `Safety complete. Fund your ${goalFunding.items.length} goals in parallel from month ${month}.`
            : wealthDeploy.noteSafe(month);
      }
    } else if (emRemaining > 0) {
      note = "Emergency fund focus month.";
    } else if (medRemaining > 0) {
      note = "Medical fund acceleration month.";
    } else if (termRemaining > 0) {
      note = "Pay yearly term premium this month.";
    } else {
      note = "Maintain allocation discipline.";
    }

    monthlyPlan.push({
      month,
      emergency,
      medical,
      termYearly,
      sip,
      extraDebt,
      remaining: left,
      note,
    });
  }

  const kidsWithDemographics = profile.kidsAges
    ? (profile.kidsAges as number[]).map((kidAge: number, i: number) => ({
        age: kidAge,
        gender: (profile.kidsGenders as string[])?.[i] || "boy",
      }))
    : [];

  const girlChildrenUnder10 = kidsWithDemographics.filter(
    (k) => k.gender === "girl" && k.age < 10,
  );

  girlChildrenUnder10.forEach((girl) => {
    const monthsLeft = (10 - girl.age) * 12;
    const isUrgent = girl.age >= 8;
    const ssyBefore = steadyRunning;
    const ssyMonthly = Math.max(0, Math.min(12500, steadyRunning));
    steadyRunning = Math.max(0, steadyRunning - ssyMonthly);

    priorities.push({
      rank: rank++,
      id: `ssy_girl_age_${girl.age}`,
      title: isUrgent
        ? `⚠️ URGENT: Open SSY — daughter age ${girl.age}`
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
      instrument: "Sukanya Samriddhi Yojana at any Post Office or authorised bank",
      actionThisWeek: isUrgent
        ? `OPEN THIS WEEK. Only ${monthsLeft} months left before window closes forever. Visit post office with daughter Aadhaar.`
        : "Open SSY account at post office. Start ₹12,500/month. 8.2% guaranteed tax-free.",
      whyThisMatters: `SSY gives 8.2% guaranteed returns completely tax-free. ${isUrgent ? `Account CANNOT open after she turns 10. Only ${monthsLeft} months left.` : "Best safe investment for girl child in India."}`,
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

  for (const item of goalFunding.items) {
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
      actionThisWeek: goalFundingAction(item, sipStartMonth),
      whyThisMatters: goalFundingWhy(item),
      icon: GOAL_ICONS[item.type] ?? "🎯",
      canBuyFromFinkoin: false,
      startMonth: sipStartMonth,
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
        "Every goal is already funded on time — this extra builds long-run wealth.",
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
      const rateKey = config.profileKey
        .replace("EMI", "Rate")
        .replace("BillMonthly", "Rate");
      const monthsKey = config.profileKey
        .replace("EMI", "RemainingMonths")
        .replace("BillMonthly", "RemainingMonths");
      const enteredRate = Number((profile as any)[rateKey]) || 0;
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
    const rate = debt.rateOfInterest || debt.loanTakenYear || 0;
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

  debtList.sort((a, b) => a.priorityRank - b.priorityRank);

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
