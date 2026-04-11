import type { FinancialProfile } from "@/lib/analyse-form-schema";
import type { AnalysisResult } from "@/lib/financialEngine";
import {
  computeRealEmergencyFund,
  monthlyInsuranceTotal,
  monthlyTotalIncome,
} from "@/lib/financialEngine";
import { parseGroqRetryInText } from "@/lib/aiProviderMessages";
import { isValidFinkoinAIPlan, type FinkoinAIPlan } from "@/lib/finkoinAiPlan";
import { formatKnowledgeForPrompt, retrieveRelevantKnowledge } from "@/lib/knowledgeBase";
import { buildNetWorth } from "@/lib/netWorth";
import { getInsurancePremiumsMonthly, getUniversalBucketActuals } from "@/lib/universal-buckets";
import Groq, { RateLimitError } from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const FINKOIN_RULES = `
You are Finkoin AI — an expert personal finance advisor for India.

CORE FINANCIAL RULES YOU MUST FOLLOW:

DEBT PRIORITY ORDER (always in this order):
0. Overdraft (OD) first when the user has it — revolving credit, usually the most expensive; clear or reduce before other discretionary debt.
1. High interest debt next (>15% typical)
   Credit card, personal loan, medical loan
2. Medium interest debt (8-15%)
   Education loan, car loan, bike loan
3. Low interest debt (<8%)
   Home loan (can invest alongside this)

NEVER recommend:
- Taking personal loan for investment
- Bike loan (save and buy cash)
- Investing before clearing high interest debt

EMERGENCY FUND RULES:
- Bachelor (no dependents): 3 months of needs
- Bachelor (with dependents): 6 months
- Married no kids (dual income): 4 months
- Married no kids (single income): 6 months
- Married with kids: 9 months
- Single parent: 12 months (non-negotiable)
- Pre-retirement: 12 months
- Keep in: savings account + liquid MF
- FD counts only 70% (premature penalty)

INSURANCE RULES:
- Term insurance: buy before age 35 is cheapest
- If education loan: parents are co-signers
  → term insurance covers loan if person dies
- Health insurance: personal plan always
  (employer plan stops when job changes)
- With kids: health cover ₹20L minimum
- Pre-retirement: health cover ₹25L minimum
  buy before any diagnosis

INVESTMENT RULES BY AGE:
- Under 30: 80% equity (ELSS, index fund)
- 30-40: 70% equity, 30% debt
- 40-50: 60% equity, 40% debt
- 50+: 40% equity, 60% debt

GOAL-BASED INSTRUMENTS:
- <3 years goal: liquid MF, RD, FD
- 3-7 years: PPF, balanced MF, NPS
- 7+ years: ELSS, index fund, NPS
- Girl child: SSY (mandatory if under 10)
- Kids education: ELSS for 10+ year horizon
- Retirement: NPS + PPF + index fund
- Home purchase: index fund for down payment

SPECIAL SITUATIONS:
- Planning baby: maternity cover in health plan
  6 months expenses buffer before baby
  Paternity leave: budget for reduced income
- Marriage loan: treat as personal loan
  Clear in 12-18 months aggressively
- Medical loan: treat as high priority debt
  Clear before any investment
- PF account pre-retirement:
  Do not withdraw early (tax + penalty)
  Counts as retirement corpus

IMPORTANT LIMITS (regulatory):
- PPF: max ₹1,50,000/year
- SSY: max ₹1,50,000/year, open before age 10
- NPS: ₹50,000 extra deduction under 80CCD
- ELSS: 3 year lock-in
- EPF: do not withdraw unless emergency

KVP INSURANCE STRATEGY:
- Park yearly premium amount in KVP (7.5%)
- Start RD of monthly premium amount
- Year 2: pay premium from RD maturity
- System becomes self-sustaining in 2-3 years
- KVP interest reinvests to RD each year

FD STRATEGY:
- Keep 2 months expenses in FD
- Use bank credit card against FD for emergencies
- Move rest to KVP (higher rate, same safety)
- Or move to liquid MF (flexible withdrawal)

INDIAN CONTEXT:
- Use lakh and crore not millions
- SIP, EMI, EPF, PPF are standard terms
- Post office schemes: KVP, NSC, SCSS, SSY, MIS
- Tax saving: 80C (₹1.5L), 80D (health premium),
  80CCD (NPS ₹50K extra)
- SEBI disclaimer always at end

OUTPUT FORMAT:
Always return valid JSON matching the
requested structure exactly.
Use exact rupee amounts from the profile.
Never give generic advice.
Everything must reference their numbers.
`;

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

