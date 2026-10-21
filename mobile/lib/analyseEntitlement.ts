/**
 * Who can open the Fix Plan - mirrors web result/fixplan checks
 * (pro / promax / admin, or the skip-payment dev flag).
 *
 * Mobile payments are not live yet: the paywall shows the ₹99 button but
 * unlocking passes straight through. Flip PAYMENTS_ENABLED once a store
 * billing flow exists.
 */
export const PAYMENTS_ENABLED = false;

export const FIX_PLAN_PRICE_INR = 99;

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

/** True when the Fix Plan screen itself should let the user in. */
export function canViewFixPlan(tier: string | null | undefined): boolean {
  return !PAYMENTS_ENABLED || canOpenFixPlanDirectly(tier);
}

/** Emails that unlock Pro UX without payment (same list as web subscriptionBypass). */
const PRO_PAYWALL_BYPASS_EMAILS = ["finkoin.os@gmail.com"];

/**
 * Money Map is Pro only: Pro / Pro Max tier from the user row, admins and the
 * internal bypass account, like web `canViewMoneyMap`. Unlike the Fix Plan it
 * stays locked while PAYMENTS_ENABLED is false: free users see the teaser.
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
