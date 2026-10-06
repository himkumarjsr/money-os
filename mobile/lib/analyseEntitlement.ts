/**
 * Who can open the Fix Plan — mirrors web result/fixplan checks
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
