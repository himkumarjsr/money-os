/**
 * Money Score: 0-100 in six weighted pillars, each scored in proportion to
 * the gap (a small gap costs a little, a big one a lot), with one line on
 * why and the action worth the most points. Called by analyseFinances; kept
 * free of financialEngine imports so goal funding can be used here.
 * Shared by web and the app (mobile keeps a byte-identical copy at
 * mobile/lib/moneyScore.ts).
 */
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { formatIndian } from "@/lib/formatters";
import { earmarkExistingSavings, type SafetyReserve } from "@/lib/goalFunding";
import { detectGoals } from "@/lib/goalDetection";
import { existingEquityValue } from "@/lib/holdings";

export type ScorePillarId =
  | "safety"
  | "protection"
  | "debt"
  | "saving"
  | "goals"
  | "wealth";

export type ScoreAction = {
  pillar: ScorePillarId;
  text: string;
  /** Points this action would add, rounded. */
  gain: number;
};

export type ScorePillar = {
  id: ScorePillarId;
  label: string;
  points: number;
  max: number;
  /** Plain-words reason for the points. */
  line: string;
  /** The action worth the most points in this pillar, if any. */
  action?: ScoreAction;
};

export type MoneyScore = {
  total: number;
  pillars: ScorePillar[];
  /** The three actions worth the most points across all pillars. */
  topActions: ScoreAction[];
};

export type MoneyScoreInput = {
  profile: FinancialProfile;
  /** Monthly take-home. */
  income: number;
  investingMonthly: number;
  loansMonthly: number;
  /** Income left after every bucket, ₹/month (negative = overspending). */
  unallocatedMonthly: number;
  emergency: {
    have: number;
    target: number;
    monthsHave: number;
    monthsNeeded: number;
  };
  /** `have` already counts savings left over beyond the emergency fund. */
  medical: { have: number; target: number };
  health: { total: number; target: number; employerOnly: boolean; own: number };
  term: {
    optional: boolean;
    cover: number;
    needed: number;
    /** Cover at or above this counts as a solid base. */
    floor: number;
    premiumMonthly: number;
  };
  netWorth: number;
  /**
   * Savings the emergency and medical funds already use (safetyFundSources),
   * so goals don't count them twice. Same reserve as the Fix Plan.
   */
  safetyReserve?: SafetyReserve;
  /** @deprecated Use safetyReserve. FD the emergency fund still leans on. */
  fdNeededForEmergency?: number;
  now?: Date;
};

export const PILLAR_MAX: Record<ScorePillarId, number> = {
  safety: 20,
  protection: 20,
  debt: 15,
  saving: 15,
  goals: 20,
  wealth: 10,
};

const PILLAR_LABEL: Record<ScorePillarId, string> = {
  safety: "Safety net",
  protection: "Protection",
  debt: "Debt health",
  saving: "Saving and investing",
  goals: "Goals and retirement",
  wealth: "Wealth and mix",
};

/** Share of income that should go to investing. */
export const TARGET_SAVING_RATE = 0.2;
/** Interest rate (% a year) at or above which a loan counts as costly. */
const COSTLY_RATE = 12;
const COSTLY_LOAN_TYPES = new Set([
  "personal_loan",
  "credit_card",
  "bike_loan",
  "business_loan",
  "overdraft",
]);

/** Balances up to this are small - one payment from savings clears them. */
export const SMALL_DEBT_MAX = 25_000;

/** A balance small enough to clear from savings: up to ₹25,000 and a tenth of a month's income. */
export function isSmallDebt(outstanding: number, monthlyIncome: number) {
  const o = Number(outstanding) || 0;
  return (
    o > 0 &&
    o <= Math.min(SMALL_DEBT_MAX, Math.max(5_000, 0.1 * (monthlyIncome || 0)))
  );
}

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : 0;
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const rs = (v: number) => `₹${formatIndian(Math.round(Math.max(0, v)))}`;
const lakh = (v: number) => {
  const l = v / 1_00_000;
  return `₹${l >= 10 ? Math.round(l) : Math.round(l * 10) / 10}L`;
};
const crore = (v: number) => `₹${Math.round((v / 1_00_00_000) * 100) / 100}Cr`;
/** Linear from full points at `good` down to 0 at `bad` (bad > good). */
const slope = (x: number, good: number, bad: number) =>
  clamp01((bad - x) / (bad - good));

function pillar(
  id: ScorePillarId,
  points: number,
  line: string,
  actions: Array<{ text: string; gain: number } | null>,
): ScorePillar {
  const max = PILLAR_MAX[id];
  const best = actions
    .filter((a): a is { text: string; gain: number } => !!a && a.gain >= 0.5)
    .sort((a, b) => b.gain - a.gain)[0];
  return {
    id,
    label: PILLAR_LABEL[id],
    points: Math.round(Math.min(max, Math.max(0, points)) * 10) / 10,
    max,
    line,
    ...(best
      ? { action: { pillar: id, text: best.text, gain: Math.round(best.gain) } }
      : {}),
  };
}

