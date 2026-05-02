"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { consumePendingReferralCode } from "@/components/ReferralCapture";
import { useAuthStore } from "@/store/authStore";

/**
 * Links new user to referrer from sessionStorage (`finkoin_pending_ref`) and grants FK bonuses.
 * Best-effort: ignores failures (RLS, missing rows).
 */
export async function applyPendingReferralRewards(supabase: SupabaseClient, newUserId: string): Promise<void> {
  const refCode = consumePendingReferralCode();
  if (!refCode) return;

  try {
    const { data: self } = await supabase.from("users").select("id, referred_by").eq("id", newUserId).maybeSingle();
    if (self?.referred_by) return;

    const { data: referrer } = await supabase.from("users").select("id").eq("referral_code", refCode).maybeSingle();
    if (!referrer?.id || referrer.id === newUserId) return;

    await supabase.from("users").update({ referred_by: referrer.id }).eq("id", newUserId);

    const bump = async (userId: string, amount: number) => {
      const { data: row } = await supabase
        .from("gamification")
        .select("fk_balance, total_earned")
        .eq("user_id", userId)
        .maybeSingle();
      if (!row) return;
      await supabase
        .from("gamification")
        .update({
          fk_balance: Number(row.fk_balance ?? 0) + amount,
          total_earned: Number(row.total_earned ?? 0) + amount,
        })
        .eq("user_id", userId);
    };

    await bump(referrer.id, 200);
    await bump(newUserId, 100);
    await useAuthStore.getState().refreshUser();
  } catch (e) {
    console.warn("applyPendingReferralRewards:", e);
  }
}
