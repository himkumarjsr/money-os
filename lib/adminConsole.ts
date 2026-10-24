import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

/**
 * Server-side access check for the admin console (/admin and /api/admin/*).
 * Admins are listed in private.console_admins (migration 053) and checked by
 * the database against the caller's verified email, so hiding the page in
 * the UI is never what keeps people out.
 */

export type ConsoleAdmin = {
  email: string;
  invitedBy: string;
  createdAt: string;
  hasAccount: boolean;
  /** Super admins always have every permission (migration 060). */
  isSuper: boolean;
  /** Keys the super admin granted (migration 062). */
  perms: string[];
};

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function getConsoleAccess(): Promise<{
  user: User | null;
  isAdmin: boolean;
  supabase: SupabaseServer | null;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { user: null, isAdmin: false, supabase };

    const { data, error } = await supabase.rpc("admin_console_is_admin");
    if (error) {
      console.error("admin_console_is_admin failed:", error.message);
      return { user, isAdmin: false, supabase };
    }
    return { user, isAdmin: data === true, supabase };
  } catch {
    return { user: null, isAdmin: false, supabase: null };
  }
}

/** Admins with their permissions. Super admin only (migration 062). */
export async function listConsoleAdmins(
  supabase: SupabaseServer,
): Promise<ConsoleAdmin[]> {
  const { data, error } = await supabase.rpc("admin_console_list_access");
  if (error) throw new Error(error.message);
  return (
    (data ?? []) as Array<{
      email: string;
      invited_by: string;
      created_at: string;
      has_account: boolean;
      is_super: boolean;
      perms: string[] | null;
    }>
  ).map((r) => ({
    email: r.email,
    invitedBy: r.invited_by,
    createdAt: r.created_at,
    hasAccount: Boolean(r.has_account),
    isSuper: Boolean(r.is_super),
    perms: Array.isArray(r.perms) ? r.perms : [],
  }));
}

/**
 * The caller's own permission keys (["*"] for the super admin). If the call
 * fails (say migration 062 hasn't run yet) only the super admin keeps the
 * whole console; everyone else sees nothing until it works.
 */
export async function getMyConsolePermissions(
  supabase: SupabaseServer,
): Promise<string[]> {
  const { data, error } = await supabase.rpc("admin_console_my_permissions");
  if (error) {
    console.error("admin_console_my_permissions failed:", error.message);
    return (await isConsoleSuperAdmin(supabase)) ? ["*"] : [];
  }
  return Array.isArray(data)
    ? data.filter((p): p is string => typeof p === "string")
    : [];
}

export type AnalyseLogRow = {
  id: number;
  createdAt: string;
  email: string | null;
  source: string;
  platform: string | null;
  appVersion: string | null;
  checkCount: number;
  payload: Record<string, unknown>;
};

export async function listAnalyseLogs(
  supabase: SupabaseServer,
  opts: { limit?: number; email?: string; onlyChecks?: boolean } = {},
): Promise<AnalyseLogRow[]> {
  const { data, error } = await supabase.rpc("admin_console_analyse_logs", {
    p_limit: opts.limit ?? 50,
    p_email: opts.email || null,
    p_only_checks: opts.onlyChecks ?? false,
  });
  if (error) throw new Error(error.message);
  return (
    (data ?? []) as Array<{
      id: number;
      created_at: string;
      email: string | null;
      source: string;
      platform: string | null;
      app_version: string | null;
      check_count: number;
      payload: Record<string, unknown>;
    }>
  ).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    email: r.email,
    source: r.source,
    platform: r.platform,
    appVersion: r.app_version,
    checkCount: r.check_count,
    payload: r.payload ?? {},
  }));
}

export type PlanTick = {
  itemId: string;
  doneBy: string;
  doneAt: string;
};

/** Whether the caller may tick the plan checklist (migration 060). */
export async function isConsoleSuperAdmin(
  supabase: SupabaseServer,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("admin_console_is_super_admin");
  if (error) {
    console.error("admin_console_is_super_admin failed:", error.message);
    return false;
  }
  return data === true;
}

export async function listPlanTicks(
  supabase: SupabaseServer,
): Promise<PlanTick[]> {
  const { data, error } = await supabase.rpc("admin_console_plan_ticks");
  if (error) throw new Error(error.message);
  return (
    (data ?? []) as Array<{
      item_id: string;
      done_by: string;
      done_at: string;
    }>
  ).map((r) => ({ itemId: r.item_id, doneBy: r.done_by, doneAt: r.done_at }));
}
