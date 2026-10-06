import { NextRequest, NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { getAuthedUser, rateLimit, tooManyRequests } from "@/lib/apiGuard";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

/**
 * Account deletion — required by Google Play's User Data policy and Apple
 * App Store Review Guideline 5.1.1(v): any app that supports account
 * creation must support real in-app account deletion, not just sign-out.
 *
 * Supports both the web (cookie session) and mobile (no cookies — send
 * `Authorization: Bearer <access_token>` from the client's current Supabase
 * session instead).
 *
 * Scope: hard-deletes this user's single-owner data (profile, analyse
 * history, tracker, obligations, gamification, notifications, feedback,
 * etc.) and the auth account itself. Shared multi-user data (Split groups/
 * expenses this user created or is a member of) is intentionally left
 * alone beyond removing this user's own membership/share rows — a group a
 * user created may still have other members relying on its expense
 * history, so cascading a full delete there risks destroying other
 * people's records. That's a product decision, not an oversight; revisit
 * if Split needs a "leave vs. delete whole group" distinction.
 */

async function getUserFromRequest(req: NextRequest): Promise<User | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
    const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
    if (!url || !anonKey || !token) return null;
    const client = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user;
  }
  return getAuthedUser();
}

// Single-owner tables — safe to hard-delete outright (see audit notes at
// supabase/USER_DATA_AUDIT_NOTES.sql for the full table map).
const OWNED_TABLES = [
  "user_analysis",
  "user_analyse_snapshots",
  "user_financial_data",
  "gamification",
  "fk_transactions",
  "expense_transactions",
  "tracker_consent",
  "user_credit_cards",
  "financial_obligations",
  "obligation_checklist",
  "user_policies",
  "notification_preferences",
  "push_subscriptions",
  "expo_push_tokens",
  "user_notifications",
  "user_tip_history",
  "app_feedback",
  "feedback",
  "insurance_clicks",
  "tax_documents",
  "user_stats",
  "financial_profiles",
];

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { ok, retryAfter } = rateLimit(`account-delete:${user.id}`, 3, 60_000);
  if (!ok) return tooManyRequests(retryAfter);

  const admin = getSupabaseAdmin();
  const userId = user.id;
  const failedTables: string[] = [];

  for (const table of OWNED_TABLES) {
    try {
      const { error } = await admin.from(table).delete().eq("user_id", userId);
      if (error) failedTables.push(table);
    } catch {
      failedTables.push(table);
    }
  }

  // Split: leave this user's own participation, not shared group history.
  try {
    await admin.from("split_group_members").delete().eq("user_id", userId);
  } catch {
    failedTables.push("split_group_members");
  }
  try {
    await admin.from("split_expense_shares").delete().eq("user_id", userId);
  } catch {
    failedTables.push("split_expense_shares");
  }

  try {
    await admin.from("users").delete().eq("id", userId);
  } catch {
    failedTables.push("users");
  }

  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr) {
    return NextResponse.json(
      {
        error: `Account data cleared but auth record deletion failed: ${authErr.message}`,
        failedTables,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, failedTables });
}
