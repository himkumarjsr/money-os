import { canBypassProPaywall } from "@/lib/subscriptionBypass";

/**
 * Money Map is a Pro feature: Pro and Pro Max tiers, plus the internal
 * bypass accounts / admins that already skip the paywall.
 */
export function canViewMoneyMap(opts: {
  tier: string | null | undefined;
  email?: string | null;
  isAdmin?: boolean | null;
}): boolean {
  const tier = String(opts.tier ?? "").toLowerCase();
  return (
    tier === "pro" ||
    tier === "promax" ||
    canBypassProPaywall(opts.email, opts.isAdmin)
  );
}
