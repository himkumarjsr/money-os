import { getSupabase } from "@/lib/supabase";

/**
 * Who may open the Fix Plan on the web. The plan is bought only in the
 * mobile app (Google Play / App Store, ₹199 for one year); the purchase is
 * stored against the account, so the same login unlocks it here.
 *
 * The database decides (public.fix_plan_access, migration 061): an active
 * store purchase, Pro / Pro Max, users.is_admin, or a tester the super admin
 * gave the "fixplan_free" permission.
 */

export const FIX_PLAN_PRICE_INR = 199;

export type FixPlanAccess = {
  hasAccess: boolean;
  /** purchase | pro | admin | granted | none | expired | signed_out | legacy */
  reason: string;
  /** End of the paid year, when access comes from a purchase (or it expired). */
  expiresAt: string | null;
};

type LegacyUser = {
  subscriptionTier?: string | null;
  isAdmin?: boolean | null;
} | null;

/** Pre-061 rule, used only while the migration isn't installed yet. */
export function legacyFixPlanAccess(user: LegacyUser): FixPlanAccess {
  const tier = String(user?.subscriptionTier ?? "").toLowerCase();
  const ok = tier === "pro" || tier === "promax" || Boolean(user?.isAdmin);
  return { hasAccess: ok, reason: ok ? "legacy" : "none", expiresAt: null };
}

export function parseFixPlanAccessRow(data: unknown): FixPlanAccess | null {
  const row = (Array.isArray(data) ? data[0] : data) as
    | { has_access?: boolean; reason?: string; expires_at?: string | null }
    | null
    | undefined;
  if (!row || typeof row.has_access !== "boolean") return null;
  return {
    hasAccess: row.has_access,
    reason: row.reason ?? (row.has_access ? "purchase" : "none"),
    expiresAt: row.expires_at ?? null,
  };
}

export async function fetchFixPlanAccess(
  user: LegacyUser,
): Promise<FixPlanAccess> {
  try {
    const { data, error } = await getSupabase().rpc("fix_plan_access");
    if (!error) {
      const parsed = parseFixPlanAccessRow(data);
      if (parsed) return parsed;
    } else {
      console.warn("fix_plan_access failed:", error.message);
    }
  } catch (err) {
    console.warn("fix_plan_access failed:", err);
  }
  return legacyFixPlanAccess(user);
}

export function formatAccessDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
