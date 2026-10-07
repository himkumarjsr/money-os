import type { FinancialProfile } from "@/lib/analyse-form-schema";
import {
  calculateTermNeeded,
  computeRealEmergencyFund,
  medicalEmergencyTarget,
  monthlyInsuranceTotal,
  monthlyTotalIncome,
} from "@/lib/financialEngine";
import { getUniversalBucketActuals } from "@/lib/universal-buckets";

function n(v: number | undefined): number {
  return v ?? 0;
}

export type OptimizerUrgency = "critical" | "high" | "medium";

export interface MandatoryFund {
  fundName: string;
  purpose: string;
  targetAmount: number;
  currentAmount: number;
  gap: number;
  whereToKeep: string;
  whyThisPlace: string;
  urgency: OptimizerUrgency;
  monthsToFill: number;
  monthlyContribution: number;
  isComplete: boolean;
}

export interface AssetReallocation {
  currentAsset: string;
  currentAmount: number;
  currentReturn: string;
  problem: string;
  suggestedAsset: string;
  suggestedReturn: string;
  benefit: string;
  amountToMove: number;
  howToDoIt: string;
}

export interface MonthlyAllocation {
  category: string;
  amount: number;
  percentage: number;
  purpose: string;
  where: string;
  priority: number;
}

export interface InvestmentPlan {
  goalName: string;
  targetAmount: number;
  targetYear: number;
  timeHorizon: number;
  recommendedInstrument: string;
  monthlyRequired: number;
  expectedReturn: number;
  reasoning: string;
  riskLevel: "low" | "medium" | "high";
}

export interface InsuranceSuggestion {
  type: string;
  needed: boolean;
  currentCover: number;
  recommendedCover: number;
  gap: number;
  monthlyPremiumEstimate: number;
  productSuggestion: string;
  urgency: string;
  buyFromFinkoin: boolean;
  /** For deep-linking compare / policies flows */
  policyHint?: "term" | "health" | "car" | "parents_health";
}

export interface FDStrategy {
  totalFDAmount: number;
  keepInFD: number;
  keepInFDReason: string;
  moveToKVP: number;
  moveToKVPReason: string;
  useForCreditCard: number;
  useForCreditCardReason: string;
  moveToLiquidMF: number;
  moveToLiquidMFReason: string;
}

export interface KVPStrategy {
  applicable: boolean;
  totalYearlyPremiums: number;
  kvpAmountNeeded: number;
  kvpInterestYearly: number;
  rdMonthlyAmount: number;
  yearsToBeSelfSustaining: number;
  explanation: string;
}

export interface TimelineStep {
  month: number;
  action: string;
  amount: number;
  instrument: string;
  reason: string;
}

export interface OptimizerPlan {
  totalMonthlyIncome: number;
  totalMonthlySurplus: number;
  totalMonthlyOutflow: number;
  mandatoryFunds: MandatoryFund[];
  assetReallocation: AssetReallocation[];
  monthlyAllocation: MonthlyAllocation[];
  investmentPlan: InvestmentPlan[];
  insuranceSuggestions: InsuranceSuggestion[];
  fdStrategy: FDStrategy;
  kvpStrategy: KVPStrategy;
  timeline: TimelineStep[];
  monthlyActionPlan: string[];
}

/** Optional overrides; if omitted, values are derived from the profile. */
export type OptimizerAnalysisInput = Partial<{
  needsActual: number;
  wantsActual: number;
  loansActual: number;
  investmentActual: number;
  securityActual: number;
}>;

export function buildOptimizerAnalysisFromProfile(
  profile: FinancialProfile,
): Required<OptimizerAnalysisInput> {
  const b = getUniversalBucketActuals(profile);
  return {
    needsActual: b.needs,
    wantsActual: b.wants,
    loansActual: b.loans,
    investmentActual: b.investment,
    securityActual: b.security,
  };
}

function youngestChildAge(p: FinancialProfile): number {
  const ages = p.kidsAges ?? [];
  if (ages.length === 0) return n(p.numberOfKids) > 0 ? 8 : 0;
  return Math.min(...ages.map((a) => n(a)));
}

