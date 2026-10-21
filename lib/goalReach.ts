/**
 * Can a goal be reached by its year with the monthly amount the plan gives
 * it? The year stays fixed: we project what the SIP grows to, say how far
 * short it falls, and suggest what would close the gap. Amounts are today's
 * rupees (real returns), the same basis goalFunding sizes goals on.
 */
import { formatIndian } from "@/lib/formatters";
import { detectGoals } from "@/lib/goalDetection";
import {
  goalHorizon,
  HORIZON_ASSUMPTIONS,
  realSalaryStepUpPct,
  type GoalFundingItem,
} from "@/lib/goalFunding";
import {
  allocateGoalPortfolio,
  allocationSummary,
} from "@/lib/portfolioAllocation";
import { LONG_RUN_INFLATION } from "@/lib/financialEngine";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import {
  getUniversalBucketActuals,
  getUniversalCaps,
} from "@/lib/universal-buckets";

/** Goals whose date can't be moved: a wedding, a birth, a child's college. */
export const FIXED_DATE_GOAL_TYPES = [
  "marriage",
  "baby",
  "kid_education",
  "kid_marriage",
] as const;

/** Fixed-date goals this close are funded right after the emergency fund. */
export const URGENT_GOAL_YEARS = 3;

export function isFixedDateGoal(type: string): boolean {
  return (FIXED_DATE_GOAL_TYPES as readonly string[]).includes(type);
}

export type GoalReach = {
  targetAmount: number;
  targetYear: number;
  /** Expected market return used, before inflation (e.g. 12). */
  nominalReturnPct: number;
  /** The same return after inflation. */
  realReturnPct: number;
  /** Plan month the SIP starts in (1 = this month). */
  startMonth: number;
  monthly: number;
  /** What the goal reaches by its year on this plan (today's rupees). */
  projected: number;
  shortfall: number;
  /** projected / target, 0–100. */
  reachPct: number;
  onTrack: boolean;
  /** The date can't be moved (wedding, birth, college). */
  fixedDate: boolean;
  /** Monthly SIP that reaches the goal on time if started this month. */
  monthlyNeededNow: number;
  /** Earliest year the current monthly gets there, or null if not within 50 years. */
  reachableYear: number | null;
  suggestions: string[];
};

const rs = (v: number) => `₹${formatIndian(Math.round(Math.max(0, v)))}`;

/**
 * Future value of a ₹1/month SIP paid at the end of months `start`..`months`
 * (1-based), rising by `stepUp` every 12 months from today.
 */
export function sipUnitValue(
  start: number,
  months: number,
  monthlyRate: number,
  stepUp: number,
): number {
  let fv = 0;
  for (let m = Math.max(1, start); m <= months; m++) {
    fv +=
      Math.pow(1 + stepUp, Math.floor((m - 1) / 12)) *
      Math.pow(1 + monthlyRate, months - m);
  }
  return fv;
}

