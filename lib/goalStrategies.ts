/**
 * Smart routes to each goal, the way an adviser would combine what the user
 * already has: loans that end and free their EMI, SIPs that rise with salary,
 * a corpus that can carry or clear a home loan, and the
 * trade-offs (delay, education loan). Each move is priced as the monthly SIP
 * it saves against the plain plan. Pure; today's rupees unless noted.
 * Shared by web and the app (mobile keeps a byte-identical copy).
 */
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { safetyFundSources } from "@/lib/financialEngine";
import { formatIndian } from "@/lib/formatters";
import {
  detectGoals,
  homeUpfrontShare,
  type DetectedGoal,
} from "@/lib/goalDetection";
import { earmarkExistingSavings } from "@/lib/goalFunding";
import {
  existingEquityValue,
  LONG_RUN_INFLATION,
  projectRetirementAccounts,
  salaryLinkedGrowth,
} from "@/lib/holdings";
import { postOfficeHoldingsValue } from "@/lib/postOfficeHoldings";
import {
  corpusMonthlyIncome,
  goalCostInTodaysRupees,
  GLIDE_YEARS,
  goalRate,
  LIFE_EXPECTANCY,
  lumpRealGrowth,
  monthlySipFor,
  retirementCorpusMultiple,
  salaryGrowth,
  sipRealValue,
  sipStepUp,
} from "@/lib/goalMath";

/** Assumptions an adviser would use for a new home loan. */
export const HOME_LOAN = { ratePct: 8.5, years: 20, share: 0.8 } as const;
/** Yearly withdrawal an investment pot can sustain for decades (EMI-carry check). */
export const SAFE_WITHDRAWAL_RATE = 0.04;
/** All EMIs together: comfortable up to 35% of income, stretched past 40%. */
export const EMI_COMFORT_SHARE = 0.35;
export const EMI_STRETCH_SHARE = 0.4;
/** SIP step-up assumed when the user hasn't told us their salary hike. */
export const DEFAULT_STEP_UP_PCT = 10;

export type StrategyKind = "smart" | "tradeoff" | "check";

export type GoalStrategy = {
  id: string;
  /** smart: no real downside. tradeoff: costs something else. check: a reality check. */
  kind: StrategyKind;
  title: string;
  detail: string;
  /** Cut in the monthly SIP this goal needs, ₹/month. */
  monthlySaved?: number;
};

export type GoalStrategyPlan = {
  goalId: string;
  /** SIP the goal needs on the plain plan, ₹/month. */
  baseMonthly: number;
  /** SIP with every "smart" move combined, ₹/month. */
  smartMonthly: number;
  /** One line comparing the two; empty when no smart move applies. */
  summary: string;
  strategies: GoalStrategy[];
};

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : 0;
};
const rs = (v: number) => `₹${formatIndian(Math.round(Math.max(0, v)))}`;
const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Standard reducing-balance EMI. */
export function loanEmi(principal: number, ratePct: number, years: number) {
  const m = Math.max(1, Math.round(years * 12));
  const r = ratePct / 100 / 12;
  if (principal <= 0) return 0;
  if (r === 0) return principal / m;
  const f = Math.pow(1 + r, m);
  return (principal * r * f) / (f - 1);
}

/** Loan still owed after `yearsPaid` years of EMIs. */
export function loanOutstanding(
  principal: number,
  ratePct: number,
  years: number,
  yearsPaid: number,
): number {
  const m = Math.round(years * 12);
  const k = Math.min(m, Math.max(0, Math.round(yearsPaid * 12)));
  const r = ratePct / 100 / 12;
  if (principal <= 0 || k >= m) return 0;
  if (r === 0) return principal * (1 - k / m);
  const f = Math.pow(1 + r, m);
  const fk = Math.pow(1 + r, k);
  return (principal * (f - fk)) / (f - 1);
}

const LOAN_NAMES: Record<string, string> = {
  home_loan: "home loan",
  personal_loan: "personal loan",
  car_loan: "car loan",
  bike_loan: "bike loan",
  education_loan: "education loan",
  pf_loan: "PF loan",
  gold_loan: "gold loan",
  business_loan: "business loan",
  credit_card: "card EMI",
};

type RunningLoan = { name: string; emi: number; yearsLeft: number };

function runningLoans(p: FinancialProfile): RunningLoan[] {
  return (p.unifiedLoans ?? [])
    .filter(
      (l) =>
        l.loanType !== "overdraft" &&
        n(l.monthlyEMI) > 0 &&
        n(l.remainingMonths) > 0,
    )
    .map((l) => ({
      name:
        l.lenderName?.trim() ||
        LOAN_NAMES[l.loanType] ||
        (l.loanType === "other" ? "loan" : String(l.loanType)),
      emi: n(l.monthlyEMI),
      yearsLeft: n(l.remainingMonths) / 12,
    }));
}

