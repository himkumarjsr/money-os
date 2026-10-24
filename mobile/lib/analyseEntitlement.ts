/**
 * Who can open the Fix Plan - mirrors web result/fixplan checks.
 *
 * The Fix Plan is a ₹199 one-year pass bought through Google Play Billing /
 * Apple In-App Purchase (lib/fixPlanBilling.ts). Access itself comes from the
 * server (lib/fixPlanAccess.ts); these helpers only cover the cases we know
 * without asking it (paid tier, skip-payment dev flag).
 */
export const PAYMENTS_ENABLED = true;

export const FIX_PLAN_PRICE_INR = 199;

/** Store product id, same in Play Console and App Store Connect. */
export const FIX_PLAN_PRODUCT_ID = "fix_plan_1y";

const PAID_TIERS = new Set(["pro", "promax", "admin"]);

export function skipPaymentFlag(): boolean {
  return process.env.EXPO_PUBLIC_SKIP_PAYMENT === "true";
}

export function hasPaidFixPlanTier(tier: string | null | undefined): boolean {
  return PAID_TIERS.has(String(tier ?? "").toLowerCase());
}

/** True when the user may open the Fix Plan without going through the paywall. */
export function canOpenFixPlanDirectly(
  tier: string | null | undefined,
): boolean {
  return skipPaymentFlag() || hasPaidFixPlanTier(tier);
}

/** Emails that unlock Pro UX without payment (same list as web subscriptionBypass). */
const PRO_PAYWALL_BYPASS_EMAILS = ["finkoin.os@gmail.com"];

/**
 * Money Map is Pro only: Pro / Pro Max tier from the user row, admins and the
 * internal bypass account, like web `canViewMoneyMap`. Free users see the
 * teaser.
 */
export function canViewMoneyMap(opts: {
  tier: string | null | undefined;
  email?: string | null;
  isAdmin?: boolean | null;
}): boolean {
  if (opts.isAdmin) return true;
  const tier = String(opts.tier ?? "").toLowerCase();
  if (tier === "pro" || tier === "promax" || tier === "admin") return true;
  const e = opts.email?.trim().toLowerCase();
  return !!e && PRO_PAYWALL_BYPASS_EMAILS.includes(e);
}
