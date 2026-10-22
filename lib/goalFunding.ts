/**
 * Weighted-parallel goal funding. Safety steps (emergency, insurance) stay
 * sequential in priorityEngine; once they're covered, the goal pool is split
 * across every active goal at the same time - weighted by urgency, with a
 * floor so long-horizon goals (retirement, a toddler's education) are never
 * deferred to zero. Pure engine math, no AI. Amounts are today's rupees.
 */
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import {
  existingEquityValue,
  LONG_RUN_INFLATION,
  projectRetirementAccounts,
} from "@/lib/holdings";
import {
  detectGoals,
  type DetectedGoal,
  type GoalType,
} from "@/lib/goalDetection";
import {
  allocateGoalPortfolio,
  allocationSummary,
  goalHorizon,
  REAL_ESTATE_LIQUID_NET_WORTH,
  type GoalHorizon,
  type PortfolioAllocation,
} from "@/lib/portfolioAllocation";
import { monthlyStepUpSipForGoal } from "@/lib/sipGoal";
import { postOfficeHoldingsValue } from "@/lib/postOfficeHoldings";

/** Each funded goal gets at least this share of the pool (or its full need, if smaller). */
export const GOAL_FLOOR_SHARE = 0.05;
/** The user's chosen primaryGoal is weighted up, not made winner-takes-all. */
export const PRIMARY_GOAL_BOOST = 1.5;

export { goalHorizon, type GoalHorizon };

/** Nominal expected return per horizon bucket (instrument split: portfolioAllocation). */
export const HORIZON_ASSUMPTIONS: Record<
  GoalHorizon,
  { nominalReturn: number }
> = {
  "0-1y": { nominalReturn: 0.065 },
  "1-3y": { nominalReturn: 0.07 },
  "3-7y": { nominalReturn: 0.1 },
  "7y+": { nominalReturn: 0.12 },
};

/** Liquid investments minus non-mortgage debt - gates any real-estate mention. */
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

/**
 * Yearly SIP step-up in today's rupees: the salary hike the user expects,
 * less inflation (goal amounts are already in today's rupees). 0 when the
 * hike is unknown or does not beat inflation.
 */
export function realSalaryStepUpPct(profile: FinancialProfile): number {
  const hike = Number(profile.annualSalaryIncreasePct);
  if (!Number.isFinite(hike) || hike <= 0) return 0;
  return Math.max(0, ((1 + hike / 100) / (1 + LONG_RUN_INFLATION) - 1) * 100);
}

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
  /** Part of the user's running SIPs / RD counted toward this goal (₹/month). */
  existingMonthly?: number;
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
  /** Where currentSaved comes from (today's rupees). */
  sources?: GoalSavingsSources;
};

/** Existing money set against a goal, by where it sits today. */
export type GoalSavingsSources = {
  /** FDs, NSC / post office. */
  debt: number;
  gold: number;
  /** Mutual funds, stocks, RSUs. */
  equity: number;
  /** Retirement only: EPF + PPF + NPS at the goal date, today's rupees. */
  retirementAccounts: number;
};

export type GoalFundingPlan = {
  /** Monthly goal budget once safety steps are covered. */
  pool: number;
  totalRequired: number;
  totalAllocated: number;
  /** Pool left after every goal is fully funded - free for general wealth SIP. */
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
  let left =
    Math.round(values.reduce((s, v) => s + v, 0)) -
    floors.reduce((s, v) => s + v, 0);
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

export type GoalEarmark = {
  /** Existing FDs / funds / gold set against this goal, today's rupees. */
  lumpsum: number;
  /** Running SIPs / RD counted toward it, ₹/month. */
  existingMonthly: number;
  /** New monthly SIP still needed from the surplus. */
  monthlyRequired: number;
  /** Monthly SIP the goal would need with nothing saved toward it. */
  monthlyFromScratch: number;
  /** Where the lumpsum comes from, today's rupees. */
  fromDebt: number;
  fromGold: number;
  fromEquity: number;
  /** Retirement only: EPF + PPF + NPS at the goal date, today's rupees. */
  retirementAccounts: number;
};

const n0 = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : 0;
};

/**
 * Existing savings the plan already uses for the emergency and medical
 * funds, so goals don't count them again.
 */
export type SafetyReserve = {
  /** FD kept for the emergency and medical funds. */
  fdNeededForEmergency?: number;
  /** Mutual funds / stocks moved into the emergency or medical fund. */
  equityUsedForSafety?: number;
  /** Gold sold for the emergency or medical fund. */
  goldUsedForSafety?: number;
};

/**
 * Sets the user's existing savings against their goals, nearest date first,
 * so a goal only asks the surplus for what is still missing:
 * - FDs, NSC / post office (less what the emergency fund still leans on),
 *   gold and equity funds / stocks, each grown at the goal's expected return;
 * - running SIPs / RD / other monthly investments.
 * Short goals draw on safer pots first, long ones on equity. Retirement comes
 * last and also counts EPF / PPF / NPS (balances and contributions).
 * Land and other property are not counted: they can't be sold in parts.
 */