const monthlyIncome = (p: FinancialProfile) =>
  n(p.monthlySalary) +
  (p.lifeStage === "bachelor" ? 0 : n(p.spouseIncome)) +
  n(p.otherIncome);

const isFlexible = (g: DetectedGoal) =>
  g.type === "home_purchase" ||
  g.type === "vehicle_purchase" ||
  g.type === "custom";

export function buildGoalStrategies(
  profile: FinancialProfile,
  now: Date = new Date(),
): GoalStrategyPlan[] {
  const p = profile;
  const thisYear = now.getFullYear();
  const goals = detectGoals(p, now).filter((g) => g.type !== "debt_free");
  // Same savings split as the Fix Plan: what the emergency and medical funds
  // use is not counted again for a goal.
  const earmarks = earmarkExistingSavings(p, now, safetyFundSources(p).reserve);
  const knownStepUp = sipStepUp(p);
  const defaultStepUp = DEFAULT_STEP_UP_PCT / 100;
  const rateFor = (y: number, type?: string) => goalRate(p, y, type);
  const income = monthlyIncome(p);
  const age = n(p.selfAge) || 30;
  const loans = runningLoans(p);
  const retirement = goals.find((g) => g.type === "retirement");

  // Each loan's freed EMI goes to the first goal at least a year after it ends.
  const datedGoals = goals
    .filter((g) => g.type !== "retirement")
    .sort((a, b) => a.yearsToGoal - b.yearsToGoal);
  const rollover = new Map<string, RunningLoan[]>();
  for (const loan of loans) {
    const target =
      datedGoals.find((g) => g.yearsToGoal >= loan.yearsLeft + 1) ??
      (retirement && retirement.yearsToGoal >= loan.yearsLeft + 1
        ? retirement
        : undefined);
    if (!target) continue;
    rollover.set(target.id, [...(rollover.get(target.id) ?? []), loan]);
  }

  return goals.map((g) => {
    const years = Math.max(0.5, g.yearsToGoal);
    const nominalFor = (y: number) => rateFor(y, g.type);
    const nominal = nominalFor(years);
    const grow = lumpRealGrowth(nominal, years);
    const mark = earmarks.get(g.id);
    const accounts = mark?.retirementAccounts ?? 0;
    const target = g.futureCost ?? g.targetAmount;
    const gap = Math.max(0, target - accounts - (mark?.lumpsum ?? 0) * grow);
    const sip = (amount: number, stepUp = knownStepUp, y = years) =>
      Math.round(monthlySipFor(Math.max(0, amount), y, nominalFor(y), stepUp));
    const baseMonthly = sip(gap);
    const strategies: GoalStrategy[] = [];
    let smartGap = gap;
    let smartStepUp = knownStepUp;
    const smartNames: string[] = [];

    // 1. Loans that end before the goal: keep paying the EMI, into the goal.
    const freed = rollover.get(g.id) ?? [];
    if (gap > 0 && freed.length > 0) {
      let built = 0;
      for (const l of freed) {
        // The same fixed EMI, paid in from the month after the loan ends.
        built +=
          l.emi *
          sipRealValue(
            Math.round(years * 12),
            nominal,
            0,
            Math.round(l.yearsLeft * 12) + 1,
          );
      }
      const after = sip(gap - built);
      if (baseMonthly - after >= 100) {
        const first = freed[0];
        const names =
          freed.length === 1
            ? `your ${first.name} ends in ${thisYear + Math.ceil(first.yearsLeft)}`
            : `${freed.length} of your loans end before ${g.targetYear}`;
        strategies.push({
          id: "emi_rollover",
          kind: "smart",
          title: "Turn finished EMIs into this goal's SIP",
          detail: `When ${names}, keep paying the same ${rs(freed.reduce((s, l) => s + l.emi, 0))}/month - into this goal instead. You won't miss money you're used to not having, and it builds about ${rs(Math.min(built, gap))} by ${g.targetYear}. The SIP needed falls from ${rs(baseMonthly)} to ${rs(after)}.`,
          monthlySaved: baseMonthly - after,
        });
        smartGap = Math.max(0, gap - built);
        smartNames.push("EMI rollover");
      }
    }

    // 2. Start lower and step the SIP up with salary hikes.
    if (gap > 0 && knownStepUp === 0 && years >= 3) {
      const stepped = sip(gap, defaultStepUp);
      if (baseMonthly - stepped >= 100) {
        strategies.push({
          id: "step_up",
          kind: "smart",
          title: `Start smaller, raise it ${DEFAULT_STEP_UP_PCT}% a year`,
          detail: `Instead of a flat ${rs(baseMonthly)}/month, start at ${rs(stepped)} and raise it ${DEFAULT_STEP_UP_PCT}% every year when your salary goes up. Same goal, same date - easier today.`,
          monthlySaved: baseMonthly - stepped,
        });
        smartStepUp = defaultStepUp;
        smartNames.push(`${DEFAULT_STEP_UP_PCT}% yearly step-up`);
      }
    }

    if (g.type === "home_purchase" && g.home) {
      homeStrategies(g, gap, sip, baseMonthly);
    }

    if (g.type === "kid_education" && gap > 0) {
      const loanPart = 0.3;
      const after = sip(gap - target * loanPart);
      if (baseMonthly - after >= 100) {
        strategies.push({
          id: "education_loan",
          kind: "tradeoff",
          title: "Let an education loan cover part of it",
          detail: `Saving for 70% and taking an education loan for the rest cuts the SIP to ${rs(after)}/month. The loan's interest is fully tax-deductible for 8 years (section 80E, old tax regime), and your child shares the responsibility.`,
          monthlySaved: baseMonthly - after,
        });
      }
      const idx = g.kidIndex ?? -1;
      const age = Number(p.kidsAges?.[idx]);
      if (p.kidsGenders?.[idx] === "girl" && Number.isFinite(age) && age < 10) {
        strategies.push({
          id: "sukanya",
          kind: "smart",
          title: "Use Sukanya Samriddhi for the safe part",
          detail:
            "Your daughter is under 10, so she can have a Sukanya Samriddhi account: 8.2% a year, tax-free, ₹250 to ₹1.5L a year. Put the debt part of this goal there and keep the rest in equity funds.",
        });
      }
    }

    if (g.type === "retirement") retirementStrategies(g, gap, sip, baseMonthly);

    // Moving a flexible goal out by two years.
    if (isFlexible(g) && gap > 0 && baseMonthly > 0) {
      const later = years + 2;
      const lateGrow = lumpRealGrowth(nominalFor(later), later);
      const lateGap = Math.max(
        0,
        goalCostInTodaysRupees(g.targetAmount, g.type, later, p) -
          (mark?.lumpsum ?? 0) * lateGrow,
      );
      const after = sip(lateGap, knownStepUp, later);
      if (baseMonthly - after >= 500) {
        strategies.push({
          id: "delay",
          kind: "tradeoff",
          title: `Move it to ${g.targetYear + 2}`,
          detail: `Two more years of saving and growth cut the SIP from ${rs(baseMonthly)} to ${rs(after)}/month.`,
          monthlySaved: baseMonthly - after,
        });
      }
    }

    const smartMonthly =
      smartNames.length > 0 ? sip(smartGap, smartStepUp) : baseMonthly;
    return {
      goalId: g.id,
      baseMonthly,
      smartMonthly,
      summary:
        smartNames.length > 0 && smartMonthly < baseMonthly
          ? `On its own this goal needs ${rs(baseMonthly)}/month. With ${smartNames.join(" + ")}, ${rs(smartMonthly)}/month is enough.`
          : "",
      strategies,
    };

    function homeStrategies(
      goal: DetectedGoal,
      homeGap: number,
      sipFor: typeof sip,
      base: number,
    ) {
      const home = goal.home!;
      const price = home.price;
      const loan = price * HOME_LOAN.share;
      const emi = loanEmi(loan, HOME_LOAN.ratePct, HOME_LOAN.years);
      const upfront = price * homeUpfrontShare(home.includeInteriors);

      // EMI against income in the purchase year (both in today's rupees).
      if (income > 0) {
        const incomeThen =
          income *
          Math.pow((1 + salaryGrowth(p)) / (1 + LONG_RUN_INFLATION), years);
        const otherEmis = loans
          .filter((l) => l.yearsLeft > years)
          .reduce((s, l) => s + l.emi, 0);
        const share = (emi + otherEmis) / incomeThen;
        const rent = n(p.rentAmount);
        const rentLine =
          rent > 0
            ? ` Your ${rs(rent)} rent stops when you move in, so the real extra each month is about ${rs(emi - rent)}.`
            : "";
        const otherLine =
          otherEmis > 0 ? ` with your other EMIs still running` : "";
        if (share > EMI_STRETCH_SHARE) {
          const room = EMI_COMFORT_SHARE * incomeThen - otherEmis;
          const perRupee = loanEmi(1, HOME_LOAN.ratePct, HOME_LOAN.years);
          const maxPrice = room > 0 ? room / perRupee / HOME_LOAN.share : 0;
          strategies.push({
            id: "home_emi_check",
            kind: "check",
            title: "The EMI would be heavy",
            detail: `A ${rs(loan)} loan (80%) at ${HOME_LOAN.ratePct}% for ${HOME_LOAN.years} years is about ${rs(emi)}/month - ${pct(share)} of your income in ${goal.targetYear}${otherLine}. Keep all EMIs under ${pct(EMI_COMFORT_SHARE)}: ${maxPrice > 0 ? `a home up to about ${rs(maxPrice)} fits, or put more down.` : "clear other loans first or put more down."}${rentLine}`,
          });
        } else {
          strategies.push({
            id: "home_emi_check",
            kind: "check",
            title: "The EMI fits your income",
            detail: `Pay ${rs(upfront)} upfront and borrow ${rs(loan)} at ${HOME_LOAN.ratePct}% for ${HOME_LOAN.years} years: EMI about ${rs(emi)}/month, ${pct(share)} of your income in ${goal.targetYear}${otherLine}.${rentLine}`,
          });
        }
      }

      // Can investments carry the EMI, and does the loan outlive work?
      const pots =
        existingEquityValue(p) +
        n(p.fdValue) +
        n(p.goldValue) +
        postOfficeHoldingsValue(p.postOfficeSchemes, now);
      const potsThen =
        pots * lumpRealGrowth(rateFor(Math.max(years, 7)), years) - upfront;
      const swp = (Math.max(0, potsThen) * SAFE_WITHDRAWAL_RATE) / 12;
      if (swp >= emi * 0.5) {
        strategies.push({
          id: "corpus_emi",
          kind: "tradeoff",
          title:
            swp >= emi
              ? "Your investments could carry the EMI"
              : "Your investments could carry half the EMI",
          detail: `After the downpayment, what you've invested could be about ${rs(potsThen)} by ${goal.targetYear}. A safe 4% a year from it is ${rs(swp)}/month against a ${rs(emi)} EMI. Keep it as a backup, not the plan: paying the EMI from salary and leaving the corpus to grow at ~12% beats an ${HOME_LOAN.ratePct}% loan.`,
        });
      }

      if (retirement) {
        const overlap =
          goal.targetYear + HOME_LOAN.years - retirement.targetYear;
        if (overlap > 0) {
          const paidYears = retirement.targetYear - goal.targetYear;
          // Fixed EMIs: what is still owed shrinks in today's rupees too.
          const owed =
            loanOutstanding(
              loan,
              HOME_LOAN.ratePct,
              HOME_LOAN.years,
              paidYears,
            ) / Math.pow(1 + LONG_RUN_INFLATION, paidYears);
          const corpusIncome = corpusMonthlyIncome(
            retirement.targetAmount,
            age + retirement.yearsToGoal,
            p,
          );
          strategies.push({
            id: "loan_past_retirement",
            kind: "check",
            title: `The loan runs ${overlap} years past retirement`,
            detail: `A ${HOME_LOAN.years}-year loan from ${goal.targetYear} still has about ${rs(owed)} owed when you retire in ${retirement.targetYear}. Your ${rs(retirement.targetAmount)} retirement goal gives ${rs(corpusIncome)}/month for living costs only. Either prepay with bonuses so it ends by ${retirement.targetYear}, or aim for about ${rs(retirement.targetAmount + owed)} so you can clear the loan the day you retire - cheaper than paying ${rs(emi)} a month out of the corpus for ${overlap} more years.`,
          });
        }
      }
    }

    function retirementStrategies(
      goal: DetectedGoal,
      retGap: number,
      sipFor: typeof sip,
      base: number,
    ) {
      const retireAge = age + goal.yearsToGoal;
      const monthlyIncomeFromCorpus = corpusMonthlyIncome(
        goal.targetAmount,
        retireAge,
        p,
      );
      const pastRetirement = loans.filter(
        (l) => l.yearsLeft > goal.yearsToGoal,
      );
      strategies.push({
        id: "corpus_income",
        kind: "check",
        title: "What the corpus pays you",
        detail: `${rs(goal.targetAmount)} pays about ${rs(monthlyIncomeFromCorpus)}/month in today's rupees, rising with prices, from age ${retireAge} to ${LIFE_EXPECTANCY}.${pastRetirement.length > 0 ? ` Your ${pastRetirement.map((l) => l.name).join(", ")} would still be running then - close ${pastRetirement.length === 1 ? "it" : "them"} before you retire, or the corpus has to carry ${rs(pastRetirement.reduce((s, l) => s + l.emi, 0))}/month more.` : ""}`,
      });
      if (retGap > 0 && base > 0) {
        const later = goal.yearsToGoal + 2;
        // Two more years of saving, and a corpus that has two fewer years to last.
        const laterTarget = goalCostInTodaysRupees(
          n(p.retirementTargetCorpus)
            ? goal.targetAmount
            : (goal.targetAmount * retirementCorpusMultiple(retireAge + 2, p)) /
                retirementCorpusMultiple(retireAge, p),
          "retirement",
          later,
          p,
        );
        const laterGap = Math.max(
          0,
          laterTarget -
            projectRetirementAccounts(p, later, { real: true }).total -
            (mark?.lumpsum ?? 0) * lumpRealGrowth(nominalFor(later), later),
        );
        const after = sipFor(laterGap, knownStepUp, later);
        if (base - after >= 500) {
          strategies.push({
            id: "retire_later",
            kind: "tradeoff",
            title: "Work two more years",
            detail: `Retiring in ${goal.targetYear + 2} gives two more years of saving and growth: the total SIP this goal needs (your running SIPs included) falls from ${rs(base)} to ${rs(after)}/month.`,
            monthlySaved: base - after,
          });
        }
      }
    }
  });
}

