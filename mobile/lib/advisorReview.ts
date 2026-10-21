/**
 * Adviser's review of the whole portfolio, on top of the fix plan: money
 * that is sitting in the wrong place, and one action list split into this
 * week / every month / every year. Shared by web and the app (mobile keeps a
 * byte-identical copy at mobile/lib/advisorReview.ts).
 */
import { formatIndian } from "@/lib/formatters";
import { existingEquityValue, LONG_RUN_INFLATION } from "@/lib/financialEngine";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import type { PriorityPlan } from "@/lib/priorityEngine";

export type MoneyFix = {
  id: "costly_debt" | "idle_cash" | "fd_below_inflation" | "equity_near_goal";
  title: string;
  detail: string;
  /** Rough yearly gain from acting on it, when we can tell. */
  yearlyGain?: number;
};

export type AdvisorReview = {
  fixes: MoneyFix[];
  thisWeek: string[];
  monthly: string[];
  yearly: string[];
};

/** Debt costlier than this (% a year) is worth clearing with savings. */
export const COSTLY_DEBT_RATE = 12;
/** Typical savings account interest (% a year). */
const SAVINGS_RATE = 3;
/** Idle cash below this isn't worth a note. */
const IDLE_FLOOR = 50_000;

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : 0;
};
const rs = (v: number) => `₹${formatIndian(Math.round(Math.max(0, v)))}`;

