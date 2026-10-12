/** Plan prices in rupees. Shared by the web and mobile Plans and Pricing. */
export type BillingPeriod = "monthly" | "yearly";
export type PaidPlanId = "pro" | "promax";

export const PLAN_PRICES: Record<
  PaidPlanId,
  { monthly: number; yearly: number }
> = {
  pro: { monthly: 49, yearly: 399 },
  promax: { monthly: 99, yearly: 799 },
};

/** Percent saved by paying yearly instead of 12 monthly payments. */
export function yearlySavingPct(plan: PaidPlanId): number {
  const { monthly, yearly } = PLAN_PRICES[plan];
  return Math.round(((monthly * 12 - yearly) / (monthly * 12)) * 100);
}

export const MONEY_MAP_FEATURE_LABEL =
  "Money Map: spending by nature across months";

export type PlanPriceDisplay = {
  /** "₹399" */
  price: string;
  /** "/month" or "/year" */
  period: string;
  /** Short period for compact cards: "/mo" or "/yr". */
  periodShort: string;
  /** "₹33/month, billed yearly" (yearly only). */
  note: string | null;
  /** "Save 32%" (yearly only). */
  saveLabel: string | null;
};

export function planPriceDisplay(
  plan: PaidPlanId,
  period: BillingPeriod,
): PlanPriceDisplay {
  const p = PLAN_PRICES[plan];
  if (period === "monthly") {
    return {
      price: `₹${p.monthly}`,
      period: "/month",
      periodShort: "/mo",
      note: null,
      saveLabel: null,
    };
  }
  return {
    price: `₹${p.yearly}`,
    period: "/year",
    periodShort: "/yr",
    note: `₹${Math.round(p.yearly / 12)}/month, billed yearly`,
    saveLabel: `Save ${yearlySavingPct(plan)}%`,
  };
}
