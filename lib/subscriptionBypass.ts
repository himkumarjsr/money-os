/** Emails that unlock Pro UX without Razorpay (internal / demo). */
const PRO_PAYWALL_BYPASS_EMAILS = ["finkoin.os@gmail.com"];

export function canBypassProPaywall(
  email: string | null | undefined,
  isAdmin?: boolean | null,
): boolean {
  if (isAdmin) return true;
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  return PRO_PAYWALL_BYPASS_EMAILS.includes(e);
}

/**
 * Server-side Pro check for paid routes, from the `users` row. Clients can't
 * change `subscription_tier` / `is_admin` themselves (migration 043).
 */
export function hasProAccess(
  row: { subscription_tier?: string | null; is_admin?: boolean | null } | null,
  email: string | null | undefined,
): boolean {
  const tier = String(row?.subscription_tier ?? "").toLowerCase();
  return (
    tier === "pro" ||
    tier === "promax" ||
    canBypassProPaywall(email, row?.is_admin)
  );
}

/**
 * Whether paid AI routes refuse users without Fix Plan access. Off by
 * default so older app builds (which opened the Fix Plan for free) keep
 * working; set AI_PLAN_REQUIRES_PRO=true once the store billing build
 * (Play / App Store, migration 061) is live.
 */
export function aiPlanRequiresPro(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return (
    env.AI_PLAN_REQUIRES_PRO === "true" &&
    env.NEXT_PUBLIC_SKIP_PAYMENT !== "true"
  );
}