/** What "Put in" is made of, today's rupees (they add up to `invested`). */
export type GoalReachPutIn = {
  /** Existing savings set against the goal today. */
  saved: number;
  /** Where `saved` comes from, when the caller knows (goal funding sources). */
  savedFrom?: { debt: number; equity: number; gold: number };
  /** Retirement only: EPF + PPF + NPS balances today. */
  pfBalance: number;
  /** Every monthly SIP paid so far (rising with salary). */
  sipPaid: number;
  /** Retirement only: EPF + PPF + NPS contributions paid so far. */
  pfPaid: number;
};

export type GoalReachRow = {
  year: number;
  /** Money put in so far (savings today + every SIP), today's rupees. */
  invested: number;
  /** The parts of `invested`. */
  putIn?: GoalReachPutIn;
  /** What it has grown to, today's rupees. */
  value: number;
  /** Monthly SIP paid that year (rises with salary), ₹. */
  sip?: number;
};

export type GoalReach = {
  /** ₹/month going to the goal: the plan's share plus running SIPs. */
  monthly: number;
  onTime: boolean;
  /** First year the goal is fully funded; null if not within 40 years. */
  reachYear: number | null;
  /** One row per year until the goal is reached (or the target year). */
  rows: GoalReachRow[];
  /** The amount the goal needs (today's rupees). */
  target?: number;
  /** What it is worth in the target year at this plan, today's rupees. */
  valueByTarget?: number;
  /** Total ₹/month that would reach it in the target year (when not on time). */
  onTimeMonthly?: number;
};

