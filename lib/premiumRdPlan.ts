import type {
  FinancialProfile,
  PremiumFrequency,
} from "@/lib/analyse-form-schema";

/**
 * Suggest a recurring deposit (RD) that saves up for yearly insurance
 * premiums, so the renewal never hits one month's budget.
 *
 * RD contributions are Security money (tracker subcategory `premium_rd`),
 * not Investment.
 */

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Most banks need an RD to run at least this many months. */
export const RD_MIN_MONTHS = 6;

/** Day of the month the RD instalment is due (soon after most salaries land). */
export const PREMIUM_RD_DUE_DAY = 5;

export const PREMIUM_RD_SOURCE = "analyse_rd";
/** Obligation category: an `insurance_*` value so it reads as Security. */
export const PREMIUM_RD_CATEGORY = "insurance_rd";
export const PREMIUM_RD_TITLE = "RD for insurance premiums";
export const PREMIUM_SAVINGS_TITLE = "Savings for insurance premiums";

/** "health" | "term" | "car" | "bike" | "other:<row index>" */
export type PremiumPolicyKey = string;

export type YearlyPremium = {
  key: PremiumPolicyKey;
  /** Lower-case policy name for sentences, e.g. "health". */
  label: string;
  /** Yearly premium in rupees. */
  premium: number;
  renewalMonth: number | null;
};

export type PremiumRdItem = YearlyPremium & {
  renewalMonth: number;
  /** Monthly instalments left before the renewal month (see `monthsUntilRenewal`). */
  monthsLeft: number;
  /** Rupees a month to have the premium ready by the renewal. */
  monthly: number;
  /** Rupees a month after this renewal, for the next one (premium / 12). */
  afterRenewalMonthly: number;
  /** "savings" when the renewal is too close for an RD. */
  mode: "rd" | "savings";
};

export type PremiumRdPlan = {
  items: PremiumRdItem[];
  /** Yearly policies with no renewal month: ask, never guess. */
  missing: YearlyPremium[];
  rdItems: PremiumRdItem[];
  savingsItems: PremiumRdItem[];
  rdMonthly: number;
  savingsMonthly: number;
};

type OtherRow = {
  policyName?: string;
  premiumAmount?: number;
  premiumInput?: number;
  frequency?: PremiumFrequency;
  renewalMonth?: number;
};

export type PremiumRdProfile = Partial<
  Omit<FinancialProfile, "otherInsurancePremiums">
> & { otherInsurancePremiums?: OtherRow[] };

function validMonth(m: unknown): number | null {
  const v = Number(m);
  return Number.isInteger(v) && v >= 1 && v <= 12 ? v : null;
}

function yearlyAmount(
  input: number | undefined,
  monthly: number | undefined,
  frequency: PremiumFrequency | undefined,
): number {
  if (frequency !== "yearly") return 0;
  if ((input ?? 0) > 0) return input!;
  return (monthly ?? 0) > 0 ? monthly! * 12 : 0;
}

/** Every premium the user pays once a year, with its renewal month if known. */
export function listYearlyPremiums(p: PremiumRdProfile): YearlyPremium[] {
  const out: YearlyPremium[] = [];
  const push = (
    key: string,
    label: string,
    premium: number,
    month: unknown,
  ) => {
    if (premium > 0) {
      out.push({ key, label, premium, renewalMonth: validMonth(month) });
    }
  };
  if (p.hasHealthInsurance) {
    push(
      "health",
      "health",
      yearlyAmount(
        p.healthInsurancePremiumInput,
        p.healthInsurancePremiumMonthly,
        p.healthInsurancePremiumFrequency,
      ),
      p.healthInsuranceRenewalMonth,
    );
  }
  if (p.hasTermInsurance) {
    push(
      "term",
      "term",
      yearlyAmount(
        p.termInsurancePremiumInput,
        p.termInsurancePremiumMonthly,
        p.termInsurancePremiumFrequency,
      ),
      p.termInsuranceRenewalMonth,
    );
  }
  push(
    "car",
    "car",
    yearlyAmount(
      p.carInsurancePremiumInput,
      p.carInsurancePremiumMonthly,
      p.carInsurancePremiumFrequency,
    ),
    p.carInsuranceRenewalMonth,
  );
  push(
    "bike",
    "bike",
    yearlyAmount(
      p.bikeInsurancePremiumInput,
      p.bikeInsurancePremiumMonthly,
      p.bikeInsurancePremiumFrequency,
    ),
    p.bikeInsuranceRenewalMonth,
  );
  if (p.hasOtherInsurance) {
    (p.otherInsurancePremiums ?? []).forEach((row, i) => {
      const amount = row.premiumAmount ?? row.premiumInput;
      push(
        `other:${i}`,
        row.policyName?.trim() || "other insurance",
        yearlyAmount(amount, undefined, row.frequency),
        row.renewalMonth,
      );
    });
  }
  return out;
}

