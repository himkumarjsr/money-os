/**
 * Whether the signed-in user may open the Fix Plan, decided by the database
 * (public.fix_plan_access, migration 061): an active Play / App Store
 * purchase, Pro / Pro Max, users.is_admin, or a tester the super admin gave
 * the "fixplan_free" permission. Same rule as web lib/fixPlanAccess.ts.
 */
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { canOpenFixPlanDirectly } from "@/lib/analyseEntitlement";

export type FixPlanAccess = {
  hasAccess: boolean;
  /** purchase | pro | admin | granted | none | expired | legacy | skip */
  reason: string;
  expiresAt: string | null;
};

type AccessUser = {
  id?: string | null;
  subscriptionTier?: string | null;
  isAdmin?: boolean | null;
} | null;

function legacyAccess(user: AccessUser): FixPlanAccess {
  const ok =
    canOpenFixPlanDirectly(user?.subscriptionTier) || Boolean(user?.isAdmin);
  return { hasAccess: ok, reason: ok ? "legacy" : "none", expiresAt: null };
}

export async function fetchFixPlanAccess(
  user: AccessUser,
): Promise<FixPlanAccess> {
  if (canOpenFixPlanDirectly(user?.subscriptionTier)) {
    return { hasAccess: true, reason: "skip", expiresAt: null };
  }
  try {
    const { data, error } = await getSupabase().rpc("fix_plan_access");
    const row = (Array.isArray(data) ? data[0] : data) as {
      has_access?: boolean;
      reason?: string;
      expires_at?: string | null;
    } | null;
    if (!error && row && typeof row.has_access === "boolean") {
      return {
        hasAccess: row.has_access,
        reason: row.reason ?? "none",
        expiresAt: row.expires_at ?? null,
      };
    }
  } catch {
    /* offline / migration not installed: fall back below */
  }
  return legacyAccess(user);
}

/** Access for the current user; `null` while loading. */
export function useFixPlanAccess(user: AccessUser) {
  const [access, setAccess] = useState<FixPlanAccess | null>(null);
  const userId = user?.id ?? null;
  const tier = user?.subscriptionTier ?? null;
  const isAdmin = user?.isAdmin ?? null;

  const refresh = useCallback(async () => {
    if (!userId) {
      setAccess({ hasAccess: false, reason: "signed_out", expiresAt: null });
      return null;
    }
    const next = await fetchFixPlanAccess({
      id: userId,
      subscriptionTier: tier,
      isAdmin,
    });
    setAccess(next);
    return next;
  }, [userId, tier, isAdmin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { access, refresh, setAccess };
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