/** Longest stretch we project a goal before calling it out of reach. */
const REACH_HORIZON_YEARS = 40;

/**
 * Monthly return for month k (1 = next month) of a goal's money: the goal's
 * expected return, moving to safer funds for the last {@link GLIDE_YEARS}.
 */
function goalMonthlyRate(
  p: FinancialProfile,
  goal: { type: string; yearsToGoal: number },
): (k: number) => number {
  const rate = goalRate(p, Math.max(1, goal.yearsToGoal), goal.type);
  const goalMonths = Math.round(Math.max(1, goal.yearsToGoal) * 12);
  const glides = goalMonths > GLIDE_YEARS * 12 && rate.safe !== rate.long;
  return (k: number) =>
    Math.pow(
      1 + (glides && goalMonths - k < GLIDE_YEARS * 12 ? rate.safe : rate.long),
      1 / 12,
    ) - 1;
}

/**
 * When a goal is actually reached at the money the plan gives it: existing
 * savings plus the monthly SIP (rising with salary), grown at the goal's
 * expected return above inflation. Retirement also counts EPF / PPF / NPS
 * with their own contributions and rates - those stay with retirement only.
 */
export function projectGoalReach(
  profile: FinancialProfile,
  goal: {
    type: string;
    targetAmount: number;
    targetYear: number;
    yearsToGoal: number;
    currentSaved: number;
    monthlyAllocated?: number;
    existingMonthly?: number;
    /** Where the savings set against it come from (earmark split). */
    sources?: { debt: number; equity: number; gold: number };
  },
  now: Date = new Date(),
  opts: { skipSolve?: boolean } = {},
): GoalReach {
  const p = profile;
  const thisYear = now.getFullYear();
  const monthly = Math.max(
    0,
    Math.round(n(goal.monthlyAllocated) + n(goal.existingMonthly)),
  );
  const isRetirement = goal.type === "retirement";
  const pfToday = isRetirement
    ? n(p.epfBalance) + n(p.ppfBalance) + n(p.npsBalance)
    : 0;
  const lump = Math.max(0, n(goal.currentSaved) - pfToday);
  const monthlyRate = goalMonthlyRate(p, goal);
  let lumpValue = lump;
  const stepUp = sipStepUp(p);
  const target = n(goal.targetAmount);

  // Nominal rupees month by month, shown in today's rupees at each year end.
  let sipValue = 0;
  let paidIn = 0;
  let sip = monthly;
  // EPF rises with salary, PPF / NPS deposits with prices (as in
  // projectRetirementAccounts), each counted in today's rupees when paid.
  let epfMonthly = isRetirement ? n(p.monthlyEPFContribution) : 0;
  let otherPfMonthly = isRetirement
    ? n(p.monthlyPPFContribution) + n(p.monthlyNPSContribution)
    : 0;
  const epfStepUp = salaryLinkedGrowth(p);
  let pfPaid = 0;
  const rows: GoalReachRow[] = [];
  let reachYear: number | null = target <= 0 ? thisYear : null;
  const lastYear = goal.targetYear + REACH_HORIZON_YEARS;
  for (let y = 1; thisYear + y <= lastYear; y++) {
    if (y > 1) {
      sip *= 1 + stepUp;
      epfMonthly *= 1 + epfStepUp;
      otherPfMonthly *= 1 + LONG_RUN_INFLATION;
    }
    for (let m = 0; m < 12; m++) {
      const k = 12 * (y - 1) + m + 1;
      const rm = monthlyRate(k);
      sipValue = sipValue * (1 + rm) + sip;
      lumpValue *= 1 + rm;
      const toToday = Math.pow(1 + LONG_RUN_INFLATION, k / 12);
      paidIn += sip / toToday;
      pfPaid += (epfMonthly + otherPfMonthly) / toToday;
    }
    const deflate = Math.pow(1 + LONG_RUN_INFLATION, y);
    const putIn: GoalReachPutIn = {
      saved: Math.round(lump),
      ...(goal.sources
        ? {
            savedFrom: {
              debt: Math.round(n(goal.sources.debt)),
              equity: Math.round(n(goal.sources.equity)),
              gold: Math.round(n(goal.sources.gold)),
            },
          }
        : {}),
      pfBalance: Math.round(pfToday),
      sipPaid: Math.round(paidIn),
      pfPaid: Math.round(pfPaid),
    };
    const put = lump + pfToday + paidIn + pfPaid;
    const pf = isRetirement
      ? projectRetirementAccounts(p, y, { real: true }).total
      : 0;
    const value = (lumpValue + sipValue) / deflate + pf;
    const year = thisYear + y;
    rows.push({
      year,
      invested: Math.round(put),
      putIn,
      value: Math.round(value),
      sip: Math.round(sip),
    });
    if (reachYear === null && value >= target * 0.995) reachYear = year;
    if (year >= goal.targetYear && reachYear !== null) break;
  }
  const onTime = reachYear !== null && reachYear <= goal.targetYear;
  // Out of reach within the horizon: show up to the target year only.
  const shownRows =
    reachYear === null
      ? rows.filter((r) => r.year <= Math.max(goal.targetYear, thisYear + 1))
      : rows;
  const valueByTarget = rows.find((r) => r.year === goal.targetYear)?.value;
  return {
    monthly,
    onTime,
    reachYear,
    rows: shownRows,
    target: Math.round(target),
    ...(valueByTarget != null ? { valueByTarget } : {}),
    ...(!onTime && !opts.skipSolve && goal.targetYear > thisYear
      ? { onTimeMonthly: monthlyToReachOnTime(profile, goal, now) }
      : {}),
  };
}

