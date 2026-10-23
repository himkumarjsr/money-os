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

export async function listConsoleAdmins(
  supabase: SupabaseServer,
): Promise<ConsoleAdmin[]> {
  const { data, error } = await supabase.rpc("admin_console_list");
  if (error) throw new Error(error.message);
  return (
    (data ?? []) as Array<{
      email: string;
      invited_by: string;
      created_at: string;
      has_account: boolean;
    }>
  ).map((r) => ({
    email: r.email,
    invitedBy: r.invited_by,
    createdAt: r.created_at,
    hasAccount: Boolean(r.has_account),
  }));
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