export function goalReach(
  item: GoalFundingItem,
  opts: {
    profile: Partial<FinancialProfile>;
    startMonth: number;
    now?: Date;
  },
): GoalReach {
  const year = (opts.now ?? new Date()).getFullYear();
  const months = Math.max(1, Math.round(item.yearsToGoal * 12));
  const nominal = HORIZON_ASSUMPTIONS[item.horizon].nominalReturn;
  const realAnnual = (1 + nominal) / (1 + LONG_RUN_INFLATION) - 1;
  const r = realAnnual / 12;
  const g = realSalaryStepUpPct(opts.profile as FinancialProfile) / 100;
  const start = Math.max(1, Math.round(opts.startMonth));
  const monthly = Math.max(0, item.monthlyAllocated);

  // Part of the target the SIP has to build (retirement already counts
  // existing EPF / PPF / equity growth inside monthlyRequired).
  const sipTarget = item.monthlyRequired * sipUnitValue(1, months, r, g);
  const grown = monthly * sipUnitValue(start, months, r, g);
  const shortfall = Math.max(0, Math.round(sipTarget - grown));
  const projected = Math.max(0, Math.round(item.targetAmount - shortfall));
  const onTrack = shortfall <= Math.max(1000, item.targetAmount * 0.005);
  const reachPct =
    item.targetAmount > 0
      ? Math.min(100, Math.round((projected / item.targetAmount) * 100))
      : 100;

  let reachableYear: number | null = null;
  if (!onTrack && monthly > 0) {
    for (let y = item.yearsToGoal + 1; y <= 50; y++) {
      if (monthly * sipUnitValue(start, y * 12, r, g) >= sipTarget) {
        reachableYear = year + y;
        break;
      }
    }
  }

  const fixedDate = isFixedDateGoal(item.type);
  const p = opts.profile as Partial<FinancialProfile>;
  const suggestions: string[] = [];
  if (!onTrack) {
    if (start > 1) {
      suggestions.push(
        start > months
          ? `Earlier steps (like your emergency fund) use the surplus first, so this SIP would only start in month ${start} - after ${item.targetYear}. Starting ${rs(item.monthlyRequired)}/month now reaches it on time.`
          : `Earlier steps (like your emergency fund) use the surplus first, so this SIP only starts in month ${start}. Starting ${rs(item.monthlyRequired)}/month now reaches it on time.`,
      );
    } else {
      suggestions.push(
        `Reaching it on time takes ${rs(item.monthlyRequired)}/month - ${rs(item.monthlyRequired - monthly)} more than your surplus allows today.`,
      );
    }
    if (fixedDate) {
      const sips =
        (p.monthlySIP ?? 0) +
        (p.monthlyRD ?? 0) +
        (p.customInvestments ?? []).reduce(
          (s, c) => s + (c.monthlyContribution ?? 0),
          0,
        );
      if (sips > 0) {
        suggestions.push(
          `This date can't move, so pause your ${rs(sips)}/month SIPs / RD until ${item.targetYear} and put that here. Restart them after.`,
        );
      }
      const investments =
        (p.fdValue ?? 0) +
        (p.mfValue ?? 0) +
        (p.indianStocksValue ?? 0) +
        (p.liquidMFValue ?? 0);
      if (investments > 0) {
        suggestions.push(
          `Use part of your existing FDs / mutual funds (${rs(investments)} today) for the shortfall rather than a loan.`,
        );
      }
    }
    const income =
      (p.monthlySalary ?? 0) +
      (p.lifeStage === "bachelor" ? 0 : (p.spouseIncome ?? 0)) +
      (p.otherIncome ?? 0);
    const wantsOver =
      getUniversalBucketActuals(p).wants - income * getUniversalCaps(p).wants;
    if (wantsOver >= 500) {
      suggestions.push(
        `Wants are ${rs(wantsOver)}/month over your limit. Moving that here adds about ${rs(wantsOver * sipUnitValue(1, months, r, g))} by ${item.targetYear}.`,
      );
    }
    if (g === 0 && !fixedDate) {
      suggestions.push(
        "Add your expected yearly salary increase in Analyse - raising this SIP as your salary grows lowers what you need to start with.",
      );
    }
    if (reachableYear && !fixedDate) {
      suggestions.push(
        `Move the goal to ${reachableYear} and your current ${rs(monthly)}/month gets there.`,
      );
    }
    if (projected > 0) {
      suggestions.push(
        fixedDate
          ? `Or plan for a budget of ${rs(projected)} - what this plan reaches by ${item.targetYear}.`
          : `Or set the target to ${rs(projected)} - what this plan reaches by ${item.targetYear}.`,
      );
    }
  }

  return {
    targetAmount: item.targetAmount,
    targetYear: item.targetYear,
    nominalReturnPct: Math.round(nominal * 1000) / 10,
    realReturnPct: Math.round(realAnnual * 1000) / 10,
    startMonth: start,
    monthly,
    projected,
    shortfall,
    reachPct,
    onTrack,
    fixedDate,
    monthlyNeededNow: Math.round(item.monthlyRequired),
    reachableYear,
    suggestions,
  };
}

/**
 * Fixed-date goals within {@link URGENT_GOAL_YEARS} years, funded straight
 * after the emergency fund: a wedding date can't wait for the rest of the
 * plan. Each gets what it needs from `startMonth`, nearest date first, up to
 * the `available` monthly surplus.
 */
export function buildUrgentGoalItems(
  profile: FinancialProfile,
  available: number,
  startMonth: number,
  now: Date = new Date(),
): GoalFundingItem[] {
  const goals = detectGoals(profile, now)
    .filter(
      (g) => isFixedDateGoal(g.type) && g.yearsToGoal <= URGENT_GOAL_YEARS,
    )
    .sort((a, b) => a.yearsToGoal - b.yearsToGoal);
  let left = Math.max(0, Math.round(available));
  return goals.map((g) => {
    const months = Math.max(1, g.yearsToGoal * 12);
    const horizon = goalHorizon(g.yearsToGoal);
    const r =
      ((1 + HORIZON_ASSUMPTIONS[horizon].nominalReturn) /
        (1 + LONG_RUN_INFLATION) -
        1) /
      12;
    const unitNow = sipUnitValue(1, months, r, 0);
    const unitFromStart = sipUnitValue(startMonth, months, r, 0);
    const neededFromStart =
      unitFromStart > 0 ? g.targetAmount / unitFromStart : g.targetAmount;
    // Money that would only start after the date can't help this goal.
    const monthlyAllocated =
      startMonth > months ? 0 : Math.min(left, Math.round(neededFromStart));
    left -= monthlyAllocated;
    const allocation = allocateGoalPortfolio({
      yearsToGoal: g.yearsToGoal,
      monthly: monthlyAllocated,
      riskTolerance: profile.riskTolerance,
      realEstateEligible: false,
    });
    const monthlyRequired = Math.round(g.targetAmount / unitNow);
    return {
      goalId: g.id,
      type: g.type,
      label: g.label,
      yearsToGoal: g.yearsToGoal,
      targetYear: g.targetYear,
      horizon,
      targetAmount: g.targetAmount,
      currentSaved: 0,
      monthlyRequired,
      monthlyAllocated,
      sharePct: 100,
      fundedPct:
        neededFromStart > 0
          ? Math.min(
              100,
              Math.round((monthlyAllocated / neededFromStart) * 100),
            )
          : 100,
      instrument: allocationSummary(allocation),
      allocation,
      isPrimary: false,
    };
  });
}