function safetyPillar(i: MoneyScoreInput): ScorePillar {
  const ef =
    i.emergency.target > 0 ? clamp01(i.emergency.have / i.emergency.target) : 1;
  const med =
    i.medical.target > 0 ? clamp01(i.medical.have / i.medical.target) : 1;
  const efGap = Math.max(0, i.emergency.target - i.emergency.have);
  const medGap = Math.max(0, i.medical.target - i.medical.have);
  return pillar(
    "safety",
    14 * ef + 6 * med,
    `Emergency fund: ${i.emergency.monthsHave.toFixed(1)} months of costs saved (you need ${i.emergency.monthsNeeded}). Medical fund: ${rs(i.medical.have)} of ${rs(i.medical.target)}.`,
    [
      efGap > 0
        ? {
            text: `Add ${rs(efGap)} to your emergency fund (savings account + liquid fund).`,
            gain: 14 * (1 - ef),
          }
        : null,
      medGap > 0
        ? {
            text: `Keep ${rs(medGap)} aside for hospital bills, in a liquid fund or sweep-in FD.`,
            gain: 6 * (1 - med),
          }
        : null,
    ],
  );
}

function protectionPillar(i: MoneyScoreInput): ScorePillar {
  const h = i.health;
  const healthRatio = h.target > 0 ? clamp01(h.total / h.target) : 1;
  // Company cover ends with the job, so it alone can't earn full marks.
  const healthPts = Math.min(10 * healthRatio, h.employerOnly ? 6 : 10);
  const healthLine =
    h.total <= 0
      ? "No health cover"
      : `Health cover ${lakh(h.total)}${h.employerOnly ? " (company only)" : ""} (you need ${lakh(h.target)})`;
  const healthAction =
    h.total <= 0
      ? {
          text: `Buy a ${lakh(h.target)} health policy for your family.`,
          gain: 10,
        }
      : h.employerOnly
        ? {
            text: `Buy your own health policy. Company cover stops when you change jobs or retire.`,
            gain: 10 - healthPts,
          }
        : h.total < h.target
          ? {
              text: `Add a ${lakh(h.target - h.total)} super top-up to your health cover. It costs little.`,
              gain: 10 - healthPts,
            }
          : null;

  const t = i.term;
  let termPts = 10;
  let termLine: string;
  let termAction: { text: string; gain: number } | null = null;
  // Monthly premium for extra cover, scaled from the estimate for full cover.
  const premiumFor = (cover: number) =>
    t.needed > 0 ? (t.premiumMonthly * cover) / t.needed : t.premiumMonthly;
  if (t.cover <= 0 && t.optional) {
    termLine = "term cover not needed yet - no one depends on your income";
  } else if (t.cover <= 0) {
    termPts = 0;
    termLine = "no term cover";
    termAction = {
      text: `Buy ${crore(t.needed)} term cover (about ${rs(t.premiumMonthly)}/month).`,
      gain: 10,
    };
  } else if (t.optional || t.cover >= t.needed) {
    termLine = `term cover ${crore(t.cover)} - enough for your family`;
  } else {
    // The base earns most of the points; the rest comes with the full need.
    const floor = Math.min(t.floor, t.needed);
    termPts =
      t.cover >= floor
        ? 7 + 3 * clamp01((t.cover - floor) / Math.max(1, t.needed - floor))
        : 7 * clamp01(t.cover / Math.max(1, floor));
    termLine = `term cover ${crore(t.cover)} (your family would need ${crore(t.needed)})`;
    termAction = {
      text: `Add ${crore(t.needed - t.cover)} term cover with a second policy (about ${rs(premiumFor(t.needed - t.cover))}/month). Keep the one you have.`,
      gain: 10 - termPts,
    };
  }
  return pillar(
    "protection",
    healthPts + termPts,
    `${healthLine}. ${termLine[0].toUpperCase()}${termLine.slice(1)}.`,
    [healthAction, termAction],
  );
}

