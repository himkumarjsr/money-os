"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { consumePendingReferralCode } from "@/components/ReferralCapture";
import { useAuthStore } from "@/store/authStore";

export const FINKOIN_REFERRAL_SUCCESS_KEY = "finkoin_referral_success";

const referralApplyLocks = new Set<string>();

/**
 * Links new user to referrer from localStorage (`finkoin_pending_ref`) and grants FK bonuses.
 * Inserts `public.referrals` when RLS allows. Best-effort on failures.
 */
export async function applyPendingReferralRewards(supabase: SupabaseClient, newUserId: string): Promise<void> {
  if (referralApplyLocks.has(newUserId)) return;
  referralApplyLocks.add(newUserId);

  try {
    const refCode = consumePendingReferralCode();
    if (!refCode) return;

    const { data: self } = await supabase.from("users").select("id, referred_by").eq("id", newUserId).maybeSingle();
    if (self?.referred_by) {
      console.log("Referral already processed (referred_by set)");
      return;
    }

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

    const { error: refErr } = await supabase.from("referrals").insert({
      referrer_user_id: referrer.id,
      referred_user_id: newUserId,
    });
    if (refErr) console.warn("referrals insert:", refErr.message);

    try {
      localStorage.setItem(
        FINKOIN_REFERRAL_SUCCESS_KEY,
        JSON.stringify({
          fkAwarded: 100,
          showUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        }),
      );
    } catch {
      /* ignore */
    }

    await useAuthStore.getState().refreshUser();
  } catch (e) {
    console.warn("applyPendingReferralRewards:", e);
  } finally {
    referralApplyLocks.delete(newUserId);
  }
}
