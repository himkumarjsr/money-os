import { calculateOutstanding } from "@/lib/amortisation";

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

  const emergencyMonthsNeeded =
    stage === "bachelor" && (profile.parentsSupport || 0) === 0
      ? 6
      : stage === "bachelor"
        ? 9
        : stage === "married" && kids.length === 0
          ? 9
          : stage === "kids"
            ? 12
            : stage === "senior"
              ? 12
              : age >= 50
                ? 12
                : 6;

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

  const medicalTarget = 200000;
  const medicalCurrent = Math.min(
    (profile.liquidMFValue || 0) * 0.5,
    medicalTarget,
  );
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
    urgency: medicalCurrent === 0 ? "critical" : "high",
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
    priorities.push({
      rank: rank++,
      id: "term_insurance",
      title: termHave === 0 ? "Close term cover gap" : "Increase term cover",
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
        "HDFC Click2Protect or Max Life Smart Secure — pure term only",
      actionThisWeek:
        termStartMonth > 1
          ? `From month ${termStartMonth}, plan a top-up term policy. Budget ₹${termPremiumEst.toLocaleString("en-IN")}/month for ₹${(termGap / 10000000).toFixed(1)} crore cover.`
          : `Compare 3 term insurance quotes online. Budget ₹${termPremiumEst.toLocaleString("en-IN")}/month for ₹${(termGap / 10000000).toFixed(1)} crore cover.`,
      whyThisMatters:
        termHave === 0
          ? "Your family has zero income if you pass away. All EMIs continue with no salary."
          : `Gap of ₹${(termGap / 10000000).toFixed(1)} crore leaves family underprotected.`,
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
      instrument: "HDFC ERGO Optima or Niva Bupa ReAssure — family floater",
      actionThisWeek: `Get ₹${(healthNeeded / 100000).toFixed(0)} lakh health cover. Compare quotes on IRDAI-registered insurer or aggregator sites, or through a licensed advisor.`,
      whyThisMatters:
        "One hospitalisation in metro costs ₹2-5 lakh. Without cover your savings get wiped.",
      icon: "🏥",
      canBuyFromFinkoin: false,
      finkoinProductType: "health",
    });
    runningSurplus = Math.max(0, runningSurplus - healthPremiumEst);
  }

  const sipStartMonth =
    termGap > 0
      ? termStartMonth + 1
      : medicalGap > 0
        ? medicalStartMonth + medicalMonthsToComplete
        : 1;
  const sipMonthly = Math.max(
    0,
    monthlySurplus - termPremiumEst - healthPremiumEst,
  );
  if (sipMonthly > 0) {
    priorities.push({
      rank: rank++,
      id: "start_sip",
      title: "Start SIP wealth building",
      category: "investment",
      urgency: "medium",
      status: "missing",
      currentAmount: investmentActual,
      targetAmount: sipMonthly,
      gap: Math.max(0, sipMonthly - investmentActual),
      monthlyRequired: sipMonthly,
      monthlyContribution: sipMonthly,
      surplusBefore: sipMonthly,
      surplusAfterThis: 0,
      monthsToComplete: 1,
      instrument: "Nifty 50 index fund / flexi-cap fund SIP",
      actionThisWeek:
        sipStartMonth > 1
          ? `Start SIP of ₹${Math.round(sipMonthly).toLocaleString("en-IN")}/month from month ${sipStartMonth} once safety gaps are complete.`
          : `Start SIP of ₹${Math.round(sipMonthly).toLocaleString("en-IN")}/month now.`,
      whyThisMatters:
        "After safety buckets are completed, this surplus should compound through disciplined SIP investing.",
      icon: "📈",
      canBuyFromFinkoin: false,
      startMonth: sipStartMonth,
    });
  }

  // Month-wise execution plan (12 months) with hard-priority sequencing.
  const monthlyPlan: PriorityPlan["monthlyPlan"] = [];
  let emRemaining = Math.max(0, Math.round(emergencyGap));
  let medRemaining = Math.max(0, Math.round(medicalGap));
  let termRemaining = Math.max(0, Math.round(termYearlyPremium));
  const debtExtraBudgetBase = Math.max(0, Math.round(monthlySurplus * 0.5));
  const minSipByIncome = Math.max(0, Math.round(monthlyIncome * 0.2));
  const sipBySurplus = Math.max(0, Math.round(monthlySurplus * 0.5));
  const targetSip = Math.max(minSipByIncome, sipBySurplus);

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
      sip = Math.min(left, targetSip);
      left -= sip;
      extraDebt = Math.min(left, debtExtraBudgetBase);
      left -= extraDebt;
      note = `Safety complete. Start SIP from month ${month} and route remaining to debt prepay.`;
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
      monthlyRequired: Math.max(0, Math.min(12500, runningSurplus)),
      monthlyContribution: Math.max(0, Math.min(12500, runningSurplus)),
      surplusBefore: runningSurplus,
      surplusAfterThis: Math.max(
        0,
        runningSurplus - Math.max(0, Math.min(12500, runningSurplus)),
      ),
      monthsToComplete: (21 - girl.age) * 12,
      instrument: "Sukanya Samriddhi Yojana at Post Office or SBI/HDFC Bank",
      actionThisWeek: isUrgent
        ? `OPEN THIS WEEK. Only ${monthsLeft} months left before window closes forever. Visit post office with daughter Aadhaar.`
        : "Open SSY account at post office. Start ₹12,500/month. 8.2% guaranteed tax-free.",
      whyThisMatters: `SSY gives 8.2% guaranteed returns completely tax-free. ${isUrgent ? `Account CANNOT open after she turns 10. Only ${monthsLeft} months left.` : "Best safe investment for girl child in India."}`,
      icon: "👧",
      canBuyFromFinkoin: false,
    });
    runningSurplus = Math.max(
      0,
      runningSurplus - Math.max(0, Math.min(12500, runningSurplus)),
    );
  });

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
      const rate = (profile as any)[rateKey] || config.rate;
      const remainingMonths = (profile as any)[monthsKey] || 0;
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
    });
  });

  debtList.sort((a, b) => a.priorityRank - b.priorityRank);

  const goalList: GoalItem[] = [];
  const primaryGoal = profile.primaryGoal || "grow_wealth";

  if (primaryGoal === "buy_house" || profile.homePurchaseTarget) {
    const target = (profile.homePurchaseTarget || 5000000) * 0.6;
    const saved = profile.savingsAccountBalance || 0;
    const gap = Math.max(0, target - saved);
    const yearsToGoal =
      monthlySurplus > 0 ? Math.ceil(gap / (monthlySurplus * 0.3) / 12) : 7;

    goalList.push({
      goalType: "buy_house",
      targetAmount: Math.round(target),
      currentSaved: Math.round(saved),
      monthlyRequired: Math.round(gap / Math.max(1, yearsToGoal * 12)),
      yearsToGoal,
      instrument:
        yearsToGoal > 5
          ? "Nifty 50 Index Fund SIP"
          : "Recurring Deposit + Debt MF",
      readyToStart:
        priorities.filter(
          (p) => p.urgency === "critical" && p.status !== "complete",
        ).length === 0,
      blockedBy:
        priorities.find(
          (p) => p.urgency === "critical" && p.status !== "complete",
        )?.title || null,
      icon: "🏠",
    });
  }

  if (primaryGoal === "buy_car" && !profile.ownsCar) {
    const carTarget = profile.carPurchaseTarget || 800000;
    goalList.push({
      goalType: "buy_car",
      targetAmount: carTarget,
      currentSaved: 0,
      monthlyRequired: Math.round(carTarget / 24),
      yearsToGoal: 2,
      instrument: "Post Office RD or Liquid MF",
      readyToStart: true,
      blockedBy: null,
      icon: "🚗",
    });
  }

  if (primaryGoal === "retire_fire" || primaryGoal === "grow_wealth") {
    const annualExpenses = (analysis.needsActual || 0) * 12;
    const fireTarget = annualExpenses * 25;
    const currentCorpus =
      (profile.mfValue || 0) +
      (profile.epfBalance || 0) +
      (profile.ppfBalance || 0) +
      (profile.npsBalance || 0);
    const fireGap = Math.max(0, fireTarget - currentCorpus);
    const retireAge = profile.retirementAge || 60;
    const yearsToRetire = Math.max(1, retireAge - age);

    goalList.push({
      goalType: "retire_fire",
      targetAmount: Math.round(fireTarget),
      currentSaved: Math.round(currentCorpus),
      monthlyRequired: Math.round(fireGap / (yearsToRetire * 12 * 1.1)),
      yearsToGoal: yearsToRetire,
      instrument:
        age < 40 ? "Nifty 50 Index Fund + NPS" : "Index Fund + PPF + NPS",
      readyToStart:
        priorities.filter(
          (p) => p.urgency === "critical" && p.status !== "complete",
        ).length < 2,
      blockedBy: null,
      icon: "🔥",
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
      afterAllPriorities: runningSurplus,
    },
    allocationPlan: [],
    scoreToday,
    scoreAfter12Months,
    topAction:
      priorities.find((p) => p.status !== "complete")?.actionThisWeek ||
      "All priorities complete!",
    fdSuggestion,
    monthlyPlan,
  };
}
