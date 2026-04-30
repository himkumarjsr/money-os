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
  monthlyContribution: number;
  monthsToComplete: number;
  instrument: string;
  actionThisWeek: string;
  whyThisMatters: string;
  icon: string;
  canBuyFromFinkoin: boolean;
  finkoinProductType?: string;
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
  const income = (profile.monthlySalary || 0) + (profile.spouseIncome || 0) + (profile.otherIncome || 0);
  const foodActual =
    (profile.foodTotal || 0) > 0
      ? (profile.foodTotal || 0)
      : (profile.vegetables || 0) + (profile.grocery || 0) + (profile.medicine || 0);
  const transportActual =
    (profile.transportTotal || 0) > 0
      ? (profile.transportTotal || 0)
      : (profile.fuel || 0) + (profile.cabMetro || 0);
  const utilityActual =
    (profile.utilityTotal || 0) > 0
      ? (profile.utilityTotal || 0)
      : (profile.electricity || 0) + (profile.internet || 0) + (profile.gas || 0) + (profile.water || 0);
  const domesticActual =
    (profile.domesticHelpTotal || 0) > 0
      ? (profile.domesticHelpTotal || 0)
      : (profile.houseHelpMonthly || 0) + (profile.cookHelpMonthly || 0);
  const lifestyleActual =
    (profile.lifestyleTotal || 0) > 0
      ? (profile.lifestyleTotal || 0)
      : (profile.entertainment || 0) + (profile.shopping || 0) + (profile.personalCare || 0);

  const needs =
    analysis.needsActual ||
    (profile.rentAmount || 0) +
      (profile.rentMaintenanceMonthly || 0) +
      (profile.homeLoanEMI || 0) +
      (profile.secondPropertyEMI || 0) +
      foodActual +
      transportActual +
      utilityActual +
      domesticActual +
      (profile.kidsSchoolFees || 0) +
      (profile.kidsActivities || 0) +
      (profile.parentsSupport || 0);
  const loans = analysis.loansActual || 0;
  const wants = analysis.wantsActual || lifestyleActual;
  const invested = analysis.investmentActual || 0;
  const surplus = Math.max(0, income - needs - loans - wants - invested);

  const age = profile.selfAge || 30;
  const stage = normalizeStage(profile.lifeStage || "bachelor");
  const city = profile.city || profile.cityTier || "metro";
  const kids = Array.isArray(profile.kidsAges) ? profile.kidsAges : profile.kids || [];

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

  const emergencyTarget = needs * emergencyMonthsNeeded;
  const emergencyCurrent =
    (profile.savingsAccountBalance || 0) * 1.0 +
    (profile.liquidMFValue || 0) * 0.95 +
    (profile.fdValue || 0) * 0.7 +
    (profile.otherLiquidSavings || 0) * 0.5;
  const emergencyMonthsCovered = needs > 0 ? emergencyCurrent / needs : 0;
  const emergencyGap = Math.max(0, emergencyTarget - emergencyCurrent);

  priorities.push({
    rank: rank++,
    id: "emergency_fund",
    title: "Emergency fund",
    category: "safety",
    urgency: emergencyMonthsCovered < 2 ? "critical" : emergencyMonthsCovered < 4 ? "high" : "medium",
    status:
      emergencyMonthsCovered >= emergencyMonthsNeeded
        ? "complete"
        : emergencyMonthsCovered >= emergencyMonthsNeeded * 0.5
          ? "partial"
          : "missing",
    currentAmount: Math.round(emergencyCurrent),
    targetAmount: Math.round(emergencyTarget),
    gap: Math.round(emergencyGap),
    monthlyContribution: emergencyGap > 0 ? Math.round(Math.min(surplus * 0.4, emergencyGap / 12)) : 0,
    monthsToComplete: emergencyGap > 0 && surplus > 0 ? Math.ceil(emergencyGap / (surplus * 0.4)) : 0,
    instrument: "Liquid Mutual Fund + Savings account",
    actionThisWeek:
      emergencyGap > 0
        ? `Transfer ₹${Math.round(Math.min(emergencyCurrent * 0.3, 50000)).toLocaleString("en-IN")} to liquid MF today. Start ₹${Math.round(emergencyGap / 12).toLocaleString("en-IN")}/month SIP in liquid fund.`
        : "Emergency fund complete. Well done.",
    whyThisMatters: `If your income stops tomorrow you need ${emergencyMonthsNeeded} months to recover.`,
    icon: "🛡️",
    canBuyFromFinkoin: false,
  });

  const medicalTarget = 200000;
  const medicalCurrent = Math.min((profile.liquidMFValue || 0) * 0.5, medicalTarget);
  const medicalGap = Math.max(0, medicalTarget - medicalCurrent);
  priorities.push({
    rank: rank++,
    id: "medical_fund",
    title: "Medical emergency fund",
    category: "safety",
    urgency: medicalCurrent === 0 ? "critical" : "high",
    status: medicalCurrent >= medicalTarget ? "complete" : medicalCurrent > 0 ? "partial" : "missing",
    currentAmount: Math.round(medicalCurrent),
    targetAmount: medicalTarget,
    gap: Math.round(medicalGap),
    monthlyContribution: medicalGap > 0 ? Math.round(Math.min(surplus * 0.2, medicalGap / 6)) : 0,
    monthsToComplete: medicalGap > 0 ? 6 : 0,
    instrument: "Liquid Mutual Fund",
    actionThisWeek: medicalGap > 0 ? `Invest ₹${Math.round(medicalGap / 6).toLocaleString("en-IN")}/month.` : "Medical fund ready.",
    whyThisMatters: "Insurance has waiting periods; you need cash for immediate hospitalization.",
    icon: "🏥",
    canBuyFromFinkoin: false,
  });

  const annualIncome = income * 12;
  const ageMultiplier =
    age < 30 ? 1.2 : age < 40 ? 1.0 : age < 50 ? 0.8 : 0.6;
  const liabilities =
    (profile.homeLoanOutstanding ||
      (profile.homeLoanEMI || 0) * 12 * 10) +
    (profile.carLoanOutstanding ||
      (profile.carLoanEMI || 0) * 12 * 3);
  const equityTotal =
    (profile.totalEquityValue || 0) > 0
      ? (profile.totalEquityValue || 0)
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
    profile.termInsuranceSumAssured ||
    profile.termInsuranceCover ||
    0;
  const termGap = Math.max(0, termNeeded - termHave);
  const termPremiumEst =
    age < 30
      ? Math.round(termGap / 10000000 * 850)
      : age < 35
        ? Math.round(termGap / 10000000 * 1200)
        : age < 40
          ? Math.round(termGap / 10000000 * 1700)
          : Math.round(termGap / 10000000 * 2500);

  if (termGap > 0) {
    priorities.push({
      rank: rank++,
      id: "term_insurance",
      title: termHave === 0
        ? "Buy term insurance"
        : "Increase term cover",
      category: "insurance",
      urgency: termHave === 0
        ? "critical" : "high",
      status: termHave === 0
        ? "missing"
        : termHave >= termNeeded
          ? "complete" : "partial",
      currentAmount: termHave,
      targetAmount: termNeeded,
      gap: termGap,
      monthlyContribution: termPremiumEst,
      monthsToComplete: 1,
      instrument: "HDFC Click2Protect or Max Life Smart Secure — pure term only",
      actionThisWeek: `Compare 3 term insurance quotes online. Budget ₹${termPremiumEst.toLocaleString("en-IN")}/month for ₹${(termGap / 10000000).toFixed(1)} crore cover.`,
      whyThisMatters: termHave === 0
        ? "Your family has zero income if you pass away. All EMIs continue with no salary."
        : `Gap of ₹${(termGap / 10000000).toFixed(1)} crore leaves family underprotected.`,
      icon: "🛡️",
      canBuyFromFinkoin: true,
      finkoinProductType: "term",
    });
  }

  const healthNeeded =
    stage === "bachelor"
      ? 500000
      : (profile.numberOfKids || 0) > 0
        ? 2000000
        : 1000000;
  const healthHave =
    profile.healthInsuranceSumInsured ||
    profile.healthInsuranceCover ||
    0;
  const healthGap = Math.max(0, healthNeeded - healthHave);
  const healthPremiumEst =
    (profile.numberOfKids || 0) > 0
      ? 2000
      : stage !== "bachelor" ? 1500 : 1000;

  if (healthGap > 0) {
    priorities.push({
      rank: rank++,
      id: "health_insurance",
      title: healthHave === 0
        ? "Buy health insurance"
        : "Increase health cover",
      category: "insurance",
      urgency: healthHave === 0
        ? "critical" : "high",
      status: healthHave === 0
        ? "missing"
        : healthHave >= healthNeeded
          ? "complete" : "partial",
      currentAmount: healthHave,
      targetAmount: healthNeeded,
      gap: healthGap,
      monthlyContribution: healthPremiumEst,
      monthsToComplete: 1,
      instrument: "HDFC ERGO Optima or Niva Bupa ReAssure — family floater",
      actionThisWeek: `Get ₹${(healthNeeded / 100000).toFixed(0)} lakh health cover. Compare on Policybazaar or Finkoin insurance.`,
      whyThisMatters: "One hospitalisation in metro costs ₹2-5 lakh. Without cover your savings get wiped.",
      icon: "🏥",
      canBuyFromFinkoin: true,
      finkoinProductType: "health",
    });
  }

  const kidsWithDemographics = profile.kidsAges
    ? (profile.kidsAges as number[])
      .map((kidAge: number, i: number) => ({
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
      monthlyContribution: 12500,
      monthsToComplete: (21 - girl.age) * 12,
      instrument: "Sukanya Samriddhi Yojana at Post Office or SBI/HDFC Bank",
      actionThisWeek: isUrgent
        ? `OPEN THIS WEEK. Only ${monthsLeft} months left before window closes forever. Visit post office with daughter Aadhaar.`
        : "Open SSY account at post office. Start ₹12,500/month. 8.2% guaranteed tax-free.",
      whyThisMatters: `SSY gives 8.2% guaranteed returns completely tax-free. ${isUrgent ? `Account CANNOT open after she turns 10. Only ${monthsLeft} months left.` : "Best safe investment for girl child in India."}`,
      icon: "👧",
      canBuyFromFinkoin: false,
    });
  });

  const DEBT_CONFIG = [
    { profileKey: "creditCardBillMonthly", type: "Credit card", rate: 36, icon: "💳", priority: 1 },
    { profileKey: "personalLoanEMI", type: "Personal loan", rate: 16, icon: "💰", priority: 2 },
    { profileKey: "bikeEMI", type: "Bike loan", rate: 14, icon: "🏍️", priority: 3 },
    { profileKey: "carLoanEMI", type: "Car loan", rate: 9, icon: "🚗", priority: 4 },
    { profileKey: "homeLoanEMI", type: "Home loan", rate: 8.5, icon: "🏠", priority: 5 },
  ] as const;

  const debtList: DebtItem[] = [];
  const estimateOutstanding = (
    emi: number,
    loanType: string,
  ): number => {
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
        Math.round(surplus * 0.15),
      );
      const monthsToClear = extraEMI > 0
        ? Math.ceil(outstanding / (emi + extraEMI))
        : Math.ceil(outstanding / emi);

      debtList.push({
        type: config.type,
        lenderName:
          config.profileKey === "personalLoanEMI"
            ? (profile.personalLoanLenderName || "")
            : config.profileKey === "carLoanEMI"
              ? (profile.carLoanLenderName || "")
              : config.profileKey === "bikeEMI"
                ? (profile.bikeLoanLenderName || "")
                : config.profileKey === "homeLoanEMI"
                  ? (profile.homeLoanLenderName || "")
                  : "",
        displayName:
          config.profileKey === "personalLoanEMI"
            ? (profile.personalLoanLenderName
                ? `Personal loan (${profile.personalLoanLenderName})`
                : "Personal loan")
            : config.profileKey === "carLoanEMI"
              ? (profile.carLoanLenderName
                  ? `Car loan (${profile.carLoanLenderName})`
                  : "Car loan")
              : config.profileKey === "bikeEMI"
                ? (profile.bikeLoanLenderName
                    ? `Bike loan (${profile.bikeLoanLenderName})`
                    : "Bike loan")
                : config.profileKey === "homeLoanEMI"
                  ? (profile.homeLoanLenderName
                      ? `Home loan (${profile.homeLoanLenderName})`
                      : "Home loan")
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

  const additionalDebts =
    (profile.additionalObligations || [])
      .filter((o: any) => o.monthlyAmount > 0);

  additionalDebts.forEach((debt: any, i: number) => {
    const emi = debt.monthlyAmount || 0;
    const outstanding = debt.outstandingAmount || emi * 18;
    const rate = debt.rateOfInterest || debt.loanTakenYear || 0;
    const remainingMonths = debt.remainingMonths || debt.tenureMonths || 18;
    debtList.push({
      type: debt.type || `Obligation ${i + 1}`,
      lenderName: debt.lenderName || "",
      displayName: debt.lenderName ? `${debt.type} (${debt.lenderName})` : debt.type,
      outstanding,
      emi,
      rate,
      priorityRank: 5 + i,
      extraEMIRecommended: Math.min(Math.round(emi * 0.3), Math.round(surplus * 0.1)),
      monthsToClearWithExtra: remainingMonths,
      icon: "🏦",
    });
  });

  debtList.sort((a, b) =>
    a.priorityRank - b.priorityRank);

  const goalList: GoalItem[] = [];
  const primaryGoal =
    profile.primaryGoal || "grow_wealth";

  if (primaryGoal === "buy_house" ||
    profile.homePurchaseTarget) {
    const target =
      (profile.homePurchaseTarget || 5000000) * 0.6;
    const saved = profile.savingsAccountBalance || 0;
    const gap = Math.max(0, target - saved);
    const yearsToGoal = surplus > 0
      ? Math.ceil(gap / (surplus * 0.3) / 12)
      : 7;

    goalList.push({
      goalType: "buy_house",
      targetAmount: Math.round(target),
      currentSaved: Math.round(saved),
      monthlyRequired: Math.round(gap /
        Math.max(1, yearsToGoal * 12)),
      yearsToGoal,
      instrument: yearsToGoal > 5
        ? "Nifty 50 Index Fund SIP"
        : "Recurring Deposit + Debt MF",
      readyToStart: priorities.filter(
        (p) => p.urgency === "critical" &&
          p.status !== "complete").length === 0,
      blockedBy: priorities.find(
        (p) => p.urgency === "critical" &&
          p.status !== "complete")?.title || null,
      icon: "🏠",
    });
  }

  if (primaryGoal === "buy_car" &&
    !profile.ownsCar) {
    const carTarget =
      profile.carPurchaseTarget || 800000;
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

  if (primaryGoal === "retire_fire" ||
    primaryGoal === "grow_wealth") {
    const annualExpenses =
      (analysis.needsActual || 0) * 12;
    const fireTarget = annualExpenses * 25;
    const currentCorpus =
      (profile.mfValue || 0) +
      (profile.epfBalance || 0) +
      (profile.ppfBalance || 0) +
      (profile.npsBalance || 0);
    const fireGap = Math.max(0,
      fireTarget - currentCorpus);
    const retireAge =
      profile.retirementAge || 60;
    const yearsToRetire = Math.max(1,
      retireAge - age);

    goalList.push({
      goalType: "retire_fire",
      targetAmount: Math.round(fireTarget),
      currentSaved: Math.round(currentCorpus),
      monthlyRequired: Math.round(
        fireGap / (yearsToRetire * 12 * 1.1)),
      yearsToGoal: yearsToRetire,
      instrument: age < 40
        ? "Nifty 50 Index Fund + NPS"
        : "Index Fund + PPF + NPS",
      readyToStart: priorities.filter(
        (p) => p.urgency === "critical" &&
          p.status !== "complete").length < 2,
      blockedBy: null,
      icon: "🔥",
    });
  }

  const scoreToday = analysis.overallScore || 0;
  const criticalCount = priorities.filter(
    (p) => p.urgency === "critical" &&
      p.status !== "complete").length;
  const highCount = priorities.filter(
    (p) => p.urgency === "high" &&
      p.status !== "complete").length;
  const mediumCount = priorities.filter(
    (p) => p.urgency === "medium" &&
      p.status !== "complete").length;

  const scoreGainIfFixed =
    criticalCount * 15 +
    highCount * 8 +
    mediumCount * 4;

  const scoreAfter12Months = Math.min(100,
    scoreToday + Math.round(scoreGainIfFixed * 0.7));

  const BEST_FD_RATES_2024 = [
    { bank: "IDFC First Bank", rate: 7.9 },
    { bank: "DCB Bank", rate: 7.9 },
    { bank: "Unity Small Finance Bank", rate: 9.0 },
    { bank: "Utkarsh Small Finance Bank", rate: 8.5 },
    { bank: "SBM Bank", rate: 8.25 },
    { bank: "AU Small Finance Bank", rate: 8.1 },
  ];
  const bestFd = BEST_FD_RATES_2024.reduce((best, row) => (row.rate > best.rate ? row : best), BEST_FD_RATES_2024[0]);
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
    monthlyIncome: income,
    monthlySurplus: surplus,
    allocationPlan: [],
    scoreToday,
    scoreAfter12Months,
    topAction: priorities.find((p) => p.status !== "complete")?.actionThisWeek || "All priorities complete!",
    fdSuggestion,
  };
}