function findGirlChildAge(p: FinancialProfile): number | undefined {
  const ages = p.kidsAges ?? [];
  const genders = p.kidsGenders ?? [];
  for (let i = 0; i < ages.length; i++) {
    if (genders[i] === "girl") return n(ages[i]);
  }
  return undefined;
}

function hasGirlChildUnder10(p: FinancialProfile): boolean {
  const a = findGirlChildAge(p);
  return a !== undefined && a < 10;
}

function fmtIn(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/**
 * Full rupee allocation plan from profile + bucket actuals (same basis as the health report).
 */
export function optimizeFinances(
  profile: FinancialProfile,
  analysis?: OptimizerAnalysisInput | null,
): OptimizerPlan {
  const buckets = getUniversalBucketActuals(profile);
  const needsActual = analysis?.needsActual ?? buckets.needs;
  const wantsActual = analysis?.wantsActual ?? buckets.wants;
  const loansActual = analysis?.loansActual ?? buckets.loans;
  const investmentActual = analysis?.investmentActual ?? buckets.investment;
  const securityActual = analysis?.securityActual ?? buckets.security;

  const totalIncome = monthlyTotalIncome(profile);
  const totalMonthlyOutflow =
    needsActual + wantsActual + loansActual + investmentActual + securityActual;
  const monthlySurplus = Math.max(0, totalIncome - totalMonthlyOutflow);

  const age = n(profile.selfAge) || 30;
  const numberOfKids = n(profile.numberOfKids);
  const girlChildAge = findGirlChildAge(profile);
  const hasParents = n(profile.parentsSupport) > 0;

  const savingsAccount = n(profile.savingsAccountBalance);
  const fdValue = n(profile.fdValue);
  const liquidMF = n(profile.liquidMFValue);

  const insuranceMonthly = monthlyInsuranceTotal(profile);
  const totalInsuranceYearly = insuranceMonthly * 12;

  const er = computeRealEmergencyFund(profile);
  const realEmergencyFund = er.realTotal;
  const liquidLayerAccessible =
    er.savingsCounted + er.liquidCounted + er.otherCounted;
  const emergencyTarget = needsActual * 6;
  const liquidityLayerGap = Math.max(
    0,
    emergencyTarget - liquidLayerAccessible,
  );

  const mandatoryFunds: MandatoryFund[] = [];

  // 1. Bereavement (when supporting parents)
  if (hasParents) {
    const bereavementTarget = 2_00_000;
    const bereavementCurrent = Math.min(
      n(profile.bereavementFund),
      bereavementTarget,
    );
    const gap = Math.max(0, bereavementTarget - bereavementCurrent);
    const monthlyContribution = Math.min(
      monthlySurplus * 0.3,
      gap > 0 ? gap / 6 : 0,
    );
    mandatoryFunds.push({
      fundName: "Bereavement fund",
      purpose:
        "Immediate expenses when a parent or close family member passes — travel, rituals, urgent cash.",
      targetAmount: bereavementTarget,
      currentAmount: bereavementCurrent,
      gap,
      whereToKeep: "Savings account ONLY",
      whyThisPlace: "Must be available instantly. No lock-in. No market risk.",
      urgency: "critical",
      monthsToFill:
        gap <= 0 ? 0 : Math.ceil(gap / Math.max(1_000, monthlySurplus * 0.3)),
      monthlyContribution,
      isComplete: bereavementCurrent >= bereavementTarget,
    });
  }

  // 2. Medical emergency (beyond insurance)
  const medicalTarget = medicalEmergencyTarget(profile);
  let medicalCurrent = n(profile.medicalEmergencyFund);
  if (medicalCurrent <= 0) {
    medicalCurrent = Math.min(liquidMF + savingsAccount * 0.3, medicalTarget);
  }
  const medGap = Math.max(0, medicalTarget - medicalCurrent);
  const medMonthly = Math.min(
    monthlySurplus * 0.2,
    medGap > 0 ? medGap / 6 : 0,
  );
  mandatoryFunds.push({
    fundName: "Medical emergency fund",
    purpose:
      "Hospital bills not fully covered by insurance — deductibles, exclusions, co-pay, waiting periods.",
    targetAmount: medicalTarget,
    currentAmount: Math.round(medicalCurrent),
    gap: medGap,
    whereToKeep: "Liquid mutual fund",
    whyThisPlace:
      "Withdraw in ~24 hours, no FD-style penalty, typically ~6.5–7% vs ~3–4% in savings.",
    urgency: medicalCurrent < medicalTarget * 0.5 ? "critical" : "high",
    monthsToFill:
      medGap <= 0
        ? 0
        : Math.ceil(medGap / Math.max(1_000, monthlySurplus * 0.2)),
    monthlyContribution: medMonthly,
    isComplete: medicalCurrent >= medicalTarget,
  });

  // 3. Insurance payment reserve (KVP ladder)
  if (totalInsuranceYearly > 0) {
    const insuranceFundTarget = totalInsuranceYearly;
    mandatoryFunds.push({
      fundName: "Insurance payment fund",
      purpose: `Cover yearly premiums (${fmtIn(totalInsuranceYearly)}/year) without scrambling each renewal.`,
      targetAmount: insuranceFundTarget,
      currentAmount: 0,
      gap: insuranceFundTarget,
      whereToKeep: "Kisan Vikas Patra (KVP) + post office RD ladder",
      whyThisPlace:
        "Government-backed, predictable accrual. Pair with a short RD so renewals are funded from a maturity, not salary.",
      urgency: "high",
      monthsToFill: Math.ceil(
        insuranceFundTarget / Math.max(1_000, monthlySurplus * 0.2),
      ),
      monthlyContribution: Math.min(
        monthlySurplus * 0.2,
        insuranceFundTarget / 12,
      ),
      isComplete: false,
    });
  }

  // 4. Emergency fund (weighted accessible corpus — same as health engine)
  const emMonths =
    er.monthlyExpenses > 0 ? realEmergencyFund / er.monthlyExpenses : 0;
  const emGap = Math.max(0, emergencyTarget - realEmergencyFund);
  const emMonthly = Math.min(monthlySurplus * 0.3, emGap > 0 ? emGap / 12 : 0);
  mandatoryFunds.push({
    fundName: "Emergency fund",
    purpose:
      "Six months of essential expenses if income stops — weighted for how fast you can access cash.",
    targetAmount: emergencyTarget,
    currentAmount: Math.round(realEmergencyFund),
    gap: emGap,
    whereToKeep: "Split: savings (instant) + liquid mutual fund (rest)",
    whyThisPlace:
      "Savings for same-day needs; liquid MF for the bulk with better return and quick redemption.",
    urgency: emMonths < 3 ? "critical" : emMonths < 6 ? "high" : "medium",
    monthsToFill:
      emGap <= 0 ? 0 : Math.ceil(emGap / Math.max(1_000, monthlySurplus * 0.3)),
    monthlyContribution: emMonthly,
    isComplete: realEmergencyFund >= emergencyTarget,
  });

  // 5. Kids education
  if (numberOfKids > 0) {
    const perChild =
      n(profile.kidsEducationFundTarget) > 0
        ? n(profile.kidsEducationFundTarget)
        : 25_00_000;
    const educationTarget = perChild * numberOfKids;
    const yChild = youngestChildAge(profile);
    const yearsToGoal = Math.max(1, 18 - yChild);
    const growthFactor = yearsToGoal > 10 ? 1.15 : yearsToGoal > 5 ? 1.07 : 1;
    const instrument =
      yearsToGoal > 10
        ? "ELSS / diversified equity MF"
        : yearsToGoal > 5
          ? "Mix of PPF + short-duration debt MF"
          : "Debt mutual fund + RD (capital protection)";
    const monthlyEdu = Math.round(
      educationTarget / (yearsToGoal * 12 * growthFactor),
    );
    mandatoryFunds.push({
      fundName: "Kids education fund",
      purpose: `Graduation and post-graduation for ${numberOfKids} child${numberOfKids > 1 ? "ren" : ""}.`,
      targetAmount: educationTarget,
      currentAmount: 0,
      gap: educationTarget,
      whereToKeep: instrument,
      whyThisPlace:
        yearsToGoal > 10
          ? "Long horizon allows equity compounding; keep goal-tagged SIPs separate."
          : yearsToGoal > 5
            ? "Blends safety (PPF) with flexibility (debt MF)."
            : "Short horizon — limit equity; protect principal.",
      urgency: yearsToGoal < 5 ? "critical" : "medium",
      monthsToFill: yearsToGoal * 12,
      monthlyContribution: monthlyEdu,
      isComplete: false,
    });
  }

  // 6. SSY for girl child under 10
  if (
    hasGirlChildUnder10(profile) &&
    girlChildAge !== undefined &&
    girlChildAge < 10
  ) {
    const ssyYearsLeft = Math.max(1, 21 - girlChildAge);
    const ssyTarget = 25_00_000;
    const ssyMonthly = Math.round(ssyTarget / (ssyYearsLeft * 12 * 1.082));
    mandatoryFunds.push({
      fundName: "Sukanya Samriddhi Yojana",
      purpose:
        "Girl child education / marriage — government scheme with EEE tax treatment (subject to rules).",
      targetAmount: ssyTarget,
      currentAmount: 0,
      gap: ssyTarget,
      whereToKeep: "SSY at post office or authorised bank",
      whyThisPlace:
        "Purpose-built for girl child; long lock-in enforces discipline — confirm current rates and limits.",
      urgency: girlChildAge >= 9 ? "critical" : "high",
      monthsToFill: ssyYearsLeft * 12,
      monthlyContribution: ssyMonthly,
      isComplete: false,
    });
  }

  // FD reallocation
  let fdForCreditCard = 0;
  let fdForKVP = 0;
  let fdForLiquidMF = 0;

  if (fdValue > 0) {
    fdForCreditCard = Math.min(fdValue, needsActual * 2);
    let remainder = fdValue - fdForCreditCard;
    fdForKVP = Math.min(remainder, totalInsuranceYearly);
    remainder -= fdForKVP;
    fdForLiquidMF = Math.min(remainder, liquidityLayerGap);
    remainder -= fdForLiquidMF;
    void remainder;
  }

  const fdToKeep = Math.max(
    0,
    fdValue - fdForCreditCard - fdForKVP - fdForLiquidMF,
  );

  const fdStrategy: FDStrategy = {
    totalFDAmount: fdValue,
    keepInFD: Math.round(fdToKeep),
    keepInFDReason:
      fdToKeep > 0
        ? "Remaining FD keeps earning until maturity; revisit on rollover so it matches your liquidity ladder."
        : "No residual FD left after this split — renew only if it fits your revised liquidity plan.",
    moveToKVP: Math.round(fdForKVP),
    moveToKVPReason:
      totalInsuranceYearly > 0
        ? `Size roughly one year of premiums (${fmtIn(totalInsuranceYearly)}) in government-backed instruments; renewals then draw from this ladder instead of salary.`
        : "Low / no premiums on file — you can skip KVP until insurance outflows are known.",
    useForCreditCard: Math.round(fdForCreditCard),
    useForCreditCardReason:
      fdForCreditCard > 0
        ? `Keep ${fmtIn(fdForCreditCard)} as lien-backed FD if your bank offers a secured card — useful for medical spikes; pay from reimbursement/claims where possible.`
        : "No FD slice earmarked for a secured card — optional if you already have enough unsecured liquidity.",
    moveToLiquidMF: Math.round(fdForLiquidMF),
    moveToLiquidMFReason:
      fdForLiquidMF > 0
        ? `Shift ${fmtIn(fdForLiquidMF)} to liquid MF so “instant” emergency money is not trapped behind FD break penalties.`
        : liquidityLayerGap <= 0
          ? "Savings + liquid MF already cover your 6-month liquidity layer; FD can stay until maturity unless you want zero penalty liquidity."
          : "No FD left to move after higher-priority slices.",
  };

  const kvpStrategy: KVPStrategy = {
    applicable: totalInsuranceYearly > 0,
    totalYearlyPremiums: Math.round(totalInsuranceYearly),
    kvpAmountNeeded: Math.round(totalInsuranceYearly),
    kvpInterestYearly: Math.round(totalInsuranceYearly * 0.075),
    rdMonthlyAmount: Math.round(totalInsuranceYearly / 12),
    yearsToBeSelfSustaining: 3,
    explanation: `How to take insurance renewals off your salary (educational model, not a promise of returns):

• Year 1: Build roughly ${fmtIn(totalInsuranceYearly)} in government small savings (e.g. KVP ladder) and run a monthly RD of ~${fmtIn(totalInsuranceYearly / 12)} toward next renewal.
• Year 2: Use RD maturity for renewal; recycle KVP interest into the next RD.
• By year 3+: Premiums can ride on maturing ladders; salary stays freer for investing.

Rates and tax treatment change — verify on RBI / India Post notices before you commit.`,
  };

  const incompleteFunds = mandatoryFunds
    .filter((f) => !f.isComplete)
    .sort((a, b) => {
      const order: Record<OptimizerUrgency, number> = {
        critical: 0,
        high: 1,
        medium: 2,
      };
      return order[a.urgency] - order[b.urgency];
    });

  let remainingSurplus = monthlySurplus;
  const monthlyAllocation: MonthlyAllocation[] = [];

  incompleteFunds.forEach((fund, index) => {
    const allocation = Math.min(remainingSurplus, fund.monthlyContribution);
    if (allocation > 0) {
      monthlyAllocation.push({
        category: fund.fundName,
        amount: Math.round(allocation),
        percentage:
          totalIncome > 0 ? Math.round((allocation / totalIncome) * 100) : 0,
        purpose: fund.purpose,
        where: fund.whereToKeep,
        priority: index + 1,
      });
      remainingSurplus -= allocation;
    }
  });

  if (remainingSurplus > 0) {
    monthlyAllocation.push({
      category: "Wealth building",
      amount: Math.round(remainingSurplus),
      percentage:
        totalIncome > 0
          ? Math.round((remainingSurplus / totalIncome) * 100)
          : 0,
      purpose:
        "Long-term wealth after safety nets — increase only when buckets above are funded.",
      where:
        age < 40
          ? "Low-cost index fund (e.g. Nifty 50) via SIP"
          : "Blend of PPF + debt MF + moderate equity per risk profile",
      priority: incompleteFunds.length + 1,
    });
  }

  const insuranceSuggestions: InsuranceSuggestion[] = [];

  const termNeeded = calculateTermNeeded(profile);
  const termHave = profile.hasTermInsurance
    ? n(profile.termInsuranceSumAssured)
    : 0;
  if (termHave < termNeeded) {
    insuranceSuggestions.push({
      type: "Term life insurance",
      needed: true,
      currentCover: termHave,
      recommendedCover: termNeeded,
      gap: termNeeded - termHave,
      monthlyPremiumEstimate:
        age < 30 ? 800 : age < 35 ? 1_200 : age < 40 ? 1_800 : 2_500,
      productSuggestion:
        "Compare pure-term plans from 2–3 insurers on cover, riders, and claim-settlement record.",
      urgency: termHave === 0 ? "Buy this week" : "Top up within 30 days",
      buyFromFinkoin: true,
      policyHint: "term",
    });
  }

  const healthNeeded =
    profile.cityTier === "metro"
      ? numberOfKids > 0
        ? 20_00_000
        : 10_00_000
      : 7_00_000;
  const healthHave = profile.hasHealthInsurance
    ? n(profile.healthInsuranceSumInsured)
    : 0;
  if (healthHave < healthNeeded) {
    insuranceSuggestions.push({
      type: "Health insurance (family floater)",
      needed: true,
      currentCover: healthHave,
      recommendedCover: healthNeeded,
      gap: healthNeeded - healthHave,
      monthlyPremiumEstimate: numberOfKids > 0 ? 1_800 : 1_200,
      productSuggestion:
        "Compare floater plans from 2–3 insurers on room rent, co-pay, and exclusions.",
      urgency: healthHave === 0 ? "Buy this week" : "Increase cover this month",
      buyFromFinkoin: true,
      policyHint: "health",
    });
  }

  if (
    profile.ownsCar &&
    (n(profile.carMarketValue) > 0 || n(profile.carLoanEMI) > 0)
  ) {
    insuranceSuggestions.push({
      type: "Car insurance",
      needed: true,
      currentCover: 0,
      recommendedCover: n(profile.carMarketValue),
      gap: n(profile.carMarketValue),
      monthlyPremiumEstimate: 500,
      productSuggestion:
        "Comprehensive OD + TP; add zero-dep if the car is new.",
      urgency: "Renew before expiry — avoid a break in own-damage cover",
      buyFromFinkoin: true,
      policyHint: "car",
    });
  }

  if (hasParents) {
    const pCover = n(profile.parentsHealthInsuranceSumInsured);
    const pTarget = 5_00_000;
    insuranceSuggestions.push({
      type: "Parents health insurance",
      needed: pCover < pTarget,
      currentCover: pCover,
      recommendedCover: pTarget,
      gap: Math.max(0, pTarget - pCover),
      monthlyPremiumEstimate: 2_500,
      productSuggestion:
        "Senior-focused health plans — watch co-pay, disease-wise caps and waiting periods.",
      urgency:
        pCover < pTarget
          ? "High — elder hospital bills are lumpy"
          : "Review at renewal",
      buyFromFinkoin: true,
      policyHint: "parents_health",
    });
  }

  const timeline: TimelineStep[] = [];

  if (hasParents) {
    timeline.push({
      month: 0,
      action: "Ring-fence bereavement cash in a dedicated savings pot",
      amount: Math.min(2_00_000, n(profile.bereavementFund)),
      instrument: "Savings account",
      reason: "Must be callable in hours, not days.",
    });
  }

  timeline.push({
    month: 1,
    action: "Start insurance renewal RD + open KVP ladder (if premiums > 0)",
    amount: Math.round(totalInsuranceYearly / 12),
    instrument: "Post office RD + KVP",
    reason: "Build the first renewal wall away from salary.",
  });

  if (fdForKVP > 0) {
    timeline.push({
      month: 1,
      action: "Roll maturing / breakable FD slice into KVP ladder",
      amount: Math.round(fdForKVP),
      instrument: "Kisan Vikas Patra",
      reason: "Aligns lump sums with guaranteed small savings for renewals.",
    });
  }

  if (fdForLiquidMF > 0) {
    timeline.push({
      month: 2,
      action: "Move FD tranche to liquid mutual fund",
      amount: Math.round(fdForLiquidMF),
      instrument: "Liquid MF",
      reason: "Penalty-free liquidity for the 6-month layer.",
    });
  }

  timeline.push({
    month: 3,
    action: hasGirlChildUnder10(profile)
      ? "Open / step up SSY before the girl child turns 10"
      : numberOfKids > 0
        ? "Start goal-tagged education SIP"
        : "Top up liquid emergency layer",
    amount: hasGirlChildUnder10(profile)
      ? Math.round(totalInsuranceYearly / 12)
      : 5_000,
    instrument: hasGirlChildUnder10(profile)
      ? "SSY"
      : numberOfKids > 0
        ? "Equity / hybrid MF"
        : "Liquid MF",
    reason: hasGirlChildUnder10(profile)
      ? "SSY has a hard age gate — don’t miss the window."
      : "Compounding needs time; start small if needed.",
  });

  timeline.push({
    month: 6,
    action: "Review optimizer allocations vs actual bank balances",
    amount: 0,
    instrument: "Checklist",
    reason: "Rebalance after bonus, rent change, or new loan.",
  });

  if (totalInsuranceYearly > 0) {
    timeline.push({
      month: 12,
      action: "Pay next insurance renewal from RD / liquid ladder (not salary)",
      amount: Math.round(totalInsuranceYearly),
      instrument: "RD maturity + savings",
      reason: "First full cycle of the premium firewall.",
    });
  }

  const monthlyActionPlan: string[] = [];

  const bFund = mandatoryFunds.find((f) => f.fundName === "Bereavement fund");
  const mFund = mandatoryFunds.find(
    (f) => f.fundName === "Medical emergency fund",
  );
  const eFund = mandatoryFunds.find((f) => f.fundName === "Emergency fund");

  if (bFund && bFund.monthlyContribution > 0) {
    monthlyActionPlan.push(
      `${fmtIn(bFund.monthlyContribution)}/month → Savings (bereavement) — ${bFund.purpose.slice(0, 80)}…`,
    );
  }
  if (mFund && mFund.monthlyContribution > 0) {
    monthlyActionPlan.push(
      `${fmtIn(mFund.monthlyContribution)}/month → Liquid MF (medical buffer) — builds ${fmtIn(medicalTarget)} target.`,
    );
  }
  if (totalInsuranceYearly > 0) {
    monthlyActionPlan.push(
      `${fmtIn(Math.round(totalInsuranceYearly / 12))}/month → Post office RD (insurance renewal ladder).`,
    );
  }
  if (eFund && eFund.monthlyContribution > 0) {
    monthlyActionPlan.push(
      `${fmtIn(eFund.monthlyContribution)}/month → Savings + liquid MF (weighted emergency fund top-up).`,
    );
  }
  if (
    remainingSurplus > 0 &&
    monthlyAllocation.some((a) => a.category === "Wealth building")
  ) {
    monthlyActionPlan.push(
      `${fmtIn(Math.round(remainingSurplus))}/month → Index / goal SIPs after mandatory buckets.`,
    );
  }
  if (monthlyActionPlan.length === 0 && monthlySurplus <= 0) {
    monthlyActionPlan.push(
      "No free surplus on paper — trim wants / loan EMIs or raise income before scaling investments.",
    );
  }

  const assetReallocation: AssetReallocation[] = [];
  if (fdValue > 0) {
    assetReallocation.push({
      currentAsset: "Fixed deposit",
      currentAmount: fdValue,
      currentReturn: "~6–7% taxable; premature withdrawal penalty",
      problem: "FD is not instant liquidity; breaks cost you return and time.",
      suggestedAsset:
        "Split: lien FD for card (optional) + KVP ladder + liquid MF",
      suggestedReturn:
        "Liquid MF ~6.5–7% (market) + small savings stack for renewals",
      benefit:
        "Matches each rupee to job: renewals, penalty-free emergency cash, optional secured credit.",
      amountToMove: Math.round(fdForCreditCard + fdForKVP + fdForLiquidMF),
      howToDoIt: `1) Keep ${fmtIn(fdForCreditCard)} as lien FD if you want a secured card. 2) Move ${fmtIn(fdForKVP)} into KVP / post office instruments toward premiums. 3) Shift ${fmtIn(fdForLiquidMF)} to liquid MF for instant coverage. 4) Let ${fmtIn(fdToKeep)} ride to maturity if it already fits your plan.`,
    });
  }

  if (savingsAccount > needsActual * 4 && liquidMF < needsActual * 2) {
    assetReallocation.push({
      currentAsset: "Savings account (idle cash)",
      currentAmount: savingsAccount,
      currentReturn: "~3–4%",
      problem: "Large idle balances drag long-term returns.",
      suggestedAsset: "Liquid mutual fund",
      suggestedReturn: "~6.5–7% (variable)",
      benefit:
        "Keeps T+1 liquidity while improving yield on non-instant buffer.",
      amountToMove: Math.round(
        Math.min(savingsAccount - needsActual * 3, needsActual * 3),
      ),
      howToDoIt:
        "Leave 1–2 months of expenses in savings; sweep the rest to liquid MF in 2–3 tranches.",
    });
  }

  const investmentPlan: InvestmentPlan[] = incompleteFunds.map((f) => ({
    goalName: f.fundName,
    targetAmount: f.targetAmount,
    targetYear:
      new Date().getFullYear() + Math.max(1, Math.ceil(f.monthsToFill / 12)),
    timeHorizon: f.monthsToFill,
    recommendedInstrument: f.whereToKeep,
    monthlyRequired: f.monthlyContribution,
    expectedReturn: f.whereToKeep.includes("KVP")
      ? 7.5
      : f.whereToKeep.includes("ELSS") || f.whereToKeep.includes("equity")
        ? 12
        : f.whereToKeep.includes("Liquid")
          ? 6.8
          : f.whereToKeep.includes("SSY")
            ? 8.2
            : 7.0,
    reasoning: f.whyThisPlace,
    riskLevel:
      f.whereToKeep.includes("ELSS") || f.whereToKeep.includes("equity")
        ? "high"
        : f.whereToKeep.includes("Liquid") ||
            f.whereToKeep.includes("KVP") ||
            f.whereToKeep.includes("SSY")
          ? "low"
          : "medium",
  }));

  return {
    totalMonthlyIncome: totalIncome,
    totalMonthlySurplus: monthlySurplus,
    totalMonthlyOutflow,
    mandatoryFunds,
    assetReallocation,
    monthlyAllocation,
    investmentPlan,
    insuranceSuggestions,
    fdStrategy,
    kvpStrategy,
    timeline,
    monthlyActionPlan,
  };
}
