/**
 * Fits "Start this plan" around what is already running in Tracker, so a SIP
 * or premium saving the user added earlier is not suggested a second time.
 *
 * - Investment rows (SIP / PPF / FD) the profile already counts (LIC policies
 *   marked as investments, custom investments, the monthly SIP/RD/PPF/NPS
 *   fields) change nothing. Any other running investment is money the plan's
 *   budget doesn't know about, so it is taken off the suggestions, equity
 *   first since that is what a standalone SIP usually is.
 * - Premium savings (insurance RDs) pay the yearly premiums the plan already
 *   sets aside for as a monthly equivalent. When they run ahead of that
 *   (catching up before a renewal), the gap is reported, not deducted: it
 *   ends with the RD while plan reminders run every month.
 */
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import type { PlannedInvestmentDraft } from "@/lib/plannedInvestments";

export type TrackerRowLike = {
  title: string;
  category: string;
  amount: number;
  frequency: string;
  end_month?: string | null;
  is_active?: boolean;
};

export type TrackerFitItem = {
  title: string;
  monthly: number;
  kind: "investment" | "premium_saving";
  /** Monthly amount taken off this plan's suggestions. */
  counted: number;
  note: string;
};

export type TrackerPlanFit = {
  items: TrackerFitItem[];
  /** Running investments the plan's budget doesn't know about. */
  investmentCover: number;
  /** Premium savings above the yearly premiums' monthly equivalent. */
  premiumExtra: number;
  /** Last month that extra runs (YYYY-MM-01); null when open-ended. */
  premiumExtraUntil: string | null;
};

const INVESTMENT_CATEGORIES = new Set([
  "investment_sip",
  "investment_ppf",
  "investment_fd",
]);

function monthlyOf(row: Pick<TrackerRowLike, "amount" | "frequency">): number {
  const a = Number(row.amount) || 0;
  if (row.frequency === "yearly") return a / 12;
  if (row.frequency === "quarterly") return a / 3;
  if (row.frequency === "half_yearly") return a / 6;
  return a;
}

const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);

function namesOverlap(a: string, b: string): boolean {
  const wb = new Set(words(b));
  return words(a).some((w) => wb.has(w));
}

const near = (a: number, b: number) =>
  b > 0 && Math.abs(a - b) <= Math.max(50, b * 0.1);

function runsIn(row: TrackerRowLike, month: string): boolean {
  if (row.is_active === false) return false;
  return !row.end_month || row.end_month >= month;
}