/**
 * Monthly instalments you can still put in before the renewal month,
 * counting the current month: an RD opened now takes its first instalment
 * now and its last one in the month before the renewal. In October with a
 * March renewal that is Oct, Nov, Dec, Jan, Feb = 5. A renewal in the
 * current month is already due, so we plan for next year's: 12.
 */
export function monthsUntilRenewal(renewalMonth: number, today: Date): number {
  const current = today.getMonth() + 1;
  const months = (renewalMonth - current + 12) % 12;
  return months === 0 ? 12 : months;
}

/**
 * Premium spread over the months left when under a year away; premium / 12
 * once there is a full year (and after every renewal). Rounded up so the
 * pot is never short.
 */
export function monthlyForPremium(premium: number, monthsLeft: number): number {
  return Math.ceil(premium / Math.min(Math.max(monthsLeft, 1), 12));
}

/**
 * @param renewalOverrides months the user picked on the result card
 *   (by policy key) for policies saved without one.
 */
export function buildPremiumRdPlan(
  profile: PremiumRdProfile,
  today: Date = new Date(),
  renewalOverrides: Record<PremiumPolicyKey, number> = {},
): PremiumRdPlan {
  const items: PremiumRdItem[] = [];
  const missing: YearlyPremium[] = [];
  for (const policy of listYearlyPremiums(profile)) {
    const month =
      policy.renewalMonth ?? validMonth(renewalOverrides[policy.key]);
    if (!month) {
      missing.push(policy);
      continue;
    }
    const monthsLeft = monthsUntilRenewal(month, today);
    items.push({
      ...policy,
      renewalMonth: month,
      monthsLeft,
      monthly: monthlyForPremium(policy.premium, monthsLeft),
      afterRenewalMonthly: monthlyForPremium(policy.premium, 12),
      mode: monthsLeft < RD_MIN_MONTHS ? "savings" : "rd",
    });
  }
  const rdItems = items.filter((i) => i.mode === "rd");
  const savingsItems = items.filter((i) => i.mode === "savings");
  return {
    items,
    missing,
    rdItems,
    savingsItems,
    rdMonthly: rdItems.reduce((s, i) => s + i.monthly, 0),
    savingsMonthly: savingsItems.reduce((s, i) => s + i.monthly, 0),
  };
}

const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

function premiumName(item: YearlyPremium): string {
  return `${item.label} premium`;
}

