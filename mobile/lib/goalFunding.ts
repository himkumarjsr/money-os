/**
 * Weighted-parallel goal funding. Safety steps (emergency, insurance) stay
 * sequential in priorityEngine; once they're covered, the goal pool is split
 * across every active goal at the same time — weighted by urgency, with a
 * floor so long-horizon goals (retirement, a toddler's education) are never
 * deferred to zero. Pure engine math, no AI. Amounts are today's rupees.
 */
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import {
  LONG_RUN_INFLATION,
  projectRetirementAccounts,
} from "@/lib/financialEngine";
import { detectGoals, type DetectedGoal, type GoalType } from "@/lib/goalDetection";
import {
  allocateGoalPortfolio,
  allocationSummary,
  goalHorizon,
  REAL_ESTATE_LIQUID_NET_WORTH,
  type GoalHorizon,
  type PortfolioAllocation,
} from "@/lib/portfolioAllocation";
import { monthlySipForGoal } from "@/lib/sipGoal";

/** Each funded goal gets at least this share of the pool (or its full need, if smaller). */
export const GOAL_FLOOR_SHARE = 0.05;
/** The user's chosen primaryGoal is weighted up, not made winner-takes-all. */
export const PRIMARY_GOAL_BOOST = 1.5;

export { goalHorizon, type GoalHorizon };

/** Nominal expected return per horizon bucket (instrument split: portfolioAllocation). */
export const HORIZON_ASSUMPTIONS: Record<GoalHorizon, { nominalReturn: number }> = {
  "0-1y": { nominalReturn: 0.065 },
  "1-3y": { nominalReturn: 0.07 },
  "3-7y": { nominalReturn: 0.1 },
  "7y+": { nominalReturn: 0.12 },
};

/** Liquid investments minus non-mortgage debt — gates any real-estate mention. */
export function liquidNetWorth(profile: FinancialProfile): number {
  const p = profile as unknown as Record<string, unknown>;
  const n = (k: string) => {
    const v = Number(p[k]);
    return Number.isFinite(v) && v > 0 ? v : 0;
  };
  const liquid = [
    "savingsAccountBalance",
    "fdValue",
    "liquidMFValue",
    "otherLiquidSavings",
    "mfValue",
    "indianStocksValue",
    "usStocksValueINR",
    "usMFValueINR",
  ].reduce((s, k) => s + n(k), 0);
  return liquid - n("personalLoanOutstanding") - n("carLoanOutstanding");
}

const realReturnPct = (nominal: number) =>
  ((1 + nominal) / (1 + LONG_RUN_INFLATION) - 1) * 100;

const PRIMARY_GOAL_TYPES: Record<string, GoalType[]> = {
  buy_home: ["home_purchase"],
  buy_car: ["vehicle_purchase"],
  kids_education: ["kid_education"],
  retire_early: ["retirement"],
  retire_fire: ["retirement"],
  grow_wealth: ["retirement"],
};

export type GoalFundingItem = {
  goalId: string;
  type: GoalType;
  label: string;
  yearsToGoal: number;
  targetYear: number;
  horizon: GoalHorizon;
  targetAmount: number;
  currentSaved: number;
  /** Monthly SIP that fully funds the goal on time. */
  monthlyRequired: number;
  /** What this goal actually gets from the pool. */
  monthlyAllocated: number;
  /** Share of the pool, 0–100. */
  sharePct: number;
  /** monthlyAllocated / monthlyRequired, 0–100. */
  fundedPct: number;
  instrument: string;
  /** Deterministic instrument split of monthlyAllocated. */
  allocation: PortfolioAllocation;
  isPrimary: boolean;
};

export type GoalFundingPlan = {
  /** Monthly goal budget once safety steps are covered. */
  pool: number;
  totalRequired: number;
  totalAllocated: number;
  /** Pool left after every goal is fully funded — free for general wealth SIP. */
  unallocated: number;
  /** How far the pool falls short of funding every goal on time. */
  shortfall: number;
  items: GoalFundingItem[];
};

type AllocationInput = {
  id: string;
  yearsToGoal: number;
  monthlyRequired: number;
  boost?: number;
};

/**
 * Water-fill the pool: floor first, then urgency-weighted shares
 * (weight ∝ boost / √years), never past a goal's own monthly need.
 */
export function allocateGoalSurplus(
  goals: AllocationInput[],
  pool: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of goals) out[g.id] = 0;
  const active = goals.filter((g) => g.monthlyRequired > 0);
  if (pool <= 0 || active.length === 0) return out;

  const totalRequired = active.reduce((s, g) => s + g.monthlyRequired, 0);
  if (totalRequired <= pool) {
    for (const g of active) out[g.id] = g.monthlyRequired;
    return out;
  }

  const floor = Math.min(GOAL_FLOOR_SHARE * pool, pool / active.length);
  for (const g of active) out[g.id] = Math.min(g.monthlyRequired, floor);
  let remaining = pool - active.reduce((s, g) => s + out[g.id], 0);

  const weight = (g: AllocationInput) =>
    (g.boost ?? 1) / Math.sqrt(Math.max(0.5, g.yearsToGoal));

  for (let pass = 0; pass < active.length && remaining > 0.01; pass++) {
    const open = active.filter((g) => out[g.id] < g.monthlyRequired);
    if (open.length === 0) break;
    const totalWeight = open.reduce((s, g) => s + weight(g), 0);
    let given = 0;
    for (const g of open) {
      const give = Math.min(
        g.monthlyRequired - out[g.id],
        (remaining * weight(g)) / totalWeight,
      );
      out[g.id] += give;
      given += give;
    }
    remaining -= given;
  }
  return out;
}

