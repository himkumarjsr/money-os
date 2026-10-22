/**
 * Yearly plan check: a year after the plan was made, compare it with what
 * the Tracker actually shows (income, needs, wants, investing) and offer to
 * update the plan's numbers in one tap - the way a planner sits down with a
 * client once a year. Pure; reads the Money Map report (trackerNatureReport)
 * so the numbers match the Tracker. Shared by web and the app (mobile keeps a
 * byte-identical copy).
 */
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { formatIndian } from "@/lib/formatters";
import type { NatureKey, NatureReport } from "@/lib/trackerNatureReport";
import { getUniversalBucketActuals } from "@/lib/universal-buckets";

/** Months after which the plan is due a check. */
export const PLAN_REVIEW_MONTHS = 12;
/** Whole Tracker months needed before we suggest new numbers. */
export const PLAN_REVIEW_MIN_MONTHS = 3;
/** Income changes smaller than this share are left alone. */
const INCOME_CHANGE = 0.05;
/** Spending changes smaller than this share are left alone. */
const SPEND_CHANGE = 0.1;

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : 0;
};
const rs = (v: number) => `₹${formatIndian(Math.round(Math.max(0, v)))}`;

/** Whole months since the plan was last checked; null when we don't know. */
export function monthsSincePlanReview(
  profile: Partial<FinancialProfile>,
  now: Date = new Date(),
): number | null {
  if (!profile.planReviewedAt) return null;
  const at = new Date(profile.planReviewedAt);
  if (Number.isNaN(at.getTime())) return null;
  let months =
    (now.getFullYear() - at.getFullYear()) * 12 +
    (now.getMonth() - at.getMonth());
  if (now.getDate() < at.getDate()) months -= 1;
  return Math.max(0, months);
}

export function planReviewDue(
  profile: Partial<FinancialProfile>,
  now: Date = new Date(),
): boolean {
  const months = monthsSincePlanReview(profile, now);
  return months !== null && months >= PLAN_REVIEW_MONTHS;
}

export type PlanReviewLine = {
  key: "income" | "needs" | "wants" | "investing";
  text: string;
  /** True when the plan's number would change. */
  changes: boolean;
};

export type PlanReview = {
  monthsSince: number;
  /** Whole Tracker months the averages come from. */
  basedOnMonths: number;
  lines: PlanReviewLine[];
  /** Profile fields to update; empty when the plan still fits. */
  patch: Partial<FinancialProfile>;
};

/**
 * What the Tracker says against the plan, or null when there are fewer than
 * {@link PLAN_REVIEW_MIN_MONTHS} finished months to go on.
 */