/** EMIs on loans costing 12%+ a year (personal, credit card, bike...); small balances don't count. */
export function costlyEmiMonthly(
  p: FinancialProfile,
  monthlyIncome = 0,
): number {
  const cardCarry =
    n(p.creditCardCarriedBalance) * 0.035 + n(p.creditCardEmiMonthly);
  const unified = (p.unifiedLoans ?? []).filter((l) => n(l.monthlyEMI) > 0);
  if (unified.length > 0) {
    return (
      cardCarry +
      unified
        .filter((l) => !isSmallDebt(n(l.outstandingAmount), monthlyIncome))
        .filter((l) =>
          n(l.interestRate) > 0
            ? n(l.interestRate) >= COSTLY_RATE
            : COSTLY_LOAN_TYPES.has(l.loanType),
        )
        .reduce((s, l) => s + n(l.monthlyEMI), 0)
    );
  }
  const personal =
    n(p.personalLoanRate) > 0 && n(p.personalLoanRate) < COSTLY_RATE
      ? 0
      : n(p.personalLoanEMI);
  return cardCarry + personal + n(p.bikeEMI);
}

function debtPillar(i: MoneyScoreInput): ScorePillar {
  if (i.income <= 0)
    return pillar("debt", 0, "Add your income to check your loans.", []);
  const r = i.loansMonthly / i.income;
  const emiPts =
    r <= 0.2
      ? 10
      : r <= 0.35
        ? 10 - ((r - 0.2) / 0.15) * 5
        : 5 * slope(r, 0.35, 0.5);
  const costly = costlyEmiMonthly(i.profile, i.income);
  const c = costly / i.income;
  const costlyPts = 5 * slope(c, 0, 0.15);
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return pillar(
    "debt",
    emiPts + costlyPts,
    i.loansMonthly <= 0
      ? "No loans - nothing eating into your income."
      : `EMIs take ${pct(r)} of your income (healthy is under 20%).${costly > 0 ? ` ${rs(costly)}/month of it is on loans above 12% interest.` : ""}`,
    [
      costly > 0
        ? {
            text: "Pay off your costliest loan first (credit card, personal loan). It saves more than most investments earn.",
            gain: 5 - costlyPts,
          }
        : null,
      r > 0.2
        ? {
            text: `Don't take new loans until your EMIs are under 20% of income (now ${pct(r)}).`,
            gain: 10 - emiPts,
          }
        : null,
    ],
  );
}

function savingPillar(i: MoneyScoreInput): ScorePillar {
  if (i.income <= 0)
    return pillar("saving", 0, "Add your income to check your saving.", []);
  const rate = i.investingMonthly / i.income;
  const ratePts = 10 * clamp01(rate / TARGET_SAVING_RATE);
  const idle = Math.max(0, i.unallocatedMonthly);
  const u = idle / i.income;
  const idlePts = 5 * slope(u, 0.1, 0.4);
  const shortBy = Math.max(
    0,
    i.income * TARGET_SAVING_RATE - i.investingMonthly,
  );
  return pillar(
    "saving",
    ratePts + idlePts,
    `You invest ${Math.round(rate * 100)}% of your income (aim for ${TARGET_SAVING_RATE * 100}%).${idle > 0 ? ` ${rs(idle)} a month is left over with no plan.` : ""}`,
    [
      shortBy > 0
        ? {
            text: `Invest ${rs(shortBy)} more each month to reach ${TARGET_SAVING_RATE * 100}% of income. Set an auto SIP for salary day.`,
            gain: 10 - ratePts,
          }
        : null,
      u > 0.1
        ? {
            text: `Start SIPs with the ${rs(idle)} left over each month. Your Fix Plan shows how much goes to each goal.`,
            gain: 5 - idlePts,
          }
        : null,
    ],
  );
}