/** One line per policy for the card's breakdown. */
export function premiumRdLine(item: PremiumRdItem): string {
  const name = premiumName(item);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}: ${inr(item.premium)} in ${MONTH_NAMES[item.renewalMonth - 1]} · ${inr(item.monthly)} a month`;
}

/** The card's main sentences. Empty when there is nothing to plan yet. */
export function premiumRdHeadline(plan: PremiumRdPlan): string[] {
  const lines: string[] = [];
  const { rdItems, savingsItems } = plan;
  if (rdItems.length === 1) {
    const i = rdItems[0];
    lines.push(
      `Your ${premiumName(i)} of ${inr(i.premium)} is due in ${MONTH_NAMES[i.renewalMonth - 1]}. Save ${inr(i.monthly)} a month in an RD so it's ready.`,
    );
  } else if (rdItems.length > 1) {
    const total = rdItems.reduce((s, i) => s + i.premium, 0);
    lines.push(
      `You pay ${inr(total)} a year in yearly premiums. One RD of ${inr(plan.rdMonthly)} a month gets them all ready on time.`,
    );
  }
  if (savingsItems.length === 1) {
    const i = savingsItems[0];
    lines.push(
      `Your ${premiumName(i)} of ${inr(i.premium)} is due in ${MONTH_NAMES[i.renewalMonth - 1]}. That's under ${RD_MIN_MONTHS} months away, too soon for most RDs, so set aside ${inr(i.monthly)} a month in savings.`,
    );
  } else if (savingsItems.length > 1) {
    lines.push(
      `${savingsItems.length} premiums are due in under ${RD_MIN_MONTHS} months, too soon for most RDs. Set aside ${inr(plan.savingsMonthly)} a month in savings for them.`,
    );
  }
  return lines;
}

export type PremiumRdObligation = {
  title: string;
  category: string;
  amount: number;
  frequency: "monthly";
  due_day: number;
  source: string;
  remind_days_before: number;
  is_active: true;
  notes: string;
};

/**
 * Monthly obligations for the tracker checklist: one combined RD row and,
 * when a renewal is under 6 months away, one savings row.
 */
export function buildPremiumRdObligations(
  plan: PremiumRdPlan,
): PremiumRdObligation[] {
  const rows: PremiumRdObligation[] = [];
  const base = {
    category: PREMIUM_RD_CATEGORY,
    frequency: "monthly" as const,
    due_day: PREMIUM_RD_DUE_DAY,
    source: PREMIUM_RD_SOURCE,
    remind_days_before: 3,
    is_active: true as const,
  };
  if (plan.rdMonthly > 0) {
    rows.push({
      ...base,
      title: PREMIUM_RD_TITLE,
      amount: plan.rdMonthly,
      notes: plan.rdItems.map(premiumRdLine).join("\n"),
    });
  }
  if (plan.savingsMonthly > 0) {
    rows.push({
      ...base,
      title: PREMIUM_SAVINGS_TITLE,
      amount: plan.savingsMonthly,
      notes: plan.savingsItems
        .map(
          (i) =>
            `${premiumRdLine(i)}, then ${inr(i.afterRenewalMonthly)} a month after renewal`,
        )
        .join("\n"),
    });
  }
  return rows;
}

/**
 * Copy renewal months picked on the result card back into a profile (or
 * Analyse form values — same field names), so the card stops asking.
 */
export function applyRenewalMonths<T extends RenewalFields>(
  profile: T,
  months: Record<PremiumPolicyKey, number>,
): T {
  const next: RenewalFields = { ...profile };
  for (const [key, raw] of Object.entries(months)) {
    const month = validMonth(raw);
    if (!month) continue;
    if (key === "health") next.healthInsuranceRenewalMonth = month;
    else if (key === "term") next.termInsuranceRenewalMonth = month;
    else if (key === "car") next.carInsuranceRenewalMonth = month;
    else if (key === "bike") next.bikeInsuranceRenewalMonth = month;
    else if (key.startsWith("other:")) {
      const index = Number(key.slice(6));
      const rows = [...(next.otherInsurancePremiums ?? [])];
      if (rows[index]) {
        rows[index] = { ...rows[index], renewalMonth: month };
        next.otherInsurancePremiums = rows;
      }
    }
  }
  return next as T;
}

type RenewalFields = {
  healthInsuranceRenewalMonth?: number;
  termInsuranceRenewalMonth?: number;
  carInsuranceRenewalMonth?: number;
  bikeInsuranceRenewalMonth?: number;
  otherInsurancePremiums?: Array<{ renewalMonth?: number }>;
};