export function trackerPlanFit(
  rows: TrackerRowLike[],
  profile: FinancialProfile | null | undefined,
  startMonth: string,
): TrackerPlanFit {
  const p = (profile ?? {}) as FinancialProfile;
  const items: TrackerFitItem[] = [];

  // Named things the profile already counts as investments.
  const named: { label: string; monthly: number; note: string }[] = [];
  for (const pol of p.otherInsurancePremiums ?? []) {
    if (!pol?.countAsInvestment) continue;
    const amt = Number(pol.premiumAmount) || 0;
    const monthly =
      pol.frequency === "yearly" ? amt / 12 : Number(pol.monthlyAmount) || amt;
    named.push({
      label: pol.policyName || "LIC",
      monthly,
      note: "Already counted as your insurance policy",
    });
  }
  for (const c of p.customInvestments ?? []) {
    if ((c?.monthlyContribution || 0) <= 0) continue;
    named.push({
      label: c.label,
      monthly: c.monthlyContribution,
      note: "Already counted in your form",
    });
  }
  let formPool =
    (p.monthlySIP || 0) +
    (p.monthlyRD || 0) +
    (p.monthlyPPFContribution || 0) +
    (p.monthlyNPSContribution || 0);

  let investmentCover = 0;
  for (const row of rows) {
    if (!INVESTMENT_CATEGORIES.has(row.category) || !runsIn(row, startMonth))
      continue;
    const monthly = Math.round(monthlyOf(row));
    if (monthly <= 0) continue;
    const i = named.findIndex(
      (n) =>
        near(monthly, n.monthly) &&
        (namesOverlap(row.title, n.label) || named.length === 1),
    );
    if (i >= 0) {
      items.push({
        title: row.title,
        monthly,
        kind: "investment",
        counted: 0,
        note: named[i].note,
      });
      named.splice(i, 1);
      continue;
    }
    const inForm = Math.min(formPool, monthly);
    formPool -= inForm;
    const counted = monthly - inForm;
    investmentCover += counted;
    items.push({
      title: row.title,
      monthly,
      kind: "investment",
      counted,
      note:
        counted === 0
          ? "Already counted in your form"
          : "Counted toward this plan",
    });
  }

  const yearlyEquivalent =
    (p.healthInsurancePremiumFrequency === "monthly"
      ? 0
      : p.healthInsurancePremiumMonthly || 0) +
    (p.termInsurancePremiumFrequency === "monthly"
      ? 0
      : p.termInsurancePremiumMonthly || 0) +
    (p.carInsurancePremiumFrequency === "monthly"
      ? 0
      : p.carInsurancePremiumMonthly || 0) +
    (p.bikeInsurancePremiumFrequency === "monthly"
      ? 0
      : p.bikeInsurancePremiumMonthly || 0) +
    (p.otherInsurancePremiums ?? []).reduce(
      (s, pol) =>
        s +
        (pol?.frequency === "yearly"
          ? (Number(pol.premiumAmount) || 0) / 12
          : 0),
      0,
    );
  const rds = rows
    .filter((r) => r.category === "insurance_rd" && runsIn(r, startMonth))
    .map((r) => ({ row: r, monthly: Math.round(monthlyOf(r)) }))
    .filter((r) => r.monthly > 0);
  for (const { row, monthly } of rds) {
    items.push({
      title: row.title,
      monthly,
      kind: "premium_saving",
      counted: 0,
      note: "Saves for a premium the plan already sets aside for",
    });
  }
  const extraIn = (month: string) =>
    Math.max(
      0,
      Math.round(
        rds
          .filter(({ row }) => runsIn(row, month))
          .reduce((s, r) => s + r.monthly, 0) - yearlyEquivalent,
      ),
    );
  const premiumExtra = extraIn(startMonth);
  // Last month the extra still runs, looking up to two years ahead.
  let premiumExtraUntil: string | null = null;
  if (premiumExtra > 0) {
    const [y, m] = startMonth.split("-").map(Number);
    const at = (o: number) => {
      const d = new Date(y, m - 1 + o, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    };
    premiumExtraUntil = startMonth;
    for (let o = 1; o <= 24; o += 1) {
      if (extraIn(at(o)) === 0) break;
      premiumExtraUntil = o === 24 ? null : at(o);
    }
  }

  return {
    items,
    investmentCover,
    premiumExtra,
    premiumExtraUntil,
  };
}

const EQUITY_ORDER = ["equity_index", "flexicap"];

/**
 * Takes `cover` off the drafts: equity slices first (largest first), then
 * the rest in proportion. Returns the new drafts and how much was taken off
 * each, keyed like plannedDraftKey. Rows that reach zero are dropped.
 */
export function applyTrackerCover(
  drafts: PlannedInvestmentDraft[],
  cover: number,
): { drafts: PlannedInvestmentDraft[]; taken: Record<string, number> } {
  const key = (d: PlannedInvestmentDraft) =>
    `${d.source_id}|${d.instrument_key}`;
  const taken: Record<string, number> = {};
  let left = Math.max(0, Math.round(cover));
  if (left === 0) return { drafts, taken };
  const amounts = drafts.map((d) => d.monthly_amount);

  const equity = drafts
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => EQUITY_ORDER.includes(d.instrument_key))
    .sort((a, b) => b.d.monthly_amount - a.d.monthly_amount);
  for (const { d, i } of equity) {
    if (left === 0) break;
    const t = Math.min(left, amounts[i]);
    amounts[i] -= t;
    left -= t;
    taken[key(d)] = (taken[key(d)] ?? 0) + t;
  }
  const rest = amounts.reduce((s, a) => s + a, 0);
  if (left > 0 && rest > 0) {
    const share = Math.min(1, left / rest);
    drafts.forEach((d, i) => {
      const t = Math.min(amounts[i], Math.round(amounts[i] * share));
      amounts[i] -= t;
      taken[key(d)] = (taken[key(d)] ?? 0) + t;
    });
  }
  return {
    drafts: drafts
      .map((d, i) => ({ ...d, monthly_amount: amounts[i] }))
      .filter((d) => d.monthly_amount > 0),
    taken,
  };
}
