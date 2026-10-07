/**
 * Forward net-worth trajectory (5/10/20 years) in today's rupees. Starts from
 * the engine's own net worth (same asset and loan definitions as
 * analyseFinances), then compounds each asset class at a long-run rate,
 * EPF/PPF/NPS via projectRetirementAccounts, existing SIPs, and the plan's
 * per-goal monthly amounts. Goal corpora build until the goal year and are
 * then spent (a home purchase stays as property; retirement keeps compounding,
 * no drawdown modelled). Loans amortise on their EMIs. Pure engine math.
 */
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import {
  LONG_RUN_INFLATION,
  projectRetirementAccounts,
} from "@/lib/financialEngine";
import { goalHorizon, HORIZON_ASSUMPTIONS } from "@/lib/goalFunding";
import type { PriorityPlan } from "@/lib/priorityEngine";

export const TRAJECTORY_YEARS = [0, 5, 10, 20] as const;

/** Nominal long-run annual rates; everything is deflated by LONG_RUN_INFLATION. */
export const TRAJECTORY_RATES = {
  cash: 0.06,
  equity: 0.12,
  gold: 0.08,
  home: 0.06,
  car: -0.1,
} as const;

const DEFAULT_LOAN_RATE: Record<string, number> = {
  home_loan: 8.5,
  car_loan: 9.5,
  personal_loan: 14,
  education_loan: 10,
};

const SPENT_AT_GOAL_YEAR = new Set([
  "kid_education",
  "kid_marriage",
  "marriage",
  "baby",
  "vehicle_purchase",
  "parents_eldercare",
]);

export type TrajectoryBreakdown = {
  cash: number;
  equity: number;
  retirement: number;
  goals: number;
  property: number;
  gold: number;
  other: number;
};

export type TrajectoryPoint = {
  year: number;
  age: number | null;
  assets: number;
  liabilities: number;
  netWorth: number;
  breakdown: TrajectoryBreakdown;
};

export type SpentGoal = { label: string; year: number; amount: number };

export type NetWorthTrajectory = {
  points: TrajectoryPoint[];
  /** Goals whose corpus is used up inside the projection window. */
  spentGoals: SpentGoal[];
};

const num = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const real = (nominal: number) => (1 + nominal) / (1 + LONG_RUN_INFLATION) - 1;
const grow = (value: number, nominal: number, years: number) =>
  value * Math.pow(1 + real(nominal), years);

/** Future value (today's rupees) of a monthly contribution for `years`. */
function fvMonthly(monthly: number, nominal: number, years: number): number {
  const months = Math.max(0, Math.round(years * 12));
  if (monthly <= 0 || months === 0) return 0;
  const r = Math.pow(1 + real(nominal), 1 / 12) - 1;
  if (Math.abs(r) < 1e-9) return monthly * months;
  return monthly * ((Math.pow(1 + r, months) - 1) / r);
}

type Loan = { outstanding: number; emi: number; ratePct: number };

/** Mirrors totalLoanLiabilities so year 0 matches the report. */
function loansOf(p: FinancialProfile): { loans: Loan[]; revolving: number } {
  const revolving = num(p.creditCardBillMonthly) * 3;
  const unified = (p.unifiedLoans ?? []).filter(
    (l) => num(l.monthlyEMI) > 0 || num(l.outstandingAmount) > 0,
  );
  const loans: Loan[] = [];
  if (unified.length > 0) {
    for (const l of unified) {
      const out = num(l.outstandingAmount) > 0
        ? num(l.outstandingAmount)
        : num(l.monthlyEMI) * (num(l.remainingMonths) || 18);
      loans.push({
        outstanding: out,
        emi: num(l.monthlyEMI),
        ratePct: num(l.interestRate) || DEFAULT_LOAN_RATE[l.loanType] || 12,
      });
    }
    if (!unified.some((l) => l.loanType === "home_loan") && num(p.homeLoanOutstanding) > 0) {
      loans.push({ outstanding: num(p.homeLoanOutstanding), emi: num(p.homeLoanEMI), ratePct: 8.5 });
    }
    if (!unified.some((l) => l.loanType === "car_loan") && num(p.carLoanOutstanding) > 0) {
      loans.push({ outstanding: num(p.carLoanOutstanding), emi: num(p.carLoanEMI), ratePct: 9.5 });
    }
    return { loans, revolving };
  }
  if (num(p.homeLoanOutstanding) > 0) {
    loans.push({ outstanding: num(p.homeLoanOutstanding), emi: num(p.homeLoanEMI), ratePct: 8.5 });
  }
  if (num(p.carLoanOutstanding) > 0) {
    loans.push({ outstanding: num(p.carLoanOutstanding), emi: num(p.carLoanEMI), ratePct: 9.5 });
  }
  const personal = num(p.personalLoanOutstanding) || num(p.personalLoanEMI) * 24;
  if (personal > 0) {
    loans.push({ outstanding: personal, emi: num(p.personalLoanEMI), ratePct: 14 });
  }
  if (num(p.bikeEMI) > 0) {
    loans.push({ outstanding: num(p.bikeEMI) * 24, emi: num(p.bikeEMI), ratePct: 12 });
  }
  return { loans, revolving };
}

/** Nominal balance after `months` of EMIs; a loan whose EMI doesn't cover interest stays flat. */
function loanBalance(loan: Loan, months: number): number {
  if (months <= 0) return loan.outstanding;
  const r = loan.ratePct / 1200;
  if (loan.emi <= 0) return loan.outstanding;
  if (r <= 0) return Math.max(0, loan.outstanding - loan.emi * months);
  if (loan.emi <= loan.outstanding * r) return loan.outstanding;
  const g = Math.pow(1 + r, months);
  return Math.max(0, loan.outstanding * g - loan.emi * ((g - 1) / r));
}