function educationLoanEmi(profile: FinancialProfile): number {
  const ext = profile as ExtProfile;
  if (n(ext.educationLoanEMI) > 0) return n(ext.educationLoanEMI);
  const row = profile.additionalObligations?.find((o) => /education|student/i.test(o.type));
  return n(row?.monthlyAmount);
}

function isOverdraftObligationType(type: string): boolean {
  const t = type.trim();
  if (t === "Overdraft (OD)") return true;
  return /\boverdraft\b/i.test(t) || /\b\(OD\)/i.test(t) || /^\s*OD\s*$/i.test(t);
}

type DebtContextRow = {
  type: string;
  emi: number;
  outstanding: number;
  rate: number;
  priority: string;
  modellingNote?: string;
};

function overdraftDebtFromProfile(profile: FinancialProfile): DebtContextRow | null {
  const rows =
    profile.additionalObligations?.filter((o) => isOverdraftObligationType(o.type)) ?? [];
  if (rows.length === 0) return null;
  const emi = rows.reduce((s, o) => s + n(o.monthlyAmount), 0);
  return {
    type: "Overdraft (OD)",
    emi,
    outstanding: 0,
    rate: 18,
    priority: "critical",
    modellingNote:
      rows.length > 1
        ? "User listed multiple overdraft-type obligations; monthly amounts are summed. Prioritise clearing OD before other high-interest debt."
        : "Revolving overdraft — prioritise closing or reducing this before other high-interest debt; effective cost is usually very high.",
  };
}

/** When profile includes OD, ensure the model's debtPlan lists it first and uses consecutive ranks. */
function prioritizeOverdraftFirstInPlan(plan: FinkoinAIPlan, profileHasOd: boolean) {
  if (!profileHasOd || !plan.debtPlan?.length) return;
  const rows = plan.debtPlan;
  const isOd = (r: (typeof rows)[number]) => /overdraft|\(OD\)/i.test(String(r.debtType ?? ""));
  const odRows = rows.filter(isOd);
  if (odRows.length === 0) return;
  const rest = rows.filter((r) => !isOd(r));
  plan.debtPlan = [...odRows, ...rest];
  plan.debtPlan.forEach((row, i) => {
    row.priorityRank = i + 1;
  });
}

function girlChildInfo(profile: FinancialProfile): { hasUnder10: boolean; age?: number } {
  const nk = profile.numberOfKids ?? 0;
  const ages = profile.kidsAges ?? [];
  const g = profile.kidsGenders ?? [];
  for (let i = 0; i < nk; i++) {
    if (g[i] === "girl" && n(ages[i]) < 10) return { hasUnder10: true, age: n(ages[i]) };
  }
  return { hasUnder10: false };
}

function overallScoreFromAnalysis(analysis: AnalysisResult): number {
  return Math.max(
    0,
    100 -
      analysis.issues.filter((i) => i.severity === "critical").length * 15 -
      analysis.issues.filter((i) => i.severity === "warning").length * 7,
  );
}

