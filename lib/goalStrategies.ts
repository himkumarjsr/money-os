/**
 * Smart routes to each goal, the way an adviser would combine what the user
 * already has: loans that end and free their EMI, SIPs that rise with salary,
 * a corpus that can carry or clear a home loan, and the
 * trade-offs (delay, education loan). Each move is priced as the monthly SIP
 * it saves against the plain plan. Pure; today's rupees unless noted.
 * Shared by web and the app (mobile keeps a byte-identical copy).
 */
import type { FinancialProfile } from "@/lib/analyse-form-schema";
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
  const earmarks = earmarkExistingSavings(p, now);
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
            detail: `Retiring in ${goal.targetYear + 2} gives two more years of saving and growth: the SIP falls from ${rs(base)} to ${rs(after)}/month.`,
            monthlySaved: base - after,
          });
        }
      }
    }
  });
}

export type GoalReachRow = {
  year: number;
  /** Money put in so far (savings today + every SIP), today's rupees. */
  invested: number;
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
};

/** Longest stretch we project a goal before calling it out of reach. */
const REACH_HORIZON_YEARS = 40;

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
  },
  now: Date = new Date(),
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
  const pfMonthly = isRetirement
    ? n(p.monthlyEPFContribution) +
      n(p.monthlyPPFContribution) +
      n(p.monthlyNPSContribution)
    : 0;
  const lump = Math.max(0, n(goal.currentSaved) - pfToday);
  const rate = goalRate(p, Math.max(1, goal.yearsToGoal), goal.type);
  // Months to the goal date; the money moves to safer funds for the last years.
  const goalMonths = Math.round(Math.max(1, goal.yearsToGoal) * 12);
  const glides = goalMonths > GLIDE_YEARS * 12 && rate.safe !== rate.long;
  const monthlyRate = (k: number) =>
    Math.pow(
      1 + (glides && goalMonths - k < GLIDE_YEARS * 12 ? rate.safe : rate.long),
      1 / 12,
    ) - 1;
  let lumpValue = lump;
  const stepUp = sipStepUp(p);
  const target = n(goal.targetAmount);

  // Nominal rupees month by month, shown in today's rupees at each year end.
  let sipValue = 0;
  let paidIn = 0;
  let sip = monthly;
  const rows: GoalReachRow[] = [];
  let reachYear: number | null = target <= 0 ? thisYear : null;
  const lastYear = goal.targetYear + REACH_HORIZON_YEARS;
  for (let y = 1; thisYear + y <= lastYear; y++) {
    if (y > 1) sip *= 1 + stepUp;
    for (let m = 0; m < 12; m++) {
      const rm = monthlyRate(12 * (y - 1) + m + 1);
      sipValue = sipValue * (1 + rm) + sip;
      lumpValue *= 1 + rm;
      paidIn +=
        sip / Math.pow(1 + LONG_RUN_INFLATION, (12 * (y - 1) + m + 1) / 12);
    }
    const deflate = Math.pow(1 + LONG_RUN_INFLATION, y);
    const put = lump + pfToday + paidIn + pfMonthly * 12 * y;
    const pf = isRetirement
      ? projectRetirementAccounts(p, y, { real: true }).total
      : 0;
    const value = (lumpValue + sipValue) / deflate + pf;
    const year = thisYear + y;
    rows.push({
      year,
      invested: Math.round(put),
      value: Math.round(value),
      sip: Math.round(sip),
    });
    if (reachYear === null && value >= target * 0.995) reachYear = year;
    if (year >= goal.targetYear && reachYear !== null) break;
  }
  return {
    monthly,
    onTime: reachYear !== null && reachYear <= goal.targetYear,
    reachYear,
    rows: reachYear === null ? rows.slice(0, goal.yearsToGoal + 10) : rows,
  };
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
  if (reach.reachYear === null)
    return reach.monthly > 0
      ? `At ${rs(reach.monthly)}/month this goal isn't reached within ${REACH_HORIZON_YEARS} years - it needs a bigger SIP or a smaller target.`
      : "Nothing is going to this goal yet - free up a monthly amount for it.";
  const late = reach.reachYear - goal.targetYear;
  const byThen = reach.rows.find((r) => r.year === goal.targetYear)?.value;
  return byThen
    ? `At ${rs(reach.monthly)}/month you'd have about ${rs(byThen)} by ${goal.targetYear}, and reach the goal in ${reach.reachYear} (${late} ${late === 1 ? "year" : "years"} late).`
    : `At ${rs(reach.monthly)}/month you'd reach it in ${reach.reachYear}, ${late} ${late === 1 ? "year" : "years"} after ${goal.targetYear}.`;
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
  const lastYear = Math.max(
    thisYear + 1,
    ...reaches.map((r) => r.reach.rows[r.reach.rows.length - 1]?.year ?? 0),
  );
  const loans = runningLoans(profile);
  const rows: RoadmapRow[] = [];
  for (let year = thisYear + 1; year <= lastYear; year++) {
    let monthly = 0;
    let worth = 0;
    const events: string[] = [];
    for (const { g, reach } of reaches) {
      const row = reach.rows.find((r) => r.year === year);
      if (row) {
        monthly += row.sip ?? 0;
        worth += row.value;
      }
      if (year === g.targetYear) {
        events.push(
          reach.onTime
            ? `${g.label}: ${rs(g.targetAmount)} ready`
            : `${g.label} due - still short`,
        );
      } else if (year === reach.reachYear && !reach.onTime) {
        events.push(`${g.label}: fully funded, ${year - g.targetYear} yr late`);
      }
    }
    for (const l of loans) {
      if (year === thisYear + Math.ceil(l.yearsLeft))
        events.push(`${l.name} ends: move its ${rs(l.emi)} EMI into goals`);
    }
    rows.push({
      year,
      monthly: Math.round(monthly),
      worth: Math.round(worth),
      events,
    });
  }
  return rows;
}