/**
 * Smallest total ₹/month (plan share + running SIPs, rising with salary like
 * every SIP here) that reaches the goal in its target year, to the ₹100.
 */
function monthlyToReachOnTime(
  profile: FinancialProfile,
  goal: Parameters<typeof projectGoalReach>[1],
  now: Date,
): number {
  const reaches = (m: number) =>
    projectGoalReach(
      profile,
      { ...goal, monthlyAllocated: m, existingMonthly: 0 },
      now,
      { skipSolve: true },
    ).onTime;
  let hi = Math.max(1_000, n(goal.monthlyAllocated) + n(goal.existingMonthly));
  while (!reaches(hi)) {
    hi *= 2;
    if (hi > 10_00_00_000) return hi;
  }
  let lo = 0;
  while (hi - lo > 100) {
    const mid = (lo + hi) / 2;
    if (reaches(mid)) hi = mid;
    else lo = mid;
  }
  return Math.ceil(hi / 100) * 100;
}

/** " (₹a FDs / post office + ₹b funds & stocks + ₹c gold)", or "". */
function savedFromText(p: GoalReachPutIn): string {
  const f = p.savedFrom;
  if (!f) return "";
  const parts: Array<[number, string]> = (
    [
      [f.debt, "FDs / post office"],
      [f.equity, "mutual funds & stocks"],
      [f.gold, "gold"],
    ] as Array<[number, string]>
  ).filter(([v]) => v > 0);
  if (parts.length === 0) return "";
  if (parts.length === 1) return ` (from your ${parts[0][1]})`;
  return ` (${parts.map(([v, what]) => `${rs(v)} ${what}`).join(" + ")})`;
}