/** Whole rupees that sum to the rounded total (largest remainder), so shares never overshoot the pool. */
function roundPreservingTotal(values: number[]): number[] {
  const floors = values.map((v) => Math.floor(v));
  let left = Math.round(values.reduce((s, v) => s + v, 0)) - floors.reduce((s, v) => s + v, 0);
  const order = values
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return floors;
}

function retirementNeed(
  profile: FinancialProfile,
  goal: DetectedGoal,
): { currentSaved: number; monthlyRequired: number } {
  const equity = (profile.mfValue || 0) + (profile.totalEquityValue || 0);
  const projectedPf = projectRetirementAccounts(profile, goal.yearsToGoal, {
    real: true,
  }).total;
  const gap = Math.max(0, goal.targetAmount - equity - projectedPf);
  return {
    currentSaved: Math.round(
      equity +
        (profile.epfBalance || 0) +
        (profile.ppfBalance || 0) +
        (profile.npsBalance || 0),
    ),
    monthlyRequired: monthlySipForGoal(
      gap,
      realReturnPct(HORIZON_ASSUMPTIONS["7y+"].nominalReturn),
      goal.yearsToGoal,
    ),
  };
}

export function buildGoalFundingPlan(
  profile: FinancialProfile,
  pool: number,
  now: Date = new Date(),
  opts: { safetyNetComplete?: boolean } = {},
): GoalFundingPlan {
  const realEstateEligible =
    !!opts.safetyNetComplete &&
    liquidNetWorth(profile) >= REAL_ESTATE_LIQUID_NET_WORTH;
  const primaryTypes = PRIMARY_GOAL_TYPES[String(profile.primaryGoal ?? "")] ?? [];
  // Debt-free is funded by the EMIs already in the loans bucket, not the goal pool.
  const goals = detectGoals(profile, now).filter((g) => g.type !== "debt_free");

  const sized = goals.map((g) => {
    const horizon = goalHorizon(g.yearsToGoal);
    const need =
      g.type === "retirement"
        ? retirementNeed(profile, g)
        : {
            currentSaved: 0,
            monthlyRequired: monthlySipForGoal(
              g.targetAmount,
              realReturnPct(HORIZON_ASSUMPTIONS[horizon].nominalReturn),
              g.yearsToGoal,
            ),
          };
    return {
      goal: g,
      horizon,
      isPrimary: primaryTypes.includes(g.type),
      currentSaved: need.currentSaved,
      monthlyRequired: Math.round(need.monthlyRequired),
    };
  });

  const safePool = Math.max(0, Math.round(pool));
  const allocation = allocateGoalSurplus(
    sized.map((s) => ({
      id: s.goal.id,
      yearsToGoal: s.goal.yearsToGoal,
      monthlyRequired: s.monthlyRequired,
      boost: s.isPrimary ? PRIMARY_GOAL_BOOST : 1,
    })),
    safePool,
  );

  const rounded = roundPreservingTotal(
    sized.map((s) => allocation[s.goal.id] ?? 0),
  );
  const items: GoalFundingItem[] = sized.map((s, idx) => {
    const monthlyAllocated = rounded[idx];
    const allocation = allocateGoalPortfolio({
      yearsToGoal: s.goal.yearsToGoal,
      monthly: monthlyAllocated,
      riskTolerance: profile.riskTolerance,
      realEstateEligible,
    });
    return {
      goalId: s.goal.id,
      type: s.goal.type,
      label: s.goal.label,
      yearsToGoal: s.goal.yearsToGoal,
      targetYear: s.goal.targetYear,
      horizon: s.horizon,
      targetAmount: s.goal.targetAmount,
      currentSaved: s.currentSaved,
      monthlyRequired: s.monthlyRequired,
      monthlyAllocated,
      sharePct: safePool > 0 ? Math.round((monthlyAllocated / safePool) * 100) : 0,
      fundedPct:
        s.monthlyRequired > 0
          ? Math.min(100, Math.round((monthlyAllocated / s.monthlyRequired) * 100))
          : 100,
      instrument: allocationSummary(allocation),
      allocation,
      isPrimary: s.isPrimary,
    };
  });
  items.sort(
    (a, b) => b.monthlyAllocated - a.monthlyAllocated || a.yearsToGoal - b.yearsToGoal,
  );

  const totalRequired = items.reduce((s, i) => s + i.monthlyRequired, 0);
  const totalAllocated = items.reduce((s, i) => s + i.monthlyAllocated, 0);
  return {
    pool: safePool,
    totalRequired,
    totalAllocated,
    unallocated: Math.max(0, safePool - totalAllocated),
    shortfall: Math.max(0, totalRequired - totalAllocated),
    items,
  };
}