export function buildPlanReview(
  profile: FinancialProfile,
  report: NatureReport | null,
  now: Date = new Date(),
): PlanReview | null {
  if (!report) return null;
  const used = report.months
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.hasData && !m.partial);
  if (used.length < PLAN_REVIEW_MIN_MONTHS) return null;
  const avg = (keys: NatureKey[]) =>
    used.reduce(
      (s, { i }) =>
        s +
        keys.reduce(
          (t, k) => t + n(report.rows.find((r) => r.key === k)?.amounts[i]),
          0,
        ),
      0,
    ) / used.length;
  const incomeMonths = used.filter(({ m }) => m.income > 0);
  const income = incomeMonths.length
    ? incomeMonths.reduce((s, { m }) => s + m.income, 0) / incomeMonths.length
    : 0;

  const b = getUniversalBucketActuals(profile);
  const lines: PlanReviewLine[] = [];
  const patch: Partial<FinancialProfile> = {};

  // Income: the difference goes to the salary.
  const plannedIncome = n(profile.monthlySalary) + n(profile.otherIncome);
  if (income > 0 && plannedIncome > 0) {
    const diff = income - plannedIncome;
    const change = Math.abs(diff) / plannedIncome >= INCOME_CHANGE;
    if (change) {
      patch.monthlySalary = Math.max(
        0,
        Math.round(n(profile.monthlySalary) + diff),
      );
    }
    lines.push({
      key: "income",
      changes: change,
      text: change
        ? `Income is ${rs(income)} a month now, against ${rs(plannedIncome)} in your plan (${diff > 0 ? "up" : "down"} ${Math.round((Math.abs(diff) / plannedIncome) * 100)}%).`
        : `Income is about what your plan says (${rs(income)} a month).`,
    });
  }

  // Needs: the day-to-day costs (food, bills, travel, help) take the
  // difference; rent, school fees and support to parents are fixed amounts.
  const needs = avg(["needs"]);
  if (needs > 0 && b.needs > 0) {
    const diff = needs - b.needs;
    const variable = {
      foodTotal:
        n(profile.foodTotal) ||
        n(profile.vegetables) + n(profile.grocery) + n(profile.medicine),
      utilityTotal:
        n(profile.utilityTotal) ||
        n(profile.electricity) +
          n(profile.internet) +
          n(profile.gas) +
          n(profile.water),
      transportTotal:
        n(profile.transportTotal) || n(profile.fuel) + n(profile.cabMetro),
      domesticHelpTotal:
        n(profile.domesticHelpTotal) ||
        n(profile.houseHelpMonthly) + n(profile.cookHelpMonthly),
    };
    const base = Object.values(variable).reduce((s, v) => s + v, 0);
    const change = Math.abs(diff) / b.needs >= SPEND_CHANGE && base > 0;
    if (change) {
      const f = Math.max(0, (base + diff) / base);
      for (const [k, v] of Object.entries(variable)) {
        if (v > 0) patch[k as keyof typeof variable] = Math.round(v * f);
      }
    }
    lines.push({
      key: "needs",
      changes: change,
      text: change
        ? `Needs cost ${rs(needs)} a month, against ${rs(b.needs)} in your plan.`
        : `Needs are close to your plan (${rs(needs)} a month).`,
    });
  }

  // Wants: Tracker's wants and habits against lifestyle and travel.
  const wants = avg(["wants", "habits"]);
  if (wants > 0 && b.wants > 0) {
    const diff = wants - b.wants;
    const change = Math.abs(diff) / b.wants >= SPEND_CHANGE;
    if (change) {
      const lifestyle =
        n(profile.lifestyleTotal) ||
        n(profile.entertainment) +
          n(profile.shopping) +
          n(profile.personalCare);
      patch.lifestyleTotal = Math.max(0, Math.round(lifestyle + diff));
    }
    lines.push({
      key: "wants",
      changes: change,
      text: change
        ? `Wants and habits come to ${rs(wants)} a month, against ${rs(b.wants)} in your plan.`
        : `Wants are close to your plan (${rs(wants)} a month).`,
    });
  }

  const invested = avg(["investment"]);
  // EPF comes out of the salary, so the Tracker never sees it.
  const plannedSip =
    n(profile.monthlySIP) +
    n(profile.monthlyRD) +
    n(profile.monthlyPPFContribution) +
    n(profile.monthlyNPSContribution) +
    n(profile.ssy) +
    (profile.customInvestments ?? []).reduce(
      (t, c) => t + n(c?.monthlyContribution),
      0,
    );
  if (invested > 0 || plannedSip > 0) {
    lines.push({
      key: "investing",
      changes: false,
      text:
        invested + 100 < plannedSip
          ? `You invested ${rs(invested)} a month, ${rs(plannedSip - invested)} less than your plan. Check a SIP hasn't stopped.`
          : `You invested ${rs(invested)} a month - on track.`,
    });
  }

  return {
    monthsSince: monthsSincePlanReview(profile, now) ?? 0,
    basedOnMonths: used.length,
    lines,
    patch,
  };
}

/** The profile after the check: new numbers (if any) and today's date. */
export function applyPlanReview(
  profile: FinancialProfile,
  review: Pick<PlanReview, "patch"> | null,
  now: Date = new Date(),
): FinancialProfile {
  return {
    ...profile,
    ...(review?.patch ?? {}),
    planReviewedAt: now.toISOString(),
  };
}