function startingAssets(p: FinancialProfile) {
  const x = p as FinancialProfile & {
    hasPostOfficeSchemes?: boolean;
    postOfficeSchemes?: Array<{ amount?: number }>;
    customInvestments?: Array<{ currentValue?: number }>;
  };
  const postOffice =
    x.hasPostOfficeSchemes && (x.postOfficeSchemes?.length ?? 0) > 0
      ? x.postOfficeSchemes!.reduce((s, r) => s + num(r.amount), 0)
      : num(p.nscDepositAmount);
  const equity =
    num(p.totalEquityValue) > 0
      ? num(p.totalEquityValue)
      : num(p.mfValue) +
        num(p.indianStocksValue) +
        num(p.usStocksValueINR) +
        num(p.usMFValueINR) +
        num(p.rsuValueINR);
  return {
    cash:
      num(p.savingsAccountBalance) +
      num(p.fdValue) +
      num(p.liquidMFValue) +
      num(p.emergencyFundCurrent) +
      postOffice,
    equity,
    home: num(p.homeMarketValue),
    car: num(p.carMarketValue),
    gold: num(p.goldValue),
    other:
      num(p.otherAssets) +
      (x.customInvestments ?? []).reduce((s, i) => s + num(i.currentValue), 0),
  };
}

/** ₹12.3 L / ₹1.2 Cr / ₹45K, sign-aware. */
export function formatLakhCrore(value: number): string {
  const sign = value < 0 ? "-" : "";
  const v = Math.abs(Math.round(value));
  const one = (x: number) => (x >= 100 ? Math.round(x).toString() : x.toFixed(1).replace(/\.0$/, ""));
  if (v >= 1_00_00_000) return `${sign}₹${one(v / 1_00_00_000)} Cr`;
  if (v >= 1_00_000) return `${sign}₹${one(v / 1_00_000)} L`;
  if (v >= 1_000) return `${sign}₹${Math.round(v / 1_000)}K`;
  return `${sign}₹${v}`;
}

export function projectNetWorth(
  profile: FinancialProfile,
  plan: Pick<PriorityPlan, "goals" | "priorities"> | null | undefined,
  years: readonly number[] = TRAJECTORY_YEARS,
): NetWorthTrajectory {
  const start = startingAssets(profile);
  const { loans, revolving } = loansOf(profile);
  const existingSip = num(profile.monthlySIP);
  const leftoverSip = num(
    plan?.priorities?.find((p) => p.id === "start_sip")?.monthlyContribution,
  );
  const goals = (plan?.goals ?? []).filter(
    (g) => g.goalId && num(g.monthlyAllocated) > 0,
  );
  const age = num(profile.selfAge) > 0 ? num(profile.selfAge) : null;
  const horizonEnd = Math.max(...years);

  const spentGoals: SpentGoal[] = [];
  for (const g of goals) {
    if (SPENT_AT_GOAL_YEAR.has(g.goalType) && g.yearsToGoal <= horizonEnd) {
      const rate = HORIZON_ASSUMPTIONS[goalHorizon(g.yearsToGoal)].nominalReturn;
      spentGoals.push({
        label: g.label ?? g.goalType,
        year: g.yearsToGoal,
        amount: Math.round(fvMonthly(num(g.monthlyAllocated), rate, g.yearsToGoal)),
      });
    }
  }

  const points = years.map((t): TrajectoryPoint => {
    let goalsValue = 0;
    let homeFromGoal = 0;
    for (const g of goals) {
      const rate = HORIZON_ASSUMPTIONS[goalHorizon(g.yearsToGoal)].nominalReturn;
      const monthly = num(g.monthlyAllocated);
      if (t <= g.yearsToGoal) {
        goalsValue += fvMonthly(monthly, rate, t);
        continue;
      }
      const atGoal = fvMonthly(monthly, rate, g.yearsToGoal);
      if (g.goalType === "retirement") goalsValue += grow(atGoal, rate, t - g.yearsToGoal);
      else if (g.goalType === "home_purchase") homeFromGoal += grow(atGoal, TRAJECTORY_RATES.home, t - g.yearsToGoal);
      // everything else is spent at the goal year
    }

    const retirement = projectRetirementAccounts(profile, t, { real: true }).total;
    const breakdown: TrajectoryBreakdown = {
      cash: grow(start.cash, TRAJECTORY_RATES.cash, t),
      equity:
        grow(start.equity, TRAJECTORY_RATES.equity, t) +
        fvMonthly(existingSip + leftoverSip, TRAJECTORY_RATES.equity, t),
      retirement,
      goals: goalsValue,
      property:
        grow(start.home, TRAJECTORY_RATES.home, t) +
        grow(start.car, TRAJECTORY_RATES.car, t) +
        homeFromGoal,
      gold: grow(start.gold, TRAJECTORY_RATES.gold, t),
      other: start.other,
    };
    const assets = Object.values(breakdown).reduce((s, v) => s + v, 0);
    const deflate = Math.pow(1 + LONG_RUN_INFLATION, t);
    const liabilities =
      (loans.reduce((s, l) => s + loanBalance(l, t * 12), 0) + revolving) / deflate;

    const rounded = Object.fromEntries(
      Object.entries(breakdown).map(([k, v]) => [k, Math.round(v)]),
    ) as TrajectoryBreakdown;
    return {
      year: t,
      age: age != null ? age + t : null,
      assets: Math.round(assets),
      liabilities: Math.round(liabilities),
      netWorth: Math.round(assets - liabilities),
      breakdown: rounded,
    };
  });

  return { points, spentGoals };
}