export function earmarkExistingSavings(
  profile: FinancialProfile,
  now: Date = new Date(),
  opts: SafetyReserve = {},
): Map<string, GoalEarmark> {
  const p = profile;
  const postOffice =
    postOfficeHoldingsValue(p.postOfficeSchemes, now) || n0(p.nscDepositAmount);
  const pots = {
    debt: Math.max(
      0,
      n0(p.fdValue) - n0(opts.fdNeededForEmergency) + postOffice,
    ),
    gold: Math.max(0, n0(p.goldValue) - n0(opts.goldUsedForSafety)),
    equity: Math.max(
      0,
      existingEquityValue(profile) - n0(opts.equityUsedForSafety),
    ),
  };
  let monthlyPool =
    n0(p.monthlySIP) +
    n0(p.monthlyRD) +
    (p.customInvestments ?? []).reduce(
      (s, c) => s + n0(c?.monthlyContribution),
      0,
    );
  const stepUpPct = realSalaryStepUpPct(profile);
  const goals = detectGoals(profile, now)
    .filter((g) => g.type !== "debt_free")
    .sort((a, b) => {
      if (a.type === "retirement") return 1;
      if (b.type === "retirement") return -1;
      return a.yearsToGoal - b.yearsToGoal;
    });

  const out = new Map<string, GoalEarmark>();
  for (const g of goals) {
    const horizon = goalHorizon(g.yearsToGoal);
    const rPct = realReturnPct(HORIZON_ASSUMPTIONS[horizon].nominalReturn);
    const grow = Math.pow(1 + rPct / 100, g.yearsToGoal);
    let target = g.targetAmount;
    const retirementAccounts =
      g.type === "retirement"
        ? projectRetirementAccounts(profile, g.yearsToGoal, { real: true })
            .total
        : 0;
    target -= retirementAccounts;
    const order: Array<keyof typeof pots> =
      g.yearsToGoal <= 3
        ? ["debt", "gold", "equity"]
        : g.yearsToGoal <= 7
          ? ["debt", "equity", "gold"]
          : ["equity", "gold", "debt"];
    let lumpsum = 0;
    const taken = { debt: 0, gold: 0, equity: 0 };
    for (const k of order) {
      const stillToday = Math.max(0, target / grow - lumpsum);
      const take =
        g.type === "retirement" ? pots[k] : Math.min(pots[k], stillToday);
      pots[k] -= take;
      taken[k] = take;
      lumpsum += take;
    }
    const gap = Math.max(0, target - lumpsum * grow);
    const needed = monthlyStepUpSipForGoal(gap, rPct, g.yearsToGoal, stepUpPct);
    const existingMonthly = Math.min(monthlyPool, needed);
    monthlyPool -= existingMonthly;
    out.set(g.id, {
      lumpsum: Math.round(lumpsum),
      existingMonthly: Math.round(existingMonthly),
      monthlyRequired: Math.round(Math.max(0, needed - existingMonthly)),
      monthlyFromScratch: Math.round(
        monthlyStepUpSipForGoal(g.targetAmount, rPct, g.yearsToGoal, stepUpPct),
      ),
      fromDebt: Math.round(taken.debt),
      fromGold: Math.round(taken.gold),
      fromEquity: Math.round(taken.equity),
      retirementAccounts: Math.round(Math.max(0, retirementAccounts)),
    });
  }
  return out;
}

export function buildGoalFundingPlan(
  profile: FinancialProfile,
  pool: number,
  now: Date = new Date(),
  opts: {
    safetyNetComplete?: boolean;
    excludeGoalIds?: string[];
  } & SafetyReserve = {},
): GoalFundingPlan {
  const realEstateEligible =
    !!opts.safetyNetComplete &&
    liquidNetWorth(profile) >= REAL_ESTATE_LIQUID_NET_WORTH;
  const primaryTypes =
    PRIMARY_GOAL_TYPES[String(profile.primaryGoal ?? "")] ?? [];
  // Debt-free is funded by the EMIs already in the loans bucket, not the goal pool.
  // Urgent fixed-date goals are funded earlier, in their own step.
  const excluded = new Set(opts.excludeGoalIds ?? []);
  const goals = detectGoals(profile, now).filter(
    (g) => g.type !== "debt_free" && !excluded.has(g.id),
  );
  const earmarks = earmarkExistingSavings(profile, now, {
    fdNeededForEmergency: opts.fdNeededForEmergency,
    equityUsedForSafety: opts.equityUsedForSafety,
    goldUsedForSafety: opts.goldUsedForSafety,
  });

  const sized = goals.map((g) => {
    const horizon = goalHorizon(g.yearsToGoal);
    const mark = earmarks.get(g.id);
    const pf =
      g.type === "retirement"
        ? n0(profile.epfBalance) +
          n0(profile.ppfBalance) +
          n0(profile.npsBalance)
        : 0;
    return {
      goal: g,
      horizon,
      isPrimary: primaryTypes.includes(g.type),
      currentSaved: Math.round((mark?.lumpsum ?? 0) + pf),
      existingMonthly: mark?.existingMonthly ?? 0,
      monthlyRequired: mark?.monthlyRequired ?? 0,
      sources: {
        debt: mark?.fromDebt ?? 0,
        gold: mark?.fromGold ?? 0,
        equity: mark?.fromEquity ?? 0,
        retirementAccounts: mark?.retirementAccounts ?? 0,
      },
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
      existingMonthly: s.existingMonthly,
      monthlyRequired: s.monthlyRequired,
      monthlyAllocated,
      sharePct:
        safePool > 0 ? Math.round((monthlyAllocated / safePool) * 100) : 0,
      fundedPct:
        s.monthlyRequired > 0
          ? Math.min(
              100,
              Math.round((monthlyAllocated / s.monthlyRequired) * 100),
            )
          : 100,
      instrument: allocationSummary(allocation),
      allocation,
      isPrimary: s.isPrimary,
      sources: s.sources,
    };
  });
  items.sort(
    (a, b) =>
      b.monthlyAllocated - a.monthlyAllocated || a.yearsToGoal - b.yearsToGoal,
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
