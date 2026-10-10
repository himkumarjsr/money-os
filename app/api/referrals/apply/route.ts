import { NextResponse } from "next/server";
import { getAuthedUser, unauthorized } from "@/lib/apiGuard";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

const REFERRER_REWARD_FK = 200;
const NEW_USER_REWARD_FK = 100;

/**
 * Links the signed-in (new) user to the owner of a referral code and pays
 * both sides once. Runs on the server so a user can't credit themselves or
 * anyone else (migration 045 makes FK balances server-only).
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

  // award_fk pays each (user, reason, reference) once, so a retry is safe.
  const [toReferrer, toNewUser] = await Promise.all([
    admin.rpc("award_fk", {
      p_user_id: referrer.id,
      p_amount: REFERRER_REWARD_FK,
      p_reason: "referral_reward_referrer",
      p_reference_id: user.id,
    }),
    admin.rpc("award_fk", {
      p_user_id: user.id,
      p_amount: NEW_USER_REWARD_FK,
      p_reason: "referral_reward_new_user",
      p_reference_id: referrer.id,
    }),
  ]);
  if (toReferrer.error || toNewUser.error) {
    console.error(
      "referral award failed:",
      toReferrer.error?.message,
      toNewUser.error?.message,
    );
    return NextResponse.json({ error: "Could not award the referral bonus." }, { status: 500 });
  }

  await admin.from("referrals").update({ tokens_awarded: true }).eq("referred_id", user.id);

  const { error: linkErr } = await admin
    .from("users")
    .update({ referred_by: referrer.id, referral_reward_given: true })
    .eq("id", user.id);
  if (linkErr) {
    await admin.from("users").update({ referred_by: referrer.id }).eq("id", user.id);
  }

  return NextResponse.json({ applied: true, fkAwarded: NEW_USER_REWARD_FK });
}