function goalsPillar(i: MoneyScoreInput): ScorePillar {
  const now = i.now ?? new Date();
  const goals = detectGoals(i.profile, now).filter(
    (g) => g.type !== "debt_free",
  );
  const marks = earmarkExistingSavings(
    i.profile,
    now,
    i.safetyReserve ?? { fdNeededForEmergency: i.fdNeededForEmergency },
  );
  const rows = goals.map((g) => {
    const m = marks.get(g.id);
    const scratch = n(m?.monthlyFromScratch);
    const required = n(m?.monthlyRequired);
    return {
      goal: g,
      required,
      covered: scratch > 0 ? clamp01(1 - required / scratch) : 1,
    };
  });
  const totalRequired = rows.reduce((s, r) => s + r.required, 0);
  // Free monthly money, shared across goals in proportion to what each still
  // needs. It earns half credit: the money is there but not yet invested.
  const fill =
    totalRequired > 0
      ? clamp01(Math.max(0, i.unallocatedMonthly) / totalRequired)
      : 1;
  const onTrack = rows.map((r) => ({
    ...r,
    share: clamp01(r.covered + (1 - r.covered) * fill * 0.5),
  }));
  const retirement = onTrack.find((r) => r.goal.type === "retirement");
  const others = onTrack.filter((r) => r.goal.type !== "retirement");
  const retWeight = others.length > 0 ? 10 : 20;
  const otherWeight = others.length > 0 ? 10 / others.length : 0;
  const points =
    (retirement ? retWeight * retirement.share : retWeight) +
    others.reduce((s, r) => s + otherWeight * r.share, 0);
  const onTrackCount = others.filter((r) => r.share >= 0.95).length;
  const retPct = Math.round((retirement?.share ?? 1) * 100);
  // Never ask for more than is left over each month.
  const spare = Math.max(0, i.unallocatedMonthly);
  const actions = onTrack
    .filter((r) => r.share < 0.95 && r.required > 0)
    .map((r) => ({
      text:
        spare <= 0
          ? `${r.goal.label}: ${rs(r.goal.targetAmount)} by ${r.goal.targetYear} needs ${rs(r.required)}/month more, and nothing is left over each month yet. Free up money first, or see the Fix Plan for a later year or smaller target.`
          : spare > 0 && r.required > spare
            ? `${r.goal.label}: ${rs(r.goal.targetAmount)} by ${r.goal.targetYear} needs ${rs(r.required)}/month, more than the ${rs(spare)} you have left over. Start with what you can, and see the Fix Plan for a later year or smaller target.`
            : `${r.goal.label}: start a ${rs(r.required)}/month SIP to reach ${rs(r.goal.targetAmount)} by ${r.goal.targetYear}.`,
      gain:
        (r.goal.type === "retirement" ? retWeight : otherWeight) *
        (1 - r.share),
    }));
  return pillar(
    "goals",
    points,
    `Retirement is ${retPct}% on track.${others.length > 0 ? ` ${onTrackCount} of ${others.length} other ${others.length === 1 ? "goal" : "goals"} on track.` : ""} We count your savings, EPF, PPF, NPS and running SIPs.`,
    actions,
  );
}

/** Net worth a household is typically at by this age, as years of income. */
export function netWorthBenchmarkYears(age: number): number {
  return Math.max(0.5, (age - 25) / 5);
}

function wealthPillar(i: MoneyScoreInput): ScorePillar {
  const p = i.profile;
  const age = n(p.selfAge) || 30;
  const yearly = i.income * 12;
  const bench = netWorthBenchmarkYears(age);
  const years = yearly > 0 ? Math.max(0, i.netWorth) / yearly : 0;
  const nwPts = yearly > 0 ? 6 * clamp01(years / bench) : 0;

  const equity = existingEquityValue(p);
  const investable =
    equity +
    n(p.fdValue) +
    n(p.liquidMFValue) +
    n(p.savingsAccountBalance) +
    n(p.ppfBalance) +
    n(p.epfBalance) +
    n(p.npsBalance) * 0.5 +
    n(p.goldValue);
  const equityShare =
    investable > 0 ? (equity + n(p.npsBalance) * 0.5) / investable : 0;
  const minEquity = age < 35 ? 0.4 : age < 45 ? 0.3 : age < 55 ? 0.2 : 0.1;
  const rsu = n(p.rsuValueINR);
  const concentrated = rsu >= 5_00_000 && equity > 0 && rsu / equity > 0.5;
  const small = investable < 2_00_000;
  const mixPts = small
    ? 4
    : 2 * clamp01(equityShare / minEquity) + (concentrated ? 0 : 2);
  const fmtYears = (y: number) => {
    const v = Math.round(y * 10) / 10;
    return `${v} ${v === 1 ? "year" : "years"}`;
  };
  return pillar(
    "wealth",
    nwPts + mixPts,
    `Net worth is ${fmtYears(years)} of income (usual at ${age}: ${fmtYears(bench)}).${small ? "" : ` ${Math.round(equityShare * 100)}% of your investments are in equity${concentrated ? ", over half of it in your company's shares" : ""}.`}`,
    [
      concentrated
        ? {
            text: "Sell some RSUs at each vest and put the money in index funds. Over half your shares are in one company.",
            gain: 2,
          }
        : null,
      !small && equityShare < minEquity
        ? {
            text: `Put money for goals 7+ years away in equity index funds. Only ${Math.round(equityShare * 100)}% of your money is in things that beat inflation.`,
            gain: 2 - 2 * clamp01(equityShare / minEquity),
          }
        : null,
    ],
  );
}

export function computeMoneyScore(input: MoneyScoreInput): MoneyScore {
  const pillars = [
    safetyPillar(input),
    protectionPillar(input),
    debtPillar(input),
    savingPillar(input),
    goalsPillar(input),
    wealthPillar(input),
  ];
  const total =
    input.income > 0
      ? Math.round(pillars.reduce((s, p) => s + p.points, 0))
      : 0;
  const topActions = pillars
    .map((p) => p.action)
    .filter((a): a is ScoreAction => !!a && a.gain >= 1)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3);
  return { total: Math.max(0, Math.min(100, total)), pillars, topActions };
}