/**
 * Where a year's "Put in" comes from, e.g. "₹2,00,000 savings set aside
 * today + ₹4,80,000 of SIPs paid by 2030". Today's rupees.
 */
export function goalReachPutInLine(row: GoalReachRow): string {
  const p = row.putIn;
  if (!p) return `${rs(row.invested)} put in by ${row.year}.`;
  const parts = [
    p.saved > 0
      ? `${rs(p.saved)} savings set aside today${savedFromText(p)}`
      : "",
    p.pfBalance > 0 ? `${rs(p.pfBalance)} EPF / PPF / NPS balance today` : "",
    p.sipPaid > 0 ? `${rs(p.sipPaid)} of monthly SIPs paid by ${row.year}` : "",
    p.pfPaid > 0
      ? `${rs(p.pfPaid)} of EPF / PPF / NPS contributions by ${row.year}`
      : "",
  ].filter(Boolean);
  return parts.length
    ? `${parts.join(" + ")} = ${rs(row.invested)} (today's rupees).`
    : "Nothing put in yet.";
}

/** One plain line on when the goal is reached at today's plan. */
export function goalReachLine(
  reach: GoalReach,
  goal: { targetYear: number },
): string {
  if (reach.onTime)
    return reach.monthly > 0
      ? `On track: ${rs(reach.monthly)}/month gets you there by ${reach.reachYear ?? goal.targetYear}.`
      : `Your savings already cover this by ${goal.targetYear} - nothing more needed each month.`;
  const target = reach.target
    ? `${rs(reach.target)} by ${goal.targetYear}`
    : `This goal by ${goal.targetYear}`;
  const byThen =
    reach.valueByTarget != null
      ? ` You'd have about ${rs(reach.valueByTarget)} by ${goal.targetYear}.`
      : "";
  const fix =
    reach.onTimeMonthly != null
      ? ` To make ${goal.targetYear}, invest ${rs(reach.onTimeMonthly)}/month in all.`
      : "";
  if (reach.monthly <= 0)
    return `Nothing is going to this goal yet.${fix || " Free up a monthly amount for it."}`;
  if (reach.reachYear === null)
    return `${target} isn't realistic at ${rs(reach.monthly)}/month - it isn't reached even in ${REACH_HORIZON_YEARS} years.${byThen}${fix}`;
  const late = reach.reachYear - goal.targetYear;
  return `${target} isn't realistic at ${rs(reach.monthly)}/month. At this pace you reach it in ${reach.reachYear} (${late} ${late === 1 ? "year" : "years"} late).${byThen}${fix}`;
}