export function buildAdvisorReview(
  profile: Partial<FinancialProfile>,
  plan: Pick<PriorityPlan, "priorities" | "debts" | "goalFunding">,
): AdvisorReview {
  const p = profile;
  const byId = (id: string) => (plan.priorities ?? []).find((x) => x.id === id);
  const emergency = byId("emergency_fund");
  const medical = byId("medical_fund");
  const inflationPct = Math.round(LONG_RUN_INFLATION * 1000) / 10;

  // Cash beyond both safety funds (they are meant to sit in cash / liquid funds).
  const cash = n(p.savingsAccountBalance) + n(p.liquidMFValue);
  const idleCash = Math.max(
    0,
    cash - n(emergency?.targetAmount) - n(medical?.targetAmount),
  );
  // FD the emergency fund doesn't lean on (FDs count at 70% toward it).
  const fdSpare = Math.max(
    0,
    n(p.fdValue) -
      Math.max(
        0,
        n(emergency?.targetAmount) -
          n(p.savingsAccountBalance) -
          n(p.liquidMFValue) * 0.95,
      ) /
        0.7,
  );

  const fixes: MoneyFix[] = [];

  const costly = (plan.debts ?? [])
    .filter((d) => d.rate >= COSTLY_DEBT_RATE && d.outstanding > 0)
    .sort((a, b) => b.rate - a.rate);
  let spare = idleCash + fdSpare;
  for (const d of costly) {
    if (spare <= 0) break;
    const pay = Math.min(spare, d.outstanding);
    spare -= pay;
    const name = d.displayName || d.lenderName || d.type;
    fixes.push({
      id: "costly_debt",
      title: `Clear your ${name.toLowerCase()} with savings`,
      detail: `It costs about ${d.rate}% a year while your cash and FDs earn ${SAVINGS_RATE}-7%. Using ${rs(pay)} of spare savings to ${pay >= d.outstanding ? "close it" : "cut it"} is a sure ${d.rate}% return.`,
      yearlyGain: Math.round((pay * (d.rate - 7)) / 100),
    });
  }
  const usedForDebt = idleCash + fdSpare - spare;
  const idleLeft = Math.max(0, idleCash - usedForDebt);

  if (idleLeft >= IDLE_FLOOR) {
    fixes.push({
      id: "idle_cash",
      title: "Cash sitting idle",
      detail: `${rs(idleLeft)} sits in your savings account / liquid funds beyond your emergency and medical funds, earning about ${SAVINGS_RATE}% - less than ${inflationPct}% inflation. Put it into your nearest goal's fund.`,
      yearlyGain: Math.round((idleLeft * (8 - SAVINGS_RATE)) / 100),
    });
  }

  const fdRate = n(p.fdRate);
  if (n(p.fdValue) > 0 && fdRate > 0 && fdRate <= LONG_RUN_INFLATION * 100) {
    fixes.push({
      id: "fd_below_inflation",
      title: "FD earning less than inflation",
      detail: `Your FDs earn ${fdRate}%, about the same as ${inflationPct}% inflation - after tax they lose value. Keep FDs for money you need within 3 years; at maturity move the rest to index / hybrid funds for long goals.`,
    });
  }

  // Goals within 2 years shouldn't ride on shares: a fall can't recover in time.
  const near = (plan.goalFunding?.items ?? []).filter(
    (g) => g.yearsToGoal <= 2 && g.type !== "retirement" && g.currentSaved > 0,
  );
  const safePots =
    fdSpare +
    n(p.goldValue) +
    (n(p.nscDepositAmount) ||
      (
        (p as { postOfficeSchemes?: Array<{ amount?: number }> })
          .postOfficeSchemes ?? []
      ).reduce((s, r) => s + n(r?.amount), 0));
  const equityForNear = Math.max(
    0,
    near.reduce((s, g) => s + g.currentSaved, 0) - safePots,
  );
  if (equityForNear >= IDLE_FLOOR) {
    fixes.push({
      id: "equity_near_goal",
      title: "Shares held for a goal that's close",
      detail: `About ${rs(equityForNear)} of your funds / stocks is earmarked for ${near.map((g) => g.label.toLowerCase()).join(", ")} within 2 years. Move it to an FD or short-term debt fund over the next few months so a market fall doesn't hit the date.`,
    });
  }

  // ── Action list ────────────────────────────────────────────────────────
  const thisWeek: string[] = [];
  for (const item of plan.priorities ?? []) {
    if (n(item.fromSavings) > 0) thisWeek.push(item.actionThisWeek);
  }
  for (const f of fixes) {
    if (f.id === "costly_debt") thisWeek.push(`${f.title}. ${f.detail}`);
  }
  if (thisWeek.length === 0) {
    const first = (plan.priorities ?? []).find(
      (x) => x.status !== "complete" && !x.needsAnswer,
    );
    if (first) thisWeek.push(first.actionThisWeek);
  }

  const monthly: string[] = [];
  for (const item of plan.priorities ?? []) {
    if (item.monthlyContribution <= 0 || item.status === "complete") continue;
    const from =
      (item.startMonth ?? 1) > 1 ? ` from month ${item.startMonth}` : "";
    monthly.push(
      `${rs(item.monthlyContribution)}/month${from} → ${item.title} (${item.instrument})`,
    );
  }
  const running =
    n(p.monthlySIP) +
    n(p.monthlyRD) +
    (p.customInvestments ?? []).reduce(
      (s, c) => s + n(c?.monthlyContribution),
      0,
    );
  if (running > 0) {
    monthly.push(
      `Keep your ${rs(running)}/month running SIPs / RD going - they're already counted toward your goals.`,
    );
  }

  const yearly: string[] = [];
  const stepUp = n(p.annualSalaryIncreasePct);
  yearly.push(
    stepUp > 0
      ? `Each April, raise every SIP by ${Math.min(stepUp, 10)}% as your salary grows.`
      : "Each April, raise every SIP by 10% (or by your pay rise).",
  );
  yearly.push(
    "Once a year, move money for any goal now under 3 years away from equity to FDs / debt funds.",
  );
  if (existingEquityValue(p) > 0) {
    yearly.push(
      "Before 31 March, sell and rebuy equity funds to book up to ₹1.25L of long-term gains tax-free each year.",
    );
  }
  yearly.push(
    "Renew term and health cover on time, and re-run Analyse after any pay rise, new loan or new goal.",
  );

  return { fixes, thisWeek, monthly, yearly };
}
