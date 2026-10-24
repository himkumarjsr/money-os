import { hasAdminPermission } from "@/lib/adminPermissions";
import { canBypassProPaywall } from "@/lib/subscriptionBypass";

/**
 * Money Map is a Pro feature: Pro and Pro Max tiers, plus the internal
 * bypass accounts / admins that already skip the paywall, and anyone the
 * super admin gave free Pro (migration 062).
 */
export function canViewMoneyMap(opts: {
  tier: string | null | undefined;
  email?: string | null;
  isAdmin?: boolean | null;
  adminPermissions?: readonly string[] | null;
}): boolean {
  const tier = String(opts.tier ?? "").toLowerCase();
  return (
    tier === "pro" ||
    tier === "promax" ||
    canBypassProPaywall(opts.email, opts.isAdmin) ||
    hasAdminPermission(opts.adminPermissions, "pro_free")
  );
}