/** Key under the year-by-year table; only claims ✓ when a row shows it. */
export function goalReachTableNote(
  reach: GoalReach,
  goal: { targetAmount: number },
): string {
  const shown =
    reach.reachYear !== null &&
    reach.rows.some((r) => r.year === reach.reachYear);
  const last = reach.rows[reach.rows.length - 1]?.year;
  const late =
    reach.reachYear !== null && !reach.onTime
      ? `✓ ${reach.reachYear}, the year you'd actually reach ${rs(goal.targetAmount)}.`
      : null;
  return `Today's rupees, after inflation. ◎ your target year · ${
    late ??
    (shown || last == null
      ? `✓ goal of ${rs(goal.targetAmount)} reached.`
      : `goal of ${rs(goal.targetAmount)} not reached by ${last}.`)
  }`;
}

export type RoadmapRow = {
  year: number;
  /** Monthly SIP across all goals still being saved for that year, ₹. */
  monthly: number;
  /** What the money for those goals is worth at year end, today's rupees. */
  worth: number;
  /** Goals falling due or reached, loans ending - in plain words. */
  events: string[];
};

/**
 * Year by year until the last goal is paid for: what to invest each month,
 * what the goal money is worth, and what happens that year. Built from each
 * goal's own projection (projectGoalReach), so it matches the goal cards.
 * Money freed along the way - a goal's SIP once it is paid for, a loan's EMI
 * once it ends - keeps being invested: it moves to the goal still open the
 * longest (usually retirement), so the monthly amount doesn't drop and that
 * goal's money grows with it.
 */
