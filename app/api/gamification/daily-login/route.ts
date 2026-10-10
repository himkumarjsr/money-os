import { NextResponse } from "next/server";
import { getAuthedUser, unauthorized } from "@/lib/apiGuard";
import { istDate } from "@/lib/istDate";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

/**
 * Records today's visit: updates the login streak and awards the daily 5 FK
 * once per (India) day. FK balances are server-only (migration 045).
 */
export async function POST() {
  const user = await getAuthedUser();
  if (!user) return unauthorized();

  const { data, error } = await getSupabaseAdmin().rpc("record_daily_login", {
    p_user_id: user.id,
    p_today: istDate(),
  });
  if (error) {
    console.error("record_daily_login failed:", error.message);
    return NextResponse.json({ error: "Could not record today's visit." }, { status: 500 });
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        fk_balance: number | null;
        total_earned: number | null;
        streak_days: number | null;
        last_login: string | null;
        badges: unknown;
        awarded: number | null;
      }
    | undefined;

  return NextResponse.json({
    fkBalance: Number(row?.fk_balance ?? 0),
    totalEarned: Number(row?.total_earned ?? 0),
    streakDays: Number(row?.streak_days ?? 0),
    lastLogin: row?.last_login ?? null,
    badges: Array.isArray(row?.badges) ? row.badges : [],
    awarded: Number(row?.awarded ?? 0),
  });
}