export async function POST(req: NextRequest) {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (!groqKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  try {
    const body = (await req.json()) as {
      profile?: FinancialProfile;
      analysis?: AnalysisResult;
    };
    const profile = body.profile;
    const analysis = body.analysis;

    if (!profile || !analysis) {
      return NextResponse.json({ error: "Missing profile or analysis" }, { status: 400 });
    }

    const ext = profile as ExtProfile;
    const groq = new Groq({ apiKey: groqKey });

    const buckets = getUniversalBucketActuals(profile);
    const income = monthlyTotalIncome(profile);
    const age = profile.selfAge || 30;
    const lifeStage = profile.lifeStage || "bachelor";
    const numberOfKids = profile.numberOfKids || 0;
    const { hasUnder10: hasGirlChildUnder10, age: girlChildAge } = girlChildInfo(profile);
    const isPregnancyPlanning = !!ext.planningBaby;

    const kidsForContext = Array.from({ length: numberOfKids }, (_, i) => ({
      age: profile.kidsAges?.[i],
      gender: profile.kidsGenders?.[i],
    }));

    const debts: DebtContextRow[] = [];

    const odDebt = overdraftDebtFromProfile(profile);
    if (odDebt) debts.push(odDebt);

    const eduEmi = educationLoanEmi(profile);
    if (eduEmi > 0) {
      debts.push({
        type: "Education loan",
        emi: eduEmi,
        outstanding: n(ext.educationLoanOutstanding) || eduEmi * 24,
        rate: n(ext.educationLoanRate) || 9,
        priority: "medium",
      });
    }
    if (n(profile.bikeEMI) > 0) {
      debts.push({
        type: "Bike loan",
        emi: n(profile.bikeEMI),
        outstanding: n((ext as { bikeLoanOutstanding?: number }).bikeLoanOutstanding) || n(profile.bikeEMI) * 18,
        rate: 14,
        priority: "medium",
      });
    }
    if (n(profile.carLoanEMI) > 0) {
      debts.push({
        type: "Car loan",
        emi: n(profile.carLoanEMI),
        outstanding: n(profile.carLoanOutstanding) || n(profile.carLoanEMI) * 36,
        rate: 10,
        priority: "medium",
      });
    }
    const plEmi = n(profile.personalLoanEMI);
    const plOutstanding = n(profile.personalLoanOutstanding);
    if (plEmi > 0) {
      debts.push({
        type: "Personal loan",
        emi: plEmi,
        outstanding: plOutstanding > 0 ? plOutstanding : 0,
        rate: 18,
        priority: "high",
        ...(plOutstanding <= 0
          ? {
              modellingNote:
                "Outstanding principal was NOT reported (user only gave EMI). Do not infer principal from EMI×months or any assumed tenure. In debtPlan JSON use outstanding 0 and state that the balance is unknown; do not fabricate monthsToClear from a guessed principal.",
            }
          : {}),
      });
    }
    if (n(ext.medicalLoanEMI) > 0) {
      debts.push({
        type: "Medical loan",
        emi: n(ext.medicalLoanEMI),
        outstanding: n(ext.medicalLoanOutstanding) || n(ext.medicalLoanEMI) * 12,
        rate: 16,
        priority: "high",
      });
    }
    if (n(ext.marriageLoanEMI) > 0) {
      debts.push({
        type: "Marriage loan",
        emi: n(ext.marriageLoanEMI),
        outstanding: n(ext.marriageLoanOutstanding) || n(ext.marriageLoanEMI) * 18,
        rate: 18,
        priority: "high",
      });
    }
    if (n(profile.creditCardBillMonthly) > 0) {
      debts.push({
        type: "Credit card (rolling / high interest)",
        emi: n(profile.creditCardBillMonthly),
        outstanding: n(profile.creditCardBillMonthly) * 6,
        rate: 36,
        priority: "high",
      });
    }
    if (n(profile.homeLoanEMI) > 0) {
      debts.push({
        type: "Home loan",
        emi: n(profile.homeLoanEMI),
        outstanding: n(profile.homeLoanOutstanding) || 0,
        rate: n(ext.homeLoanRate) || 8.5,
        priority: "low",
      });
    }

    const premMonthly = getInsurancePremiumsMonthly(profile);
    const totalYearlyPremiums = premMonthly * 12;

    const termPm = n(profile.termInsurancePremiumMonthly);
    const healthPm = n(profile.healthInsurancePremiumMonthly);
    const otherPm = Math.max(0, monthlyInsuranceTotal(profile) - termPm - healthPm);

    const savingsAccount = n(profile.savingsAccountBalance);
    const liquidMF = n(profile.liquidMFValue);
    const fd = n(profile.fdValue);
    const totalLiquidAssets = savingsAccount + liquidMF + fd * 0.7;
    const totalInvestments =
      n(profile.mfValue) + n(profile.epfBalance) + n(profile.ppfBalance) + n(profile.npsBalance);

    const needsActual = buckets.needs;
    const wantsActual = buckets.wants;
    const loansActual = buckets.loans;
    const investmentActual = buckets.investment;
    const securityActual = buckets.security;

    const totalExpenses = needsActual + wantsActual + loansActual + investmentActual + securityActual;
    const monthlySurplus = Math.max(0, income - totalExpenses);

    const er = computeRealEmergencyFund(profile);
    const emergencyFundMonths =
      needsActual > 0 ? Math.round(er.realTotal / Math.max(1, needsActual)) : 0;

    const termCover = profile.hasTermInsurance ? n(profile.termInsuranceSumAssured) : 0;
    const healthCover = profile.hasHealthInsurance ? n(profile.healthInsuranceSumInsured) : 0;

    const userContext = {
      personal: {
        age,
        lifeStage,
        cityTier: profile.cityTier || "metro",
        hasSpouse: (n(profile.spouseIncome) > 0 || lifeStage === "married" || lifeStage === "kids") && lifeStage !== "bachelor",
        numberOfKids,
        kidsAges: kidsForContext,
        hasGirlChildUnder10,
        girlChildAge: girlChildAge ?? null,
        isPregnancyPlanning,
        supportsParents: n(profile.parentsSupport) > 0,
        parentsMonthlySupport: n(profile.parentsSupport),
      },
      income: {
        selfMonthly: n(profile.monthlySalary),
        spouseMonthly: n(profile.spouseIncome),
        otherMonthly: n(profile.otherIncome),
        totalMonthly: income,
        totalYearly: income * 12,
      },
      debts,
      totalDebtEMI: debts.reduce((s, d) => s + d.emi, 0),
      totalDebtOutstanding: debts.reduce((s, d) => s + d.outstanding, 0),
      insurance: {
        termCover,
        healthCover,
        termPremiumMonthly: termPm,
        healthPremiumMonthly: healthPm,
        otherPremiumMonthly: otherPm,
        totalYearlyPremiums: Math.round(totalYearlyPremiums),
        hasTermInsurance: profile.hasTermInsurance,
        hasHealthInsurance: profile.hasHealthInsurance,
      },
      assets: {
        savingsAccount,
        fd,
        liquidMF,
        mfPortfolio: n(profile.mfValue),
        epf: n(profile.epfBalance),
        ppf: n(profile.ppfBalance),
        nps: n(profile.npsBalance),
        gold: n(profile.goldValue),
        homeValue: n(profile.homeMarketValue),
        totalLiquid: Math.round(totalLiquidAssets),
        totalInvestments: Math.round(totalInvestments),
        weightedEmergencyCorpus: Math.round(er.realTotal),
      },
      analysis: {
        needsActual,
        wantsActual,
        loansActual,
        investmentActual,
        securityPremiumsAndSSY: securityActual,
        monthlySurplus: Math.round(monthlySurplus),
        overallScore: overallScoreFromAnalysis(analysis),
        emergencyFundMonths,
        netWorth: buildNetWorth(profile).netWorth,
      },
      goals: {
        primary: profile.primaryGoal,
        planningHomePurchase: !!ext.planningHomePurchase || n(profile.homePurchaseTarget) > 0,
        homePurchaseTarget: n(profile.homePurchaseTarget),
        retirementAge: n(profile.retirementAge) || 60,
        planningBaby: isPregnancyPlanning,
      },
    };

    const relevantKnowledge = retrieveRelevantKnowledge(profile, analysis);
    const knowledgeContext = formatKnowledgeForPrompt(relevantKnowledge);

    const debugAi = process.env.NODE_ENV === "development" || process.env.DEBUG_AI === "1";
    if (debugAi) {
      console.log("[RAG] retrieved knowledge entry ids:", relevantKnowledge.map((e) => e.id));
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 4000,
      temperature: 0.2,
      messages: [
        { role: "system", content: FINKOIN_RULES },
        {
          role: "user",
          content: `Analyse this person's complete financial situation and create a personalised plan.

${knowledgeContext}
When you mention government scheme rates, tax limits, or regulatory caps, use ONLY what appears in the RELEVANT FINANCIAL KNOWLEDGE section above (and say "verify current notification" where noted). Do not invent rates. The JSON block below has the user's authoritative rupee amounts.

DEBT PLAN RULES:
- Follow any per-debt "modellingNote" in the debts array exactly (especially personal loan when only EMI is known, and overdraft).
- If the user has Overdraft (OD) in debts, it must be priorityRank 1 in debtPlan (before credit cards and personal loans).
- Never multiply personal-loan EMI by a guessed number of months to invent an outstanding balance.

THEIR COMPLETE PROFILE (numbers are authoritative):
${JSON.stringify(userContext, null, 2)}

Think about their SPECIFIC situation:
- Life stage: ${lifeStage}
- Age: ${age}
- Debts they have: ${debts.map((d) => d.type).join(", ") || "none"}
- Kids: ${numberOfKids} ${
            hasGirlChildUnder10 ? `(URGENT: girl child age ${girlChildAge} — SSY window closing)` : ""
          }
- Planning baby: ${isPregnancyPlanning}
- Monthly surplus (model): ₹${monthlySurplus.toLocaleString("en-IN")}
- Weighted accessible emergency corpus: ₹${er.realTotal.toLocaleString("en-IN")} (~${er.monthsCovered.toFixed(1)} months of needs at stated weighting)

Return ONLY this JSON structure.
Use their EXACT rupee amounts from the context.
Prioritise based on their specific situation.
Handle every edge case in their profile.

{
  "lifeStageInsight": {
    "stage": "their life stage name",
    "headline": "one powerful sentence about their specific situation",
    "keyChallenge": "their biggest financial challenge right now",
    "biggestMistake": "what people in their exact situation usually do wrong",
    "smartMove": "the one best thing they can do right now — specific with rupee amounts",
    "nextMilestone": "the very next financial milestone they should hit"
  },
  "debtPlan": [
    {
      "debtType": "name of debt",
      "outstanding": 0,
      "currentEMI": 0,
      "extraMonthlyPayment": 0,
      "monthsToClear": 0,
      "priorityRank": 1,
      "reasoning": "why this debt is this priority rank"
    }
  ],
  "mandatoryFunds": [
    {
      "fundName": "fund name",
      "purpose": "why this fund for their situation",
      "targetAmount": 0,
      "currentAmount": 0,
      "gap": 0,
      "monthlyContribution": 0,
      "monthsToComplete": 0,
      "whereToKeep": "instrument name",
      "whyThisInstrument": "specific reason for their situation",
      "urgency": "critical|high|medium",
      "actionThisWeek": "exact action they should take this week"
    }
  ],
  "assetOptimization": [
    {
      "currentAsset": "what they have",
      "currentAmount": 0,
      "problem": "what is wrong with keeping it there",
      "action": "move|keep|split",
      "splitPlan": {
        "keepAmount": 0,
        "keepWhere": "where to keep",
        "keepReason": "why",
        "moveAmount": 0,
        "moveWhere": "where to move",
        "moveReason": "why this is better",
        "moveAmount2": 0,
        "moveWhere2": "second destination",
        "moveReason2": "why"
      },
      "benefit": "what they gain from this change",
      "howToDoIt": "step by step in simple words"
    }
  ],
  "insuranceGaps": [
    {
      "type": "insurance type",
      "currentCover": 0,
      "recommendedCover": 0,
      "gap": 0,
      "urgency": "this-week|this-month|this-quarter",
      "monthlyPremiumEstimate": 0,
      "whyThisAmount": "specific to their dependents and loans",
      "consequence": "what happens if they do not buy this",
      "buyFromFinkoin": true
    }
  ],
  "monthlyAllocation": [
    {
      "priority": 1,
      "category": "what this is for",
      "amount": 0,
      "where": "instrument",
      "why": "one line reason"
    }
  ],
  "specialSituations": {
    "educationLoan": { "applicable": false, "advice": "" },
    "planningBaby": { "applicable": false, "maternityFund": 0, "advice": "" },
    "ssyUrgent": { "applicable": false, "monthsLeft": 0, "advice": "" },
    "homePurchasePlan": { "applicable": false, "currentSaved": 0, "targetSaved": 0, "monthsToReady": 0, "advice": "" },
    "retirementGap": { "applicable": false, "corpusNeeded": 0, "currentTrajectory": 0, "gap": 0, "advice": "" }
  },
  "kvpInsuranceStrategy": {
    "applicable": false,
    "totalYearlyPremiums": 0,
    "kvpAmount": 0,
    "rdMonthlyAmount": 0,
    "yearsToBeSelfSustaining": 0,
    "explanation": "step by step in simple words using their numbers"
  },
  "topPriorityAction": "the ONE specific action they must take THIS WEEK with exact rupee amount and where to go",
  "oneLiner": "one encouraging and honest sentence about their financial position",
  "disclaimer": "Educational guidance only. Not SEBI registered investment advice."
}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "";
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end < start) {
      throw new Error("No JSON in model response");
    }

    let aiPlan: unknown;
    try {
      aiPlan = JSON.parse(raw.slice(start, end + 1));
    } catch {
      return NextResponse.json({ error: "Invalid JSON from model" }, { status: 422 });
    }

    if (!isValidFinkoinAIPlan(aiPlan)) {
      return NextResponse.json({ error: "Model returned an incomplete plan" }, { status: 422 });
    }

    prioritizeOverdraftFirstInPlan(aiPlan, Boolean(odDebt));

    return NextResponse.json({
      plan: aiPlan,
      calculatedNumbers: {
        income,
        monthlySurplus,
        totalYearlyPremiums: Math.round(totalYearlyPremiums),
        totalLiquidAssets,
        weightedEmergencyCorpus: er.realTotal,
        debts,
      },
    });
  } catch (error: unknown) {
    if (error instanceof RateLimitError) {
      console.warn("Groq rate limit (TPD or RPM):", error.message);
      const retryIn = parseGroqRetryInText(error.message);
      return NextResponse.json(
        {
          error:
            "AI provider rate limit reached (usually daily tokens on the free tier). The app uses a built‑in plan when this happens — try again later or raise limits in Groq Console.",
          code: "rate_limit_exceeded",
          retryIn: retryIn ?? null,
        },
        { status: 429 },
      );
    }
    const message = error instanceof Error ? error.message : "AI route error";
    if (/429|rate_limit_exceeded|Rate limit reached/i.test(message)) {
      console.warn("Groq rate limit (parsed from message):", message.slice(0, 400));
      const retryIn = parseGroqRetryInText(message);
      return NextResponse.json(
        {
          error:
            "AI provider rate limit reached. The app uses a built‑in plan when this happens — try again later.",
          code: "rate_limit_exceeded",
          retryIn: retryIn ?? null,
        },
        { status: 429 },
      );
    }
    console.error("AI route error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