export function buildYearlyRoadmap(
  profile: FinancialProfile,
  goals: Array<Parameters<typeof projectGoalReach>[1] & { label: string }>,
  now: Date = new Date(),
): RoadmapRow[] {
  const thisYear = now.getFullYear();
  const reaches = goals.map((g) => ({
    g,
    reach: projectGoalReach(profile, g, now),
  }));
  const lastRowYear = (r: (typeof reaches)[number]) =>
    r.reach.rows[r.reach.rows.length - 1]?.year ?? 0;
  const lastYear = Math.max(thisYear + 1, ...reaches.map(lastRowYear));
  const loans = runningLoans(profile);
  const stepUp = sipStepUp(profile);

  const receiver = reaches
    .filter((r) => r.reach.rows.length > 0)
    .sort(
      (a, b) =>
        b.g.targetYear - a.g.targetYear || lastRowYear(b) - lastRowYear(a),
    )[0];
  const receiverEnd = receiver ? lastRowYear(receiver) : 0;
  // Monthly amounts that move to the receiver, from the year after they free up.
  const inflows: Array<{ from: number; monthly: number; grows: boolean }> = [];
  if (receiver) {
    for (const r of reaches) {
      if (r === receiver) continue;
      const last = r.reach.rows[r.reach.rows.length - 1];
      if (!last?.sip || last.year >= receiverEnd) continue;
      inflows.push({ from: last.year + 1, monthly: last.sip, grows: true });
    }
    for (const l of loans) {
      const ends = thisYear + Math.ceil(l.yearsLeft);
      if (l.emi > 0 && ends < receiverEnd)
        inflows.push({ from: ends + 1, monthly: l.emi, grows: false });
    }
  }
  const inflowFor = (year: number) =>
    inflows.reduce(
      (s, f) =>
        year < f.from
          ? s
          : s +
            f.monthly * (f.grows ? Math.pow(1 + stepUp, year - f.from + 1) : 1),
      0,
    );
  const receiverRate = receiver
    ? goalMonthlyRate(profile, receiver.g)
    : () => 0;
  let extra = 0;
  let receiverReachedYear: number | null = null;

  const rows: RoadmapRow[] = [];
  for (let year = thisYear + 1; year <= lastYear; year++) {
    const y = year - thisYear;
    const inflow = receiver && year <= receiverEnd ? inflowFor(year) : 0;
    if (receiver) {
      for (let m = 0; m < 12; m++) {
        extra = extra * (1 + receiverRate(12 * (y - 1) + m + 1)) + inflow;
      }
    }
    const extraReal = extra / Math.pow(1 + LONG_RUN_INFLATION, y);
    let monthly = inflow;
    let worth = extraReal;
    const events: string[] = [];
    for (const r of reaches) {
      const { g, reach } = r;
      const row = reach.rows.find((x) => x.year === year);
      if (row) {
        monthly += row.sip ?? 0;
        worth += row.value;
      }
      const isReceiver = r === receiver && inflows.length > 0;
      // The receiver counts what was moved to it as well.
      const value = (row?.value ?? 0) + (isReceiver ? extraReal : 0);
      const reached = isReceiver
        ? value >= g.targetAmount * 0.995
        : reach.reachYear !== null && year >= reach.reachYear;
      if (isReceiver && reached && receiverReachedYear === null)
        receiverReachedYear = year;
      const onTime = isReceiver
        ? receiverReachedYear !== null && receiverReachedYear <= g.targetYear
        : reach.onTime;
      if (year === g.targetYear) {
        events.push(
          onTime
            ? `${g.label}: ${rs(g.targetAmount)} ready`
            : `${g.label} due - still short`,
        );
      } else if (
        !onTime &&
        year === (isReceiver ? receiverReachedYear : reach.reachYear) &&
        year > g.targetYear
      ) {
        events.push(`${g.label}: fully funded, ${year - g.targetYear} yr late`);
      }
      const last = reach.rows[reach.rows.length - 1];
      if (
        receiver &&
        r !== receiver &&
        last?.year === year &&
        last.sip &&
        year < receiverEnd
      ) {
        events.push(
          `${g.label} done: its ${rs(last.sip * (1 + stepUp))}/month SIP moves to ${receiver.g.label.toLowerCase()}`,
        );
      }
    }
    for (const l of loans) {
      if (year === thisYear + Math.ceil(l.yearsLeft))
        events.push(
          receiver && year < receiverEnd
            ? `${l.name} ends: its ${rs(l.emi)} EMI moves to ${receiver.g.label.toLowerCase()}`
            : `${l.name} ends: move its ${rs(l.emi)} EMI into goals`,
        );
    }
    rows.push({
      year,
      monthly: Math.round(monthly),
      worth: Math.round(worth),
      events,
    });
    // With the moved money the last goal can be paid for sooner.
    if (
      receiverReachedYear !== null &&
      receiver &&
      year >= receiver.g.targetYear &&
      reaches.every((r) => r === receiver || lastRowYear(r) <= year)
    )
      break;
  }
  return rows;
}
