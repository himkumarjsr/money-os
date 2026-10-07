/**
 * Instrument map: given a goal's horizon (and the user's risk profile), the
 * deterministic split of its monthly amount across instrument categories.
 * Money is bucketed by when it's needed; every bucket spans more than one
 * instrument, and gold is a constant 5–10% hedge across all of them. The AI
 * layer explains this split — it never decides it. Categories only, never
 * brands (Finkoin doesn't sell any product).
 */
import type { RiskTolerance } from "@/lib/riskProfile";

export type GoalHorizon = "0-1y" | "1-3y" | "3-7y" | "7y+";

export function goalHorizon(yearsToGoal: number): GoalHorizon {
  if (yearsToGoal <= 1) return "0-1y";
  if (yearsToGoal <= 3) return "1-3y";
  if (yearsToGoal <= 7) return "3-7y";
  return "7y+";
}

export type InstrumentKey =
  | "savings_sweep"
  | "liquid_fund"
  | "fd_cd"
  | "short_debt"
  | "arbitrage"
  | "hybrid"
  | "bonds"
  | "equity_index"
  | "flexicap"
  | "ppf_nps"
  | "gold";

export const INSTRUMENT_LABELS: Record<InstrumentKey, string> = {
  savings_sweep: "Savings account / sweep-in FD",
  liquid_fund: "Liquid mutual fund",
  fd_cd: "Bank FD / corporate FD / CDs",
  short_debt: "Short-duration debt fund",
  arbitrage: "Arbitrage fund",
  hybrid: "Hybrid / balanced advantage fund",
  bonds: "Government & corporate bonds",
  equity_index: "Nifty 50 index fund",
  flexicap: "Flexi-cap fund",
  ppf_nps: "PPF / NPS",
  gold: "Gold ETF / gold fund",
};

/** Gold hedge, % of the goal's monthly amount. */
export const GOLD_PCT: Record<GoalHorizon, number> = {
  "0-1y": 5,
  "1-3y": 5,
  "3-7y": 10,
  "7y+": 10,
};

/** Non-gold weights per horizon and risk profile (each row sums to 100). */
const CORE_WEIGHTS: Record<
  GoalHorizon,
  Record<RiskTolerance, Partial<Record<InstrumentKey, number>>>
> = {
  "0-1y": {
    conservative: { savings_sweep: 60, liquid_fund: 40 },
    moderate: { savings_sweep: 40, liquid_fund: 60 },
    aggressive: { savings_sweep: 30, liquid_fund: 70 },
  },
  "1-3y": {
    conservative: { fd_cd: 60, short_debt: 30, arbitrage: 10 },
    moderate: { fd_cd: 45, short_debt: 30, arbitrage: 25 },
    aggressive: { fd_cd: 35, short_debt: 30, arbitrage: 35 },
  },
  "3-7y": {
    conservative: { hybrid: 40, bonds: 60 },
    moderate: { hybrid: 60, bonds: 40 },
    aggressive: { hybrid: 75, bonds: 25 },
  },
  "7y+": {
    conservative: { equity_index: 50, ppf_nps: 50 },
    moderate: { equity_index: 70, ppf_nps: 30 },
    aggressive: { equity_index: 85, ppf_nps: 15 },
  },
};

/** Below this, a long-horizon equity slice stays all-index (index first, then flexi-cap). */
export const FLEXICAP_MIN_EQUITY_MONTHLY = 5_000;
/** Of the equity slice once it's large enough. */
const FLEXICAP_SHARE = 0.4;
/** Slices smaller than this per month fold into the bucket's main instrument. */
export const MIN_SLICE_MONTHLY = 500;
/** Liquid net worth above which real estate may be mentioned for 7y+ goals. */
export const REAL_ESTATE_LIQUID_NET_WORTH = 50_00_000;

export type AllocationSlice = {
  key: InstrumentKey;
  label: string;
  /** Share of this goal's monthly amount, 0–100 (slices sum to 100). */
  pct: number;
  monthly: number;
};

export type PortfolioAllocation = {
  horizon: GoalHorizon;
  riskTolerance: RiskTolerance;
  /** True when the user skipped the risk quiz and moderate was assumed. */
  riskAssumed: boolean;
  slices: AllocationSlice[];
  /** Set only for 7y+ goals once the safety net is closed and liquid net worth clears the threshold. Never a monthly slice. */
  realEstateNote: string | null;
};

/** Largest-remainder rounding: integers that sum to exactly `total`. */
function roundToTotal(weights: number[], total: number): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (w / sum) * total);
  const floors = raw.map(Math.floor);
  let left = total - floors.reduce((s, f) => s + f, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return floors;
}

export type AllocateGoalInput = {
  yearsToGoal: number;
  monthly: number;
  riskTolerance?: RiskTolerance | null;
  /** Emergency fund and insurance closed, and liquid net worth past the threshold. */
  realEstateEligible?: boolean;
};

export function allocateGoalPortfolio(input: AllocateGoalInput): PortfolioAllocation {
  const horizon = goalHorizon(input.yearsToGoal);
  const riskAssumed = !input.riskTolerance;
  const riskTolerance: RiskTolerance = input.riskTolerance ?? "moderate";
  const monthly = Math.max(0, Math.round(input.monthly || 0));

  const gold = GOLD_PCT[horizon];
  const weights: Partial<Record<InstrumentKey, number>> = {};
  for (const [key, w] of Object.entries(CORE_WEIGHTS[horizon][riskTolerance])) {
    weights[key as InstrumentKey] = ((w as number) * (100 - gold)) / 100;
  }
  if (weights.equity_index != null) {
    const equityMonthly = (monthly * weights.equity_index) / 100;
    if (equityMonthly >= FLEXICAP_MIN_EQUITY_MONTHLY) {
      const eq = weights.equity_index;
      weights.equity_index = eq * (1 - FLEXICAP_SHARE);
      weights.flexicap = eq * FLEXICAP_SHARE;
    }
  }
  weights.gold = gold;

  let keys = Object.keys(weights) as InstrumentKey[];
  const main = keys[0];
  if (monthly > 0) {
    // Fold slices too small to invest monthly into the main instrument.
    for (const k of keys) {
      if (k !== main && (monthly * (weights[k] ?? 0)) / 100 < MIN_SLICE_MONTHLY) {
        weights[main] = (weights[main] ?? 0) + (weights[k] ?? 0);
        delete weights[k];
      }
    }
    keys = Object.keys(weights) as InstrumentKey[];
  }

  const w = keys.map((k) => weights[k] ?? 0);
  const pcts = roundToTotal(w, 100);
  const amounts = roundToTotal(w, monthly);
  const slices: AllocationSlice[] = keys.map((key, i) => ({
    key,
    label: INSTRUMENT_LABELS[key],
    pct: pcts[i],
    monthly: amounts[i],
  }));

  return {
    horizon,
    riskTolerance,
    riskAssumed,
    slices,
    realEstateNote:
      horizon === "7y+" && input.realEstateEligible
        ? "With your safety net closed and liquid investments past ₹50 lakh, real estate can be considered for part of this goal — as a lump-sum decision, not a monthly SIP, and only if it won't stretch your EMIs."
        : null,
  };
}

/** Short one-line instrument summary, e.g. "Nifty 50 index fund + PPF / NPS + Gold ETF / gold fund". */
export function allocationSummary(allocation: PortfolioAllocation): string {
  return allocation.slices.map((s) => s.label).join(" + ");
}
