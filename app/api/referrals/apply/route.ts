import { NextResponse } from "next/server";
import { getAuthedUser, unauthorized } from "@/lib/apiGuard";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

/**
 * Links the signed-in (new) user to the owner of a referral code. Both sides
 * are paid once the new user adds their first expense (migration 050), so a
 * fake sign-up earns nothing. Runs on the server so a user can't credit
 * themselves or anyone else (migration 045 makes FK balances server-only).
 */
export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) return unauthorized();

  let code = "";
  try {
    const body = (await req.json()) as { code?: unknown };
    code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  } catch {
    /* handled below */
  }
  if (!code || code.length > 32) {
    return NextResponse.json({ error: "Referral code required." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: referrer, error: findErr } = await admin
    .from("users")
    .select("id")
    .eq("referral_code", code)
    .maybeSingle();
  if (findErr) {
    console.error("referral lookup failed:", findErr.message);
    return NextResponse.json({ error: "Could not apply the referral." }, { status: 500 });
  }
  if (!referrer?.id) {
    return NextResponse.json({ applied: false, reason: "unknown_code" });
  }
  if (referrer.id === user.id) {
    return NextResponse.json({ applied: false, reason: "self_referral" });
  }

  const { data: existing } = await admin
    .from("referrals")
    .select("id")
    .eq("referred_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ applied: false, reason: "already_referred" });
  }

  const { error: insertErr } = await admin.from("referrals").insert({
    referrer_id: referrer.id,
    referred_id: user.id,
    signed_up_at: new Date().toISOString(),
    tokens_awarded: false,
  });
  if (insertErr) {
    console.error("referral insert failed:", insertErr.message);
    return NextResponse.json({ error: "Could not apply the referral." }, { status: 500 });
  }

  // Pays both sides now if the new user already has an expense; otherwise
  // the expense trigger pays them later. Safe to repeat.
  const { error: activateErr } = await admin.rpc("check_referral_activation", {
    p_user_id: user.id,
  });
  if (activateErr) {
    console.error("referral activation check failed:", activateErr.message);
  }
  const { data: paid } = await admin
    .from("fk_transactions")
    .select("amount")
    .eq("user_id", user.id)
    .eq("reason", "referral_reward_new_user")
    .limit(1)
    .maybeSingle();
  const fkAwarded = Number(paid?.amount ?? 0);

  const { error: linkErr } = await admin
    .from("users")
    .update({ referred_by: referrer.id, referral_reward_given: fkAwarded > 0 })
    .eq("id", user.id);
  if (linkErr) {
    await admin.from("users").update({ referred_by: referrer.id }).eq("id", user.id);
  }

  return NextResponse.json({ applied: true, fkAwarded });
}
